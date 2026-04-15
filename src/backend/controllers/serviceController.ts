import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";

export const serviceController = {
  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      let servicesRaw: any[];
      try {
        servicesRaw = await (prisma as any).service.findMany({
          where: { tenantId },
          include: {
            packageservice_packageservice_packageIdToservice: {
              include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true, duration: true, price: true } } }
            },
            serviceProducts: {
              include: { product: { select: { id: true, name: true, stock: true, costPrice: true, salePrice: true, code: true } } }
            }
          },
          orderBy: { name: "asc" }
        });
      } catch (includeErr: any) {
        console.error("[/api/services] Erro com include, tentando query simples:", includeErr?.message || includeErr);
        servicesRaw = await (prisma as any).service.findMany({
          where: { tenantId },
          orderBy: { name: "asc" }
        });
      }

      const services = servicesRaw.map((s: any) => ({
        ...s,
        packageServices: s.packageservice_packageservice_packageIdToservice?.map((ps: any) => ({
          ...ps,
          service: ps.service_packageservice_serviceIdToservice
        })) || [],
        productsConsumed: s.serviceProducts?.map((sp: any) => ({
          id: sp.product.id,
          name: sp.product.name,
          quantity: sp.quantity,
          costPrice: sp.product.costPrice,
          stock: sp.product.stock,
        })) || [],
        packageservice_packageservice_packageIdToservice: undefined,
        serviceProducts: undefined
      }));

      res.json(services);
    } catch (e: any) {
      console.error("[/api/services] Erro Prisma:", e?.message || e);
      res.status(500).json({ error: "Erro ao buscar serviços.", detail: e?.message });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, description, price, duration, type, discount, discountType, includedServices, professionalIds, productsConsumed, commissionValue, commissionType, taxRate } = req.body;
    if (!name || !price) return res.status(400).json({ error: "Nome e preço são obrigatórios." });
    let serviceId: string | null = null;
    try {
      serviceId = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO Service (id, name, description, price, duration, type, discount, discountType, professionalIds, tenantId, commissionValue, commissionType, taxRate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        serviceId,
        name,
        description || null,
        parseFloat(price) || 0,
        parseInt(duration) || 60,
        type || "service",
        parseFloat(discount) || 0,
        discountType || "value",
        JSON.stringify(professionalIds || []),
        tenantId,
        parseFloat(commissionValue) || 0,
        commissionType || "percentage",
        parseFloat(taxRate) || 0
      );
    } catch (e: any) {
      console.error("❌ service.create failed:", e.message);
      return res.status(400).json({ error: e.message || "Erro ao criar serviço." });
    }
    // Cria relações de pacote
    if (type === "package" && Array.isArray(includedServices)) {
      for (const s of includedServices) {
        try {
          await (prisma as any).packageService.create({
            data: { id: randomUUID(), packageId: serviceId, serviceId: s.id, quantity: s.quantity || 1 }
          });
        } catch (e: any) {
          console.error("❌ packageService.create failed for serviceId", s.id, ":", e.message);
        }
      }
    }
    // Cria relações de produtos consumidos
    if (Array.isArray(productsConsumed)) {
      for (const p of productsConsumed) {
        try {
          await (prisma as any).serviceProduct.create({
            data: { id: randomUUID(), serviceId: serviceId, productId: p.id, quantity: p.quantity || 1 }
          });
        } catch (e: any) {
          console.error("❌ serviceProduct.create failed for productId", p.id, ":", e.message);
        }
      }
    }
    let full: any = null;
    try {
      const fullRaw = await (prisma as any).service.findFirst({
        where: { id: serviceId },
        include: { 
          packageservice_packageservice_packageIdToservice: { include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true } } } },
          serviceProducts: { include: { product: { select: { id: true, name: true, costPrice: true, stock: true } } } }
        }
      });
      full = fullRaw ? {
        ...fullRaw,
        packageServices: fullRaw.packageservice_packageservice_packageIdToservice?.map((ps: any) => ({
          ...ps,
          service: ps.service_packageservice_serviceIdToservice
        })) || [],
        productsConsumed: fullRaw.serviceProducts?.map((sp: any) => ({
          id: sp.product.id,
          name: sp.product.name,
          quantity: sp.quantity,
          costPrice: sp.product.costPrice,
          stock: sp.product.stock,
        })) || [],
        packageservice_packageservice_packageIdToservice: undefined,
        serviceProducts: undefined
      } : null;
    } catch (e: any) {
      console.warn("⚠️  findFirst com include falhou, retornando serviço básico:", e.message);
      full = await (prisma as any).service.findFirst({ where: { id: serviceId } });
      if (full) full = { ...full, packageServices: [] };
    }
    res.json(full);
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { name, description, price, duration, type, discount, discountType, includedServices, professionalIds, productsConsumed, commissionValue, commissionType, taxRate } = req.body;
    try {
      await (prisma as any).$executeRawUnsafe(
        `UPDATE Service SET 
          name = ?, 
          description = ?, 
          price = ?, 
          duration = ?, 
          type = ?, 
          discount = ?, 
          discountType = ?, 
          professionalIds = ?,
          commissionValue = ?,
          commissionType = ?,
          taxRate = ?
        WHERE id = ? AND tenantId = ?`,
        name,
        description || null,
        parseFloat(price) || 0,
        parseInt(duration) || 60,
        type || "service",
        parseFloat(discount) || 0,
        discountType || "value",
        JSON.stringify(professionalIds || []),
        parseFloat(commissionValue) || 0,
        commissionType || "percentage",
        parseFloat(taxRate) || 0,
        req.params.id,
        tenantId
      );
    } catch (e: any) {
      console.error("❌ service.updateMany failed:", e.message);
      return res.status(400).json({ error: e.message || "Erro ao atualizar serviço." });
    }
    if (type === "package" && Array.isArray(includedServices)) {
      try {
        await (prisma as any).packageService.deleteMany({ where: { packageId: req.params.id } });
        for (const s of includedServices) {
          await (prisma as any).packageService.create({
            data: { id: randomUUID(), packageId: req.params.id, serviceId: s.id, quantity: s.quantity || 1 }
          });
        }
      } catch (e: any) {
        console.error("❌ packageService update failed:", e.message);
      }
    }
    if (Array.isArray(productsConsumed)) {
      try {
        await (prisma as any).serviceProduct.deleteMany({ where: { serviceId: req.params.id } });
        for (const p of productsConsumed) {
          await (prisma as any).serviceProduct.create({
            data: { id: randomUUID(), serviceId: req.params.id, productId: p.id, quantity: p.quantity || 1 }
          });
        }
      } catch (e: any) {
        console.error("❌ serviceProduct update failed:", e.message);
      }
    }
    let full: any = null;
    try {
      const fullRaw = await (prisma as any).service.findFirst({
        where: { id: req.params.id },
        include: { 
          packageservice_packageservice_packageIdToservice: { include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true } } } },
          serviceProducts: { include: { product: { select: { id: true, name: true, costPrice: true, stock: true } } } }
        }
      });
      full = fullRaw ? {
        ...fullRaw,
        packageServices: fullRaw.packageservice_packageservice_packageIdToservice?.map((ps: any) => ({
          ...ps,
          service: ps.service_packageservice_serviceIdToservice
        })) || [],
        productsConsumed: fullRaw.serviceProducts?.map((sp: any) => ({
          id: sp.product.id,
          name: sp.product.name,
          quantity: sp.quantity,
          costPrice: sp.product.costPrice,
          stock: sp.product.stock,
        })) || [],
        packageservice_packageservice_packageIdToservice: undefined,
        serviceProducts: undefined
      } : null;
    } catch (e: any) {
      console.warn("⚠️  findFirst com include falhou no PUT, retornando serviço básico:", e.message);
      full = await (prisma as any).service.findFirst({ where: { id: req.params.id } });
      if (full) full = { ...full, packageServices: [] };
    }
    res.json(full);
  },

  async delete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    try {
      await (prisma as any).packageService.deleteMany({ where: { packageId: req.params.id } });
      await (prisma as any).packageService.deleteMany({ where: { serviceId: req.params.id } });
      await (prisma as any).service.deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro ao excluir serviço." });
    }
  }
};
