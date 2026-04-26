import { Router, Request, Response } from "express";
import { prisma } from "../prisma";
import { signToken, requireAuth, type JwtPayload } from "../middleware/auth";
import { randomUUID, randomBytes } from "crypto";
import Stripe from "stripe";
import { sendWelcomeEmail, sendResetPasswordEmail } from "../utils/emailService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-04-22.dahlia" });

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

    // Cria o profissional do dono automaticamente (isOwner=true, sem senha própria)
    const ownerProfId = randomUUID();
    await (prisma as any).professional.create({
      data: {
        id: ownerProfId,
        tenantId,
        name: ownerName,
        email: ownerEmail,
        phone: ownerPhone || null,
        accessLevel: "full",
        permissions: "{}",
        isOwner: true,
        attendsSchedule: false,
        isActive: true,
        patAccess: false,
        canAddServicePhotos: false,
      }
    });
    // Horários padrão para o dono (todos inativos por padrão, ele configura depois)
    const days = [
      { dayOfWeek: 1 }, { dayOfWeek: 2 }, { dayOfWeek: 3 },
      { dayOfWeek: 4 }, { dayOfWeek: 5 }, { dayOfWeek: 6 }, { dayOfWeek: 0 },
    ];
    for (const d of days) {
      await (prisma as any).workingHours.create({
        data: { id: randomUUID(), professionalId: ownerProfId, dayOfWeek: d.dayOfWeek, isOpen: false, startTime: "09:00", endTime: "20:00" }
      });
    }

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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/create-checkout
// Cria uma Checkout Session do Stripe com metadata completo
// Usado tanto pela LandingPage (novo cliente) quanto pela AssinaturaTab (upgrade)
// Body: { planId, tenantId?, email?, ref? }
// ─────────────────────────────────────────────────────────────────────────────
authRouter.post("/create-checkout", async (req: Request, res: Response) => {
  const { planId, tenantId, email, ref } = req.body;
  if (!planId) return res.status(400).json({ error: "planId obrigatório" });

  try {
    const plan = await (prisma as any).plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: "Plano não encontrado" });

    // Se não tem stripePriceId configurado, cai no Payment Link legado
    if (!plan.stripePriceId) {
      if (plan.stripePaymentLink) {
        const url = email
          ? `${plan.stripePaymentLink}?prefilled_email=${encodeURIComponent(email)}`
          : plan.stripePaymentLink;
        return res.json({ url });
      }
      return res.status(400).json({ error: "Este plano ainda não tem checkout configurado" });
    }

    // Busca tenant para pegar email e stripeCustomerId se existir
    let customer: string | undefined;
    let salesPersonId: string | null = ref || null;
    let transferData: any = null;

    if (tenantId) {
      const tenant = await (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { stripeCustomerId: true, salesPersonId: true, ownerEmail: true }
      });
      if (tenant?.stripeCustomerId) customer = tenant.stripeCustomerId;
      if (tenant?.salesPersonId) salesPersonId = tenant.salesPersonId;
      if (!email && tenant?.ownerEmail) req.body.email = tenant.ownerEmail;
    }

    // Lógica de Repasse Automático (Stripe Connect)
    if (salesPersonId) {
      try {
        const seller = await (prisma as any).superAdmin.findUnique({
          where: { id: salesPersonId },
          select: { stripeAccountId: true, commissionType: true, commissionValue: true, commissionByPlan: true }
        });

        if (seller?.stripeAccountId) {
          // Verifica se tem comissão específica para este plano
          let commType = seller.commissionType || "percentage";
          let commValue = seller.commissionValue || 0;

          if (seller.commissionByPlan) {
            try {
              const byPlan = JSON.parse(seller.commissionByPlan);
              if (byPlan[plan.id]) {
                commType = byPlan[plan.id].type || commType;
                commValue = byPlan[plan.id].value || commValue;
              }
            } catch (e) {}
          }

          if (commValue > 0) {
            let percent = 0;
            if (commType === "percentage") {
              percent = commValue;
            } else if (commType === "fixed" && plan.price > 0) {
              percent = (commValue / plan.price) * 100;
            }

            // Garante que o percentual não passe de 100% (segurança)
            percent = Math.min(Math.max(percent, 0), 100);

            if (percent > 0) {
              transferData = {
                destination: seller.stripeAccountId,
                amount_percent: parseFloat(percent.toFixed(2)),
              };
            }
          }
        }
      } catch (e) {
        console.error("[transfer-data-error]", e);
      }
    }

    const appUrl = process.env.APP_URL || "https://agendelle.com.br";

    const sessionParams: any = {
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/login?checkout=success&plan=${encodeURIComponent(plan.name)}`,
      cancel_url: `${appUrl}/#precos`,
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          ...(tenantId && { tenantId }),
          ...(salesPersonId && { salesPersonId }),
        },
        ...(transferData && { transfer_data: transferData })
      },
      metadata: {
        planId: plan.id,
        planName: plan.name,
        ...(tenantId && { tenantId }),
        ...(salesPersonId && { salesPersonId }),
      },
      allow_promotion_codes: true,
    };

    // Preficha o email se disponível
    const resolvedEmail = email || req.body.email;
    if (resolvedEmail) sessionParams.customer_email = resolvedEmail;

    // Reutiliza customer Stripe existente
    if (customer) {
      delete sessionParams.customer_email;
      sessionParams.customer = customer;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (e: any) {
    console.error("[create-checkout]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/setup-account?token=xxx
// Valida o token de setup e retorna nome/email do tenant
// ─────────────────────────────────────────────────────────────────────────────
authRouter.get("/setup-account", async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token inválido." });
  }

  const tenant = await (prisma as any).tenant.findFirst({
    where: { setupToken: token },
    select: { id: true, name: true, ownerName: true, ownerEmail: true, setupTokenExpiresAt: true },
  });

  if (!tenant) return res.status(404).json({ error: "Link inválido ou já utilizado." });

  if (tenant.setupTokenExpiresAt && new Date() > new Date(tenant.setupTokenExpiresAt)) {
    return res.status(410).json({ error: "Este link expirou. Entre em contato com o suporte." });
  }

  res.json({
    tenantName: tenant.name,
    ownerName: tenant.ownerName,
    ownerEmail: tenant.ownerEmail,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/setup-account
// Define a senha do owner e limpa o token de setup
// ─────────────────────────────────────────────────────────────────────────────
authRouter.post("/setup-account", async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token e senha são obrigatórios." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
  }

  const tenant = await (prisma as any).tenant.findFirst({
    where: { setupToken: token },
    select: { id: true, name: true, slug: true, ownerName: true, ownerEmail: true, setupTokenExpiresAt: true },
  });

  if (!tenant) return res.status(404).json({ error: "Link inválido ou já utilizado." });

  if (tenant.setupTokenExpiresAt && new Date() > new Date(tenant.setupTokenExpiresAt)) {
    return res.status(410).json({ error: "Este link expirou. Entre em contato com o suporte." });
  }

  // Atualiza a senha do AdminUser do owner e limpa o token
  await (prisma as any).adminUser.updateMany({
    where: { tenantId: tenant.id, role: "owner" },
    data: { password, isActive: true },
  });

  await (prisma as any).tenant.update({
    where: { id: tenant.id },
    data: { setupToken: null, setupTokenExpiresAt: null },
  });

  // Envia email de boas-vindas
  if (tenant.ownerEmail) {
    sendWelcomeEmail({
      toEmail: tenant.ownerEmail,
      toName: tenant.ownerName || "Cliente",
      tenantSlug: tenant.slug,
    }).catch((e: any) => console.error("[Email] Boas-vindas:", e.message));
  }

  console.log(`[Setup] Conta configurada para tenant ${tenant.id}`);
  res.json({ success: true, email: tenant.ownerEmail });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Gera token de reset e envia email (funciona para AdminUser e Professional)
// ─────────────────────────────────────────────────────────────────────────────
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "E-mail obrigatório." });

  console.log(`[forgot-password] Solicitação para: ${email}`);
  console.log(`[forgot-password] SMTP_USER=${process.env.SMTP_USER} SMTP_PASS_SET=${!!process.env.SMTP_PASS && process.env.SMTP_PASS !== "COLOQUE_A_SENHA_AQUI"}`);

  // Responde imediatamente — processamento async em background
  res.json({ ok: true });

  setImmediate(async () => {
    try {
      const resetToken = randomBytes(32).toString("hex");
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

      // Busca AdminUser primeiro
      const admin = await (prisma as any).adminUser.findFirst({
        where: { email, isActive: true },
        select: { id: true, name: true, tenantId: true },
      });

      if (admin) {
        console.log(`[forgot-password] Admin encontrado: ${admin.name}`);
        await (prisma as any).tenant.update({
          where: { id: admin.tenantId },
          data: { resetToken, resetTokenExpiresAt },
        });
        await sendResetPasswordEmail({ toEmail: email, toName: admin.name, resetToken });
        console.log(`[forgot-password] Email enviado para ${email}`);
        return;
      }

      // Tenta Professional
      const prof = await (prisma as any).professional.findFirst({
        where: { email, isActive: true },
        select: { id: true, name: true, tenantId: true },
      });

      if (prof) {
        console.log(`[forgot-password] Profissional encontrado: ${prof.name}`);
        await (prisma as any).tenant.update({
          where: { id: prof.tenantId },
          data: { resetToken, resetTokenExpiresAt },
        });
        await sendResetPasswordEmail({ toEmail: email, toName: prof.name, resetToken });
        console.log(`[forgot-password] Email enviado para ${email}`);
        return;
      }

      console.warn(`[forgot-password] Nenhum usuário encontrado para: ${email}`);
    } catch (e: any) {
      console.error("[forgot-password] ERRO:", e.message);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/reset-password?token=xxx  — valida token
// ─────────────────────────────────────────────────────────────────────────────
authRouter.get("/reset-password", async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") return res.status(400).json({ error: "Token inválido." });

  const tenant = await (prisma as any).tenant.findFirst({
    where: { resetToken: token },
    select: { id: true, ownerEmail: true, ownerName: true, resetTokenExpiresAt: true },
  });

  if (!tenant) return res.status(404).json({ error: "Link inválido ou já utilizado." });
  if (tenant.resetTokenExpiresAt && new Date() > new Date(tenant.resetTokenExpiresAt)) {
    return res.status(410).json({ error: "Este link expirou. Solicite um novo." });
  }

  res.json({ email: tenant.ownerEmail, name: tenant.ownerName });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password  — aplica nova senha
// ─────────────────────────────────────────────────────────────────────────────
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token e senha obrigatórios." });
  if (password.length < 6) return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });

  const tenant = await (prisma as any).tenant.findFirst({
    where: { resetToken: token },
    select: { id: true, ownerEmail: true, resetTokenExpiresAt: true },
  });

  if (!tenant) return res.status(404).json({ error: "Link inválido ou já utilizado." });
  if (tenant.resetTokenExpiresAt && new Date() > new Date(tenant.resetTokenExpiresAt)) {
    return res.status(410).json({ error: "Este link expirou. Solicite um novo." });
  }

  // Atualiza senha de todos os admins + profissional owner deste tenant com esse email
  await (prisma as any).adminUser.updateMany({
    where: { tenantId: tenant.id, email: tenant.ownerEmail },
    data: { password },
  });

  await (prisma as any).professional.updateMany({
    where: { tenantId: tenant.id, email: tenant.ownerEmail },
    data: { password },
  });

  await (prisma as any).tenant.update({
    where: { id: tenant.id },
    data: { resetToken: null, resetTokenExpiresAt: null },
  });

  res.json({ success: true });
});

// GET /api/auth/plans — retorna planos ativos (público)
// já existe no authRouter, mas expõe stripePriceId para o frontend saber se usa checkout dinâmico
authRouter.get("/plan-detail/:id", async (req: Request, res: Response) => {
  try {
    const plan = await (prisma as any).plan.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, price: true, stripePriceId: true, stripePaymentLink: true }
    });
    if (!plan) return res.status(404).json({ error: "Plano não encontrado" });
    res.json(plan);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
