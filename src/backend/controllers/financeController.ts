import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";

export const financeController = {
  async listCashEntries(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to, type } = req.query;
    try {
      let where = `WHERE ce.tenantId = ?`;
      const params: any[] = [tenantId];
      if (from) { where += ` AND ce.date >= ?`; params.push(new Date(from as string)); }
      if (to)   { where += ` AND ce.date <= ?`; params.push(new Date(to as string)); }
      if (type && type !== "all") { where += ` AND ce.type = ?`; params.push(type); }
      const entries: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT ce.*, c.id as cmdId
         FROM CashEntry ce
         LEFT JOIN Comanda c ON ce.comandaId = c.id
         ${where}
         ORDER BY ce.date DESC, ce.createdAt DESC`,
        ...params
      );
      res.json(entries);
    } catch (e: any) {
      console.error("[GET /api/cash-entries] Erro:", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao buscar lançamentos." });
    }
  },

  async createCashEntry(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { type, category, description, amount, date } = req.body;
    if (!type || !amount) return res.status(400).json({ error: "type e amount são obrigatórios." });
    try {
      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO CashEntry (id, tenantId, type, category, description, amount, date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id, tenantId, type, category || null, description || null, parseFloat(amount) || 0,
        date ? new Date(date) : new Date()
      );
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM CashEntry WHERE id = ?`, id);
      res.json(rows[0] || { id });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao criar lançamento." });
    }
  },

  async updateCashEntry(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { type, category, description, amount, date } = req.body;
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      if (type !== undefined)        { sets.push("type = ?");        vals.push(type); }
      if (category !== undefined)    { sets.push("category = ?");    vals.push(category); }
      if (description !== undefined) { sets.push("description = ?"); vals.push(description); }
      if (amount !== undefined)      { sets.push("amount = ?");      vals.push(parseFloat(amount) || 0); }
      if (date !== undefined)        { sets.push("date = ?");        vals.push(new Date(date)); }
      if (sets.length > 0) {
        vals.push(req.params.id, tenantId);
        await (prisma as any).$executeRawUnsafe(`UPDATE CashEntry SET ${sets.join(", ")} WHERE id = ? AND tenantId = ?`, ...vals);
      }
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM CashEntry WHERE id = ?`, req.params.id);
      res.json(rows[0] || { success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao atualizar lançamento." });
    }
  },

  async deleteCashEntry(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM CashEntry WHERE id = ? AND tenantId = ?`, req.params.id, tenantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao excluir lançamento." });
    }
  },

  async listServiceConsumptions(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { serviceId } = req.query;
    try {
      let where = `WHERE sc.tenantId = ?`;
      const params: any[] = [tenantId];
      if (serviceId) { where += ` AND sc.serviceId = ?`; params.push(serviceId); }
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sc.*, p.name as productName, p.unit as productUnit, p.stock as productStock,
                s.name as serviceName
         FROM ServiceConsumption sc
         LEFT JOIN Product p ON sc.productId = p.id
         LEFT JOIN Service s ON sc.serviceId = s.id
         ${where}
         ORDER BY s.name ASC, p.name ASC`, ...params
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao buscar receitas." });
    }
  },

  async createServiceConsumption(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { serviceId, productId, quantity } = req.body;
    if (!serviceId || !productId) return res.status(400).json({ error: "serviceId e productId são obrigatórios." });
    try {
      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO ServiceConsumption (id, serviceId, productId, quantity, tenantId)
         VALUES (?, ?, ?, ?, ?)`, id, serviceId, productId, parseFloat(quantity) || 1, tenantId
      );
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sc.*, p.name as productName, p.unit as productUnit, s.name as serviceName
         FROM ServiceConsumption sc
         LEFT JOIN Product p ON sc.productId = p.id
         LEFT JOIN Service s ON sc.serviceId = s.id
         WHERE sc.id = ?`, id
      );
      res.json(rows[0] || { id });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao criar receita." });
    }
  },

  async updateServiceConsumption(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { quantity } = req.body;
    try {
      await (prisma as any).$executeRawUnsafe(`UPDATE ServiceConsumption SET quantity = ? WHERE id = ? AND tenantId = ?`, parseFloat(quantity) || 1, req.params.id, tenantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao atualizar receita." });
    }
  },

  async deleteServiceConsumption(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM ServiceConsumption WHERE id = ? AND tenantId = ?`, req.params.id, tenantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao excluir receita." });
    }
  }
};
