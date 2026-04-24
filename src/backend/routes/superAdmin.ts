import { Router } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import {
  connectSession,
  disconnectSession,
  getSessionInfo,
} from "../wpp/baileys-manager";
import { requireSuperPermission } from "../middleware/auth";

export const superAdminRouter = Router();

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
        role: true, bio: true, photo: true, permissions: true
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
    priceExtraProfessional, stripePaymentLink,
    features, permissions
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
        features: Array.isArray(features) ? JSON.stringify(features) : (features || "[]"),
        permissions: typeof permissions === "object" ? JSON.stringify(permissions) : (permissions || "{}"),
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
    priceExtraProfessional, stripePaymentLink,
    features, permissions, isActive
  } = req.body;

  try {
    const plan = await (prisma as any).plan.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(maxProfessionals !== undefined && { maxProfessionals }),
        ...(maxAdminUsers !== undefined && { maxAdminUsers }),
        ...(canCreateAdminUsers !== undefined && { canCreateAdminUsers: !!canCreateAdminUsers }),
        ...(canDeleteAccount !== undefined && { canDeleteAccount: !!canDeleteAccount }),
        ...(systemBotEnabled !== undefined && { systemBotEnabled: !!systemBotEnabled }),
        ...(qrCodeBotEnabled !== undefined && { qrCodeBotEnabled: !!qrCodeBotEnabled }),
        ...(siteEnabled !== undefined && { siteEnabled: !!siteEnabled }),
        ...(agendaExternaEnabled !== undefined && { agendaExternaEnabled: !!agendaExternaEnabled }),
        ...(priceExtraProfessional !== undefined && { priceExtraProfessional }),
        ...(stripePaymentLink !== undefined && { stripePaymentLink: stripePaymentLink || null }),
        ...(isActive !== undefined && { isActive }),
        ...(features !== undefined && { features: Array.isArray(features) ? JSON.stringify(features) : features }),
        ...(permissions !== undefined && { permissions: typeof permissions === "object" ? JSON.stringify(permissions) : permissions }),
      },
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
  try {
    await (prisma as any).adminUser.deleteMany({ where: { tenantId: req.params.id } });
    await (prisma as any).tenant.delete({ where: { id: req.params.id } });
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
        ...(password !== undefined && { password }),
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

// ─── FINANCEIRO DA PLATAFORMA ──────────────────────────────────────────────

// Helper para gerar entradas virtuais das assinaturas ativas
async function getVirtualSubscriptionEntries(from?: string, to?: string) {
  const tenants = await (prisma as any).tenant.findMany({
    where: { isActive: true },
    include: { plan: true }
  });
  const virtualEntries: any[] = [];
  const fromDate = from ? new Date(from) : new Date("2000-01-01T00:00:00.000Z");
  const toDate = to ? new Date(to + "T23:59:59.999Z") : new Date();
  const now = new Date();

  for (const t of tenants) {
    if (!t.plan || !t.plan.price) continue;
    let currentDate = new Date(t.createdAt);
    if (isNaN(currentDate.getTime())) currentDate = new Date();
    
    while (currentDate <= now) {
      if (currentDate >= fromDate && currentDate <= toDate) {
        // Receita: Assinatura
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

        // Despesa: Taxas de Gateway (Stripe / Pagar.me) -> ~4.9% + R$0.39
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

        // Despesa: Comissão Parceiro/Vendedor (Ex: 30%)
        if (t.salesPersonId) {
          const commissionFee = t.plan.price * 0.30;
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
            createdAt: t.createdAt
          });
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

