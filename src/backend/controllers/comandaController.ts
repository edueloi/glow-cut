import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";

export const comandaController = {
  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT c.*, cl.name as clientName, cl.phone as clientPhone,
                pr.name as professionalName
         FROM Comanda c
         LEFT JOIN Client cl ON c.clientId = cl.id
         LEFT JOIN Professional pr ON c.professionalId = pr.id
         WHERE c.tenantId = ?
         ORDER BY c.createdAt DESC`,
        tenantId
      );

      const itemRows: any[] = rows.length > 0
        ? await (prisma as any).$queryRawUnsafe(
            `SELECT ci.*, p.name as productName, p.photo as productPhoto,
                    sv.name as serviceName
             FROM ComandaItem ci
             LEFT JOIN Product p ON ci.productId = p.id
             LEFT JOIN Service sv ON ci.serviceId = sv.id
             WHERE ci.comandaId IN (${rows.map(() => "?").join(",")})`,
            ...rows.map((r: any) => r.id)
          )
        : [];

      // Load linked appointments
      const apptRows: any[] = rows.length > 0
        ? await (prisma as any).$queryRawUnsafe(
            `SELECT a.id, a.comandaId, a.status, a.date, a.startTime, a.endTime,
                    sv.name as serviceName
             FROM Appointment a
             LEFT JOIN Service sv ON a.serviceId = sv.id
             WHERE a.comandaId IN (${rows.map(() => "?").join(",")})
             ORDER BY a.date ASC, a.startTime ASC`,
            ...rows.map((r: any) => r.id)
          )
        : [];

      const itemsByComanda: Record<string, any[]> = {};
      for (const item of itemRows) {
        if (!itemsByComanda[item.comandaId]) itemsByComanda[item.comandaId] = [];
        itemsByComanda[item.comandaId].push({
          ...item,
          product: item.productId ? { id: item.productId, name: item.productName, photo: item.productPhoto } : null,
          service: item.serviceId ? { id: item.serviceId, name: item.serviceName } : null,
        });
      }

      const apptsByComanda: Record<string, any[]> = {};
      for (const a of apptRows) {
        if (!apptsByComanda[a.comandaId]) apptsByComanda[a.comandaId] = [];
        apptsByComanda[a.comandaId].push(a);
      }

      const comandas = rows.map((r: any) => {
        const items = itemsByComanda[r.id] || [];
        const appointments = apptsByComanda[r.id] || [];

        // Derive package summary: unique packageIds in items
        const pkgMap = new Map<string, { packageId: string; packageName: string; count: number }>();
        for (const it of items) {
          if (it.packageId) {
            if (!pkgMap.has(it.packageId)) pkgMap.set(it.packageId, { packageId: it.packageId, packageName: it.packageName || it.packageId, count: 0 });
            pkgMap.get(it.packageId)!.count++;
          }
        }
        const packages = Array.from(pkgMap.values());

        // sessionsCompleted: count appointments with status=realizado linked to this comanda
        const doneCount = appointments.filter((a: any) => a.status === "realizado").length;

        return {
          ...r,
          sessionsCompleted: Number(r.sessionsCompleted ?? doneCount),
          sessionCount: Number(r.sessionCount ?? 1),
          client: r.clientName ? { id: r.clientId, name: r.clientName, phone: r.clientPhone } : null,
          professional: r.professionalName ? { id: r.professionalId, name: r.professionalName } : null,
          items,
          appointments,
          packages,
        };
      });
      res.json(comandas);
    } catch (e: any) {
      console.error("[GET /api/comandas] Erro:", e?.message || e);
      res.status(500).json({ error: "Erro ao buscar comandas.", detail: e?.message });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { clientId, professionalId, description, total, discount, discountType, paymentMethod, status, type, sessionCount, items } = req.body;
    try {
      const comandaId = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO Comanda (id, clientId, professionalId, description, total, discount, discountType, paymentMethod, status, type, sessionCount, tenantId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        comandaId, clientId || null, professionalId || null, description || null,
        parseFloat(total) || 0, parseFloat(discount) || 0, discountType || "value",
        paymentMethod || null, status || "open", type || "normal",
        parseInt(sessionCount) || 1, tenantId
      );

      for (const it of (items || [])) {
        await (prisma as any).$executeRawUnsafe(
          `INSERT INTO ComandaItem (id, comandaId, productId, serviceId, packageId, packageName, name, price, quantity, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          randomUUID(), comandaId, it.productId || null, it.serviceId || null,
          it.packageId || null, it.packageName || null,
          it.name, parseFloat(it.price) || 0, parseInt(it.quantity) || 1,
          (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 1)
        );
        if (it.productId) {
          try {
            const prodRows: any[] = await (prisma as any).$queryRawUnsafe(
              `SELECT stock FROM Product WHERE id = ? AND tenantId = ?`, it.productId, tenantId
            );
            if (prodRows.length) {
              const previousQty = prodRows[0].stock;
              const qty = parseInt(it.quantity) || 1;
              const newQty = Math.max(0, previousQty - qty);
              await (prisma as any).$executeRawUnsafe(`UPDATE Product SET stock = ? WHERE id = ?`, newQty, it.productId);
              await (prisma as any).$executeRawUnsafe(
                `INSERT INTO StockMovement (id, tenantId, productId, type, quantity, previousQty, newQty, reason, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                randomUUID(), tenantId, it.productId, "saida", qty, previousQty, newQty,
                `Comanda #${comandaId.slice(-6).toUpperCase()}`, comandaId
              );
            }
          } catch (e2: any) {
            console.warn("⚠️ Stock deduction on comanda create failed:", e2.message);
          }
        }
      }

      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT c.*, cl.name as clientName, cl.phone as clientPhone FROM Comanda c
         LEFT JOIN Client cl ON c.clientId = cl.id WHERE c.id = ?`, comandaId
      );
      const itemRows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM ComandaItem WHERE comandaId = ?`, comandaId);
      const r = rows[0] || {};
      const comanda = {
        ...r,
        client: r.clientName ? { id: r.clientId, name: r.clientName, phone: r.clientPhone } : null,
        items: itemRows
      };
      res.json(comanda);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro ao criar comanda." });
    }
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { status, total, discount, discountType, paymentMethod, paymentDetails, description, clientId, professionalId, type, sessionCount } = req.body;
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      if (status !== undefined)        { sets.push("status = ?");        vals.push(status); }
      if (total !== undefined)         { sets.push("total = ?");         vals.push(parseFloat(total) || 0); }
      if (discount !== undefined)      { sets.push("discount = ?");      vals.push(parseFloat(discount) || 0); }
      if (discountType !== undefined)  { sets.push("discountType = ?");  vals.push(discountType); }
      if (paymentMethod !== undefined) { sets.push("paymentMethod = ?"); vals.push(paymentMethod); }
      if (paymentDetails !== undefined){ sets.push("paymentDetails = ?");vals.push(typeof paymentDetails === 'object' ? JSON.stringify(paymentDetails) : paymentDetails); }
      if (description !== undefined)   { sets.push("description = ?");   vals.push(description); }
      if (clientId !== undefined)      { sets.push("clientId = ?");      vals.push(clientId); }
      if (professionalId !== undefined){ sets.push("professionalId = ?");vals.push(professionalId); }
      if (type !== undefined)          { sets.push("type = ?");          vals.push(type); }
      if (sessionCount !== undefined)  { sets.push("sessionCount = ?");  vals.push(parseInt(sessionCount) || 1); }

      if (sets.length > 0) {
        vals.push(req.params.id);
        if (tenantId) vals.push(tenantId);
        await (prisma as any).$executeRawUnsafe(`UPDATE Comanda SET ${sets.join(", ")} WHERE id = ?${tenantId ? " AND tenantId = ?" : ""}`, ...vals);
      }

      if (status === "paid" && tenantId) {
        try {
          const cmdData: any[] = await (prisma as any).$queryRawUnsafe(`SELECT total, clientId FROM Comanda WHERE id = ?`, req.params.id);
          if (cmdData[0]) {
            await (prisma as any).$executeRawUnsafe(`DELETE FROM CashEntry WHERE comandaId = ? AND tenantId = ?`, req.params.id, tenantId);
            await (prisma as any).$executeRawUnsafe(
              `INSERT INTO CashEntry (id, tenantId, type, category, description, amount, date, comandaId)
               VALUES (?, ?, 'income', 'Comanda', ?, ?, NOW(), ?)`,
              randomUUID(), tenantId, `Pagamento comanda #${req.params.id.slice(-6).toUpperCase()}`, cmdData[0].total || 0, req.params.id
            );
          }
        } catch (e2: any) {
          console.warn("⚠️ Auto CashEntry creation failed:", e2.message);
        }

        try {
          const svcItems: any[] = await (prisma as any).$queryRawUnsafe(
            `SELECT ci.serviceId, ci.quantity FROM ComandaItem ci WHERE ci.comandaId = ? AND ci.serviceId IS NOT NULL`, req.params.id
          );
          for (const item of svcItems) {
            if (!item.serviceId) continue;
            const serviceProds = await (prisma as any).serviceProduct.findMany({ where: { serviceId: item.serviceId } });
            const svcNameRows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT name FROM Service WHERE id = ?`, item.serviceId);
            const svcName = svcNameRows[0]?.name || item.serviceId;
            for (const sp of serviceProds) {
              const totalDeduct = sp.quantity * (Number(item.quantity) || 1);
              const prodRows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT stock FROM Product WHERE id = ?`, sp.productId);
              if (!prodRows.length) continue;
              const previousQty = prodRows[0].stock;
              const newQty = Math.max(0, previousQty - totalDeduct);
              await (prisma as any).$executeRawUnsafe(
                `UPDATE Product SET stock = ?, reservedStock = GREATEST(0, reservedStock - ?) WHERE id = ?`,
                newQty, totalDeduct, sp.productId
              );
              await (prisma as any).$executeRawUnsafe(
                `INSERT INTO StockMovement (id, tenantId, productId, type, quantity, previousQty, newQty, reason, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                randomUUID(), tenantId, sp.productId, "consumo", totalDeduct, previousQty, newQty,
                `Consumo via serviço: ${svcName}`, req.params.id
              );
            }
          }
        } catch (e2: any) {
          console.warn("⚠️  Auto stock deduction failed:", e2.message);
        }
      }

      const comanda = await (prisma as any).$queryRawUnsafe(
        `SELECT c.*, cl.id as clientId_ref, cl.name as clientName, cl.phone as clientPhone
         FROM Comanda c LEFT JOIN Client cl ON c.clientId = cl.id WHERE c.id = ?`, req.params.id
      ).then((rows: any[]) => {
        if (!rows[0]) return null;
        const r = rows[0];
        return { ...r, client: r.clientName ? { id: r.clientId, name: r.clientName, phone: r.clientPhone } : null };
      });
      res.json(comanda);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro ao atualizar comanda." });
    }
  },

  async delete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    try {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM ComandaItem WHERE comandaId = ?`, req.params.id);
      if (tenantId) {
        await (prisma as any).$executeRawUnsafe(`DELETE FROM Comanda WHERE id = ? AND tenantId = ?`, req.params.id, tenantId);
      } else {
        await (prisma as any).$executeRawUnsafe(`DELETE FROM Comanda WHERE id = ?`, req.params.id);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro ao excluir comanda." });
    }
  },

  async updateItems(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { items, discount, discountType, total } = req.body;
    try {
      const oldItems: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM ComandaItem WHERE comandaId = ?`, req.params.id);
      for (const old of oldItems) {
        if (old.productId) {
          await (prisma as any).$executeRawUnsafe(`UPDATE Product SET stock = stock + ? WHERE id = ?`, parseInt(old.quantity) || 1, old.productId);
        }
      }

      await (prisma as any).$executeRawUnsafe(`DELETE FROM ComandaItem WHERE comandaId = ?`, req.params.id);

      for (const it of (items || [])) {
        if (!it.name) continue;
        const qty = parseInt(it.quantity) || 1;
        const price = parseFloat(it.price) || 0;
        await (prisma as any).$executeRawUnsafe(
          `INSERT INTO ComandaItem (id, comandaId, productId, serviceId, packageId, packageName, name, price, quantity, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          randomUUID(), req.params.id, it.productId || null, it.serviceId || null,
          it.packageId || null, it.packageName || null,
          it.name, price, qty, price * qty
        );
        if (it.productId) {
          await (prisma as any).$executeRawUnsafe(`UPDATE Product SET stock = GREATEST(0, stock - ?) WHERE id = ?`, qty, it.productId);
        }
      }

      await (prisma as any).$executeRawUnsafe(
        `UPDATE Comanda SET discount = ?, discountType = ?, total = ? WHERE id = ?${tenantId ? " AND tenantId = ?" : ""}`,
        ...(tenantId
          ? [parseFloat(discount) || 0, discountType || "value", parseFloat(total) || 0, req.params.id, tenantId]
          : [parseFloat(discount) || 0, discountType || "value", parseFloat(total) || 0, req.params.id])
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error("[PUT /api/comandas/:id/items] Erro:", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao atualizar itens." });
    }
  },

  // PATCH /api/comandas/:id/sessions — increment/set sessionsCompleted
  async patchSessions(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { sessionsCompleted } = req.body;
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sessionCount, sessionsCompleted FROM Comanda WHERE id = ?${tenantId ? " AND tenantId = ?" : ""}`,
        ...(tenantId ? [req.params.id, tenantId] : [req.params.id])
      );
      if (!rows.length) return res.status(404).json({ error: "Comanda não encontrada." });
      const current = rows[0];
      const sessionCount = Number(current.sessionCount) || 1;
      let newCompleted: number;
      if (sessionsCompleted !== undefined) {
        newCompleted = Math.min(sessionCount, Math.max(0, Number(sessionsCompleted)));
      } else {
        newCompleted = Math.min(sessionCount, Number(current.sessionsCompleted || 0) + 1);
      }
      await (prisma as any).$executeRawUnsafe(
        `UPDATE Comanda SET sessionsCompleted = ? WHERE id = ?${tenantId ? " AND tenantId = ?" : ""}`,
        ...(tenantId ? [newCompleted, req.params.id, tenantId] : [newCompleted, req.params.id])
      );
      return res.json({ sessionsCompleted: newCompleted, sessionCount });
    } catch (e: any) {
      console.error("[PATCH /api/comandas/:id/sessions]", e?.message);
      res.status(500).json({ error: e?.message || "Erro ao atualizar sessões." });
    }
  },

  async rankingServicos(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to } = req.query;
    try {
      let where = `WHERE c.tenantId = ? AND c.status = 'paid'`;
      const params: any[] = [tenantId];
      if (from) { where += ` AND c.createdAt >= ?`; params.push(new Date(from as string)); }
      if (to)   { where += ` AND c.createdAt <= ?`; params.push(new Date(to as string)); }

      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT
           s.id as serviceId,
           s.name as serviceName,
           s.category,
           COUNT(ci.id) as vezes,
           COALESCE(SUM(ci.total), 0) as receita,
           COALESCE(AVG(ci.total), 0) as ticketMedio
         FROM ComandaItem ci
         JOIN Comanda c ON ci.comandaId = c.id
         JOIN Service s ON ci.serviceId = s.id
         ${where}
         GROUP BY s.id, s.name, s.category
         ORDER BY vezes DESC, receita DESC
         LIMIT 50`,
        ...params
      );

      res.json(rows.map(r => ({
        serviceId: r.serviceId,
        serviceName: r.serviceName,
        category: r.category || null,
        vezes: Number(r.vezes),
        receita: Number(r.receita),
        ticketMedio: Number(r.ticketMedio),
      })));
    } catch (e: any) {
      console.error("[GET /api/comandas/ranking-servicos]", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao buscar ranking." });
    }
  },
};
