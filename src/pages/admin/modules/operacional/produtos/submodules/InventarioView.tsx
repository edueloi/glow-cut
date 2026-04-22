import React, { useState, useEffect, useCallback } from "react";
import { ClipboardList, Check, AlertTriangle, Package, RefreshCw, Save } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
  ContentCard, SectionTitle, EmptyState,
  Button,
  Badge,
  useToast,
} from "@/src/components/ui";

interface InventoryProduct {
  id: string; name: string; code?: string; stock: number; minStock: number; unit?: string;
  sectorName?: string; sectorColor?: string; counted?: number | ""; isDirty?: boolean;
}

function formatDiff(current: number, counted: number) {
  return { value: counted - current, positive: counted - current >= 0 };
}

export function InventarioView() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/inventory/stock-position").then(r => r.json());
      setProducts((data.products || []).map((p: any) => ({ ...p, counted: "", isDirty: false })));
    } catch { toast.error("Erro ao carregar inventário."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateCount = (id: string, value: string) => {
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, counted: value === "" ? "" : parseInt(value) ?? "", isDirty: true } : p
    ));
    setSaved(false);
  };

  const handleSaveAll = async () => {
    const adjustments = products
      .filter(p => p.isDirty && p.counted !== "" && p.counted !== undefined)
      .map(p => ({ productId: p.id, newQty: Number(p.counted) }));
    if (adjustments.length === 0) { toast.info("Nenhuma contagem alterada para salvar."); return; }
    setSaving(true);
    try {
      await apiFetch("/api/inventory/inventory-adjust", {
        method: "POST",
        body: JSON.stringify({ adjustments, reason: "Ajuste de inventário" }),
      });
      toast.success(`${adjustments.length} produto(s) ajustado(s)!`);
      setSaved(true);
      load();
    } catch { toast.error("Erro ao salvar inventário."); }
    finally { setSaving(false); }
  };

  const dirtyCount = products.filter(p => p.isDirty && p.counted !== "").length;

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q) || p.sectorName?.toLowerCase().includes(q);
  });

  const withDiff  = filtered.filter(p => p.isDirty && p.counted !== "" && Number(p.counted) !== p.stock);
  const negDiff   = withDiff.filter(p => Number(p.counted) < p.stock).length;
  const posDiff   = withDiff.filter(p => Number(p.counted) > p.stock).length;

  return (
    <>
      <SectionTitle
        title="Inventário (Contagem)"
        description="Faça a contagem física e ajuste o estoque do sistema"
        icon={ClipboardList}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconLeft={<RefreshCw size={13} />} onClick={load}>
              <span className="hidden sm:inline">Recarregar</span>
            </Button>
            <Button iconLeft={<Save size={14} />} onClick={handleSaveAll} loading={saving} disabled={dirtyCount === 0}>
              Salvar {dirtyCount > 0 && `(${dirtyCount})`}
            </Button>
          </div>
        }
        divider
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard title="Total de Itens" value={products.length} icon={Package} description="Para contar" />
        <StatCard title="Contados" value={dirtyCount} icon={Check} color="success" description="Com contagem registrada" />
        <StatCard title="Divergências ↑" value={posDiff} icon={AlertTriangle} color="warning" description="Sobras encontradas" />
        <StatCard title="Divergências ↓" value={negDiff} icon={AlertTriangle} color="danger" description="Perdas encontradas" />
      </div>

      {dirtyCount > 0 && !saved && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <p className="text-xs font-bold text-amber-700 flex-1">
            {dirtyCount} produto{dirtyCount !== 1 ? "s" : ""} com contagem pendente. Clique em <strong>Salvar</strong> para aplicar.
          </p>
          <Button size="sm" onClick={handleSaveAll} loading={saving} iconLeft={<Save size={13} />}>Salvar agora</Button>
        </div>
      )}

      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar produto, SKU, setor..." />
          </FilterLineItem>
        </FilterLineSection>
      </FilterLine>

      <ContentCard padding="none">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhum produto para contar" description="Cadastre produtos para iniciar o inventário." className="m-4" />
        ) : (
          <div className="divide-y divide-zinc-100">
            {/* Desktop header */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_80px] gap-4 px-4 py-3 bg-zinc-50/80 border-b border-zinc-100">
              {["Produto", "Sistema", "Contagem", "Diferença", "Status"].map(h => (
                <span key={h} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{h}</span>
              ))}
            </div>

            {filtered.map(p => {
              const hasCounted = p.counted !== "" && p.counted !== undefined;
              const counted    = hasCounted ? Number(p.counted) : null;
              const diff       = counted !== null ? formatDiff(p.stock, counted) : null;
              const hasChange  = diff !== null && diff.value !== 0;

              return (
                <div key={p.id} className={`transition-colors ${hasCounted ? (hasChange ? "bg-amber-50/30" : "bg-emerald-50/20") : ""}`}>
                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_80px] gap-4 items-center px-4 py-3.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                        <Package size={13} className="text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {p.code && <span className="text-[8px] font-black text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md border border-zinc-200/50">{p.code}</span>}
                          {p.sectorName && (
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md border"
                              style={{ backgroundColor: (p.sectorColor || "#888") + "18", color: p.sectorColor || "#888", borderColor: (p.sectorColor || "#888") + "30" }}>
                              {p.sectorName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-black text-zinc-700">{p.stock} <span className="text-[9px] font-bold text-zinc-400">{p.unit || "un"}</span></p>
                    <input
                      type="number" min="0" value={p.counted} onChange={e => updateCount(p.id, e.target.value)} placeholder={String(p.stock)}
                      className="w-full px-2.5 py-1.5 text-sm font-black text-zinc-900 bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all text-center"
                    />
                    <div>
                      {diff !== null
                        ? <span className={`text-sm font-black ${diff.value === 0 ? "text-zinc-400" : diff.positive ? "text-emerald-600" : "text-red-500"}`}>
                            {diff.value === 0 ? "=" : diff.positive ? `+${diff.value}` : diff.value}
                          </span>
                        : <span className="text-zinc-300 text-sm">—</span>}
                    </div>
                    <div>
                      {hasCounted
                        ? <Badge color={diff?.value === 0 ? "success" : "warning"} dot size="sm">{diff?.value === 0 ? "Igual" : "Diverge"}</Badge>
                        : <span className="text-[10px] text-zinc-300 font-bold">Aguardando</span>}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                          <Package size={14} className="text-zinc-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-zinc-400 font-bold">Sistema: {p.stock} {p.unit || "un"}</p>
                        </div>
                      </div>
                      {hasCounted && (
                        <Badge color={diff?.value === 0 ? "success" : "warning"} dot size="sm">
                          {diff?.value === 0 ? "OK" : diff !== null && diff.value > 0 ? `+${diff.value}` : String(diff?.value)}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Contagem física</label>
                        <input
                          type="number" min="0" value={p.counted} onChange={e => updateCount(p.id, e.target.value)} placeholder={String(p.stock)}
                          className="w-full px-3 py-2 text-sm font-black text-zinc-900 bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all text-center"
                        />
                      </div>
                      {diff !== null && diff.value !== 0 && (
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Diff</span>
                          <span className={`text-lg font-black ${diff.positive ? "text-emerald-600" : "text-red-500"}`}>
                            {diff.positive ? `+${diff.value}` : diff.value}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
            </p>
            {dirtyCount > 0 && (
              <Button size="sm" iconLeft={<Save size={13} />} onClick={handleSaveAll} loading={saving}>
                Salvar {dirtyCount} ajuste{dirtyCount !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}
      </ContentCard>
    </>
  );
}
