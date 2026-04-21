import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { format, addDays, isSameDay, startOfDay, startOfMonth, endOfMonth, endOfWeek, startOfWeek, isSameMonth, isBefore, addMonths, subMonths, addMinutes, parse } from "date-fns";
import { getTenantId, asBool, asNumber, toDateOnly, getDayRange, formatDateOnly, getSaudacao, applyTemplateVars, samePhone, normalizePhone } from "../utils/helpers";
import { fireWppProfNewBooking, fireWppConfirmation as fireWppConfirmationCentral } from "./wppController";

const DEFAULT_AGENDA_SETTINGS = {
  onlineBookingEnabled: true,
  // PAT
  enablePatTerminal: false,
  patShowClientName: true,
  patShowService: true,
  patShowTime: true,
  patAutoAdvance: false,
  patAutoAdvanceMinutes: 5,
  // Self-service
  enableSelfService: true,
  selfServiceRequireLogin: false,
  selfServiceShowProfessional: true,
  selfServiceShowPrices: true,
  selfServiceWelcomeMessage: "",
  allowClientRecurrence: false,
  // Gerais
  enableClientAgendaView: true,
  enableAppointmentSearch: true,
  enableWhatsAppReminders: true,
  autoConfirmAppointments: false,
  allowClientCancellation: true,
  allowClientReschedule: false,
  blockNationalHolidays: false,
  slotIntervalMinutes: 30,
  minAdvanceMinutes: 30,
  maxAdvanceDays: 60,
  notes: "",
};


function roundUpDateToInterval(date: Date, intervalMinutes: number) {
  const rounded = new Date(date);
  rounded.setSeconds(0);
  rounded.setMilliseconds(0);
  const minutes = rounded.getMinutes();
  const remainder = minutes % intervalMinutes;
  if (remainder !== 0) {
    rounded.setMinutes(minutes + (intervalMinutes - remainder));
  }
  return rounded;
}

function hasSlotOverlap(slotStartStr: string, slotEndStr: string, appts: any[]) {
  return appts.some((a: any) =>
    (slotStartStr >= a.startTime && slotStartStr < a.endTime) ||
    (slotEndStr > a.startTime && slotEndStr <= a.endTime) ||
    (slotStartStr <= a.startTime && slotEndStr >= a.endTime)
  );
}

function buildSlotWindow({
  targetDate, startTime, endTime, duration, intervalMinutes, appointments, breakStart, breakEnd, minAllowedStart,
}: {
  targetDate: Date; startTime: string; endTime: string; duration: number; intervalMinutes: number; appointments: any[]; breakStart?: string | null; breakEnd?: string | null; minAllowedStart?: Date;
}) {
  const dateStr = format(targetDate, "yyyy-MM-dd");
  let current = parse(`${dateStr} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const end = parse(`${dateStr} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());
  const slots: string[] = [];

  if (minAllowedStart && current < minAllowedStart) {
    current = roundUpDateToInterval(new Date(minAllowedStart), intervalMinutes);
  }

  while (current < end) {
    const slotStartStr = format(current, "HH:mm");
    const slotEnd = addMinutes(current, duration);
    const slotEndStr = format(slotEnd, "HH:mm");
    const fitsInsideWindow = slotStartStr >= startTime && slotEndStr <= endTime && slotEnd <= end;
    const respectsBreak = !breakStart || !breakEnd || slotEndStr <= breakStart || slotStartStr >= breakEnd;

    if (fitsInsideWindow && respectsBreak && !hasSlotOverlap(slotStartStr, slotEndStr, appointments)) {
      slots.push(slotStartStr);
    }
    current = addMinutes(current, intervalMinutes);
  }

  return slots;
}

function getNationalHolidays(year: number) {
  const holidays = [
    `${year}-01-01`, `${year}-04-21`, `${year}-05-01`, `${year}-09-07`,
    `${year}-10-12`, `${year}-11-02`, `${year}-11-15`, `${year}-11-20`, `${year}-12-25`,
  ];
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100;
  const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month - 1, day, 12, 0, 0, 0);

  const movableDates = [addDays(easter, -47), addDays(easter, -2), addDays(easter, 60)];
  movableDates.forEach((date) => holidays.push(formatDateOnly(date)));
  return new Set(holidays);
}

function isNationalHoliday(date: Date) {
  return getNationalHolidays(date.getFullYear()).has(formatDateOnly(date));
}

function normalizeAgendaSettings(row: any, tenantId: string) {
  return {
    id: row?.id || "",
    tenantId,
    onlineBookingEnabled: asBool(row?.onlineBookingEnabled, DEFAULT_AGENDA_SETTINGS.onlineBookingEnabled),
    // PAT
    enablePatTerminal: asBool(row?.enablePatTerminal, DEFAULT_AGENDA_SETTINGS.enablePatTerminal),
    patShowClientName: asBool(row?.patShowClientName, DEFAULT_AGENDA_SETTINGS.patShowClientName),
    patShowService: asBool(row?.patShowService, DEFAULT_AGENDA_SETTINGS.patShowService),
    patShowTime: asBool(row?.patShowTime, DEFAULT_AGENDA_SETTINGS.patShowTime),
    patAutoAdvance: asBool(row?.patAutoAdvance, DEFAULT_AGENDA_SETTINGS.patAutoAdvance),
    patAutoAdvanceMinutes: Math.max(1, asNumber(row?.patAutoAdvanceMinutes, DEFAULT_AGENDA_SETTINGS.patAutoAdvanceMinutes)),
    // Self-service
    enableSelfService: asBool(row?.enableSelfService, DEFAULT_AGENDA_SETTINGS.enableSelfService),
    selfServiceRequireLogin: asBool(row?.selfServiceRequireLogin, DEFAULT_AGENDA_SETTINGS.selfServiceRequireLogin),
    selfServiceShowProfessional: asBool(row?.selfServiceShowProfessional, DEFAULT_AGENDA_SETTINGS.selfServiceShowProfessional),
    selfServiceShowPrices: asBool(row?.selfServiceShowPrices, DEFAULT_AGENDA_SETTINGS.selfServiceShowPrices),
    selfServiceWelcomeMessage: row?.selfServiceWelcomeMessage ?? DEFAULT_AGENDA_SETTINGS.selfServiceWelcomeMessage,
    // Gerais
    enableClientAgendaView: asBool(row?.enableClientAgendaView, DEFAULT_AGENDA_SETTINGS.enableClientAgendaView),
    enableAppointmentSearch: asBool(row?.enableAppointmentSearch, DEFAULT_AGENDA_SETTINGS.enableAppointmentSearch),
    enableWhatsAppReminders: asBool(row?.enableWhatsAppReminders, DEFAULT_AGENDA_SETTINGS.enableWhatsAppReminders),
    autoConfirmAppointments: asBool(row?.autoConfirmAppointments, DEFAULT_AGENDA_SETTINGS.autoConfirmAppointments),
    allowClientCancellation: asBool(row?.allowClientCancellation, DEFAULT_AGENDA_SETTINGS.allowClientCancellation),
    allowClientReschedule: asBool(row?.allowClientReschedule, DEFAULT_AGENDA_SETTINGS.allowClientReschedule),
    allowClientRecurrence: asBool(row?.allowClientRecurrence, DEFAULT_AGENDA_SETTINGS.allowClientRecurrence),
    blockNationalHolidays: asBool(row?.blockNationalHolidays, DEFAULT_AGENDA_SETTINGS.blockNationalHolidays),
    slotIntervalMinutes: Math.max(5, asNumber(row?.slotIntervalMinutes, DEFAULT_AGENDA_SETTINGS.slotIntervalMinutes)),
    minAdvanceMinutes: Math.max(0, asNumber(row?.minAdvanceMinutes, DEFAULT_AGENDA_SETTINGS.minAdvanceMinutes)),
    maxAdvanceDays: Math.max(1, asNumber(row?.maxAdvanceDays, DEFAULT_AGENDA_SETTINGS.maxAdvanceDays)),
    notes: row?.notes || "",
  };
}

