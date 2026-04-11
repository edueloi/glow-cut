import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { addMinutes, format, parse, startOfDay, addDays, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { randomUUID } from "crypto";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20mb" }));

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
  const existing = await (prisma as any).superAdmin.findFirst({ where: { username: "Admin" } });
  if (!existing) {
    await (prisma as any).superAdmin.create({ data: { id: randomUUID(), username: "Admin", password: "super123" } });
    console.log("✅ Super admin criado: Admin / super123");
  } else if (existing.password !== "super123") {
    await (prisma as any).superAdmin.update({ where: { id: existing.id }, data: { password: "super123" } });
    console.log("✅ Super admin senha corrigida");
  }

  const planCount = await (prisma as any).plan.count();
  if (planCount === 0) {
    await (prisma as any).plan.createMany({
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

// ─────────────────────────────────────────────────────────────
//  AUTO-MIGRATION: garante colunas novas sem quebrar o deploy
// ─────────────────────────────────────────────────────────────
async function runAutoMigrations() {
  // ── Appointment: repeatGroupId ─────────────────────────────
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE Appointment ADD COLUMN IF NOT EXISTS repeatGroupId VARCHAR(36) NULL`
    );
  } catch (_) {
    try {
      const cols: any[] = await (prisma as any).$queryRaw`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Appointment' AND COLUMN_NAME = 'repeatGroupId'
      `;
      if (cols.length === 0) {
        await (prisma as any).$executeRawUnsafe(
          `ALTER TABLE Appointment ADD COLUMN repeatGroupId VARCHAR(36) NULL`
        );
      }
    } catch (e2) {
      console.warn("⚠️  Auto-migration repeatGroupId ignorada:", e2);
    }
  }

  // ── Comanda: paymentDetails (pagamento misto / parcelamento) ──
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE Comanda ADD COLUMN IF NOT EXISTS paymentDetails TEXT NULL`
    );
  } catch (_) {
    try {
      const cols: any[] = await (prisma as any).$queryRaw`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Comanda' AND COLUMN_NAME = 'paymentDetails'
      `;
      if (cols.length === 0) {
        await (prisma as any).$executeRawUnsafe(
          `ALTER TABLE Comanda ADD COLUMN paymentDetails TEXT NULL`
        );
      }
    } catch (e2) {
      console.warn("⚠️  Auto-migration paymentDetails ignorada:", e2);
    }
  }

  // ── ComandaItem: cria tabela se não existir ─────────────────
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ComandaItem (
        id         VARCHAR(36)    NOT NULL PRIMARY KEY,
        comandaId  VARCHAR(36)    NOT NULL,
        productId  VARCHAR(36)    NULL,
        serviceId  VARCHAR(36)    NULL,
        name       VARCHAR(255)   NOT NULL,
        price      DOUBLE         NOT NULL DEFAULT 0,
        quantity   INT            NOT NULL DEFAULT 1,
        total      DOUBLE         NOT NULL DEFAULT 0,
        createdAt  DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_comandaitem_comanda  (comandaId),
        INDEX idx_comandaitem_product  (productId),
        INDEX idx_comandaitem_service  (serviceId),
        CONSTRAINT fk_ci_comanda FOREIGN KEY (comandaId) REFERENCES Comanda(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Tabela ComandaItem garantida");
  } catch (e2) {
    console.warn("⚠️  Auto-migration ComandaItem ignorada:", e2);
  }

  // ── AdminUser: photo ────────────────────────────────────────
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE AdminUser ADD COLUMN IF NOT EXISTS photo TEXT NULL`
    );
  } catch (_) {
    try {
      const cols: any[] = await (prisma as any).$queryRaw`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AdminUser' AND COLUMN_NAME = 'photo'
      `;
      if (cols.length === 0) {
        await (prisma as any).$executeRawUnsafe(
          `ALTER TABLE AdminUser ADD COLUMN photo TEXT NULL`
        );
      }
    } catch (e2) {
      console.warn("⚠️  Auto-migration AdminUser.photo ignorada:", e2);
    }
  }

  // ── PackageService: cria tabela se não existir ──────────────
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS PackageService (
        id        VARCHAR(36) NOT NULL PRIMARY KEY,
        packageId VARCHAR(36) NOT NULL,
        serviceId VARCHAR(36) NOT NULL,
        quantity  INT         NOT NULL DEFAULT 1,
        INDEX idx_pkg_package (packageId),
        INDEX idx_pkg_service (serviceId),
        CONSTRAINT fk_pkg_package FOREIGN KEY (packageId) REFERENCES Service(id) ON DELETE CASCADE,
        CONSTRAINT fk_pkg_service FOREIGN KEY (serviceId) REFERENCES Service(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e2) {
    console.warn("⚠️  Auto-migration PackageService ignorada:", e2);
  }

  // ── Sector: cria tabela de setores personalizáveis ──────────
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS Sector (
        id        VARCHAR(36)  NOT NULL PRIMARY KEY,
        tenantId  VARCHAR(36)  NOT NULL,
        name      VARCHAR(100) NOT NULL,
        color     VARCHAR(20)  NOT NULL DEFAULT '#6b7280',
        createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_sector_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Tabela Sector garantida");
  } catch (e2) {
    console.warn("⚠️  Auto-migration Sector ignorada:", e2);
  }

  // ── Product.sectorId: coluna de vínculo ao setor ─────────────
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE Product ADD COLUMN IF NOT EXISTS sectorId VARCHAR(36) NULL`
    );
  } catch (_) {
    try {
      const cols: any[] = await (prisma as any).$queryRaw`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Product' AND COLUMN_NAME = 'sectorId'
      `;
      if (cols.length === 0) {
        await (prisma as any).$executeRawUnsafe(`ALTER TABLE Product ADD COLUMN sectorId VARCHAR(36) NULL`);
      }
    } catch (e2) {
      console.warn("⚠️  Auto-migration Product.sectorId ignorada:", e2);
    }
  }
}
runAutoMigrations();

// ═════════════════════════════════════════════════════════════
//  LOGIN UNIFICADO
// ═════════════════════════════════════════════════════════════
app.post("/api/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: "Preencha todos os campos." });

  // 1) Super admin
  const sa = await (prisma as any).superAdmin.findFirst({ where: { username: identifier, password } });
  if (sa) return res.json({ type: "superadmin", id: sa.id, username: sa.username, role: "superadmin" });

  // 2) Admin normal
  const adminUser = await (prisma as any).adminUser.findFirst({
    where: { email: identifier, password, isActive: true },
    include: { tenant: { include: { plan: true } } }
  });
  if (adminUser) {
    await (prisma as any).adminUser.update({ where: { id: adminUser.id }, data: { lastLogin: new Date() } });
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
  const prof = await (prisma as any).professional.findFirst({
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
  const sa = await (prisma as any).superAdmin.findFirst({ where: { username, password } });
  if (!sa) return res.status(401).json({ error: "Credenciais inválidas." });
  res.json({ id: sa.id, username: sa.username, role: "superadmin" });
});

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — EQUIPE (STAFF)
// ═════════════════════════════════════════════════════════════
app.get("/api/super-admin/staff", async (req, res) => {
  try {
    const staff = await (prisma as any).superAdmin.findMany({
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

app.put("/api/super-admin/staff/:id", async (req, res) => {
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

app.delete("/api/super-admin/staff/:id", async (req, res) => {
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
app.get("/api/super-admin/plans", async (req, res) => {
  try {
    const plans = await (prisma as any).plan.findMany({ where: { isActive: true }, orderBy: { price: "asc" } });
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

// Criar novo tenant + admin owner
app.post("/api/super-admin/tenants", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, adminPassword, expiresAt } = req.body;

  if (!name || !slug || !ownerName || !ownerEmail || !planId || !adminPassword) {
    return res.status(400).json({ error: "Campos obrigatórios: name, slug, ownerName, ownerEmail, planId, adminPassword." });
  }

  // Verifica slug único
  const existing = await (prisma as any).tenant.findFirst({ where: { slug } });
  if (existing) return res.status(400).json({ error: "Slug já está em uso. Escolha outro." });

  // Verifica email único
  const existingEmail = await (prisma as any).adminUser.findFirst({ where: { email: ownerEmail } });
  if (existingEmail) return res.status(400).json({ error: "E-mail já está cadastrado." });

  // Verifica plano
  const plan = await (prisma as any).plan.findFirst({ where: { id: planId, isActive: true } });
  if (!plan) return res.status(400).json({ error: "Plano não encontrado." });

  try {
    // Cria o tenant
    const tenantId = randomUUID();
    // Validade padrão: 30 dias a partir da criação (+ 7 dias de graça = 37 dias até bloquear)
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

    // Cria o admin owner com permissões máximas
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

// Atualizar tenant
app.patch("/api/super-admin/tenants/:id", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, isActive, expiresAt, maxAdminUsersOverride } = req.body;
  try {
    const current = await (prisma as any).tenant.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: "Parceiro não encontrado." });

    // Gerencia blockedAt: ao reativar, limpa blockedAt; ao desativar, registra se ainda não tiver
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

// Deletar tenant (cuidado — remove tudo)
app.delete("/api/super-admin/tenants/:id", async (req, res) => {
  try {
    await (prisma as any).adminUser.deleteMany({ where: { tenantId: req.params.id } });
    await (prisma as any).tenant.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir parceiro." });
  }
});

// PUT alias para PATCH (compatibilidade com frontend)
app.put("/api/super-admin/tenants/:id", async (req, res) => {
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

// ═════════════════════════════════════════════════════════════
//  SUPER-ADMIN — Stats
// ═════════════════════════════════════════════════════════════
app.get("/api/super-admin/stats", async (req, res) => {
  try {
    const [totalTenants, activeTenants, totalAdminUsers, plans] = await Promise.all([
      (prisma as any).tenant.count(),
      (prisma as any).tenant.count({ where: { isActive: true } }),
      (prisma as any).adminUser.count({ where: { isActive: true } }),
      (prisma as any).plan.findMany({ select: { id: true, name: true }, where: { isActive: true } }),
    ]);
    const tenantsByPlan = await Promise.all(
      plans.map(async (p) => ({
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
//  SUPER-ADMIN — Planos (CRUD completo)
// ═════════════════════════════════════════════════════════════
app.post("/api/super-admin/plans", async (req, res) => {
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

app.put("/api/super-admin/plans/:id", async (req, res) => {
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

app.delete("/api/super-admin/plans/:id", async (req, res) => {
  try {
    await (prisma as any).plan.update({ where: { id: req.params.id }, data: { isActive: false } });
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

app.post("/api/super-admin/admin-users", async (req, res) => {
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

app.put("/api/super-admin/admin-users/:id", async (req, res) => {
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

// Atualizar perfil do próprio admin (dashboard)
app.put("/api/admin/profile/:id", async (req, res) => {
  const { name, jobTitle, bio, phone, password, photo } = req.body;
  
  console.log(`[Profile] Atualizando perfil usuário ${req.params.id}`, { name, photo: photo ? (photo.substring(0, 30) + "...") : null });

  try {
    const user = await (prisma as any).adminUser.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(jobTitle !== undefined && { jobTitle }),
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(password !== undefined && { password }),
        ...(photo !== undefined && { photo }),
      },
    });
    res.json(user);
  } catch (e: any) {
    console.error("[Profile] Erro ao atualizar:", e.message);
    res.status(400).json({ error: "Erro ao atualizar perfil." });
  }
});

app.delete("/api/super-admin/admin-users/:id", async (req, res) => {
  try {
    await (prisma as any).adminUser.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir usuário." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await (prisma as any).adminUser.findFirst({
    where: { email, password, isActive: true },
    include: { tenant: { include: { plan: true } } }
  });
  if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos." });
  await (prisma as any).adminUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
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
  const tenant = await (prisma as any).tenant.findFirst({
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
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return res.status(404).json({ error: "Estúdio não encontrado." });
  res.json(tenant);
});

// Atualizar branding do tenant (dashboard admin)
app.post("/api/admin/tenant/branding", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  
  const { themeColor, logoUrl, coverUrl, address, instagram, welcomeMessage, title, description, slug } = req.body;
  
  console.log(`[Branding] Atualizando tenant ${tenantId}`, { logoUrl, coverUrl, slug });

  try {
    const data: any = {};
    if (themeColor !== undefined) data.themeColor = themeColor;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (coverUrl !== undefined) data.coverUrl = coverUrl;
    if (address !== undefined) data.address = address;
    if (instagram !== undefined) data.instagram = instagram;
    if (welcomeMessage !== undefined) data.welcomeMessage = welcomeMessage;
    if (description !== undefined) data.description = description;
    if (title !== undefined) data.name = title;
    if (slug !== undefined) data.slug = slug;

    const tenant = await (prisma as any).tenant.update({
      where: { id: tenantId },
      data
    });
    res.json(tenant);
  } catch (e: any) {
    console.error("[Branding] Erro ao salvar:", e.message);
    if (e.code === 'P2002') {
      return res.status(400).json({ error: "Este link (slug) já está sendo usado por outro estúdio." });
    }
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
    const clientsData = await (prisma as any).client.findMany({
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
      const client = await (prisma as any).client.findFirst({
        where: { phone: String(phone), tenantId },
        include: { comanda: { where: { status: "open" } } }
      });
      if (client) client.comandas = client.comanda || [];
      return res.json(client);
    }
    if (name) {
      const clientsData = await (prisma as any).client.findMany({
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
    const existing = await (prisma as any).client.findFirst({ where: { phone, tenantId } });
    let client;
    if (existing) {
      client = await (prisma as any).client.update({
        where: { id: existing.id },
        data: { name, age: parseInt(age || "0") }
      });
    } else {
      client = await (prisma as any).client.create({
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
    const client = await (prisma as any).client.updateMany({
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
    const profs = await (prisma as any).professional.findMany({
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
    const prof = await (prisma as any).professional.create({
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
      await (prisma as any).workingHours.create({
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
  const prof = await (prisma as any).professional.findFirst({
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
    await (prisma as any).professional.updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data
    });
    const prof = await (prisma as any).professional.findFirst({
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
    await (prisma as any).workingHours.deleteMany({ where: { professionalId: req.params.id } });
    await (prisma as any).professional.deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
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
    let servicesRaw: any[];
    try {
      servicesRaw = await (prisma as any).service.findMany({
        where: { tenantId },
        include: {
          packageservice_packageservice_packageIdToservice: {
            include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true, duration: true, price: true } } }
          }
        },
        orderBy: { name: "asc" }
      });
    } catch (includeErr: any) {
      console.error("[/api/services] Erro com include, tentando query simples:", includeErr?.message || includeErr);
      servicesRaw = await (prisma as any).service.findMany({
        where: { tenantId },
        orderBy: { name: "asc" }
      });
    }

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
    console.error("[/api/services] Erro Prisma:", e?.message || e);
    res.status(500).json({ error: "Erro ao buscar serviços.", detail: e?.message });
  }
});

app.post("/api/services", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, description, price, duration, type, discount, discountType, includedServices, professionalIds } = req.body;
  if (!name || !price) return res.status(400).json({ error: "Nome e preço são obrigatórios." });
  let serviceId: string | null = null;
  try {
    serviceId = randomUUID();
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO Service (id, name, description, price, duration, type, discount, discountType, professionalIds, tenantId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      serviceId,
      name,
      description || null,
      parseFloat(price) || 0,
      parseInt(duration) || 60,
      type || "service",
      parseFloat(discount) || 0,
      discountType || "value",
      JSON.stringify(professionalIds || []),
      tenantId
    );
  } catch (e: any) {
    console.error("❌ service.create failed:", e.message);
    return res.status(400).json({ error: e.message || "Erro ao criar serviço." });
  }
  // Cria relações de pacote
  if (type === "package" && Array.isArray(includedServices)) {
    for (const s of includedServices) {
      try {
        await (prisma as any).packageService.create({
          data: { id: randomUUID(), packageId: serviceId, serviceId: s.id, quantity: s.quantity || 1 }
        });
      } catch (e: any) {
        console.error("❌ packageService.create failed for serviceId", s.id, ":", e.message);
        // Não aborta — serviço já criado, apenas registra o erro
      }
    }
  }
  // Busca o serviço completo com relações de pacote
  let full: any = null;
  try {
    const fullRaw = await (prisma as any).service.findFirst({
      where: { id: serviceId },
      include: { packageservice_packageservice_packageIdToservice: { include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true } } } } }
    });
    full = fullRaw ? {
      ...fullRaw,
      packageServices: fullRaw.packageservice_packageservice_packageIdToservice?.map((ps: any) => ({
        ...ps,
        service: ps.service_packageservice_serviceIdToservice
      })) || [],
      packageservice_packageservice_packageIdToservice: undefined
    } : null;
  } catch (e: any) {
    console.warn("⚠️  findFirst com include falhou, retornando serviço básico:", e.message);
    // Fallback: retorna apenas o serviço sem os packageServices incluídos
    full = await (prisma as any).service.findFirst({ where: { id: serviceId } });
    if (full) full = { ...full, packageServices: [] };
  }
  res.json(full);
});

app.put("/api/services/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { name, description, price, duration, type, discount, discountType, includedServices, professionalIds } = req.body;
  try {
    await (prisma as any).service.updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) || 0 }),
        ...(duration !== undefined && { duration: parseInt(duration) || 60 }),
        ...(type !== undefined && { type }),
        ...(discount !== undefined && { discount: parseFloat(discount) || 0 }),
        ...(discountType !== undefined && { discountType }),
      }
    });
    // professionalIds não está no client gerado — atualiza via raw
    if (professionalIds !== undefined) {
      await (prisma as any).$executeRawUnsafe(
        `UPDATE Service SET professionalIds = ? WHERE id = ? AND tenantId = ?`,
        JSON.stringify(professionalIds),
        req.params.id,
        tenantId
      );
    }
  } catch (e: any) {
    console.error("❌ service.updateMany failed:", e.message);
    return res.status(400).json({ error: e.message || "Erro ao atualizar serviço." });
  }
  // Atualiza relações de pacote
  if (type === "package" && Array.isArray(includedServices)) {
    try {
      await (prisma as any).packageService.deleteMany({ where: { packageId: req.params.id } });
      for (const s of includedServices) {
        await (prisma as any).packageService.create({
          data: { id: randomUUID(), packageId: req.params.id, serviceId: s.id, quantity: s.quantity || 1 }
        });
      }
    } catch (e: any) {
      console.error("❌ packageService update failed:", e.message);
    }
  }
  let full: any = null;
  try {
    const fullRaw = await (prisma as any).service.findFirst({
      where: { id: req.params.id },
      include: { packageservice_packageservice_packageIdToservice: { include: { service_packageservice_serviceIdToservice: { select: { id: true, name: true } } } } }
    });
    full = fullRaw ? {
      ...fullRaw,
      packageServices: fullRaw.packageservice_packageservice_packageIdToservice?.map((ps: any) => ({
        ...ps,
        service: ps.service_packageservice_serviceIdToservice
      })) || [],
      packageservice_packageservice_packageIdToservice: undefined
    } : null;
  } catch (e: any) {
    console.warn("⚠️  findFirst com include falhou no PUT, retornando serviço básico:", e.message);
    full = await (prisma as any).service.findFirst({ where: { id: req.params.id } });
    if (full) full = { ...full, packageServices: [] };
  }
  res.json(full);
});

app.delete("/api/services/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    await (prisma as any).packageService.deleteMany({ where: { packageId: req.params.id } });
    await (prisma as any).packageService.deleteMany({ where: { serviceId: req.params.id } });
    await (prisma as any).service.deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir serviço." });
  }
});

// ─── Helpers de template WPP ──────────────────────────────────
function getSaudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function applyTemplateVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

async function sendWppMessage(tenantId: string, phone: string, message: string) {
  console.log(`[WPP Mock] Para: ${phone}, Mensagem: ${message}`);
  // Aqui entraria a integração real com API do WhatsApp (ex: Evolution API)
}

// ─── Helper: dispara confirmação de agendamento criado no balcão ──
async function fireWppConfirmationBalcao(tenantId: string, appt: any) {
  try {
    const botConfig = await (prisma as any).wppBotConfig.findUnique({ where: { tenantId } });
    if (!botConfig?.botEnabled || !botConfig?.sendConfirmation) return;
    if (!appt?.client?.phone) return;

    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, address: true }
    });

    const apptDate = new Date(appt.date);
    const dataFormatada = apptDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

    // Tenta usar template customizado; se não tiver, usa mensagem padrão
    const template = await (prisma as any).wppMessageTemplate.findUnique({
      where: { tenantId_type: { tenantId, type: "confirmation" } }
    });

    let message: string;
    if (template?.isActive && template?.body) {
      const vars: Record<string, string> = {
        saudacao: getSaudacao(),
        nome_cliente: appt.client?.name || "",
        data_agendamento: dataFormatada,
        hora_agendamento: appt.startTime || "",
        servico: appt.service?.name || "",
        profissional: appt.professional?.name || "",
        nome_estabelecimento: tenant?.name || "",
        endereco: tenant?.address || "",
      };
      message = applyTemplateVars(template.body, vars);
    } else {
      // Mensagem padrão com todos os dados solicitados
      const endereco = tenant?.address ? `\n📍 *Endereço:* ${tenant.address}` : "";
      const profissional = appt.professional?.name ? `\n💇 *Profissional:* ${appt.professional.name}` : "";
      const servico = appt.service?.name ? `\n✂️ *Serviço:* ${appt.service.name}` : "";
      message = `${getSaudacao()}, *${appt.client?.name || ""}*! 👋\n\nSeu agendamento foi confirmado com sucesso no *${tenant?.name || "salão"}*.\n\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${appt.startTime}${servico}${profissional}${endereco}\n\n⚠️ *Importante:* Chegue com 5 minutos de antecedência.\n\nTe esperamos! 💛`;
    }

    await sendWppMessage(tenantId, appt.client.phone, message);
  } catch (err) {
    console.warn("[WPP Balcão] Erro ao disparar mensagem:", err);
  }
}

// ─── Helper: dispara mensagem de confirmação via WPP ─────────
async function fireWppConfirmation(tenantId: string, appt: any) {
  const botConfig = await (prisma as any).wppBotConfig.findUnique({ where: { tenantId } });
  if (!botConfig?.botEnabled || !botConfig?.sendConfirmation) return;
  const template = await (prisma as any).wppMessageTemplate.findUnique({
    where: { tenantId_type: { tenantId, type: "confirmation" } }
  });
  if (!template?.isActive || !appt?.client?.phone) return;
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
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
//  AVAILABILITY & CALENDAR STATUS
// ═════════════════════════════════════════════════════════════

app.get("/api/availability", async (req, res) => {
  const tenantId = getTenantId(req);
  const { date, serviceId, professionalId } = req.query;

  if (!date || !serviceId || !professionalId) {
    return res.status(400).json({ error: "date, serviceId and professionalId are required." });
  }

  try {
    const targetDate = new Date(date as string);
    const dayOfWeek = targetDate.getDay();

    // 1. Duração do serviço
    const service = await (prisma as any).service.findUnique({ where: { id: serviceId as string } });
    if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
    const duration = service.duration || 60;

    // 2. Horário de trabalho do profissional
    const wh = await (prisma as any).workingHours.findFirst({
      where: { professionalId: professionalId as string, dayOfWeek }
    });

    if (!wh || !wh.isOpen) return res.json([]);

    // 3. Agendamentos existentes
    const appts = await (prisma as any).appointment.findMany({
      where: {
        professionalId: professionalId as string,
        date: {
          gte: startOfDay(targetDate),
          lte: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        },
        status: { not: "cancelled" }
      }
    });

    // 4. Verificar se o dia está fechado (feriado/bloqueio)
    const closed = await (prisma as any).closedDay.findFirst({
      where: { 
        tenantId, 
        date: { 
          gte: startOfDay(targetDate), 
          lte: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) 
        } 
      }
    });
    if (closed) return res.json([]);

    // 5. Gerar slots
    const slots: string[] = [];
    const dateStr = format(targetDate, "yyyy-MM-dd");
    let current = parse(`${dateStr} ${wh.startTime}`, "yyyy-MM-dd HH:mm", new Date());
    const end = parse(`${dateStr} ${wh.endTime}`, "yyyy-MM-dd HH:mm", new Date());
    const breakS = wh.breakStart ? parse(`${dateStr} ${wh.breakStart}`, "yyyy-MM-dd HH:mm", new Date()) : null;
    const breakE = wh.breakEnd ? parse(`${dateStr} ${wh.breakEnd}`, "yyyy-MM-dd HH:mm", new Date()) : null;

    // Se for hoje, o horário inicial deve respeitar a hora atual + 30 min
    const now = new Date();
    if (isSameDay(targetDate, now)) {
      const minStart = addMinutes(now, 30);
      if (current < minStart) {
        // Redimensiona para o próximo bloco de 30 min
        const mins = minStart.getMinutes();
        const adjustedMins = mins <= 30 ? 30 : 60;
        current = new Date(minStart);
        current.setMinutes(adjustedMins);
        current.setSeconds(0);
        current.setMilliseconds(0);
      }
    }

    while (current < end) {
      const slotStartStr = format(current, "HH:mm");
      const slotEnd = addMinutes(current, duration);
      const slotEndStr = format(slotEnd, "HH:mm");

      // Verifica se o slot cabe no horário de trabalho e não está no intervalo
      const isInsideWorkingHours = slotStartStr >= wh.startTime && slotEndStr <= wh.endTime;
      const isOutsideBreak = !breakS || !breakE || (slotEndStr <= wh.breakStart || slotStartStr >= wh.breakEnd);

      if (isInsideWorkingHours && isOutsideBreak && slotEnd <= end) {
        // Verifica sobreposição com outros agendamentos
        const hasOverlap = appts.some((a: any) => {
          // Simplificação: assume que startTime e endTime estão em HH:mm strings no banco
          return (slotStartStr >= a.startTime && slotStartStr < a.endTime) ||
                 (slotEndStr > a.startTime && slotEndStr <= a.endTime) ||
                 (slotStartStr <= a.startTime && slotEndStr >= a.endTime);
        });

        if (!hasOverlap) {
          slots.push(slotStartStr);
        }
      }
      current = addMinutes(current, 30); // Incremento de 30 min entre opções de início
    }

    res.json(slots);
  } catch (e: any) {
    console.error("[GET /api/availability] Erro:", e);
    res.status(500).json({ error: "Erro ao calcular disponibilidade." });
  }
});

app.get("/api/calendar-status", async (req, res) => {
  const tenantId = getTenantId(req);
  const { month, professionalId } = req.query;

  if (!month || !professionalId) return res.status(400).json({ error: "month e professionalId são obrigatórios." });

  try {
    const targetDate = new Date(month as string);
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);

    const workingHours = await (prisma as any).workingHours.findMany({ where: { professionalId: professionalId as string } });
    const closedDays = await (prisma as any).closedDay.findMany({ where: { tenantId, date: { gte: start, lte: end } } });
    const appts = await (prisma as any).appointment.findMany({
      where: { 
        professionalId: professionalId as string, 
        date: { gte: start, lte: end }, 
        status: { not: "cancelled" } 
      }
    });

    const statusMap: Record<string, string> = {};
    let cursor = start;
    while (cursor <= end) {
      const dateStr = format(cursor, "yyyy-MM-dd");
      const dayOfWeek = cursor.getDay();
      const wh = workingHours.find((w: any) => w.dayOfWeek === dayOfWeek);
      const isClosed = closedDays.find((cd: any) => format(cd.date, "yyyy-MM-dd") === dateStr);

      if (!wh || !wh.isOpen || isClosed) {
        statusMap[dateStr] = "closed";
      } else {
        const dayAppts = appts.filter((a: any) => format(a.date, "yyyy-MM-dd") === dateStr);
        if (dayAppts.length >= 8) statusMap[dateStr] = "full";
        else if (dayAppts.length >= 4) statusMap[dateStr] = "busy";
        else statusMap[dateStr] = "available";
      }
      cursor = addDays(cursor, 1);
    }
    res.json(statusMap);
  } catch (e: any) {
    console.error("[GET /api/calendar-status] Erro:", e);
    res.status(500).json({ error: "Erro ao buscar status do calendário." });
  }
});

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
    const appointments = await (prisma as any).appointment.findMany({
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
    const client = await (prisma as any).client.findFirst({ where: { phone: String(phone), tenantId } });
    if (!client) return res.json([]);
    const appointments = await (prisma as any).appointment.findMany({
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
  const { date, startTime, endTime, clientId, serviceId, professionalId: rawProfessionalId, comandaId, duration, notes, status, type, sessionNumber, totalSessions, recurrence } = req.body;
  if (!date || !startTime) return res.status(400).json({ error: "data e horário são obrigatórios." });

  // Se não veio professionalId, pega o primeiro profissional ativo do tenant
  let professionalId = rawProfessionalId || null;
  if (!professionalId) {
    const firstProf = await (prisma as any).professional.findFirst({ where: { tenantId, isActive: true } });
    if (firstProf) professionalId = firstProf.id;
  }
  if (!professionalId) return res.status(400).json({ error: "Nenhum profissional disponível." });

  try {
    const baseDate = new Date(date);
    const count = (recurrence && recurrence.type !== "none") ? (recurrence.count || 1) : 1;
    const interval = (recurrence && recurrence.type !== "none") ? (recurrence.interval || 7) : 7;
    
    // Gera um groupId compartilhado por todas as repetições
    const groupId = count > 1 ? randomUUID() : null;
    const results = [];
    for (let i = 0; i < count; i++) {
      const apptDate = addDays(baseDate, i * interval);
      const appt = await (prisma as any).appointment.create({
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
          repeatGroupId: groupId,
        },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true } },
          professional: { select: { id: true, name: true } },
        }
      });
      results.push(appt);
    }

    // ── Auto-disparo WPP de confirmação ao criar agendamento no balcão ──
    const firstAppt = results[0];
    if (tenantId && firstAppt?.client?.phone) {
      fireWppConfirmationBalcao(tenantId, firstAppt).catch(() => {});
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
    await (prisma as any).appointment.updateMany({
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
    const appt = await (prisma as any).appointment.findFirst({
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
    await (prisma as any).appointment.updateMany({ where: { id: req.params.id, tenantId: tenantId || undefined }, data });
    const appt = await (prisma as any).appointment.findFirst({
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
    await (prisma as any).appointment.deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir agendamento." });
  }
});

// Busca todos os agendamentos do mesmo grupo de repetição
app.get("/api/appointments/group/:groupId", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const appts = await (prisma as any).appointment.findMany({
      where: { repeatGroupId: req.params.groupId, tenantId },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" }
    });
    res.json(appts);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao buscar grupo." });
  }
});

// Deleta múltiplos agendamentos por array de IDs
app.delete("/api/appointments/batch", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids obrigatório." });
  try {
    await (prisma as any).appointment.deleteMany({ where: { id: { in: ids }, tenantId } });
    res.json({ success: true, deleted: ids.length });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir agendamentos." });
  }
});

// ═════════════════════════════════════════════════════════════
//  COMANDAS — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/comandas", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    // Raw SQL para garantir que metadata do produto venha corretamente (Prisma client pode estar desatualizado)
    const rows: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT c.*, cl.name as clientName, cl.phone as clientPhone
       FROM Comanda c
       LEFT JOIN Client cl ON c.clientId = cl.id
       WHERE c.tenantId = ?
       ORDER BY c.createdAt DESC`,
      tenantId
    );
    const itemRows: any[] = rows.length > 0
      ? await (prisma as any).$queryRawUnsafe(
          `SELECT ci.*, p.name as productName, p.photo as productPhoto, p.metadata as productMetadata,
                  p.sectorId as productSectorId, sec.name as productSectorName, sec.color as productSectorColor,
                  sv.name as serviceName
           FROM ComandaItem ci
           LEFT JOIN Product p ON ci.productId = p.id
           LEFT JOIN Sector sec ON p.sectorId = sec.id
           LEFT JOIN Service sv ON ci.serviceId = sv.id
           WHERE ci.comandaId IN (${rows.map(() => "?").join(",")})`,
          ...rows.map((r: any) => r.id)
        )
      : [];
    // Agrupa items por comandaId
    const itemsByComanda: Record<string, any[]> = {};
    for (const item of itemRows) {
      if (!itemsByComanda[item.comandaId]) itemsByComanda[item.comandaId] = [];
      itemsByComanda[item.comandaId].push({
        ...item,
        product: item.productId ? {
          id: item.productId, name: item.productName, photo: item.productPhoto,
          metadata: item.productMetadata,
          sectorId: item.productSectorId,
          sector: item.productSectorId ? { id: item.productSectorId, name: item.productSectorName, color: item.productSectorColor } : null,
        } : null,
        service: item.serviceId ? { id: item.serviceId, name: item.serviceName } : null,
      });
    }
    const comandas = rows.map((r: any) => ({
      ...r,
      client: r.clientName ? { id: r.clientId, name: r.clientName, phone: r.clientPhone } : null,
      items: itemsByComanda[r.id] || [],
    }));
    res.json(comandas);
  } catch (e: any) {
    console.error("[GET /api/comandas] Erro:", e?.message || e);
    res.status(500).json({ error: "Erro ao buscar comandas.", detail: e?.message });
  }
});

app.post("/api/comandas", async (req, res) => {
  const tenantId = getTenantId(req);
  const { clientId, professionalId, description, total, discount, discountType, paymentMethod, status, type, sessionCount, items } = req.body;
  try {
    const comandaId = randomUUID();
    // INSERT via raw para evitar limitações do Prisma client desatualizado
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO Comanda (id, clientId, professionalId, description, total, discount, discountType, paymentMethod, status, type, sessionCount, tenantId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      comandaId,
      clientId || null,
      professionalId || null,
      description || null,
      parseFloat(total) || 0,
      parseFloat(discount) || 0,
      discountType || "value",
      paymentMethod || null,
      status || "open",
      type || "normal",
      parseInt(sessionCount) || 1,
      tenantId
    );

    // Insere os itens
    for (const it of (items || [])) {
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO ComandaItem (id, comandaId, productId, serviceId, name, price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        comandaId,
        it.productId || null,
        it.serviceId || null,
        it.name,
        parseFloat(it.price) || 0,
        parseInt(it.quantity) || 1,
        (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 1)
      );
      // Decrementa estoque se for produto
      if (it.productId) {
        await (prisma as any).product.update({
          where: { id: it.productId },
          data: { stock: { decrement: parseInt(it.quantity) || 1 } }
        }).catch(() => {});
      }
    }

    // Retorna a comanda criada com client e items
    const rows: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT c.*, cl.name as clientName, cl.phone as clientPhone FROM Comanda c
       LEFT JOIN Client cl ON c.clientId = cl.id WHERE c.id = ?`,
      comandaId
    );
    const itemRows: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM ComandaItem WHERE comandaId = ?`, comandaId
    );
    const r = rows[0] || {};
    const comanda = {
      ...r,
      client: r.clientName ? { id: r.clientId, name: r.clientName, phone: r.clientPhone } : null,
      items: itemRows
    };

    res.json(comanda);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao criar comanda." });
  }
});

app.put("/api/comandas/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { status, total, discount, discountType, paymentMethod, paymentDetails, description, clientId, professionalId, type, sessionCount } = req.body;
  try {
    // Monta SET dinâmico via raw para campos que o Prisma client desatualizado não conhece
    const sets: string[] = [];
    const vals: any[] = [];
    if (status !== undefined)        { sets.push("status = ?");        vals.push(status); }
    if (total !== undefined)         { sets.push("total = ?");         vals.push(parseFloat(total) || 0); }
    if (discount !== undefined)      { sets.push("discount = ?");      vals.push(parseFloat(discount) || 0); }
    if (discountType !== undefined)  { sets.push("discountType = ?");  vals.push(discountType); }
    if (paymentMethod !== undefined) { sets.push("paymentMethod = ?"); vals.push(paymentMethod); }
    if (paymentDetails !== undefined){ sets.push("paymentDetails = ?");vals.push(typeof paymentDetails === 'object' ? JSON.stringify(paymentDetails) : paymentDetails); }
    if (description !== undefined)   { sets.push("description = ?");   vals.push(description); }
    if (clientId !== undefined)      { sets.push("clientId = ?");      vals.push(clientId); }
    if (professionalId !== undefined){ sets.push("professionalId = ?");vals.push(professionalId); }
    if (type !== undefined)          { sets.push("type = ?");          vals.push(type); }
    if (sessionCount !== undefined)  { sets.push("sessionCount = ?");  vals.push(parseInt(sessionCount) || 1); }

    if (sets.length > 0) {
      vals.push(req.params.id);
      if (tenantId) vals.push(tenantId);
      await (prisma as any).$executeRawUnsafe(
        `UPDATE Comanda SET ${sets.join(", ")} WHERE id = ?${tenantId ? " AND tenantId = ?" : ""}`,
        ...vals
      );
    }

    const comanda = await (prisma as any).$queryRawUnsafe(
      `SELECT c.*, cl.id as clientId_ref, cl.name as clientName, cl.phone as clientPhone
       FROM Comanda c LEFT JOIN Client cl ON c.clientId = cl.id
       WHERE c.id = ?`,
      req.params.id
    ).then((rows: any[]) => {
      if (!rows[0]) return null;
      const r = rows[0];
      return { ...r, client: r.clientName ? { id: r.clientId, name: r.clientName, phone: r.clientPhone } : null };
    });
    res.json(comanda);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao atualizar comanda." });
  }
});

app.delete("/api/comandas/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    // Apaga itens primeiro (caso não haja cascade configurado no Prisma client)
    await (prisma as any).$executeRawUnsafe(`DELETE FROM ComandaItem WHERE comandaId = ?`, req.params.id);
    if (tenantId) {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM Comanda WHERE id = ? AND tenantId = ?`, req.params.id, tenantId);
    } else {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM Comanda WHERE id = ?`, req.params.id);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Erro ao excluir comanda." });
  }
});

// Atualiza itens + desconto + total de uma comanda existente (com controle de estoque)
app.put("/api/comandas/:id/items", async (req, res) => {
  const tenantId = getTenantId(req);
  const { items, discount, discountType, total } = req.body;
  try {
    // 1. Busca itens antigos para restaurar estoque dos produtos que saíram
    const oldItems: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM ComandaItem WHERE comandaId = ?`, req.params.id
    );

    // 2. Restaura estoque dos itens de produto que existiam antes
    for (const old of oldItems) {
      if (old.productId) {
        await (prisma as any).$executeRawUnsafe(
          `UPDATE Product SET stock = stock + ? WHERE id = ?`,
          parseInt(old.quantity) || 1, old.productId
        );
      }
    }

    // 3. Apaga itens antigos
    await (prisma as any).$executeRawUnsafe(`DELETE FROM ComandaItem WHERE comandaId = ?`, req.params.id);

    // 4. Insere novos itens e decrementa estoque
    for (const it of (items || [])) {
      if (!it.name) continue;
      const qty = parseInt(it.quantity) || 1;
      const price = parseFloat(it.price) || 0;
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO ComandaItem (id, comandaId, productId, serviceId, name, price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(), req.params.id,
        it.productId || null, it.serviceId || null,
        it.name, price, qty, price * qty
      );
      // Decrementa estoque do produto
      if (it.productId) {
        await (prisma as any).$executeRawUnsafe(
          `UPDATE Product SET stock = GREATEST(0, stock - ?) WHERE id = ?`,
          qty, it.productId
        );
      }
    }

    // 5. Atualiza comanda
    await (prisma as any).$executeRawUnsafe(
      `UPDATE Comanda SET discount = ?, discountType = ?, total = ? WHERE id = ?${tenantId ? " AND tenantId = ?" : ""}`,
      ...(tenantId
        ? [parseFloat(discount) || 0, discountType || "value", parseFloat(total) || 0, req.params.id, tenantId]
        : [parseFloat(discount) || 0, discountType || "value", parseFloat(total) || 0, req.params.id])
    );
    res.json({ success: true });
  } catch (e: any) {
    console.error("[PUT /api/comandas/:id/items] Erro:", e?.message || e);
    res.status(500).json({ error: e?.message || "Erro ao atualizar itens." });
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
//  PRODUCTS
// ═════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════
//  RELATÓRIOS POR PROFISSIONAL
// ═════════════════════════════════════════════════════════════
app.get("/api/reports/professionals", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { from, to } = req.query;

  try {
    const professionals = await (prisma as any).professional.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, role: true, photo: true }
    });

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from as string);
    if (to) dateFilter.lte = new Date(to as string);

    const comandas = await (prisma as any).comanda.findMany({
      where: {
        tenantId,
        status: "paid",
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      select: { id: true, total: true, professionalId: true, createdAt: true, paymentMethod: true }
    });

    const appointments = await (prisma as any).appointment.findMany({
      where: {
        tenantId,
        status: { not: "cancelled" },
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      select: { id: true, professionalId: true, status: true, date: true }
    });

    const result = professionals.map((prof: any) => {
      const profComandas = comandas.filter((c: any) => c.professionalId === prof.id);
      const profAppts = appointments.filter((a: any) => a.professionalId === prof.id);
      const totalRevenue = profComandas.reduce((s: number, c: any) => s + (c.total || 0), 0);
      const avgTicket = profComandas.length > 0 ? totalRevenue / profComandas.length : 0;
      const performed = profAppts.filter((a: any) => a.status === 'realizado' || a.status === 'confirmed').length;

      return {
        ...prof,
        totalRevenue,
        avgTicket,
        totalComandas: profComandas.length,
        totalAppointments: profAppts.length,
        performedAppointments: performed,
      };
    });

    // Ordena por faturamento desc
    result.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Erro ao buscar relatório." });
  }
});

app.get("/api/products", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const products: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT p.*, s.name as sectorName, s.color as sectorColor
       FROM Product p
       LEFT JOIN Sector s ON p.sectorId = s.id
       WHERE p.tenantId = ?
       ORDER BY p.name ASC`,
      tenantId
    );
    // Monta objeto sector aninhado se houver
    const result = products.map((p: any) => ({
      ...p,
      sector: p.sectorId ? { id: p.sectorId, name: p.sectorName, color: p.sectorColor } : null,
    }));
    res.json(result);
  } catch (e: any) {
    console.error("[GET /api/products] Erro:", e?.message || e);
    res.status(500).json({ error: e?.message || "Erro ao buscar produtos." });
  }
});

app.post("/api/products", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, description, photo, costPrice, salePrice, stock, minStock, validUntil, code, isForSale, metadata, sectorId } = req.body;
  if (!name) return res.status(400).json({ error: "Nome obrigatório." });
  try {
    const id = randomUUID();
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO Product (id, tenantId, name, description, photo, costPrice, salePrice, stock, minStock, validUntil, code, isForSale, metadata, sectorId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, tenantId, name,
      description || null, photo || null,
      parseFloat(costPrice || "0"), parseFloat(salePrice || "0"),
      parseInt(stock || "0"), parseInt(minStock || "0"),
      validUntil ? new Date(validUntil) : null,
      code || null, isForSale !== false ? 1 : 0,
      metadata ? JSON.stringify(metadata) : null,
      sectorId || null
    );
    const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM Product WHERE id = ?`, id);
    res.json(rows[0] || { id });
  } catch (e: any) {
    console.error("[POST /api/products] Erro:", e?.message || e);
    res.status(500).json({ error: e?.message || "Erro ao criar produto." });
  }
});

app.put("/api/products/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, description, photo, costPrice, salePrice, stock, minStock, validUntil, code, isForSale, metadata, sectorId } = req.body;
  try {
    await (prisma as any).$executeRawUnsafe(
      `UPDATE Product SET name=?, description=?, photo=?, costPrice=?, salePrice=?, stock=?, minStock=?,
       validUntil=?, code=?, isForSale=?, metadata=?, sectorId=?
       WHERE id=? AND tenantId=?`,
      name,
      description || null, photo || null,
      parseFloat(costPrice || "0"), parseFloat(salePrice || "0"),
      parseInt(stock || "0"), parseInt(minStock || "0"),
      validUntil ? new Date(validUntil) : null,
      code || null, isForSale !== false ? 1 : 0,
      metadata ? JSON.stringify(metadata) : null,
      sectorId || null,
      req.params.id, tenantId
    );
    res.json({ success: true });
  } catch (e: any) {
    console.error("[PUT /api/products/:id] Erro:", e?.message || e);
    res.status(500).json({ error: e?.message || "Erro ao atualizar produto." });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    await (prisma as any).product.deleteMany({ where: { id: req.params.id, tenantId } });
    res.json({ success: true });
  } catch (e: any) {
    console.error("[DELETE /api/products/:id] Erro:", e?.message || e);
    res.status(500).json({ error: e?.message || "Erro ao excluir produto." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SETORES — personalizáveis por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/sectors", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    const sectors: any[] = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM Sector WHERE tenantId = ? ORDER BY name ASC`, tenantId
    );
    res.json(sectors);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Erro ao buscar setores." });
  }
});

app.post("/api/sectors", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Nome obrigatório." });
  try {
    const id = randomUUID();
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO Sector (id, tenantId, name, color) VALUES (?, ?, ?, ?)`,
      id, tenantId, name.trim(), color || "#6b7280"
    );
    res.json({ id, tenantId, name: name.trim(), color: color || "#6b7280" });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Erro ao criar setor." });
  }
});

app.put("/api/sectors/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, color } = req.body;
  try {
    const sets: string[] = [];
    const vals: any[] = [];
    if (name !== undefined) { sets.push("name = ?"); vals.push(name.trim()); }
    if (color !== undefined) { sets.push("color = ?"); vals.push(color); }
    if (sets.length > 0) {
      vals.push(req.params.id, tenantId);
      await (prisma as any).$executeRawUnsafe(
        `UPDATE Sector SET ${sets.join(", ")} WHERE id = ? AND tenantId = ?`, ...vals
      );
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Erro ao atualizar setor." });
  }
});

app.delete("/api/sectors/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  try {
    // Desvincula produtos deste setor antes de deletar
    await (prisma as any).$executeRawUnsafe(
      `UPDATE Product SET sectorId = NULL WHERE sectorId = ? AND tenantId = ?`,
      req.params.id, tenantId
    );
    await (prisma as any).$executeRawUnsafe(
      `DELETE FROM Sector WHERE id = ? AND tenantId = ?`, req.params.id, tenantId
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Erro ao excluir setor." });
  }
});

// ═════════════════════════════════════════════════════════════
//  UPLOAD DE IMAGENS (logo / capa)
// ═════════════════════════════════════════════════════════════
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.post("/api/admin/upload", (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

  const { data, mimeType } = req.body as { data?: string; mimeType?: string };
  if (!data || !mimeType) return res.status(400).json({ error: "data e mimeType são obrigatórios." });

  const base64 = data.includes(",") ? data.split(",")[1] : data;
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const filename = `${tenantId}-${randomUUID()}.${ext}`;
  const filepath = path.join(uploadsDir, filename);

  try {
    fs.writeFileSync(filepath, Buffer.from(base64, "base64"));
    res.json({ url: `/uploads/${filename}` });
  } catch (e: any) {
    console.error("[POST /api/admin/upload]", e?.message || e);
    res.status(500).json({ error: "Erro ao salvar imagem." });
  }
});

app.use("/uploads", express.static(uploadsDir));

// ═════════════════════════════════════════════════════════════
//  START SERVER
// ═════════════════════════════════════════════════════════════
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");

    // ⚠️ static DEPOIS das rotas dinâmicas para não interceptar /agendar/:slug
    // Serve apenas assets (js/css/img) — não HTML
    app.use(express.static(distPath, { index: false }));

    // Manifest dinâmico por slug — PWA separado do admin
    app.get("/agendar/:slug/manifest.json", async (req, res) => {
      const { slug } = req.params;
      try {
        const tenant = await (prisma as any).tenant.findFirst({
          where: { slug, isActive: true },
          select: { name: true, logoUrl: true, themeColor: true, description: true }
        });
        if (!tenant) return res.status(404).json({});
        const icon = tenant.logoUrl || "/favicon-celular.png";
        res.json({
          name: tenant.name,
          short_name: tenant.name.split(" ")[0],
          description: (tenant as any).description || `Agende seu horário no ${tenant.name}`,
          start_url: `/agendar/${slug}`,
          display: "standalone",
          background_color: "#ffffff",
          theme_color: tenant.themeColor || "#c9a96e",
          icons: [
            { src: icon, sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" }
          ]
        });
      } catch {
        res.status(500).json({});
      }
    });

    // SEO + manifest dinâmico para páginas de agendamento público
    app.get(["/agendar/:slug", "/:slug"], async (req, res, next) => {
      const { slug } = req.params;
      // Ignora rotas internas
      if (["login", "admin", "pro", "super-admin"].some(r => slug.startsWith(r))) return next();
      try {
        const tenant = await (prisma as any).tenant.findFirst({
          where: { slug, isActive: true },
          select: { name: true, logoUrl: true, themeColor: true, description: true, address: true, instagram: true }
        });
        if (!tenant) return next();
        const distIndex = path.join(distPath, "index.html");
        let html = fs.readFileSync(distIndex, "utf-8");
        const title = `${tenant.name} — Agende seu horário`;
        const desc = (tenant as any).description || `Agende seu horário no ${tenant.name}. Rápido, fácil e online.`;
        const image = tenant.logoUrl || "";
        html = html
          .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
          .replace("</head>", `
  <meta name="description" content="${desc}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />
  <link rel="manifest" href="/agendar/${slug}/manifest.json" />
</head>`);
        res.send(html);
      } catch {
        next();
      }
    });

    // SPA fallback — todas as outras rotas servem o index.html
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

  } else {
    // Dev: Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em ${process.env.NODE_ENV === "production" ? "produção" : "desenvolvimento"}: http://localhost:${PORT}`);
  });
}

startServer();