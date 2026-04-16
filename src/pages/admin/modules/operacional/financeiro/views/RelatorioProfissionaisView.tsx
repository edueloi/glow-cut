import React, { useEffect, useState, useMemo } from "react";
import { BarChart3, TrendingUp, Users, Scissors, ChevronDown, ChevronUp } from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineDateRange, FilterLineSearch, Badge, EmptyState,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import {
  useFinanceiro, formatCurrency, getFirstDayOfMonth, getTodayStr,
  type ProfissionalRelatorio,
} from "@/src/hooks/useFinanceiro";

export function RelatorioProfissionaisView() {
  const { relatorio, fetchRelatorio } = useFinanceiro();
  const [from, setFrom]   = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]       = useState<string | null>(getTodayStr());
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchRelatorio(from, to);
  }, [from, to, fetchRelatorio]);

  const lista: ProfissionalRelatorio[] = useMemo(() => {
    const q = search.toLowerCase();
    return (relatorio.data?.profissionais ?? []).filter(p =>
      !q || p.professionalName.toLowerCase().includes(q)
    );
  }, [relatorio.data, search]);

  const totalReceita    = lista.reduce((s, p) => s + p.receita, 0);
  const totalAtendimentos = lista.reduce((s, p) => s + p.atendimentos, 0);
  const ticketMedioGeral = totalAtendimentos > 0 ? totalReceita / totalAtendimentos : 0;

  const columns: Column<ProfissionalRelatorio>[] = [
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
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-zinc-800">{row.atendimentos}</span>
          <span className="text-[10px] text-zinc-400">/{row.clientesAtendidos} clientes</span>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      header: "Ticket Médio",
      render: row => (
        <span className="text-xs font-bold text-zinc-600">{formatCurrency(row.ticketMedio)}</span>
      ),
      hideOnMobile: true,
    },
    {
      header: "Descontos",
      render: row => (
        <span className="text-xs text-red-500 font-bold">{formatCurrency(row.totalDesconto)}</span>
      ),
      hideOnMobile: true,
    },
    {
      header: "Receita",
      render: row => (
        <span className="text-sm font-black text-emerald-600">{formatCurrency(row.receita)}</span>
      ),
    },
    {
      header: "",
      render: row => (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => v === row.professionalId ? null : row.professionalId); }}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          {expanded === row.professionalId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Receita Total" value={formatCurrency(totalReceita)} icon={TrendingUp} color="success" description="No período" delay={0} />
        <StatCard title="Total Atendimentos" value={totalAtendimentos} icon={Scissors} color="default" description={`${lista.length} profissional${lista.length !== 1 ? "is" : ""}`} delay={0.05} />
        <StatCard title="Ticket Médio Geral" value={formatCurrency(ticketMedioGeral)} icon={BarChart3} color="info" description="Todos os profissionais" delay={0.1} />
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

      <GridTable<ProfissionalRelatorio>
        data={lista}
        columns={columns}
        keyExtractor={r => r.professionalId}
        isLoading={relatorio.loading}
        emptyMessage={
          <EmptyState
            title="Nenhum dado encontrado"
            description="Quando profissionais realizarem atendimentos, os dados aparecerão aqui."
            icon={Users}
          />
        }
        renderMobileExpandedContent={row => (
          row.servicosMaisRealizados.length > 0 ? (
            <div className="px-4 pb-3">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Serviços Mais Realizados</p>
              <div className="space-y-1.5">
                {row.servicosMaisRealizados.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600 font-medium truncate flex-1 mr-2">{s.serviceName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge color="default" size="sm">{s.vezes}x</Badge>
                      <span className="text-xs font-bold text-zinc-700">{formatCurrency(s.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
        renderMobileItem={row => (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black text-sm shrink-0">
                {row.professionalName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-black text-zinc-900">{row.professionalName}</p>
                <p className="text-[10px] text-zinc-400">{row.atendimentos} atendimento{row.atendimentos !== 1 ? "s" : ""} · TM {formatCurrency(row.ticketMedio)}</p>
              </div>
            </div>
            <span className="text-sm font-black text-emerald-600">{formatCurrency(row.receita)}</span>
          </div>
        )}
        getMobileBorderClass={() => "border-amber-200"}
      />

      {/* Detalhes expandidos (desktop) */}
      {expanded && (() => {
        const prof = lista.find(p => p.professionalId === expanded);
        if (!prof?.servicosMaisRealizados.length) return null;
        return (
          <div className="hidden sm:block bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black text-sm">
                {prof.professionalName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black text-zinc-900">{prof.professionalName}</p>
                <p className="text-[10px] text-zinc-400">Serviços mais realizados no período</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {prof.servicosMaisRealizados.map((s, i) => (
                <div key={i} className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-xs font-bold text-zinc-700 truncate">{s.serviceName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge color="default" size="sm">{s.vezes}x realizado</Badge>
                    <span className="text-xs font-black text-zinc-900">{formatCurrency(s.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
