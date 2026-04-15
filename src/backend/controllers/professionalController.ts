import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";

export const professionalController = {
  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const profs = await (prisma as any).professional.findMany({
        where: { tenantId },
        select: { id: true, name: true, role: true, phone: true, email: true, bio: true, photo: true, permissions: true, isActive: true }
      });
      res.json(profs);
    } catch (e: any) {
      res.status(500).json({ error: "Erro ao buscar profissionais." });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, role, password, phone, email, bio, photo, permissions } = req.body;
    if (!name || !password) return res.status(400).json({ error: "Nome e senha são obrigatórios." });
    try {
      const prof = await (prisma as any).professional.create({
        data: {
          id: randomUUID(), name, role, password, tenantId,
          phone: phone || null,
          email: email || null,
          bio: bio || null,
          photo: photo || null,
          permissions: permissions ? JSON.stringify(permissions) : "{}",
          isActive: true,
        },
        select: { id: true, name: true, role: true, phone: true, email: true, bio: true, photo: true, permissions: true, isActive: true }
      });
      for (let i = 0; i < 7; i++) {
        await (prisma as any).workingHours.create({
          data: { id: randomUUID(), dayOfWeek: i, isOpen: i !== 0, startTime: "09:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00", professionalId: prof.id }
        });
      }
      res.json(prof);
    } catch (e) {
      res.status(400).json({ error: "Erro ao criar profissional." });
    }
  },

  async login(req: Request, res: Response) {
    const { name, email, password } = req.body;
    const identifier = email || name;
    const prof = await (prisma as any).professional.findFirst({
      where: {
        OR: [
          { email: identifier, password, isActive: true },
          { name: identifier, password, isActive: true },
        ],
      },
    });
    if (!prof) return res.status(401).json({ error: "Nome/e-mail ou senha incorretos." });
    res.json({ id: prof.id, name: prof.name, role: prof.role, tenantId: prof.tenantId, permissions: (prof as any).permissions });
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { name, role, password, phone, email, bio, photo, permissions, isActive } = req.body;
    const data: any = { name, role };
    if (password) data.password = password;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (bio !== undefined) data.bio = bio || null;
    if (photo !== undefined) data.photo = photo || null;
    if (permissions !== undefined) data.permissions = typeof permissions === "object" ? JSON.stringify(permissions) : permissions;
    if (isActive !== undefined) data.isActive = isActive;
    try {
      await (prisma as any).professional.updateMany({
        where: { id: req.params.id, tenantId: tenantId || undefined },
        data
      });
      const prof = await (prisma as any).professional.findFirst({
        where: { id: req.params.id },
        select: { id: true, name: true, role: true, phone: true, email: true, bio: true, photo: true, permissions: true, isActive: true }
      });
      res.json(prof);
    } catch (e) {
      res.status(400).json({ error: "Erro ao atualizar profissional." });
    }
  },

  async delete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    try {
      await (prisma as any).workingHours.deleteMany({ where: { professionalId: req.params.id } });
      await (prisma as any).professional.deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro ao excluir profissional." });
    }
  }
};
