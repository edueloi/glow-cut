import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { addMinutes, format, parse, startOfDay, addDays } from "date-fns";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

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
  const existing = await (prisma.superAdmin as any).findFirst({ where: { username: "Admin" } });
  if (!existing) {
    await (prisma.superAdmin as any).create({ data: { id: randomUUID(), username: "Admin", password: "super123" } });
    console.log("✅ Super admin criado: Admin / super123");
  } else if (existing.password !== "super123") {
    await (prisma.superAdmin as any).update({ where: { id: existing.id }, data: { password: "super123" } });
    console.log("✅ Super admin senha corrigida");
  }

  const planCount = await (prisma.plan as any).count();
  if (planCount === 0) {
    await (prisma.plan as any).createMany({
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
  const sa = await (prisma.superAdmin as any).findFirst({ where: { username: identifier, password } });
  if (sa) return res.json({ type: "superadmin", id: sa.id, username: sa.username, role: "superadmin" });

  // 2) Admin normal
  const adminUser = await (prisma.adminUser as any).findFirst({
    where: { email: identifier, password, isActive: true },
    include: { tenant: { include: { plan: true } } }
  });
  if (adminUser) {
    await (prisma.adminUser as any).update({ where: { id: adminUser.id }, data: { lastLogin: new Date() } });
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

  // 3) Profissional (por nome ou e-mail)
  const prof = await (prisma.professional as any).findFirst({
    where: {
      OR: [
        { name: identifier },
        { email: identifier }
      ],
      password,
      isActive: true
    },
  });
  if (prof) {
    return res.json({
      type: "professional",
      id: prof.id,
      name: prof.name,
      role: prof.role,
      tenantId: prof.tenantId,
      permissions: (prof as any).permissions,
    });
  }

  return res.status(401).json({ error: "Usuário ou senha inválidos." });
});

// Mantido para compatibilidade
app.post("/api/super-admin/login", async (req, res) => {
  const { username, password } = req.body;
  const sa = await (prisma.superAdmin as any).findFirst({ where: { username, password } });
  if (!sa) return res.status(401).json({ error: "Credenciais inválidas." });
  res.json({ id: sa.id, username: sa.username, role: "superadmin" });
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — EQUIPE (STAFF)
// ═════════════════════════════════════════════════════════════
app.get("/api/super-admin/staff", async (req, res) => {
  try {
    const staff = await (prisma.superAdmin as any).findMany({
      select: { id: true, username: true, createdAt: true }
    });
    res.json(staff);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/super-admin/staff", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username e senha obrigatórios" });
  try {
    const existing = await (prisma.superAdmin as any).findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: "Este usuário já existe" });

    const newUser = await (prisma.superAdmin as any).create({
      data: { id: randomUUID(), username, password }
    });
    res.json({ id: newUser.id, username: newUser.username });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/super-admin/staff/:id", async (req, res) => {
  const { username, password } = req.body;
  try {
    const data: any = { username };
    if (password) data.password = password;

    const updated = await (prisma.superAdmin as any).update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/super-admin/staff/:id", async (req, res) => {
  try {
    await (prisma.superAdmin as any).delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Planos
// ═════════════════════════════════════════════════════════════
app.get("/api/super-admin/plans", async (req, res) => {
  try {
    const plans = await (prisma.plan as any).findMany({ where: { isActive: true }, orderBy: { price: "asc" } });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: "Erro ao buscar planos." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Tenants (parceiros / estúdios)
// ═════════════════════════════════════════════════════════════

// Listar todos os tenants de forma robusta
app.get("/api/super-admin/tenants", async (req, res) => {
  try {
    const tenants = await (prisma.tenant as any).findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const plans = await (prisma.plan as any).findMany({
      select: { id: true, name: true, price: true }
    });
    
    const adminusers = await (prisma.adminUser as any).findMany({
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

// Criar novo tenant + admin owner
app.post("/api/super-admin/tenants", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, adminPassword, expiresAt } = req.body;

  if (!name || !slug || !ownerName || !ownerEmail || !planId || !adminPassword) {
    return res.status(400).json({ error: "Campos obrigatórios: name, slug, ownerName, ownerEmail, planId, adminPassword." });
  }

  // Verifica slug único
  const existing = await (prisma.tenant as any).findFirst({ where: { slug } });
  if (existing) return res.status(400).json({ error: "Slug já está em uso. Escolha outro." });

  // Verifica email único
  const existingEmail = await (prisma.adminUser as any).findFirst({ where: { email: ownerEmail } });
  if (existingEmail) return res.status(400).json({ error: "E-mail já está cadastrado." });

  // Verifica plano
  const plan = await (prisma.plan as any).findFirst({ where: { id: planId, isActive: true } });
  if (!plan) return res.status(400).json({ error: "Plano não encontrado." });

  try {
    // Cria o tenant
    const tenantId = randomUUID();
    // Validade padrão: 30 dias a partir da criação (+ 7 dias de graça = 37 dias até bloquear)
    const defaultExpires = new Date();
    defaultExpires.setDate(defaultExpires.getDate() + 30);

    const tenant = await (prisma.tenant as any).create({
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
    const adminUser = await (prisma.adminUser as any).create({
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
    const current = await (prisma.tenant as any).findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Parceiro não encontrado." });

    // Gerencia blockedAt: ao reativar, limpa blockedAt; ao desativar, registra se ainda não tiver
    let blockedAt = (current as any).blockedAt;
    if (isActive === true) blockedAt = null;
    if (isActive === false && !(current as any).blockedAt) blockedAt = new Date();

    const tenant = await (prisma.tenant as any).update({
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
    await (prisma.adminUser as any).deleteMany({ where: { tenantId: req.params.id } });
    await (prisma.tenant as any).delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir parceiro." });
  }
});

// PUT alias para PATCH (compatibilidade com frontend)
app.put("/api/super-admin/tenants/:id", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, isActive, expiresAt, maxAdminUsersOverride } = req.body;
  try {
    const current = await (prisma.tenant as any).findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Parceiro não encontrado." });

    let blockedAt = (current as any).blockedAt;
    if (isActive === true) blockedAt = null;
    if (isActive === false && !(current as any).blockedAt) blockedAt = new Date();

    const tenant = await (prisma.tenant as any).update({
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
      (prisma.tenant as any).count(),
      (prisma.tenant as any).count({ where: { isActive: true } }),
      (prisma.adminUser as any).count({ where: { isActive: true } }),
      (prisma.plan as any).findMany({ select: { id: true, name: true }, where: { isActive: true } }),
    ]);
    const tenantsByPlan = await Promise.all(
      plans.map(async (p) => ({
        planName: p.name,
        count: await (prisma.tenant as any).count({ where: { planId: p.id } }),
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
    const plan = await (prisma.plan as any).create({
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
    const plan = await (prisma.plan as any).update({
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
    await (prisma.plan as any).update({ where: { id: req.params.id }, data: { isActive: false } });
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
    const users = await (prisma.adminUser as any).findMany({
      orderBy: { createdAt: "desc" },
    });
    
    const tenants = await (prisma.tenant as any).findMany({
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

app.post("/api/super-admin/admin-users", async (req, res) => {
  const { name, email, password, role, jobTitle, phone, tenantId, canCreateUsers, canDeleteAccount, permissions } = req.body;
  if (!name || !email || !password || !tenantId) return res.status(400).json({ error: "name, email, password e tenantId são obrigatórios." });
  const existing = await (prisma.adminUser as any).findFirst({ where: { email } });
  if (existing) return res.status(400).json({ error: "E-mail já cadastrado." });
  try {
    const user = await (prisma.adminUser as any).create({
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
    const user = await (prisma.adminUser as any).update({
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
    await (prisma.adminUser as any).delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir usuário." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await (prisma.adminUser as any).findFirst({
    where: { email, password, isActive: true },
    include: { tenant: { include: { plan: true } } }
  });
  if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos." });
  await (prisma.adminUser as any).update({ where: { id: user.id }, data: { lastLogin: new Date() } });
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
  const tenant = await (prisma.tenant as any).findFirst({
    where: { slug: req.params.slug, isActive: true },
    select: { 
      id: true, 
      name: true, 
      themeColor: true, 
      logoUrl: true, 
      coverUrl: true, 
      address: true, 
      instagram: true, 
      welcomeMessage: true 
    }
  });
  if (!tenant) return res.status(404).json({ error: "Estúdio não encontrado." });
  res.json(tenant);
});

app.get("/api/admin/tenant", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const tenant = await (prisma.tenant as any).findUnique({ where: { id: tenantId } });
  if (!tenant) return res.status(404).json({ error: "Estúdio não encontrado." });
  res.json(tenant);
});

// Atualizar branding do tenant (dashboard admin)
app.post("/api/admin/tenant/branding", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  
  const { themeColor, logoUrl, coverUrl, address, instagram, welcomeMessage, title } = req.body;
  
  try {
    const tenant = await (prisma.tenant as any).update({
      where: { id: tenantId },
      data: {
        themeColor: themeColor || undefined,
        logoUrl: logoUrl || undefined,
        coverUrl: coverUrl || undefined,
        address: address || undefined,
        instagram: instagram || undefined,
        welcomeMessage: welcomeMessage || undefined,
        name: title || undefined // Usamos name como título do estúdio se provido
      }
    });
    res.json(tenant);
  } catch (e: any) {
    res.status(400).json({ error: "Erro ao salvar configurações do estúdio." });
  }
});

// ═════════════════════════════════════════════════════════════
//  CLIENTS — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/clients", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const clientsData = await (prisma.client as any).findMany({
      where: { tenantId },
      include: { appointment: true, comanda: true },
      orderBy: { name: "asc" }
    });
    const clients = clientsData.map((c: any) => ({
      ...c,
      appointments: c.appointment || [],
      comandas: c.comanda || []
    }));
    res.json(clients);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar clientes." });
  }
});

app.get("/api/clients/search", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { phone, name } = req.query;
  try {
    if (phone) {
      const client = await (prisma.client as any).findFirst({
        where: { phone: String(phone), tenantId },
        include: { comanda: { where: { status: "open" } } }
      });
      if (client) client.comandas = client.comanda || [];
      return res.json(client);
    }
    if (name) {
      const clientsData = await (prisma.client as any).findMany({
        where: { tenantId, name: { contains: String(name) } },
        include: { comanda: { where: { status: "open" } } }
      });
      const clients = clientsData.map((c: any) => ({ ...c, comandas: c.comanda || [] }));
      return res.json(clients);
    }
    res.status(400).json({ error: "Phone ou name obrigatório." });
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar cliente." });
  }
});

app.post("/api/clients", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, phone, age } = req.body;
  try {
    const existing = await (prisma.client as any).findFirst({ where: { phone, tenantId } });
    let client;
    if (existing) {
      client = await (prisma.client as any).update({
        where: { id: existing.id },
        data: { name, age: parseInt(age || "0") }
      });
    } else {
      client = await (prisma.client as any).create({
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
    const client = await (prisma.client as any).updateMany({
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
  try {
    const profs = await (prisma.professional as any).findMany({
      where: { tenantId },
      select: { id: true, name: true, role: true, phone: true, email: true, bio: true, photo: true, permissions: true, isActive: true }
    });
    res.json(profs);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar profissionais." });
  }
});

app.post("/api/professionals", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, role, password, phone, email, bio, photo, permissions } = req.body;
  if (!name || !password) return res.status(400).json({ error: "Nome e senha são obrigatórios." });
  try {
    const prof = await (prisma.professional as any).create({
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
      await (prisma.workingHours as any).create({
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
  const prof = await (prisma.professional as any).findFirst({
    where: {
      OR: [
        { email: identifier, password, isActive: true },
        { name: identifier, password, isActive: true },
      ],
    },
  });
  if (!prof) return res.status(401).json({ error: "Nome/e-mail ou senha incorretos." });
  res.json({ id: prof.id, name: prof.name, role: prof.role, tenantId: prof.tenantId, permissions: (prof as any).permissions });
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
    await (prisma.professional as any).updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data
    });
    const prof = await (prisma.professional as any).findFirst({
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
    await (prisma.workingHours as any).deleteMany({ where: { professionalId: req.params.id } });
    await (prisma.professional as any).deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir profissional." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SERVICES — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/services", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const servicesRaw = await (prisma.service as any).findMany({
      where: { tenantId },
      include: {
        packageservice_packageservice_packageIdToservice: {
          include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true, duration: true, price: true } } }
        }
      },
      orderBy: { name: "asc" }
    });
    
    const services = servicesRaw.map((s: any) => ({
      ...s,
      packageServices: s.packageservice_packageservice_packageIdToservice?.map((ps: any) => ({
        ...ps,
        service: ps.service_packageservice_serviceIdToservice
      })) || [],
      packageservice_packageservice_packageIdToservice: undefined
    }));
    
    res.json(services);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar serviços." });
  }
});

app.post("/api/services", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, description, price, duration, type, discount, discountType, includedServices, professionalIds } = req.body;
  if (!name || !price) return res.status(400).json({ error: "Nome e preço são obrigatórios." });
  try {
    const serviceId = randomUUID();
    const service = await (prisma.service as any).create({
      data: {
        id: serviceId,
        name,
        description: description || null,
        price: parseFloat(price) || 0,
        duration: parseInt(duration) || 60,
        type: type || "service",
        discount: parseFloat(discount) || 0,
        discountType: discountType || "value",
        tenantId,
        ...(professionalIds !== undefined && { professionalIds: JSON.stringify(professionalIds || []) }),
      }
    });
    // Cria relações de pacote
    if (type === "package" && Array.isArray(includedServices)) {
      for (const s of includedServices) {
        await (prisma.packageService as any).create({
          data: { id: randomUUID(), packageId: serviceId, serviceId: s.id, quantity: s.quantity || 1 }
        });
      }
    }
    const fullRaw = await (prisma.service as any).findFirst({
      where: { id: serviceId },
      include: { packageservice_packageservice_packageIdToservice: { include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true } } } } }
    });
    const full = fullRaw ? {
      ...fullRaw,
      packageServices: fullRaw.packageservice_packageservice_packageIdToservice?.map((ps: any) => ({
        ...ps,
        service: ps.service_packageservice_serviceIdToservice
      })) || [],
      packageservice_packageservice_packageIdToservice: undefined
    } : null;
    res.json(full);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao criar serviço." });
  }
});

app.put("/api/services/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { name, description, price, duration, type, discount, discountType, includedServices, professionalIds } = req.body;
  try {
    await (prisma.service as any).updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) || 0 }),
        ...(duration !== undefined && { duration: parseInt(duration) || 60 }),
        ...(type !== undefined && { type }),
        ...(discount !== undefined && { discount: parseFloat(discount) || 0 }),
        ...(discountType !== undefined && { discountType }),
        ...(professionalIds !== undefined && { professionalIds: JSON.stringify(professionalIds) }),
      }
    });
    // Atualiza relações de pacote
    if (type === "package" && Array.isArray(includedServices)) {
      await (prisma.packageService as any).deleteMany({ where: { packageId: req.params.id } });
      for (const s of includedServices) {
        await (prisma.packageService as any).create({
          data: { id: randomUUID(), packageId: req.params.id, serviceId: s.id, quantity: s.quantity || 1 }
        });
      }
    }
    const fullRaw = await (prisma.service as any).findFirst({
      where: { id: req.params.id },
      include: { packageservice_packageservice_packageIdToservice: { include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true } } } } }
    });
    const full = fullRaw ? {
      ...fullRaw,
      packageServices: fullRaw.packageservice_packageservice_packageIdToservice?.map((ps: any) => ({
        ...ps,
        service: ps.service_packageservice_serviceIdToservice
      })) || [],
      packageservice_packageservice_packageIdToservice: undefined
    } : null;
    res.json(full);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar serviço." });
  }
});

app.delete("/api/services/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    await (prisma.packageService as any).deleteMany({ where: { packageId: req.params.id } });
    await (prisma.packageService as any).deleteMany({ where: { serviceId: req.params.id } });
    await (prisma.service as any).deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir serviço." });
  }
});

// ─── Helper: dispara mensagem de confirmação via WPP ─────────
async function fireWppConfirmation(tenantId: string, appt: any) {
  const botConfig = await (prisma.wppBotConfig as any).findUnique({ where: { tenantId } });
  if (!botConfig?.botEnabled || !botConfig?.sendConfirmation) return;
  const template = await (prisma.wppMessageTemplate as any).findUnique({
    where: { tenantId_type: { tenantId, type: "confirmation" } }
  });
  if (!template?.isActive || !appt?.client?.phone) return;
  const tenant = await (prisma.tenant as any).findUnique({ where: { id: tenantId }, select: { name: true } });
  const apptDate = new Date(appt.date);
  const vars: Record<string, string> = {
    saudacao: getSaudacao(),
    nome_cliente: appt.client?.name || "",
    data_agendamento: apptDate.toLocaleDateString("pt-BR"),
    hora_agendamento: appt.startTime || "",
    servico: appt.service?.name || "",
    profissional: appt.professional?.name || "",
    nome_estabelecimento: tenant?.name || "",
  };
  const message = applyTemplateVars(template.body, vars);
  await sendWppMessage(tenantId, appt.client.phone, message);
}

// ═════════════════════════════════════════════════════════════
//  APPOINTMENTS — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/appointments", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const { start, end, professionalId } = req.query;
    const where: any = { tenantId };
    if (professionalId && professionalId !== "all") where.professionalId = professionalId as string;
    if (start) where.date = { ...(where.date || {}), gte: new Date(start as string) };
    if (end) where.date = { ...(where.date || {}), lte: new Date(end as string) };
    const appointments = await (prisma.appointment as any).findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, duration: true, price: true } },
        professional: { select: { id: true, name: true, role: true } },
        comanda: { select: { id: true, status: true, total: true, paymentMethod: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }]
    });
    res.json(appointments);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar agendamentos." });
  }
});

app.get("/api/appointments/client", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone obrigatório." });
  try {
    const client = await (prisma.client as any).findFirst({ where: { phone: String(phone), tenantId } });
    if (!client) return res.json([]);
    const appointments = await (prisma.appointment as any).findMany({
      where: { clientId: client.id, tenantId },
      include: {
        service: { select: { id: true, name: true } },
        professional: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" }
    });
    res.json(appointments);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar agendamentos do cliente." });
  }
});

app.post("/api/appointments", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { date, startTime, endTime, clientId, serviceId, professionalId, comandaId, duration, notes, status, type, sessionNumber, totalSessions, recurrence } = req.body;
  if (!date || !startTime || !professionalId) return res.status(400).json({ error: "data, horário e profissional são obrigatórios." });
  try {
    const baseDate = new Date(date);
    const count = (recurrence && recurrence.type !== "none") ? (recurrence.count || 1) : 1;
    const interval = (recurrence && recurrence.type !== "none") ? (recurrence.interval || 7) : 7;
    
    const results = [];
    for (let i = 0; i < count; i++) {
      const apptDate = addDays(baseDate, i * interval);
      const appt = await (prisma.appointment as any).create({
        data: {
          id: randomUUID(),
          date: apptDate,
          startTime,
          endTime: endTime || startTime,
          status: status || "scheduled",
          type: type || "atendimento",
          clientId: clientId || null,
          serviceId: serviceId || null,
          professionalId,
          comandaId: comandaId || null,
          duration: duration || 60,
          notes: notes || null,
          tenantId,
          sessionNumber: i + 1,
          totalSessions: count,
        },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true } },
          professional: { select: { id: true, name: true } },
        }
      });
      results.push(appt);
    }
    res.json(results[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao criar agendamento." });
  }
});

app.put("/api/appointments/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { date, startTime, endTime, clientId, serviceId, professionalId, status, notes, duration, type } = req.body;
  try {
    await (prisma.appointment as any).updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(clientId !== undefined && { clientId }),
        ...(serviceId !== undefined && { serviceId }),
        ...(professionalId !== undefined && { professionalId }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(duration !== undefined && { duration }),
        ...(type !== undefined && { type }),
      }
    });
    const appt = await (prisma.appointment as any).findFirst({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
        professional: { select: { id: true, name: true } },
      }
    });
    // Disparar WPP de confirmação se status mudou para "confirmed"
    if (status === "confirmed" && appt?.client?.phone && appt.tenantId) {
      fireWppConfirmation(appt.tenantId, appt).catch(() => {});
    }
    res.json(appt);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar agendamento." });
  }
});

