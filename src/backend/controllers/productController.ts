import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";

export const productController = {
  // PRODUCTS
  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const products: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT p.*, s.name as sectorName, s.color as sectorColor FROM Product p LEFT JOIN Sector s ON p.sectorId = s.id WHERE p.tenantId = ? ORDER BY p.name ASC`,
        tenantId
      );
      const result = products.map((p: any) => ({ ...p, sector: p.sectorId ? { id: p.sectorId, name: p.sectorName, color: p.sectorColor } : null }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async publicList(req: Request, res: Response) {
    const tenantId = req.headers["x-tenant-id"] as string;
    if (!tenantId) return res.status(400).json({ error: "x-tenant-id obrigatório." });
    try {
      const products: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT p.*, s.name as sectorName, s.color as sectorColor FROM Product p LEFT JOIN Sector s ON p.sectorId = s.id WHERE p.tenantId = ? AND p.isForSale = 1 ORDER BY p.name ASC`,
        tenantId
      );
      const result = products.map((p: any) => ({ ...p, sector: p.sectorId ? { id: p.sectorId, name: p.sectorName, color: p.sectorColor } : null }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, description, photo, costPrice, salePrice, stock, minStock, validUntil, code, isForSale, metadata, sectorId, unit } = req.body;
    if (!name) return res.status(400).json({ error: "Nome obrigatório." });
    try {
      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO Product (id, tenantId, name, description, photo, costPrice, salePrice, stock, minStock, validUntil, code, isForSale, metadata, sectorId, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, tenantId, name, description || null, photo || null, parseFloat(costPrice || "0"), parseFloat(salePrice || "0"), parseFloat(stock || "0"), parseFloat(minStock || "0"), validUntil ? new Date(validUntil) : null, code || null, isForSale !== false ? 1 : 0, metadata ? JSON.stringify(metadata) : null, sectorId || null, unit || "un"
      );
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM Product WHERE id = ?`, id);
      res.json(rows[0] || { id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, description, photo, costPrice, salePrice, stock, minStock, validUntil, code, isForSale, metadata, sectorId, unit } = req.body;
    try {
      await (prisma as any).$executeRawUnsafe(
        `UPDATE Product SET name=?, description=?, photo=?, costPrice=?, salePrice=?, stock=?, minStock=?, validUntil=?, code=?, isForSale=?, metadata=?, sectorId=?, unit=? WHERE id=? AND tenantId=?`,
        name, description || null, photo || null, parseFloat(costPrice || "0"), parseFloat(salePrice || "0"), parseFloat(stock || "0"), parseFloat(minStock || "0"), validUntil ? new Date(validUntil) : null, code || null, isForSale !== false ? 1 : 0, metadata ? JSON.stringify(metadata) : null, sectorId || null, unit || "un", req.params.id, tenantId
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async delete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).product.deleteMany({ where: { id: req.params.id, tenantId } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  // SECTORS
  async listSectors(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const sectors: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM Sector WHERE tenantId = ? ORDER BY name ASC`, tenantId);
      res.json(sectors);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async createSector(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório." });
    try {
      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(`INSERT INTO Sector (id, tenantId, name, color) VALUES (?, ?, ?, ?)`, id, tenantId, name.trim(), color || "#6b7280");
      res.json({ id, tenantId, name: name.trim(), color: color || "#6b7280" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async updateSector(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, color } = req.body;
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      if (name !== undefined) { sets.push("name = ?"); vals.push(name.trim()); }
      if (color !== undefined) { sets.push("color = ?"); vals.push(color); }
      if (sets.length > 0) {
        vals.push(req.params.id, tenantId);
        await (prisma as any).$executeRawUnsafe(`UPDATE Sector SET ${sets.join(", ")} WHERE id = ? AND tenantId = ?`, ...vals);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async deleteSector(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).$executeRawUnsafe(`UPDATE Product SET sectorId = NULL WHERE sectorId = ? AND tenantId = ?`, req.params.id, tenantId);
      await (prisma as any).$executeRawUnsafe(`DELETE FROM Sector WHERE id = ? AND tenantId = ?`, req.params.id, tenantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
};
