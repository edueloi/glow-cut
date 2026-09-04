import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { format, addDays, isSameDay, startOfDay, startOfMonth, endOfMonth, endOfWeek, startOfWeek, isSameMonth, isBefore, addMonths, subMonths, addMinutes, parse } from "date-fns";
import { getTenantId, asBool, asNumber, toDateOnly, getDayRange, formatDateOnly, getSaudacao, applyTemplateVars, samePhone, normalizePhone } from "../utils/helpers";
import { fireWppProfNewBooking, fireWppProfConfirmed, fireWppConfirmation as fireWppConfirmationCentral, fireWppPending } from "./wppController";
import { emitToTenant } from "../realtime";

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
      if (action === 'reserve') {
        await (prisma as any).product.updateMany({
          where: { id: p.productId },
          data: { reservedStock: { increment: p.quantity } },
        });
      } else {
        // GREATEST(0, ...) — sem isso, liberar uma reserva já liberada (ou que nunca existiu, ex:
        // release chamado duas vezes pro mesmo agendamento) jogava reservedStock pra negativo,
        // silenciosamente, já que esse campo não aparece em nenhuma tela hoje.
        await (prisma as any).$executeRawUnsafe(
          `UPDATE Product SET reservedStock = GREATEST(0, reservedStock - ?) WHERE id = ?`,
          p.quantity, p.productId
        );
      }
    }
  } catch (e: any) {
    console.error("[Stock Reservation Error]", e?.message);
  }
}

// Trava curta em memória contra disparo duplicado de confirmação: o check-then-act de "status
// !== confirmed antes" não é atômico — duas requisições PATCH/PUT quase simultâneas (duplo clique,
// retry de rede) liam o status antigo antes de qualquer uma commitar e ambas disparavam a
// confirmação pro cliente. Não usa o WppMessageSent (dedup permanente, pensado pra lembrete que só
// deve sair uma vez na vida do agendamento) porque confirmar/desconfirmar/reconfirmar de novo dias
// depois é um evento legítimo — só a janela de alguns segundos entre requests concorrentes é o
// problema. Processo roda em fork único (sem cluster), então o Set em memória é seguro aqui.
const wppConfirmationLocks = new Set<string>();
function tryClaimWppConfirmation(appointmentId: string): boolean {
  if (wppConfirmationLocks.has(appointmentId)) return false;
  wppConfirmationLocks.add(appointmentId);
  setTimeout(() => wppConfirmationLocks.delete(appointmentId), 10_000);
  return true;
}

