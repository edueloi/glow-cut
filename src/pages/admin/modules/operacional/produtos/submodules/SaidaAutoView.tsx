import React, { useState, useEffect, useCallback } from "react";
import { CornerDownRight, Package, Wrench, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
  ContentCard, SectionTitle, EmptyState,
  Badge,
  useToast,
} from "@/src/components/ui";

interface AutoExitItem {
  productId: string; name: string; stock: number; minStock: number; unit?: string; serviceName: string; qtyPerService: number;
}

export function SaidaAutoView() {
  const [items, setItems] = useState<AutoExitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/inventory/ranking").then(r => r.json());
      setItems(data.autoExit || []);
    } catch { toast.error("Erro ao carregar saídas automáticas."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.serviceName.toLowerCase().includes(q);
  });

  const outCount = items.filter(i => i.stock <= 0).length;
  const lowCount = items.filter(i => i.stock > 0 && i.stock <= i.minStock).length;
  const okCount  = items.filter(i => i.stock > i.minStock).length;

  const byProduct = filtered.reduce<Record<string, AutoExitItem[]>>((acc, item) => {
    if (!acc[item.productId]) acc[item.productId] = [];
    acc[item.productId].push(item);
    return acc;
  }, {});

  return (
    <>
      <SectionTitle title="Saída Automática" description="Produtos que saem do estoque automaticamente ao executar serviços" icon={CornerDownRight} divider />

      <div className="mb-5 flex items-start gap-3 px-4 py-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-blue-700">Como funciona</p>
          <p className="text-xs font-bold text-blue-600 mt-0.5">
            Ao executar um serviço em uma comanda, os produtos vinculados são deduzidos automaticamente. Configure os vínculos em <strong>Serviços → Produtos consumidos</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard title="Vínculos" value={items.length} icon={CornerDownRight} description="Regras configuradas" color="purple" />
        <StatCard title="Com alerta" value={outCount + lowCount} icon={AlertTriangle} color={outCount + lowCount > 0 ? "danger" : "default"} description={`${outCount} zerado · ${lowCount} baixo`} />
        <StatCard title="Saudáveis" value={okCount} icon={CheckCircle} color="success" description="Estoque OK" />
      </div>

      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow><FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar produto ou serviço..." /></FilterLineItem>
        </FilterLineSection>
      </FilterLine>

      <ContentCard padding="none">
        {loading ? (
          <div className="py-16 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" /></div>
        ) : Object.keys(byProduct).length === 0 ? (
          <EmptyState icon={CornerDownRight} title="Nenhuma saída automática configurada"
            description="Vincule produtos aos serviços para que o estoque seja deduzido automaticamente ao atender um cliente."
            className="m-4" />
        ) : (
          <div className="divide-y divide-zinc-100">
            <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_100px] gap-4 px-4 py-3 bg-zinc-50/80 border-b border-zinc-100">
              {["Produto", "Serviço vinculado", "Qty/Serviço", "Estoque"].map(h => (
                <span key={h} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{h}</span>
              ))}
            </div>

            {Object.entries(byProduct).map(([productId, productItems]) => {
              const first = productItems[0];
              const out   = first.stock <= 0;
              const low   = !out && first.stock <= first.minStock;

              return (
                <div key={productId} className={`${out ? "bg-red-50/30" : low ? "bg-amber-50/20" : ""}`}>
                  {productItems.map((item, idx) => (
                    <div key={`${item.productId}-${item.serviceName}`}>
                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-[1fr_1fr_80px_100px] gap-4 items-center px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {idx === 0 ? (
                            <>
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${out ? "bg-red-50 border-red-200" : low ? "bg-amber-50 border-amber-200" : "bg-zinc-50 border-zinc-200"}`}>
                                <Package size={13} className={out ? "text-red-400" : low ? "text-amber-400" : "text-zinc-400"} />
                              </div>
                              <p className="text-sm font-black text-zinc-900 truncate">{item.name}</p>
                            </>
                          ) : <div className="w-8 h-8 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Wrench size={11} className="text-zinc-400 shrink-0" />
                          <p className="text-xs font-bold text-zinc-600 truncate">{item.serviceName}</p>
                        </div>
                        <p className="text-sm font-black text-zinc-700">{item.qtyPerService} <span className="text-[9px] text-zinc-400">{item.unit || "un"}</span></p>
                        {idx === 0
                          ? <Badge color={out ? "danger" : low ? "warning" : "success"} dot>{item.stock} {item.unit || "un"}</Badge>
                          : <div />}
                      </div>

                      {/* Mobile */}
                      <div className="sm:hidden flex items-start gap-3 px-4 py-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${idx > 0 ? "opacity-0 pointer-events-none" : out ? "bg-red-50 border-red-200" : low ? "bg-amber-50 border-amber-200" : "bg-zinc-50 border-zinc-200"}`}>
                          {idx === 0 && <Package size={14} className={out ? "text-red-400" : low ? "text-amber-400" : "text-zinc-400"} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {idx === 0 && (
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-black text-zinc-900 truncate">{item.name}</p>
                              <Badge color={out ? "danger" : low ? "warning" : "success"} dot size="sm">{item.stock} {item.unit || "un"}</Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Wrench size={10} className="text-zinc-400 shrink-0" />
                            <p className="text-xs font-bold text-zinc-600 truncate">{item.serviceName}</p>
                            <span className="text-[10px] text-zinc-400 font-bold shrink-0">— {item.qtyPerService} {item.unit || "un"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {Object.keys(byProduct).length} produto{Object.keys(byProduct).length !== 1 ? "s" : ""} · {filtered.length} vínculo{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </ContentCard>
    </>
  );
}