app.patch("/api/appointments/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const data: any = {};
  const allowed = ["status", "date", "startTime", "endTime", "notes", "professionalId", "serviceId", "clientId", "duration", "comandaId"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      data[key] = key === "date" ? new Date(req.body[key]) : req.body[key];
    }
  }
  try {
    await (prisma.appointment as any).updateMany({ where: { id: req.params.id, tenantId: tenantId || undefined }, data });
    const appt = await (prisma.appointment as any).findFirst({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
        professional: { select: { id: true, name: true } },
      }
    });
    // Disparar WPP de confirmação se status mudou para "confirmed"
    if (req.body.status === "confirmed" && appt?.client?.phone && appt.tenantId) {
      fireWppConfirmation(appt.tenantId, appt).catch(() => {});
    }
    res.json(appt);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar agendamento." });
  }
});

app.delete("/api/appointments/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    await (prisma.appointment as any).deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir agendamento." });
  }
});

// ═════════════════════════════════════════════════════════════
//  COMANDAS — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/comandas", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const comandas = await (prisma.comanda as any).findMany({
      where: { tenantId },
      include: {
        client: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(comandas);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar comandas." });
  }
});

app.post("/api/comandas", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { clientId, professionalId, description, total, discount, discountType, paymentMethod, status, type, sessionCount } = req.body;
  try {
    const comanda = await (prisma.comanda as any).create({
      data: {
        id: randomUUID(),
        clientId: clientId || null,
        professionalId: professionalId || null,
        description: description || null,
        total: parseFloat(total) || 0,
        discount: parseFloat(discount) || 0,
        discountType: discountType || "value",
        paymentMethod: paymentMethod || null,
        status: status || "open",
        type: type || "normal",
        sessionCount: parseInt(sessionCount) || 1,
        tenantId,
      },
      include: { client: { select: { id: true, name: true, phone: true } } }
    });
    res.json(comanda);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao criar comanda." });
  }
});

