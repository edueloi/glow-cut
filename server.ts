import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { addMinutes, format, parse, startOfDay, isSameDay, addDays } from "date-fns";

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- API Routes ---

// Seed initial data if empty
async function seed() {
  const profCount = await prisma.professional.count();
  if (profCount === 0) {
    const p1 = await prisma.professional.create({ data: { name: "Eduardo Eloi", role: "Barbeiro Master" } });
    const p2 = await prisma.professional.create({ data: { name: "Ana Lucia", role: "Manicure & Nail Art" } });
    
    for (const p of [p1, p2]) {
      for (let i = 0; i < 7; i++) {
        await prisma.workingHours.create({
          data: {
            dayOfWeek: i,
            isOpen: i !== 0,
            startTime: "09:00",
            endTime: "19:00",
            breakStart: "12:00",
            breakEnd: "13:00",
            professionalId: p.id
          },
        });
      }
    }
  }

  const servicesCount = await prisma.service.count();
  if (servicesCount === 0) {
    await prisma.service.createMany({
      data: [
        { name: "Corte de Cabelo", price: 45, duration: 30, type: "service" },
        { name: "Barba", price: 30, duration: 30, type: "service" },
        { name: "Combo Cabelo + Barba", price: 70, duration: 60, type: "package" },
        { name: "Manicure", price: 35, duration: 45, type: "service" },
        { name: "Pedicure", price: 40, duration: 45, type: "service" },
        { name: "Nail Art Especial", price: 60, duration: 90, type: "service" },
      ],
    });
  }
}
seed();

// Clients
app.get("/api/clients", async (req, res) => {
  const clients = await prisma.client.findMany({
    include: { appointments: true, comandas: true },
    orderBy: { name: 'asc' }
  });
  res.json(clients);
});

app.get("/api/clients/search", async (req, res) => {
  const { phone, name } = req.query;
  if (phone) {
    const client = await prisma.client.findUnique({ 
      where: { phone: String(phone) },
      include: { comandas: { where: { status: "open" } } }
    });
    return res.json(client);
  }
  if (name) {
    const searchTerm = String(name).toLowerCase();
    const allClients = await prisma.client.findMany({
      include: { comandas: { where: { status: "open" } } }
    });
    const clients = allClients.filter(c => c.name.toLowerCase().includes(searchTerm));
    return res.json(clients);
  }
  res.status(400).json({ error: "Phone or name required" });
});

app.post("/api/clients", async (req, res) => {
  const { name, phone, age } = req.body;
  try {
    const client = await prisma.client.upsert({
      where: { phone },
      update: { name, age: parseInt(age || "0") },
      create: { name, phone, age: parseInt(age || "0") },
    });
    res.json(client);
  } catch (e) {
    res.status(400).json({ error: "Error saving client" });
  }
});

// Comandas
app.get("/api/comandas", async (req, res) => {
  const comandas = await prisma.comanda.findMany({
    include: { client: true, appointments: { include: { service: true } } }
  });
  res.json(comandas);
});

app.post("/api/comandas", async (req, res) => {
  const { clientId, discount, discountType, total } = req.body;
  const comanda = await prisma.comanda.create({
    data: { clientId, discount: parseFloat(discount || 0), discountType, total: parseFloat(total) }
  });
  res.json(comanda);
});

// Professionals
app.get("/api/professionals", async (req, res) => {
  const profs = await prisma.professional.findMany({ select: { id: true, name: true, role: true } });
  res.json(profs);
});

app.post("/api/professionals", async (req, res) => {
  const { name, role, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: "Nome e senha são obrigatórios." });
  try {
    const prof = await prisma.professional.create({
      data: { name, role, password },
      select: { id: true, name: true, role: true }
    });
    // Create default working hours for this professional
    for (let i = 0; i < 7; i++) {
      await prisma.workingHours.create({
        data: {
          dayOfWeek: i,
          isOpen: i !== 0,
          startTime: "09:00",
          endTime: "19:00",
          breakStart: "12:00",
          breakEnd: "13:00",
          professionalId: prof.id
        }
      });
    }
    res.json(prof);
  } catch (e) {
    res.status(400).json({ error: "Erro ao criar profissional." });
  }
});

