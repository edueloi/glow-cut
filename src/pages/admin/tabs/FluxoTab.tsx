import React, { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plus, Minus, CheckCircle, FileText, TrendingUp, TrendingDown, 
  Wallet, DollarSign, PieChart, Activity, X, Search,
  ArrowUpRight, ArrowDownRight, MoreVertical, Trash2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart as RechartsPieChart, Pie
} from "recharts";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { motion, AnimatePresence } from "motion/react";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PROF_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];

interface FluxoTabProps {
  comandas: any[]; // Manter pra compatibilidade (Dashboard envia), mas usaremos cash-entries também
  sectors: any[];
}

type Period = "today" | "week" | "month" | "last30" | "last3m" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Esta Semana" },
  { key: "month", label: "Este Mês" },
  { key: "last30", label: "Últimos 30d" },
  { key: "last3m", label: "3 Meses" },
  { key: "all", label: "Histórico" },
];

function getPeriodRange(period: Period): { from: Date | null; to: Date | null } {
  const now = new Date();
  switch (period) {
    case "today": {
      const s = new Date(now); s.setHours(0,0,0,0);
      const e = new Date(now); e.setHours(23,59,59,999);
      return { from: s, to: e };
    }
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last30":
      return { from: subDays(now, 30), to: now };
    case "last3m":
      return { from: subMonths(now, 3), to: now };
    case "all":
      return { from: null, to: null };
  }
}

// ── Categorias Padrão ──
const EXPENSE_CATEGORIES = ["Aluguel", "Energia/Água", "Internet/Telefone", "Salários/Comissões", "Produtos/Estoque", "Marketing", "Impostos", "Manutenção", "Outros"];
const INCOME_CATEGORIES = ["Comanda", "Venda Avulsa", "Serviço Avulso", "Investimento", "Outros"];

