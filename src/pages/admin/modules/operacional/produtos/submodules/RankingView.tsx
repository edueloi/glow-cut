import React, { useState, useEffect, useCallback } from "react";
import { TrendingUp, Trophy, Flame, Package, DollarSign, ArrowUp } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineSegmented,
  ContentCard, SectionTitle, EmptyState,
  Badge,
  useToast,
} from "@/src/components/ui";

interface SaleRank { productId: string; name: string; salePrice: number; costPrice: number; unit?: string; totalSold: number; salesCount: number; }
interface ConsumedRank { productId: string; name: string; totalConsumed: number; }
interface AutoExitItem { productId: string; name: string; stock: number; minStock: number; unit?: string; serviceName: string; qtyPerService: number; }

function formatBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

type ViewTab = "vendas" | "consumo" | "auto";

function PodiumCard({ rank, item }: { rank: number; item: SaleRank }) {
  const margin = item.costPrice > 0 ? ((item.salePrice - item.costPrice) / item.costPrice) * 100 : null;
  const receita = item.totalSold * item.salePrice;
  const colors = [
    { bg: "from-amber-400 to-yellow-500" },
    { bg: "from-zinc-300 to-zinc-400" },
    { bg: "from-orange-400 to-amber-600" },
  ];
  const c = colors[rank - 1] || colors[2];

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-100 bg-white shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.bg}`} />
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center shrink-0`}>
          {rank === 1 ? <Trophy size={16} className="text-white" /> : <span className="text-white font-black text-sm">{rank}º</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-zinc-900 truncate">{item.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge color="default" size="sm">{item.totalSold} {item.unit || "un"}</Badge>
            {margin !== null && <Badge color={margin >= 30 ? "success" : margin >= 0 ? "warning" : "danger"} size="sm">{margin.toFixed(0)}% margem</Badge>}
          </div>
          <p className="text-xs font-black text-zinc-700 mt-1.5">{formatBRL(receita)}</p>
        </div>
      </div>
    </div>
  );
}