// Quando o agendamento já tem uma comanda vinculada, a baixa de estoque acontece no
// fechamento da comanda (comandaController.update, ao marcar como "paid") — dar baixa aqui
// também duplicava o consumo do mesmo serviço (um StockMovement por "done" na agenda +
// outro por "paid" na comanda), gerando saída de estoque em dobro pelo mesmo atendimento.
async function handleAppointmentDone(serviceId: string | null, tenantId: string | null, appointmentId: string, comandaId?: string | null) {
  if (!serviceId || !tenantId || comandaId) return;
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

// Quando um agendamento vinculado a uma comanda (venda de pacote) é marcado como concluído, sobe
// o contador de sessões da comanda sozinho — antes só existia o botão manual "+1 sessão" na tela
// de comandas, sem nenhuma relação com o agendamento real sendo concluído na agenda.
async function syncComandaSessionProgress(comandaId: string | null | undefined) {
  if (!comandaId) return;
  try {
    await (prisma as any).$executeRawUnsafe(
      `UPDATE Comanda SET sessionsCompleted = LEAST(COALESCE(sessionCount, 1), COALESCE(sessionsCompleted, 0) + 1) WHERE id = ?`,
      comandaId
    );
  } catch (e: any) {
    console.error("[Comanda Session Sync Error]", e?.message);
  }
}

async function findTenantClientByPhone(tenantId: string, phone: string) {
  const clients = await (prisma as any).client.findMany({ where: { tenantId } });
  return clients.find((client: any) => samePhone(client.phone, phone)) || null;
}


// Alguns formulários do frontend ainda mandam status em português (herança de UI antiga).
// O resto do sistema (baixa de estoque, filtros do dashboard, etc.) só reconhece os valores
// em inglês abaixo — normaliza aqui, num lugar só, pra não depender de corrigir cada tela.
const STATUS_PT_TO_EN: Record<string, string> = {
  agendado: "scheduled",
  confirmado: "confirmed",
  realizado: "done",
  cancelado: "cancelled",
  faltou: "noshow",
  reagendado: "scheduled",
};
function normalizeAppointmentStatus<T extends string | undefined | null>(status: T): T {
  if (!status) return status;
  const normalized = STATUS_PT_TO_EN[status as string];
  return (normalized ?? status) as T;
}

function resolveEndTime(targetDate: Date, startTime: string, providedEndTime: string | null | undefined, duration: number) {
  if (providedEndTime) return providedEndTime;
  const dateStr = format(targetDate, "yyyy-MM-dd");
  const start = parse(`${dateStr} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
  return format(addMinutes(start, duration), "HH:mm");
}

async function ensureSlotAvailable(tenantId: string, professionalId: string, targetDate: Date, startTime: string, endTime: string, excludeAppointmentId?: string, client: any = prisma) {
  const { start, end } = getDayRange(targetDate);
  const appointments = await client.appointment.findMany({
    where: {
      tenantId,
      professionalId,
      date: { gte: start, lt: end },
      status: { notIn: ["cancelled", "canceled", "cancelado"] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });

  if (hasSlotOverlap(startTime, endTime, appointments)) {
    throw new Error("Já existe um agendamento neste horário para este profissional.");
  }
}

// Trava a linha do profissional (SELECT ... FOR UPDATE) até o fim da transação — sem isso, dois
// requests concorrentes (ex: duas abas do cliente batendo no mesmo último horário livre)
// conseguiam passar pelo ensureSlotAvailable() ao mesmo tempo (nenhum vê o agendamento do outro
// ainda não commitado) e os dois INSERTs eram aceitos pro mesmo horário. Travar a linha do
// profissional serializa as tentativas de agendamento para ele: a segunda transação só roda seu
// próprio ensureSlotAvailable depois que a primeira já commitou (ou deu rollback).
async function lockProfessionalForBooking(tx: any, professionalId: string) {
  await tx.$queryRawUnsafe(`SELECT id FROM Professional WHERE id = ? FOR UPDATE`, professionalId);
}

// Reaplica, fora do fluxo público de disponibilidade (getAvailability), a mesma validação de
// expediente/dia fechado/feriado — sem isso, criação/reagendamento feitos pelo admin conseguiam
// marcar um horário fora do expediente do profissional ou num dia fechado sem nenhum aviso.
// Uma "Liberação de horário" (ScheduleRelease) continua funcionando como a forma sancionada de
// abrir uma exceção pontual.
async function ensureWithinWorkingHours(tenantId: string, professionalId: string, targetDate: Date, startTime: string, endTime: string, agendaSettings: any) {
  const dayOfWeek = targetDate.getDay();
  const { start, end } = getDayRange(targetDate);

  const wh = await (prisma as any).workingHours.findFirst({ where: { professionalId, dayOfWeek } });
  let closedByDay = !wh || !wh.isOpen;
  let baseStartTime = wh?.startTime || "";
  let baseEndTime = wh?.endTime || "";
  let baseBreakStart = wh?.breakStart || null;
  let baseBreakEnd = wh?.breakEnd || null;

  const closed = await (prisma as any).closedDay.findFirst({ where: { tenantId, date: { gte: start, lt: end } } });
  if (closed) closedByDay = true;

  const specialRows: any[] = await (prisma as any).$queryRawUnsafe(
    `SELECT * FROM SpecialScheduleDay WHERE tenantId = ? AND date >= ? AND date < ? AND (professionalId = ? OR professionalId IS NULL) ORDER BY professionalId IS NULL ASC, createdAt DESC`,
    tenantId, start, end, professionalId
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
  if (agendaSettings?.blockNationalHolidays && isNationalHoliday(targetDate)) closedByDay = true;

  const releaseRows: any[] = await (prisma as any).$queryRawUnsafe(
    `SELECT * FROM ScheduleRelease WHERE tenantId = ? AND date >= ? AND date < ? AND (professionalId = ? OR professionalId IS NULL) ORDER BY startTime ASC`,
    tenantId, start, end, professionalId
  );

  const withinRange = (s: string, e: string) => Boolean(s) && Boolean(e) && startTime >= s && endTime <= e;
  const withinBreak = Boolean(baseBreakStart && baseBreakEnd && !(endTime <= baseBreakStart || startTime >= baseBreakEnd));

  const fitsBase = !closedByDay && withinRange(baseStartTime, baseEndTime) && !withinBreak;
  const fitsRelease = releaseRows.some((r) => withinRange(r.startTime, r.endTime));

  if (!fitsBase && !fitsRelease) {
    throw new Error(closedByDay ? "O profissional não atende nesta data (dia fechado)." : "Horário fora do expediente do profissional.");
  }
}

export const agendaController = {
  async getAvailability(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { date, serviceId, professionalId } = req.query;

    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    if (!date || !serviceId || !professionalId) return res.status(400).json({ error: "date, serviceId and professionalId required." });

    try {
      const targetDate = toDateOnly(date as string);
      const dayOfWeek = targetDate.getDay();
      const settings = await ensureAgendaSettingsRecord(tenantId);
      const service = await (prisma as any).service.findFirst({ where: { id: serviceId as string, tenantId } });
      if (!service) return res.status(404).json({ error: "Serviço não encontrado." });

      const professional = await (prisma as any).professional.findFirst({
        where: { id: professionalId as string, tenantId, isActive: true },
      });
      if (!professional) return res.status(404).json({ error: "Profissional não encontrado." });

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

    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    if (!month || !professionalId) return res.status(400).json({ error: "month e professionalId são obrigatórios." });

    try {
      // Extrai ano/mês direto da string (não via `new Date()`) — o frontend manda
      // `startOfMonth(new Date()).toISOString()`, que em qualquer fuso negativo (ex.:
      // America/Sao_Paulo) vira meia-noite UTC do dia 31 do mês ANTERIOR, fazendo o
      // calendário público carregar e pintar o mês errado inteiro.
      const monthMatch = /^(\d{4})-(\d{2})/.exec(month as string);
      const targetDate = monthMatch
        ? new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1)
        : new Date(month as string);
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
          // Ocupação por MINUTOS cobertos do expediente, não por quantidade de registros — um
          // único bloqueio do dia inteiro (06:00-21:30) é 1 Appointment só, mas cobre o
          // expediente inteiro; contando só "quantidade" ele nunca chegava aos 4/8 registros
          // do limiar antigo e o dia continuava aparecendo como "Livre" no calendário público
          // mesmo estando 100% bloqueado.
          const dayAppts = appts.filter((a: any) => format(a.date, "yyyy-MM-dd") === dateStr);
          const effWh = (special && !asBool(special.isClosed, true))
            ? { startTime: special.startTime || wh?.startTime || "09:00", endTime: special.endTime || wh?.endTime || "19:00" }
            : wh;
          if (dayAppts.length === 0 || !effWh?.startTime || !effWh?.endTime) {
            statusMap[dateStr] = dayAppts.length > 0 ? "busy" : "available";
          } else {
            const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
            const workdayStart = toMinutes(effWh.startTime);
            const workdayEnd = toMinutes(effWh.endTime);
            const workdayMinutes = Math.max(1, workdayEnd - workdayStart);
            const occupiedMinutes = dayAppts.reduce((sum: number, a: any) => {
              const aStart = Math.max(toMinutes(a.startTime), workdayStart);
              const aEnd = Math.min(toMinutes(a.endTime), workdayEnd);
              return sum + Math.max(0, aEnd - aStart);
            }, 0);
            const occupiedRatio = occupiedMinutes / workdayMinutes;
            // Um bloqueio manual (dono fechando a agenda de propósito) é diferente de "lotou de
            // cliente real" — quando TODA a ocupação do dia vem de bloqueio, o dia é tratado
            // como fechado (mesma cor/legenda de feriado), não "lotado" (que ficava cinza,
            // clicável, e só mostrava "agenda cheia" depois de já ter clicado no dia).
            const onlyBlocked = dayAppts.length > 0 && dayAppts.every((a: any) => a.type === "bloqueio");
            if (occupiedRatio >= 0.95 && onlyBlocked) statusMap[dateStr] = "closed";
            else if (occupiedRatio >= 0.95) statusMap[dateStr] = "full";
            else if (occupiedRatio >= 0.5) statusMap[dateStr] = "busy";
            else statusMap[dateStr] = "available";
          }
        }
        cursor = addDays(cursor, 1);
      }
      return res.json(statusMap);
    } catch (e: any) {
      return res.status(500).json({ error: "Erro ao buscar status do calendário." });
    }
  },

  async list(req: Request, res: Response) {
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
  },

  async clientAppointments(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: "Phone obrigatório." });
    try {
      const agendaSettings = await ensureAgendaSettingsRecord(tenantId);
      if (!agendaSettings.enableAppointmentSearch || !agendaSettings.enableClientAgendaView) {
        return res.status(403).json({ error: "Consulta pública desativada." });
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

  // Autoatendimento do cliente: cancelar/remarcar o próprio agendamento (sem login, autenticado
  // apenas pelo telefone cadastrado no agendamento — mesmo nível de "prova" já usado na consulta
  // pública de agendamentos por telefone).
  async clientCancel(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { phone } = req.body;
    const { id } = req.params;
    if (!phone) return res.status(400).json({ error: "Telefone obrigatório." });
    try {
      const agendaSettings = await ensureAgendaSettingsRecord(tenantId);
      if (!agendaSettings.allowClientCancellation) {
        return res.status(403).json({ error: "Cancelamento pelo cliente está desativado." });
      }
      const appt = await (prisma as any).appointment.findFirst({ where: { id, tenantId }, include: { client: true } });
      if (!appt) return res.status(404).json({ error: "Agendamento não encontrado." });

      const digits = String(phone).replace(/\D/g, "");
      const apptPhoneDigits = String(appt.client?.phone || "").replace(/\D/g, "");
      if (!digits || digits !== apptPhoneDigits) {
        return res.status(403).json({ error: "Telefone não confere com o agendamento." });
      }
      if (appt.status === "done") {
        return res.status(400).json({ error: "Este agendamento já foi concluído." });
      }
      if (appt.status !== "cancelled" && appt.status !== "cancelado") {
        const wasActive = appt.status === "scheduled" || appt.status === "confirmed";
        await (prisma as any).appointment.update({ where: { id }, data: { status: "cancelled" } });
        if (wasActive) await handleAppointmentStockReservation(appt.serviceId, "release");
        emitToTenant(tenantId, "agenda:changed");
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async clientReschedule(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { phone, date, startTime } = req.body;
    const { id } = req.params;
    if (!phone || !date || !startTime) return res.status(400).json({ error: "Telefone, data e horário são obrigatórios." });
    try {
      const agendaSettings = await ensureAgendaSettingsRecord(tenantId);
      if (!agendaSettings.allowClientReschedule) {
        return res.status(403).json({ error: "Reagendamento pelo cliente está desativado." });
      }
      const appt = await (prisma as any).appointment.findFirst({ where: { id, tenantId }, include: { client: true, service: true } });
      if (!appt) return res.status(404).json({ error: "Agendamento não encontrado." });

      const digits = String(phone).replace(/\D/g, "");
      const apptPhoneDigits = String(appt.client?.phone || "").replace(/\D/g, "");
      if (!digits || digits !== apptPhoneDigits) {
        return res.status(403).json({ error: "Telefone não confere com o agendamento." });
      }
      if (appt.status !== "scheduled" && appt.status !== "confirmed") {
        return res.status(400).json({ error: "Este agendamento não pode mais ser remarcado." });
      }

      const targetDate = toDateOnly(date);
      const duration = appt.duration || appt.service?.duration || 60;
      const resolvedEndTime = resolveEndTime(targetDate, startTime, null, duration);

      const targetStart = parse(`${format(targetDate, "yyyy-MM-dd")} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
      if (targetStart < addMinutes(new Date(), agendaSettings.minAdvanceMinutes || 0)) {
        return res.status(400).json({ error: "Horário muito próximo — escolha outro." });
      }
      const maxBookingDate = addDays(startOfDay(new Date()), agendaSettings.maxAdvanceDays);
      if (startOfDay(targetDate) > maxBookingDate) {
        return res.status(400).json({ error: "Data fora do período permitido para agendamento." });
      }

      await ensureSlotAvailable(tenantId, appt.professionalId, targetDate, startTime, resolvedEndTime, id);
      await ensureWithinWorkingHours(tenantId, appt.professionalId, targetDate, startTime, resolvedEndTime, agendaSettings);

      const updated = await (prisma as any).appointment.update({
        where: { id },
        data: { date: targetDate, startTime, endTime: resolvedEndTime },
        include: { client: { select: { id: true, name: true, phone: true } }, service: { select: { id: true, name: true, price: true } }, professional: { select: { id: true, name: true, phone: true } } },
      });
      emitToTenant(tenantId, "agenda:changed");
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async checkRecurrence(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório" });
    const { dates, professionalId, startTime, endTime: rawEndTime, serviceId } = req.body;
    
    if (!Array.isArray(dates) || dates.length === 0 || !professionalId || !startTime) {
      return res.status(400).json({ error: "Parâmetros incompletos para validação." });
    }

    try {
      console.log("[checkRecurrence] Body:", req.body);
      let endTime = rawEndTime;
      if (!endTime && serviceId) {
        const svc = await (prisma as any).service.findUnique({ where: { id: serviceId } });
        if (svc) {
          const start = parse(`2000-01-01 ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
          endTime = format(addMinutes(start, svc.duration || 30), "HH:mm");
        }
      }
      if (!endTime) endTime = format(addMinutes(parse(`2000-01-01 ${startTime}`, "yyyy-MM-dd HH:mm", new Date()), 30), "HH:mm");

      const settings = await ensureAgendaSettingsRecord(tenantId);
      
      const closedDays = await (prisma as any).closedDay.findMany({ where: { tenantId } });
      const specialDays = await (prisma as any).specialScheduleDay.findMany({ 
        where: { 
          tenantId, 
          OR: [
            { professionalId: null },
            { professionalId: professionalId }
          ],
          isClosed: true 
        } 
      });

      const parsedDates = dates.map((d: string) => toDateOnly(d));

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
        const dateObj = toDateOnly(d);
        const dateStr = formatDateOnly(dateObj);
        
        // 1. National holiday
        if (settings.blockNationalHolidays && isNationalHoliday(dateObj)) {
          conflicts.push({ date: d, reason: "holiday", message: "Feriado Nacional" });
          continue;
        }

        // 2. Closed Day
        const closed = closedDays.find((cd: any) => formatDateOnly(cd.date) === dateStr);
        if (closed) {
          conflicts.push({ date: d, reason: "closed", message: closed.description || "Dia Fechado" });
          continue;
        }

        // 3. Special Schedule Closed
        const special = specialDays.find((sd: any) => formatDateOnly(sd.date) === dateStr);
        if (special) {
          conflicts.push({ date: d, reason: "special_closed", message: special.description || "Profissional Ausente" });
          continue;
        }

        // 4. Existing Appointment Overlap
        const dayAppts = existingAppts.filter((a: any) => formatDateOnly(a.date) === dateStr);
        if (hasSlotOverlap(startTime, endTime, dayAppts)) {
          conflicts.push({ date: d, reason: "booked", message: "Horário Indisponível" });
          continue;
        }
      }

      res.json({ conflicts });
    } catch (e: any) {
      console.error("[checkRecurrence] Error:", e);
      res.status(400).json({ error: e.message || "Erro.", details: e.stack });
    }
  },

  async create(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
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
    if (!professionalId) return res.status(400).json({ error: "Nenhum profissional disponível." });

    try {
      const agendaSettings = await ensureAgendaSettingsRecord(tenantId);
      if (isPublicRequest && (!agendaSettings.onlineBookingEnabled || !agendaSettings.enableSelfService)) {
        return res.status(403).json({ error: "Autoagendamento desativado." });
      }
      if (isPublicRequest && (!clientId || !serviceId)) {
        return res.status(400).json({ error: "clientId e serviceId são obrigatórios no autoagendamento." });
      }

      const service = serviceId
        ? await (prisma as any).service.findFirst({ where: { id: serviceId, tenantId } })
        : null;
      if (serviceId && !service) {
        return res.status(404).json({ error: "Serviço não encontrado." });
      }

      const client = clientId
        ? await (prisma as any).client.findFirst({ where: { id: clientId, tenantId } })
        : null;
      if (clientId && !client) {
        return res.status(404).json({ error: "Cliente não encontrado." });
      }

      const professional = await (prisma as any).professional.findFirst({
        where: { id: professionalId, tenantId, isActive: true },
      });
      if (!professional) {
        return res.status(404).json({ error: "Profissional não encontrado." });
      }

      try {
        const assignedIds = JSON.parse(service?.professionalIds || "[]");
        if (Array.isArray(assignedIds) && assignedIds.length > 0 && !assignedIds.includes(professionalId)) {
          return res.status(400).json({ error: "Este profissional não atende o serviço selecionado." });
        }
      } catch {
        // Ignora JSON inválido em professionalIds.
      }

      const effectiveStatus = isPublicRequest
        ? (agendaSettings.autoConfirmAppointments ? "confirmed" : "scheduled")
        : (normalizeAppointmentStatus(status) || (agendaSettings.autoConfirmAppointments ? "confirmed" : "scheduled"));
      const baseDate = new Date(date);
      
      let count = 1;
      let interval = 7;
      if (!isPublicRequest && recurrence && recurrence.type !== "none") {
        count = recurrence.count || 1;
        // "weekly" é sempre a cada 7 dias — recurrence.interval nunca deve valer aqui, mesmo
        // que o cliente mande outro valor (o form sempre carrega interval:1 no state inicial,
        // reaproveitado de "custom"; sem essa trava um bloqueio "Semanal" virava diário).
        interval = recurrence.type === "weekly" ? 7 : (recurrence.interval || 1);
      } else if (isPublicRequest && repeat === "weekly") {
        count = Number(repeatCount) || 1;
      }
      
      const effectiveDuration = Number(duration) > 0 ? Number(duration) : Number(service?.duration || 60);
      
      const groupId = count > 1 ? randomUUID() : null;
      const results = [];
      const skipDatesList = Array.isArray(skipDates) ? skipDates : [];
      const conflictSkipped: { date: string; reason: string }[] = [];

      let createdCount = 0;
      for (let i = 0; i < count; i++) {
        const apptDate = addDays(baseDate, i * interval);
        const apptDateStr = format(apptDate, "yyyy-MM-dd");

        if (skipDatesList.includes(apptDateStr)) {
          continue;
        }

        const resolvedEndTime = resolveEndTime(apptDate, startTime, endTime, effectiveDuration);

        // Um conflito num dia isolado (ex: bloqueio de semana inteira onde 1 dia já tem
        // agendamento) não deve abortar o restante do lote — pula esse dia e segue.
        const effectiveType = type || "atendimento";
        let appt: any = null;
        try {
          appt = await (prisma as any).$transaction(async (tx: any) => {
            await lockProfessionalForBooking(tx, professionalId);
            await ensureSlotAvailable(tenantId, professionalId, apptDate, startTime, resolvedEndTime, undefined, tx);
            if (effectiveType !== "bloqueio") {
              await ensureWithinWorkingHours(tenantId, professionalId, apptDate, startTime, resolvedEndTime, agendaSettings);
            }
            createdCount++;
            return tx.appointment.create({
              data: {
                id: randomUUID(),
                date: apptDate,
                startTime,
                endTime: resolvedEndTime,
                status: effectiveStatus,
                type: isPublicRequest ? "atendimento" : (type || "atendimento"),
                clientId: clientId || null,
                serviceId: serviceId || null,
                professionalId,
                comandaId: isPublicRequest ? null : (comandaId || null),
                duration: effectiveDuration,
                notes: isPublicRequest ? null : (notes || null),
                tenantId, sessionNumber: createdCount, totalSessions: count - skipDatesList.length, repeatGroupId: groupId,
              },
              include: { client: { select: { id: true, name: true, phone: true } }, service: { select: { id: true, name: true, price: true } }, professional: { select: { id: true, name: true, phone: true } } }
            });
          });
        } catch (slotError: any) {
          conflictSkipped.push({ date: apptDateStr, reason: slotError.message || "Horário indisponível." });
          continue;
        }
        results.push(appt);

        if (effectiveStatus === "scheduled" || effectiveStatus === "confirmed") {
          await handleAppointmentStockReservation(appt.serviceId, "reserve");
        }
      }

      // Se algum dia foi pulado por conflito, o total de sessões gravado em cada linha
      // (calculado antes do loop) fica desatualizado — corrige pro total real criado.
      if (groupId && conflictSkipped.length > 0 && results.length > 0) {
        await (prisma as any).appointment.updateMany({
          where: { repeatGroupId: groupId, tenantId },
          data: { totalSessions: results.length },
        });
      }

      if (results.length === 0) {
        return res.status(400).json({
          error: "Nenhum horário pôde ser criado — todos os dias selecionados já têm conflito.",
          skipped: conflictSkipped,
        });
      }

      // Notifica profissional (se o agendamento está ativo) e cliente (se confirmado, ou pendente de
      // confirmação) — criação retroativa via API com status "done"/"cancelled" direto não deveria
      // avisar ninguém de um "novo agendamento" que já nasce encerrado. Também exige cliente E
      // serviço vinculados: um agendamento criado pelo admin sem esses dados (bloqueio de horário,
      // rascunho de teste) gerava uma notificação com "Cliente/Serviço/Valor" em branco pro
      // profissional — sem os dois preenchidos não há nada de útil pra avisar.
      const hasClientAndService = Boolean(clientId && serviceId);
      if (tenantId && results.length > 0 && hasClientAndService) {
        if (effectiveStatus === "scheduled" || effectiveStatus === "confirmed") {
          fireWppProfNewBooking(tenantId, results).catch(e => console.error("Erro wpp prof:", e));
        }
        if (effectiveStatus === "confirmed") {
          fireWppConfirmationCentral(tenantId, results).catch(e => console.error("Erro wpp client:", e));
        } else if (effectiveStatus === "scheduled") {
          fireWppPending(tenantId, results).catch(e => console.error("Erro wpp pending:", e));
        }
      }

      emitToTenant(tenantId, "agenda:changed");
      res.json({ ...results[0], skipped: conflictSkipped });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async update(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    const { date, startTime, endTime, clientId, serviceId, professionalId, status: rawStatus, notes, duration, type } = req.body;
    const status = normalizeAppointmentStatus(rawStatus);
    try {
      const oldAppt = await (prisma as any).appointment.findUnique({ where: { id: req.params.id } });

      if (oldAppt && tenantId) {
        const effectiveType = type !== undefined ? type : oldAppt.type;
        const effectiveStatus = status !== undefined ? status : oldAppt.status;
        const scheduleChanged = date !== undefined || startTime !== undefined || endTime !== undefined || professionalId !== undefined;
        const isActiveStatus = effectiveStatus === "scheduled" || effectiveStatus === "confirmed";

        if (scheduleChanged && effectiveType !== "bloqueio" && isActiveStatus) {
          const effectiveDate = date !== undefined ? new Date(date) : oldAppt.date;
          const effectiveStartTime = startTime !== undefined ? startTime : oldAppt.startTime;
          const effectiveEndTime = endTime !== undefined ? endTime : oldAppt.endTime;
          const effectiveProfessionalId = professionalId !== undefined ? professionalId : oldAppt.professionalId;
          await ensureSlotAvailable(tenantId, effectiveProfessionalId, effectiveDate, effectiveStartTime, effectiveEndTime, req.params.id);
          const agendaSettings = await ensureAgendaSettingsRecord(tenantId);
          await ensureWithinWorkingHours(tenantId, effectiveProfessionalId, effectiveDate, effectiveStartTime, effectiveEndTime, agendaSettings);
        }
      }

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
          await handleAppointmentDone(oldSvc, tenantId, req.params.id, oldAppt.comandaId);
          await syncComandaSessionProgress(oldAppt.comandaId);
        } else if (oldIsActive && !newIsActive) {
          await handleAppointmentStockReservation(oldSvc, "release");
        } else if (!oldIsActive && newIsActive) {
          await handleAppointmentStockReservation(newSvc, "reserve");
        } else if (oldIsActive && newIsActive && oldSvc !== newSvc) {
          await handleAppointmentStockReservation(oldSvc, "release");
          await handleAppointmentStockReservation(newSvc, "reserve");
        }
      }

      if (status === "confirmed" && oldAppt?.status !== "confirmed" && appt.tenantId) {
        if (appt?.client?.phone && tryClaimWppConfirmation(appt.id)) {
          fireWppConfirmation(appt.tenantId, appt).catch((e) => console.error("[WPP] Falha ao enviar confirmacao:", e?.message || e));
        }
        if (appt?.professional?.phone) {
          fireWppProfConfirmed(appt.tenantId, appt).catch((e) => console.error("[WPP] Falha ao notificar profissional:", e?.message || e));
        }
      }
      if (tenantId) emitToTenant(tenantId, "agenda:changed");
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
      if (req.body[key] === undefined) continue;
      if (key === "date") data[key] = new Date(req.body[key]);
      else if (key === "status") data[key] = normalizeAppointmentStatus(req.body[key]);
      else data[key] = req.body[key];
    }

    try {
      const oldAppt = await (prisma as any).appointment.findUnique({ 
        where: { id: req.params.id },
        include: { service: true }
      });
      if (!oldAppt) return res.status(404).json({ error: "Agendamento não encontrado." });

      const where: any = { id: req.params.id, tenantId: tenantId || undefined };
      const confirmAll = req.body.confirmAllRecurrences && oldAppt.repeatGroupId;

      if (confirmAll) {
        where.repeatGroupId = oldAppt.repeatGroupId;
        delete where.id;
        where.status = "scheduled";
      }

      if (tenantId && !confirmAll) {
        const effectiveStatus = data.status !== undefined ? data.status : oldAppt.status;
        const scheduleChanged = data.date !== undefined || data.startTime !== undefined || data.endTime !== undefined || data.professionalId !== undefined;
        const isActiveStatus = effectiveStatus === "scheduled" || effectiveStatus === "confirmed";

        if (scheduleChanged && oldAppt.type !== "bloqueio" && isActiveStatus) {
          const effectiveDate = data.date !== undefined ? data.date : oldAppt.date;
          const effectiveStartTime = data.startTime !== undefined ? data.startTime : oldAppt.startTime;
          const effectiveEndTime = data.endTime !== undefined ? data.endTime : oldAppt.endTime;
          const effectiveProfessionalId = data.professionalId !== undefined ? data.professionalId : oldAppt.professionalId;
          await ensureSlotAvailable(tenantId, effectiveProfessionalId, effectiveDate, effectiveStartTime, effectiveEndTime, req.params.id);
          const agendaSettings = await ensureAgendaSettingsRecord(tenantId);
          await ensureWithinWorkingHours(tenantId, effectiveProfessionalId, effectiveDate, effectiveStartTime, effectiveEndTime, agendaSettings);
        }
      }

      await (prisma as any).appointment.updateMany({ where, data });
      
      const appt = await (prisma as any).appointment.findFirst({
        where: { id: req.params.id },
        include: { 
          client: { select: { id: true, name: true, phone: true } }, 
          service: { select: { id: true, name: true, price: true } }, 
          professional: { select: { id: true, name: true, phone: true } } 
        }
      });

      // Lógica de Estoque e Notificações
      const statusToUse = data.status !== undefined ? data.status : oldAppt.status;
      const svcToUse = req.body.serviceId !== undefined ? req.body.serviceId : oldAppt.serviceId;
      const oldIsActive = oldAppt.status === "scheduled" || oldAppt.status === "confirmed";
      const newIsActive = statusToUse === "scheduled" || statusToUse === "confirmed";

      if (statusToUse === "done" && oldAppt.status !== "done") {
        await handleAppointmentDone(oldAppt.serviceId, tenantId, req.params.id, oldAppt.comandaId);
        await syncComandaSessionProgress(oldAppt.comandaId);
      } else if (oldIsActive && !newIsActive) {
        await handleAppointmentStockReservation(oldAppt.serviceId, "release");
      } else if (!oldIsActive && newIsActive) {
        await handleAppointmentStockReservation(svcToUse, "reserve");
      } else if (oldIsActive && newIsActive && oldAppt.serviceId !== svcToUse) {
        await handleAppointmentStockReservation(oldAppt.serviceId, "release");
        await handleAppointmentStockReservation(svcToUse, "reserve");
      }

      // Notificação via WPP — "confirmar todas as sessões" confirma o grupo inteiro no banco
      // (where.repeatGroupId acima), mas sem isso a notificação só buscava e listava a sessão
      // clicada (req.params.id): o cabeçalho dizia "Sessões (N)" só com 1 linha, sempre "1ª",
      // nunca as outras N-1 datas. Busca o grupo inteiro pra notificação bater com o que foi
      // confirmado de verdade.
      if (statusToUse === "confirmed" && oldAppt.status !== "confirmed" && appt.tenantId) {
        const notifyPayload = confirmAll
          ? await (prisma as any).appointment.findMany({
              where: { repeatGroupId: oldAppt.repeatGroupId, tenantId },
              orderBy: { date: "asc" },
              include: { client: { select: { id: true, name: true, phone: true } }, service: { select: { id: true, name: true, price: true } }, professional: { select: { id: true, name: true, phone: true } } },
            })
          : appt;
        if (appt?.client?.phone && tryClaimWppConfirmation(appt.id)) {
          fireWppConfirmation(appt.tenantId, notifyPayload).catch((e) => console.error("[WPP] Falha ao enviar confirmacao:", e?.message || e));
        }
        if (appt?.professional?.phone) {
          fireWppProfConfirmed(appt.tenantId, notifyPayload).catch((e) => console.error("[WPP] Falha ao notificar profissional:", e?.message || e));
        }
      }

      if (tenantId) emitToTenant(tenantId, "agenda:changed");
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
      if (tenantId) emitToTenant(tenantId, "agenda:changed");
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || "Erro." });
    }
  },

  async getGroup(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
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

  // Pausa/retoma uma série de bloqueios (repeatGroupId) sem excluir nada — pausar marca as
  // ocorrências futuras como "cancelled" (todo o resto do sistema já ignora esse status ao
  // checar disponibilidade, ver ensureSlotAvailable/getAvailability), liberando o horário de
  // verdade; retomar volta pra "confirmed". Só mexe em ocorrências >= hoje, pra não reescrever
  // histórico nem re-bloquear dias que já passaram.
  async setGroupStatus(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { paused } = req.body;
    const groupId = req.params.groupId;
    try {
      const today = startOfDay(new Date());
      const occurrences = await (prisma as any).appointment.findMany({
        where: { repeatGroupId: groupId, tenantId, type: "bloqueio", date: { gte: today } },
        select: { id: true, professionalId: true, date: true, startTime: true, endTime: true },
      });
      if (occurrences.length === 0) return res.json({ success: true, updated: 0, skipped: 0 });

      if (paused) {
        await (prisma as any).appointment.updateMany({
          where: { id: { in: occurrences.map((o: any) => o.id) } },
          data: { status: "cancelled" },
        });
        emitToTenant(tenantId, "agenda:changed");
        return res.json({ success: true, updated: occurrences.length, skipped: 0 });
      }

      // Retomar: um agendamento real pode ter sido criado nesse horário enquanto o bloqueio
      // estava pausado — reativar sem checar duplicaria a ocupação do horário. Pula (não
      // reativa) qualquer ocorrência que hoje colida com outro agendamento não-cancelado.
      let updated = 0;
      let skipped = 0;
      for (const occ of occurrences) {
        const { start, end } = getDayRange(occ.date);
        const conflicting = await (prisma as any).appointment.findMany({
          where: {
            tenantId, professionalId: occ.professionalId,
            date: { gte: start, lt: end },
            status: { notIn: ["cancelled", "canceled", "cancelado"] },
            id: { not: occ.id },
          },
          select: { startTime: true, endTime: true },
        });
        if (hasSlotOverlap(occ.startTime, occ.endTime, conflicting)) { skipped++; continue; }
        await (prisma as any).appointment.update({ where: { id: occ.id }, data: { status: "confirmed" } });
        updated++;
      }
      emitToTenant(tenantId, "agenda:changed");
      res.json({ success: true, updated, skipped });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async batchDelete(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "ids obrigatório." });
    try {
      await (prisma as any).appointment.deleteMany({ where: { id: { in: ids }, tenantId } });
      emitToTenant(tenantId, "agenda:changed");
      res.json({ success: true, deleted: ids.length });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // â”€â”€ PAT PÃšBLICO (SEM AUTH) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async getPatGeneral(req: Request, res: Response) {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: "Slug obrigatório." });

    try {
      const tenant = await (prisma as any).tenant.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });
      if (!tenant) return res.status(404).json({ error: "Estúdio não encontrado." });

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
    if (!professionalId) return res.status(400).json({ error: "professionalId obrigatório." });
    try {
      const prof = await (prisma as any).professional.findUnique({
        where: { id: professionalId },
        select: { id: true, name: true, role: true, tenantId: true, photo: true },
      });
      if (!prof) return res.status(404).json({ error: "Profissional não encontrado." });

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
    if (!appointmentId || !status) return res.status(400).json({ error: "appointmentId e status obrigatórios." });

    try {
      const oldAppt = await (prisma as any).appointment.findUnique({ where: { id: appointmentId }, select: { status: true } });
      const wasActive = oldAppt && (oldAppt.status === "scheduled" || oldAppt.status === "confirmed");

      const appt = await (prisma as any).appointment.update({
        where: { id: appointmentId },
        data: { status },
        include: { client: { select: { name: true } }, service: { select: { name: true } } }
      });

      // "performed" (finalizado pelo terminal) precisa da MESMA baixa de estoque real que o
      // admin dispara ao marcar um agendamento como concluído — antes só liberava a reserva sem
      // nunca deduzir o produto de verdade, então atendimentos fechados pelo PAT não geravam
      // nenhum consumo de estoque.
      if (wasActive && status === "performed") {
        await handleAppointmentDone(appt.serviceId, appt.tenantId, appointmentId, appt.comandaId);
        await syncComandaSessionProgress(appt.comandaId);
      } else if (wasActive && (status === "missed" || status === "cancelled")) {
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
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
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
      res.status(500).json({ error: e?.message || "Erro ao carregar configurações." });
    }
  },

  async updateSettings(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
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
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { date, startTime, endTime, professionalId, description } = req.body;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: "Campos obrigatórios." });
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
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
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

  // ── FOLGA DO PROFISSIONAL (autoatendimento) ──────────────────────────────
  // Reaproveita SpecialScheduleDay (já respeitado por getAvailability e por
  // ensureWithinWorkingHours em create/update/patch) mas com rotas e checagem de
  // dono dedicadas — o CRUD acima (saveSpecialDay/deleteSpecialDay) é tenant-wide
  // sem essa trava e continua sendo só a ferramenta administrativa.
  async listProfessionalTimeOff(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const professionalId = req.params.id;
    const requester = (req as any).auth;
    if (requester?.type === "professional" && requester.sub !== professionalId) {
      return res.status(403).json({ error: "Você só pode ver sua própria agenda." });
    }
    try {
      const professional = await (prisma as any).professional.findFirst({ where: { id: professionalId, tenantId } });
      if (!professional) return res.status(404).json({ error: "Profissional não encontrado." });

      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT sd.*, p.name AS professionalName FROM SpecialScheduleDay sd LEFT JOIN Professional p ON p.id = sd.professionalId
         WHERE sd.tenantId = ? AND sd.professionalId = ? AND sd.isClosed = 1 AND sd.date >= ? ORDER BY sd.date ASC`,
        tenantId, professionalId, startOfDay(new Date())
      );
      res.json(rows.map(mapSpecialScheduleDay));
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro." });
    }
  },

  async createProfessionalTimeOff(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const professionalId = req.params.id;
    const requester = (req as any).auth;
    if (requester?.type === "professional" && requester.sub !== professionalId) {
      return res.status(403).json({ error: "Você só pode gerenciar sua própria agenda." });
    }
    const { dates, description } = req.body;
    if (!Array.isArray(dates) || dates.length === 0) return res.status(400).json({ error: "dates obrigatório." });
    if (dates.length > 60) return res.status(400).json({ error: "Máximo de 60 dias por vez." });

    try {
      const professional = await (prisma as any).professional.findFirst({ where: { id: professionalId, tenantId } });
      if (!professional) return res.status(404).json({ error: "Profissional não encontrado." });

      const created: any[] = [];
      const conflicts: { date: string; appointments: any[] }[] = [];

      for (const rawDate of dates) {
        const targetDate = toDateOnly(rawDate);
        const { start, end } = getDayRange(targetDate);

        const existingConflicts = await (prisma as any).appointment.findMany({
          where: {
            tenantId, professionalId, date: { gte: start, lt: end },
            type: { not: "bloqueio" }, status: { in: ["scheduled", "confirmed"] },
          },
          include: { client: { select: { name: true } } },
          orderBy: { startTime: "asc" },
        });
        if (existingConflicts.length > 0) {
          conflicts.push({
            date: format(targetDate, "yyyy-MM-dd"),
            appointments: existingConflicts.map((a: any) => ({ id: a.id, startTime: a.startTime, clientName: a.client?.name || "Cliente" })),
          });
        }

        const existing: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT id FROM SpecialScheduleDay WHERE tenantId=? AND date>=? AND date<? AND professionalId=? LIMIT 1`,
          tenantId, start, end, professionalId
        );
        const id = existing[0]?.id || randomUUID();
        if (existing.length > 0) {
          await (prisma as any).$executeRawUnsafe(
            `UPDATE SpecialScheduleDay SET isClosed=1, startTime=NULL, endTime=NULL, description=? WHERE id=? AND tenantId=?`,
            description || "Folga", id, tenantId
          );
        } else {
          await (prisma as any).$executeRawUnsafe(
            `INSERT INTO SpecialScheduleDay (id, tenantId, professionalId, date, isClosed, startTime, endTime, description) VALUES (?, ?, ?, ?, 1, NULL, NULL, ?)`,
            id, tenantId, professionalId, targetDate, description || "Folga"
          );
        }
        const rows: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT sd.*, p.name AS professionalName FROM SpecialScheduleDay sd LEFT JOIN Professional p ON p.id = sd.professionalId WHERE sd.id = ? LIMIT 1`,
          id
        );
        created.push(mapSpecialScheduleDay(rows[0]));
      }

      emitToTenant(tenantId, "agenda:changed");
      emitToTenant(tenantId, "professional:timeoff", { professionalId, professionalName: professional.name, dates: created.map((c) => c.date) });

      res.json({ created, conflicts });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro." });
    }
  },

  async deleteProfessionalTimeOff(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const professionalId = req.params.id;
    const requester = (req as any).auth;
    if (requester?.type === "professional" && requester.sub !== professionalId) {
      return res.status(403).json({ error: "Você só pode gerenciar sua própria agenda." });
    }
    try {
      await (prisma as any).$executeRawUnsafe(
        `DELETE FROM SpecialScheduleDay WHERE id=? AND tenantId=? AND professionalId=?`,
        req.params.specialDayId, tenantId, professionalId
      );
      emitToTenant(tenantId, "agenda:changed");
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro." });
    }
  },

  // WORKING HOURS
  async getWorkingHours(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const requestedId = req.query.professionalId as string | undefined;
      let prof = requestedId
        ? await (prisma as any).professional.findFirst({ where: { id: requestedId, tenantId } })
        : null;
      if (!prof) prof = await (prisma as any).professional.findFirst({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } });
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
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { hours, professionalId } = req.body;
    try {
      let profId: string | undefined = professionalId;
      if (profId) {
        const prof = await (prisma as any).professional.findFirst({ where: { id: profId, tenantId } });
        if (!prof) return res.status(404).json({ error: "Profissional não encontrado." });
      } else {
        const prof = await (prisma as any).professional.findFirst({ where: { tenantId, isActive: true }, orderBy: { name: "asc" } });
        profId = prof?.id;
      }
      if (!profId) return res.status(400).json({ error: "Nenhum profissional disponível." });

      for (const h of (hours || [])) {
        // Só reaproveita o id se a linha realmente pertencer a ESSE profissional —
        // evita sobrescrever o horário de outro profissional por engano.
        const existing = h.id && !h.id.startsWith("default-")
          ? await (prisma as any).workingHours.findFirst({ where: { id: h.id, professionalId: profId } })
          : null;
        if (existing) {
          await (prisma as any).workingHours.update({ where: { id: h.id }, data: { isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime, breakStart: h.breakStart, breakEnd: h.breakEnd } });
        } else {
          await (prisma as any).workingHours.create({
            data: { id: randomUUID(), dayOfWeek: h.dayOfWeek, isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime, breakStart: h.breakStart, breakEnd: h.breakEnd, professionalId: profId },
          });
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
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const days = await (prisma as any).closedDay.findMany({ where: { tenantId }, orderBy: { date: "asc" } });
      res.json(days.map((d: any) => ({ id: d.id, date: format(d.date, "yyyy-MM-dd"), name: d.description || "" })));
    } catch (e: any) {
      res.status(500).json({ error: "Erro." });
    }
  },

  async createClosedDay(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { date, name } = req.body;
    try {
      const day = await (prisma as any).closedDay.create({ data: { id: randomUUID(), date: toDateOnly(date), description: name || null, tenantId } });
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
