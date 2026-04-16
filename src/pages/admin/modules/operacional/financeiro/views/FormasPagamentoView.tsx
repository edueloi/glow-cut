import React, { useEffect, useState } from "react";
import { CreditCard, Wallet, Smartphone, Banknote } from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineDateRange, Badge, EmptyState,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import {
  useFinanceiro, formatCurrency, getFirstDayOfMonth, getTodayStr,
  formatPaymentMethod, getPaymentMethodColor,
  type FormaPagamento,
} from "@/src/hooks/useFinanceiro";

const METHOD_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  pix: Smartphone,
  card: CreditCard,
  credit: CreditCard,
  debit: CreditCard,
  transfer: Wallet,
  mixed: Wallet,
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

const BAR_COLORS: Record<string, string> = {
  cash: "bg-emerald-500", pix: "bg-blue-500", card: "bg-violet-500",
  credit: "bg-violet-500", debit: "bg-blue-400", transfer: "bg-yellow-500",
  mixed: "bg-teal-500", outros: "bg-zinc-400",
};

export function FormasPagamentoView() {
  const { formas, fetchFormas } = useFinanceiro();
  const [from, setFrom] = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]     = useState<string | null>(getTodayStr());

  useEffect(() => {
    fetchFormas(from, to);
  }, [from, to, fetchFormas]);

  const lista: FormaPagamento[] = formas.data?.formas ?? [];
  const totalGeral  = formas.data?.totalGeral ?? 0;
  const topMetodo   = lista[0];
  const totalTransacoes = lista.reduce((s, f) => s + f.count, 0);

  const columns: Column<FormaPagamento>[] = [
    {
      header: "Forma de Pagamento",
      render: row => {
        const Icon = METHOD_ICONS[row.method.toLowerCase()] || CreditCard;
        const color = getPaymentMethodColor(row.method);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border
              ${color === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                color === "info" ? "bg-blue-50 border-blue-100 text-blue-600" :
                color === "purple" ? "bg-violet-50 border-violet-100 text-violet-600" :
                "bg-zinc-50 border-zinc-100 text-zinc-500"}`}
            >
              <Icon size={16} />
            </div>
            <span className="text-xs font-black text-zinc-800">{formatPaymentMethod(row.method)}</span>
          </div>
        );
      },
    },
    {
      header: "Transações",
      render: row => <span className="text-xs font-bold text-zinc-600">{row.count}</span>,
      hideOnMobile: true,
    },
    {
      header: "Ticket Médio",
      render: row => <span className="text-xs font-bold text-zinc-600">{formatCurrency(row.ticketMedio)}</span>,
      hideOnMobile: true,
    },
    {
      header: "Participação",
      render: row => (
        <div className="w-full min-w-[100px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-zinc-500">{row.percentual.toFixed(1)}%</span>
          </div>
          <ProgressBar value={row.percentual} color={BAR_COLORS[row.method.toLowerCase()] || "bg-zinc-400"} />
        </div>
      ),
    },
    {
      header: "Total",
      render: row => <span className="text-sm font-black text-zinc-900">{formatCurrency(row.total)}</span>,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Total Recebido"
          value={formatCurrency(totalGeral)}
          icon={CreditCard}
          color="success"
          description="No período"
          delay={0}
        />
        <StatCard
          title="Método Mais Usado"
          value={topMetodo ? formatPaymentMethod(topMetodo.method) : "—"}
          icon={Wallet}
          color="info"
          description={topMetodo ? `${topMetodo.percentual.toFixed(1)}% do total` : "Sem dados"}
          delay={0.05}
        />
        <StatCard
          title="Total Transações"
          value={totalTransacoes}
          icon={Smartphone}
          color="default"
          description={`${lista.length} forma${lista.length !== 1 ? "s" : ""} de pagamento`}
          delay={0.1}
        />
      </div>

      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem>
            <FilterLineDateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} fromLabel="De" toLabel="Até" />
          </FilterLineItem>
        </FilterLineSection>
      </FilterLine>

      {/* Breakdown visual cards */}
      {lista.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {lista.map((f, i) => {
            const Icon = METHOD_ICONS[f.method.toLowerCase()] || CreditCard;
            const barColor = BAR_COLORS[f.method.toLowerCase()] || "bg-zinc-400";
            return (
              <div
                key={f.method}
                className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm hover:shadow-md transition-all"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                    <Icon size={15} className="text-zinc-500" />
                  </div>
                  <span className="text-[10px] font-black text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-100">
                    {f.count}x
                  </span>
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate mb-0.5">
                  {formatPaymentMethod(f.method)}
                </p>
                <p className="text-base font-black text-zinc-900 tracking-tight">{formatCurrency(f.total)}</p>
                <div className="mt-3">
                  <ProgressBar value={f.percentual} color={barColor} />
                  <p className="text-[9px] text-zinc-400 mt-1 font-bold">{f.percentual.toFixed(1)}% do total</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GridTable<FormaPagamento>
        data={lista}
        columns={columns}
        keyExtractor={r => r.method}
        isLoading={formas.loading}
        emptyMessage={
          <EmptyState
            title="Nenhuma transação encontrada"
            description="As formas de pagamento das comandas fechadas aparecerão aqui."
            icon={CreditCard}
          />
        }
        renderMobileItem={row => {
          const Icon = METHOD_ICONS[row.method.toLowerCase()] || CreditCard;
          return (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-800">{formatPaymentMethod(row.method)}</p>
                  <p className="text-[10px] text-zinc-400">{row.count} transação{row.count !== 1 ? "ões" : ""} · {row.percentual.toFixed(1)}%</p>
                </div>
              </div>
              <span className="text-sm font-black text-zinc-900">{formatCurrency(row.total)}</span>
            </div>
          );
        }}
      />
    </div>
  );
}
