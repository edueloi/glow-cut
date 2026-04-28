import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import type { JwtPayload } from "../middleware/auth";

export const membershipRouter = Router();

function tenantId(req: Request): string {
  return ((req as any).auth as JwtPayload).tenantId!;
}

// ── PLANOS DE ASSINATURA ──────────────────────────────────────────────────────

// GET /api/memberships/plans
membershipRouter.get("/plans", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const plans = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM MembershipPlan WHERE tenantId = ? ORDER BY createdAt DESC`,
      tid
    );
    res.json(plans);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/memberships/plans
membershipRouter.post("/plans", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { name, description, price, billingCycle, creditsPerCycle, includedServices, cancelRules } = req.body;
    if (!name || price === undefined) return res.status(400).json({ error: "Nome e valor são obrigatórios." });

    const id = randomUUID();
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO MembershipPlan (id, tenantId, name, description, price, billingCycle, creditsPerCycle, includedServices, cancelRules, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      id, tid, name,
      description || null,
      Number(price),
      billingCycle || "monthly",
      Number(creditsPerCycle) || 1,
      includedServices ? JSON.stringify(includedServices) : null,
      cancelRules || null
    );
    const [plan] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM MembershipPlan WHERE id = ?`, id
    );
    res.status(201).json(plan);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/memberships/plans/:id
