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
      planName: adminUser.tenant.plan.name,
      canCreateUsers: adminUser.canCreateUsers,
      canDeleteAccount: adminUser.canDeleteAccount,
      permissions: adminUser.permissions,
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
    select: { id: true, name: true, role: true }
  });
  res.json(profs);
});

app.post("/api/professionals", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, role, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: "Nome e senha são obrigatórios." });
  try {
    const prof = await prisma.professional.create({
      data: { id: randomUUID(), name, role, password, tenantId },
      select: { id: true, name: true, role: true }
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
  const { name, password } = req.body;
  // Profissional pode logar por nome+senha — encontra o registro dele
  const prof = await prisma.professional.findFirst({ where: { name, password } });
  if (!prof) return res.status(401).json({ error: "Nome ou senha incorretos." });
  res.json({ id: prof.id, name: prof.name, role: prof.role, tenantId: prof.tenantId });
});

app.put("/api/professionals/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { name, role, password } = req.body;
  const data: any = { name, role };
  if (password) data.password = password;
  try {
    const prof = await prisma.professional.updateMany({
      where: { id: req.params.id, tenantId: tenantId || undefined },
      data
    });
    res.json(prof);
  } catch (e) {
    res.status(400).json({ error: "Erro ao atualizar profissional." });
  }
});

app.delete("/api/professionals/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    // Verifica se pertence ao tenant
    const prof = await prisma.professional.findFirst({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    if (!prof) return res.status(404).json({ error: "Profissional não encontrado." });
    await prisma.workingHours.deleteMany({ where: { professionalId: req.params.id } });
    await prisma.professional.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Erro ao excluir profissional." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SERVICES — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/services", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const services = await prisma.service.findMany({
    where: { tenantId },
    include: { packageServices: { include: { service: true } } }
  });
  res.json(services);
});

app.post("/api/services", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { name, price, duration, type, discount, discountType, description, includedServices } = req.body;
  try {
    const service = await prisma.service.create({
      data: { id: randomUUID(),
        name, tenantId,
        price: parseFloat(price),
        duration: parseInt(duration),
        type, description,
        discount: parseFloat(discount || 0),
        discountType,
        packageServices: type === "package" && includedServices?.length ? {
          create: includedServices.map((s: any) => ({ serviceId: s.id, quantity: parseInt(s.quantity) }))
        } : undefined
      }
    });
    res.json(service);
  } catch (e) {
    res.status(400).json({ error: "Erro ao criar serviço." });
  }
});

app.put("/api/services/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { name, price, duration, discount, discountType, description } = req.body;
  try {
    // Verifica ownership
    const svc = await prisma.service.findFirst({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    if (!svc) return res.status(404).json({ error: "Serviço não encontrado." });
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: { name, price: parseFloat(price), duration: parseInt(duration), discount: parseFloat(discount || 0), discountType, description }
    });
    res.json(service);
  } catch (e) {
    res.status(400).json({ error: "Erro ao atualizar serviço." });
  }
});

app.delete("/api/services/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    const svc = await prisma.service.findFirst({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    if (!svc) return res.status(404).json({ error: "Serviço não encontrado." });
    await prisma.packageService.deleteMany({ where: { OR: [{ packageId: req.params.id }, { serviceId: req.params.id }] } });
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Erro ao excluir serviço." });
  }
});

// ═════════════════════════════════════════════════════════════
//  COMANDAS — isolado por tenant (via client.tenantId)
// ═════════════════════════════════════════════════════════════
app.get("/api/comandas", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const comandas = await prisma.comanda.findMany({
    where: { client: { tenantId } },
    include: { client: true, appointments: { include: { service: true } } }
  });
  res.json(comandas);
});

app.post("/api/comandas", async (req, res) => {
  const { clientId, discount, discountType, total } = req.body;
  const comanda = await prisma.comanda.create({
    data: { id: randomUUID(), clientId, discount: parseFloat(discount || 0), discountType, total: parseFloat(total || 0) }
  });
  res.json(comanda);
});

app.put("/api/comandas/:id", async (req, res) => {
  const { status, discount, discountType, total } = req.body;
  try {
    const comanda = await prisma.comanda.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(discount !== undefined && { discount: parseFloat(discount) }),
        ...(discountType && { discountType }),
        ...(total !== undefined && { total: parseFloat(total) })
      },
      include: { client: true, appointments: { include: { service: true } } }
    });
    res.json(comanda);
  } catch (e) {
    res.status(400).json({ error: "Erro ao atualizar comanda." });
  }
});

