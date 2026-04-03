import React from "react";
import { format } from "date-fns";
import { CheckCircle, FileText, TrendingUp } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { cn } from "@/src/lib/utils";

interface FluxoTabProps {
  comandas: any[];
}

export function FluxoTab({ comandas }: FluxoTabProps) {
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
