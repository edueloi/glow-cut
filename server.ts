import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { addMinutes, format, parse, startOfDay, addDays } from "date-fns";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────
//  HELPER — extrai tenantId do header X-Tenant-Id ou query param
// ─────────────────────────────────────────────────────────────
function getTenantId(req: express.Request): string | null {
  return (req.headers["x-tenant-id"] as string) || (req.query.tenantId as string) || null;
}

// ─────────────────────────────────────────────────────────────
//  SEED SUPER ADMIN + PLANOS (sem dados mockados)
// ─────────────────────────────────────────────────────────────
async function seedSuperAdmin() {
  const existing = await prisma.superAdmin.findFirst({ where: { username: "Admin" } });
  if (!existing) {
    await prisma.superAdmin.create({ data: { id: randomUUID(), username: "Admin", password: "super123" } });
    console.log("✅ Super admin criado: Admin / super123");
  } else if (existing.password !== "super123") {
    await prisma.superAdmin.update({ where: { id: existing.id }, data: { password: "super123" } });
    console.log("✅ Super admin senha corrigida");
  }

  const planCount = await prisma.plan.count();
  if (planCount === 0) {
    await prisma.plan.createMany({
      data: [
        { id: randomUUID(), name: "Básico",     price: 49.90,  maxProfessionals: 2,   maxAdminUsers: 1,   canCreateAdminUsers: false, canDeleteAccount: false, features: JSON.stringify(["Agenda","Clientes","Serviços"]) },
        { id: randomUUID(), name: "Pro",        price: 99.90,  maxProfessionals: 5,   maxAdminUsers: 3,   canCreateAdminUsers: true,  canDeleteAccount: false, features: JSON.stringify(["Agenda","Clientes","Serviços","Comandas","Fluxo de Caixa","Relatórios"]) },
        { id: randomUUID(), name: "Enterprise", price: 199.90, maxProfessionals: 999, maxAdminUsers: 999, canCreateAdminUsers: true,  canDeleteAccount: true,  features: JSON.stringify(["Tudo do Pro","Multi-usuários ilimitados","Profissionais ilimitados","Suporte prioritário"]) },
      ]
    });
    console.log("✅ Planos padrão criados");
  }
}
seedSuperAdmin();

// ═════════════════════════════════════════════════════════════
//  LOGIN UNIFICADO
// ═════════════════════════════════════════════════════════════
app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: "Preencha todos os campos." });

  // 1) Super admin
  const sa = await prisma.superAdmin.findFirst({ where: { username: identifier, password } });
  if (sa) return res.json({ type: "superadmin", id: sa.id, username: sa.username, role: "superadmin" });

  // 2) Admin normal
  const adminUser = await prisma.adminUser.findFirst({
    where: { email: identifier, password, isActive: true },
    include: { tenant: { include: { plan: true } } }
  });
  if (adminUser) {
    await prisma.adminUser.update({ where: { id: adminUser.id }, data: { lastLogin: new Date() } });
    return res.json({
      type: "admin",
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
      jobTitle: adminUser.jobTitle,
      tenantId: adminUser.tenantId,
      tenantName: adminUser.tenant.name,
      tenantSlug: adminUser.tenant.slug,
      planName: adminUser.tenant.plan.name,
      canCreateUsers: adminUser.canCreateUsers,
      canDeleteAccount: adminUser.canDeleteAccount,
      permissions: adminUser.permissions,
    });
  }

  // 3) Profissional (por nome)
  const prof = await prisma.professional.findFirst({
    where: { name: identifier, password },
  });
  if (prof) {
    return res.json({
      type: "professional",
      id: prof.id,
      name: prof.name,
      role: prof.role,
      tenantId: prof.tenantId,
      permissions: prof.permissions,
    });
  }

  return res.status(401).json({ error: "Usuário ou senha inválidos." });
});

// Mantido para compatibilidade
app.post("/api/super-admin/login", async (req, res) => {
  const { username, password } = req.body;
  const sa = await prisma.superAdmin.findFirst({ where: { username, password } });
  if (!sa) return res.status(401).json({ error: "Credenciais inválidas." });
  res.json({ id: sa.id, username: sa.username, role: "superadmin" });
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Planos
// ═════════════════════════════════════════════════════════════
app.get("/api/super-admin/plans", async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar planos." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Tenants (parceiros / estúdios)
// ═════════════════════════════════════════════════════════════

// Listar todos os tenants
app.get("/api/super-admin/tenants", async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        plan: { select: { id: true, name: true, price: true } },
        adminUsers: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tenants);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar parceiros." });
  }
});

