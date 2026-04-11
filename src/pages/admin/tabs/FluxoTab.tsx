import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { CheckCircle, FileText, TrendingUp, Trophy, Star, Users, DollarSign } from "lucide-react";
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

export function FluxoTab({ comandas }: FluxoTabProps) {
  const [profReport, setProfReport] = useState<any[]>([]);
  const [loadingProf, setLoadingProf] = useState(false);
  const [activeSegment, setActiveSegment] = useState<"all" | "cafeteria" | "salao">("all");

  useEffect(() => {
    setLoadingProf(true);
    apiFetch("/api/reports/professionals")
      .then(r => r.json())
      .then(d => setProfReport(Array.isArray(d) ? d : []))
      .catch(() => setProfReport([]))
      .finally(() => setLoadingProf(false));
  }, []);

  // Filtra comandas por segmento usando paymentMethod como proxy (ou items)
  // Por ora, usa todas as comandas pois o setor é definido no produto, não na comanda
  const filteredComandas = comandas;

  // Destaque do mês: profissional com maior faturamento
  const topProfessional = profReport.length > 0 ? profReport[0] : null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Receita Total</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">R$ {comandas.filter(c => c.status === 'paid').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">comandas pagas</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">A Receber</p>
          <p className="text-2xl font-black text-amber-600 mt-1">R$ {comandas.filter(c => c.status === 'open').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">em aberto</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">
            R$ {comandas.length ? (comandas.reduce((a, c) => a + c.total, 0) / comandas.length).toFixed(2) : '0.00'}
          </p>
          <p className="text-[10px] text-zinc-400 mt-1">por comanda</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Comandas</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{comandas.length}</p>
          <p className="text-[10px] text-zinc-400 mt-1">{comandas.filter(c => c.status === 'paid').length} pagas</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue area chart */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 mb-4">Receita por Dia (últimas comandas)</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(() => {
                const days: Record<string, number> = {};
                comandas.filter(c => c.status === 'paid').forEach(c => {
                  const d = format(new Date(c.createdAt), "dd/MM");
                  days[d] = (days[d] || 0) + c.total;
                });
                return Object.entries(days).slice(-7).map(([name, value]) => ({ name, value }));
              })()}>
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `R$ ${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px' }} itemStyle={{ color: '#059669' }} />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cashGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-zinc-900 mb-4">Status das Comandas</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">Pagas</p>
                  <p className="text-[10px] text-zinc-500">{comandas.filter(c => c.status === 'paid').length} comandas</p>
                </div>
              </div>
              <p className="text-lg font-black text-emerald-600">R$ {comandas.filter(c => c.status === 'paid').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">Em Aberto</p>
                  <p className="text-[10px] text-zinc-500">{comandas.filter(c => c.status === 'open').length} comandas</p>
                </div>
              </div>
              <p className="text-lg font-black text-amber-600">R$ {comandas.filter(c => c.status === 'open').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-zinc-600" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">Taxa de Fechamento</p>
                  <p className="text-[10px] text-zinc-500">comandas pagas / total</p>
                </div>
              </div>
              <p className="text-lg font-black text-zinc-900">
                {comandas.length ? Math.round(comandas.filter(c => c.status === 'paid').length / comandas.length * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Relatório por Profissional ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Destaque do Mês */}
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
                <p className="text-sm font-black text-amber-600">R$ {topProfessional.totalRevenue?.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-amber-100">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
                <p className="text-sm font-black text-zinc-900">R$ {topProfessional.avgTicket?.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Ranking de Profissionais */}
        <div className={cn("bg-white rounded-2xl border border-zinc-200 shadow-sm p-5", topProfessional ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-zinc-400" />
            <h3 className="text-sm font-bold text-zinc-900">Faturamento por Profissional</h3>
          </div>
          {loadingProf ? (
            <div className="h-32 flex items-center justify-center text-zinc-300 text-xs font-bold">Carregando...</div>
          ) : profReport.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-zinc-300 text-xs font-bold">Sem dados</div>
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
                        <span className="text-xs font-black text-zinc-900">R$ {p.totalRevenue?.toFixed(2)}</span>
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

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100">
          <h3 className="text-sm font-bold text-zinc-900">Últimas Transações</h3>
        </div>
        <div className="divide-y divide-zinc-100">
          {[...comandas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8).map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm", c.status === 'paid' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100")}>
                  {c.client.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900">{c.client.name}</p>
                  <p className="text-[10px] text-zinc-400">{format(new Date(c.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-[9px] font-bold px-2 py-1 rounded-lg border", c.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                  {c.status === 'paid' ? 'Pago' : 'Em Aberto'}
                </span>
                <p className={cn("text-sm font-black", c.status === 'paid' ? "text-emerald-600" : "text-zinc-700")}>
                  {c.status === 'paid' ? '+' : ''}R$ {c.total.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
          {comandas.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-xs text-zinc-400">Nenhuma transação encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
