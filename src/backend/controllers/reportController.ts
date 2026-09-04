import { Request, Response } from "express";
import { prisma } from "../prisma";
import { startOfMonth, endOfMonth } from "date-fns";
import { getTenantId, endOfDayInclusive } from "../utils/helpers";

export const reportController = {
  async professionalReport(req: Request, res: Response) {
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
      if (to) dateFilter.lte = endOfDayInclusive(to as string);

      // Receita via CashEntry (fonte única de "realizado" — mesma base usada no Financeiro),
      // não Comanda.total direto: evita divergir do resto do sistema em pagamentos parciais.
      const dateFrom = dateFilter.gte || new Date(0);
      const dateTo = dateFilter.lte || new Date();
      const receitaRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT c.professionalId, COUNT(DISTINCT c.id) as totalComandas, COALESCE(SUM(ce.amount), 0) as totalRevenue
         FROM CashEntry ce
         JOIN Comanda c ON c.id = ce.comandaId
         WHERE ce.tenantId = ? AND ce.type = 'income' AND ce.comandaId IS NOT NULL
           AND ce.date >= ? AND ce.date <= ?
         GROUP BY c.professionalId`,
        tenantId, dateFrom, dateTo
      );
      const receitaByProf = new Map(receitaRows.map((r: any) => [r.professionalId, r]));

      const appointments = await (prisma as any).appointment.findMany({
        where: { tenantId, status: { not: "cancelled" }, ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }) },
        select: { id: true, professionalId: true, status: true, date: true }
      });

      const result = professionals.map((prof: any) => {
        const rev = receitaByProf.get(prof.id);
        const totalRevenue = Number(rev?.totalRevenue || 0);
        const totalComandas = Number(rev?.totalComandas || 0);
        const profAppts = appointments.filter((a: any) => a.professionalId === prof.id);
        const avgTicket = totalComandas > 0 ? totalRevenue / totalComandas : 0;
        // Status reais em uso: scheduled/confirmed/done/performed/missed/noshow/cancelled —
        // 'realizado' nunca existiu de fato, era dead code que nunca dava match.
        const performed = profAppts.filter((a: any) => a.status === 'done' || a.status === 'performed').length;
        return { ...prof, totalRevenue, avgTicket, totalComandas, totalAppointments: profAppts.length, performedAppointments: performed };
      });
      result.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  },

  async profitabilityReport(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to } = req.query;
    try {
      const fromDate = from ? new Date(from as string) : startOfMonth(new Date());
      const toDate = to ? endOfDayInclusive(to as string) : endOfMonth(new Date());

      let grossRevenue = 0;
      try {
        const revenueRows: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT SUM(total) as revenue, COUNT(*) as count FROM Comanda WHERE tenantId = ? AND status = 'paid' AND createdAt >= ? AND createdAt <= ?`,
          tenantId, fromDate, toDate
        );
        grossRevenue = Number(revenueRows[0]?.revenue) || 0;
      } catch (e) { console.error("Error in revenue query", e); }

      let totalCOGS = 0;
      try {
        const costRows: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT ci.quantity as itemQty, sp.quantity as prodPerSvc, p.costPrice FROM ComandaItem ci JOIN Comanda c ON ci.comandaId = c.id JOIN ServiceProduct sp ON ci.serviceId = sp.serviceId JOIN Product p ON sp.productId = p.id WHERE c.tenantId = ? AND c.status = 'paid' AND c.createdAt >= ? AND c.createdAt <= ?`,
          tenantId, fromDate, toDate
        );
        totalCOGS = costRows.reduce((acc, row) => acc + (Number(row.itemQty) * Number(row.prodPerSvc) * Number(row.costPrice)), 0);
      } catch { /* table/column may not exist yet */ }

      let totalCommissions = 0;
      let totalTaxes = 0;
      try {
        const commTaxRows: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT ci.total as itemTotal, s.commissionValue, s.commissionType, s.taxRate FROM ComandaItem ci JOIN Comanda c ON ci.comandaId = c.id JOIN Service s ON ci.serviceId = s.id WHERE c.tenantId = ? AND c.status = 'paid' AND c.createdAt >= ? AND c.createdAt <= ?`,
          tenantId, fromDate, toDate
        );
        commTaxRows.forEach(row => {
          const itemTotal = Number(row.itemTotal) || 0;
          totalTaxes += itemTotal * (Number(row.taxRate || 0) / 100);
          if (row.commissionType === 'percentage') totalCommissions += itemTotal * (Number(row.commissionValue || 0) / 100);
          else totalCommissions += Number(row.commissionValue || 0);
        });
      } catch { /* table/column may not exist yet */ }

      let otherExpenses = 0;
      try {
        const expenseRows: any[] = await (prisma as any).$queryRawUnsafe(
          `SELECT SUM(amount) as expenses FROM CashEntry WHERE tenantId = ? AND type = 'expense' AND date >= ? AND date <= ?`,
          tenantId, fromDate, toDate
        );
        otherExpenses = Number(expenseRows[0]?.expenses) || 0;
      } catch { /* CashEntry table may not exist */ }

      // Contas a Pagar/Receber (Bill/BillOccurrence) pagas no período, somadas à parte
      // pra não se misturar com o lançamento avulso do Fluxo de Caixa (CashEntry).
      let billExpenses = 0;
      let otherIncome = 0;
      try {
        const paidBills: any[] = await (prisma as any).billOccurrence.findMany({
          where: { tenantId, status: "paid", paidAt: { gte: fromDate, lte: toDate } },
          select: { paidAmount: true, amount: true, bill: { select: { direction: true } } },
        });
        for (const occ of paidBills) {
          const value = occ.paidAmount ?? occ.amount ?? 0;
          if (occ.bill?.direction === "income") otherIncome += value;
          else billExpenses += value;
        }
      } catch { /* Bill/BillOccurrence table may not exist yet */ }

      otherExpenses += billExpenses;

      res.json({
        revenue: grossRevenue, cogs: totalCOGS, commissions: totalCommissions, taxes: totalTaxes,
        otherExpenses, otherIncome,
        grossProfit: grossRevenue - totalCOGS,
        netProfit: grossRevenue + otherIncome - totalCOGS - otherExpenses - totalCommissions - totalTaxes,
        fromDate, toDate,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
};