async function ensureAgendaSettingsRecord(tenantId: string) {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM AgendaSettings WHERE tenantId = ? LIMIT 1`, tenantId);
  if (rows.length > 0) return normalizeAgendaSettings(rows[0], tenantId);

  const id = randomUUID();
  const now = new Date();
  const D = DEFAULT_AGENDA_SETTINGS;
  await (prisma as any).$executeRawUnsafe(
    `INSERT INTO AgendaSettings (
      id, tenantId, onlineBookingEnabled,
      enablePatTerminal, patShowClientName, patShowService, patShowTime, patAutoAdvance, patAutoAdvanceMinutes,
      enableSelfService, selfServiceRequireLogin, selfServiceShowProfessional, selfServiceShowPrices, selfServiceWelcomeMessage, allowClientRecurrence,
      enableClientAgendaView, enableAppointmentSearch, enableWhatsAppReminders,
      autoConfirmAppointments, allowClientCancellation, allowClientReschedule,
      blockNationalHolidays, slotIntervalMinutes, minAdvanceMinutes, maxAdvanceDays, notes,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, tenantId,
    D.onlineBookingEnabled ? 1 : 0,
    D.enablePatTerminal ? 1 : 0, D.patShowClientName ? 1 : 0, D.patShowService ? 1 : 0, D.patShowTime ? 1 : 0, D.patAutoAdvance ? 1 : 0, D.patAutoAdvanceMinutes,
    D.enableSelfService ? 1 : 0, D.selfServiceRequireLogin ? 1 : 0, D.selfServiceShowProfessional ? 1 : 0, D.selfServiceShowPrices ? 1 : 0, D.selfServiceWelcomeMessage, D.allowClientRecurrence ? 1 : 0,
    D.enableClientAgendaView ? 1 : 0, D.enableAppointmentSearch ? 1 : 0, D.enableWhatsAppReminders ? 1 : 0,
    D.autoConfirmAppointments ? 1 : 0, D.allowClientCancellation ? 1 : 0, D.allowClientReschedule ? 1 : 0,
    D.blockNationalHolidays ? 1 : 0, D.slotIntervalMinutes, D.minAdvanceMinutes, D.maxAdvanceDays, D.notes,
    now, now
  );
  return normalizeAgendaSettings({ id, ...DEFAULT_AGENDA_SETTINGS }, tenantId);
}

function mapScheduleRelease(row: any) {
  if (!row) return null;
  return {
    ...row,
    date: format(row.date, "yyyy-MM-dd"),
    professionalName: row.professionalName || "Todos",
  };
}

function mapSpecialScheduleDay(row: any) {
  if (!row) return null;
  return {
    ...row,
    date: format(row.date, "yyyy-MM-dd"),
    isClosed: asBool(row.isClosed),
    professionalName: row.professionalName || "Todos",
  };
}


async function fireWppConfirmation(tenantId: string, appt: any) {
  return fireWppConfirmationCentral(tenantId, appt);
}

async function handleAppointmentStockReservation(serviceId: string | null, action: 'reserve' | 'release') {
  if (!serviceId) return;
  try {
    const prods = await (prisma as any).serviceProduct.findMany({ where: { serviceId } });
    for (const p of prods) {
      await (prisma as any).product.updateMany({
        where: { id: p.productId },
        data: { reservedStock: { [action === 'reserve' ? 'increment' : 'decrement']: p.quantity } }
      });
    }
  } catch (e: any) {
    console.error("[Stock Reservation Error]", e?.message);
  }
}

async function handleAppointmentDone(serviceId: string | null, tenantId: string | null, appointmentId: string) {
  if (!serviceId || !tenantId) return;
  try {
    const prods = await (prisma as any).serviceProduct.findMany({ where: { serviceId } });
    const svcNameRows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT name FROM Service WHERE id = ?`, serviceId);
    const svcName = svcNameRows[0]?.name || serviceId;
    for (const p of prods) {
      const prodRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT stock, reservedStock FROM Product WHERE id = ? AND tenantId = ?`, p.productId, tenantId
      );
      if (!prodRows.length) continue;
      const previousQty = prodRows[0].stock;
      const newQty = Math.max(0, previousQty - p.quantity);
      await (prisma as any).$executeRawUnsafe(
        `UPDATE Product SET stock = ?, reservedStock = GREATEST(0, reservedStock - ?) WHERE id = ? AND tenantId = ?`,
        newQty, p.quantity, p.productId, tenantId
      );
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO StockMovement (id, tenantId, productId, type, quantity, previousQty, newQty, reason, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(), tenantId, p.productId, "consumo", p.quantity, previousQty, newQty,
        `Agendamento concluído: ${svcName}`, appointmentId
      );
    }
  } catch (e: any) {
    console.error("[Stock Deduction on Done Error]", e?.message);
  }
}

