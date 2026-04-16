/**
 * useFinanceiro — Hook central de dados financeiros
 *
 * Fornece acesso tipado a todos os endpoints financeiros:
 *  • dashboard   — KPIs gerais do período
 *  • caixa       — Movimentos do dia
 *  • pagamentos  — Comissões de profissionais
 *  • formas      — Breakdown por forma de pagamento
 *  • despesas    — Lançamentos de saída (CashEntry)
 *  • controle    — Todos os lançamentos manuais
 *  • relatorio   — Relatório detalhado por profissional
 */

import { useState, useCallback } from "react";
import { apiFetch } from "@/src/lib/api";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface FormaPagamento {
  method: string;
  total: number;
  count: number;
  ticketMedio: number;
  percentual: number;
}

export interface EvolucaoDia {
  dia: string;
  total: number;
  atendimentos: number;
}

export interface DashboardData {
  receita: number;
  comandas: number;
  caixaHoje: number;
  atendimentosHoje: number;
  ticketMedio: number;
  totalEntradas: number;
  totalSaidas: number;
  saldo: number;
  formasPagamento: FormaPagamento[];
  evolucao: EvolucaoDia[];
  periodo: { from: string; to: string };
}

export interface ComandaCaixaItem {
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export interface ComandaCaixa {
  id: string;
  total: number;
  discount: number;
  paymentMethod: string | null;
  createdAt: string;
  clientName: string | null;
  professionalName: string | null;
  items?: ComandaCaixaItem[];
}

export interface LancamentoCaixa {
  id: string;
  type: "income" | "expense";
  category: string | null;
  description: string | null;
  amount: number;
  date: string;
}

export interface CaixaData {
  data: string;
  resumo: {
    totalComandas: number;
    totalEntradas: number;
    totalSaidas: number;
    saldo: number;
    atendimentos: number;
  };
  comandas: ComandaCaixa[];
  lancamentos: LancamentoCaixa[];
}

export interface ProfissionalPagamento {
  professionalId: string;
  professionalName: string;
  professionalRole: string | null;
  totalAtendimentos: number;
  totalFaturado: number;
  totalComissao: number;
}

export interface PagamentosData {
  profissionais: ProfissionalPagamento[];
  totalComissoes: number;
  periodo: { from: string; to: string };
}

export interface FormasPagamentoData {
  formas: FormaPagamento[];
  totalGeral: number;
  periodo: { from: string; to: string };
}

export interface Despesa {
  id: string;
  type: string;
  category: string | null;
  description: string | null;
  amount: number;
  date: string;
}

export interface DespesasData {
  despesas: Despesa[];
  total: number;
  porCategoria: Record<string, number>;
}

export interface CashEntry {
  id: string;
  tenantId: string;
  type: "income" | "expense";
  category: string | null;
  description: string | null;
  amount: number;
  date: string;
  createdAt: string;
}

export interface ProfissionalRelatorio {
  professionalId: string;
  professionalName: string;
  professionalRole: string | null;
  atendimentos: number;
  receita: number;
  ticketMedio: number;
  totalDesconto: number;
  clientesAtendidos: number;
  servicosMaisRealizados: { serviceName: string; vezes: number; total: number }[];
}

export interface RelatorioData {
  profissionais: ProfissionalRelatorio[];
  periodo: { from: string; to: string };
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

function useFetchState<T>(): [FetchState<T>, (data: T | null, error?: string | null) => void, (loading: boolean) => void] {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: false, error: null });
  const setData = useCallback((data: T | null, error: string | null = null) => {
    setState({ data, loading: false, error });
  }, []);
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);
  return [state, setData, setLoading];
}

// ─── Hook principal ──────────────────────────────────────────────────────────