// ═════════════════════════════════════════════════════════════
//  APPOINTMENTS — isolado por tenant (via professional.tenantId)
// ═════════════════════════════════════════════════════════════
app.get("/api/appointments", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { start, end, professionalId } = req.query;
  const where: any = { professional: { tenantId } };
  if (start && end) {
    where.date = { gte: new Date(String(start)), lte: new Date(String(end)) };
  }
  if (professionalId) where.professionalId = String(professionalId);
  const appointments = await prisma.appointment.findMany({
    where,
    include: { client: true, service: true, professional: true, comanda: true }
  });
  res.json(appointments);
});

app.post("/api/appointments", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { date, startTime, clientId, serviceId, professionalId, recurrence, comandaId, type } = req.body;
  const appointmentType = type || "atendimento";

  // Verifica que o profissional pertence ao tenant
  const prof = await prisma.professional.findFirst({ where: { id: professionalId, tenantId } });
  if (!prof) return res.status(403).json({ error: "Profissional não pertence a este tenant." });

  let endTime = startTime;
  if (serviceId) {
    const service = await prisma.service.findFirst({ where: { id: serviceId, tenantId } });
    if (!service) return res.status(404).json({ error: "Serviço não encontrado." });
    endTime = format(addMinutes(parse(startTime, "HH:mm", new Date()), service.duration), "HH:mm");
  } else {
    endTime = format(addMinutes(parse(startTime, "HH:mm", new Date()), 60), "HH:mm");
  }

  const conflict = await prisma.appointment.findFirst({
    where: {
      professionalId, date: new Date(date), status: { not: "cancelled" },
      OR: [{ startTime: { lte: startTime }, endTime: { gt: startTime } }, { startTime: { lt: endTime }, endTime: { gte: endTime } }]
    }
  });
  if (conflict) return res.status(400).json({ error: "Horário já ocupado para este profissional." });

  let count = 1;
  if (recurrence && recurrence.type !== "none") count = recurrence.count || 1;

  const appointmentsToCreate = [];
  for (let i = 0; i < count; i++) {
    const currentDate = addDays(new Date(date), i * (recurrence?.interval || 7));
    const entry: any = { id: randomUUID(), date: currentDate, startTime, endTime, professionalId, type: appointmentType, sessionNumber: i + 1, totalSessions: count };
    if (clientId) entry.clientId = clientId;
    if (serviceId) entry.serviceId = serviceId;
    if (comandaId) entry.comandaId = comandaId;
    appointmentsToCreate.push(entry);
  }

  const result = await prisma.appointment.createMany({ data: appointmentsToCreate });
  res.json(result);
});

app.put("/api/appointments/:id", async (req, res) => {
  const { status } = req.body;
  try {
    const appt = await prisma.appointment.update({ where: { id: req.params.id }, data: { status } });
    res.json(appt);
  } catch (e) {
    res.status(400).json({ error: "Erro ao atualizar agendamento." });
  }
});

app.delete("/api/appointments/:id", async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Erro ao excluir agendamento." });
  }
});

app.get("/api/appointments/client", async (req, res) => {
  const tenantId = getTenantId(req);
  const { phone } = req.query;
  const client = await prisma.client.findFirst({
    where: { phone: String(phone), tenantId: tenantId || undefined },
    include: { appointments: { include: { service: true }, orderBy: { date: "asc" } } }
  });
  res.json(client?.appointments || []);
});