// Professional login (must be before /:id routes)
app.post("/api/professionals/login", async (req, res) => {
  const { name, password } = req.body;
  const prof = await prisma.professional.findFirst({
    where: { name, password }
  });
  if (!prof) return res.status(401).json({ error: "Nome ou senha incorretos." });
  res.json({ id: prof.id, name: prof.name, role: prof.role });
});

app.put("/api/professionals/:id", async (req, res) => {
  const { name, role, password } = req.body;
  const data: any = { name, role };
  if (password) data.password = password;
  try {
    const prof = await prisma.professional.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, role: true }
    });
    res.json(prof);
  } catch (e) {
    res.status(400).json({ error: "Erro ao atualizar profissional." });
  }
});

app.delete("/api/professionals/:id", async (req, res) => {
  try {
    await prisma.workingHours.deleteMany({ where: { professionalId: req.params.id } });
    await prisma.professional.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Erro ao excluir profissional." });
  }
});

// Services & Packages
app.get("/api/services", async (req, res) => {
  const services = await prisma.service.findMany({
    include: { packageServices: { include: { service: true } } }
  });
  res.json(services);
});

app.post("/api/services", async (req, res) => {
  const { name, price, duration, type, discount, discountType, includedServices } = req.body;
  try {
    const service = await prisma.service.create({
      data: {
        name,
        price: parseFloat(price),
        duration: parseInt(duration),
        type,
        discount: parseFloat(discount || 0),
        discountType,
        packageServices: type === 'package' ? {
          create: includedServices.map((s: any) => ({
            serviceId: s.id,
            quantity: parseInt(s.quantity)
          }))
        } : undefined
      }
    });
    res.json(service);
  } catch (e) {
    res.status(400).json({ error: "Error creating service/package" });
  }
});

app.put("/api/services/:id", async (req, res) => {
  const { name, price, duration, discount, discountType, description } = req.body;
  try {
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        name,
        price: parseFloat(price),
        duration: parseInt(duration),
        discount: parseFloat(discount || 0),
        discountType,
        description
      }
    });
    res.json(service);
  } catch (e) {
    res.status(400).json({ error: "Error updating service" });
  }
});

app.delete("/api/services/:id", async (req, res) => {
  try {
    await prisma.packageService.deleteMany({ where: { OR: [{ packageId: req.params.id }, { serviceId: req.params.id }] } });
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Error deleting service" });
  }
});

// Comandas close/pay
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
    res.status(400).json({ error: "Error updating comanda" });
  }
});

// Appointments
app.get("/api/appointments", async (req, res) => {
  const { start, end, professionalId } = req.query;
  const where: any = {};
  if (start && end) {
    where.date = { gte: new Date(String(start)), lte: new Date(String(end)) };
  }
  if (professionalId) {
    where.professionalId = String(professionalId);
  }
  const appointments = await prisma.appointment.findMany({
    where,
    include: { client: true, service: true, professional: true, comanda: true }
  });
  res.json(appointments);
});

app.post("/api/appointments", async (req, res) => {
  const { date, startTime, clientId, serviceId, professionalId, recurrence, comandaId, sessionNumber, totalSessions, type } = req.body;
  const appointmentType = type || "atendimento";

  let endTime = startTime;
  if (serviceId) {
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ error: "Service not found" });
    const start = parse(startTime, "HH:mm", new Date());
    const end = addMinutes(start, service.duration);
    endTime = format(end, "HH:mm");
  } else {
    // Default 1 hour for bloqueio/pessoal
    const start = parse(startTime, "HH:mm", new Date());
    endTime = format(addMinutes(start, 60), "HH:mm");
  }

  // Conflict check
  const conflict = await prisma.appointment.findFirst({
    where: {
      professionalId,
      date: new Date(date),
      status: { not: "cancelled" },
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } }
      ]
    }
  });

  if (conflict) return res.status(400).json({ error: "Horário já ocupado para este profissional." });

  // Handle recurrence
  const appointmentsToCreate = [];
  let count = 1;
  if (recurrence && recurrence.type !== 'none') {
    count = recurrence.count || 1;
  }

  for (let i = 0; i < count; i++) {
    const currentDate = addDays(new Date(date), i * (recurrence?.interval || 7));
    const entry: any = {
      date: currentDate,
      startTime,
      endTime,
      professionalId,
      type: appointmentType,
      sessionNumber: i + 1,
      totalSessions: count
    };
    if (clientId) entry.clientId = clientId;
    if (serviceId) entry.serviceId = serviceId;
    if (comandaId) entry.comandaId = comandaId;
    appointmentsToCreate.push(entry);
  }

  const result = await prisma.appointment.createMany({ data: appointmentsToCreate });
  res.json(result);
});

