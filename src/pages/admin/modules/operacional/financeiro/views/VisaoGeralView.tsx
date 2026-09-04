import React, { useEffect, useState } from "react";
import { Target, Wallet, AlertTriangle } from "lucide-react";
import { StatCard } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";
import { useFinanceiro, formatCurrency } from "@/src/hooks/useFinanceiro";

function getCurrentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function VisaoGeralView() {
  const { previsaoRealizado, fetchPrevisaoRealizado } = useFinanceiro();
  const [mes, setMes] = useState(getCurrentMonthStr());

  useEffect(() => {
    fetchPrevisaoRealizado(mes);
  }, [mes, fetchPrevisaoRealizado]);

  const data = previsaoRealizado.data;
  const previstoTotal = data?.previsto.total || 0;
  const realizadoTotal = data?.realizado.total || 0;
  const percentual = data?.percentualRealizado || 0;
  const barPercent = Math.min(100, percentual);
  const excedeu = percentual > 100;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
            Previsto x Realizado
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">{formatMonthLabel(mes)}</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          title="Previsto do Mês"
          value={formatCurrency(previstoTotal)}
          icon={Target}
          color="info"
          description="Agendamentos futuros + comandas em aberto"
          delay={0}
        />
        <StatCard
          title="Realizado do Mês"
          value={formatCurrency(realizadoTotal)}
          icon={Wallet}
          color="success"
          description={`${data?.realizado.count ?? 0} lançamento(s) recebido(s)`}
          delay={0.05}
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Progresso do mês
          </p>
          <p className={cn("text-sm font-black", excedeu ? "text-emerald-600" : "text-zinc-700")}>
            {percentual.toFixed(1)}%
          </p>
        </div>
        <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              excedeu ? "bg-emerald-500" : "bg-blue-500"
            )}
            style={{ width: `${barPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-400 mt-2">
          {excedeu
            ? "O realizado já superou o previsto para este mês."
            : "Percentual do valor previsto que já foi efetivamente recebido."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 sm:p-5">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
            Composição do previsto
          </p>
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-zinc-500">Agendamentos futuros</span>
            <span className="font-bold text-zinc-800">{formatCurrency(data?.previsto.agendamentosFuturos || 0)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-zinc-500">Comandas em aberto</span>
            <span className="font-bold text-zinc-800">{formatCurrency(data?.previsto.comandasAbertas || 0)}</span>
          </div>
        </div>

        {(data?.previsto.agendamentosSemPreco || 0) > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 sm:p-5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              {data?.previsto.agendamentosSemPreco} agendamento(s) sem serviço/preço definido não entraram nesta previsão.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
