import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";

export const clientController = {
  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const clientsData = await (prisma as any).client.findMany({
        where: { tenantId },
        include: { appointment: true, comanda: true },
        orderBy: { name: "asc" }
      });
      const clients = clientsData.map((c: any) => ({
        ...c,
        appointments: c.appointment || [],
        comandas: c.comanda || []
      }));
      res.json(clients);
    } catch (e: any) {
      res.status(500).json({ error: "Erro ao buscar clientes." });
    }
  },

  async search(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { phone, name } = req.query;
    try {
      if (phone) {
        const client = await (prisma as any).client.findFirst({
          where: { phone: String(phone), tenantId },
          include: { comanda: { where: { status: "open" } } }
        });
        if (client) client.comandas = client.comanda || [];
        return res.json(client);
      }
      if (name) {
        const clientsData = await (prisma as any).client.findMany({
          where: { tenantId, name: { contains: String(name) } },
          include: { comanda: { where: { status: "open" } } }
        });
        const clients = clientsData.map((c: any) => ({ ...c, comandas: c.comanda || [] }));
        return res.json(clients);
      }
      res.status(400).json({ error: "Phone ou name obrigatório." });
    } catch (e: any) {
      res.status(500).json({ error: "Erro ao buscar cliente." });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, phone, age } = req.body;
    try {
      const existing = await (prisma as any).client.findFirst({ where: { phone, tenantId } });
      let client;
      if (existing) {
        client = await (prisma as any).client.update({
          where: { id: existing.id },
          data: { name, age: parseInt(age || "0") }
        });
      } else {
        client = await (prisma as any).client.create({
          data: { id: randomUUID(), name, phone, age: parseInt(age || "0"), tenantId }
        });
      }
      res.json(client);
    } catch (e) {
      res.status(400).json({ error: "Erro ao salvar cliente." });
    }
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { name, phone, age } = req.body;
    try {
      const client = await (prisma as any).client.updateMany({
        where: { id: req.params.id, tenantId: tenantId || undefined },
        data: { name, phone, age: parseInt(age || "0") }
      });
      res.json(client);
    } catch (e) {
      res.status(400).json({ error: "Erro ao atualizar cliente." });
    }
  }
};