app.get("/api/appointments/client", async (req, res) => {
  const { phone } = req.query;
  const client = await prisma.client.findUnique({
    where: { phone: String(phone) },
    include: { appointments: { include: { service: true }, orderBy: { date: 'asc' } } }
  });
  res.json(client?.appointments || []);
});

// Availability
app.get("/api/availability", async (req, res) => {
  const { date, serviceId, professionalId } = req.query;
  if (!date || !serviceId || !professionalId) return res.status(400).json({ error: "Date, serviceId and professionalId required" });

  const targetDate = startOfDay(new Date(String(date)));
  const dayOfWeek = targetDate.getDay();

  const workingHours = await prisma.workingHours.findFirst({ 
    where: { dayOfWeek, professionalId: String(professionalId) } 
  });
  const isClosed = await prisma.closedDay.findUnique({ 
    where: { date: targetDate } 
  });

  if (!workingHours || !workingHours.isOpen || isClosed) {
    return res.json([]);
  }

  const service = await prisma.service.findUnique({ where: { id: String(serviceId) } });
  if (!service) return res.status(404).json({ error: "Service not found" });

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId: String(professionalId),
      date: {
        gte: targetDate,
        lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
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
    
    // Check if slot is within working hours and not during break
    const isDuringBreak = (current >= breakStart && current < breakEnd) || (slotEnd > breakStart && slotEnd <= breakEnd);
    
    if (!isDuringBreak && slotEnd <= end) {
      const isOccupied = appointments.some(app => {
        const appStart = parse(app.startTime, "HH:mm", targetDate);
        const appEnd = parse(app.endTime, "HH:mm", targetDate);
        return (current < appEnd && slotEnd > appStart);
      });

      if (!isOccupied) {
        slots.push(timeStr);
      }
    }
    current = addMinutes(current, 30); // 30 min steps as requested
  }

  res.json(slots);
});

// Admin Settings
app.get("/api/settings/working-hours", async (req, res) => {
  const wh = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
  res.json(wh);
});

app.put("/api/settings/working-hours", async (req, res) => {
  const { hours } = req.body;
  for (const h of hours) {
    await prisma.workingHours.update({
      where: { id: h.id },
      data: {
        isOpen: h.isOpen,
        startTime: h.startTime,
        endTime: h.endTime,
        breakStart: h.breakStart,
        breakEnd: h.breakEnd,
      }
    });
  }
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════
//  SUPER ADMIN ROUTES
// ═══════════════════════════════════════════════════════════

// Seed super admin on startup
async function seedSuperAdmin() {
  const count = await prisma.superAdmin.count();
  if (count === 0) {
    await prisma.superAdmin.create({ data: { username: "Admin", password: "super123" } });
    console.log("✅ Super admin criado: Admin / super123");
  }
  // Seed default plans
  const planCount = await prisma.plan.count();
  if (planCount === 0) {
    await prisma.plan.createMany({
      data: [
        { name: "Básico", price: 49.90, maxProfessionals: 2, maxAdminUsers: 1, canCreateAdminUsers: false, canDeleteAccount: false, features: JSON.stringify(["Agenda", "Clientes", "Serviços"]) },
        { name: "Pro", price: 99.90, maxProfessionals: 5, maxAdminUsers: 3, canCreateAdminUsers: true, canDeleteAccount: false, features: JSON.stringify(["Agenda", "Clientes", "Serviços", "Comandas", "Fluxo de Caixa", "Relatórios"]) },
        { name: "Enterprise", price: 199.90, maxProfessionals: 999, maxAdminUsers: 999, canCreateAdminUsers: true, canDeleteAccount: true, features: JSON.stringify(["Tudo do Pro", "Multi-usuários ilimitados", "Profissionais ilimitados", "Suporte prioritário"]) },
      ]
    });
    console.log("✅ Planos padrão criados");
  }
}
seedSuperAdmin();

// Super Admin login
app.post("/api/super-admin/login", async (req, res) => {
  const { username, password } = req.body;
  const sa = await prisma.superAdmin.findFirst({ where: { username, password } });
  if (!sa) return res.status(401).json({ error: "Credenciais inválidas." });
  res.json({ id: sa.id, username: sa.username, role: "superadmin" });
});

// Admin User login
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.adminUser.findFirst({
    where: { email, password, isActive: true },
    include: { tenant: { include: { plan: true } } }
  });
  if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos." });
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    jobTitle: user.jobTitle,
    tenantId: user.tenantId,
    tenantName: user.tenant.name,
    planName: user.tenant.plan.name,
    canCreateUsers: user.canCreateUsers,
    canDeleteAccount: user.canDeleteAccount,
  });
});

