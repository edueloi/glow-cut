import React, { useState, useEffect, useCallback } from "react";
import { ArrowUpDown, Plus, ArrowUp, ArrowDown, RefreshCw, ShoppingBag, Wrench, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiFetch } from "@/src/lib/api";
import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineSegmented,
  ContentCard, SectionTitle, EmptyState,
  Button,
  Modal, ModalFooter,
  Input,
  Badge,
  GridTable, Column,
  useToast,
} from "@/src/components/ui";

type MovType = "entrada" | "saida" | "ajuste" | "venda" | "consumo";

interface Movement {
  id: string; productId: string; productName: string; productUnit?: string;
  type: MovType; quantity: number; previousQty: number; newQty: number;
  reason?: string; reference?: string; createdBy?: string; createdAt: string;
}

interface Product { id: string; name: string; unit?: string; stock: number; }

const TYPE_CONFIG: Record<MovType, { label: string; color: "success" | "danger" | "warning" | "info" | "default"; icon: React.ElementType }> = {
  entrada: { label: "Entrada",  color: "success", icon: ArrowUp },
  saida:   { label: "Saída",    color: "danger",  icon: ArrowDown },
  ajuste:  { label: "Ajuste",   color: "warning", icon: RefreshCw },
  venda:   { label: "Venda",    color: "info",    icon: ShoppingBag },
  consumo: { label: "Consumo",  color: "default", icon: Wrench },
};

const EMPTY_FORM = { productId: "", type: "entrada" as MovType, quantity: "1", reason: "", reference: "" };