// Criar novo tenant + admin owner
app.post("/api/super-admin/tenants", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, adminPassword, expiresAt } = req.body;

  if (!name || !slug || !ownerName || !ownerEmail || !planId || !adminPassword) {
    return res.status(400).json({ error: "Campos obrigatórios: name, slug, ownerName, ownerEmail, planId, adminPassword." });
  }

  // Verifica slug único
  const existing = await prisma.tenant.findFirst({ where: { slug } });
  if (existing) return res.status(400).json({ error: "Slug já está em uso. Escolha outro." });

  // Verifica email único
  const existingEmail = await prisma.adminUser.findFirst({ where: { email: ownerEmail } });
  if (existingEmail) return res.status(400).json({ error: "E-mail já está cadastrado." });

  // Verifica plano
  const plan = await prisma.plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) return res.status(400).json({ error: "Plano não encontrado." });

  try {
    // Cria o tenant
    const tenantId = randomUUID();
    // Validade padrão: 30 dias a partir da criação (+ 7 dias de graça = 37 dias até bloquear)
    const defaultExpires = new Date();
    defaultExpires.setDate(defaultExpires.getDate() + 30);

    const tenant = await prisma.tenant.create({
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
      },
    });

    // Cria o admin owner com permissões máximas
    const adminUser = await prisma.adminUser.create({
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

// Atualizar tenant
app.patch("/api/super-admin/tenants/:id", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, isActive, expiresAt, maxAdminUsersOverride } = req.body;
  try {
    const current = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Parceiro não encontrado." });

    // Gerencia blockedAt: ao reativar, limpa blockedAt; ao desativar, registra se ainda não tiver
    let blockedAt = current.blockedAt;
    if (isActive === true) blockedAt = null;
    if (isActive === false && !current.blockedAt) blockedAt = new Date();

    const tenant = await prisma.tenant.update({
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

// Deletar tenant (cuidado — remove tudo)
app.delete("/api/super-admin/tenants/:id", async (req, res) => {
  try {
    await prisma.adminUser.deleteMany({ where: { tenantId: req.params.id } });
    await prisma.tenant.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir parceiro." });
  }
});

// PUT alias para PATCH (compatibilidade com frontend)
app.put("/api/super-admin/tenants/:id", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, isActive, expiresAt, maxAdminUsersOverride } = req.body;
  try {
    const current = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Parceiro não encontrado." });

    let blockedAt = current.blockedAt;
    if (isActive === true) blockedAt = null;
    if (isActive === false && !current.blockedAt) blockedAt = new Date();

    const tenant = await prisma.tenant.update({
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

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Stats
// ═════════════════════════════════════════════════════════════
app.get("/api/super-admin/stats", async (req, res) => {
  try {
    const [totalTenants, activeTenants, totalAdminUsers, plans] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { isActive: true } }),
      prisma.adminUser.count({ where: { isActive: true } }),
      prisma.plan.findMany({ select: { id: true, name: true }, where: { isActive: true } }),
    ]);
    const tenantsByPlan = await Promise.all(
      plans.map(async (p) => ({
        planName: p.name,
        count: await prisma.tenant.count({ where: { planId: p.id } }),
      }))
    );
    res.json({ totalTenants, activeTenants, totalAdminUsers, tenantsByPlan });
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar stats." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Planos (CRUD completo)
// ═════════════════════════════════════════════════════════════
app.post("/api/super-admin/plans", async (req, res) => {
  const { name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features } = req.body;
  if (!name) return res.status(400).json({ error: "Nome do plano obrigatório." });
  try {
    const plan = await prisma.plan.create({
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

app.put("/api/super-admin/plans/:id", async (req, res) => {
  const { name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features, isActive } = req.body;
  try {
    const plan = await prisma.plan.update({
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

app.delete("/api/super-admin/plans/:id", async (req, res) => {
  try {
    await prisma.plan.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir plano." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Admin Users
// ═════════════════════════════════════════════════════════════
app.get("/api/super-admin/admin-users", async (req, res) => {
  try {
    const users = await prisma.adminUser.findMany({
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

app.post("/api/super-admin/admin-users", async (req, res) => {
  const { name, email, password, role, jobTitle, phone, tenantId, canCreateUsers, canDeleteAccount, permissions } = req.body;
  if (!name || !email || !password || !tenantId) return res.status(400).json({ error: "name, email, password e tenantId são obrigatórios." });
  const existing = await prisma.adminUser.findFirst({ where: { email } });
  if (existing) return res.status(400).json({ error: "E-mail já cadastrado." });
  try {
    const user = await prisma.adminUser.create({
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

app.put("/api/super-admin/admin-users/:id", async (req, res) => {
  const { name, email, password, role, jobTitle, phone, isActive, canCreateUsers, canDeleteAccount, permissions } = req.body;
  try {
    const user = await prisma.adminUser.update({
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
      },
    });
    res.json(user);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar usuário." });
  }
});

app.delete("/api/super-admin/admin-users/:id", async (req, res) => {
  try {
    await prisma.adminUser.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir usuário." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.adminUser.findFirst({
    where: { email, password, isActive: true },
    include: { tenant: { include: { plan: true } } }
  });
  if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos." });
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  res.json({
    id: user.id, name: user.name, email: user.email, role: user.role,
    jobTitle: user.jobTitle, tenantId: user.tenantId,
    tenantName: user.tenant.name, planName: user.tenant.plan.name,
    canCreateUsers: user.canCreateUsers, canDeleteAccount: user.canDeleteAccount,
    permissions: user.permissions,
  });
});

// ═════════════════════════════════════════════════════════════
//  RESOLVE SLUG → TENANT (usado pela página pública de agendamento)
// ═════════════════════════════════════════════════════════════
app.get("/api/tenant-by-slug/:slug", async (req, res) => {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: req.params.slug, isActive: true },
    select: { id: true, name: true }
  });
  if (!tenant) return res.status(404).json({ error: "Estúdio não encontrado." });
  res.json(tenant);
});

// ═════════════════════════════════════════════════════════════
//  CLIENTS — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/clients", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const clients = await prisma.client.findMany({
    where: { tenantId },
    include: { appointments: true, comandas: true },
    orderBy: { name: "asc" }
  });
  res.json(clients);
});

app.get("/api/clients/search", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { phone, name } = req.query;
  if (phone) {
    const client = await prisma.client.findFirst({
      where: { phone: String(phone), tenantId },
      include: { comandas: { where: { status: "open" } } }
    });
    return res.json(client);
  }
  if (name) {
    const clients = await prisma.client.findMany({
      where: { tenantId, name: { contains: String(name) } },
      include: { comandas: { where: { status: "open" } } }
    });
    return res.json(clients);
  }
  res.status(400).json({ error: "Phone ou name obrigatório." });
});

app.post("/api/clients", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, phone, age } = req.body;
  try {
    const existing = await prisma.client.findFirst({ where: { phone, tenantId } });
    let client;
    if (existing) {
      client = await prisma.client.update({
        where: { id: existing.id },
        data: { name, age: parseInt(age || "0") }
      });
    } else {
      client = await prisma.client.create({
        data: { id: randomUUID(), name, phone, age: parseInt(age || "0"), tenantId }
      });
    }
    res.json(client);
  } catch (e) {
    res.status(400).json({ error: "Erro ao salvar cliente." });
  }
});

app.put("/api/clients/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { name, phone, age } = req.body;
  try {
    const client = await prisma.client.updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data: { name, phone, age: parseInt(age || "0") }
    });
    res.json(client);
  } catch (e) {
    res.status(400).json({ error: "Erro ao atualizar cliente." });
  }
});

// ═════════════════════════════════════════════════════════════
//  PROFESSIONALS — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/professionals", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const profs = await prisma.professional.findMany({
    where: { tenantId },
    select: { id: true, name: true, role: true, phone: true, email: true, bio: true, photo: true, permissions: true, isActive: true }
  });
  res.json(profs);
});

app.post("/api/professionals", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, role, password, phone, email, bio, photo, permissions } = req.body;
  if (!name || !password) return res.status(400).json({ error: "Nome e senha são obrigatórios." });
  try {
    const prof = await prisma.professional.create({
      data: {
        id: randomUUID(), name, role, password, tenantId,
        phone: phone || null,
        email: email || null,
        bio: bio || null,
        photo: photo || null,
        permissions: permissions ? JSON.stringify(permissions) : "{}",
        isActive: true,
      },
      select: { id: true, name: true, role: true, phone: true, email: true, bio: true, photo: true, permissions: true, isActive: true }
    });
    for (let i = 0; i < 7; i++) {
      await prisma.workingHours.create({
        data: { id: randomUUID(), dayOfWeek: i, isOpen: i !== 0, startTime: "09:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00", professionalId: prof.id }
      });
    }
    res.json(prof);
  } catch (e) {
    res.status(400).json({ error: "Erro ao criar profissional." });
  }
});

app.post("/api/professionals/login", async (req, res) => {
  const { name, email, password } = req.body;
  const identifier = email || name;
  const prof = await prisma.professional.findFirst({
    where: {
      OR: [
        { email: identifier, password, isActive: true },
        { name: identifier, password, isActive: true },
      ],
    },
  });
  if (!prof) return res.status(401).json({ error: "Nome/e-mail ou senha incorretos." });
  res.json({ id: prof.id, name: prof.name, role: prof.role, tenantId: prof.tenantId, permissions: prof.permissions });
});

app.put("/api/professionals/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { name, role, password, phone, email, bio, photo, permissions, isActive } = req.body;
  const data: any = { name, role };
  if (password) data.password = password;
  if (phone !== undefined) data.phone = phone || null;
  if (email !== undefined) data.email = email || null;
  if (bio !== undefined) data.bio = bio || null;
  if (photo !== undefined) data.photo = photo || null;
  if (permissions !== undefined) data.permissions = typeof permissions === "object" ? JSON.stringify(permissions) : permissions;
  if (isActive !== undefined) data.isActive = isActive;
  try {
    await prisma.professional.updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data
    });
    const prof = await prisma.professional.findFirst({
      where: { id: req.params.id },
      select: { id: true, name: true, role: true, phone: true, email: true, bio: true, photo: true, permissions: true, isActive: true }
    });
    res.json(prof);
  } catch (e) {
    res.status(400).json({ error: "Erro ao atualizar profissional." });
  }
});

app.delete("/api/professionals/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    // Verifi