app.put("/api/comandas/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { status, total, discount, discountType, paymentMethod, description, clientId, professionalId, type, sessionCount } = req.body;
  try {
    await (prisma.comanda as any).updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data: {
        ...(status !== undefined && { status }),
        ...(total !== undefined && { total: parseFloat(total) || 0 }),
        ...(discount !== undefined && { discount: parseFloat(discount) || 0 }),
        ...(discountType !== undefined && { discountType }),
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(description !== undefined && { description }),
        ...(clientId !== undefined && { clientId }),
        ...(professionalId !== undefined && { professionalId }),
        ...(type !== undefined && { type }),
        ...(sessionCount !== undefined && { sessionCount: parseInt(sessionCount) || 1 }),
      }
    });
    const comanda = await (prisma.comanda as any).findFirst({
      where: { id: req.params.id },
      include: { client: { select: { id: true, name: true, phone: true } } }
    });
    res.json(comanda);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar comanda." });
  }
});

app.delete("/api/comandas/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    await (prisma.comanda as any).deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir comanda." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SETTINGS — Working Hours por tenant (usa professional default)
// ═════════════════════════════════════════════════════════════
app.get("/api/settings/working-hours", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    // Busca pelo profissional "padrão" do tenant (primeiro profissional ativo)
    const prof = await (prisma.professional as any).findFirst({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } });
    if (!prof) {
      // Retorna horários padrão
      const defaults = Array.from({ length: 7 }, (_, i) => ({
        id: `default-${i}`, dayOfWeek: i, isOpen: i !== 0, startTime: "09:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00", professionalId: null
      }));
      return res.json(defaults);
    }
    let hours = await (prisma.workingHours as any).findMany({ where: { professionalId: prof.id }, orderBy: { dayOfWeek: "asc" } });
    if (hours.length === 0) {
      // Cria horários padrão para este profissional
      for (let i = 0; i < 7; i++) {
        await (prisma.workingHours as any).create({
          data: { id: randomUUID(), dayOfWeek: i, isOpen: i !== 0, startTime: "09:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00", professionalId: prof.id }
        });
      }
      hours = await (prisma.workingHours as any).findMany({ where: { professionalId: prof.id }, orderBy: { dayOfWeek: "asc" } });
    }
    res.json(hours);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar horários." });
  }
});