function MovimentacaoModal({ isOpen, onClose, products, onSaved }: {
  isOpen: boolean; onClose: () => void; products: Product[]; onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { if (!isOpen) setForm(EMPTY_FORM); }, [isOpen]);

  const f = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.productId) { toast.warning("Selecione um produto."); return; }
    if (parseInt(form.quantity) <= 0) { toast.warning("Quantidade deve ser maior que zero."); return; }
    setSaving(true);
    try {
      await apiFetch("/api/inventory/movements", {
        method: "POST",
        body: JSON.stringify({ ...form, quantity: parseInt(form.quantity) }),
      });
      toast.success("Movimentação registrada!");
      onSaved(); onClose();
    } catch { toast.error("Erro ao registrar movimentação."); }
    finally { setSaving(false); }
  };

  const selectedProduct = products.find(p => p.id === form.productId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Movimentação" size="md"
      footer={<ModalFooter><Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={handleSave} loading={saving}>Registrar</Button></ModalFooter>}
    >
      <div className="space-y-4 p-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tipo *</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {(Object.keys(TYPE_CONFIG) as MovType[]).map(t => {
              const cfg = TYPE_CONFIG[t];
              const Icon = cfg.icon;
              return (
                <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center ${
                    form.type === t ? "border-amber-400 bg-amber-50 text-amber-700" : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                  }`}>
                  <Icon size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Produto *</label>
          <select value={form.productId} onChange={f("productId")}
            className="w-full px-3 py-2.5 text-sm font-bold text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 transition-all">
            <option value="">Selecione um produto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} (Estoque: {p.stock} {p.unit || "un"})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Quantidade *" type="number" min="1" value={form.quantity} onChange={f("quantity")} placeholder="0" />
          {selectedProduct && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estoque atual</label>
              <div className="flex items-center h-10 sm:h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-sm font-black text-zinc-700">{selectedProduct.stock} {selectedProduct.unit || "un"}</span>
              </div>
            </div>
          )}
        </div>

        <Input label="Motivo / Observação" value={form.reason} onChange={f("reason")} placeholder="Ex: Compra de reposição..." />
        <Input label="Referência (NF, Pedido)" value={form.reference} onChange={f("reference")} placeholder="Ex: NF-001234" />
      </div>
    </Modal>
  );
}

export function MovimentacaoView() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | MovType>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [movData, prodData] = await Promise.all([
        apiFetch("/api/inventory/movements?limit=200").then(r => r.json()),
        apiFetch("/api/products/").then(r => r.json()),
      ]);
      setMovements(Array.isArray(movData) ? movData : []);
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch { toast.error("Erro ao carregar movimentações."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = movements.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = m.productName?.toLowerCase().includes(q) || m.reason?.toLowerCase().includes(q) || m.reference?.toLowerCase().includes(q);
    const matchType = typeFilter === "all" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const entradas = movements.filter(m => m.type === "entrada").reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  const saidas   = movements.filter(m => ["saida","venda","consumo"].includes(m.type)).reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  const ajustes  = movements.filter(m => m.type === "ajuste").length;

  const typeOptions = [
    { value: "all",     label: "Todas" },
    { value: "entrada", label: "Entradas" },
    { value: "saida",   label: "Saídas" },
    { value: "ajuste",  label: "Ajustes" },
    { value: "venda",   label: "Vendas" },
    { value: "consumo", label: "Consumo" },
  ] as { value: "all" | MovType; label: string }[];

  const columns: Column<Movement>[] = [
    {
      header: "Produto",
      render: m => (
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            m.type === "entrada" ? "bg-emerald-50" : m.type === "ajuste" ? "bg-yellow-50" : "bg-red-50"
          }`}>
            {React.createElement(TYPE_CONFIG[m.type]?.icon || Package, {
              size: 14,
              className: m.type === "entrada" ? "text-emerald-500" : m.type === "ajuste" ? "text-yellow-500" : "text-red-500"
            })}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-900 truncate">{m.productName}</p>
            {m.reason && <p className="text-[10px] text-zinc-400 font-bold truncate max-w-[180px]">{m.reason}</p>}
          </div>
        </div>
      ),
    },
    { header: "Tipo", render: m => { const cfg = TYPE_CONFIG[m.type]; return <Badge color={cfg.color} dot>{cfg.label}</Badge>; } },
    {
      header: "Qtd",
      render: m => (
        <div className="flex items-center gap-1.5">
          <span className={`text-base font-black ${m.type === "entrada" ? "text-emerald-600" : m.type === "ajuste" ? "text-amber-500" : "text-red-500"}`}>
            {m.type === "entrada" ? "+" : m.type === "ajuste" ? "=" : "-"}{Math.abs(m.quantity)}
          </span>
          <span className="text-[10px] text-zinc-400 font-bold">{m.productUnit || "un"}</span>
        </div>
      ),
    },
    {
      header: "Antes → Depois", hideOnMobile: true,
      render: m => (
        <p className="text-xs font-bold text-zinc-500">
          <span>{m.previousQty}</span><span className="mx-1.5 text-zinc-300">→</span>
          <span className={m.newQty < m.previousQty ? "text-red-500" : "text-emerald-600"}>{m.newQty}</span>
        </p>
      ),
    },
    { header: "Referência", hideOnMobile: true, render: m => <p className="text-xs font-bold text-zinc-500">{m.reference || <span className="text-zinc-300">—</span>}</p> },
    {
      header: "Data", hideOnMobile: true,
      render: m => <p className="text-[10px] font-bold text-zinc-400">{m.createdAt ? format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}</p>,
    },
  ];

  return (
    <>
      <SectionTitle title="Movimentação de Estoque" description="Histórico de entradas, saídas, ajustes e vendas" icon={ArrowUpDown}
        action={<Button iconLeft={<Plus size={14} />} onClick={() => setModalOpen(true)}>Registrar</Button>} divider />

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard title="Entradas" value={entradas} icon={ArrowUp} color="success" description="Unidades recebidas" />
        <StatCard title="Saídas" value={saidas} icon={ArrowDown} color="danger" description="Vendas + uso interno" />
        <StatCard title="Ajustes" value={ajustes} icon={RefreshCw} color="warning" description="Correções realizadas" />
      </div>

      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar por produto, motivo..." />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right" wrap={false}>
          <div className="overflow-x-auto">
            <FilterLineSegmented value={typeFilter} onChange={v => setTypeFilter(v as "all" | MovType)} options={typeOptions} size="sm" />
          </div>
        </FilterLineSection>
      </FilterLine>

      <ContentCard padding="none">
        <GridTable
          data={filtered} columns={columns} keyExtractor={m => m.id} isLoading={loading}
          emptyMessage={
            <EmptyState icon={ArrowUpDown} title="Nenhuma movimentação encontrada"
              description="Registre entradas, saídas e ajustes de estoque para acompanhar o histórico."
              action={<Button iconLeft={<Plus size={14} />} onClick={() => setModalOpen(true)} size="sm">Registrar Movimentação</Button>}
              className="m-4" />
          }
          renderMobileItem={m => {
            const cfg = TYPE_CONFIG[m.type];
            const Icon = cfg.icon;
            return (
              <div className="flex items-start gap-3 -m-4 px-4 py-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  m.type === "entrada" ? "bg-emerald-50" : m.type === "ajuste" ? "bg-yellow-50" : "bg-red-50"
                }`}>
                  <Icon size={16} className={m.type === "entrada" ? "text-emerald-500" : m.type === "ajuste" ? "text-yellow-500" : "text-red-500"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black text-zinc-900 truncate">{m.productName}</p>
                    <Badge color={cfg.color} dot size="sm">{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-sm font-black ${m.type === "entrada" ? "text-emerald-600" : m.type === "ajuste" ? "text-amber-500" : "text-red-500"}`}>
                      {m.type === "entrada" ? "+" : m.type === "ajuste" ? "=" : "-"}{Math.abs(m.quantity)} {m.productUnit || "un"}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold">{m.previousQty} → {m.newQty}</span>
                  </div>
                  {m.reason && <p className="text-[10px] text-zinc-400 font-bold mt-0.5 truncate">{m.reason}</p>}
                  <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
                    {m.createdAt ? format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: ptBR }) : ""}
                  </p>
                </div>
              </div>
            );
          }}
        />
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </ContentCard>

      <MovimentacaoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} products={products} onSaved={load} />
    </>
  );
}
