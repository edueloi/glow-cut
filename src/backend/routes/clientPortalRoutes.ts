import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

export const clientPortalRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "glow-secret-key";
const PORTAL_TOKEN_EXPIRY = "7d";

function signPortalToken(payload: { sub: string; clientId: string; tenantId: string }) {
  return jwt.sign({ ...payload, type: "client_portal" }, JWT_SECRET, { expiresIn: PORTAL_TOKEN_EXPIRY });
}

function requirePortalAuth(req: Request, res: Response, next: Function) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Não autenticado." });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    if (decoded.type !== "client_portal") return res.status(401).json({ error: "Token inválido." });
    (req as any).portalAuth = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  }
}

// ── AUTENTICAÇÃO ──────────────────────────────────────────────────────────────

// POST /api/portal/:slug/login
clientPortalRouter.post("/:slug/login", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "E-mail e senha são obrigatórios." });

    const tenant = await (prisma as any).tenant.findFirst({
      where: { slug },
      select: { id: true, name: true, slug: true, themeColor: true, logoUrl: true }
    });
    if (!tenant) return res.status(404).json({ error: "Estabelecimento não encontrado." });

    const [user]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM ClientPortalUser WHERE email=? AND tenantId=? AND isActive=1`,
      email, tenant.id
    );
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    await (prisma as any).$executeRawUnsafe(
      `UPDATE ClientPortalUser SET lastLogin=NOW() WHERE id=?`, user.id
    );

    const token = signPortalToken({ sub: user.id, clientId: user.clientId, tenantId: tenant.id });
    res.json({ token, tenantName: tenant.name, themeColor: tenant.themeColor, logoUrl: tenant.logoUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/portal/:slug/register  (cliente se cadastra no portal)
clientPortalRouter.post("/:slug/register", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
    if (password.length < 6) return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });

    const tenant = await (prisma as any).tenant.findFirst({
      where: { slug },
      select: { id: true, name: true }
    });
    if (!tenant) return res.status(404).json({ error: "Estabelecimento não encontrado." });

    // Verificar se já existe conta no portal
    const [existing]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT id FROM ClientPortalUser WHERE email=? AND tenantId=?`,
      email, tenant.id
    );
    if (existing) return res.status(400).json({ error: "Este e-mail já possui uma conta no portal." });

    // Buscar ou criar cliente
    let [client]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM Client WHERE email=? AND tenantId=?`, email, tenant.id
    );
    if (!client) {
      const clientId = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO Client (id, tenantId, name, phone, email) VALUES (?, ?, ?, ?, ?)`,
        clientId, tenant.id, name, phone || "", email
      );
      [client] = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM Client WHERE id=?`, clientId
      );
    }

    const portalUserId = randomUUID();
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO ClientPortalUser (id, tenantId, clientId, email, password) VALUES (?, ?, ?, ?, ?)`,
      portalUserId, tenant.id, client.id, email, password
    );

    const token = signPortalToken({ sub: portalUserId, clientId: client.id, tenantId: tenant.id });
    res.status(201).json({ token, tenantName: tenant.name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/portal-client/ping (teste de conectividade)
clientPortalRouter.get("/ping", (_req, res) => res.json({ pong: true, time: new Date().toISOString() }));

// GET /api/portal-client/:slug/tenant-info (dados públicos do estabelecimento para o portal)
clientPortalRouter.get("/:slug/tenant-info", async (req: Request, res: Response) => {
  console.log(`[Portal] Buscando tenant-info para slug: ${req.params.slug}`);
  try {
    const { slug } = req.params;
    const tenant = await (prisma as any).tenant.findFirst({
      where: { slug },
      select: { id: true, name: true, slug: true, themeColor: true, logoUrl: true, phone: true, instagram: true }
    });
    if (!tenant) return res.status(404).json({ error: "Estabelecimento não encontrado." });

    const plans = await (prisma as any).$queryRawUnsafe(
      `SELECT id, name, description, price, billingCycle, creditsPerCycle, includedServices, cancelRules
       FROM MembershipPlan WHERE tenantId=? AND status='active' ORDER BY price ASC`,
      tenant.id
    );
    res.json({ tenant, plans });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/portal/:slug/change-password
clientPortalRouter.post("/:slug/change-password", requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).portalAuth;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Preencha todos os campos." });
    if (newPassword.length < 6) return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres." });

    const [user]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM ClientPortalUser WHERE id=?`, auth.sub
    );
    if (!user || user.password !== currentPassword) return res.status(401).json({ error: "Senha atual incorreta." });

    await (prisma as any).$executeRawUnsafe(
      `UPDATE ClientPortalUser SET password=? WHERE id=?`, newPassword, auth.sub
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── DADOS DO CLIENTE NO PORTAL ────────────────────────────────────────────────

// GET /api/portal/:slug/me  (perfil + resumo)
clientPortalRouter.get("/:slug/me", requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).portalAuth;

    const [client]: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT id, name, phone, email, birthDate, gender, city, state FROM Client WHERE id=?`,
      auth.clientId
    );
    if (!client) return res.status(404).json({ error: "Cliente não encontrado." });

    // Assinaturas ativas/pendentes
    const subscriptions = await (prisma as any).$queryRawUnsafe(
      `SELECT cs.id, cs.status, cs.currentPeriodStart, cs.currentPeriodEnd, cs.nextChargeDate,
              mp.name as planName, mp.price, mp.billingCycle, mp.creditsPerCycle, mp.includedServices, mp.description
       FROM ClientSubscription cs
       JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
       WHERE cs.clientId=? AND cs.tenantId=?
       ORDER BY cs.createdAt DESC`,
      auth.clientId, auth.tenantId
    );

    // Para cada assinatura ativa, buscar créditos
    const subsWithCredits = await Promise.all((subscriptions as any[]).map(async (sub: any) => {
      const [credit]: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM SubscriptionCredit WHERE subscriptionId=? AND cycleEnd > NOW() ORDER BY createdAt DESC LIMIT 1`,
        sub.id
      );
      return { ...sub, currentCredit: credit || null };
    }));

    res.json({ client, subscriptions: subsWithCredits });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/portal/:slug/appointments  (histórico de agendamentos)
clientPortalRouter.get("/:slug/appointments", requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).portalAuth;
    const { limit = 20, offset = 0 } = req.query;

    const appointments = await (prisma as any).$queryRawUnsafe(
      `SELECT a.id, a.date, a.startTime, a.endTime, a.status, a.notes,
              s.name as serviceName, s.price as servicePrice,
              p.name as professionalName
       FROM Appointment a
       LEFT JOIN Service s ON s.id = a.serviceId
       LEFT JOIN Professional p ON p.id = a.professionalId
       WHERE a.clientId=? AND a.tenantId=?
       ORDER BY a.date DESC, a.startTime DESC
       LIMIT ? OFFSET ?`,
      auth.clientId, auth.tenantId, Number(limit), Number(offset)
    );

    res.json(appointments);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/portal/:slug/credits  (histórico de créditos)
clientPortalRouter.get("/:slug/credits", requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).portalAuth;

    const credits = await (prisma as any).$queryRawUnsafe(
      `SELECT sc.*, mp.name as planName
       FROM SubscriptionCredit sc
       JOIN ClientSubscription cs ON cs.id = sc.subscriptionId
       JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
       WHERE cs.clientId=? AND cs.tenantId=?
       ORDER BY sc.createdAt DESC LIMIT 24`,
      auth.clientId, auth.tenantId
    );

    res.json(credits);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/portal/:slug/payments  (histórico de pagamentos)
clientPortalRouter.get("/:slug/payments", requirePortalAuth, async (req: Request, res: Response) => {
  try {
    const auth = (req as any).portalAuth;

    const payments = await (prisma as any).$queryRawUnsafe(
      `SELECT sp.*, mp.name as planName
       FROM SubscriptionPayment sp
       JOIN ClientSubscription cs ON cs.id = sp.subscriptionId
       JOIN MembershipPlan mp ON mp.id = cs.membershipPlanId
       WHERE cs.clientId=? AND cs.tenantId=?
       ORDER BY sp.createdAt DESC LIMIT 24`,
      auth.clientId, auth.tenantId
    );

    res.json(payments);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