// ── Plans ────────────────────────────────────────────────────
app.get("/api/super-admin/plans", async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { price: "asc" } });
  res.json(plans);
});

app.post("/api/super-admin/plans", async (req, res) => {
  const { name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features } = req.body;
  try {
    const plan = await prisma.plan.create({
      data: { name, price: parseFloat(price), maxProfessionals: parseInt(maxProfessionals), maxAdminUsers: parseInt(maxAdminUsers), canCreateAdminUsers: !!canCreateAdminUsers, canDeleteAccount: !!canDeleteAccount, features: JSON.stringify(features || []) }
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

// ── Tenants (Parceiros) ──────────────────────────────────────
app.get("/api/super-admin/tenants", async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: { plan: true, adminUsers: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(tenants);
});

app.post("/api/super-admin/tenants", async (req, res) => {
  const { name, slug, ownerName, ownerEmail, ownerPhone, planId, notes, adminPassword } = req.body;
  if (!name || !slug || !ownerName || !ownerEmail || !planId || !adminPassword) {
    return res.status(400).json({ error: "Campos obrigatórios faltando." });
  }
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name, slug, ownerName, ownerEmail, ownerPhone, planId, notes,
        adminUsers: {
          create: {
            name: ownerName,
            email: ownerEmail,
            password: adminPassword,
            role: "admin",
            jobTitle: "Proprietário",
            canCreateUsers: true,
            canDeleteAccount: false,
          }
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

// ── Admin Users ──────────────────────────────────────────────
app.get("/api/super-admin/admin-users", async (_req, res) => {
  const users = await prisma.adminUser.findMany({
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: "desc" }
  });
  res.json(users);
});

app.post("/api/super-admin/admin-users", async (req, res) => {
  const { name, email, password, role, jobTitle, bio, phone, canCreateUsers, canDeleteAccount, tenantId } = req.body;
  if (!name || !email || !password || !tenantId) return res.status(400).json({ error: "Campos obrigatórios faltando." });
  try {
    const user = await prisma.adminUser.create({
      data: { name, email, password, role: role || "admin", jobTitle, bio, phone, canCreateUsers: !!canCreateUsers, canDeleteAccount: !!canDeleteAccount, tenantId },
      include: { tenant: { select: { name: true } } }
    });
    res.json(user);
  } catch (e: any) {
    if (e.code === "P2002") return res.status(400).json({ error: "E-mail já em uso." });
    res.status(400).json({ error: "Erro ao criar usuário." });
  }
});

app.put("/api/super-admin/admin-users/:id", async (req, res) => {
  const { name, email, password, role, jobTitle, bio, phone, canCreateUsers, canDeleteAccount, isActive } = req.body;
  const data: any = { name, email, role, jobTitle, bio, phone, canCreateUsers: !!canCreateUsers, canDeleteAccount: !!canDeleteAccount, isActive };
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

// Admin user updates own profile
app.put("/api/admin/profile/:id", async (req, res) => {
  const { name, jobTitle, bio, phone, password } = req.body;
  const data: any = { name, jobTitle, bio, phone };
  if (password) data.password = password;
  try {
    const user = await prisma.adminUser.update({ where: { id: req.params.id }, data });
    res.json(user);
  } catch (e) { res.status(400).json({ error: "Erro ao salvar perfil." }); }
});

// ── Stats for super admin dashboard ─────────────────────────
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

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