app.put("/api/settings/working-hours", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { hours } = req.body;
  if (!Array.isArray(hours)) return res.status(400).json({ error: "hours deve ser um array." });
  try {
    for (const h of hours) {
      if (h.id && !h.id.startsWith("default-")) {
        await (prisma.workingHours as any).update({
          where: { id: h.id },
          data: { isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime, breakStart: h.breakStart, breakEnd: h.breakEnd }
        });
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao salvar horários." });
  }
});

// ═════════════════════════════════════════════════════════════
//  CLOSED DAYS / FERIADOS
// ═════════════════════════════════════════════════════════════
app.get("/api/closed-days", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const days = await (prisma.closedDay as any).findMany({ where: { tenantId }, orderBy: { date: "asc" } });
    res.json(days.map(d => ({ id: d.id, date: format(d.date, "yyyy-MM-dd"), name: d.description || "" })));
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar dias fechados." });
  }
});

app.post("/api/closed-days", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { date, name } = req.body;
  if (!date) return res.status(400).json({ error: "Data obrigatória." });
  try {
    const day = await (prisma.closedDay as any).create({
      data: { id: randomUUID(), date: new Date(date), description: name || null, tenantId }
    });
    res.json({ id: day.id, date: format(day.date, "yyyy-MM-dd"), name: day.description || "" });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao criar dia fechado." });
  }
});