export function FluxoTab({ comandas, sectors }: FluxoTabProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"income" | "expense">("expense");
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    customCategory: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd")
  });
  const [saving, setSaving] = useState(false);

  // Fetch entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/cash-entries");
      if (res.ok) {
        setEntries(await res.json());
      }
    } catch (e) {
      console.error("Erro ao carregar fluxo", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Filter entries by period
  const filteredEntries = useMemo(() => {
    const { from, to } = getPeriodRange(period);
    if (!from || !to) return entries;
    
    return entries.filter(e => {
      const d = new Date(e.date);
      return d >= from && d <= to;
    });
  }, [entries, period]);

  // Metrics calculation
  const metrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let comandaCount = 0;

    filteredEntries.forEach(e => {
      if (e.type === "income") {
        income += Number(e.amount);
        if (e.comandaId) comandaCount++;
      } else {
        expense += Number(e.amount);
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
      avgTicket: comandaCount > 0 ? income / comandaCount : 0,
      comandaCount
    };
  }, [filteredEntries]);

  // Chart data
  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; income: number; expense: number }>();
    const { from, to } = getPeriodRange(period);
    
    // Build default map if period is known
    if (from && to && (period === "week" || period === "month" || period === "last30")) {
      let curr = new Date(from);
      while (curr <= to) {
        map.set(format(curr, "yyyy-MM-dd"), { date: format(curr, "dd/MM"), income: 0, expense: 0 });
        curr.setDate(curr.getDate() + 1);
      }
    }

    filteredEntries.forEach(e => {
      const dStr = format(new Date(e.date), "yyyy-MM-dd");
      const label = format(new Date(e.date), "dd/MM");
      if (!map.has(dStr)) map.set(dStr, { date: label, income: 0, expense: 0 });
      
      const item = map.get(dStr)!;
      if (e.type === "income") item.income += Number(e.amount);
      else item.expense += Number(e.amount);
    });

    return Array.from(map.values()).sort((a,b) => {
      const partsA = a.date.split("/");
      const partsB = b.date.split("/");
      return new Date(0, Number(partsA[1])-1, Number(partsA[0])).getTime() - new Date(0, Number(partsB[1])-1, Number(partsB[0])).getTime();
    });
  }, [filteredEntries, period]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    filteredEntries.filter(e => e.type === "expense").forEach(e => {
      const cat = e.category || "Outros";
      map.set(cat, (map.get(cat) || 0) + Number(e.amount));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredEntries]);

  // Handlers
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    
    setSaving(true);
    try {
      const category = formData.category === "Outros" && formData.customCategory 
        ? formData.customCategory 
        : (formData.category || "Outros");

      await apiFetch("/api/cash-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: modalType,
          category,
          description: formData.description,
          amount: Number(formData.amount),
          date: formData.date
        })
      });
      
      setIsModalOpen(false);
      setFormData({ amount: "", category: "", customCategory: "", description: "", date: format(new Date(), "yyyy-MM-dd") });
      fetchEntries();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string, comandaId: string | null) => {
    if (comandaId) {
      alert("Lançamentos vinculados a comandas devem ser estornados através da comanda correspondente.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
    
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await apiFetch(`/api/cash-entries/${id}`, { method: "DELETE" });
    } catch (e) {
      fetchEntries(); // rollback
    }
  };

  const openNewEntry = (type: "income" | "expense") => {
    setModalType(type);
    setFormData({ ...formData, category: type === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0] });
    setIsModalOpen(true);
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-amber-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold">Carregando fluxo financeiro...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
      
      {/* ── Header: Período e Ações ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 border",
                period === p.key
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => openNewEntry("expense")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-red-100"
          >
            <Minus size={14} /> Despesa
          </button>
          <button
            onClick={() => openNewEntry("income")}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm"
          >
            <Plus size={14} /> Receita
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl sm:rounded-[24px] border border-zinc-200 p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight size={18} className="sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">Receitas</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-emerald-600 truncate mt-auto">{fmtBRL(metrics.income)}</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-[24px] border border-zinc-200 p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <div className="p-2 sm:p-2.5 bg-red-50 text-red-600 rounded-xl">
              <ArrowDownRight size={18} className="sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">Despesas</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-red-600 truncate mt-auto">{fmtBRL(metrics.expense)}</p>
        </div>

        <div className={cn(
          "bg-white rounded-2xl sm:rounded-[24px] border p-4 shadow-sm flex flex-col",
          metrics.balance >= 0 ? "border-amber-200" : "border-red-200"
        )}>
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <div className={cn("p-2 sm:p-2.5 rounded-xl", metrics.balance >= 0 ? "bg-amber-50 text-amber-500" : "bg-red-50 text-red-500")}>
              <Wallet size={18} className="sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">Saldo</span>
          </div>
          <p className={cn("text-xl sm:text-3xl font-black truncate mt-auto", metrics.balance >= 0 ? "text-amber-500" : "text-red-500")}>
            {fmtBRL(metrics.balance)}
          </p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-[24px] border border-zinc-200 p-4 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-2 sm:mb-4">
            <div className="p-2 sm:p-2.5 bg-zinc-50 text-zinc-500 rounded-xl">
              <Activity size={18} className="sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">Ticket Méd.</span>
          </div>
          <p className="text-xl sm:text-3xl font-black text-zinc-900 truncate mt-auto">{fmtBRL(metrics.avgTicket)}</p>
          <p className="text-[9px] sm:text-[10px] text-zinc-400 font-bold mt-1">{metrics.comandaCount} atendimentos</p>
        </div>
      </div>

      {/* ── Main Content: Gráficos e Lista ── */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left Col: Gráficos */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="bg-white rounded-[24px] border border-zinc-200 p-4 sm:p-6 shadow-sm">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-500"/> Evolução Diária
              </h3>
            </div>
            
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} 
                    />
                    <YAxis 
                      axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }}
                      tickFormatter={(val) => `R$ ${val}`} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => fmtBRL(val)}
                      labelStyle={{ fontWeight: 'bold', color: '#18181b', marginBottom: '4px' }}
                    />
                    <Area type="monotone" dataKey="income" name="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expense" name="Despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Sem dados no período
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-zinc-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2 mb-6">
              <PieChart size={16} className="text-amber-500"/> Despesas por Categoria
            </h3>
            
            <div className="h-64 w-full">
              {expensesByCategory.length > 0 ? (
                <div className="flex h-full">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PROF_COLORS[index % PROF_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v: number) => fmtBRL(v)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 flex flex-col justify-center gap-3 overflow-y-auto pl-4">
                    {expensesByCategory.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PROF_COLORS[i % PROF_COLORS.length] }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-zinc-600 truncate">{c.name}</p>
                          <p className="text-xs font-black text-zinc-900">{fmtBRL(c.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                  <CheckCircle size={32} className="mb-2 opacity-50" />
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Oba! Nenhuma despesa</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Lista de Transações */}
        <div className="bg-white rounded-[24px] border border-zinc-200 shadow-sm flex flex-col h-[600px] lg:h-auto">
          <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} className="text-zinc-400"/> Transações
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {filteredEntries.length > 0 ? (
              <div className="space-y-1">
                {filteredEntries.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 hover:bg-zinc-50 rounded-xl transition-all group">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      entry.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {entry.type === "income" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">
                        {entry.category} {entry.comandaId && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded ml-1 tracking-widest uppercase">Comanda</span>}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold mt-0.5 truncate flex items-center gap-1">
                        {format(new Date(entry.date), "dd/MM HH:mm")}
                        {entry.description && ` · ${entry.description}`}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <span className={cn("text-xs font-black", entry.type === "income" ? "text-emerald-600" : "text-red-600")}>
                        {entry.type === "income" ? "+" : "-"}{fmtBRL(Number(entry.amount))}
                      </span>
                      <button 
                        onClick={() => handleDeleteEntry(entry.id, entry.comandaId)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-300 hover:text-red-500 transition-all -mr-1 mt-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-6 text-center">
                <FileText size={32} className="mb-3 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Nenhuma transação no período</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Lançamento Manual */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-[2px]"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              className="bg-white rounded-t-[28px] sm:rounded-[28px] w-full sm:max-w-md shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className={cn(
                "p-5 flex items-center justify-between",
                modalType === "income" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl", 
                    modalType === "income" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                  )}>
                    {modalType === "income" ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-widest">
                      Novo Lançamento
                    </h3>
                    <p className="text-xs opacity-70 font-bold">
                      {modalType === "income" ? "Registrar Entrada" : "Registrar Saída"}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="opacity-50 hover:opacity-100 p-2"><X size={16}/></button>
              </div>

              <form onSubmit={handleSaveEntry} className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-zinc-400">R$</span>
                    <input
                      type="number" step="0.01" min="0" required autoFocus
                      value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                      className="w-full pl-10 pr-3 py-3 text-lg font-black bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data</label>
                    <input
                      type="date" required
                      value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-3 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria</label>
                    <select
                      value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-3 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400"
                    >
                      {(modalType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.category === "Outros" && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome da Categoria</label>
                    <input
                      type="text" required
                      value={formData.customCategory} onChange={e => setFormData({...formData, customCategory: e.target.value})}
                      className="w-full px-3 py-3 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400"
                      placeholder="Ex: Reforma"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição (Opcional)</label>
                  <textarea
                    rows={2}
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-3 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 resize-none"
                    placeholder="Detalhes sobre este lançamento..."
                  />
                </div>

                <button
                  type="submit" disabled={saving}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-white",
                    modalType === "income" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600",
                    saving && "opacity-50"
                  )}
                >
                  {saving ? "Salvando..." : "Salvar Lançamento"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Em qualquer lugar que usava o ícone ChevronDown e precisava de 'Minus' do lucide.