membershipRouter.put("/plans/:id", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { id } = req.params;
    const { name, description, price, billingCycle, creditsPerCycle, includedServices, cancelRules, status } = req.body;

    await (prisma as any).$executeRawUnsafe(
      `UPDATE MembershipPlan SET name=?, description=?, price=?, billingCycle=?, creditsPerCycle=?, includedServices=?, cancelRules=?, status=?
       WHERE id=? AND tenantId=?`,
      name, description || null, Number(price),
      billingCycle || "monthly",
      Number(creditsPerCycle) || 1,
      includedServices ? JSON.stringify(includedServices) : null,
      cancelRules || null,
      status || "active",
      id, tid
    );
    const [plan] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM MembershipPlan WHERE id=? AND tenantId=?`, id, tid
    );
    if (!plan) return res.status(404).json({ error: "Plano não encontrado." });
    res.json(plan);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/memberships/plans/:id
membershipRouter.delete("/plans/:id", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { id } = req.params;
    // Verificar se há assinantes ativos
    const [count]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT COUNT(*) as n FROM ClientSubscription WHERE membershipPlanId=? AND tenantId=? AND status IN ('active','pending')`,
      id, tid
    );
    if (Number(count?.n) > 0) {
      return res.status(400).json({ error: "Existem assinantes ativos neste plano. Cancele as assinaturas antes de excluir." });
    }
    await (prisma as any).$executeRawUnsafe(
      `UPDATE MembershipPlan SET status='inactive' WHERE id=? AND tenantId=?`, id, tid
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── ASSINATURAS DOS CLIENTES ──────────────────────────────────────────────────

// GET /api/memberships/subscriptions  (lista todas do tenant)
membershipRouter.get("/subscriptions", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { planId, status, clientId } = req.query;

    let sql = `
      SELECT cs.*, c.name as clientName, c.phone as clientPhone, c.email as clientEmail,
             mp.name as planName, mp.price as planPrice, mp.billingCycle, mp.creditsPerCycle
      FROM ClientSubscription cs
      JOIN Client c ON c.id = cs.clientId
      JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
      WHERE cs.tenantId = ?
    `;
    const params: any[] = [tid];

    if (planId) { sql += ` AND cs.membershipPlanId = ?`; params.push(planId); }
    if (status) { sql += ` AND cs.status = ?`; params.push(status); }
    if (clientId) { sql += ` AND cs.clientId = ?`; params.push(clientId); }

    sql += ` ORDER BY cs.createdAt DESC`;

    const subscriptions = await (prisma as any).$queryRawUnsafe(sql, ...params);

    // Para cada assinatura, buscar créditos do ciclo atual
    const enriched = await Promise.all((subscriptions as any[]).map(async (sub: any) => {
      const credits = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM SubscriptionCredit WHERE subscriptionId=? ORDER BY createdAt DESC LIMIT 1`,
        sub.id
      );
      return { ...sub, currentCredit: (credits as any[])[0] || null };
    }));

    res.json(enriched);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/memberships/subscriptions/:id
membershipRouter.get("/subscriptions/:id", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { id } = req.params;
    const [sub] = await (prisma as any).$queryRawUnsafe(
      `SELECT cs.*, c.name as clientName, c.phone as clientPhone, c.email as clientEmail,
              mp.name as planName, mp.price as planPrice, mp.billingCycle, mp.creditsPerCycle, mp.includedServices, mp.cancelRules
       FROM ClientSubscription cs
       JOIN Client c ON c.id = cs.clientId
       JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
       WHERE cs.id=? AND cs.tenantId=?`,
      id, tid
    );
    if (!sub) return res.status(404).json({ error: "Assinatura não encontrada." });

    const credits = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM SubscriptionCredit WHERE subscriptionId=? ORDER BY createdAt DESC`,
      id
    );
    const payments = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM SubscriptionPayment WHERE subscriptionId=? ORDER BY createdAt DESC LIMIT 12`,
      id
    );
    res.json({ ...sub, credits, payments });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/memberships/subscriptions  (criar nova assinatura manualmente)
membershipRouter.post("/subscriptions", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { clientId, membershipPlanId, notes, paidNow } = req.body;
    if (!clientId || !membershipPlanId) return res.status(400).json({ error: "Cliente e plano são obrigatórios." });

    // Verificar se já tem assinatura ativa neste plano
    const [existing]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT id FROM ClientSubscription WHERE clientId=? AND membershipPlanId=? AND tenantId=? AND status IN ('active','pending')`,
      clientId, membershipPlanId, tid
    );
    if (existing) return res.status(400).json({ error: "Este cliente já possui uma assinatura ativa neste plano." });

    const [plan]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM MembershipPlan WHERE id=? AND tenantId=?`, membershipPlanId, tid
    );
    if (!plan) return res.status(404).json({ error: "Plano não encontrado." });

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.billingCycle === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
    else if (plan.billingCycle === "quarterly") periodEnd.setMonth(periodEnd.getMonth() + 3);
    else if (plan.billingCycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subId = randomUUID();
    const initialStatus = paidNow ? "active" : "pending";

    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO ClientSubscription (id, tenantId, clientId, membershipPlanId, status, currentPeriodStart, currentPeriodEnd, nextChargeDate, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      subId, tid, clientId, membershipPlanId,
      initialStatus,
      now, periodEnd, periodEnd,
      notes || null
    );

    // Criar créditos do ciclo inicial se pago
    if (paidNow) {
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO SubscriptionCredit (id, subscriptionId, tenantId, totalCredits, usedCredits, cycleStart, cycleEnd)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        randomUUID(), subId, tid, Number(plan.creditsPerCycle), now, periodEnd
      );
      // Registrar pagamento
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO SubscriptionPayment (id, subscriptionId, tenantId, amount, status, method, paidAt, dueDate)
         VALUES (?, ?, ?, ?, 'paid', 'manual', ?, ?)`,
        randomUUID(), subId, tid, Number(plan.price), now, now
      );
    }

    const [created] = await (prisma as any).$queryRawUnsafe(
      `SELECT cs.*, c.name as clientName, mp.name as planName, mp.price as planPrice
       FROM ClientSubscription cs
       JOIN Client c ON c.id = cs.clientId
       JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
       WHERE cs.id=?`, subId
    );
    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/memberships/subscriptions/:id/status  (ativar, pausar, cancelar)
membershipRouter.patch("/subscriptions/:id/status", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { id } = req.params;
    const { status, notes } = req.body;
    const allowed = ["active", "pending", "cancelled", "paused"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Status inválido." });

    const updates: string[] = ["status=?"];
    const params: any[] = [status];

    if (status === "cancelled") {
      updates.push("cancelledAt=NOW()");
    }
    if (status === "active") {
      // Garante que há créditos no ciclo atual
      const [sub]: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT cs.*, mp.creditsPerCycle FROM ClientSubscription cs
         JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
         WHERE cs.id=? AND cs.tenantId=?`, id, tid
      );
      if (sub) {
        const [existingCredit]: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT id FROM SubscriptionCredit WHERE subscriptionId=? AND cycleEnd > NOW()`, id
        );
        if (!existingCredit) {
          const now = new Date();
          const end = new Date(now);
          end.setMonth(end.getMonth() + 1);
          await (prisma as any).$executeRawUnsafe(
            `INSERT INTO SubscriptionCredit (id, subscriptionId, tenantId, totalCredits, usedCredits, cycleStart, cycleEnd)
             VALUES (?, ?, ?, ?, 0, ?, ?)`,
            randomUUID(), id, tid, Number(sub.creditsPerCycle), now, end
          );
        }
      }
    }
    if (notes) { updates.push("notes=?"); params.push(notes); }
    params.push(id, tid);

    await (prisma as any).$executeRawUnsafe(
      `UPDATE ClientSubscription SET ${updates.join(",")} WHERE id=? AND tenantId=?`,
      ...params
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/memberships/subscriptions/:id/use-credit  (consumir 1 crédito)
membershipRouter.post("/subscriptions/:id/use-credit", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { id } = req.params;

    const [credit]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT sc.* FROM SubscriptionCredit sc
       JOIN ClientSubscription cs ON cs.id = sc.subscriptionId
       WHERE sc.subscriptionId=? AND cs.tenantId=? AND cs.status='active'
         AND sc.cycleEnd > NOW() AND sc.usedCredits < sc.totalCredits
       ORDER BY sc.createdAt DESC LIMIT 1`,
      id, tid
    );
    if (!credit) return res.status(400).json({ error: "Sem créditos disponíveis neste ciclo." });

    await (prisma as any).$executeRawUnsafe(
      `UPDATE SubscriptionCredit SET usedCredits = usedCredits + 1 WHERE id=?`,
      credit.id
    );
    res.json({ success: true, remaining: Number(credit.totalCredits) - Number(credit.usedCredits) - 1 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/memberships/subscriptions/:id/payment  (registrar pagamento manual)
membershipRouter.post("/subscriptions/:id/payment", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { id } = req.params;
    const { amount, method, notes } = req.body;

    const [sub]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT cs.*, mp.creditsPerCycle, mp.billingCycle, mp.price
       FROM ClientSubscription cs
       JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
       WHERE cs.id=? AND cs.tenantId=?`, id, tid
    );
    if (!sub) return res.status(404).json({ error: "Assinatura não encontrada." });

    const now = new Date();
    const nextEnd = new Date(now);
    if (sub.billingCycle === "monthly") nextEnd.setMonth(nextEnd.getMonth() + 1);
    else if (sub.billingCycle === "quarterly") nextEnd.setMonth(nextEnd.getMonth() + 3);
    else if (sub.billingCycle === "yearly") nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    else nextEnd.setMonth(nextEnd.getMonth() + 1);

    // Registrar pagamento
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO SubscriptionPayment (id, subscriptionId, tenantId, amount, status, method, paidAt, dueDate, notes)
       VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?)`,
      randomUUID(), id, tid,
      amount ?? sub.price,
      method || "manual",
      now, nextEnd,
      notes || null
    );

    // Renovar créditos
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO SubscriptionCredit (id, subscriptionId, tenantId, totalCredits, usedCredits, cycleStart, cycleEnd)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      randomUUID(), id, tid, Number(sub.creditsPerCycle), now, nextEnd
    );

    // Ativar assinatura e atualizar período
    await (prisma as any).$executeRawUnsafe(
      `UPDATE ClientSubscription SET status='active', currentPeriodStart=?, currentPeriodEnd=?, nextChargeDate=?, cancelledAt=NULL
       WHERE id=? AND tenantId=?`,
      now, nextEnd, nextEnd, id, tid
    );

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/memberships/stats  (resumo do tenant)
membershipRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const [totals]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN cs.status='active' THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN cs.status='pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN cs.status='cancelled' THEN 1 ELSE 0 END) as cancelled,
         SUM(CASE WHEN cs.status='active' THEN mp.price ELSE 0 END) as mrr
       FROM ClientSubscription cs
       JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
       WHERE cs.tenantId=?`,
      tid
    );
    const plans = await (prisma as any).$queryRawUnsafe(
      `SELECT mp.id, mp.name, mp.price,
              COUNT(cs.id) as subscribers,
              SUM(CASE WHEN cs.status='active' THEN 1 ELSE 0 END) as activeSubscribers
       FROM MembershipPlan mp
       LEFT JOIN ClientSubscription cs ON cs.membershipPlanId = mp.id AND cs.tenantId = mp.tenantId
       WHERE mp.tenantId=?
       GROUP BY mp.id
       ORDER BY mp.createdAt DESC`,
      tid
    );
    res.json({ totals, plans });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/memberships/portal-invite  (gerar/enviar link de acesso ao portal para o cliente)
membershipRouter.post("/portal-invite", async (req: Request, res: Response) => {
  try {
    const tid = tenantId(req);
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: "clientId obrigatório." });

    const [client]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM Client WHERE id=? AND tenantId=?`, clientId, tid
    );
    if (!client) return res.status(404).json({ error: "Cliente não encontrado." });

    // Buscar tenant para o slug
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tid },
      select: { slug: true, name: true }
    });

    const appUrl = process.env.APP_URL || "https://agendelle.com.br";
    const portalUrl = `${appUrl}/portal/${tenant?.slug}`;

    res.json({ portalUrl, tenantName: tenant?.name, clientEmail: client.email, clientName: client.name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
