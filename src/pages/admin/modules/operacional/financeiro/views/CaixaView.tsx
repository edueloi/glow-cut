import React, { useEffect, useState } from "react";
import {
  Wallet, ShoppingBag, ArrowUpRight, ArrowDownLeft,
  ChevronLeft, ChevronRight, CreditCard,
} from "lucide-react";
import {
  StatCard, GridTable, Badge, EmptyState,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import {
  useFinanceiro, formatCurrency, formatDate,
  type ComandaCaixa, type LancamentoCaixa,
} from "@/src/hooks/useFinanceiro";

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro", pix: "Pix", card: "Cartão", credit: "Crédito",
  debit: "Débito", transfer: "Transferência", voucher: "Voucher", mixed: "Misto",
};
const PAYMENT_COLORS: Record<string, "success" | "info" | "purple" | "warning" | "teal" | "default"> = {
  cash: "success", pix: "info", card: "purple", credit: "purple",
  debit: "info", transfer: "warning", mixed: "teal",
};

function getToday() {
  return new Date().toISOString().slice(0, 10);
}
function offsetDay(dateStr: string, delta: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const today = getToday();
  if (dateStr === today) return "Hoje";
  const yest = offsetDay(today, -1);
  if (dateStr === yest) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function CaixaView() {
  const { caixa, fetchCaixa } = useFinanceiro();
  const [date, setDate] = useState(getToday());

  useEffect(() => {
    fetchCaixa(date);
  }, [date, fetchCaixa]);

  const data = caixa.data;
  const resumo = data?.resumo ?? {
    totalComandas: 0, totalEntradas: 0, totalSaidas: 0, saldo: 0, atendimentos: 0,
  };

  const cmdColumns: Column<ComandaCaixa>[] = [
    {
      header: "Hora",
      render: row => <span className="text-xs font-bold text-zinc-500">{formatTime(row.createdAt)}</span>,
    },
    {
      header: "Cliente",
      render: row => <span className="text-xs font-bold text-zinc-800">{row.clientName || "Sem cadastro"}</span>,
    },
    {
      header: "Itens / Pacotes",
      render: row => {
        if (!row.items?.length) return <span className="text-xs text-zinc-400">—</span>;
        return (
          <div className="flex flex-col">
            {row.items.slice(0, 2).map((item, idx) => (
              <span key={idx} className="text-xs text-zinc-600 truncate max-w-[150px]" title={item.name}>
                {item.quantity}x {item.name}
              </span>
            ))}
            {row.items.length > 2 && (
              <span className="text-[10px] text-zinc-400">+{row.items.length - 2} itens</span>
            )}
          </div>
        );
      },
    },
    {
      header: "Profissional",
      render: row => <span className="text-xs text-zinc-500">{row.professionalName || "—"}</span>,
      hideOnMobile: true,
    },
    {
      header: "Pagamento",
      render: row => (
        <Badge color={PAYMENT_COLORS[row.paymentMethod?.toLowerCase() || ""] || "default"} size="sm">
          {PAYMENT_LABELS[row.paymentMethod?.toLowerCase() || ""] || row.paymentMethod || "—"}
        </Badge>
      ),
    },
    {
      header: "Total",
      render: row => <span className="text-sm font-black text-emerald-600">{formatCurrency(row.total)}</span>,
    },
  ];

  const lancColumns: Column<LancamentoCaixa>[] = [
    {
      header: "Hora",
      render: row => <span className="text-xs font-bold text-zinc-500">{formatTime(row.date)}</span>,
    },
    {
      header: "Tipo",
      render: row => (
        <Badge color={row.type === "income" ? "success" : "danger"} dot size="sm">
          {row.type === "income" ? "Entrada" : "Saída"}
        </Badge>
      ),
    },
    {
      header: "Categoria",
      render: row => <span className="text-xs text-zinc-500">{row.category || "—"}</span>,
      hideOnMobile: true,
    },
    {
      header: "Descrição",
      render: row => (
        <span className="text-xs text-zinc-700 truncate max-w-[180px] block">{row.description || "—"}</span>
      ),
    },
    {
      header: "Valor",
      render: row => (
        <span className={`text-sm font-black ${row.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
          {row.type === "income" ? "+" : "−"}{formatCurrency(row.amount)}
        </span>
      ),
    },
  ];

  const isToday = date === getToday();

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Navegador de data */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-200 px-4 py-3 shadow-sm">
        <button
          onClick={() => setDate(d => offsetDay(d, -1))}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Caixa do Dia</p>
          <p className="text-base font-black text-zinc-900 mt-0.5">{formatDayLabel(date)}</p>
          <p className="text-[10px] text-zinc-400 font-medium">{formatDate(date + "T12:00:00")}</p>
        </div>
        <button
          onClick={() => setDate(d => offsetDay(d, 1))}
          disabled={date >= getToday()}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Receita Comandas" value={formatCurrency(resumo.totalComandas)} icon={ShoppingBag} color="success" description="Comandas fechadas" delay={0} />
        <StatCard title="Entradas Manuais" value={formatCurrency(resumo.totalEntradas)} icon={ArrowUpRight} color="info" description="Lançamentos de entrada" delay={0.05} />
        <StatCard title="Saídas" value={formatCurrency(resumo.totalSaidas)} icon={ArrowDownLeft} color="danger" description="Despesas do dia" delay={0.1} />
        <StatCard
          title="Saldo do Dia"
          value={formatCurrency(resumo.saldo)}
          icon={Wallet}
          color={resumo.saldo >= 0 ? "success" : "danger"}
          description={`${resumo.atendimentos} atendimento${resumo.atendimentos !== 1 ? "s" : ""}`}
          delay={0.15}
        />
      </div>

      {/* Comandas */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <ShoppingBag size={14} className="text-emerald-600" />
          </div>
          <h3 className="text-sm font-black text-zinc-800">Comandas Fechadas</h3>
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
            {data?.comandas?.length ?? 0}
          </span>
        </div>
        <GridTable<ComandaCaixa>
          data={data?.comandas ?? []}
          columns={cmdColumns}
          keyExtractor={r => r.id}
          isLoading={caixa.loading}
          emptyMessage={
            <EmptyState
              title="Nenhuma comanda fechada"
              description={isToday ? "As comandas fechadas hoje aparecerão aqui." : "Nenhuma comanda foi fechada neste dia."}
              icon={ShoppingBag}
            />
          }
          renderMobileItem={row => (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-black text-zinc-800">{row.clientName || "Sem cadastro"}</span>
                <span className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                  {row.items?.map(i => `${i.quantity}x ${i.name}`).join(", ") || "Nenhum item"}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-zinc-400">{formatTime(row.createdAt)}</span>
                  {row.paymentMethod && (
                    <Badge color={PAYMENT_COLORS[row.paymentMethod.toLowerCase()] || "default"} size="sm">
                      {PAYMENT_LABELS[row.paymentMethod.toLowerCase()] || row.paymentMethod}
                    </Badge>
                  )}
                  <span className="text-[10px] text-zinc-400 border-l border-zinc-200 pl-1.5 ml-0.5">
                    {row.professionalName?.split(` `)[0] || "Sem Prof."}
                  </span>
                </div>
              </div>
              <span className="text-sm font-black text-emerald-600">{formatCurrency(row.total)}</span>
            </div>
          )}
          getMobileBorderClass={() => "border-emerald-200"}
        />
      </div>

      {/* Lançamentos manuais */}
      {(data?.lancamentos?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <CreditCard size={14} className="text-blue-600" />
            </div>
            <h3 className="text-sm font-black text-zinc-800">Lançamentos Manuais</h3>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
              {data?.lancamentos?.length ?? 0}
            </span>
          </div>
          <GridTable<LancamentoCaixa>
            data={data?.lancamentos ?? []}
            columns={lancColumns}
            keyExtractor={r => r.id}
            isLoading={caixa.loading}
            emptyMessage="Nenhum lançamento manual."
            renderMobileItem={row => (
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col gap-0.5">
                  <Badge color={row.type === "income" ? "success" : "danger"} dot size="sm">
                    {row.type === "income" ? "Entrada" : "Saída"}
                  </Badge>
                  <span className="text-xs text-zinc-600 mt-0.5">{row.description || row.category || "—"}</span>
                  <span className="text-[10px] text-zinc-400">{formatTime(row.date)}</span>
                </div>
                <span className={`text-sm font-black ${row.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                  {row.type === "income" ? "+" : "−"}{formatCurrency(row.amount)}
                </span>
              </div>
            )}
            getMobileBorderClass={row => row.type === "income" ? "border-emerald-200" : "border-red-200"}
          />
        </div>
      )}

      {/* Fechamento */}
      {data && (
        <div className="bg-zinc-900 rounded-2xl p-5 shadow-xl">
          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-4">Resumo de Fechamento</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-zinc-400">Comandas fechadas</span>
              <span className="text-white">{formatCurrency(resumo.totalComandas)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-zinc-400">Entradas manuais</span>
              <span className="text-emerald-400">+ {formatCurrency(resumo.totalEntradas)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-zinc-400">Saídas / Despesas</span>
              <span className="text-red-400">− {formatCurrency(resumo.totalSaidas)}</span>
            </div>
            <div className="pt-3 mt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-sm font-black text-zinc-300">Saldo Final</span>
              <span className={`text-xl font-black ${resumo.saldo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(resumo.saldo)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
