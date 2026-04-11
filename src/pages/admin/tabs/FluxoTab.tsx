import React, { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle, FileText, TrendingUp, Trophy, Star, Users, Coffee, Scissors, Calendar } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";

interface FluxoTabProps {
  comandas: any[];
}

const PROF_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];

type Period = "today" | "week" | "month" | "last30" | "last3m" | "all";
type Segment = "all" | "cafeteria" | "salao";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Esta Semana" },
  { key: "month", label: "Este Mês" },
  { key: "last30", label: "Últimos 30d" },
  { key: "last3m", label: "3 Meses" },
  { key: "all", label: "Tudo" },
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

function getItemGroup(item: any): string {
  try {
    const meta = item.product?.metadata;
    if (!meta) return "salao";
    const parsed = typeof meta === "string" ? JSON.parse(meta) : meta;
    return parsed?.group || "salao";
  } catch {
    return "salao";
  }
}

export function FluxoTab({ comandas }: FluxoTabProps) {
  const [profReport, setProfReport] = useState<any[]>([]);
  const [loadingProf, setLoadingProf] = useState(false);
  const [activeSegment, setActiveSegment] = useState<Segment>("all");
  const [period, setPeriod] = useState<Period>("month");

  const { from, to } = useMemo(() => getPeriodRange(period), [period]);

  // Busca relatório de profissionais com filtro de período
  useEffect(() => {
    setLoadingProf(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from.toISOString());
    if (to) params.set("to", to.toISOString());
    apiFetch(`/api/reports/professionals?${params.toString()}`)
      .then(r => r.json())
      .then(d => setProfReport(Array.isArray(d) ? d : []))
      .catch(() => setProfReport([]))
      .finally(() => setLoadingProf(false));
  }, [period]);

  // Filtra comandas por período e segmento
  const filteredComandas = useMemo(() => {
    return comandas.filter(c => {
      // Filtro de período
      const dt = new Date(c.createdAt);
      if (from && dt < from) return false;
      if (to && dt > to) return false;

      // Filtro de segmento
      if (activeSegment === "all") return true;
      const items: any[] = c.items || [];
      if (items.length === 0) return activeSegment === "salao"; // sem itens = salão
      return items.some(i => getItemGroup(i) === activeSegment);
    });
  }, [comandas, from, to, activeSegment]);

  const topProfessional = profReport.length > 0 ? profReport[0] : null;

  const paidComandas = filteredComandas.filter(c => c.status === "paid");
  const openComandas = filteredComandas.filter(c => c.status === "open");
  const totalReceita = paidComandas.reduce((a, c) => a + (c.total || 0), 0);
  const totalAberto = openComandas.reduce((a, c) => a + (c.total || 0), 0);
  const ticketMedio = filteredComandas.length > 0
    ? filteredComandas.reduce((a, c) => a + (c.total || 0), 0) / filteredComandas.length
    : 0;

  // Dados do gráfico de área por dia
  const areaData = useMemo(() => {
    const days: Record<string, number> = {};
    paidComandas.forEach(c => {
      const d = format(new Date(c.createdAt), "dd/MM");
      days[d] = (days[d] || 0) + (c.total || 0);
    });
    return Object.entries(days).slice(-14).map(([name, value]) => ({ name, value }));
  }, [paidComandas]);

  return (
    <div className="space-y-6">

      {/* ── Filtros: período + segmento ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Período */}
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                period === p.key
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="h-px sm:h-6 sm:w-px bg-zinc-200 hidden sm:block" />

        {/* Segmento */}
        <div className="flex gap-1.5">
          {(["all", "salao", "cafeteria"] as Segment[]).map(seg => (
            <button
              key={seg}
              onClick={() => setActiveSegment(seg)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                activeSegment === seg
                  ? seg === "cafeteria"
                    ? "bg-amber-500 text-white border-amber-500"
                    : seg === "salao"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
              )}
            >
              {seg === "cafeteria" && <Coffee size={10} />}
              {seg === "salao" && <Scissors size={10} />}
              {seg === "all" ? "Todos" : seg === "cafeteria" ? "Cafeteria" : "Salão"}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Receita Total</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {totalReceita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">{paidComandas.length} pagas</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">A Receber</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {totalAberto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">{openComandas.length} em aberto</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">
            {ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">por comanda</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Comandas</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{filteredComandas.length}</p>
          <p className="text-[10px] text-zinc-400 mt-1">{paidComandas.length} pagas</p>
        </div>
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Área de receita por dia */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 mb-4">Receita por Dia</h3>
          {areaData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-zinc-300 text-xs font-bold">
              Sem dados no período
            </div>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaData}>
                  <defs>
                    <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#a1a1aa" }} tickFormatter={v => `R$${v}`} width={50} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e4e4e7", fontSize: "12px" }} itemStyle={{ color: "#059669" }} formatter={(v: any) => [`R$ ${Number(v).toFixed(2)}`, "Receita"]} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cashGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Status das comandas */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 mb-4">Status das Comandas</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">Pagas</p>
                  <p className="text-[10px] text-zinc-500">{paidComandas.length} comandas</p>
                </div>
              </div>
              <p className="text-lg font-black text-emerald-600">
                {totalReceita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">Em Aberto</p>
                  <p className="text-[10px] text-zinc-500">{openComandas.length} comandas</p>
                </div>
              </div>
              <p className="text-lg font-black text-amber-600">
                {totalAberto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-zinc-600" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">Taxa de Fechamento</p>
                  <p className="text-[10px] text-zinc-500">pagas / total</p>
                </div>
              </div>
              <p className="text-lg font-black text-zinc-900">
                {filteredComandas.length ? Math.round(paidComandas.length / filteredComandas.length * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Relatório por Profissional ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {topProfessional && (
          <div className="lg:col-span-1 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-3 right-3 opacity-10">
              <Trophy size={64} className="text-amber-500" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white text-xl font-black shadow-lg mb-3">
              {topProfessional.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-[9px] font-black bg-amber-500 text-white px-2.5 py-1 rounded-full uppercase tracking-widest mb-2 flex items-center gap-1">
              <Star size={9} /> Destaque do Período
            </span>
            <p className="text-base font-black text-zinc-900">{topProfessional.name}</p>
            <p className="text-[10px] text-zinc-500 mb-3">{topProfessional.role || "Profissional"}</p>
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="bg-white rounded-xl p-2.5 border border-amber-100">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Faturamento</p>
                <p className="text-sm font-black text-amber-600">
                  {(topProfessional.totalRevenue || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-amber-100">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
                <p className="text-sm font-black text-zinc-900">
                  {(topProfessional.avgTicket || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className={cn("bg-white rounded-2xl border border-zinc-200 shadow-sm p-5", topProfessional ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-zinc-400" />
            <h3 className="text-sm font-bold text-zinc-900">Faturamento por Profissional</h3>
          </div>
          {loadingProf ? (
            <div className="h-32 flex items-center justify-center text-zinc-300 text-xs font-bold">Carregando...</div>
          ) : profReport.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-zinc-300 text-xs font-bold">Sem dados no período</div>
          ) : (
            <div className="space-y-3">
              {profReport.map((p: any, i: number) => {
                const maxRevenue = profReport[0]?.totalRevenue || 1;
                const pct = maxRevenue > 0 ? (p.totalRevenue / maxRevenue) * 100 : 0;
                return (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ backgroundColor: PROF_COLORS[i % PROF_COLORS.length] }}>
                          {i + 1}
                        </div>
                        <span className="text-xs font-bold text-zinc-800 truncate max-w-[120px]">{p.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-zinc-900">
                          {(p.totalRevenue || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <span className="text-[9px] text-zinc-400 ml-2">{p.totalComandas} cmd</span>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: PROF_COLORS[i % PROF_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Últimas Transações ── */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900">Últimas Transações</h3>
          <span className="text-[10px] text-zinc-400 font-bold">
            {filteredComandas.length} no período
          </span>
        </div>
        <div className="divide-y divide-zinc-100">
          {[...filteredComandas]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm",
                    c.status === "paid"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-amber-50 text-amber-600 border border-amber-100"
                  )}>
                    {(c.client?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{c.client?.name || "—"}</p>
                    <p className="text-[10px] text-zinc-400">
                      {format(new Date(c.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-1 rounded-lg border",
                    c.status === "paid"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    {c.status === "paid" ? "Pago" : "Em Aberto"}
                  </span>
                  <p className={cn(
                    "text-sm font-black",
                    c.status === "paid" ? "text-emerald-600" : "text-zinc-700"
                  )}>
                    {c.status === "paid" ? "+" : ""}
                    {(c.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>
            ))}
          {filteredComandas.length === 0 && (
            <div className="py-16 text-center">
              <Calendar size={24} className="mx-auto mb-2 text-zinc-200" />
              <p className="text-xs text-zinc-400 font-bold">Nenhuma transação no período</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
