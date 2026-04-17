import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";

// GET /api/preferences
export const preferencesController = {
  async get(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth?.tenantId;
      const userId   = (req as any).auth?.sub;
      const userType = (req as any).auth?.type || "admin";

      if (!userId || !tenantId) return res.status(401).json({ error: "Não autenticado." });

      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT preferences FROM UserPreferences WHERE userId = ? AND userType = ? AND tenantId = ? LIMIT 1`,
        userId, userType, tenantId
      );

      if (!rows.length) return res.json({});
      try {
        return res.json(JSON.parse(rows[0].preferences || "{}"));
      } catch {
        return res.json({});
      }
    } catch (e: any) {
      console.error("[Preferences GET]", e?.message);
      res.status(500).json({ error: "Erro ao buscar preferências." });
    }
  },

  // PATCH /api/preferences  — body: { key: value, ... }  (merges with existing)
  async patch(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth?.tenantId;
      const userId   = (req as any).auth?.sub;
      const userType = (req as any).auth?.type || "admin";

      if (!userId || !tenantId) return res.status(401).json({ error: "Não autenticado." });

      const incoming = req.body || {};

      // Load existing
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT id, preferences FROM UserPreferences WHERE userId = ? AND userType = ? AND tenantId = ? LIMIT 1`,
        userId, userType, tenantId
      );

      let merged: Record<string, any> = {};
      if (rows.length) {
        try { merged = JSON.parse(rows[0].preferences || "{}"); } catch { merged = {}; }
      }

      // Deep merge incoming (top-level keys)
      Object.assign(merged, incoming);

      const json = JSON.stringify(merged);

      if (rows.length) {
        await (prisma as any).$executeRawUnsafe(
          `UPDATE UserPreferences SET preferences = ?, updatedAt = NOW() WHERE id = ?`,
          json, rows[0].id
        );
      } else {
        await (prisma as any).$executeRawUnsafe(
          `INSERT INTO UserPreferences (id, userId, userType, tenantId, preferences, updatedAt) VALUES (?, ?, ?, ?, ?, NOW())`,
          randomUUID(), userId, userType, tenantId, json
        );
      }

      return res.json(merged);
    } catch (e: any) {
      console.error("[Preferences PATCH]", e?.message);
      res.status(500).json({ error: "Erro ao salvar preferências." });
    }
  },
};
