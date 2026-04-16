import React, { useEffect, useState, useMemo } from "react";
import { Tag, TrendingDown, Percent } from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineDateRange, FilterLineSearch, Badge, EmptyState,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import { formatCurrency, formatDate, getFirstDayOfMonth, getTodayStr } from "@/src/hooks/useFinanceiro";
import { apiFetch } from "@/src/lib/api";

interface DescontoItem {
  id: string;
  clientName: string | null;
  professionalName: string | null;
  total: number;
  discount: number;
  discountType: string;
  description: string | null;
  createdAt: string;
}

export function MotivosDescontoView() {
  const [items, setItems]   = useState<DescontoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom]     = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]         = useState<string | null>(getTodayStr());
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: "closed" });
    if (from) params.set("from", from);
    if (to)   params.set("to", to);
    apiFetch(`/api/comandas?${params}`)
      .then(r => r.json())
      .then((data: any[]) => {
        const comDesconto = (data || [])
          .filter(c => Number(c.discount) > 0)
          .map(c => ({
            id: c.id,
            clientName: c.clientName || c.client?.name || null,
            professionalName: c.professionalName || c.professional?.name || null,
            total: Number(c.total),
            discount: Number(c.discount),
            discountType: c.discountType || "value",
            description: c.description || null,
            createdAt: c.createdAt,
          }))
          .sort((a, b) => b.discount - a.discount);
        setItems(comDesconto);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [from, to]);

  const lista = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => !q ||
      i.clientName?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalDescontos = lista.reduce((s, i) => {
    if (i.discountType === "percentage") return s + (i.total * i.discount / 100);
    return s + i.discount;
  }, 0);
  const totalOriginal = lista.reduce((s, i) => s + i.total + i.discount, 0);
  const percentGeral  = totalOriginal > 0 ? (totalDescontos / totalOriginal) * 100 : 0;

  const getDiscountValue = (item: DescontoItem) =>
    item.discountType === "percentage" ? item.total * item.discount / 100 : item.discount;

  const columns: Column<DescontoItem>[] = [
    { header: "Data", render: row => <span className="text-xs font-bold text-zinc-500">{formatDate(row.createdAt)}</span> },
    {
      header: "Cliente",
      render: row => <span className="text-xs font-bold text-zinc-800">{row.clientName || "Sem cadastro"}</span>,
    },
    {
      header: "Profissional",
      render: row => <span className="text-xs text-zinc-500">{row.professionalName || "—"}</span>,
      hideOnMobile: true,
    },
    {
      header: "Desconto Aplicado",
      render: row => (
        <div>
          <span className="text-sm font-black text-red-500">
            {row.discountType === "percentage"
              ? `${row.discount}% (${formatCurrency(getDiscountValue(row))})`
              : formatCurrency(row.discount)}
          </span>
        </div>
      ),
    },
    {
      header: "Total Final",
      render: row => <span className="text-sm font-black text-zinc-700">{formatCurrency(row.total)}</span>,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Total Descontos" value={formatCurrency(totalDescontos)} icon={TrendingDown} color="danger" description={`${lista.length} comanda${lista.length !== 1 ? "s" : ""}`} delay={0} />
        <StatCard title="% Médio de Desconto" value={`${percentGeral.toFixed(1)}%`} icon={Percent} color="warning" description="Sobre o total original" delay={0.05} />
        <StatCard title="Ticket Médio c/ Desc." value={lista.length ? formatCurrency(lista.reduce((s, i) => s + i.total, 0) / lista.length) : "R$ 0,00"} icon={Tag} color="default" description="Após desconto" delay={0.1} />
      </div>

      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar cliente ou descrição..." />
          </FilterLineItem>
          <FilterLineItem>
            <FilterLineDateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} fromLabel="De" toLabel="Até" />
          </FilterLineItem>
        </FilterLineSection>
      </FilterLine>

      <GridTable<DescontoItem>
        data={lista}
        columns={columns}
        keyExtractor={r => r.id}
        isLoading={loading}
        emptyMessage={
          <EmptyState
            title="Nenhum desconto encontrado"
            description="Comandas fechadas com desconto aplicado aparecerão aqui."
            icon={Tag}
          />
        }
        renderMobileItem={row => (
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-xs font-black text-zinc-900">{row.clientName || "Sem cadastro"}</p>
              <p className="text-[10px] text-zinc-400">{formatDate(row.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-red-500">
                {row.discountType === "percentage" ? `${row.discount}%` : formatCurrency(row.discount)}
              </p>
              <p className="text-[10px] text-zinc-400">{formatCurrency(row.total)} final</p>
            </div>
          </div>
        )}
        getMobileBorderClass={() => "border-red-100"}
      />
    </div>
  );
}
