import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";
import { deleteLocalFile } from "./adminController";

const DAY_LABELS = [
  { dayOfWeek: 1, day: "segunda-feira" },
  { dayOfWeek: 2, day: "terca-feira" },
  { dayOfWeek: 3, day: "quarta-feira" },
  { dayOfWeek: 4, day: "quinta-feira" },
  { dayOfWeek: 5, day: "sexta-feira" },
  { dayOfWeek: 6, day: "sabado" },
  { dayOfWeek: 0, day: "domingo" },
];

const DAY_MAP: Record<string, number> = DAY_LABELS.reduce((acc, item) => {
  acc[item.day] = item.dayOfWeek;
  return acc;
}, {} as Record<string, number>);

function parsePermissions(value: any) {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value || {});
}

function asString(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return text ? text : null;
}

function asBoolean(value: unknown, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["true", "1", "on", "yes"].includes(String(value).toLowerCase());
}

function defaultWorkingHours() {
  return DAY_LABELS.map(({ dayOfWeek, day }) => ({
    dayOfWeek,
    day,
    active: dayOfWeek !== 0,
    start: "09:00",
    end: "19:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    breakStart: "",
    breakEnd: "",
  }));
}

function normalizeWorkingHours(hours: any[] | undefined | null) {
  if (!Array.isArray(hours) || hours.length === 0) return defaultWorkingHours();

  return hours.map((hour, index) => {
    const key = String(hour?.day || "").toLowerCase().trim();
    const dayOfWeek = DAY_MAP[key] ?? DAY_LABELS[index]?.dayOfWeek ?? index;

    return {
      dayOfWeek,
      day: DAY_LABELS.find((item) => item.dayOfWeek === dayOfWeek)?.day || hour?.day || `dia-${dayOfWeek}`,
      active: asBoolean(hour?.active, dayOfWeek !== 0),
      start: hour?.start || hour?.startTime || "09:00",
      end: hour?.end || hour?.endTime || "19:00",
      lunchStart: hour?.lunchStart || hour?.breakStart || "12:00",
      lunchEnd: hour?.lunchEnd || hour?.breakEnd || "13:00",
      breakStart: hour?.breakStart || "",
      breakEnd: hour?.breakEnd || "",
    };
  });
}

function mapProfessional(professional: any, serviceIds: string[] = []) {
  if (!professional) return professional;

  const workingHoursByDay = new Map<number, any>(
    (professional.workinghours || []).map((hour: any) => [Number(hour.dayOfWeek), hour] as [number, any])
  );

  const workingHours = DAY_LABELS.map(({ dayOfWeek, day }) => {
    const hour = workingHoursByDay.get(dayOfWeek);
    return {
      day,
      active: hour ? Boolean(hour.isOpen) : dayOfWeek !== 0,
      start: hour?.startTime || "09:00",
      end: hour?.endTime || "19:00",
      lunchStart: hour?.breakStart || "",
      lunchEnd: hour?.breakEnd || "",
      breakStart: "",
      breakEnd: "",
    };
  });

  return {
    ...professional,
    services: serviceIds,
    workingHours,
    workinghours: undefined,
  };
}

async function findAssignedServiceIds(tenantId: string, professionalId: string) {
  const services = await (prisma as any).service.findMany({
    where: { tenantId },
    select: { id: true, professionalIds: true },
  });

  return services
    .filter((service: any) => {
      try {
        return JSON.parse(service.professionalIds || "[]").includes(professionalId);
      } catch {
        return false;
      }
    })
    .map((service: any) => service.id);
}

async function syncProfessionalServices(tenantId: string, professionalId: string, selectedServiceIds: string[] | undefined) {
  if (!Array.isArray(selectedServiceIds)) return;

  const selectedIds = new Set(selectedServiceIds);
  const services = await (prisma as any).service.findMany({
    where: { tenantId },
    select: { id: true, professionalIds: true },
  });

  for (const service of services) {
    let currentIds: string[] = [];
    try {
      currentIds = JSON.parse(service.professionalIds || "[]");
    } catch {}

    const nextIds = currentIds.filter((id) => id !== professionalId);
    if (selectedIds.has(service.id)) nextIds.push(professionalId);

    const deduped = Array.from(new Set(nextIds));
    if (JSON.stringify(deduped) === JSON.stringify(currentIds)) continue;

    await (prisma as any).service.update({
      where: { id: service.id },
      data: { professionalIds: JSON.stringify(deduped) },
    });
  }
}

