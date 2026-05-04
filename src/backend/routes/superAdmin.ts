import { Router } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import Stripe from "stripe";
import {
  connectSession,
  disconnectSession,
  getSessionInfo,
} from "../wpp/baileys-manager";
import { requireSuperPermission } from "../middleware/auth";

export const superAdminRouter = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-10-16" as any });

// ─── CONTATOS GLOBAIS (WHATSAPP) ───────────────────────────────
superAdminRouter.get("/platform-contacts", async (req, res) => {
  try {
    const contacts = await (prisma as any).platformContact.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(contacts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.post("/platform-contacts", async (req, res) => {
  const { name, phone, type, isPrimary, isActive } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
  try {
    // Se for primário, remove primário de outros do mesmo tipo
    if (isPrimary) {
      await (prisma as any).platformContact.updateMany({
        where: { type: type || "sales" },
        data: { isPrimary: false }
      });
    }

    const contact = await (prisma as any).platformContact.create({
      data: {
        id: randomUUID(),
        name,
        phone,
        type: type || "sales",
        isPrimary: !!isPrimary,
        isActive: isActive !== undefined ? !!isActive : true
      }
    });
    res.json(contact);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.put("/platform-contacts/:id", async (req, res) => {
  const { name, phone, type, isPrimary, isActive } = req.body;
  try {
    // Se for primário, remove primário de outros do mesmo tipo
    if (isPrimary) {
      const current = await (prisma as any).platformContact.findUnique({ where: { id: req.params.id } });
      await (prisma as any).platformContact.updateMany({
        where: { type: type || current?.type || "sales" },
        data: { isPrimary: false }
      });
    }

    const contact = await (prisma as any).platformContact.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(type !== undefined && { type }),
        ...(isPrimary !== undefined && { isPrimary: !!isPrimary }),
        ...(isActive !== undefined && { isActive: !!isActive })
      }
    });
    res.json(contact);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.delete("/platform-contacts/:id", async (req, res) => {
  try {
    await (prisma as any).platformContact.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// ─── ESTATÍSTICAS DE VENDAS ───────────────────────────────────
superAdminRouter.get("/sales-stats", async (req, res) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Usuário não identificado" });

    let tenants: any[] = [];
    try {
      tenants = await (prisma as any).tenant.findMany({
        where: { salesPersonId: userId },
        include: { plan: { select: { name: true, price: true } } },
        orderBy: { createdAt: "desc" }
      });
    } catch (dbErr: any) {
      // Se a coluna salesPersonId não existir ou outro erro de DB, retorna stats vazios
      console.warn("[sales-stats] DB query failed:", dbErr?.message);
    }

    const stats = {
      totalSales: tenants.length,
      totalActive: tenants.filter((t: any) => t.isActive).length,
      totalRecurring: tenants.reduce((acc: number, t: any) => acc + (t.isActive ? Number(t.plan?.price || 0) : 0), 0),
      history: tenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        planName: t.plan?.name || "N/A",
        value: Number(t.plan?.price || 0),
        date: t.createdAt,
        status: t.isActive ? "Ativo" : "Inativo"
      })),
      clients: tenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        ownerName: t.ownerName || t.name,
        phone: t.ownerPhone || t.phone || null,
        email: t.ownerEmail || null,
        planName: t.plan?.name || "N/A",
        isActive: t.isActive,
        expiresAt: t.expiresAt,
      }))
    };

    res.json(stats);
  } catch (e: any) {
    // Fallback absoluto — nunca retornar 500
    res.json({ totalSales: 0, totalActive: 0, totalRecurring: 0, history: [] });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — LOGIN (Movel to global auth later, keeping for mapping)
// ═════════════════════════════════════════════════════════════
superAdminRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const sa = await (prisma as any).superAdmin.findFirst({ where: { username, password } });
  if (!sa) return res.status(401).json({ error: "Credenciais inválidas." });
  res.json({ id: sa.id, username: sa.username, role: "superadmin" });
});

superAdminRouter.put("/profile", async (req, res) => {
  const { id, name, email, phone, birthday, bio, photo, password } = req.body;
  if (!id) return res.status(400).json({ error: "ID do usuário é obrigatório" });
  
  try {
    const data: any = {
      name,
      email: email || null,
      phone: phone || null,
      birthday: birthday ? new Date(birthday) : null,
      bio: bio || null,
      photo: photo || null
    };
    if (password) data.password = password;

    const updated = await (prisma as any).superAdmin.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.get("/profile/:username", async (req, res) => {
  try {
    const sa = await (prisma as any).superAdmin.findUnique({ where: { username: req.params.username } });
    if (!sa) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(sa);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — EQUIPE (STAFF)
// ═════════════════════════════════════════════════════════════
superAdminRouter.get("/staff", async (req, res) => {
  try {
    const staff = await (prisma as any).superAdmin.findMany({
      select: { 
        id: true, username: true, createdAt: true, 
        name: true, email: true, phone: true, birthday: true, 
        role: true, bio: true, photo: true, permissions: true,
        responsableCities: true
      }
    });
    res.json(staff);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.post("/staff", async (req, res) => {
  const { username, password, name, email, phone, birthday, role, bio, photo, permissions } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username e senha obrigatórios" });
  try {
    const existing = await (prisma as any).superAdmin.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: "Este usuário já existe" });

    const newUser = await (prisma as any).superAdmin.create({
      data: { 
        id: randomUUID(), 
        username, 
        password,
        name,
        email: email || null,
        phone: phone || null,
        birthday: birthday ? new Date(birthday) : null,
        role: role || null,
        bio: bio || null,
        photo: photo || null,
        responsableCities: req.body.responsableCities || null,
        permissions: permissions ? (typeof permissions === 'string' ? permissions : JSON.stringify(permissions)) : "{}"
      }
    });
    res.json({ id: newUser.id, username: newUser.username });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.put("/staff/:id", async (req, res) => {
  const { username, password, name, email, phone, birthday, role, bio, photo, permissions } = req.body;
  try {
    const data: any = { 
      username,
      name,
      email: email || null,
      phone: phone || null,
      birthday: birthday ? new Date(birthday) : null,
      role: role || null,
      bio: bio || null,
      photo: photo || null,
      responsableCities: req.body.responsableCities || null,
      permissions: permissions ? (typeof permissions === 'string' ? permissions : JSON.stringify(permissions)) : undefined
    };
    if (password) data.password = password;

    const updated = await (prisma as any).superAdmin.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.delete("/staff/:id", async (req, res) => {
  try {
    await (prisma as any).superAdmin.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Comissões de Vendedores
// ═════════════════════════════════════════════════════════════

// Lista todos os vendedores com suas configurações de comissão e resumo de vendas
superAdminRouter.get("/commissions", async (req, res) => {
  try {
    const sellers = await (prisma as any).superAdmin.findMany({
      select: {
        id: true, username: true, name: true, email: true, photo: true, role: true,
        commissionType: true, commissionValue: true, commissionByPlan: true, trialDays: true,
        tenantsSold: {
          select: {
            id: true, name: true, isActive: true, createdAt: true, expiresAt: true,
            plan: { select: { id: true, name: true, price: true } }
          }
        }
      }
    });

    const plans = await (prisma as any).plan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true },
      orderBy: { price: "asc" }
    });

    // Calcula resumo de comissões por vendedor
    const result = sellers.map((s: any) => {
      let byPlan: Record<string, { type: string; value: number }> = {};
      try { byPlan = JSON.parse(s.commissionByPlan || "{}"); } catch {}

      const activeTenants = s.tenantsSold.filter((t: any) => t.isActive);
      const trialEnd = (t: any) => {
        const d = new Date(t.createdAt);
        d.setDate(d.getDate() + (s.trialDays ?? 30));
        return d;
      };
      const now = new Date();

      // MRR de comissão (apenas tenants fora do trial)
      let monthlyCommission = 0;
      for (const t of activeTenants) {
        if (!t.plan || trialEnd(t) > now) continue;
        const planOverride = byPlan[t.plan.id];
        const type  = planOverride?.type  ?? s.commissionType  ?? "percentage";
        const value = planOverride?.value ?? s.commissionValue ?? 0;
        monthlyCommission += type === "fixed" ? value : t.plan.price * (value / 100);
      }

      return {
        id: s.id, username: s.username, name: s.name, email: s.email,
        photo: s.photo, role: s.role,
        commissionType: s.commissionType ?? "percentage",
        commissionValue: s.commissionValue ?? 0,
        commissionByPlan: byPlan,
        trialDays: s.trialDays ?? 30,
        totalSales: s.tenantsSold.length,
        activeSales: activeTenants.length,
        inTrial: activeTenants.filter((t: any) => trialEnd(t) > now).length,
        monthlyCommission,
      };
    });

    res.json({ sellers: result, plans });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Atualiza configuração de comissão de um vendedor
superAdminRouter.put("/commissions/:id", async (req, res) => {
  const { commissionType, commissionValue, commissionByPlan, trialDays } = req.body;
  try {
    const data: any = {};
    if (commissionType !== undefined) data.commissionType = commissionType;
    if (commissionValue !== undefined) data.commissionValue = Number(commissionValue);
    if (commissionByPlan !== undefined) {
      data.commissionByPlan = typeof commissionByPlan === "string"
        ? commissionByPlan
        : JSON.stringify(commissionByPlan);
    }
    if (trialDays !== undefined) data.trialDays = Number(trialDays);

    const updated = await (prisma as any).superAdmin.update({
      where: { id: req.params.id },
      data,
      select: { id: true, commissionType: true, commissionValue: true, commissionByPlan: true, trialDays: true }
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Resumo de comissões de um vendedor específico (histórico mensal)
superAdminRouter.get("/commissions/:id/summary", async (req, res) => {
  try {
    const seller = await (prisma as any).superAdmin.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, username: true, name: true, stripeAccountId: true,
        commissionType: true, commissionValue: true, commissionByPlan: true, trialDays: true,
        tenantsSold: {
          select: {
            id: true, name: true, isActive: true, createdAt: true, expiresAt: true,
            plan: { select: { id: true, name: true, price: true } }
          }
        }
      }
    });
    if (!seller) return res.status(404).json({ error: "Vendedor não encontrado" });

    let byPlan: Record<string, { type: string; value: number }> = {};
    try { byPlan = JSON.parse(seller.commissionByPlan || "{}"); } catch {}

    const now = new Date();
    const rows: any[] = [];

    for (const t of seller.tenantsSold) {
      if (!t.plan) continue;
      const trialEnd = new Date(t.createdAt);
      trialEnd.setDate(trialEnd.getDate() + (seller.trialDays ?? 30));

      const planOverride = byPlan[t.plan.id];
      const type  = planOverride?.type  ?? seller.commissionType  ?? "percentage";
      const value = planOverride?.value ?? seller.commissionValue ?? 0;
      const commissionAmount = type === "fixed" ? value : t.plan.price * (value / 100);

      rows.push({
        tenantId: t.id,
        tenantName: t.name,
        planName: t.plan.name,
        planPrice: t.plan.price,
        commissionType: type,
        commissionValue: value,
        commissionAmount,
        isActive: t.isActive,
        inTrial: trialEnd > now,
        trialEndsAt: trialEnd.toISOString(),
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      });
    }

    const activeBilled = rows.filter(r => r.isActive && !r.inTrial);
    const totalMonthly = activeBilled.reduce((s: number, r: any) => s + r.commissionAmount, 0);

    res.json({
      seller: { id: seller.id, username: seller.username, name: seller.name, stripeAccountId: seller.stripeAccountId },
      totalSales: rows.length,
      activeBilled: activeBilled.length,
      inTrial: rows.filter(r => r.isActive && r.inTrial).length,
      monthlyCommission: totalMonthly,
      rows,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Stripe Connect (Afiliados/Vendedores)
//  Robusto: lock anti-dup, metadata, business_profile, conta rejeitada/inválida
// ═════════════════════════════════════════════════════════════

// Evita chamadas duplicadas de onboarding no mesmo processo
const onboardingLocks = new Map<string, boolean>();

// Mapeamento legível de campos do Stripe → português
const STRIPE_REQUIREMENT_LABELS: Record<string, string> = {
  "individual.first_name": "Nome",
  "individual.last_name": "Sobrenome",
  "individual.dob.day": "Data de nascimento (dia)",
  "individual.dob.month": "Data de nascimento (mês)",
  "individual.dob.year": "Data de nascimento (ano)",
  "individual.address.line1": "Endereço (rua/número)",
  "individual.address.city": "Cidade",
  "individual.address.state": "Estado",
  "individual.address.postal_code": "CEP",
  "individual.id_number": "CPF",
  "individual.phone": "Telefone",
  "individual.email": "E-mail",
  "individual.verification.document": "Documento de identidade (frente)",
  "individual.verification.additional_document": "Documento de identidade (verso)",
  "business_profile.url": "URL do negócio",
  "business_profile.mcc": "Código de atividade (MCC)",
  "business_profile.product_description": "Descrição do serviço",
  "external_account": "Dados bancários para recebimento",
  "tos_acceptance.date": "Aceite dos termos de serviço",
  "tos_acceptance.ip": "Aceite dos termos de serviço",
  "representative.first_name": "Nome do representante",
  "representative.last_name": "Sobrenome do representante",
};

superAdminRouter.post("/stripe-connect", async (req, res) => {
  const userId = (req as any).auth?.sub;
  try {
    if (!userId) return res.status(401).json({ error: "Usuário não identificado" });

    // Lock anti-duplicidade — evita múltiplas contas por cliques duplos
    if (onboardingLocks.has(userId)) {
      return res.status(429).json({
        error: "Onboarding já em andamento. Aguarde alguns segundos e tente novamente."
      });
    }
    onboardingLocks.set(userId, true);

    const seller = await (prisma as any).superAdmin.findUnique({ where: { id: userId } });
    if (!seller) return res.status(404).json({ error: "Vendedor não encontrado" });

    let accountId = seller.stripeAccountId;

    // Se já tem accountId, verifica se ainda é válido no Stripe
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch (stripeError: any) {
        // Conta inválida ou inacessível → limpa e cria nova
        if (stripeError.code === "account_invalid" || stripeError.statusCode === 403) {
          console.warn(`[Stripe Connect] Conta inválida (${accountId}). Limpando para usuário ${userId}...`);
          accountId = null;
          await (prisma as any).superAdmin.update({
            where: { id: userId },
            data: { stripeAccountId: null }
          });
        } else {
          throw stripeError;
        }
      }
    }

    // Função para criar nova conta Stripe Connect
    const createNewAccount = async () => {
      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: seller.email || undefined,
        business_type: "individual",
        business_profile: {
          product_description: "Comissões de vendas - Agendelle",
          mcc: "7298", // MCC para salões de beleza / serviços de beleza
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          user_id: userId,
          username: seller.username || "",
          nome_completo: seller.name || "",
          platform: "agendelle",
          created_at: new Date().toISOString(),
        },
      } as any, {
        idempotencyKey: `acct_create_user_${userId}_${Date.now()}`
      });

      accountId = account.id;

      await (prisma as any).superAdmin.update({
        where: { id: userId },
        data: { stripeAccountId: accountId }
      });

      console.log("✅ [Stripe Connect] Conta criada:", { accountId, userId, nome: seller.name });
    };

    // Cria conta se não existe
    if (!accountId) {
      await createNewAccount();
    }

    // Gera Account Link para onboarding
    const origin = req.headers.origin || "https://agendelle.com.br";
    let accountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: accountId!,
        refresh_url: `${origin}/super-admin/vendas?refresh=true`,
        return_url: `${origin}/super-admin/vendas?success=true`,
        type: "account_onboarding",
      });
    } catch (linkError: any) {
      const msg = linkError?.raw?.message || linkError?.message || "";
      // Conta rejeitada pelo Stripe → limpa e recria
      if (msg.includes("account has been rejected")) {
        console.warn(`[Stripe Connect] Conta rejeitada (${accountId}). Recriando para ${userId}...`);
        await (prisma as any).superAdmin.update({
          where: { id: userId },
          data: { stripeAccountId: null }
        });
        accountId = null;
        await createNewAccount();
        accountLink = await stripe.accountLinks.create({
          account: accountId!,
          refresh_url: `${origin}/super-admin/vendas?refresh=true`,
          return_url: `${origin}/super-admin/vendas?success=true`,
          type: "account_onboarding",
        });
      } else {
        throw linkError;
      }
    }

    console.log("✅ [Stripe Connect] Account Link criado:", {
      accountId, url: accountLink.url, expires_at: accountLink.expires_at
    });

    res.json({ url: accountLink.url });
  } catch (e: any) {
    console.error("[Stripe Connect Error]:", e);
    res.status(500).json({ error: e.message });
  } finally {
    if (userId) onboardingLocks.delete(userId);
  }
});

superAdminRouter.delete("/stripe-connect", async (req, res) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Usuário não identificado" });

    const seller = await (prisma as any).superAdmin.findUnique({ where: { id: userId } });
    if (!seller) return res.status(404).json({ error: "Vendedor não encontrado" });

    if (seller.stripeAccountId) {
      try {
        await stripe.accounts.del(seller.stripeAccountId);
      } catch (e: any) {
        // ignora se a conta já não existe no Stripe
        if (e?.code !== 'account_invalid') throw e;
      }
    }

    await (prisma as any).superAdmin.update({
      where: { id: userId },
      data: { stripeAccountId: null }
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[Stripe Connect Reset Error]:", e);
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.get("/stripe-connect/status", async (req, res) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Usuário não identificado" });

    const seller = await (prisma as any).superAdmin.findUnique({ where: { id: userId } });
    if (!seller) return res.status(404).json({ error: "Vendedor não encontrado" });

    if (!seller.stripeAccountId) {
      return res.json({ connected: false });
    }

    let account;
    try {
      account = await stripe.accounts.retrieve(seller.stripeAccountId);
    } catch (stripeError: any) {
      // Conta inválida → limpa automaticamente e retorna não conectado
      if (stripeError.code === "account_invalid" || stripeError.statusCode === 403) {
        console.warn(`[Stripe Connect Status] Conta inválida (${seller.stripeAccountId}). Limpando...`);
        await (prisma as any).superAdmin.update({
          where: { id: userId },
          data: { stripeAccountId: null }
        });
        return res.json({
          connected: false,
          message: "Conta Stripe anterior não é mais válida. Por favor, conecte uma nova conta."
        });
      }
      throw stripeError;
    }

    // Mapeia requisitos pendentes para termos em português
    const currentlyDue = account.requirements?.currently_due || [];
    const pastDue = account.requirements?.past_due || [];
    const eventuallyDue = account.requirements?.eventually_due || [];
    const pendingVerification = account.requirements?.pending_verification || [];
    const disabledReason = account.requirements?.disabled_reason || null;

    const requiresAction = currentlyDue.length > 0 || pastDue.length > 0;
    const isPendingVerification = disabledReason === "requirements.pending_verification" || pendingVerification.length > 0;

    // Traduz os campos pendentes para exibição amigável
    // Se está pendente de verificação, removemos os itens que já estão sendo analisados
    const activePendingItems = [...new Set([...pastDue, ...currentlyDue])].filter(
      (item) => !pendingVerification.includes(item)
    ).map(
      (field: string) => STRIPE_REQUIREMENT_LABELS[field] || field
    );

    res.json({
      connected: true,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requiresAction,
      isPendingVerification,
      disabledReason,
      pendingItems: activePendingItems,
      pendingCount: activePendingItems.length,
      accountId: seller.stripeAccountId,
    });
  } catch (e: any) {
    console.error("[Stripe Connect Status Error]:", e);
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Planos
// ═════════════════════════════════════════════════════════════
superAdminRouter.get("/plans", async (req, res) => {
  try {
    // all=true retorna inclusive inativos (para WppTab e edições)
    const all = req.query.all === "true";
    const plans = await (prisma as any).plan.findMany({
      where: all ? {} : { isActive: true },
      orderBy: { price: "asc" },
    });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar planos." });
  }
});

superAdminRouter.post("/plans", async (req, res) => {
  const {
    name, price, maxProfessionals, maxAdminUsers,
    canCreateAdminUsers, canDeleteAccount,
    systemBotEnabled, qrCodeBotEnabled, siteEnabled, agendaExternaEnabled,
    priceExtraProfessional, stripePaymentLink, stripePriceId,
    features, permissions, wppEnabled,
    description, isPopular, showOnSite
  } = req.body;

  if (!name) return res.status(400).json({ error: "Nome do plano obrigatório." });

  try {
    const plan = await (prisma as any).plan.create({
      data: {
        id: randomUUID(),
        name,
        price: price || 0,
        maxProfessionals: maxProfessionals || 3,
        maxAdminUsers: maxAdminUsers || 1,
        canCreateAdminUsers: !!canCreateAdminUsers,
        canDeleteAccount: !!canDeleteAccount,
        systemBotEnabled: systemBotEnabled !== undefined ? !!systemBotEnabled : true,
        qrCodeBotEnabled: !!qrCodeBotEnabled,
        siteEnabled: siteEnabled !== undefined ? !!siteEnabled : true,
        agendaExternaEnabled: agendaExternaEnabled !== undefined ? !!agendaExternaEnabled : true,
        priceExtraProfessional: priceExtraProfessional || 0,
        stripePaymentLink: stripePaymentLink || null,
        stripePriceId: stripePriceId || null,
        wppEnabled: !!wppEnabled,
        features: Array.isArray(features) ? JSON.stringify(features) : (features || "[]"),
        permissions: typeof permissions === "object" ? JSON.stringify(permissions) : (permissions || "{}"),
        description: description || null,
        isPopular: !!isPopular,
        showOnSite: showOnSite !== undefined ? !!showOnSite : true,
      },
    });
    res.json(plan);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao criar plano." });
  }
});

superAdminRouter.put("/plans/:id", async (req, res) => {
  const {
    name, price, maxProfessionals, maxAdminUsers,
    canCreateAdminUsers, canDeleteAccount,
    systemBotEnabled, qrCodeBotEnabled, siteEnabled, agendaExternaEnabled,
    priceExtraProfessional, stripePaymentLink, stripePriceId,
    features, permissions, isActive, wppEnabled,
    description, isPopular, showOnSite
  } = req.body;

  try {
    const data: any = {};

    if (name !== undefined) data.name = name;
    if (price !== undefined) data.price = price;
    if (maxProfessionals !== undefined) data.maxProfessionals = maxProfessionals;
    if (maxAdminUsers !== undefined) data.maxAdminUsers = maxAdminUsers;
    if (canCreateAdminUsers !== undefined) data.canCreateAdminUsers = canCreateAdminUsers ? true : false;
    if (canDeleteAccount !== undefined) data.canDeleteAccount = canDeleteAccount ? true : false;
    if (systemBotEnabled !== undefined) data.systemBotEnabled = systemBotEnabled ? true : false;
    if (qrCodeBotEnabled !== undefined) data.qrCodeBotEnabled = qrCodeBotEnabled ? true : false;
    if (siteEnabled !== undefined) data.siteEnabled = siteEnabled ? true : false;
    if (agendaExternaEnabled !== undefined) data.agendaExternaEnabled = agendaExternaEnabled ? true : false;
    if (priceExtraProfessional !== undefined) data.priceExtraProfessional = priceExtraProfessional;
    if (stripePaymentLink !== undefined) data.stripePaymentLink = stripePaymentLink || null;
    if (stripePriceId !== undefined) data.stripePriceId = stripePriceId || null;
    if (isActive !== undefined) data.isActive = isActive ? true : false;
    if (wppEnabled !== undefined) data.wppEnabled = wppEnabled ? true : false;
    if (features !== undefined) data.features = Array.isArray(features) ? JSON.stringify(features) : features;
    if (permissions !== undefined) data.permissions = typeof permissions === "object" ? JSON.stringify(permissions) : permissions;
    if (description !== undefined) data.description = description || null;
    if (isPopular !== undefined) data.isPopular = !!isPopular;
    if (showOnSite !== undefined) data.showOnSite = !!showOnSite;

    const plan = await (prisma as any).plan.update({
      where: { id: req.params.id },
      data,
    });

    res.json(plan);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar plano." });
  }
});


superAdminRouter.delete("/plans/:id", async (req, res) => {
  try {
    const tenantsCount = await (prisma as any).tenant.count({ where: { planId: req.params.id } });
    if (tenantsCount === 0) {
      await (prisma as any).plan.delete({ where: { id: req.params.id } });
    } else {
      await (prisma as any).plan.update({ where: { id: req.params.id }, data: { isActive: false } });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir plano." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Tenants (parceiros / estúdios)
// ═════════════════════════════════════════════════════════════
superAdminRouter.get("/tenants", async (req, res) => {
  try {
    const tenants = await (prisma as any).tenant.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const plans = await (prisma as any).plan.findMany({
      select: { id: true, name: true, price: true }
    });
    
    const adminusers = await (prisma as any).adminUser.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, tenantId: true }
    });

    const tenantsMapped = tenants.map((t: any) => {
      const plan = plans.find((p: any) => p.id === t.planId) || { id: "unknown", name: "Plano Removido/Inválido", price: 0 };
      const adminuser = adminusers.filter((a: any) => a.tenantId === t.id);
      return {
        ...t,
        plan,
        adminuser
      };
    });

    res.json(tenantsMapped);
  } catch (e: any) {
    console.error("Erro ao buscar parceiros no banco:", e);
    res.status(500).json({ error: "Erro ao buscar parceiros.", details: e?.message });
  }
});

superAdminRouter.post("/tenants", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, adminPassword, expiresAt, salesPersonId } = req.body;

  if (!name || !slug || !ownerName || !ownerEmail || !planId || !adminPassword) {
    return res.status(400).json({ error: "Campos obrigatórios: name, slug, ownerName, ownerEmail, planId, adminPassword." });
  }

  const existing = await (prisma as any).tenant.findFirst({ where: { slug } });
  if (existing) return res.status(400).json({ error: "Slug já está em uso. Escolha outro." });

  const existingEmail = await (prisma as any).adminUser.findFirst({ where: { email: ownerEmail } });
  if (existingEmail) return res.status(400).json({ error: "E-mail já está cadastrado." });

  const plan = await (prisma as any).plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) return res.status(400).json({ error: "Plano não encontrado." });

  try {
    const tenantId = randomUUID();
    const defaultExpires = new Date();
    defaultExpires.setDate(defaultExpires.getDate() + 30);

    const tenant = await (prisma as any).tenant.create({
      data: {
        id: tenantId,
        name,
        slug,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || null,
        planId,
        notes: notes || null,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : defaultExpires,
        themeColor: "#c9a96e",
        salesPersonId: salesPersonId || null,
      },
    });

    const adminUser = await (prisma as any).adminUser.create({
      data: {
        id: randomUUID(),
        name: ownerName,
        email: ownerEmail,
        password: adminPassword,
        role: "owner",
        jobTitle: "Proprietário",
        phone: ownerPhone || null,
        canCreateUsers: plan.canCreateAdminUsers,
        canDeleteAccount: plan.canDeleteAccount,
        isActive: true,
        tenantId,
        permissions: JSON.stringify(["all"]),
      },
    });

    res.json({
      tenant,
      adminUser: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
    });
  } catch (e: any) {
    console.error("Erro ao criar parceiro:", e);
    res.status(400).json({ error: e.message || "Erro ao criar parceiro." });
  }
});

superAdminRouter.patch("/tenants/:id", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, isActive, expiresAt, maxAdminUsersOverride } = req.body;
  try {
    const current = await (prisma as any).tenant.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Parceiro não encontrado." });

    let blockedAt = (current as any).blockedAt;
    if (isActive === true) blockedAt = null;
    if (isActive === false && !(current as any).blockedAt) blockedAt = new Date();

    const tenant = await (prisma as any).tenant.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(ownerName !== undefined && { ownerName }),
        ...(ownerEmail !== undefined && { ownerEmail }),
        ...(ownerPhone !== undefined && { ownerPhone }),
        ...(planId !== undefined && { planId }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(maxAdminUsersOverride !== undefined && { maxAdminUsersOverride: maxAdminUsersOverride || null }),
        blockedAt,
      },
      include: { plan: { select: { id: true, name: true, price: true } } },
    });
    res.json(tenant);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar parceiro." });
  }
});

superAdminRouter.put("/tenants/:id", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, isActive, expiresAt, maxAdminUsersOverride } = req.body;
  try {
    const current = await (prisma as any).tenant.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Parceiro não encontrado." });

    let blockedAt = (current as any).blockedAt;
    if (isActive === true) blockedAt = null;
    if (isActive === false && !(current as any).blockedAt) blockedAt = new Date();

    const tenant = await (prisma as any).tenant.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(ownerName !== undefined && { ownerName }),
        ...(ownerEmail !== undefined && { ownerEmail }),
        ...(ownerPhone !== undefined && { ownerPhone }),
        ...(planId !== undefined && { planId }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(maxAdminUsersOverride !== undefined && { maxAdminUsersOverride: maxAdminUsersOverride || null }),
        blockedAt,
      },
      include: { plan: { select: { id: true, name: true, price: true } } },
    });
    res.json(tenant);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar parceiro." });
  }
});

superAdminRouter.delete("/tenants/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Delete in dependency order to avoid FK violations
    await (prisma as any).wppMessageSent.deleteMany({ where: { tenantId: id } });
    await (prisma as any).wppMessageTemplate.deleteMany({ where: { tenantId: id } });
    await (prisma as any).wppBotConfig.deleteMany({ where: { tenantId: id } });
    await (prisma as any).wppInstance.deleteMany({ where: { tenantId: id } });
    await (prisma as any).userPreferences.deleteMany({ where: { tenantId: id } });
    await (prisma as any).agendaSettings.deleteMany({ where: { tenantId: id } });
    await (prisma as any).closedDay.deleteMany({ where: { tenantId: id } });
    await (prisma as any).scheduleRelease.deleteMany({ where: { tenantId: id } });
    await (prisma as any).specialScheduleDay.deleteMany({ where: { tenantId: id } });
    await (prisma as any).cashEntry.deleteMany({ where: { tenantId: id } });
    // Subscriptions (child records first)
    await (prisma as any).subscriptionPayment.deleteMany({ where: { tenantId: id } });
    await (prisma as any).subscriptionCredit.deleteMany({ where: { tenantId: id } });
    await (prisma as any).clientSubscription.deleteMany({ where: { tenantId: id } });
    await (prisma as any).membershipPlan.deleteMany({ where: { tenantId: id } });
    await (prisma as any).clientPortalUser.deleteMany({ where: { tenantId: id } });
    // Appointments reference comanda, client, professional, service — clear first
    await (prisma as any).appointment.deleteMany({ where: { tenantId: id } });
    // ComandaItems cascade from Comanda; delete comanda deletes items
    const comandas = await (prisma as any).comanda.findMany({ where: { tenantId: id }, select: { id: true } });
    const comandaIds = comandas.map((c: any) => c.id);
    if (comandaIds.length > 0) {
      await (prisma as any).comandaItem.deleteMany({ where: { comandaId: { in: comandaIds } } });
    }
    await (prisma as any).comanda.deleteMany({ where: { tenantId: id } });
    // Stock movements reference products
    await (prisma as any).stockMovement.deleteMany({ where: { tenantId: id } });
    // ServiceConsumption + ServiceProduct reference services and products
    await (prisma as any).serviceConsumption.deleteMany({ where: { tenantId: id } });
    // Services (packageService cascades on delete)
    const services = await (prisma as any).service.findMany({ where: { tenantId: id }, select: { id: true } });
    const serviceIds = services.map((s: any) => s.id);
    if (serviceIds.length > 0) {
      await (prisma as any).packageService.deleteMany({ where: { packageId: { in: serviceIds } } });
      await (prisma as any).packageService.deleteMany({ where: { serviceId: { in: serviceIds } } });
      await (prisma as any).serviceProduct.deleteMany({ where: { serviceId: { in: serviceIds } } });
    }
    await (prisma as any).service.deleteMany({ where: { tenantId: id } });
    // Products (serviceProduct/stockMovement already cleared)
    await (prisma as any).product.deleteMany({ where: { tenantId: id } });
    await (prisma as any).sector.deleteMany({ where: { tenantId: id } });
    await (prisma as any).supplier.deleteMany({ where: { tenantId: id } });
    await (prisma as any).manufacturer.deleteMany({ where: { tenantId: id } });
    // Professionals (workingHours reference professional)
    const professionals = await (prisma as any).professional.findMany({ where: { tenantId: id }, select: { id: true } });
    const profIds = professionals.map((p: any) => p.id);
    if (profIds.length > 0) {
      await (prisma as any).workingHours.deleteMany({ where: { professionalId: { in: profIds } } });
    }
    await (prisma as any).professional.deleteMany({ where: { tenantId: id } });
    // Clients
    await (prisma as any).client.deleteMany({ where: { tenantId: id } });
    // Admin users
    await (prisma as any).adminUser.deleteMany({ where: { tenantId: id } });
    // Finally delete the tenant
    await (prisma as any).tenant.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir parceiro." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Stats
// ═════════════════════════════════════════════════════════════
superAdminRouter.get("/stats", async (req, res) => {
  try {
    const [totalTenants, activeTenants, totalAdmins, activeAdmins, rawPlans] = await Promise.all([
      (prisma as any).tenant.count(),
      (prisma as any).tenant.count({ where: { isActive: true } }),
      (prisma as any).adminUser.count(),
      (prisma as any).adminUser.count({ where: { isActive: true } }),
      (prisma as any).plan.findMany({ select: { id: true, name: true, price: true, isActive: true, wppEnabled: true } }),
    ]);

    const plans = await Promise.all(
      rawPlans.map(async (p: any) => ({
        ...p,
        _count: { tenants: await (prisma as any).tenant.count({ where: { planId: p.id } }) },
      }))
    );

    res.json({ totalTenants, activeTenants, totalAdmins, activeAdmins, plans });
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar stats." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Admin Users
// ═════════════════════════════════════════════════════════════
superAdminRouter.get("/admin-users", async (req, res) => {
  try {
    const users = await (prisma as any).adminUser.findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const tenants = await (prisma as any).tenant.findMany({
      select: { id: true, name: true, slug: true }
    });

    const usersMapped = users.map((u: any) => {
      const tenant = tenants.find((t: any) => t.id === u.tenantId) || { id: "unknown", name: "Estúdio Removido", slug: "unknown" };
      return { ...u, tenant };
    });

    res.json(usersMapped);
  } catch (e: any) {
    console.error("Erro ao buscar usuários no banco:", e);
    res.status(500).json({ error: "Erro ao buscar usuários.", details: e?.message });
  }
});

superAdminRouter.post("/admin-users", async (req, res) => {
  const { name, email, password, role, jobTitle, phone, tenantId, canCreateUsers, canDeleteAccount, permissions } = req.body;
  if (!name || !email || !password || !tenantId) return res.status(400).json({ error: "name, email, password e tenantId são obrigatórios." });
  const existing = await (prisma as any).adminUser.findFirst({ where: { email } });
  if (existing) return res.status(400).json({ error: "E-mail já cadastrado." });
  try {
    const user = await (prisma as any).adminUser.create({
      data: {
        id: randomUUID(),
        name, email, password,
        role: role || "admin",
        jobTitle: jobTitle || null,
        phone: phone || null,
        tenantId,
        canCreateUsers: canCreateUsers || false,
        canDeleteAccount: canDeleteAccount || false,
        isActive: true,
        permissions: permissions ? JSON.stringify(permissions) : null,
      },
    });
    res.json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao criar usuário." });
  }
});

superAdminRouter.put("/admin-users/:id", async (req, res) => {
  const { name, email, password, role, jobTitle, phone, isActive, canCreateUsers, canDeleteAccount, permissions, photo } = req.body;
  try {
    const user = await (prisma as any).adminUser.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(password !== undefined && password !== "" && { password }),
        ...(role !== undefined && { role }),
        ...(jobTitle !== undefined && { jobTitle }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive }),
        ...(canCreateUsers !== undefined && { canCreateUsers }),
        ...(canDeleteAccount !== undefined && { canDeleteAccount }),
        ...(permissions !== undefined && { permissions: Array.isArray(permissions) ? JSON.stringify(permissions) : permissions }),
        ...(photo !== undefined && { photo }),
      },
    });
    res.json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar usuário." });
  }
});

superAdminRouter.delete("/admin-users/:id", async (req, res) => {
  try {
    await (prisma as any).adminUser.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir usuário." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — WhatsApp / WPP
// ═════════════════════════════════════════════════════════════

// Lista todas as instâncias WPP de todos os parceiros com status
superAdminRouter.get("/wpp/instances", async (req, res) => {
  try {
    const [instances, tenants, plans] = await Promise.all([
      (prisma as any).wppInstance.findMany(),
      (prisma as any).tenant.findMany({ select: { id: true, name: true, slug: true, wppOverride: true, planId: true } }),
      (prisma as any).plan.findMany({ select: { id: true, name: true, wppEnabled: true } }),
    ]);

    const result = tenants.map((t: any) => {
      const plan = plans.find((p: any) => p.id === t.planId);
      const instance = instances.find((i: any) => i.tenantId === t.id);
      const wppByPlan = !!plan?.wppEnabled;
      const wppEffective = t.wppOverride !== null && t.wppOverride !== undefined ? !!t.wppOverride : wppByPlan;
      return {
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        planName: plan?.name || "—",
        wppByPlan,
        wppOverride: t.wppOverride,
        wppEnabled: wppEffective,
        instance: instance ? {
          instanceName: instance.instanceName,
          status: instance.status,
          phone: instance.phone,
          isActive: instance.isActive,
          qrCode: instance.qrCode || null,
          apiUrl: instance.apiUrl || null,
        } : null,
      };
    });

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Atualiza wppOverride de um parceiro (null = herda do plano, true = forçar on, false = forçar off)
superAdminRouter.patch("/wpp/tenant/:id", async (req, res) => {
  const { wppOverride } = req.body;
  try {
    const tenant = await (prisma as any).tenant.update({
      where: { id: req.params.id },
      data: { wppOverride: wppOverride === null ? null : !!wppOverride },
    });
    res.json({ tenantId: tenant.id, wppOverride: tenant.wppOverride });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Atualiza wppEnabled de um plano
superAdminRouter.patch("/wpp/plan/:id", async (req, res) => {
  const { wppEnabled } = req.body;
  try {
    const plan = await (prisma as any).plan.update({
      where: { id: req.params.id },
      data: { wppEnabled: !!wppEnabled },
    });
    res.json({ planId: plan.id, wppEnabled: plan.wppEnabled });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ── Bot do Sistema (tenantId = "system") ─────────────────────────────────────

// Retorna status do bot global
superAdminRouter.get("/wpp/system/status", async (_req, res) => {
  try {
    const info = getSessionInfo("system");
    // Complementa com dados do BD se existir
    const inst = await (prisma as any).wppInstance.findUnique({ where: { tenantId: "system" } }).catch(() => null);
    res.json({ status: info.status, phone: info.phone, qrCode: info.qrDataUrl, instanceName: inst?.instanceName || "system-bot" });
  } catch (e: any) {
    res.status(400).json({ error: e?.message });
  }
});

// Conecta bot global
superAdminRouter.post("/wpp/system/connect", async (_req, res) => {
  try {
    // Garante registro no BD
    await (prisma as any).wppInstance.upsert({
      where: { tenantId: "system" },
      create: { id: randomUUID(), tenantId: "system", instanceName: "system-bot", apiUrl: "", apiKey: null, status: "disconnected", isActive: false },
      update: {},
    });
    const info = await connectSession("system");
    res.json({ status: info.status, phone: info.phone, qrCode: info.qrDataUrl });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Erro ao conectar bot do sistema." });
  }
});

// Status polling bot global
superAdminRouter.get("/wpp/system/poll", async (_req, res) => {
  try {
    const info = getSessionInfo("system");
    res.json({ status: info.status, phone: info.phone, qrCode: info.qrDataUrl });
  } catch (e: any) {
    res.status(400).json({ error: e?.message });
  }
});

// Desconecta bot global
superAdminRouter.post("/wpp/system/disconnect", async (_req, res) => {
  try {
    await disconnectSession("system");
    await (prisma as any).wppInstance.updateMany({ where: { tenantId: "system" }, data: { status: "disconnected", isActive: false, phone: null } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e?.message });
  }
});

// Cria instância para o parceiro (se não existir) e já inicia conexão
superAdminRouter.post("/wpp/tenant/:tenantId/setup", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
    if (!tenant) return res.status(404).json({ error: "Parceiro não encontrado." });

    // Cria instância se não existir
    await (prisma as any).wppInstance.upsert({
      where: { tenantId },
      create: {
        id: randomUUID(),
        tenantId,
        instanceName: tenant.slug,
        apiUrl: "",
        apiKey: null,
        status: "disconnected",
        isActive: false,
      },
      update: {},
    });

    // Conecta via Baileys
    const info = await connectSession(tenantId);
    res.json({ status: info.status, phone: info.phone, qrCode: info.qrDataUrl });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Erro ao configurar." });
  }
});

// Pegar QR / iniciar conexão de um parceiro pelo super-admin (via Baileys)
superAdminRouter.post("/wpp/tenant/:tenantId/connect", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const instance = await (prisma as any).wppInstance.findUnique({ where: { tenantId } });
    if (!instance) return res.status(404).json({ error: "Instância não configurada para este parceiro." });

    const info = await connectSession(tenantId);
    res.json({ status: info.status, phone: info.phone, qrCode: info.qrDataUrl });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Erro ao conectar." });
  }
});

// Verificar status de uma instância (via Baileys em memória)
superAdminRouter.get("/wpp/tenant/:tenantId/status", async (req, res) => {
  const { tenantId } = req.params;
  try {
    const info = getSessionInfo(tenantId);
    res.json({ status: info.status, phone: info.phone, qrCode: info.qrDataUrl });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Erro ao verificar status." });
  }
});

// Desconectar instância de um parceiro (via Baileys)
superAdminRouter.post("/wpp/tenant/:tenantId/disconnect", async (req, res) => {
  const { tenantId } = req.params;
  try {
    await disconnectSession(tenantId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Erro ao desconectar." });
  }
});

// Status do scheduler (quantas mensagens enviadas hoje)
superAdminRouter.get("/wpp/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total24h, total60min, totalToday] = await Promise.all([
      (prisma as any).wppMessageSent.count({ where: { type: { contains: "24h" } } }),
      (prisma as any).wppMessageSent.count({ where: { type: { contains: "60min" } } }),
      (prisma as any).wppMessageSent.count({ where: { sentAt: { gte: today } } }),
    ]);

    res.json({ total24h, total60min, totalToday });
  } catch (e: any) {
    // Se tabela não existir ainda, retorna zeros
    res.json({ total24h: 0, total60min: 0, totalToday: 0 });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Bot Central (Setores, Conversas, Fila)
// ═════════════════════════════════════════════════════════════

// Lista todos os setores do bot central (tenantId = "system")
superAdminRouter.get("/bot/sectors", async (_req, res) => {
  try {
    const sectors = await (prisma as any).wppBotSector.findMany({
      where: { tenantId: "system" },
      orderBy: { sortOrder: "asc" },
    });
    const result = sectors.map((s: any) => ({
      ...s,
      attendants: JSON.parse(s.attendants || "[]"),
    }));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Cria setor
superAdminRouter.post("/bot/sectors", async (req, res) => {
  const { name, menuKey, description, attendants, sortOrder } = req.body;
  if (!name || !menuKey) return res.status(400).json({ error: "name e menuKey são obrigatórios." });
  try {
    const sector = await (prisma as any).wppBotSector.create({
      data: {
        tenantId: "system",
        name,
        menuKey: String(menuKey),
        description: description || null,
        attendants: JSON.stringify(Array.isArray(attendants) ? attendants : []),
        sortOrder: sortOrder ?? 0,
        isActive: true,
      },
    });
    res.json({ ...sector, attendants: JSON.parse(sector.attendants) });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Atualiza setor
superAdminRouter.patch("/bot/sectors/:id", async (req, res) => {
  const { name, menuKey, description, attendants, isActive, sortOrder } = req.body;
  try {
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (menuKey !== undefined) data.menuKey = String(menuKey);
    if (description !== undefined) data.description = description;
    if (attendants !== undefined) data.attendants = JSON.stringify(Array.isArray(attendants) ? attendants : []);
    if (isActive !== undefined) data.isActive = !!isActive;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const sector = await (prisma as any).wppBotSector.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ ...sector, attendants: JSON.parse(sector.attendants) });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Remove setor
superAdminRouter.delete("/bot/sectors/:id", async (req, res) => {
  try {
    await (prisma as any).wppBotSector.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Lista conversas (fila) — com filtros opcionais
superAdminRouter.get("/bot/conversations", async (req, res) => {
  const { status, sectorId } = req.query;
  try {
    const where: any = { tenantId: "system" };
    if (status) where.status = status;
    if (sectorId) where.sectorId = sectorId;

    const conversations = await (prisma as any).wppConversation.findMany({
      where,
      include: {
        sector: { select: { id: true, name: true, menuKey: true } },
        messages: { orderBy: { sentAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(conversations);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Detalhes de uma conversa com histórico
superAdminRouter.get("/bot/conversations/:id", async (req, res) => {
  try {
    const conv = await (prisma as any).wppConversation.findUnique({
      where: { id: req.params.id },
      include: {
        sector: true,
        messages: { orderBy: { sentAt: "asc" } },
      },
    });
    if (!conv) return res.status(404).json({ error: "Conversa não encontrada." });
    res.json(conv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Encerra uma conversa manualmente (super-admin)
superAdminRouter.patch("/bot/conversations/:id/close", async (req, res) => {
  try {
    const conv = await (prisma as any).wppConversation.update({
      where: { id: req.params.id },
      data: { status: "closed", closedBy: "system", closedAt: new Date() },
    });
    res.json({ success: true, conversationId: conv.id });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Estatísticas do bot central
superAdminRouter.get("/bot/stats", async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalWaiting, totalActive, totalClosedToday, totalConversations] = await Promise.all([
      (prisma as any).wppConversation.count({ where: { tenantId: "system", status: "waiting" } }),
      (prisma as any).wppConversation.count({ where: { tenantId: "system", status: "active" } }),
      (prisma as any).wppConversation.count({ where: { tenantId: "system", status: "closed", closedAt: { gte: today } } }),
      (prisma as any).wppConversation.count({ where: { tenantId: "system", createdAt: { gte: today } } }),
    ]);

    const sectorStats = await (prisma as any).wppBotSector.findMany({
      where: { tenantId: "system", isActive: true },
      select: { id: true, name: true },
    });

    const sectorCounts = await Promise.all(
      sectorStats.map(async (s: any) => ({
        sectorId: s.id,
        name: s.name,
        waiting: await (prisma as any).wppConversation.count({ where: { sectorId: s.id, status: "waiting" } }),
        active: await (prisma as any).wppConversation.count({ where: { sectorId: s.id, status: "active" } }),
      }))
    );

    res.json({ totalWaiting, totalActive, totalClosedToday, totalConversations, sectorCounts });
  } catch (e: any) {
    res.json({ totalWaiting: 0, totalActive: 0, totalClosedToday: 0, totalConversations: 0, sectorCounts: [] });
  }
});

// ─── FINANCEIRO DA PLATAFORMA ──────────────────────────────────────────────

// Helper para gerar entradas virtuais das assinaturas ativas
async function getVirtualSubscriptionEntries(from?: string, to?: string) {
  const tenants = await (prisma as any).tenant.findMany({
    where: { isActive: true },
    include: { plan: true, salesPerson: true }
  });
  const virtualEntries: any[] = [];
  const fromDate = from ? new Date(from) : new Date("2000-01-01T00:00:00.000Z");
  const toDate = to ? new Date(to + "T23:59:59.999Z") : new Date();
  const now = new Date();

  for (const t of tenants) {
    if (!t.plan || !t.plan.price) continue;
    let currentDate = new Date(t.createdAt);
    if (isNaN(currentDate.getTime())) currentDate = new Date();

    // Calcula data de fim do trial (sem cobrança de comissão)
    const trialDays = t.salesPerson?.trialDays ?? 30;
    const trialEnd = new Date(t.createdAt);
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    // Resolve comissão do vendedor para este tenant/plano
    function resolveCommission(salesPerson: any, planId: string, planPrice: number): number {
      if (!salesPerson) return 0;
      // Verifica se há taxa específica para este plano
      let byPlan: Record<string, { type: string; value: number }> = {};
      try { byPlan = JSON.parse(salesPerson.commissionByPlan || "{}"); } catch {}
      const planOverride = byPlan[planId];
      const type  = planOverride?.type  ?? salesPerson.commissionType  ?? "percentage";
      const value = planOverride?.value ?? salesPerson.commissionValue ?? 0;
      return type === "fixed" ? value : planPrice * (value / 100);
    }

    while (currentDate <= now) {
      if (currentDate >= fromDate && currentDate <= toDate) {
        // Só gera entrada de receita após o período de trial
        if (currentDate >= trialEnd) {
          virtualEntries.push({
            id: `virt-inc-${t.id}-${currentDate.getTime()}`,
            type: "income",
            category: "Assinatura de Plano",
            description: `Assinatura: ${t.name} (${t.plan.name})`,
            amount: t.plan.price,
            date: new Date(currentDate).toISOString(),
            recurrence: "monthly",
            tenantId: t.id,
            planId: t.plan.id,
            createdAt: t.createdAt
          });

          // Despesa: Taxas de Gateway (Stripe) ~4.9% + R$0.39
          const gatewayFee = (t.plan.price * 0.049) + 0.39;
          virtualEntries.push({
            id: `virt-fee-${t.id}-${currentDate.getTime()}`,
            type: "expense",
            category: "Impostos e Taxas",
            description: `Taxa Gateway (Assinatura): ${t.name}`,
            amount: gatewayFee,
            date: new Date(currentDate).toISOString(),
            recurrence: "monthly",
            tenantId: t.id,
            planId: t.plan.id,
            createdAt: t.createdAt
          });

          // Despesa: Comissão do Vendedor (taxa configurável)
          if (t.salesPersonId && t.salesPerson) {
            const commissionFee = resolveCommission(t.salesPerson, t.plan.id, t.plan.price);
            if (commissionFee > 0) {
              virtualEntries.push({
                id: `virt-com-${t.id}-${currentDate.getTime()}`,
                type: "expense",
                category: "Comissões e Parceiros",
                description: `Comissão Venda (${t.plan.name}): ${t.name}`,
                amount: commissionFee,
                date: new Date(currentDate).toISOString(),
                recurrence: "monthly",
                tenantId: t.id,
                planId: t.plan.id,
                salesPersonId: t.salesPersonId,
                createdAt: t.createdAt
              });
            }
          }
        }
      }
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
  return virtualEntries;
}

// Resumo financeiro geral
superAdminRouter.get("/finance/summary", async (req, res) => {
  try {
    const { from, to } = req.query as any;
    
    // Obter entradas virtuais
    const virtEntries = await getVirtualSubscriptionEntries(from, to);

    const virtIncomeTotal = virtEntries.filter(e => e.type === "income").reduce((acc, cur) => acc + cur.amount, 0);
    const virtExpenseTotal = virtEntries.filter(e => e.type === "expense").reduce((acc, cur) => acc + cur.amount, 0);

    // Total de receitas do banco
    const incomeRows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount),0) as total FROM PlatformFinance WHERE type='income'
      ${from ? `AND date >= '${from}'` : ""}
      ${to ? `AND date <= '${to}'` : ""}
    `);
    const dbIncome = Number(incomeRows[0]?.total || 0);
    const totalIncome = dbIncome + virtIncomeTotal;

    // Total de despesas do banco
    const expenseRows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT COALESCE(SUM(amount),0) as total FROM PlatformFinance WHERE type='expense'
      ${from ? `AND date >= '${from}'` : ""}
      ${to ? `AND date <= '${to}'` : ""}
    `);
    const dbExpense = Number(expenseRows[0]?.total || 0);
    const totalExpense = dbExpense + virtExpenseTotal;

    // MRR = soma dos preços dos planos de tenants ativos
    const tenants = await (prisma as any).tenant.findMany({
      where: { isActive: true },
      include: { plan: { select: { price: true } } }
    });
    const mrr = tenants.reduce((s: number, t: any) => s + (t.plan?.price || 0), 0);
    const totalSubscribers = tenants.length;

    // Receita por categoria
    const byCategoryRows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT category, type, COALESCE(SUM(amount),0) as total, COUNT(*) as count
      FROM PlatformFinance
      WHERE 1=1
      ${from ? `AND date >= '${from}'` : ""}
      ${to ? `AND date <= '${to}'` : ""}
      GROUP BY category, type ORDER BY total DESC
    `);
    const byCategory = byCategoryRows.map(r => ({ ...r, total: Number(r.total), count: Number(r.count) }));
    
    // Adicionar virtual às categorias
    virtEntries.forEach(virt => {
      let subCat = byCategory.find(c => c.category === virt.category && c.type === virt.type);
      if (!subCat) {
        subCat = { category: virt.category, type: virt.type, total: 0, count: 0 };
        byCategory.push(subCat);
      }
      subCat.total += virt.amount;
      subCat.count += 1;
    });
    byCategory.sort((a, b) => b.total - a.total);

    // Receita mensal (últimos 12 meses) do DB
    const monthlyRows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        type,
        COALESCE(SUM(amount),0) as total
      FROM PlatformFinance
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month, type ORDER BY month ASC
    `);
    const monthly = monthlyRows.map(r => ({ ...r, total: Number(r.total) }));

    // Adicionar virtual ao mensal (apenas os últimos 12 meses virtuais)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    
    virtEntries.forEach(e => {
      const d = new Date(e.date);
      if (d >= twelveMonthsAgo) {
        const m = d.toISOString().slice(0, 7);
        let mRow = monthly.find(r => r.month === m && r.type === e.type);
        if (!mRow) {
          mRow = { month: m, type: e.type, total: 0 };
          monthly.push(mRow);
        }
        mRow.total += e.amount;
      }
    });
    monthly.sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      mrr,
      totalSubscribers,
      byCategory,
      monthly,
    });
  } catch (e: any) {
    console.error("[finance/summary]", e);
    res.json({ totalIncome: 0, totalExpense: 0, netBalance: 0, mrr: 0, totalSubscribers: 0, byCategory: [], monthly: [] });
  }
});

// Listar lançamentos financeiros
superAdminRouter.get("/finance/entries", async (req, res) => {
  try {
    const { type, category, from, to, page = "1", limit = "50" } = req.query as any;
    
    // DB Entries
    const conditions: string[] = ["1=1"];
    if (type) conditions.push(`type='${type}'`);
    if (category) conditions.push(`category='${category}'`);
    if (from) conditions.push(`date >= '${from}'`);
    if (to) conditions.push(`date <= '${to}'`);

    const dbRows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT * FROM PlatformFinance
      WHERE ${conditions.join(" AND ")}
      ORDER BY date DESC, createdAt DESC
    `);
    let allEntries = dbRows.map(r => ({ ...r, amount: Number(r.amount) }));

    // Virtual Entries
    const virtEntries = await getVirtualSubscriptionEntries(from, to);
    let filteredVirt = virtEntries;
    if (type) filteredVirt = filteredVirt.filter(e => e.type === type);
    if (category) filteredVirt = filteredVirt.filter(e => e.category === category);
    
    allEntries = [...allEntries, ...filteredVirt];

    // Sort e Paginate em JS
    allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginated = allEntries.slice(offset, offset + parseInt(limit));

    res.json({
      entries: paginated,
      total: allEntries.length,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (e: any) {
    console.error("[finance/entries]", e);
    res.json({ entries: [], total: 0, page: 1, limit: 50 });
  }
});

// Criar lançamento financeiro
superAdminRouter.post("/finance/entries", async (req, res) => {
  try {
    const { type, category, description, amount, date, recurrence, tenantId, planId, notes } = req.body;
    if (!category || !amount || !date) return res.status(400).json({ error: "Categoria, valor e data são obrigatórios" });

    const id = randomUUID();
    const createdBy = (req as any).auth?.sub || null;

    await (prisma as any).$executeRawUnsafe(`
      INSERT INTO PlatformFinance (id, type, category, description, amount, date, recurrence, tenantId, planId, notes, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, id, type || "income", category, description || null, amount, date, recurrence || "once", tenantId || null, planId || null, notes || null, createdBy);

    res.json({ id, ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Atualizar lançamento financeiro
superAdminRouter.put("/finance/entries/:id", async (req, res) => {
  try {
    const { type, category, description, amount, date, recurrence, tenantId, planId, notes } = req.body;

    await (prisma as any).$executeRawUnsafe(`
      UPDATE PlatformFinance SET
        type=?, category=?, description=?, amount=?, date=?, recurrence=?, tenantId=?, planId=?, notes=?
      WHERE id=?
    `, type || "income", category, description || null, amount, date, recurrence || "once", tenantId || null, planId || null, notes || null, req.params.id);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Deletar lançamento financeiro
superAdminRouter.delete("/finance/entries/:id", async (req, res) => {
  try {
    await (prisma as any).$executeRawUnsafe(`DELETE FROM PlatformFinance WHERE id=?`, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── ALOCAÇÕES DE % ──────────────────────────────────────────────────────────

superAdminRouter.get("/finance/allocations", async (req, res) => {
  try {
    const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM PlatformAllocation ORDER BY percentage DESC`);
    res.json(rows.map(r => ({ ...r, percentage: Number(r.percentage), isActive: !!r.isActive })));
  } catch (e: any) {
    res.json([]);
  }
});

superAdminRouter.post("/finance/allocations", async (req, res) => {
  try {
    const { name, percentage, color } = req.body;
    if (!name || percentage == null) return res.status(400).json({ error: "Nome e porcentagem são obrigatórios" });
    const id = randomUUID();
    await (prisma as any).$executeRawUnsafe(`
      INSERT INTO PlatformAllocation (id, name, percentage, color) VALUES (?, ?, ?, ?)
    `, id, name, percentage, color || "#f59e0b");
    res.json({ id, ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.put("/finance/allocations/:id", async (req, res) => {
  try {
    const { name, percentage, color, isActive } = req.body;
    await (prisma as any).$executeRawUnsafe(`
      UPDATE PlatformAllocation SET name=?, percentage=?, color=?, isActive=? WHERE id=?
    `, name, percentage, color || "#f59e0b", isActive ? 1 : 0, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.delete("/finance/allocations/:id", async (req, res) => {
  try {
    await (prisma as any).$executeRawUnsafe(`DELETE FROM PlatformAllocation WHERE id=?`, req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — QA / Testes do Sistema
// ═════════════════════════════════════════════════════════════

// Listar todos os runs de teste
superAdminRouter.get("/qa/runs", async (_req, res) => {
  try {
    const runs = await (prisma as any).qATestRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        results: { select: { status: true } }
      }
    });
    const mapped = runs.map((r: any) => {
      const total = r.results.length;
      const pass  = r.results.filter((x: any) => x.status === "pass").length;
      const fail  = r.results.filter((x: any) => x.status === "fail").length;
      const { results, ...rest } = r;
      return { ...rest, total, pass, fail, pending: total - pass - fail };
    });
    res.json(mapped);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Criar novo run de teste
superAdminRouter.post("/qa/runs", async (req, res) => {
  const { title, testerName, testerEmail, notes } = req.body;
  if (!testerName) return res.status(400).json({ error: "Nome do testador é obrigatório" });
  try {
    const run = await (prisma as any).qATestRun.create({
      data: {
        id: randomUUID(),
        title: title || `Teste ${new Date().toLocaleDateString("pt-BR")}`,
        testerName,
        testerEmail: testerEmail || null,
        notes: notes || null,
        status: "in_progress",
      }
    });
    res.json(run);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Buscar run completo com todos os resultados
superAdminRouter.get("/qa/runs/:id", async (req, res) => {
  try {
    const run = await (prisma as any).qATestRun.findUnique({
      where: { id: req.params.id },
      include: { results: { orderBy: { testId: "asc" } } }
    });
    if (!run) return res.status(404).json({ error: "Run não encontrado" });
    res.json(run);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Atualizar status do run
superAdminRouter.patch("/qa/runs/:id", async (req, res) => {
  const { status, notes } = req.body;
  try {
    const run = await (prisma as any).qATestRun.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      }
    });
    res.json(run);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Deletar run
superAdminRouter.delete("/qa/runs/:id", async (req, res) => {
  try {
    await (prisma as any).qATestRun.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Salvar/atualizar resultado de um teste individual (upsert)
superAdminRouter.post("/qa/runs/:id/results", async (req, res) => {
  const { testId, section, title, status, notes } = req.body;
  if (!testId) return res.status(400).json({ error: "testId é obrigatório" });
  try {
    const result = await (prisma as any).qATestResult.upsert({
      where: { runId_testId: { runId: req.params.id, testId } },
      create: {
        id: randomUUID(),
        runId: req.params.id,
        testId,
        section: section || "",
        title: title || "",
        status: status || "pending",
        notes: notes || null,
      },
      update: {
        status: status || "pending",
        notes: notes !== undefined ? notes : undefined,
        ...(section && { section }),
        ...(title && { title }),
      }
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Categorias de lançamento disponíveis
superAdminRouter.get("/finance/categories", async (_req, res) => {
  res.json({
    income: [
      "Assinatura de Plano",
      "Upgrade de Plano",
      "Taxa de Setup",
      "Personalização",
      "Consultoria",
      "Suporte Premium",
      "Comissão / Indicação",
      "Outros Receitas"
    ],
    expense: [
      "Hospedagem / Servidor",
      "Domínio",
      "APIs Externas",
      "WhatsApp (Baileys/API)",
      "Marketing / Ads",
      "Equipe / Salários",
      "Ferramentas / SaaS",
      "Impostos",
      "Contabilidade",
      "Outros Custos"
    ]
  });
});

// ─── CRM LEADS & FAVORITOS ────────────────────────────────────
superAdminRouter.get("/leads", async (req, res) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Não autorizado" });
    const leads = await (prisma as any).superAdminLead.findMany({
      where: { sellerId: userId },
      orderBy: { updatedAt: "desc" }
    });
    res.json(leads);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.post("/leads", async (req, res) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Não autorizado" });
    const { id, name, phone, city, status, notes } = req.body;

    if (phone) {
      const existingLead = await (prisma as any).superAdminLead.findFirst({
        where: {
          phone,
          id: { not: id || undefined }
        },
        include: {
          seller: { select: { name: true, username: true } }
        }
      });

      if (existingLead) {
        const ownerName = existingLead.seller?.name || existingLead.seller?.username || "outro vendedor";
        return res.status(400).json({ 
          error: `O telefone ${phone} já está cadastrado pelo vendedor: ${ownerName}.` 
        });
      }
    }
    
    if (id) {
      const updated = await (prisma as any).superAdminLead.update({
        where: { id, sellerId: userId },
        data: { name, phone, city, status, notes }
      });
      return res.json(updated);
    }

    const created = await (prisma as any).superAdminLead.create({
      data: {
        id: randomUUID(),
        sellerId: userId,
        name,
        phone,
        city: city || null,
        status: status || "new",
        notes
      }
    });
    res.json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.delete("/leads/:id", async (req, res) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Não autorizado" });
    await (prisma as any).superAdminLead.delete({
      where: { id: req.params.id, sellerId: userId }
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.get("/favorites", async (req, res) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Não autorizado" });
    const user = await (prisma as any).superAdmin.findUnique({
      where: { id: userId },
      select: { favoriteTemplates: true }
    });
    res.json(JSON.parse(user?.favoriteTemplates || "[]"));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.post("/favorites", async (req, res) => {
  try {
    const userId = (req as any).auth?.sub;
    if (!userId) return res.status(401).json({ error: "Não autorizado" });
    const { favorites } = req.body;
    await (prisma as any).superAdmin.update({
      where: { id: userId },
      data: { favoriteTemplates: JSON.stringify(favorites) }
    });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
superAdminRouter.get("/sales-reps", async (req, res) => {
  try {
    const sellers = await (prisma as any).superAdmin.findMany({
      where: { role: { not: null } },
      select: {
        id: true,
        name: true,
        username: true,
        photo: true,
        phone: true,
        responsableCities: true
      }
    });
    res.json(sellers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.put("/sales-reps/:id/cities", async (req, res) => {
  try {
    const { id } = req.params;
    const { responsableCities } = req.body;
    
    const updated = await (prisma as any).superAdmin.update({
      where: { id },
      data: { responsableCities }
    });
    
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