export function useFinanceiro() {
  const [dashboard, setDashboardData, setDashboardLoading] = useFetchState<DashboardData>();
  const [caixa, setCaixaData, setCaixaLoading] = useFetchState<CaixaData>();
  const [pagamentos, setPagamentosData, setPagamentosLoading] = useFetchState<PagamentosData>();
  const [formas, setFormasData, setFormasLoading] = useFetchState<FormasPagamentoData>();
  const [despesas, setDespesasData, setDespesasLoading] = useFetchState<DespesasData>();
  const [controle, setControleData, setControleLoading] = useFetchState<CashEntry[]>();
  const [relatorio, setRelatorioData, setRelatorioLoading] = useFetchState<RelatorioData>();

  // Dashboard geral
  const fetchDashboard = useCallback(async (from?: string | null, to?: string | null) => {
    setDashboardLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      const res = await apiFetch(`/api/finance/dashboard?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setDashboardData(await res.json());
    } catch (e: any) {
      setDashboardData(null, e.message || "Erro ao carregar dashboard");
    }
  }, [setDashboardData, setDashboardLoading]);

  // Caixa do dia
  const fetchCaixa = useCallback(async (date?: string | null) => {
    setCaixaLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      const res = await apiFetch(`/api/finance/caixa?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setCaixaData(await res.json());
    } catch (e: any) {
      setCaixaData(null, e.message || "Erro ao carregar caixa");
    }
  }, [setCaixaData, setCaixaLoading]);

  // Pagamentos de profissionais
  const fetchPagamentos = useCallback(async (from?: string | null, to?: string | null, professionalId?: string | null) => {
    setPagamentosLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      if (professionalId) params.set("professionalId", professionalId);
      const res = await apiFetch(`/api/finance/pagamentos-profissionais?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setPagamentosData(await res.json());
    } catch (e: any) {
      setPagamentosData(null, e.message || "Erro ao carregar pagamentos");
    }
  }, [setPagamentosData, setPagamentosLoading]);

  // Formas de pagamento
  const fetchFormas = useCallback(async (from?: string | null, to?: string | null) => {
    setFormasLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      const res = await apiFetch(`/api/finance/formas-pagamento?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setFormasData(await res.json());
    } catch (e: any) {
      setFormasData(null, e.message || "Erro ao carregar formas de pagamento");
    }
  }, [setFormasData, setFormasLoading]);

  // Despesas
  const fetchDespesas = useCallback(async (from?: string | null, to?: string | null) => {
    setDespesasLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      const res = await apiFetch(`/api/finance/despesas?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setDespesasData(await res.json());
    } catch (e: any) {
      setDespesasData(null, e.message || "Erro ao carregar despesas");
    }
  }, [setDespesasData, setDespesasLoading]);

  // Controle (todos os lançamentos manuais)
  const fetchControle = useCallback(async (from?: string | null, to?: string | null, type?: string | null) => {
    setControleLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      if (type) params.set("type", type);
      const res = await apiFetch(`/api/finance/cash-entries?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setControleData(await res.json());
    } catch (e: any) {
      setControleData(null, e.message || "Erro ao carregar lançamentos");
    }
  }, [setControleData, setControleLoading]);

  // Criar lançamento
  const createLancamento = useCallback(async (data: {
    type: "income" | "expense";
    category?: string;
    description?: string;
    amount: number;
    date?: string;
  }) => {
    const res = await apiFetch("/api/finance/cash-entries", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  // Deletar lançamento
  const deleteLancamento = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/finance/cash-entries/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  // Relatório por profissional
  const fetchRelatorio = useCallback(async (from?: string | null, to?: string | null, professionalId?: string | null) => {
    setRelatorioLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      if (professionalId) params.set("professionalId", professionalId);
      const res = await apiFetch(`/api/finance/relatorio-profissionais?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setRelatorioData(await res.json());
    } catch (e: any) {
      setRelatorioData(null, e.message || "Erro ao carregar relatório");
    }
  }, [setRelatorioData, setRelatorioLoading]);

  return {
    dashboard,
    caixa,
    pagamentos,
    formas,
    despesas,
    controle,
    relatorio,
    fetchDashboard,
    fetchCaixa,
    fetchPagamentos,
    fetchFormas,
    fetchDespesas,
    fetchControle,
    fetchRelatorio,
    createLancamento,
    deleteLancamento,
  };
}

// ─── Formatadores utilitários ─────────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatPaymentMethod(method: string | null | undefined): string {
  const map: Record<string, string> = {
    cash: "Dinheiro",
    pix: "Pix",
    card: "Cartão",
    credit: "Crédito",
    debit: "Débito",
    transfer: "Transferência",
    voucher: "Voucher",
    mixed: "Misto",
    outros: "Outros",
  };
  return map[method?.toLowerCase() || ""] || method || "—";
}

export function getPaymentMethodColor(method: string | null | undefined): string {
  const map: Record<string, string> = {
    cash: "success",
    pix: "info",
    card: "purple",
    credit: "purple",
    debit: "info",
    transfer: "warning",
    voucher: "orange",
    mixed: "teal",
  };
  return (map[method?.toLowerCase() || ""] || "default") as string;
}

export function getFirstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function getTodayStr(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