export function RankingView() {
  const [sales, setSales] = useState<SaleRank[]>([]);
  const [consumed, setConsumed] = useState<ConsumedRank[]>([]);
  const [autoExit, setAutoExit] = useState<AutoExitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ViewTab>("vendas");
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/inventory/ranking").then(r => r.json());
      setSales(data.sales || []);
      setConsumed(data.consumed || []);
      setAutoExit(data.autoExit || []);
    } catch { toast.error("Erro ao carregar ranking."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalReceita = sales.reduce((acc, s) => acc + s.totalSold * s.salePrice, 0);

  const filteredSales    = sales.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredConsumed = consumed.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const filteredAuto     = autoExit.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.serviceName.toLowerCase().includes(search.toLowerCase()));

  const tabOptions = [
    { value: "vendas",  label: "Vendas",    icon: <TrendingUp size={12} /> },
    { value: "consumo", label: "Consumo",   icon: <Flame size={12} /> },
    { value: "auto",    label: "Saída Auto",icon: <Package size={12} /> },
  ] as { value: ViewTab; label: string; icon: React.ReactNode }[];

  return (
    <>
      <SectionTitle title="Ranking de Produtos" description="Curva ABC — produtos mais vendidos e consumidos" icon={TrendingUp} divider />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard title="Top Vendidos" value={sales.length} icon={Trophy} color="default" description="Produtos no ranking" />
        <StatCard title="Receita Total" value={formatBRL(totalReceita)} icon={DollarSign} color="success" description="Estimativa acumulada" />
        <StatCard title="Consumo Interno" value={consumed.length} icon={Flame} color="warning" description="Produtos mais usados" className="hidden sm:block" />
      </div>

      {tab === "vendas" && filteredSales.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Trophy size={11} className="text-amber-500" />Pódio
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {filteredSales.slice(0, 3).map((item, idx) => <PodiumCard key={item.productId} rank={idx + 1} item={item} />)}
          </div>
        </div>
      )}

      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow><FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar produto..." /></FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right" wrap={false}>
          <FilterLineSegmented value={tab} onChange={v => setTab(v as ViewTab)} options={tabOptions} size="sm" />
        </FilterLineSection>
      </FilterLine>

      <ContentCard padding="none">
        {loading ? (
          <div className="py-16 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" /></div>
        ) : (
          <>
            {tab === "vendas" && (
              filteredSales.length === 0 ? (
                <EmptyState icon={TrendingUp} title="Nenhuma venda registrada" description="As vendas aparecerão aqui conforme forem registradas." className="m-4" />
              ) : (
                <div className="divide-y divide-zinc-100">
                  <div className="hidden sm:grid grid-cols-[40px_1fr_80px_80px_120px_80px] gap-4 px-4 py-3 bg-zinc-50/80 border-b border-zinc-100">
                    {["#", "Produto", "Vendido", "Receita", "Margem", "Curva"].map(h => (
                      <span key={h} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{h}</span>
                    ))}
                  </div>
                  {filteredSales.map((item, idx) => {
                    const margin = item.costPrice > 0 ? ((item.salePrice - item.costPrice) / item.costPrice) * 100 : null;
                    const receita = item.totalSold * item.salePrice;
                    const curva = idx < Math.ceil(filteredSales.length * 0.2) ? "A" : idx < Math.ceil(filteredSales.length * 0.5) ? "B" : "C";
                    return (
                      <div key={item.productId}>
                        <div className="hidden sm:grid grid-cols-[40px_1fr_80px_80px_120px_80px] gap-4 items-center px-4 py-3.5">
                          <span className="text-sm font-black text-zinc-400">{idx + 1}</span>
                          <div className="flex items-center gap-2.5">
                            {idx < 3 && <Trophy size={13} className={idx === 0 ? "text-amber-500" : idx === 1 ? "text-zinc-400" : "text-orange-500"} />}
                            <p className="text-sm font-black text-zinc-900 truncate">{item.name}</p>
                          </div>
                          <p className="text-sm font-black text-zinc-700">{item.totalSold} <span className="text-[9px] text-zinc-400">{item.unit || "un"}</span></p>
                          <p className="text-sm font-black text-zinc-900">{formatBRL(receita)}</p>
                          <div className="flex items-center gap-1">
                            {margin !== null ? (
                              <><ArrowUp size={11} className={margin >= 30 ? "text-emerald-500" : margin >= 0 ? "text-amber-500" : "text-red-500"} />
                              <span className={`text-sm font-black ${margin >= 30 ? "text-emerald-600" : margin >= 0 ? "text-amber-500" : "text-red-500"}`}>{margin.toFixed(0)}%</span></>
                            ) : <span className="text-zinc-300">—</span>}
                          </div>
                          <Badge color={curva === "A" ? "success" : curva === "B" ? "info" : "default"}>Curva {curva}</Badge>
                        </div>
                        <div className="sm:hidden flex items-start gap-3 px-4 py-3.5">
                          <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 font-black text-zinc-500 text-sm">{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-900 truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge color={curva === "A" ? "success" : curva === "B" ? "info" : "default"} size="sm">Curva {curva}</Badge>
                              <span className="text-[10px] text-zinc-500 font-bold">{item.totalSold} {item.unit || "un"}</span>
                              <span className="text-[10px] text-zinc-700 font-black">{formatBRL(receita)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {tab === "consumo" && (
              filteredConsumed.length === 0 ? (
                <EmptyState icon={Flame} title="Nenhum consumo registrado" description="O consumo via comandas aparecerá aqui." className="m-4" />
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredConsumed.map((item, idx) => (
                    <div key={item.productId} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="text-sm font-black text-zinc-400 w-6 shrink-0">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                        <Flame size={13} className="text-orange-500" />
                      </div>
                      <p className="text-sm font-black text-zinc-900 flex-1 truncate">{item.name}</p>
                      <Badge color="warning" size="sm">{item.totalConsumed} consumidos</Badge>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "auto" && (
              filteredAuto.length === 0 ? (
                <EmptyState icon={Package} title="Nenhuma saída automática configurada" description="Configure produtos para saírem automaticamente ao executar serviços." className="m-4" />
              ) : (
                <div className="divide-y divide-zinc-100">
                  {filteredAuto.map(item => {
                    const low = item.stock <= item.minStock;
                    const out = item.stock <= 0;
                    return (
                      <div key={`${item.productId}-${item.serviceName}`} className="flex items-start gap-3 px-4 py-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${out ? "bg-red-50 border-red-200" : low ? "bg-amber-50 border-amber-200" : "bg-violet-50 border-violet-100"}`}>
                          <Package size={14} className={out ? "text-red-400" : low ? "text-amber-400" : "text-violet-500"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-zinc-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-zinc-500 font-bold truncate mt-0.5">{item.serviceName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge color={out ? "danger" : low ? "warning" : "success"} dot size="sm">{item.stock} {item.unit || "un"}</Badge>
                            <span className="text-[10px] text-zinc-400 font-bold">{item.qtyPerService} {item.unit || "un"}/serviço</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}

        {(
          (tab === "vendas" && filteredSales.length > 0) ||
          (tab === "consumo" && filteredConsumed.length > 0) ||
          (tab === "auto" && filteredAuto.length > 0)
        ) && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {tab === "vendas" ? `${filteredSales.length} produto${filteredSales.length !== 1 ? "s" : ""}` :
               tab === "consumo" ? `${filteredConsumed.length} produto${filteredConsumed.length !== 1 ? "s" : ""}` :
               `${filteredAuto.length} vínculo${filteredAuto.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        )}
      </ContentCard>
    </>
  );
}