app.delete("/api/closed-days/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    await (prisma.closedDay as any).deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir dia fechado." });
  }
});

// ═════════════════════════════════════════════════════════════
//  ADMIN PROFILE
// ═════════════════════════════════════════════════════════════
app.put("/api/admin/profile/:id", async (req, res) => {
  const { name, email, phone, jobTitle, bio, currentPassword, newPassword } = req.body;
  try {
    const user = await (prisma.adminUser as any).findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    if (currentPassword && user.password !== currentPassword) {
      return res.status(400).json({ error: "Senha atual incorreta." });
    }
    const updated = await (prisma.adminUser as any).update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(jobTitle !== undefined && { jobTitle }),
        ...(bio !== undefined && { bio }),
        ...(newPassword && { password: newPassword }),
      }
    });
    res.json({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, jobTitle: updated.jobTitle, bio: updated.bio, role: updated.role });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar perfil." });
  }
});

// ═════════════════════════════════════════════════════════════
//  TENANT SETTINGS (slug, nome, config pública)
// ═════════════════════════════════════════════════════════════
app.get("/api/tenant-settings", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const tenant = await (prisma.tenant as any).findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ error: "Estúdio não encontrado." });
    res.json(tenant);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar configurações." });
  }
});

app.put("/api/tenant-settings", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, slug, ownerPhone, notes } = req.body;
  try {
    if (slug) {
      const conflict = await (prisma.tenant as any).findFirst({ where: { slug, NOT: { id: tenantId } } });
      if (conflict) return res.status(400).json({ error: "Slug já está em uso." });
    }
    const tenant = await (prisma.tenant as any).update({
      where: { id: tenantId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(ownerPhone !== undefined && { ownerPhone }),
        ...(notes !== undefined && { notes }),
      }
    });
    res.json(tenant);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar configurações." });
  }
});

