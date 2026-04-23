import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { signToken, requireAuth, type JwtPayload } from "../middleware/auth";
import { randomUUID } from "crypto";

export const authRouter = Router();

// In-memory rate limiter to prevent brute force attacks
const loginAttempts = new Map<string, { count: number, timestamp: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(ip: string): { allowed: boolean, remainingMs?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);
  if (!attempt) return { allowed: true };

  if (attempt.count >= MAX_ATTEMPTS) {
    if (now - attempt.timestamp < LOCKOUT_TIME_MS) {
      return { allowed: false, remainingMs: LOCKOUT_TIME_MS - (now - attempt.timestamp) };
    }
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailedAttempt(ip: string) {
  const attempt = loginAttempts.get(ip) || { count: 0, timestamp: Date.now() };
  attempt.count += 1;
  attempt.timestamp = Date.now();
  loginAttempts.set(ip, attempt);
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Autentica qualquer tipo de usuário e devolve JWT + dados
// ─────────────────────────────────────────────────────────────────────────────
authRouter.post("/login", async (req: Request, res: Response) => {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const rateLimitStatus = checkRateLimit(ip);
  
  if (!rateLimitStatus.allowed) {
    const minutes = Math.ceil((rateLimitStatus.remainingMs || 0) / 60000);
    return res.status(429).json({ error: `Muitas tentativas inválidas. Acesso bloqueado por segurança. Tente novamente em ${minutes} minuto(s).` });
  }

  const { identifier, password } = req.body;
  if (!identifier || !password) {
    recordFailedAttempt(ip);
    return res.status(400).json({ error: "Preencha todos os campos." });
  }

  // 1. Super-admin
  const sa = await (prisma as any).superAdmin.findFirst({
    where: { username: identifier, password },
  });
  if (sa) {
    clearAttempts(ip);
    const token = signToken({ sub: sa.id, type: "superadmin" });
    return res.json({
      token,
      user: { id: sa.id, username: sa.username, type: "superadmin", role: "superadmin", permissions: parsePermissions(sa.permissions) },
    });
  }

  // 2. Admin user
  const admin = await (prisma as any).adminUser.findFirst({
    where: { email: identifier, password, isActive: true },
    include: { tenant: { include: { plan: true } } },
  });
  if (admin) {
    clearAttempts(ip);
    await (prisma as any).adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });
    const token = signToken({
      sub: admin.id,
      type: "admin",
      tenantId: admin.tenantId,
      role: admin.role,
    });
    return res.json({
      token,
      user: buildAdminPayload(admin),
    });
  }

  // 3. Profissional
  const prof = await (prisma as any).professional.findFirst({
    where: {
      OR: [{ name: identifier }, { email: identifier }],
      password,
      isActive: true,
    },
  });
  if (prof) {
    clearAttempts(ip);
    const token = signToken({
      sub: prof.id,
      type: "professional",
      tenantId: prof.tenantId,
      role: prof.role,
    });
    return res.json({
      token,
      user: {
        id: prof.id,
        name: prof.name,
        email: prof.email,
        role: prof.role,
        tenantId: prof.tenantId,
        type: "professional",
        permissions: parsePermissions(prof.permissions),
      },
    });
  }

  recordFailedAttempt(ip);
  return res.status(401).json({ error: "Usuário ou senha inválidos." });
});

// ─── REGISTRO PÚBLICO DE PARCEIROS (VENDAS) ───────────────────
authRouter.get("/plans", async (req, res) => {
  try {
    const plans = await (prisma as any).plan.findMany({ where: { isActive: true } });
    res.json(plans);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

authRouter.post("/register-tenant", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, adminPassword, salesPersonId } = req.body;

  if (!name || !slug || !ownerName || !ownerEmail || !planId || !adminPassword) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }

  try {
    const existing = await (prisma as any).tenant.findFirst({ where: { slug } });
    if (existing) return res.status(400).json({ error: "Este endereço (slug) já está em uso." });

    const existingEmail = await (prisma as any).adminUser.findFirst({ where: { email: ownerEmail } });
    if (existingEmail) return res.status(400).json({ error: "Este e-mail já está cadastrado." });

    const plan = await (prisma as any).plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(400).json({ error: "Plano inválido." });

    const tenantId = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias de teste ou ciclo inicial

    const tenant = await (prisma as any).tenant.create({
      data: {
        id: tenantId,
        name,
        slug,
        ownerName,
        ownerEmail,
        ownerPhone,
        planId,
        isActive: true,
        expiresAt,
        salesPersonId: salesPersonId || null,
        themeColor: "#c9a96e",
      }
    });

    await (prisma as any).adminUser.create({
      data: {
        id: randomUUID(),
        name: ownerName,
        email: ownerEmail,
        password: adminPassword,
        role: "owner",
        tenantId,
        isActive: true,
        permissions: JSON.stringify(["all"]),
      }
    });

    res.json({ success: true, tenantId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Retorna dados + permissões do usuário autenticado pelo token
// ─────────────────────────────────────────────────────────────────────────────
authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as any).auth as JwtPayload;

  if (auth.type === "superadmin") {
    const sa = await (prisma as any).superAdmin.findUnique({ where: { id: auth.sub } });
    if (!sa) return res.status(401).json({ error: "Usuário não encontrado." });
    return res.json({
      id: sa.id,
      username: sa.username,
      type: "superadmin",
      role: "superadmin",
      permissions: parsePermissions(sa.permissions),
    });
  }

  if (auth.type === "admin") {
    const admin = await (prisma as any).adminUser.findUnique({
      where: { id: auth.sub },
      include: { tenant: { include: { plan: true } } },
    });
    if (!admin || !admin.isActive)
      return res.status(401).json({ error: "Usuário não encontrado ou inativo." });
    return res.json(buildAdminPayload(admin));
  }

  if (auth.type === "professional") {
    const prof = await (prisma as any).professional.findUnique({
      where: { id: auth.sub },
    });
    if (!prof || !prof.isActive)
      return res.status(401).json({ error: "Profissional não encontrado ou inativo." });
    return res.json({
      id: prof.id,
      name: prof.name,
      email: prof.email,
      role: prof.role,
      tenantId: prof.tenantId,
      type: "professional",
      permissions: parsePermissions(prof.permissions),
    });
  }

  return res.status(401).json({ error: "Token inválido." });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  (apenas sinaliza pro cliente limpar o token)
// ─────────────────────────────────────────────────────────────────────────────
authRouter.post("/logout", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildAdminPayload(admin: any) {
  const planAllowedModules = JSON.parse(admin.tenant?.plan?.permissions || "[]");
  const basePermissions = parsePermissions(admin.permissions);
  
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    jobTitle: admin.jobTitle,
    phone: admin.phone,
    photo: admin.photo,
    tenantId: admin.tenantId,
    tenantName: admin.tenant?.name,
    tenantSlug: admin.tenant?.slug,
    planName: admin.tenant?.plan?.name,
    canCreateUsers: admin.canCreateUsers,
    canDeleteAccount: admin.canDeleteAccount,
    tenantCreatedAt: admin.tenant?.createdAt,
    tenantExpiresAt: admin.tenant?.expiresAt,
    onboardingStep: admin.tenant?.onboardingStep,
    segment: admin.tenant?.segment,
    themeColor: admin.tenant?.themeColor,
    wppEnabled: admin.tenant?.wppOverride !== null ? admin.tenant?.wppOverride : admin.tenant?.plan?.wppEnabled,
    type: "admin" as const,

    permissions: restrictPermissionsByPlan(basePermissions, planAllowedModules),
  };
}

/**
 * Restringe as permissões do usuário aos módulos permitidos pelo plano da empresa.
 */
function restrictPermissionsByPlan(userPerms: Record<string, any> | null, planPermsRaw: any) {
  let planPerms: Record<string, any> = {};
  try {
    planPerms = typeof planPermsRaw === "string" ? JSON.parse(planPermsRaw) : (planPermsRaw || {});
  } catch {
    planPerms = {};
  }

  // Se o plano não definiu permissões (vazio), mantém as permissões do usuário como estão (compatibilidade)
  if (Object.keys(planPerms).length === 0) return userPerms;

  // Se o usuário tem acesso total (proprietário), liberamos apenas o que o PLANO permite
  if (userPerms === null) {
    return planPerms;
  }

  // Se o usuário tem permissões específicas, filtramos para que ele só tenha 
  // as ações que o plano TAMBÉM permite para aquele módulo.
  const restricted: Record<string, any> = {};
  for (const mod in userPerms) {
    if (planPerms[mod]) {
      const actions: Record<string, boolean> = {};
      for (const action in userPerms[mod]) {
        // Só mantém a ação se ela estiver liberada no plano
        if (planPerms[mod][action]) {
          actions[action] = true;
        }
      }
      if (Object.keys(actions).length > 0) {
        restricted[mod] = actions;
      }
    }
  }
  return restricted;
}



/**
 * Normaliza permissões do banco para um PermissionSet objeto.
 * Formatos aceitos:
 *   null / undefined          → null (acesso total para owners)
 *   '["all"]'                 → null (idem)
 *   '["mod.action", ...]'     → { mod: { action: true } }
 *   '{"mod":{"action":true}}' → retorna como está
 */
function parsePermissions(raw: string | null | undefined): Record<string, Record<string, boolean>> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // ["all"] → acesso total
    if (Array.isArray(parsed) && parsed.length === 1 && parsed[0] === "all") return null;
    // Array flat ["mod.action"]
    if (Array.isArray(parsed)) {
      const result: Record<string, Record<string, boolean>> = {};
      for (const key of parsed) {
        const dot = (key as string).indexOf(".");
        if (dot === -1) continue;
        const mod = key.slice(0, dot);
        const action = key.slice(dot + 1);
        if (!result[mod]) result[mod] = {};
        result[mod][action] = true;
      }
      return result;
    }
    // Já é objeto
    if (typeof parsed === "object") return parsed;
  } catch {}
  return null;
}