// ═════════════════════════════════════════════════════════════
//  AVAILABILITY — isolado por tenant
// ═════════════════════════════════════════════════════════════
app.get("/api/availability", async (req, res) => {
  const tenantId = getTenantId(req);
  const { date, serviceId, professionalId } = req.query;
  if (!date || !serviceId || !professionalId) return res.status(400).json({ error: "date, serviceId e professionalId obrigatórios." });

  const targetDate = startOfDay(new Date(String(date)));
  const dayOfWeek = targetDate.getDay();

  // Valida que profissional pertence ao tenant (se tenantId fornecido)
  if (tenantId) {
    const prof = await prisma.professional.findFirst({ where: { id: String(professionalId), tenantId } });
    if (!prof) return res.json([]);
  }

  const workingHours = await prisma.workingHours.findFirst({ where: { dayOfWeek, professionalId: String(professionalId) } });
  const isClosed = await prisma.closedDay.findFirst({ where: { date: targetDate, tenantId: tenantId || undefined } });
  if (!workingHours || !workingHours.isOpen || isClosed) return res.json([]);

  const service = await prisma.service.findFirst({ where: { id: String(serviceId), tenantId: tenantId || undefined } });
  if (!service) return res.status(404).json({ error: "Serviço não encontrado." });

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId: String(professionalId),
      date: { gte: targetDate, lt: new Date(targetDate.getTime() + 86400000) },
      status: { not: "cancelled" }
    }
  });

  const slots = [];
  let current = parse(workingHours.startTime, "HH:mm", targetDate);
  const end = parse(workingHours.endTime, "HH:mm", targetDate);
  const breakStart = parse(workingHours.breakStart, "HH:mm", targetDate);
  const breakEnd = parse(workingHours.breakEnd, "HH:mm", targetDate);

  while (current < end) {
    const timeStr = format(current, "HH:mm");
    const slotEnd = addMinutes(current, service.duration);
    const isDuringBreak = (current >= breakStart && current < breakEnd) || (slotEnd > breakStart && slotEnd <= breakEnd);
    if (!isDuringBreak && slotEnd <= end) {
      const isOccupied = appointments.some(app => {
        const appStart = parse(app.startTime, "HH:mm", targetDate);
        const appEnd = parse(app.endTime, "HH:mm", targetDate);
        return current < appEnd && slotEnd > appStart;
      });
      if (!isOccupied) slots.push(timeStr);
    }
    current = addMinutes(current, 30);
  }
  res.json(slots);
});

// ═════════════════════════════════════════════════════════════
//  SETTINGS — isolado por tenant (working hours do profissional)
// ═════════════════════════════════════════════════════════════
app.get("/api/settings/working-hours", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const wh = await prisma.workingHours.findMany({
    where: { professional: { tenantId } },
    orderBy: { dayOfWeek: "asc" }
  });
  res.json(wh);
});

app.put("/api/settings/working-hours", async (req, res) => {
  const { hours } = req.body;
  for (const h of hours) {
    await prisma.workingHours.update({
      where: { id: h.id },
      data: { isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime, breakStart: h.breakStart, breakEnd: h.breakEnd }
    });
  }
  res.json({ success: true });
});

// Closed days — isolado por tenant
app.get("/api/settings/closed-days", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const days = await prisma.closedDay.findMany({ where: { tenantId } });
  res.json(days);
});

app.post("/api/settings/closed-days", async (req, res) => {
  const tenantId = getTenantId(req);
  if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
  const { date, description } = req.body;
  try {
    const day = await prisma.closedDay.create({ data: { id: randomUUID(), date: new Date(date), description, tenantId } });
    res.json(day);
  } catch (e) {
    res.status(400).json({ error: "Erro ao criar feriado." });
  }
});

app.delete("/api/settings/closed-days/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  try {
    await prisma.closedDay.deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Erro ao excluir feriado." });
  }
});

// ═════════════════════════════════════════════════════════════
//  SUPER ADMIN — planos, tenants, admin users, stats
// ═════════════════════════════════════════════════════════════
app.get("/api/super-admin/plans", async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
  res.json(plans);
});

app.post("/api/super-admin/plans", async (req, res) => {
  const { name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features } = req.body;
  try {
    const plan = await prisma.plan.create({
      data: { id: randomUUID(), name, price: parseFloat(price), maxProfessionals: parseInt(maxProfessionals), maxAdminUsers: parseInt(maxAdminUsers), canCreateAdminUsers: !!canCreateAdminUsers, canDeleteAccount: !!canDeleteAccount, features: JSON.stringify(features || []) }
    });
    res.json(plan);
  } catch (e) { res.status(400).json({ error: "Erro ao criar plano." }); }
});

app.put("/api/super-admin/plans/:id", async (req, res) => {
  const { name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features, isActive } = req.body;
  try {
    const plan = await prisma.plan.update({
      where: { id: req.params.id },
      data: { name, price: parseFloat(price), maxProfessionals: parseInt(maxProfessionals), maxAdminUsers: parseInt(maxAdminUsers), canCreateAdminUsers: !!canCreateAdminUsers, canDeleteAccount: !!canDeleteAccount, features: JSON.stringify(features || []), isActive: isActive !== undefined ? isActive : true }
    });
    res.json(plan);
  } catch (e) { res.status(400).json({ error: "Erro ao atualizar plano." }); }
});

app.delete("/api/super-admin/plans/:id", async (req, res) => {
  try {
    await prisma.plan.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: "Erro ao excluir plano." }); }
});