async function findTenantClientByPhone(tenantId: string, phone: string) {
  const clients = await (prisma as any).client.findMany({ where: { tenantId } });
  return clients.find((client: any) => samePhone(client.phone, phone)) || null;
}


function resolveEndTime(targetDate: Date, startTime: string, providedEndTime: string | null | undefined, duration: number) {
  if (providedEndTime) return providedEndTime;
  const dateStr = format(targetDate, "yyyy-MM-dd");
  const start = parse(`${dateStr} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
  return format(addMinutes(start, duration), "HH:mm");
}

async function ensureSlotAvailable(tenantId: string, professionalId: string, targetDate: Date, startTime: string, endTime: string) {
  const { start, end } = getDayRange(targetDate);
  const appointments = await (prisma as any).appointment.findMany({
    where: {
      tenantId,
      professionalId,
      date: { gte: start, lt: end },
      status: { notIn: ["cancelled", "canceled", "cancelado"] },
    },
    select: { startTime: true, endTime: true },
  });

  if (hasSlotOverlap(startTime, endTime, appointments)) {
    throw new Error("Jâ”œÃ¢â”¬Ã­ existe um agendamento neste horâ”œÃ¢â”¬Ã­rio para este profissional.");
  }
}

export const agendaController = {
  async getAvailability(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { date, serviceId, professionalId } = req.query;

    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    if (!date || !serviceId || !professionalId) return res.status(400).json({ error: "date, serviceId and professionalId required." });

    try {
      const targetDate = toDateOnly(date as string);
      const dayOfWeek = targetDate.getDay();
      const settings = await ensureAgendaSettingsRecord(tenantId);
      const service = await (prisma as any).service.findFirst({ where: { id: serviceId as string, tenantId } });
      if (!service) return res.status(404).json({ error: "Serviâ”œÂºo nâ”œÃºo encontrado." });
      const clientId: string | null = null;
      const client = clientId
        ? await (prisma as any).client.findFirst({ where: { id: clientId, tenantId } })
        : null;
      if (clientId && !client) {
        return res.status(404).json({ error: "Cliente nâ”œÃ¢â”¬Ãºo encontrado." });
      }

      const professional = await (prisma as any).professional.findFirst({
        where: { id: professionalId as string, tenantId, isActive: true },
      });
      if (!professional) return res.status(404).json({ error: "Profissional nâ”œÃºo encontrado." });

      if (!settings.onlineBookingEnabled || !settings.enableSelfService) return res.json([]);

      const maxBookingDate = addDays(startOfDay(new Date()), settings.maxAdvanceDays);
      if (startOfDay(targetDate) > maxBookingDate) return res.json([]);

      // Helper to get working hours for a professional with fallback to the first professional of the tenant
      const getWorkingHoursForProfessional = async (profId: string, day: number) => {
        let wh = await (prisma as any).workingHours.findFirst({ where: { professionalId: profId, dayOfWeek: day } });
        if (!wh && tenantId) {
          const firstProf = await (prisma as any).professional.findFirst({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } });
          if (firstProf && firstProf.id !== profId) {
            wh = await (prisma as any).workingHours.findFirst({ where: { professionalId: firstProf.id, dayOfWeek: day } });
          }
        }
        return wh;
      };

      const wh = await getWorkingHoursForProfessional(professionalId as string, dayOfWeek);
      const { start, end } = getDayRange(targetDate);
      const appts = await (prisma as any).appointment.findMany({
        where: { professionalId: professionalId as string, date: { gte: start, lt: end }, status: { notIn: ["cancelled", "canceled", "cancelado"] } }
      });

      let closedByDay = !wh || !wh.isOpen;
      let baseStartTime = wh?.startTime || "";
      let baseEndTime = wh?.endTime || "";
      let baseBreakStart = wh?.breakStart || null;
      let baseBreakEnd = wh?.breakEnd || null;

      if (tenantId) {
        const closed = await (prisma as any).closedDay.findFirst({ where: { tenantId, date: { gte: start, lt: end } } });
        if (closed) closedByDay = true;
        
        const specialRows: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT * FROM SpecialScheduleDay WHERE tenantId = ? AND date >= ? AND date < ? AND (professionalId = ? OR professionalId IS NULL) ORDER BY professionalId IS NULL ASC, createdAt DESC`,
          tenantId, start, end, professionalId as string
        );
        const special = specialRows[0];
        if (special) {
          if (asBool(special.isClosed, true)) closedByDay = true;
          else {
            closedByDay = false;
            baseStartTime = special.startTime || baseStartTime || "09:00";
            baseEndTime = special.endTime || baseEndTime || "19:00";
            baseBreakStart = null;
            baseBreakEnd = null;
          }
        }
        if (settings.blockNationalHolidays && isNationalHoliday(targetDate)) closedByDay = true;
      }

      const releaseRows: any[] = tenantId
        ? await (prisma as any).$queryRawUnsafe(
            `SELECT * FROM ScheduleRelease WHERE tenantId = ? AND date >= ? AND date < ? AND (professionalId = ? OR professionalId IS NULL) ORDER BY startTime ASC`,
            tenantId, start, end, professionalId as string
          )
        : [];

      const duration = service.duration || 60;
      const minAllowedStart = addMinutes(new Date(), settings.minAdvanceMinutes);
      const slots = new Set<string>();

      if (!closedByDay && baseStartTime && baseEndTime) {
        buildSlotWindow({ targetDate, startTime: baseStartTime, endTime: baseEndTime, duration, intervalMinutes: settings.slotIntervalMinutes, appointments: appts, breakStart: baseBreakStart, breakEnd: baseBreakEnd, minAllowedStart }).forEach((slot) => slots.add(slot));
      }
      releaseRows.forEach((release) => {
        buildSlotWindow({ targetDate, startTime: release.startTime, endTime: release.endTime, duration, intervalMinutes: settings.slotIntervalMinutes, appointments: appts, minAllowedStart }).forEach((slot) => slots.add(slot));
      });

      return res.json(Array.from(slots).sort());
    } catch (e: any) {
      return res.status(500).json({ error: "Erro ao calcular disponibilidade." });
    }
  },

  async getCalendarStatus(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { month, professionalId } = req.query;

    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    if (!month || !professionalId) return res.status(400).json({ error: "month e professionalId sâ”œÃºo obrigatâ”œâ”‚rios." });

    try {
      const targetDate = new Date(month as string);
      const start = startOfMonth(targetDate);
      const end = endOfMonth(targetDate);
      const settings = await ensureAgendaSettingsRecord(tenantId);

      const getWorkingHoursForProfessional = async (profId: string) => {
        let whs = await (prisma as any).workingHours.findMany({ where: { professionalId: profId } });
        if (whs.length === 0 && tenantId) {
          const firstProf = await (prisma as any).professional.findFirst({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } });
          if (firstProf && firstProf.id !== profId) {
            whs = await (prisma as any).workingHours.findMany({ where: { professionalId: firstProf.id } });
          }
        }
        return whs;
      };

      const workingHours = await getWorkingHoursForProfessional(professionalId as string);
      const closedDays = await (prisma as any).closedDay.findMany({ where: { tenantId, date: { gte: start, lte: end } } });
      const appts = await (prisma as any).appointment.findMany({ where: { professionalId: professionalId as string, date: { gte: start, lte: end }, status: { notIn: ["cancelled", "canceled", "cancelado"] } } });
      
      const specialDays: any[] = tenantId
        ? await (prisma as any).$queryRawUnsafe(`SELECT * FROM SpecialScheduleDay WHERE tenantId = ? AND date >= ? AND date <= ? AND (professionalId = ? OR professionalId IS NULL) ORDER BY professionalId IS NULL ASC, createdAt DESC`, tenantId, start, end, professionalId as string)
        : [];
      const releases: any[] = tenantId
        ? await (prisma as any).$queryRawUnsafe(`SELECT * FROM ScheduleRelease WHERE tenantId = ? AND date >= ? AND date <= ? AND (professionalId = ? OR professionalId IS NULL)`, tenantId, start, end, professionalId as string)
        : [];

      const statusMap: Record<string, string> = {};
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const minAllowedStart = addMinutes(now, settings.minAdvanceMinutes);
      let cursor = start;
      while (cursor <= end) {
        const dateStr = format(cursor, "yyyy-MM-dd");
        const dayOfWeek = cursor.getDay();
        const wh = workingHours.find((w: any) => w.dayOfWeek === dayOfWeek);
        const isClosed = closedDays.find((cd: any) => format(cd.date, "yyyy-MM-dd") === dateStr);
        const special = specialDays.find((item: any) => format(item.date, "yyyy-MM-dd") === dateStr);
        const dayReleases = releases.filter((item: any) => format(item.date, "yyyy-MM-dd") === dateStr);
        const outsideWindow = startOfDay(cursor) > addDays(startOfDay(now), settings.maxAdvanceDays);
        const disabledOnline = tenantId && (!settings.onlineBookingEnabled || !settings.enableSelfService);
        const closedByHoliday = settings.blockNationalHolidays && isNationalHoliday(cursor);
        // Dias passados nunca podem ser agendados
        const isPastDay = startOfDay(cursor) < startOfDay(now);

        if (isPastDay || outsideWindow || disabledOnline) statusMap[dateStr] = "closed";
        else if ((special && asBool(special.isClosed, true) && dayReleases.length === 0) || closedByHoliday) statusMap[dateStr] = "closed";
        else if ((!wh || !wh.isOpen || isClosed) && dayReleases.length === 0 && !special) statusMap[dateStr] = "closed";
        else {
          // Para o dia atual, verificar se ainda restam slots no futuro
          if (dateStr === todayStr) {
            const effectiveEndTime = (special && !asBool(special.isClosed, true) ? special.endTime : null) || wh?.endTime || "23:59";
            const endOfWorkday = parse(`${dateStr} ${effectiveEndTime}`, "yyyy-MM-dd HH:mm", new Date());
            // Se o horário de encerramento já passou considerando o avanço mínimo, o dia está fechado
            if (minAllowedStart >= endOfWorkday) {
              statusMap[dateStr] = "closed";
              cursor = addDays(cursor, 1);
              continue;
            }
          }
          const dayAppts = appts.filter((a: any) => format(a.date, "yyyy-MM-dd") === dateStr);
          if (dayAppts.length >= 8) statusMap[dateStr] = "full";
          else if (dayAppts.length >= 4) statusMap[dateStr] = "busy";
          else statusMap[dateStr] = "available";
        }
        cursor = addDays(cursor, 1);
      }
      return res.json(statusMap);
    } catch (e: any) {
      return res.status(500).json({ error: "Erro ao buscar status do calendâ”œÃ­rio." });
    }
  },

  async list(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
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
  },

  async clientAppointments(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Phone obrigatâ”œâ”‚rio." });
    try {
      const agendaSettings = await ensureAgendaSettingsRecord(tenantId);
      if (!agendaSettings.enableAppointmentSearch || !agendaSettings.enableClientAgendaView) {
        return res.status(403).json({ error: "Consulta pâ”œâ•‘blica desativada." });
      }
      const client = await findTenantClientByPhone(tenantId, String(phone));
      if (!client) return res.json([]);
      const appointments = await (prisma as any).appointment.findMany({
        where: { clientId: client.id, tenantId },
        include: { service: { select: { id: true, name: true } }, professional: { select: { id: true, name: true, phone: true } } },
        orderBy: { date: "desc" }
      });
      res.json(appointments);
    } catch (e: any) {
      res.status(500).json({ error: "Erro." });
    }
  },
  
  async checkRecurrence(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
    const { dates, professionalId, startTime, endTime } = req.body;
    
    if (!Array.isArray(dates) || dates.length === 0 || !professionalId || !startTime || !endTime) {
      return res.status(400).json({ error: "Parâmetros incompletos para validação." });
    }

    try {
      const settings = await ensureAgendaSettingsRecord(tenantId);
      
      const closedDays = await (prisma as any).closedDay.findMany({ where: { tenantId } });
      const specialDays = await (prisma as any).specialScheduleDay.findMany({ 
        where: { tenantId, professionalId: { in: [null, professionalId] }, isClosed: true } 
      });

      const parsedDates = dates.map((d: string) => parse(d, "yyyy-MM-dd", new Date()));

      const existingAppts = await (prisma as any).appointment.findMany({
        where: {
          tenantId,
          professionalId,
          status: { in: ["scheduled", "confirmed"] },
          date: { in: parsedDates }
        }
      });

      const conflicts: any[] = [];
      
      for (const d of dates) {
        const dateObj = parse(d, "yyyy-MM-dd", new Date());
        
        // 1. National holiday
        if (settings.blockNationalHolidays && isNationalHoliday(dateObj)) {
          conflicts.push({ date: d, reason: "holiday", message: "Feriado Nacional" });
          continue;
        }

        // 2. Closed Day
        const closed = closedDays.find((cd: any) => format(cd.date, "yyyy-MM-dd") === d);
        if (closed) {
          conflicts.push({ date: d, reason: "closed", message: closed.description || "Dia Fechado" });
          continue;
        }

        // 3. Special Schedule Closed
        const special = specialDays.find((sd: any) => format(sd.date, "yyyy-MM-dd") === d);
        if (special) {
          conflicts.push({ date: d, reason: "special_closed", message: special.description || "Profissional Ausente" });
          continue;
        }

        // 4. Existing Appointment Overlap
        const dayAppts = existingAppts.filter((a: any) => format(a.date, "yyyy-MM-dd") === d);
        if (hasSlotOverlap(startTime, endTime, dayAppts)) {
          conflicts.push({ date: d, reason: "booked", message: "Horário Indisponível" });
          continue;
        }
      }

      res.json({ conflicts });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    const { date, startTime, endTime, clientId, serviceId, professionalId: rawProfessionalId, comandaId, duration, notes, status, type, sessionNumber, totalSessions, recurrence, repeat, repeatCount, skipDates } = req.body;
    
    console.log("[Agenda] Criando agendamento", { 
      date, startTime, repeat, repeatCount, 
      isPublic: !(req as any).auth,
      skipDatesCount: skipDates?.length || 0 
    });

    if (!date || !startTime) return res.status(400).json({ error: "data e horário são obrigatórios." });
    const isPublicRequest = !(req as any).auth;

    let professionalId = rawProfessionalId || null;
    if (!professionalId) {
      const firstProf = await (prisma as any).professional.findFirst({ where: { tenantId, isActive: true } });
      if (firstProf) professionalId = firstProf.id;
    }
    if (!professionalId) return res.status(400).json({ error: "Nenhum profissional disponâ”œÂ¡vel." });

    try {
      const agendaSettings = await ensureAgendaSettingsRecord(tenantId);
      if (isPublicRequest && (!agendaSettings.onlineBookingEnabled || !agendaSettings.enableSelfService)) {
        return res.status(403).json({ error: "Autoagendamento desativado." });
      }
      if (isPublicRequest && (!clientId || !serviceId)) {
        return res.status(400).json({ error: "clientId e serviceId sâ”œÃºo obrigatâ”œâ”‚rios no autoagendamento." });
      }

      const service = serviceId
        ? await (prisma as any).service.findFirst({ where: { id: serviceId, tenantId } })
        : null;
      if (serviceId && !service) {
        return res.status(404).json({ error: "Serviâ”œÂºo nâ”œÃºo encontrado." });
      }

      const client = clientId
        ? await (prisma as any).client.findFirst({ where: { id: clientId, tenantId } })
        : null;
      if (clientId && !client) {
        return res.status(404).json({ error: "Cliente nâ”œÃ¢â”¬Ãºo encontrado." });
      }

      const professional = await (prisma as any).professional.findFirst({
        where: { id: professionalId, tenantId, isActive: true },
      });
      if (!professional) {
        return res.status(404).json({ error: "Profissional nâ”œÃºo encontrado." });
      }

      try {
        const assignedIds = JSON.parse(service?.professionalIds || "[]");
        if (Array.isArray(assignedIds) && assignedIds.length > 0 && !assignedIds.includes(professionalId)) {
          return res.status(400).json({ error: "Este profissional nâ”œÃ¢â”¬Ãºo atende o serviâ”œÃ¢â”¬Âºo selecionado." });
        }
      } catch {
        // Ignora JSON invâ”œÃ¢â”¬Ã­lido em professionalIds.
      }

      const effectiveStatus = isPublicRequest
        ? (agendaSettings.autoConfirmAppointments ? "confirmed" : "scheduled")
        : (status || (agendaSettings.autoConfirmAppointments ? "confirmed" : "scheduled"));
      const baseDate = new Date(date);
      
      let count = 1;
      let interval = 7;
      if (!isPublicRequest && recurrence && recurrence.type !== "none") {
        count = recurrence.count || 1;
        interval = recurrence.interval || 7;
      } else if (isPublicRequest && repeat === "weekly") {
        count = repeatCount || 1;
      }
      
      const effectiveDuration = Number(duration) > 0 ? Number(duration) : Number(service?.duration || 60);
      
      const groupId = count > 1 ? randomUUID() : null;
      const results = [];
      const skipDatesList = Array.isArray(skipDates) ? skipDates : [];
      
      let createdCount = 0;
      for (let i = 0; i < count; i++) {
        const apptDate = addDays(baseDate, i * interval);
        const apptDateStr = format(apptDate, "yyyy-MM-dd");
        
        if (skipDatesList.includes(apptDateStr)) {
          continue; 
        }

        createdCount++;
        const resolvedEndTime = resolveEndTime(apptDate, startTime, endTime, effectiveDuration);

        await ensureSlotAvailable(tenantId, professionalId, apptDate, startTime, resolvedEndTime);

        const appt = await (prisma as any).appointment.create({
          data: {
            id: randomUUID(), date: apptDate, startTime, endTime: resolvedEndTime, status: effectiveStatus,
            type: isPublicRequest ? "atendimento" : (type || "atendimento"),
            clientId: clientId || null,
            serviceId: serviceId || null,
            professionalId,
            comandaId: isPublicRequest ? null : (comandaId || null),
            duration: effectiveDuration,
            notes: isPublicRequest ? null : (notes || null),
            tenantId, sessionNumber: createdCount, totalSessions: count - skipDatesList.length, repeatGroupId: groupId,
          },
          include: { client: { select: { id: true, name: true, phone: true } }, service: { select: { id: true, name: true } }, professional: { select: { id: true, name: true, phone: true } } }
        });
        results.push(appt);

        if (effectiveStatus === "scheduled" || effectiveStatus === "confirmed") {
          await handleAppointmentStockReservation(appt.serviceId, "reserve");
        }
      }

      // Notifica profissional e cliente (se confirmado)
      if (tenantId && results.length > 0) {
        fireWppProfNewBooking(tenantId, results).catch(e => console.error("Erro wpp prof:", e));
        if (effectiveStatus === "confirmed") {
          fireWppConfirmationCentral(tenantId, results).catch(e => console.error("Erro wpp client:", e));
        }
      }

      res.json(results[0]);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { date, startTime, endTime, clientId, serviceId, professionalId, status, notes, duration, type } = req.body;
    try {
      const oldAppt = await (prisma as any).appointment.findUnique({ where: { id: req.params.id } });
      await (prisma as any).appointment.updateMany({
        where: { id: req.params.id, tenantId: tenantId || undefined },
        data: {
          ...(date !== undefined && { date: new Date(date) }), ...(startTime !== undefined && { startTime }),
          ...(endTime !== undefined && { endTime }), ...(clientId !== undefined && { clientId }),
          ...(serviceId !== undefined && { serviceId }), ...(professionalId !== undefined && { professionalId }),
          ...(status !== undefined && { status }), ...(notes !== undefined && { notes }),
          ...(duration !== undefined && { duration }), ...(type !== undefined && { type }),
        }
      });
      const appt = await (prisma as any).appointment.findFirst({
        where: { id: req.params.id },
        include: { client: { select: { id: true, name: true, phone: true } }, service: { select: { id: true, name: true, price: true } }, professional: { select: { id: true, name: true, phone: true } } }
      });

      if (oldAppt) {
        const oldIsActive = oldAppt.status === "scheduled" || oldAppt.status === "confirmed";
        const newIsActive = status === "scheduled" || status === "confirmed";
        const oldSvc = oldAppt.serviceId;
        const newSvc = serviceId !== undefined ? serviceId : oldAppt.serviceId;

        if (status === "done" && oldAppt.status !== "done") {
          await handleAppointmentDone(oldSvc, tenantId, req.params.id);
        } else if (oldIsActive && !newIsActive) {
          await handleAppointmentStockReservation(oldSvc, "release");
        } else if (!oldIsActive && newIsActive) {
          await handleAppointmentStockReservation(newSvc, "reserve");
        } else if (oldIsActive && newIsActive && oldSvc !== newSvc) {
          await handleAppointmentStockReservation(oldSvc, "release");
          await handleAppointmentStockReservation(newSvc, "reserve");
        }
      }

      if (status === "confirmed" && oldAppt?.status !== "confirmed" && appt?.client?.phone && appt.tenantId) {
        fireWppConfirmation(appt.tenantId, appt).catch(() => {});
      }
      res.json(appt);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async patch(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const data: any = {};
    const allowed = ["status", "date", "startTime", "endTime", "notes", "professionalId", "serviceId", "clientId", "duration", "comandaId"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = key === "date" ? new Date(req.body[key]) : req.body[key];
    }
    try {
      const oldAppt = await (prisma as any).appointment.findUnique({ where: { id: req.params.id } });
      await (prisma as any).appointment.updateMany({ where: { id: req.params.id, tenantId: tenantId || undefined }, data });
      const appt = await (prisma as any).appointment.findFirst({
        where: { id: req.params.id },
        include: { client: { select: { id: true, name: true, phone: true } }, service: { select: { id: true, name: true, price: true } }, professional: { select: { id: true, name: true, phone: true } } }
      });

      if (oldAppt) {
        const statusToUse = req.body.status !== undefined ? req.body.status : oldAppt.status;
        const svcToUse = req.body.serviceId !== undefined ? req.body.serviceId : oldAppt.serviceId;
        const oldIsActive = oldAppt.status === "scheduled" || oldAppt.status === "confirmed";
        const newIsActive = statusToUse === "scheduled" || statusToUse === "confirmed";

        if (statusToUse === "done" && oldAppt.status !== "done") {
          await handleAppointmentDone(oldAppt.serviceId, tenantId, req.params.id);
        } else if (oldIsActive && !newIsActive) {
          await handleAppointmentStockReservation(oldAppt.serviceId, "release");
        } else if (!oldIsActive && newIsActive) {
          await handleAppointmentStockReservation(svcToUse, "reserve");
        } else if (oldIsActive && newIsActive && oldAppt.serviceId !== svcToUse) {
          await handleAppointmentStockReservation(oldAppt.serviceId, "release");
          await handleAppointmentStockReservation(svcToUse, "reserve");
        }
      }

      if (req.body.status === "confirmed" && oldAppt?.status !== "confirmed" && appt?.client?.phone && appt.tenantId) {
        fireWppConfirmation(appt.tenantId, appt).catch(() => {});
      }
      res.json(appt);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async delete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    try {
      const oldAppt = await (prisma as any).appointment.findUnique({ where: { id: req.params.id } });
      if (oldAppt && (oldAppt.status === "scheduled" || oldAppt.status === "confirmed")) {
        await handleAppointmentStockReservation(oldAppt.serviceId, "release");
      }
      await (prisma as any).appointment.deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async getGroup(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    try {
      const appts = await (prisma as any).appointment.findMany({
        where: { repeatGroupId: req.params.groupId, tenantId },
        include: { client: { select: { id: true, name: true, phone: true } }, service: { select: { id: true, name: true } } },
        orderBy: { date: "asc" }
      });
      res.json(appts);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async batchDelete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids obrigatâ”œâ”‚rio." });
    try {
      await (prisma as any).appointment.deleteMany({ where: { id: { in: ids }, tenantId } });
      res.json({ success: true, deleted: ids.length });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // â”€â”€ PAT PÃšBLICO (SEM AUTH) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getPatGeneral(req: Request, res: Response) {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: "Slug obrigatÃ³rio." });

    try {
      const tenant = await (prisma as any).tenant.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });
      if (!tenant) return res.status(404).json({ error: "EstÃºdio nÃ£o encontrado." });

      const tenantId = tenant.id;
      const settingsRow = await (prisma as any).agendaSettings.findFirst({ where: { tenantId } });
      const patEnabled = settingsRow ? Boolean(settingsRow.enablePatTerminal) : false;

      const professionals = await (prisma as any).professional.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true, role: true, photo: true },
        orderBy: { name: "asc" }
      });

      const today = new Date();
      const start = new Date(today); start.setHours(0, 0, 0, 0);
      const end   = new Date(today); end.setHours(23, 59, 59, 999);
      const nowStr = format(today, "HH:mm");

      const showClientName = settingsRow ? Boolean(settingsRow.patShowClientName ?? true) : true;
      const showService    = settingsRow ? Boolean(settingsRow.patShowService ?? true) : true;
      const showTime       = settingsRow ? Boolean(settingsRow.patShowTime ?? true) : true;

      const profsWithQueue = await Promise.all(professionals.map(async (prof: any) => {
        const appointments = await (prisma as any).appointment.findMany({
          where: {
            tenantId,
            professionalId: prof.id,
            date: { gte: start, lte: end },
            type: { not: "bloqueio" },
            status: { in: ["scheduled", "confirmed", "performed", "missed"] },
          },
          include: {
            client:  { select: { name: true } },
            service: { select: { name: true, duration: true } },
          },
          orderBy: { startTime: "asc" },
        });

        const nextIdx = appointments.findIndex((a: any) => a.startTime >= nowStr && ["scheduled", "confirmed"].includes(a.status));

        const queue = appointments.map((a: any, i: number) => ({
          id: a.id,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
          clientName: showClientName ? (a.client?.name ?? "Cliente") : "Cliente",
          serviceName: showService ? (a.service?.name ?? null) : null,
          serviceDuration: a.service?.duration ?? null,
          isNext: i === nextIdx,
          isPast: a.endTime ? a.endTime < nowStr : a.startTime < nowStr,
        }));

        return {
          ...prof,
          queue
        };
      }));

      res.json({
        patEnabled,
        showClientName,
        showService,
        showTime,
        studio: tenant,
        date: format(today, "yyyy-MM-dd"),
        professionals: profsWithQueue,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro." });
    }
  },

  async getPatQueue(req: Request, res: Response) {
    const { professionalId } = req.params;
    if (!professionalId) return res.status(400).json({ error: "professionalId obrigatÃ³rio." });
    try {
      const prof = await (prisma as any).professional.findUnique({
        where: { id: professionalId },
        select: { id: true, name: true, role: true, tenantId: true, photo: true },
      });
      if (!prof) return res.status(404).json({ error: "Profissional nÃ£o encontrado." });

      const { tenantId } = prof;
      const settingsRow = await (prisma as any).agendaSettings.findFirst({ where: { tenantId } });
      const patEnabled = settingsRow ? Boolean(settingsRow.enablePatTerminal) : false;

      const showClientName = settingsRow ? Boolean(settingsRow.patShowClientName ?? true) : true;
      const showService    = settingsRow ? Boolean(settingsRow.patShowService ?? true) : true;
      const showTime       = settingsRow ? Boolean(settingsRow.patShowTime ?? true) : true;

      const tenant = await (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      });

      const today = new Date();
      const start = new Date(today); start.setHours(0, 0, 0, 0);
      const end   = new Date(today); end.setHours(23, 59, 59, 999);

      const appointments = await (prisma as any).appointment.findMany({
        where: {
          tenantId,
          professionalId,
          date: { gte: start, lte: end },
          type: { not: "bloqueio" },
          status: { in: ["scheduled", "confirmed", "performed", "missed"] },
        },
        include: {
          client:  { select: { id: true, name: true, phone: true } },
          service: { select: { id: true, name: true, duration: true, type: true, price: true } },
        },
        orderBy: { startTime: "asc" },
      });

      const nowStr = format(today, "HH:mm");
      let nextIdx = appointments.findIndex((a: any) => a.startTime >= nowStr && ["scheduled", "confirmed"].includes(a.status));
      if (nextIdx === -1) {
          nextIdx = appointments.findIndex(a => ["scheduled", "confirmed"].includes(a.status));
      }

      const queue = appointments.map((a: any, i: number) => ({
        id: a.id,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        clientName: showClientName ? (a.client?.name ?? "Cliente") : "Cliente",
        serviceName: showService ? (a.service?.name ?? null) : null,
        serviceDuration: a.service?.duration ?? null,
        isNext: i === nextIdx,
        isPast: a.endTime ? a.endTime < nowStr : a.startTime < nowStr,
      }));

      res.json({
        patEnabled,
        showClientName,
        showService,
        showTime,
        professional: prof,
        studio: { name: tenant?.name ?? "EstÃºdio", slug: tenant?.slug ?? "" },
        date: format(today, "yyyy-MM-dd"),
        queue,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro." });
    }
  },

  async patchPatStatus(req: Request, res: Response) {
    const { appointmentId } = req.params;
    const { status } = req.body;
    if (!appointmentId || !status) return res.status(400).json({ error: "appointmentId e status obrigatÃ³rios." });

    try {
      const appt = await (prisma as any).appointment.update({
        where: { id: appointmentId },
        data: { status },
        include: { client: { select: { name: true } }, service: { select: { name: true } } }
      });

      if (status === "missed" || status === "performed" || status === "cancelled") {
        await handleAppointmentStockReservation(appt.serviceId, "release");
      }

      res.json(appt);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro." });
    }
  },

  // SETTINGS
  async getSettings(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    try {
      const settings = await ensureAgendaSettingsRecord(tenantId);
      const releases: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sr.*, p.name AS professionalName FROM ScheduleRelease sr LEFT JOIN Professional p ON p.id = sr.professionalId WHERE sr.tenantId = ? ORDER BY sr.date ASC, sr.startTime ASC`,
        tenantId
      );
      const specialDays: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sd.*, p.name AS professionalName FROM SpecialScheduleDay sd LEFT JOIN Professional p ON p.id = sd.professionalId WHERE sd.tenantId = ? ORDER BY sd.date ASC, sd.startTime ASC`,
        tenantId
      );
      res.json({ settings, releases: releases.map(mapScheduleRelease), specialDays: specialDays.map(mapSpecialScheduleDay) });
    } catch (e: any) {
      console.error("[getSettings] Error:", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao carregar configuraâ”œÂºâ”œÃes." });
    }
  },

  async updateSettings(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    try {
      const current = await ensureAgendaSettingsRecord(tenantId);
      const next = normalizeAgendaSettings({ ...current, ...req.body }, tenantId);
      await (prisma as any).$executeRawUnsafe(
        `UPDATE AgendaSettings SET
          onlineBookingEnabled=?,
          enablePatTerminal=?, patShowClientName=?, patShowService=?, patShowTime=?, patAutoAdvance=?, patAutoAdvanceMinutes=?,
          enableSelfService=?, selfServiceRequireLogin=?, selfServiceShowProfessional=?, selfServiceShowPrices=?, selfServiceWelcomeMessage=?, allowClientRecurrence=?,
          enableClientAgendaView=?, enableAppointmentSearch=?, enableWhatsAppReminders=?,
          autoConfirmAppointments=?, allowClientCancellation=?, allowClientReschedule=?,
          blockNationalHolidays=?, slotIntervalMinutes=?, minAdvanceMinutes=?, maxAdvanceDays=?, notes=?
        WHERE tenantId=?`,
        next.onlineBookingEnabled ? 1 : 0,
        next.enablePatTerminal ? 1 : 0, next.patShowClientName ? 1 : 0, next.patShowService ? 1 : 0, next.patShowTime ? 1 : 0, next.patAutoAdvance ? 1 : 0, next.patAutoAdvanceMinutes,
        next.enableSelfService ? 1 : 0, next.selfServiceRequireLogin ? 1 : 0, next.selfServiceShowProfessional ? 1 : 0, next.selfServiceShowPrices ? 1 : 0, next.selfServiceWelcomeMessage, next.allowClientRecurrence ? 1 : 0,
        next.enableClientAgendaView ? 1 : 0, next.enableAppointmentSearch ? 1 : 0, next.enableWhatsAppReminders ? 1 : 0,
        next.autoConfirmAppointments ? 1 : 0, next.allowClientCancellation ? 1 : 0, next.allowClientReschedule ? 1 : 0,
        next.blockNationalHolidays ? 1 : 0, next.slotIntervalMinutes, next.minAdvanceMinutes, next.maxAdvanceDays, next.notes,
        tenantId
      );
      res.json(next);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao salvar." });
    }
  },

  async createRelease(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    const { date, startTime, endTime, professionalId, description } = req.body;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: "Campos obrigatâ”œâ”‚rios." });
    try {
      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(`INSERT INTO ScheduleRelease (id, tenantId, professionalId, date, startTime, endTime, description) VALUES (?, ?, ?, ?, ?, ?, ?)`, id, tenantId, professionalId || null, toDateOnly(date), startTime, endTime, description || null);
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT sr.*, p.name AS professionalName FROM ScheduleRelease sr LEFT JOIN Professional p ON p.id = sr.professionalId WHERE sr.id = ? LIMIT 1`, id);
      res.json(mapScheduleRelease(rows[0]));
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  async deleteRelease(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    try {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM ScheduleRelease WHERE id=? AND tenantId=?`, req.params.id, tenantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  async saveSpecialDay(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    const { date, isClosed, startTime, endTime, professionalId, description } = req.body;
    try {
      const { start, end } = getDayRange(date);
      const targetProfId = professionalId || null;
      const existing: any[] = await (prisma as any).$queryRawUnsafe(`SELECT id FROM SpecialScheduleDay WHERE tenantId=? AND date>=? AND date<? AND ((professionalId IS NULL AND ? IS NULL) OR professionalId=?) LIMIT 1`, tenantId, start, end, targetProfId, targetProfId);
      const id = existing[0]?.id || randomUUID();
      if (existing.length > 0) {
        await (prisma as any).$executeRawUnsafe(`UPDATE SpecialScheduleDay SET isClosed=?, startTime=?, endTime=?, description=? WHERE id=? AND tenantId=?`, asBool(isClosed, true) ? 1 : 0, asBool(isClosed, true) ? null : startTime, asBool(isClosed, true) ? null : endTime, description || null, id, tenantId);
      } else {
        await (prisma as any).$executeRawUnsafe(`INSERT INTO SpecialScheduleDay (id, tenantId, professionalId, date, isClosed, startTime, endTime, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, id, tenantId, targetProfId, toDateOnly(date), asBool(isClosed, true) ? 1 : 0, asBool(isClosed, true) ? null : startTime, asBool(isClosed, true) ? null : endTime, description || null);
      }
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT sd.*, p.name AS professionalName FROM SpecialScheduleDay sd LEFT JOIN Professional p ON p.id = sd.professionalId WHERE sd.id = ? LIMIT 1`, id);
      res.json(mapSpecialScheduleDay(rows[0]));
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  async deleteSpecialDay(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    try {
      await (prisma as any).$executeRawUnsafe(`DELETE FROM SpecialScheduleDay WHERE id=? AND tenantId=?`, req.params.id, tenantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  // WORKING HOURS
  async getWorkingHours(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    try {
      const prof = await (prisma as any).professional.findFirst({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } });
      if (!prof) {
        const defaults = Array.from({ length: 7 }, (_, i) => ({ id: `default-${i}`, dayOfWeek: i, isOpen: i !== 0, startTime: "09:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00", professionalId: null }));
        return res.json(defaults);
      }
      let hours = await (prisma as any).workingHours.findMany({ where: { professionalId: prof.id }, orderBy: { dayOfWeek: "asc" } });
      if (hours.length === 0) {
        for (let i = 0; i < 7; i++) { await (prisma as any).workingHours.create({ data: { id: randomUUID(), dayOfWeek: i, isOpen: i !== 0, startTime: "09:00", endTime: "19:00", breakStart: "12:00", breakEnd: "13:00", professionalId: prof.id } }); }
        hours = await (prisma as any).workingHours.findMany({ where: { professionalId: prof.id }, orderBy: { dayOfWeek: "asc" } });
      }
      res.json(hours);
    } catch (e: any) {
      res.status(500).json({ error: "Erro." });
    }
  },

  async updateWorkingHours(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    const { hours } = req.body;
    try {
      for (const h of (hours || [])) {
        if (h.id && !h.id.startsWith("default-")) {
          await (prisma as any).workingHours.update({ where: { id: h.id }, data: { isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime, breakStart: h.breakStart, breakEnd: h.breakEnd } });
        }
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // CLOSED DAYS
  async getClosedDays(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    try {
      const days = await (prisma as any).closedDay.findMany({ where: { tenantId }, orderBy: { date: "asc" } });
      res.json(days.map((d: any) => ({ id: d.id, date: format(d.date, "yyyy-MM-dd"), name: d.description || "" })));
    } catch (e: any) {
      res.status(500).json({ error: "Erro." });
    }
  },

  async createClosedDay(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatâ”œâ”‚rio." });
    const { date, name } = req.body;
    try {
      const day = await (prisma as any).closedDay.create({ data: { id: randomUUID(), date: new Date(date), description: name || null, tenantId } });
      res.json({ id: day.id, date: format(day.date, "yyyy-MM-dd"), name: day.description || "" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async deleteClosedDay(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    try {
      await (prisma as any).closedDay.deleteMany({ where: { id: req.params.id, tenantId: tenantId || undefined } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }
};
