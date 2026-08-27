import { randomUUID } from "crypto";
import { addDays, addWeeks, addMonths, addYears, setDate, getDaysInMonth } from "date-fns";
import { prisma } from "../prisma";

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

/**
 * Roda uma vez por dia (chamado a partir de server.ts). Contas recorrentes "sem fim"
 * (recurrenceCount nulo) só têm a próxima ocorrência materializada quando a última
 * já venceu — evita gerar centenas de linhas de uma vez pra uma conta que se repete
 * pra sempre (ex: aluguel).
 */
export async function runBillRecurrenceCheck(): Promise<void> {
  const bills = await (prisma as any).bill.findMany({
    where: { isActive: true, isRecurring: true, recurrenceCount: null },
    include: { occurrences: { orderBy: { dueDate: "desc" }, take: 1 } },
  });

  const now = new Date();
  for (const bill of bills) {
    try {
      const last = bill.occurrences[0];
      if (!last) continue; // conta criada sem nenhuma ocorrência (não deveria acontecer)
      if (new Date(last.dueDate) >= now) continue; // ainda não venceu a última — nada a gerar

      let nextDate = addByUnit(new Date(last.dueDate), bill.recurrenceUnit || "month", 1);
      if ((bill.recurrenceUnit || "month") === "month") nextDate = snapDayOfMonth(nextDate, bill.dayOfMonth);

      await (prisma as any).billOccurrence.create({
        data: {
          id: randomUUID(),
          billId: bill.id,
          tenantId: bill.tenantId,
          sequence: (last.sequence || 1) + 1,
          dueDate: nextDate,
          amount: bill.amount,
          status: "pending",
        },
      });
      console.log(`[BillRecurrence] Nova ocorrência gerada: ${bill.description} (${bill.id})`);
    } catch (e) {
      console.error(`[BillRecurrence] Falha ao gerar ocorrência pra ${bill.id}:`, e);
    }
  }
}