// ═════════════════════════════════════════════════════════════
//  AVAILABLE SLOTS (para agendamento público)
// ═════════════════════════════════════════════════════════════
app.get("/api/available-slots", async (req, res) => {
  const tenantId = (req.query.tenantId as string);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

  const { date, professionalId, duration } = req.query;
  if (!date || !professionalId) return res.status(400).json({ error: "date e professionalId são obrigatórios." });

  const slotDuration = parseInt(duration as string) || 60;
  const targetDate = new Date(date as string);
  const dayOfWeek = targetDate.getDay();

  try {
    // Verifica se é dia fechado
    const closedDay = await (prisma.closedDay as any).findFirst({
      where: {
        tenantId,
        date: { gte: startOfDay(targetDate), lte: addDays(startOfDay(targetDate), 1) }
      }
    });
    if (closedDay) return res.json([]);

    const wh = await (prisma.workingHours as any).findFirst({ where: { professionalId: professionalId as string, dayOfWeek } });
    if (!wh || !wh.isOpen) return res.json([]);

    const existing = await (prisma.appointment as any).findMany({
      where: {
        professionalId: professionalId as string,
        tenantId,
        date: { gte: startOfDay(targetDate), lte: addDays(startOfDay(targetDate), 1) },
        status: { not: "cancelled" }
      }
    });

    const bookedSlots = existing.map(a => ({ start: a.startTime, end: a.endTime }));
    const slots: string[] = [];

    const parseTime = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const formatTime = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

    const start = parseTime(wh.startTime);
    const end = parseTime(wh.endTime);
    const breakStart = wh.breakStart ? parseTime(wh.breakStart) : null;
    const breakEnd = wh.breakEnd ? parseTime(wh.breakEnd) : null;

    for (let t = start; t + slotDuration <= end; t += slotDuration) {
      if (breakStart !== null && breakEnd !== null && t < breakEnd && t + slotDuration > breakStart) continue;
      const slotEnd = t + slotDuration;
      const conflict = bookedSlots.some(b => {
        const bs = parseTime(b.start), be = parseTime(b.end);
        return t < be && slotEnd > bs;
      });
      if (!conflict) slots.push(formatTime(t));
    }

    res.json(slots);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao calcular slots." });
  }
});

// ═════════════════════════════════════════════════════════════
//  WORKING HOURS POR PROFISSIONAL
// ═════════════════════════════════════════════════════════════
app.get("/api/working-hours/:professionalId", async (req, res) => {
  try {
    const hours = await (prisma.workingHours as any).findMany({
      where: { professionalId: req.params.professionalId },
      orderBy: { dayOfWeek: "asc" }
    });
    res.json(hours);
  } catch (e: any) {
    res.status(500).json({ error: "Erro ao buscar horários." });
  }
});