app.get("/api/super-admin/tenants", async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: { plan: true, adminUsers: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(tenants);
});

app.post("/api/super-admin/tenants", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, adminPassword } = req.body;
  if (!name || !slug || !ownerName || !ownerEmail || !planId || !adminPassword)
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  try {
    const tenant = await prisma.tenant.create({
      data: { id: randomUUID(),
        name, slug, ownerName, ownerEmail, ownerPhone, planId, notes,
        adminUsers: {
          create: { id: randomUUID(), name: ownerName, email: ownerEmail, password: adminPassword, role: "admin", jobTitle: "Proprietário", canCreateUsers: true, canDeleteAccount: false }
        }
      },
      include: { plan: true, adminUsers: true }
    });
    res.json(tenant);
  } catch (e: any) {
    if (e.code === "P2002") return res.status(400).json({ error: "Slug ou e-mail já em uso." });
    res.status(400).json({ error: "Erro ao criar parceiro." });
  }
});

app.put("/api/super-admin/tenants/:id", async (req, res) => {
  const { name, ownerName, ownerEmail, ownerPhone, planId, notes, isActive } = req.body;
  try {
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { name, ownerName, ownerEmail, ownerPhone, planId, notes, isActive },
      include: { plan: true }
    });
    res.json(tenant);
  } catch (e) { res.status(400).json({ error: "Erro ao atualizar parceiro." }); }
});

app.delete("/api/super-admin/tenants/:id", async (req, res) => {
  try {
    await prisma.adminUser.deleteMany({ where: { tenantId: req.params.id } });
    await prisma.tenant.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: "Erro ao excluir parceiro." }); }
});

app.get("/api/super-admin/admin-users", async (_req, res) => {
  const users = await prisma.adminUser.findMany({
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(users);
});

app.post("/api/super-admin/admin-users", async (req, res) => {
  const { name, email, password, role, jobTitle, bio, phone, canCreateUsers, canDeleteAccount, tenantId, permissions } = req.body;
  if (!name || !email || !password || !tenantId) return res.status(400).json({ error: "Campos obrigatórios faltando." });
  try {
    const user = await prisma.adminUser.create({
      data: { id: randomUUID(), name, email, password, role: role || "manager", jobTitle, bio, phone, canCreateUsers: !!canCreateUsers, canDeleteAccount: !!canDeleteAccount, tenantId, permissions },
      include: { tenant: { select: { name: true } } }
    });
    res.json(user);
  } catch (e: any) {
    if (e.code === "P2002") return res.status(400).json({ error: "E-mail já em uso." });
    res.status(400).json({ error: "Erro ao criar usuário." });
  }
});

app.put("/api/super-admin/admin-users/:id", async (req, res) => {
  const { name, email, password, role, jobTitle, bio, phone, canCreateUsers, canDeleteAccount, isActive, permissions } = req.body;
  const data: any = { name, email, role, jobTitle, bio, phone, canCreateUsers: !!canCreateUsers, canDeleteAccount: !!canDeleteAccount, isActive, permissions };
  if (password) data.password = password;
  try {
    const user = await prisma.adminUser.update({ where: { id: req.params.id }, data, include: { tenant: { select: { name: true } } } });
    res.json(user);
  } catch (e) { res.status(400).json({ error: "Erro ao atualizar usuário." }); }
});

app.delete("/api/super-admin/admin-users/:id", async (req, res) => {
  try {
    await prisma.adminUser.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: "Erro ao excluir usuário." }); }
});

app.put("/api/admin/profile/:id", async (req, res) => {
  const { name, jobTitle, bio, phone, password } = req.body;
  const data: any = { name, jobTitle, bio, phone };
  if (password) data.password = password;
  try {
    const user = await prisma.adminUser.update({ where: { id: req.params.id }, data });
    res.json(user);
  } catch (e) { res.status(400).json({ error: "Erro ao salvar perfil." }); }
});

app.get("/api/super-admin/stats", async (_req, res) => {
  const [totalTenants, activeTenants, totalAdmins, activeAdmins, plans] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.adminUser.count(),
    prisma.adminUser.count({ where: { isActive: true } }),
    prisma.plan.findMany({ include: { _count: { select: { tenants: true } } } }),
  ]);
  res.json({ totalTenants, activeTenants, totalAdmins, activeAdmins, plans });
});

// ═════════════════════════════════════════════════════════════
//  VITE / STATIC
// ═════════════════════════════════════════════════════════════
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
