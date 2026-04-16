import React, { useEffect, useState } from "react";
import { Users, TrendingUp, Award, Scissors } from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineDateRange, FilterLineSearch, EmptyState,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import {
  useFinanceiro, formatCurrency, getFirstDayOfMonth, getTodayStr,
  type ProfissionalPagamento,
} from "@/src/hooks/useFinanceiro";

export function PagamentosView() {
  const { pagamentos, fetchPagamentos } = useFinanceiro();
  const [from, setFrom] = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]     = useState<string | null>(getTodayStr());
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchPagamentos(from, to);
  }, [from, to, fetchPagamentos]);

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
            </div>
          </div>
        )}
        getMobileBorderClass={() => "border-amber-200"}
      />
    </div>
  );
}