app.put("/api/working-hours/:professionalId", async (req, res) => {
  const { hours } = req.body;
  if (!Array.isArray(hours)) return res.status(400).json({ error: "hours deve ser um array." });
  try {
    for (const h of hours) {
      if (h.id) {
        await (prisma.workingHours as any).update({
          where: { id: h.id },
          data: { isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime, breakStart: h.breakStart, breakEnd: h.breakEnd }
        });
      }
    }
    const updated = await (prisma.workingHours as any).findMany({ where: { professionalId: req.params.professionalId }, orderBy: { dayOfWeek: "asc" } });
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao salvar horários." });
  }
});

// ═════════════════════════════════════════════════════════════
//  WHATSAPP — INSTÂNCIA
// ═════════════════════════════════════════════════════════════

// Templates padrão criados quando o tenant ativa o módulo pela 1ª vez
const DEFAULT_TEMPLATES: { type: string; name: string; body: string }[] = [
  {
    type: "confirmation",
    name: "Confirmação de Agendamento",
    body: "{{saudacao}}, {{nome_cliente}}! 😊\n\nSeu agendamento foi *confirmado*!\n\n📅 *Data:* {{data_agendamento}}\n⏰ *Horário:* {{hora_agendamento}}\n✂️ *Serviço:* {{servico}}\n👤 *Profissional:* {{profissional}}\n\nEstamos te esperando! Qualquer dúvida, é só chamar. 🙌\n\n— {{nome_estabelecimento}}"
  },
  {
    type: "reminder_24h",
    name: "Lembrete 24h Antes",
    body: "{{saudacao}}, {{nome_cliente}}! ⏰\n\nPassando para *lembrar* do seu agendamento de *amanhã*:\n\n📅 *Data:* {{data_agendamento}}\n⏰ *Horário:* {{hora_agendamento}}\n✂️ *Serviço:* {{servico}}\n\nTe esperamos! 💙\n\n— {{nome_estabelecimento}}"
  },
  {
    type: "birthday",
    name: "Parabéns de Aniversário",
    body: "{{saudacao}}, {{nome_cliente}}! 🎂🎉\n\nA equipe do *{{nome_estabelecimento}}* deseja a você um *feliz aniversário*!\n\nQue seu dia seja repleto de alegria! Como presente, entre em contato e ganhe uma surpresa especial. 🎁\n\nCom carinho,\n— {{nome_estabelecimento}}"
  },
  {
    type: "cobranca",
    name: "Cobrança / Pagamento Pendente",
    body: "{{saudacao}}, {{nome_cliente}}!\n\nIdentificamos um *pagamento pendente* referente ao seu atendimento.\n\nPor favor, entre em contato conosco para regularizar. 🙏\n\n— {{nome_estabelecimento}}"
  },
  {
    type: "welcome",
    name: "Boas-vindas (Novo Cliente)",
    body: "{{saudacao}}, {{nome_cliente}}! 🌟\n\nSeja bem-vindo(a) ao *{{nome_estabelecimento}}*!\n\nEstamos muito felizes em ter você como nosso cliente. Qualquer dúvida ou para fazer um agendamento, é só chamar aqui mesmo pelo WhatsApp. 😊\n\n— Equipe {{nome_estabelecimento}}"
  }
];

