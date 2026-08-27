import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { addDays, addWeeks, addMonths, addYears, setDate, getDaysInMonth, startOfMonth, endOfMonth, parse } from "date-fns";
import { getTenantId } from "../utils/helpers";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addByUnit(date: Date, unit: string, n: number): Date {
  switch (unit) {
    case "day": return addDays(date, n);
    case "week": return addWeeks(date, n);
    case "year": return addYears(date, n);
    case "month":
    default: return addMonths(date, n);
  }
}

function snapDayOfMonth(date: Date, dayOfMonth?: number | null): Date {
  if (!dayOfMonth) return date;
  const clamped = Math.min(dayOfMonth, getDaysInMonth(date));
  return setDate(date, clamped);
}

/** Gera as datas de vencimento de uma série a partir da 1ª ocorrência. */
function buildOccurrenceDates(startDate: Date, unit: string, dayOfMonth: number | null | undefined, count: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    let d = addByUnit(startDate, unit, i);
    if (unit === "month") d = snapDayOfMonth(d, dayOfMonth);
    dates.push(d);
  }
  return dates;
}

/** Juros calculados na hora (não fica armazenado) a partir dos dias/horas de atraso. */
function computeInterest(occurrence: { amount: number; dueDate: Date; status: string }, bill: { interestRate?: number | null; interestPeriod?: string | null }, now: Date): number {
  if (occurrence.status !== "pending") return 0;
  if (!bill.interestRate || !bill.interestPeriod) return 0;
  const msLate = now.getTime() - new Date(occurrence.dueDate).getTime();
  if (msLate <= 0) return 0;
  const rate = bill.interestRate / 100;
  const HOUR = 3_600_000, DAY = 86_400_000;
  switch (bill.interestPeriod) {
    case "hour": return occurrence.amount * rate * (msLate / HOUR);
    case "day": return occurrence.amount * rate * (msLate / DAY);
    case "year": return occurrence.amount * rate * (msLate / (DAY * 365));
    case "month":
    default: return occurrence.amount * rate * (msLate / (DAY * 30));
  }
}

function decorateOccurrence(occ: any, now: Date) {
  const interestAmount = Math.round(computeInterest(occ, occ.bill, now) * 100) / 100;
  const isOverdue = occ.status === "pending" && new Date(occ.dueDate) < now;
  return {
    ...occ,
    isOverdue,
    daysLate: isOverdue ? Math.floor((now.getTime() - new Date(occ.dueDate).getTime()) / 86_400_000) : 0,
    interestAmount,
    totalWithInterest: Math.round((occ.amount + interestAmount) * 100) / 100,
  };
}

const UNBOUNDED_INITIAL_BATCH = 1;

