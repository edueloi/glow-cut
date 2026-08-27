import React, { useEffect, useState } from "react";
import { Users, TrendingUp, Award, Scissors, Check, Undo2 } from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineDateRange, FilterLineSearch, EmptyState, Badge, Button, useToast,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import {
  useFinanceiro, formatCurrency, getFirstDayOfMonth, getTodayStr,
  type ProfissionalPagamento,
} from "@/src/hooks/useFinanceiro";

export function PagamentosView() {
  const { pagamentos, fetchPagamentos, markCommissionPayout, undoCommissionPayout } = useFinanceiro();
  const [from, setFrom] = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]     = useState<string | null>(getTodayStr());
  const [search, setSearch] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchPagamentos(from, to);
  }, [from, to, fetchPagamentos]);

  const handleTogglePayout = async (row: ProfissionalPagamento) => {
    if (!from || !to) return;
    setPayingId(row.professionalId);
    try {
      if (row.payout && row.payout.status === "paid") {
        await undoCommissionPayout(row.payout.id);
        toast.success("Baixa desfeita.");
      } else {
        await markCommissionPayout(row.professionalId, from, to, row.totalComissao);
        toast.success("Comissão marcada como paga.");
      }
      fetchPagamentos(from, to);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao atualizar a baixa.");
    } finally {
      setPayingId(null);
    }
  };

  const lista: ProfissionalPagamento[] = (pagamentos.data?.profissionais ?? []).filter(p =>
    !search || p.professionalName.toLowerCase().includes(search.toLowerCase())
  );
  const totalComissoes = pagamentos.data?.totalComissoes ?? 0;
  const totalFaturado  = lista.reduce((s, p) => s + p.totalFaturado, 0);
  const mediaComissao  = lista.length ? totalComissoes / lista.length : 0;

  const columns: Column<ProfissionalPagamento>[] = [
    {
      header: "Profissional",
      render: row => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black text-sm shrink-0">
            {row.professionalName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-zinc-900 truncate">{row.professionalName}</p>
            <p className="text-[10px] text-zinc-400 truncate">{row.professionalRole || "Profissional"}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Atendimentos",
      render: row => (
        <span className="text-xs font-bold text-zinc-700">{row.totalAtendimentos}</span>
      ),
      hideOnMobile: true,
    },
    {
      header: "Faturado",
      render: row => (
        <span className="text-sm font-black text-zinc-800">{formatCurrency(row.totalFaturado)}</span>
      ),
    },
    {
      header: "Comissão",
      render: row => (
        <div>
          <span className="text-sm font-black text-amber-600">{formatCurrency(row.totalComissao)}</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {row.totalFaturado > 0
              ? `${((row.totalComissao / row.totalFaturado) * 100).toFixed(1)}% do faturado`
              : "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Baixa",
      render: row => {
        const isPaid = row.payout?.status === "paid";
        return (
          <div className="flex items-center gap-2">
            <Badge color={isPaid ? "success" : "default"}>{isPaid ? "Pago" : "Pendente"}</Badge>
            <Button
              variant={isPaid ? "ghost" : "outline"}
              size="sm"
              disabled={payingId === row.professionalId || row.totalComissao <= 0}
              onClick={() => handleTogglePayout(row)}
              iconLeft={isPaid ? <Undo2 size={12} /> : <Check size={12} />}
              className="h-8 px-2.5 text-[10px]"
            >
              {isPaid ? "Desfazer" : "Marcar pago"}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Total Comissões" value={formatCurrency(totalComissoes)} icon={TrendingUp} color="default" description="No período" delay={0} />
        <StatCard title="Total Faturado" value={formatCurrency(totalFaturado)} icon={Scissors} color="success" description="Por todos profissionais" delay={0.05} />
        <StatCard title="Média por Prof." value={formatCurrency(mediaComissao)} icon={Award} color="purple" description={`${lista.length} profissional${lista.length !== 1 ? "is" : ""}`} delay={0.1} />
      </div>

      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar profissional..." />
          </FilterLineItem>
          <FilterLineItem>
            <FilterLineDateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} fromLabel="De" toLabel="Até" />
          </FilterLineItem>
        </FilterLineSection>
      </FilterLine>

      <GridTable<ProfissionalPagamento>
        data={lista}
        columns={columns}
        keyExtractor={r => r.professionalId}
        isLoading={pagamentos.loading}
        emptyMessage={
          <EmptyState
            title="Nenhum dado de comissão"
            description="Comandas fechadas com profissionais associados geram comissões automaticamente."
            icon={Users}
          />
        }
        renderMobileItem={row => (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black text-sm shrink-0">
                {row.professionalName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-black text-zinc-900">{row.professionalName}</p>
                <p className="text-[10px] text-zinc-400">{row.totalAtendimentos} atendimento{row.totalAtendimentos !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-amber-600">{formatCurrency(row.totalComissao)}</p>
              <p className="text-[10px] text-zinc-400">{formatCurrency(row.totalFaturado)} faturado</p>
              <Badge color={row.payout?.status === "paid" ? "success" : "default"} className="mt-1">
                {row.payout?.status === "paid" ? "Pago" : "Pendente"}
              </Badge>
            </div>
          </div>
        )}
        getMobileBorderClass={() => "border-amber-200"}
      />
    </div>
  );
}