function getSaudacao(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function applyTemplateVars(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

async function sendWppMessage(tenantId: string, phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const instance = await (prisma.wppInstance as any).findUnique({ where: { tenantId } });
    if (!instance || !instance.isActive || instance.status !== "connected") {
      return { ok: false, error: "WhatsApp não conectado" };
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `${instance.apiUrl.replace(/\/$/, "")}/message/sendText/${instance.instanceName}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": instance.apiKey || "" },
      body: JSON.stringify({ number: `55${cleanPhone}`, text: message })
    });
    if (!resp.ok) {
      const err = await resp.text();
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function ensureDefaultTemplates(tenantId: string) {
  for (const tpl of DEFAULT_TEMPLATES) {
    const exists = await (prisma.wppMessageTemplate as any).findUnique({
      where: { tenantId_type: { tenantId, type: tpl.type } }
    });
    if (!exists) {
      await (prisma.wppMessageTemplate as any).create({
        data: { id: randomUUID(), tenantId, type: tpl.type, name: tpl.name, body: tpl.body, isDefault: true }
      });
    }
  }
}

// GET instância
app.get("/api/wpp/instance", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  try {
    const instance = await (prisma.wppInstance as any).findUnique({ where: { tenantId } });
    res.json(instance || null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST salvar/criar instância
app.post("/api/wpp/instance", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  const { instanceName, apiUrl, apiKey } = req.body;
  if (!instanceName || !apiUrl) return res.status(400).json({ error: "instanceName e apiUrl obrigatórios" });
  try {
    const existing = await (prisma.wppInstance as any).findUnique({ where: { tenantId } });
    let instance;
    if (existing) {
      instance = await (prisma.wppInstance as any).update({
        where: { tenantId },
        data: { instanceName, apiUrl, apiKey: apiKey || null, status: "disconnected", isActive: false, qrCode: null }
      });
    } else {
      instance = await (prisma.wppInstance as any).create({
        data: { id: randomUUID(), tenantId, instanceName, apiUrl, apiKey: apiKey || null }
      });
    }
    await ensureDefaultTemplates(tenantId);
    res.json(instance);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST conectar (busca QR code da Evolution API)
app.post("/api/wpp/connect", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  try {
    const instance = await (prisma.wppInstance as any).findUnique({ where: { tenantId } });
    if (!instance) return res.status(404).json({ error: "Instância não configurada" });
    const url = `${instance.apiUrl.replace(/\/$/, "")}/instance/connect/${instance.instanceName}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { "apikey": instance.apiKey || "" }
    });
    const data = await resp.json() as any;
    const qrCode = data?.base64 || data?.qrcode?.base64 || data?.qr || null;
    const status = qrCode ? "qr_pending" : "connected";
    const phone = data?.instance?.owner || data?.phone || null;
    const updated = await (prisma.wppInstance as any).update({
      where: { tenantId },
      data: { qrCode, status, phone: phone || instance.phone, isActive: status === "connected" }
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET status da conexão
app.get("/api/wpp/status", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  try {
    const instance = await (prisma.wppInstance as any).findUnique({ where: { tenantId } });
    if (!instance) return res.json({ status: "not_configured" });
    const url = `${instance.apiUrl.replace(/\/$/, "")}/instance/connectionState/${instance.instanceName}`;
    const resp = await fetch(url, {
      headers: { "apikey": instance.apiKey || "" }
    });
    if (!resp.ok) {
      return res.json({ status: instance.status, phone: instance.phone });
    }
    const data = await resp.json() as any;
    const state = data?.instance?.state || data?.state || "close";
    const connected = state === "open";
    const updated = await (prisma.wppInstance as any).update({
      where: { tenantId },
      data: { status: connected ? "connected" : "disconnected", isActive: connected }
    });
    res.json({ status: updated.status, phone: updated.phone });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST desconectar
app.post("/api/wpp/disconnect", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  try {
    const instance = await (prisma.wppInstance as any).findUnique({ where: { tenantId } });
    if (!instance) return res.status(404).json({ error: "Instância não encontrada" });
    try {
      await fetch(`${instance.apiUrl.replace(/\/$/, "")}/instance/logout/${instance.instanceName}`, {
        method: "DELETE",
        headers: { "apikey": instance.apiKey || "" }
      });
    } catch {}
    const updated = await (prisma.wppInstance as any).update({
      where: { tenantId },
      data: { status: "disconnected", isActive: false, qrCode: null }
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  WHATSAPP — TEMPLATES
// ═════════════════════════════════════════════════════════════

app.get("/api/wpp/templates", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  try {
    await ensureDefaultTemplates(tenantId);
    const templates = await (prisma.wppMessageTemplate as any).findMany({ where: { tenantId } });
    res.json(templates);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/wpp/templates/:type", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  const { body, name, isActive } = req.body;
  try {
    const updated = await (prisma.wppMessageTemplate as any).update({
      where: { tenantId_type: { tenantId, type: req.params.type } },
      data: { body, name, isActive }
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  WHATSAPP — BOT CONFIG
// ═════════════════════════════════════════════════════════════

app.get("/api/wpp/bot-config", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  try {
    let config = await (prisma.wppBotConfig as any).findUnique({ where: { tenantId } });
    if (!config) {
      config = await (prisma.wppBotConfig as any).create({
        data: {
          id: randomUUID(), tenantId,
          menuOptions: JSON.stringify([
            { id: "1", label: "📅 Fazer um agendamento", action: "booking" },
            { id: "2", label: "🔍 Consultar meu agendamento", action: "check" },
            { id: "3", label: "❌ Cancelar agendamento", action: "cancel" },
            { id: "4", label: "📞 Falar com atendente", action: "human" }
          ])
        }
      });
    }
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/wpp/bot-config", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  const { botEnabled, sendConfirmation, sendReminder24h, sendBirthday, sendCobranca, sendWelcome, menuEnabled, menuWelcomeMsg, menuOptions } = req.body;
  try {
    const existing = await (prisma.wppBotConfig as any).findUnique({ where: { tenantId } });
    let config;
    if (existing) {
      config = await (prisma.wppBotConfig as any).update({
        where: { tenantId },
        data: { botEnabled, sendConfirmation, sendReminder24h, sendBirthday, sendCobranca, sendWelcome, menuEnabled, menuWelcomeMsg, menuOptions: JSON.stringify(menuOptions) }
      });
    } else {
      config = await (prisma.wppBotConfig as any).create({
        data: { id: randomUUID(), tenantId, botEnabled, sendConfirmation, sendReminder24h, sendBirthday, sendCobranca, sendWelcome, menuEnabled, menuWelcomeMsg, menuOptions: JSON.stringify(menuOptions) }
      });
    }
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════
//  WHATSAPP — ENVIO MANUAL DE MENSAGEM (teste)
// ═════════════════════════════════════════════════════════════

app.post("/api/wpp/send-test", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: "phone e message obrigatórios" });
  const result = await sendWppMessage(tenantId, phone, message);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true });
});

// ═════════════════════════════════════════════════════════════
//  VITE DEV SERVER (em produção serve os estáticos)
// ═════════════════════════════════════════════════════════════
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
}

startServer();