export const billController = {
  // ─── Categorias ────────────────────────────────────────────────────────────

  async listCategories(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { direction } = req.query;
    try {
      const categories = await (prisma as any).billCategory.findMany({
        where: { tenantId, isActive: true, ...(direction ? { direction } : {}) },
        orderBy: { name: "asc" },
      });
      res.json(categories);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async createCategory(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { name, direction, color } = req.body;
    if (!name || !direction) return res.status(400).json({ error: "Nome e direção são obrigatórios." });
    try {
      const category = await (prisma as any).billCategory.create({
        data: { id: randomUUID(), tenantId, name, direction, color: color || null },
      });
      res.json(category);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async deleteCategory(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const inUse = await (prisma as any).bill.count({ where: { categoryId: req.params.id, tenantId } });
      if (inUse > 0) {
        await (prisma as any).billCategory.updateMany({ where: { id: req.params.id, tenantId }, data: { isActive: false } });
      } else {
        await (prisma as any).billCategory.deleteMany({ where: { id: req.params.id, tenantId } });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // ─── Contas (Bill + ocorrências) ───────────────────────────────────────────

  async listBills(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { direction, month } = req.query;
    try {
      const monthDate = month ? parse(`${month}-01`, "yyyy-MM-dd", new Date()) : new Date();
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const billFilter = direction ? { direction: direction as string } : {};

      const [current, overdue] = await Promise.all([
        (prisma as any).billOccurrence.findMany({
          where: { tenantId, dueDate: { gte: monthStart, lte: monthEnd }, status: { not: "cancelled" }, bill: billFilter },
          include: { bill: { include: { category: true } } },
          orderBy: { dueDate: "asc" },
        }),
        (prisma as any).billOccurrence.findMany({
          where: { tenantId, status: "pending", dueDate: { lt: monthStart }, bill: billFilter },
          include: { bill: { include: { category: true } } },
          orderBy: { dueDate: "asc" },
        }),
      ]);

      const now = new Date();
      res.json({
        current: current.map((o: any) => decorateOccurrence(o, now)),
        overdue: overdue.map((o: any) => decorateOccurrence(o, now)),
      });
    } catch (e: any) {
      console.error("[GET /api/finance/bills]", e);
      res.status(500).json({ error: e.message });
    }
  },

  async createBill(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const {
      direction, description, categoryId, amount, amountType,
      dueDate, isRecurring, recurrenceUnit, recurrenceCount, dayOfMonth,
      interestRate, interestPeriod, notes,
    } = req.body;

    if (!direction || !description || !dueDate) {
      return res.status(400).json({ error: "Direção, descrição e vencimento são obrigatórios." });
    }

    try {
      const billId = randomUUID();
      const baseAmount = Number(amount) || 0;
      const recurring = !!isRecurring;
      const unit = recurring ? (recurrenceUnit || "month") : null;
      const boundedCount = recurring ? (Number(recurrenceCount) > 0 ? Number(recurrenceCount) : null) : 1;

      await (prisma as any).bill.create({
        data: {
          id: billId, tenantId, direction, description,
          categoryId: categoryId || null,
          amount: baseAmount,
          amountType: amountType === "variable" ? "variable" : "fixed",
          isRecurring: recurring,
          recurrenceUnit: unit,
          recurrenceCount: recurring ? boundedCount : null,
          dayOfMonth: recurring && unit === "month" ? (Number(dayOfMonth) || null) : null,
          interestRate: interestRate !== undefined && interestRate !== "" ? Number(interestRate) : null,
          interestPeriod: interestRate ? (interestPeriod || "month") : null,
          notes: notes || null,
        },
      });

      const startDate = new Date(dueDate);
      const materializeCount = boundedCount ?? UNBOUNDED_INITIAL_BATCH;
      const dates = buildOccurrenceDates(startDate, unit || "month", dayOfMonth, materializeCount);

      await (prisma as any).billOccurrence.createMany({
        data: dates.map((d, i) => ({
          id: randomUUID(), billId, tenantId, sequence: i + 1, dueDate: d, amount: baseAmount, status: "pending",
        })),
      });

      const bill = await (prisma as any).bill.findUnique({ where: { id: billId }, include: { category: true, occurrences: true } });
      res.json(bill);
    } catch (e: any) {
      console.error("[POST /api/finance/bills]", e);
      res.status(400).json({ error: e.message });
    }
  },

  async updateBill(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { description, categoryId, amount, interestRate, interestPeriod, notes, isActive } = req.body;
    try {
      const data: any = {};
      if (description !== undefined) data.description = description;
      if (categoryId !== undefined) data.categoryId = categoryId || null;
      if (amount !== undefined) data.amount = Number(amount) || 0;
      if (interestRate !== undefined) data.interestRate = interestRate === "" ? null : Number(interestRate);
      if (interestPeriod !== undefined) data.interestPeriod = interestPeriod || null;
      if (notes !== undefined) data.notes = notes || null;
      if (isActive !== undefined) data.isActive = !!isActive;

      await (prisma as any).bill.updateMany({ where: { id: req.params.id, tenantId }, data });
      const bill = await (prisma as any).bill.findFirst({ where: { id: req.params.id, tenantId }, include: { category: true } });
      res.json(bill);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async deleteBill(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).bill.deleteMany({ where: { id: req.params.id, tenantId } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  // ─── Ocorrências ────────────────────────────────────────────────────────────

  async updateOccurrence(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { amount, status, paidAmount, paidAt } = req.body;
    try {
      const data: any = {};
      if (amount !== undefined) data.amount = Number(amount) || 0;
      if (status !== undefined) {
        data.status = status;
        if (status === "paid") {
          data.paidAt = paidAt ? new Date(paidAt) : new Date();
          data.paidAmount = paidAmount !== undefined ? Number(paidAmount) : undefined;
        } else {
          data.paidAt = null;
          data.paidAmount = null;
        }
      }
      await (prisma as any).billOccurrence.updateMany({ where: { id: req.params.id, tenantId }, data });
      const occ = await (prisma as any).billOccurrence.findFirst({ where: { id: req.params.id, tenantId }, include: { bill: { include: { category: true } } } });
      res.json(occ ? decorateOccurrence(occ, new Date()) : null);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },

  async deleteOccurrence(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).billOccurrence.deleteMany({ where: { id: req.params.id, tenantId } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  },
};

export { computeInterest };
