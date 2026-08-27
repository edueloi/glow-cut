import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId, endOfDayInclusive } from "../utils/helpers";

export const financeController = {
  // ─── CASH ENTRIES (Lançamentos manuais) ───────────────────────────────────

  async listCashEntries(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to, type } = req.query;
    try {
      let where = `WHERE ce.tenantId = ?`;
      const params: any[] = [tenantId];
      if (from) { where += ` AND ce.date >= ?`; params.push(new Date(from as string)); }
      if (to)   { where += ` AND ce.date <= ?`; params.push(endOfDayInclusive(to as string)); }
      if (type && type !== "all") { where += ` AND ce.type = ?`; params.push(type); }
      const entries: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT ce.*, c.id as cmdId
         FROM CashEntry ce
         LEFT JOIN Comanda c ON ce.comandaId = c.id
         ${where}
         ORDER BY ce.date DESC, ce.createdAt DESC`,
        ...params
      );
      res.json(entries);
    } catch (e: any) {
      console.error("[GET /api/cash-entries]", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao buscar lançamentos." });
    }
  },

  async createCashEntry(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { type, category, description, amount, date } = req.body;
    if (!type || !amount) return res.status(400).json({ error: "type e amount são obrigatórios." });
    try {
      const id = randomUUID();
      await (prisma as any).$executeRawUnsafe(
        `INSERT INTO CashEntry (id, tenantId, type, category, description, amount, date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id, tenantId, type, category || null, description || null,
        parseFloat(amount) || 0, date ? new Date(date) : new Date()
      );
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM CashEntry WHERE id = ?`, id);
      res.json(rows[0] || { id });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao criar lançamento." });
    }
  },

  async updateCashEntry(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { type, category, description, amount, date } = req.body;
    try {
      const sets: string[] = [];
      const vals: any[] = [];
      if (type !== undefined)        { sets.push("type = ?");        vals.push(type); }
      if (category !== undefined)    { sets.push("category = ?");    vals.push(category); }
      if (description !== undefined) { sets.push("description = ?"); vals.push(description); }
      if (amount !== undefined)      { sets.push("amount = ?");      vals.push(parseFloat(amount) || 0); }
      if (date !== undefined)        { sets.push("date = ?");        vals.push(new Date(date)); }
      if (sets.length > 0) {
        vals.push(req.params.id, tenantId);
        await (prisma as any).$executeRawUnsafe(
          `UPDATE CashEntry SET ${sets.join(", ")} WHERE id = ? AND tenantId = ?`, ...vals
        );
      }
      const rows: any[] = await (prisma as any).$queryRawUnsafe(`SELECT * FROM CashEntry WHERE id = ?`, req.params.id);
      res.json(rows[0] || { success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao atualizar lançamento." });
    }
  },

  async deleteCashEntry(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).$executeRawUnsafe(
        `DELETE FROM CashEntry WHERE id = ? AND tenantId = ?`, req.params.id, tenantId
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao excluir lançamento." });
    }
  },

  // ─── DASHBOARD FINANCEIRO (Resumo geral) ──────────────────────────────────

  async getDashboard(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to } = req.query;
    const dateFrom = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dateTo   = endOfDayInclusive(to as string);

    try {
      // Receita de comandas pagas no período — via CashEntry (data do pagamento)
      const receitaRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT COALESCE(SUM(ce.amount), 0) as total, COUNT(*) as count
         FROM CashEntry ce
         WHERE ce.tenantId = ? AND ce.comandaId IS NOT NULL
           AND ce.date >= ? AND ce.date <= ?`,
        tenantId, dateFrom, dateTo
      );

      // Lançamentos manuais do período (sem vínculo com comanda)
      const lancamentosRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM CashEntry
         WHERE tenantId = ? AND comandaId IS NULL AND date >= ? AND date <= ?
         GROUP BY type`,
        tenantId, dateFrom, dateTo
      );

      // Caixa de hoje — via CashEntry
      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
      const fimHoje    = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

      const caixaHojeRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM CashEntry
         WHERE tenantId = ? AND comandaId IS NOT NULL
           AND date >= ? AND date <= ?`,
        tenantId, inicioHoje, fimHoje
      );

      // Ticket médio — via CashEntry de comandas
      const ticketRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT COALESCE(AVG(amount), 0) as avg
         FROM CashEntry
         WHERE tenantId = ? AND comandaId IS NOT NULL
           AND date >= ? AND date <= ?`,
        tenantId, dateFrom, dateTo
      );

      // Formas de pagamento no período — via Comanda (join com CashEntry para data)
      const pagamentosRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT COALESCE(c.paymentMethod, 'outros') as method,
                COALESCE(SUM(ce.amount), 0) as total,
                COUNT(*) as count
         FROM CashEntry ce
         JOIN Comanda c ON ce.comandaId = c.id
         WHERE ce.tenantId = ? AND ce.date >= ? AND ce.date <= ?
         GROUP BY c.paymentMethod
         ORDER BY total DESC`,
        tenantId, dateFrom, dateTo
      );

      // Evolução diária (últimos 30 dias) — via CashEntry
      const evolucaoRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT DATE(ce.date) as dia,
                COALESCE(SUM(ce.amount), 0) as total,
                COUNT(*) as atendimentos
         FROM CashEntry ce
         WHERE ce.tenantId = ? AND ce.comandaId IS NOT NULL
           AND ce.date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(ce.date)
         ORDER BY dia ASC`,
        tenantId
      );

      const receita  = Number(receitaRows[0]?.total ?? 0);
      const comandas = Number(receitaRows[0]?.count ?? 0);
      const entradas = lancamentosRows.find((r: any) => r.type === "income");
      const saidas   = lancamentosRows.find((r: any) => r.type === "expense");
      const totalEntradas = receita + Number(entradas?.total ?? 0);
      const totalSaidas   = Number(saidas?.total ?? 0);

      res.json({
        receita,
        comandas,
        caixaHoje: Number(caixaHojeRows[0]?.total ?? 0),
        atendimentosHoje: Number(caixaHojeRows[0]?.count ?? 0),
        ticketMedio: Number(ticketRows[0]?.avg ?? 0),
        totalEntradas,
        totalSaidas,
        saldo: totalEntradas - totalSaidas,
        formasPagamento: pagamentosRows.map((r: any) => ({
          method: r.method,
          total: Number(r.total),
          count: Number(r.count),
        })),
        evolucao: evolucaoRows.map((r: any) => ({
          dia: r.dia,
          total: Number(r.total),
          atendimentos: Number(r.atendimentos),
        })),
        periodo: { from: dateFrom, to: dateTo },
      });
    } catch (e: any) {
      console.error("[GET /api/finance/dashboard]", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao buscar dashboard." });
    }
  },

  // ─── CAIXA DO DIA ─────────────────────────────────────────────────────────

  async getCaixa(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { date } = req.query;
    const dia     = date ? new Date(date as string) : new Date();
    const inicio  = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0);
    const fim     = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59);

    try {
      // Todos os lançamentos do dia (manuais + gerados por comanda)
      const allEntries: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT ce.*, c.discount, c.paymentMethod,
                cl.name as clientName,
                p.name as professionalName
         FROM CashEntry ce
         LEFT JOIN Comanda c ON ce.comandaId = c.id
         LEFT JOIN Client cl ON c.clientId = cl.id
         LEFT JOIN Professional p ON c.professionalId = p.id
         WHERE ce.tenantId = ? AND ce.date >= ? AND ce.date <= ?
         ORDER BY ce.date DESC`,
        tenantId, inicio, fim
      );

      // Separar lançamentos de comanda dos manuais
      const comandasRows = allEntries.filter(r => r.comandaId != null);
      const lancamentosRows = allEntries.filter(r => r.comandaId == null);

      const comandaIds = comandasRows.map(r => r.comandaId);
      let comandaItems: any[] = [];
      if (comandaIds.length > 0) {
        comandaItems = await (prisma as any).comandaItem.findMany({
          where: { comandaId: { in: comandaIds } }
        });
      }

      const totalComandas = comandasRows.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalEntradas = lancamentosRows.filter((r: any) => r.type === "income").reduce((s: number, r: any) => s + Number(r.amount), 0);
      const totalSaidas   = lancamentosRows.filter((r: any) => r.type === "expense").reduce((s: number, r: any) => s + Number(r.amount), 0);

      res.json({
        data: dia,
        resumo: {
          totalComandas,
          totalEntradas,
          totalSaidas,
          saldo: totalComandas + totalEntradas - totalSaidas,
          atendimentos: comandasRows.length,
        },
        comandas: comandasRows.map((r: any) => ({
          id: r.comandaId,
          total: Number(r.amount),
          discount: Number(r.discount ?? 0),
          paymentMethod: r.paymentMethod,
          createdAt: r.date,
          clientName: r.clientName,
          professionalName: r.professionalName,
          items: comandaItems
            .filter((i: any) => i.comandaId === r.comandaId)
            .map((i: any) => ({
              name: i.name,
              price: Number(i.price),
              quantity: i.quantity,
              total: Number(i.total),
            })),
        })),
        lancamentos: lancamentosRows.map((r: any) => ({
          ...r,
          amount: Number(r.amount),
        })),
      });
    } catch (e: any) {
      console.error("[GET /api/finance/caixa]", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao buscar caixa." });
    }
  },

  // ─── PAGAMENTOS DE PROFISSIONAIS (Comissões) ──────────────────────────────

  async getPagamentosProfissionais(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to, professionalId } = req.query;
    const dateFrom = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dateTo   = endOfDayInclusive(to as string);

    try {
      let where = `WHERE c.tenantId = ? AND c.status = 'paid' AND c.createdAt >= ? AND c.createdAt <= ?`;
      const params: any[] = [tenantId, dateFrom, dateTo];
      if (professionalId) { where += ` AND c.professionalId = ?`; params.push(professionalId); }

      // Faturado/atendimentos por profissional — direto de Comanda, sem join com itens (o join
      // com ComandaItem faz fan-out: uma comanda com 3 itens contava seu total 3x na soma).
      const faturadoRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT p.id as professionalId, p.name as professionalName, p.role as professionalRole,
                COUNT(*) as totalAtendimentos, COALESCE(SUM(c.total), 0) as totalFaturado
         FROM Comanda c
         JOIN Professional p ON c.professionalId = p.id
         ${where}
         GROUP BY p.id, p.name, p.role
         ORDER BY totalFaturado DESC`,
        ...params
      );

      // Comissão por profissional via itens de comanda (aqui o join por item é necessário —
      // cada item tem seu próprio serviço/comissão — mas fica numa query separada da soma do
      // faturado bruto acima).
      const comissaoRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT c.professionalId,
                COALESCE(SUM(
                  CASE
                    WHEN s.commissionType = 'percentage' THEN (ci.total * s.commissionValue / 100)
                    WHEN s.commissionValue IS NOT NULL THEN (s.commissionValue * ci.quantity)
                    ELSE 0
                  END
                ), 0) as totalComissao
         FROM Comanda c
         LEFT JOIN ComandaItem ci ON ci.comandaId = c.id
         LEFT JOIN Service s ON ci.serviceId = s.id
         ${where}
         GROUP BY c.professionalId`,
        ...params
      );
      const comissaoByProf = new Map(comissaoRows.map((r: any) => [r.professionalId, Number(r.totalComissao)]));

      const rows = faturadoRows.map((r: any) => ({ ...r, totalComissao: comissaoByProf.get(r.professionalId) || 0 }));
      const total = rows.reduce((s: number, r: any) => s + Number(r.totalComissao), 0);

      // Baixa (CommissionPayout) já registrada pra esse profissional exatamente nesse período —
      // o "De/Até" do filtro é o mesmo período usado ao marcar como paga.
      const payoutRows: any[] = await (prisma as any).commissionPayout.findMany({
        where: { tenantId, periodStart: dateFrom, periodEnd: dateTo, professionalId: { in: rows.map((r: any) => r.professionalId) } },
      });
      const payoutByProf = new Map(payoutRows.map((p: any) => [p.professionalId, p]));

      res.json({
        profissionais: rows.map(r => ({
          professionalId: r.professionalId,
          professionalName: r.professionalName,
          professionalRole: r.professionalRole,
          totalAtendimentos: Number(r.totalAtendimentos),
          totalFaturado: Number(r.totalFaturado),
          totalComissao: Number(r.totalComissao),
          payout: payoutByProf.get(r.professionalId) || null,
        })),
        totalComissoes: total,
        periodo: { from: dateFrom, to: dateTo },
      });
    } catch (e: any) {
      console.error("[GET /api/finance/pagamentos-profissionais]", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao buscar pagamentos." });
    }
  },

  async markCommissionPayout(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { professionalId, from, to, amount, notes } = req.body;
    if (!professionalId || !from || !to) return res.status(400).json({ error: "professionalId, from e to são obrigatórios." });
    try {
      const periodStart = new Date(from);
      const periodEnd = new Date(to);
      const existing = await (prisma as any).commissionPayout.findFirst({ where: { tenantId, professionalId, periodStart, periodEnd } });
      const payoutAmount = Number(amount) || 0;
      const payout = existing
        ? await (prisma as any).commissionPayout.update({
            where: { id: existing.id },
            data: { status: "paid", amount: payoutAmount, paidAmount: payoutAmount, paidAt: new Date(), notes: notes || null },
          })
        : await (prisma as any).commissionPayout.create({
            data: {
              id: randomUUID(), tenantId, professionalId, periodStart, periodEnd,
              amount: payoutAmount, status: "paid", paidAmount: payoutAmount, paidAt: new Date(), notes: notes || null,
            },
          });
      res.json(payout);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao marcar comissão como paga." });
    }
  },

  async undoCommissionPayout(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await (prisma as any).commissionPayout.deleteMany({ where: { id: req.params.id, tenantId } });
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro." });
    }
  },

  // ─── FORMAS DE PAGAMENTO ──────────────────────────────────────────────────

  async getFormasPagamento(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to } = req.query;
    const dateFrom = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dateTo   = endOfDayInclusive(to as string);

    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT
           COALESCE(paymentMethod, 'outros') as method,
           COALESCE(SUM(total), 0) as total,
           COUNT(*) as count,
           COALESCE(AVG(total), 0) as ticketMedio
         FROM Comanda
         WHERE tenantId = ? AND status = 'paid'
           AND createdAt >= ? AND createdAt <= ?
         GROUP BY paymentMethod
         ORDER BY total DESC`,
        tenantId, dateFrom, dateTo
      );

      const totalGeral = rows.reduce((s: number, r: any) => s + Number(r.total), 0);

      res.json({
        formas: rows.map(r => ({
          method: r.method,
          total: Number(r.total),
          count: Number(r.count),
          ticketMedio: Number(r.ticketMedio),
          percentual: totalGeral > 0 ? (Number(r.total) / totalGeral) * 100 : 0,
        })),
        totalGeral,
        periodo: { from: dateFrom, to: dateTo },
      });
    } catch (e: any) {
      console.error("[GET /api/finance/formas-pagamento]", e?.message || e);
      res.status(500).json({ error: e?.message || "Erro ao buscar formas de pagamento." });
    }
  },

  // ─── DESPESAS / CONTAS A PAGAR ────────────────────────────────────────────

  async listDespesas(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to, status } = req.query;
    try {
      let where = `WHERE tenantId = ? AND type = 'expense'`;
      const params: any[] = [tenantId];
      if (from) { where += ` AND date >= ?`; params.push(new Date(from as string)); }
      if (to)   { where += ` AND date <= ?`; params.push(endOfDayInclusive(to as string)); }

      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT * FROM CashEntry ${where} ORDER BY date DESC`, ...params
      );

      const total = rows.reduce((s, r) => s + Number(r.amount), 0);
      const porCategoria: Record<string, number> = {};
      rows.forEach(r => {
        const cat = r.category || "Outros";
        porCategoria[cat] = (porCategoria[cat] || 0) + Number(r.amount);
      });

      res.json({
        despesas: rows.map(r => ({ ...r, amount: Number(r.amount) })),
        total,
        porCategoria,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao buscar despesas." });
    }
  },

  // ─── RELATÓRIO POR PROFISSIONAL ───────────────────────────────────────────

  async getRelatorioProfissional(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { from, to, professionalId } = req.query;
    const dateFrom = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dateTo   = endOfDayInclusive(to as string);

    try {
      let profWhere = professionalId ? `AND c.professionalId = ?` : "";
      const params: any[] = [tenantId, dateFrom, dateTo];
      if (professionalId) params.push(professionalId);

      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT
           p.id as professionalId,
           p.name as professionalName,
           p.role as professionalRole,
           COUNT(DISTINCT c.id) as atendimentos,
           COALESCE(SUM(c.total), 0) as receita,
           COALESCE(AVG(c.total), 0) as ticketMedio,
           COALESCE(SUM(c.discount), 0) as totalDesconto,
           COUNT(DISTINCT c.clientId) as clientesAtendidos
         FROM Comanda c
         JOIN Professional p ON c.professionalId = p.id
         WHERE c.tenantId = ? AND c.status = 'paid'
           AND c.createdAt >= ? AND c.createdAt <= ? ${profWhere}
         GROUP BY p.id, p.name, p.role
         ORDER BY receita DESC`,
        ...params
      );

      // Serviços mais realizados por profissional
      const servicosRows: any[] = await (prisma as any).$queryRawUnsafe(
        `SELECT
           c.professionalId,
           s.name as serviceName,
           COUNT(*) as vezes,
           COALESCE(SUM(ci.total), 0) as total
         FROM Comanda c
         JOIN ComandaItem ci ON ci.comandaId = c.id
         JOIN Service s ON ci.serviceId = s.id
         WHERE c.tenantId = ? AND c.status = 'paid'
           AND c.createdAt >= ? AND c.createdAt <= ?
         GROUP BY c.professionalId, s.name
         ORDER BY c.professionalId, vezes DESC`,
        tenantId, dateFrom, dateTo
      );

      const servicosByProf: Record<string, any[]> = {};
      servicosRows.forEach(r => {
        if (!servicosByProf[r.professionalId]) servicosByProf[r.professionalId] = [];
        servicosByProf[r.professionalId].push({ serviceName: r.serviceName, vezes: Number(r.vezes), total: Number(r.total) });
      });

      res.json({
        profissionais: rows.map(r => ({
          professionalId: r.professionalId,
          professionalName: r.professionalName,
          professionalRole: r.professionalRole,
          atendimentos: Number(r.atendimentos),
          receita: Number(r.receita),
          ticketMedio: Number(r.ticketMedio),
          totalDesconto: Number(r.totalDesconto),
          clientesAtendidos: Number(r.clientesAtendidos),
          servicosMaisRealizados: servicosByProf[r.professionalId]?.slice(0, 5) || [],
        })),
        periodo: { from: dateFrom, to: dateTo },
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao buscar relatório." });
    }
  },

};
