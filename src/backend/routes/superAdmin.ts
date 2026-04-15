import { Router } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";

export const superAdminRouter = Router();

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — LOGIN (Movel to global auth later, keeping for mapping)
// ═════════════════════════════════════════════════════════════
superAdminRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const sa = await (prisma as any).superAdmin.findFirst({ where: { username, password } });
  if (!sa) return res.status(401).json({ error: "Credenciais inválidas." });
  res.json({ id: sa.id, username: sa.username, role: "superadmin" });
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — EQUIPE (STAFF)
// ═════════════════════════════════════════════════════════════
superAdminRouter.get("/staff", async (req, res) => {
  try {
    const staff = await (prisma as any).superAdmin.findMany({
      select: { id: true, username: true, createdAt: true }
    });
    res.json(staff);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.post("/staff", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username e senha obrigatórios" });
  try {
    const existing = await (prisma as any).superAdmin.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: "Este usuário já existe" });

    const newUser = await (prisma as any).superAdmin.create({
      data: { id: randomUUID(), username, password }
    });
    res.json({ id: newUser.id, username: newUser.username });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

superAdminRouter.put("/staff/:id", async (req, res) => {
  const { username, password } = req.body;
  try {
    const data: any = { username };
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
    const plans = await (prisma as any).plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar planos." });
  }
});

superAdminRouter.post("/plans", async (req, res) => {
  const { name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features } = req.body;
  if (!name) return res.status(400).json({ error: "Nome do plano obrigatório." });
  try {
    const plan = await (prisma as any).plan.create({
      data: {
        id: randomUUID(),
        name,
        price: price || 0,
        maxProfessionals: maxProfessionals || 3,
        maxAdminUsers: maxAdminUsers || 1,
        canCreateAdminUsers: canCreateAdminUsers || false,
        canDeleteAccount: canDeleteAccount || false,
        features: Array.isArray(features) ? JSON.stringify(features) : (features || "[]"),
      },
    });
    res.json(plan);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao criar plano." });
  }
});

superAdminRouter.put("/plans/:id", async (req, res) => {
  const { name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features, isActive } = req.body;
  try {
    const plan = await (prisma as any).plan.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(maxProfessionals !== undefined && { maxProfessionals }),
        ...(maxAdminUsers !== undefined && { maxAdminUsers }),
        ...(canCreateAdminUsers !== undefined && { canCreateAdminUsers }),
        ...(canDeleteAccount !== undefined && { canDeleteAccount }),
        ...(isActive !== undefined && { isActive }),
        ...(features !== undefined && { features: Array.isArray(features) ? JSON.stringify(features) : features }),
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
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, adminPassword, expiresAt } = req.body;

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
    const [totalTenants, activeTenants, totalAdminUsers, plans] = await Promise.all([
      (prisma as any).tenant.count(),
      (prisma as any).tenant.count({ where: { isActive: true } }),
      (prisma as any).adminUser.count({ where: { isActive: true } }),
      (prisma as any).plan.findMany({ select: { id: true, name: true }, where: { isActive: true } }),
    ]);
    const tenantsByPlan = await Promise.all(
      plans.map(async (p: any) => ({
        planName: p.name,
        count: await (prisma as any).tenant.count({ where: { planId: p.id } }),
      }))
    );
    res.json({ totalTenants, activeTenants, totalAdminUsers, tenantsByPlan });
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