async function replaceWorkingHours(professionalId: string, hours: any[] | undefined) {
  const normalized = normalizeWorkingHours(hours);
  await (prisma as any).workingHours.deleteMany({ where: { professionalId } });

  for (const hour of normalized) {
    await (prisma as any).workingHours.create({
      data: {
        id: randomUUID(),
        dayOfWeek: hour.dayOfWeek,
        isOpen: hour.active,
        startTime: hour.start,
        endTime: hour.end,
        breakStart: hour.lunchStart || hour.breakStart || "12:00",
        breakEnd: hour.lunchEnd || hour.breakEnd || "13:00",
        professionalId,
      },
    });
  }
}

export const professionalController = {
  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const professionals = await (prisma as any).professional.findMany({
        where: { tenantId },
        include: {
          workinghours: { orderBy: { dayOfWeek: "asc" } },
        },
        orderBy: { name: "asc" },
      });

      const services = await (prisma as any).service.findMany({
        where: { tenantId },
        select: { id: true, professionalIds: true },
      });

      const mapped = professionals.map((professional: any) => {
        const serviceIds = services
          .filter((service: any) => {
            try {
              return JSON.parse(service.professionalIds || "[]").includes(professional.id);
            } catch {
              return false;
            }
          })
          .map((service: any) => service.id);

        return mapProfessional(professional, serviceIds);
      });

      res.json(mapped);
    } catch {
      res.status(500).json({ error: "Erro ao buscar profissionais." });
    }
  },

  async publicList(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const professionals = await (prisma as any).professional.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, role: true, photo: true, isActive: true, phone: true },
        orderBy: { name: "asc" },
      });
      res.json(professionals);
    } catch {
      res.status(500).json({ error: "Erro ao buscar profissionais." });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const {
      name,
      nickname,
      role,
      password,
      cpf,
      gender,
      birthDate,
      phone,
      email,
      instagram,
      bio,
      photo,
      permissions,
      accessLevel,
      patAccess,
      canAddServicePhotos,
      workingHours,
      services,
    } = req.body;

    // Dono do sistema (accessLevel full) pode ser criado sem senha própria — faz login pelo admin
    if (!name || (!password && accessLevel !== "full")) return res.status(400).json({ error: "Nome e senha são obrigatórios." });

    try {
      const professional = await (prisma as any).professional.create({
        data: {
          id: randomUUID(),
          tenantId,
          name,
          nickname: asString(nickname),
          role: asString(role),
          password,
          cpf: asString(cpf),
          gender: asString(gender),
          birthDate: asString(birthDate),
          phone: asString(phone),
          email: asString(email),
          instagram: asString(instagram),
          bio: asString(bio),
          photo: asString(photo),
          permissions: parsePermissions(permissions) ?? "{}",
          accessLevel: asString(accessLevel) || "no-access",
          patAccess: asBoolean(patAccess),
          canAddServicePhotos: asBoolean(canAddServicePhotos),
          isActive: true,
          isOwner: asBoolean(req.body.isOwner),
          attendsSchedule: req.body.attendsSchedule !== undefined ? asBoolean(req.body.attendsSchedule, true) : true,
        },
        include: {
          workinghours: true,
        },
      });

      await replaceWorkingHours(professional.id, workingHours);
      await syncProfessionalServices(tenantId, professional.id, services);

      const fresh = await (prisma as any).professional.findUnique({
        where: { id: professional.id },
        include: { workinghours: { orderBy: { dayOfWeek: "asc" } } },
      });

      const assignedServiceIds = await findAssignedServiceIds(tenantId, professional.id);
      res.json(mapProfessional(fresh, assignedServiceIds));
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao criar profissional." });
    }
  },

  async login(req: Request, res: Response) {
    const { name, email, password } = req.body;
    const identifier = email || name;
    const professional = await (prisma as any).professional.findFirst({
      where: {
        OR: [
          { email: identifier, password, isActive: true },
          { name: identifier, password, isActive: true },
        ],
      },
    });

    if (!professional) {
      return res.status(401).json({ error: "Nome/e-mail ou senha incorretos." });
    }

    res.json({
      id: professional.id,
      name: professional.name,
      role: professional.role,
      tenantId: professional.tenantId,
      permissions: professional.permissions,
    });
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const {
      name,
      nickname,
      role,
      password,
      cpf,
      gender,
      birthDate,
      phone,
      email,
      instagram,
      bio,
      photo,
      permissions,
      accessLevel,
      patAccess,
      canAddServicePhotos,
      isActive,
      workingHours,
      services,
    } = req.body;

    try {
      const current = await (prisma as any).professional.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!current) return res.status(404).json({ error: "Profissional não encontrado." });

      // Remove foto antiga do disco ao trocar
      if (photo !== undefined && current.photo && current.photo !== photo) deleteLocalFile(current.photo);

      const data: any = {
        ...(name !== undefined && { name }),
        ...(nickname !== undefined && { nickname: asString(nickname) }),
        ...(role !== undefined && { role: asString(role) }),
        ...(cpf !== undefined && { cpf: asString(cpf) }),
        ...(gender !== undefined && { gender: asString(gender) }),
        ...(birthDate !== undefined && { birthDate: asString(birthDate) }),
        ...(phone !== undefined && { phone: asString(phone) }),
        ...(email !== undefined && { email: asString(email) }),
        ...(instagram !== undefined && { instagram: asString(instagram) }),
        ...(bio !== undefined && { bio: asString(bio) }),
        ...(photo !== undefined && { photo: asString(photo) }),
        ...(permissions !== undefined && { permissions: parsePermissions(permissions) }),
        ...(accessLevel !== undefined && { accessLevel: asString(accessLevel) || "no-access" }),
        ...(patAccess !== undefined && { patAccess: asBoolean(patAccess) }),
        ...(canAddServicePhotos !== undefined && { canAddServicePhotos: asBoolean(canAddServicePhotos) }),
        ...(isActive !== undefined && { isActive: asBoolean(isActive, true) }),
        ...(req.body.attendsSchedule !== undefined && { attendsSchedule: asBoolean(req.body.attendsSchedule, true) }),
      };

      if (password) {
        if (req.body.currentPassword && current.password !== req.body.currentPassword) {
          return res.status(400).json({ error: "A senha atual está incorreta." });
        }
        data.password = password;
      }

      await (prisma as any).professional.update({
        where: { id: current.id },
        data,
      });

      if (workingHours !== undefined) {
        await replaceWorkingHours(current.id, workingHours);
      }

      if (services !== undefined) {
        await syncProfessionalServices(tenantId, current.id, services);
      }

      const fresh = await (prisma as any).professional.findUnique({
        where: { id: current.id },
        include: { workinghours: { orderBy: { dayOfWeek: "asc" } } },
      });
      const assignedServiceIds = await findAssignedServiceIds(tenantId, current.id);

      res.json(mapProfessional(fresh, assignedServiceIds));
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao atualizar profissional." });
    }
  },

  async delete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const professional = await (prisma as any).professional.findFirst({
        where: { id: req.params.id, tenantId },
      });
      if (!professional) return res.status(404).json({ error: "Profissional não encontrado." });
      if (professional.isOwner) return res.status(403).json({ error: "O profissional do proprietário não pode ser excluído." });

      // Verificar dependências críticas (Agendamentos)
      const apptCount = await (prisma as any).appointment.count({
        where: { professionalId: professional.id }
      });

      if (apptCount > 0) {
        return res.status(400).json({ 
          error: `Não é possível excluir este profissional pois ele possui ${apptCount} agendamento(s) vinculado(s). Recomenda-se apenas desativá-lo.` 
        });
      }

      // Limpar outras tabelas que não impedem o delete mas devem ser limpas
      await Promise.all([
        syncProfessionalServices(tenantId, professional.id, []),
        (prisma as any).workingHours.deleteMany({ where: { professionalId: professional.id } }),
        (prisma as any).scheduleRelease.deleteMany({ where: { professionalId: professional.id } }),
        (prisma as any).specialScheduleDay.deleteMany({ where: { professionalId: professional.id } }),
      ]);

      await (prisma as any).professional.delete({ where: { id: professional.id } });

      res.json({ success: true });
    } catch (e: any) {
      console.error("[Professional] Error deleting:", e);
      res.status(400).json({ error: "Erro ao excluir profissional. Verifique se existem vínculos pendentes." });
    }
  },
};
