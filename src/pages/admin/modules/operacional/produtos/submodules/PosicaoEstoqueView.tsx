import React, { useState, useEffect, useCallback } from "react";
import { Layers, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Package } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineSegmented,
  ContentCard, SectionTitle, EmptyState,
  Badge,
  GridTable, Column,
  useToast,
} from "@/src/components/ui";

interface PosicaoProduct {
  id: string; name: string; code?: string; stock: number; minStock: number;
  costPrice: number; salePrice: number; unit?: string; isForSale: boolean | number;
  sectorName?: string; sectorColor?: string;
}

type StockStatus = "ok" | "low" | "out";

function getStatus(p: PosicaoProduct): StockStatus {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.minStock) return "low";
  return "ok";
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getMargin(p: PosicaoProduct): number | null {
  if (p.costPrice <= 0) return null;
  return ((p.salePrice - p.costPrice) / p.costPrice) * 100;
}

function StockBar({ product }: { product: PosicaoProduct }) {
  const s = getStatus(product);
  const pct = product.minStock > 0 ? Math.min(100, (product.stock / (product.minStock * 3)) * 100) : product.stock > 0 ? 100 : 4;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-1">
        <span className={`text-base font-black tracking-tighter ${s === "out" ? "text-red-500" : s === "low" ? "text-amber-500" : "text-zinc-900"}`}>{product.stock}</span>
        <span className="text-[10px] font-bold text-zinc-400">{product.unit || "un"}</span>
      </div>
      <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${s === "out" ? "bg-red-500" : s === "low" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PosicaoEstoqueView() {
  const [products, setProducts] = useState<PosicaoProduct[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [totalSale, setTotalSale] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StockStatus>("all");
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/inventory/stock-position").then(r => r.json());
      setProducts(data.products || []);
      setTotalCost(data.totalCost || 0);
      setTotalSale(data.totalSale || 0);
    } catch { toast.error("Erro ao carregar posição de estoque."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q) || p.sectorName?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || getStatus(p) === statusFilter;
    return matchSearch && matchStatus;
  });

  const outCount  = products.filter(p => getStatus(p) === "out").length;
  const lowCount  = products.filter(p => getStatus(p) === "low").length;
  const okCount   = products.filter(p => getStatus(p) === "ok").length;
  const potentialProfit = totalSale - totalCost;

  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "ok",  label: "OK" },
    { value: "low", label: "Baixo" },
    { value: "out", label: "Zerado" },
  ] as { value: "all" | StockStatus; label: string }[];

  const columns: Column<PosicaoProduct>[] = [
    {
      header: "Produto",
      render: p => {
        const s = getStatus(p);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              s === "out" ? "bg-red-50 border-red-200" : s === "low" ? "bg-amber-50 border-amber-200" : "bg-zinc-50 border-zinc-200"
            }`}>
              <Package size={14} className={s === "out" ? "text-red-400" : s === "low" ? "text-amber-400" : "text-zinc-400"} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {p.code && <span className="text-[8px] font-black text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-zinc-200/50">{p.code}</span>}
                {p.sectorName && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md border"
                    style={{ backgroundColor: (p.sectorColor || "#888") + "18", color: p.sectorColor || "#888", borderColor: (p.sectorColor || "#888") + "30" }}>
                    {p.sectorName}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    { header: "Estoque", render: p => <StockBar product={p} /> },
    {
      header: "Status",
      render: p => {
        const s = getStatus(p);
        return <Badge color={s === "out" ? "danger" : s === "low" ? "warning" : "success"} dot>{s === "out" ? "Zerado" : s === "low" ? "Baixo" : "OK"}</Badge>;
      },
    },
    { header: "Custo", hideOnMobile: true, render: p => <p className="text-xs font-bold text-zinc-500">{formatBRL(p.costPrice)}</p> },
    { header: "Venda", hideOnMobile: true, render: p => <p className="text-sm font-black text-zinc-900">{formatBRL(p.salePrice)}</p> },
    {
      header: "Margem", hideOnMobile: true,
      render: p => {
        const m = getMargin(p);
        if (m === null) return <span className="text-zinc-300 text-xs">—</span>;
        return (
          <div className="flex items-center gap-1">
            {m >= 0 ? <TrendingUp size={11} className={m >= 30 ? "text-emerald-500" : "text-amber-500"} /> : <TrendingDown size={11} className="text-red-500" />}
            <span className={`text-sm font-black ${m >= 30 ? "text-emerald-600" : m >= 0 ? "text-amber-500" : "text-red-500"}`}>{m.toFixed(0)}%</span>
          </div>
        );
      },
    },
    { header: "Valor em Estoque", hideOnMobile: true, render: p => <p className="text-sm font-black text-zinc-700">{formatBRL(p.costPrice * p.stock)}</p> },
  ];

  return (
    <>
      <SectionTitle title="Posição de Estoque" description="Visão consolidada do estoque atual com valores e alertas" icon={Layers} divider />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard title="Valor de Custo" value={formatBRL(totalCost)} icon={DollarSign} color="info" description="Total investido" />
        <StatCard title="Lucro Potencial" value={formatBRL(potentialProfit)} icon={potentialProfit >= 0 ? TrendingUp : TrendingDown}
          color={potentialProfit >= 0 ? "success" : "danger"} description={`Receita: ${formatBRL(totalSale)}`} />
        <StatCard title="Produtos OK" value={okCount} icon={CheckCircle} color="success" description="Dentro do ideal" />
        <StatCard title="Atenção" value={outCount + lowCount} icon={AlertTriangle} color={outCount + lowCount > 0 ? "danger" : "default"}
          description={`${outCount} zerado · ${lowCount} baixo`} />
      </div>

      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar por produto, SKU, setor..." />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right" wrap={false}>
          <FilterLineSegmented value={statusFilter} onChange={v => setStatusFilter(v as "all" | StockStatus)} options={statusOptions} size="sm" />
        </FilterLineSection>
      </FilterLine>

      <ContentCard padding="none">
        <GridTable
          data={filtered} columns={columns} keyExtractor={p => p.id} isLoading={loading}
          emptyMessage={<EmptyState icon={Layers} title="Nenhum produto encontrado" description="Ajuste os filtros ou cadastre produtos para visualizar a posição de estoque." className="m-4" />}
          renderMobileItem={p => {
            const s = getStatus(p);
            const m = getMargin(p);
            return (
              <div className="flex items-start gap-3 -m-4 px-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  s === "out" ? "bg-red-50 border-red-200" : s === "low" ? "bg-amber-50 border-amber-200" : "bg-zinc-50 border-zinc-200"
                }`}>
                  <Package size={16} className={s === "out" ? "text-red-400" : s === "low" ? "text-amber-400" : "text-zinc-400"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
                    <Badge color={s === "out" ? "danger" : s === "low" ? "warning" : "success"} dot size="sm">{s === "out" ? "Zerado" : s === "low" ? "Baixo" : "OK"}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Estoque</p><p className={`text-sm font-black ${s === "out" ? "text-red-500" : s === "low" ? "text-amber-500" : "text-zinc-900"}`}>{p.stock} <span className="text-[9px] font-bold text-zinc-400">{p.unit || "un"}</span></p></div>
                    <div><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Venda</p><p className="text-sm font-black text-zinc-900">{formatBRL(p.salePrice)}</p></div>
                    <div><p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Margem</p><p className={`text-sm font-black ${m !== null && m >= 30 ? "text-emerald-600" : m !== null && m >= 0 ? "text-amber-500" : "text-red-500"}`}>{m !== null ? `${m.toFixed(0)}%` : "—"}</p></div>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-2">
                    <div className={`h-full rounded-full ${s === "out" ? "bg-red-500" : s === "low" ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${p.minStock > 0 ? Math.min(100, (p.stock / (p.minStock * 3)) * 100) : p.stock > 0 ? 100 : 4}%` }} />
                  </div>
                </div>
              </div>
            );
          }}
        />
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filtered.length} produto{filtered.length !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { color: "bg-emerald-500", label: "OK",   count: filtered.filter(p => getStatus(p) === "ok").length },
                { color: "bg-amber-500",   label: "Baixo",count: filtered.filter(p => getStatus(p) === "low").length },
                { color: "bg-red-500",     label: "Zero", count: filtered.filter(p => getStatus(p) === "out").length },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{s.count} {s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ContentCard>
    </>
  );
}
