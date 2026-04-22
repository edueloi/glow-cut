import { Router } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import {
  connectSession,
  disconnectSession,
  getSessionInfo,
} from "../wpp/baileys-manager";

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
      email,
      phone,
      birthday: birthday ? new Date(birthday) : null,
      bio,
      photo
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
        role: true, bio: true, photo: true 
      }
    });
    res.json(staff);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.post("/staff", async (req, res) => {
  const { username, password, name, email, phone, birthday, role, bio, photo } = req.body;
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
        email,
        phone,
        birthday: birthday ? new Date(birthday) : null,
        role,
        bio,
        photo
      }
    });
    res.json({ id: newUser.id, username: newUser.username });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.put("/staff/:id", async (req, res) => {
  const { username, password, name, email, phone, birthday, role, bio, photo } = req.body;
  try {
    const data: any = { 
      username,
      name,
      email,
      phone,
      birthday: birthday ? new Date(birthday) : null,
      role,
      bio,
      photo
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
    priceExtraProfessional,
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
    priceExtraProfessional,
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
    await (prisma as any).plan.update({ where: { id: req.params.id }, data: { isActive: false } });
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
