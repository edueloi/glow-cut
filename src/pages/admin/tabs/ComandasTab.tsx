import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Plus, CheckCircle, X, Scissors, Banknote, CreditCard, Smartphone,
  Shuffle, Package, FileText, Phone, Zap, Trash2, Edit2, Search,
  Minus, ChevronRight, LayoutGrid, List,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { motion, AnimatePresence } from "motion/react";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PaymentBadge({ method, details }: { method?: string; details?: any }) {
  const parsed = (() => {
    if (!details) return null;
    try { return typeof details === "string" ? JSON.parse(details) : details; } catch { return null; }
  })();
  if (parsed?.mode === "mixed") {
    const entries: any[] = parsed.entries || [];
    return (
      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
        <Shuffle size={10} />
        Misto ({entries.map((e: any) => e.method === "cash" ? "Din" : e.method === "pix" ? "Pix" : "Cart").join("+")})
      </span>
    );
  }
  const MAP: Record<string, { icon: any; label: string; cls: string }> = {
    cash:     { icon: Banknote,   label: "Dinheiro", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    card:     { icon: CreditCard, label: "Cartão",   cls: "bg-blue-50 text-blue-700 border-blue-100" },
    pix:      { icon: Smartphone, label: "Pix",      cls: "bg-violet-50 text-violet-700 border-violet-100" },
    transfer: { icon: Banknote,   label: "Transfer", cls: "bg-zinc-50 text-zinc-600 border-zinc-100" },
  };
  const m = method ? MAP[method] : null;
  if (!m) return null;
  const Icon = m.icon;
  const installments = parsed?.installments;
  return (
    <span className={cn("flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg border", m.cls)}>
      <Icon size={10} />
      {m.label}{installments && installments > 1 ? ` ${installments}x` : ""}
    </span>
  );
}

// ── tipos ─────────────────────────────────────────────────────────────────────

interface EditItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  productId: string | null;
  serviceId: string | null;
}

interface ComandasTabProps {
  comandas: any[];
  products: any[];
  services: any[];
  professionals: any[];
  setIsComandaModalOpen: (b: boolean) => void;
  selectedComanda: any;
  setSelectedComanda: (c: any) => void;
  isComandaDetailOpen: boolean;
  setIsComandaDetailOpen: (b: boolean) => void;
  handlePayComanda: (c: any) => void;
  handleDeleteComanda: (id: string) => void;
  fetchComandas: () => void;
}

// ── sub-componente: modal de edição ──────────────────────────────────────────

function EditComandaModal({
  comanda,
  products,
  services,
  onClose,
  onSaved,
}: {
  comanda: any;
  products: any[];
  services: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems]           = useState<EditItem[]>(() =>
    (comanda.items || []).map((it: any) => ({ ...it }))
  );
  const [discount, setDiscount]     = useState(String(comanda.discount || 0));
  const [discountType, setDiscountType] = useState<"value" | "percentage">(comanda.discountType || "value");
  const [saving, setSaving]         = useState(false);
  // qual painel está aberto: "services" | "products" | null
  const [addPanel, setAddPanel]     = useState<"services" | "products" | null>(null);
  const [panelSearch, setPanelSearch] = useState("");

  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const d        = parseFloat(discount) || 0;
  const total    = Math.max(0, discountType === "percentage" ? subtotal * (1 - d / 100) : subtotal - d);

  // ── add item from panel ──
  const addItem = (item: EditItem) => {
    const existing = items.find(i =>
      (item.productId && i.productId === item.productId) ||
      (item.serviceId && i.serviceId === item.serviceId)
    );
    if (existing) {
      setItems(prev => prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems(prev => [...prev, { ...item, id: `new-${Date.now()}-${Math.random()}` }]);
    }
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const changeQty  = (id: string, delta: number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  const changePrice = (id: string, val: number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, price: val } : i));

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/comandas/${comanda.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.filter(i => i.name), discount: d, discountType, total }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // filtra serviços e produtos para o painel
  const filteredServices = useMemo(() => {
    const q = panelSearch.toLowerCase();
    return services
      .filter((s: any) => s.type !== "package")
      .filter((s: any) => !q || s.name.toLowerCase().includes(q));
  }, [services, panelSearch]);

  const filteredProducts = useMemo(() => {
    const q = panelSearch.toLowerCase();
    return products
      .filter((p: any) => p.isForSale)
      .filter((p: any) => !q || p.name.toLowerCase().includes(q));
  }, [products, panelSearch]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }} transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-white w-full sm:max-w-2xl rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <div>
            <h3 className="text-sm font-black text-zinc-900">Editar Comanda</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              #{comanda.id.slice(-6).toUpperCase()} · {comanda.client?.name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 text-zinc-400 rounded-xl transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Body — dois painéis lado a lado em sm+ */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">

          {/* ── Painel esquerdo: itens na comanda ── */}
          <div className="flex flex-col sm:w-[55%] border-b sm:border-b-0 sm:border-r border-zinc-100 min-h-0">
            <div className="px-5 py-3 border-b border-zinc-100 shrink-0">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Itens na comanda</p>
            </div>

            {/* Lista de itens */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                  <Package size={28} className="mb-2 opacity-30" />
                  <p className="text-xs font-bold">Nenhum item ainda</p>
                  <p className="text-[10px] mt-0.5">Use o painel ao lado para adicionar</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 group"
                  >
                    {/* Ícone */}
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      item.productId ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"
                    )}>
                      {item.productId ? <Package size={13}/> : <Scissors size={13}/>}
                    </div>

                    {/* Nome + preço */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-zinc-400 font-bold">Un:</span>
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400 font-bold pointer-events-none">R$</span>
                          <input
                            type="number" step="0.01" min={0}
                            className="text-[10px] pl-5 pr-1 py-0.5 w-16 bg-white border border-zinc-200 rounded-md font-bold text-zinc-700 outline-none focus:border-amber-400"
                            value={item.price}
                            onChange={e => changePrice(item.id, parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <span className="text-[9px] font-black text-zinc-500">= {fmtBRL(item.price * item.quantity)}</span>
                      </div>
                    </div>

                    {/* Controles de quantidade */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => changeQty(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-all"
                      >
                        <Minus size={10}/>
                      </button>
                      <span className="w-6 text-center text-xs font-black text-zinc-900">{item.quantity}</span>
                      <button
                        onClick={() => changeQty(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-all"
                      >
                        <Plus size={10}/>
                      </button>
                    </div>

                    {/* Remover */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all shrink-0"
                    >
                      <Trash2 size={13}/>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Desconto + total */}
            <div className="px-4 py-3 border-t border-zinc-100 shrink-0 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest shrink-0">Desconto</span>
                <div className="flex gap-1.5 ml-auto">
                  {(["value", "percentage"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDiscountType(t)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all",
                        discountType === t ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-500 border-zinc-200"
                      )}
                    >
                      {t === "value" ? "R$" : "%"}
                    </button>
                  ))}
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold pointer-events-none">
                      {discountType === "percentage" ? "%" : "R$"}
                    </span>
                    <input
                      type="number" step="0.01" min={0}
                      className="text-[11px] pl-6 pr-2 py-1 w-20 bg-zinc-50 border border-zinc-200 rounded-lg font-bold outline-none focus:border-amber-400"
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total</span>
                <span className="text-lg font-black text-zinc-900">{fmtBRL(total)}</span>
              </div>
            </div>
          </div>

          {/* ── Painel direito: catálogo ── */}
          <div className="flex flex-col sm:w-[45%] min-h-0">
            {/* Abas Serviços / Produtos */}
            <div className="flex border-b border-zinc-100 shrink-0">
              <button
                onClick={() => { setAddPanel("services"); setPanelSearch(""); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                  addPanel === "services" ? "border-violet-500 text-violet-700 bg-violet-50/50" : "border-transparent text-zinc-400 hover:text-zinc-600"
                )}
              >
                <Scissors size={12}/> Serviços
              </button>
              <button
                onClick={() => { setAddPanel("products"); setPanelSearch(""); }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                  addPanel === "products" ? "border-emerald-500 text-emerald-700 bg-emerald-50/50" : "border-transparent text-zinc-400 hover:text-zinc-600"
                )}
              >
                <Package size={12}/> Produtos
              </button>
            </div>

            {addPanel === null && (
              <div className="flex flex-col items-center justify-center flex-1 text-zinc-400 px-6 text-center">
                <LayoutGrid size={32} className="mb-2 opacity-20"/>
                <p className="text-xs font-bold text-zinc-400">Selecione Serviços ou Produtos acima para adicionar à comanda</p>
              </div>
            )}

            {addPanel !== null && (
              <>
                {/* Busca */}
                <div className="px-3 py-2 border-b border-zinc-100 shrink-0">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"/>
                    <input
                      type="text"
                      placeholder={addPanel === "services" ? "Buscar serviço..." : "Buscar produto..."}
                      value={panelSearch}
                      onChange={e => setPanelSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                  {addPanel === "services" && (
                    <>
                      {filteredServices.length === 0 && (
                        <p className="text-[10px] text-zinc-400 text-center py-6 font-bold">Nenhum serviço encontrado</p>
                      )}
                      {filteredServices.map((s: any) => {
                        const qty = items.find(i => i.serviceId === s.id)?.quantity || 0;
                        return (
                          <button
                            key={s.id}
                            onClick={() => addItem({ id: "", name: s.name, price: Number(s.price), quantity: 1, productId: null, serviceId: s.id })}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-zinc-100 hover:border-violet-300 hover:bg-violet-50/40 transition-all text-left group"
                          >
                            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-100 shrink-0">
                              <Scissors size={12}/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-800 truncate">{s.name}</p>
                              <p className="text-[10px] text-violet-600 font-black">{fmtBRL(Number(s.price))}</p>
                            </div>
                            {qty > 0 ? (
                              <span className="text-[9px] font-black bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-lg shrink-0">{qty}x</span>
                            ) : (
                              <Plus size={14} className="text-zinc-300 group-hover:text-violet-500 shrink-0"/>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {addPanel === "products" && (
                    <>
                      {filteredProducts.length === 0 && (
                        <p className="text-[10px] text-zinc-400 text-center py-6 font-bold">Nenhum produto no PDV</p>
                      )}
                      {filteredProducts.map((p: any) => {
                        const qty = items.find(i => i.productId === p.id)?.quantity || 0;
                        const noStock = p.stock <= 0;
                        return (
                          <button
                            key={p.id}
                            onClick={() => !noStock && addItem({ id: "", name: p.name, price: Number(p.salePrice), quantity: 1, productId: p.id, serviceId: null })}
                            disabled={noStock}
                            className={cn(
                              "w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left group",
                              noStock
                                ? "border-zinc-100 opacity-40 cursor-not-allowed"
                                : "border-zinc-100 hover:border-emerald-300 hover:bg-emerald-50/40 cursor-pointer"
                            )}
                          >
                            <div className={cn(
                              "p-1.5 rounded-lg shrink-0",
                              noStock ? "bg-zinc-100 text-zinc-400" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                            )}>
                              <Package size={12}/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-800 truncate">{p.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[10px] text-emerald-600 font-black">{fmtBRL(Number(p.salePrice))}</p>
                                <span className={cn(
                                  "text-[8px] font-black px-1 py-0.5 rounded",
                                  noStock ? "bg-red-50 text-red-500" : p.stock <= (p.minStock || 0) ? "bg-amber-50 text-amber-600" : "bg-zinc-100 text-zinc-500"
                                )}>
                                  {noStock ? "Sem estoque" : `Est: ${p.stock}`}
                                </span>
                              </div>
                            </div>
                            {qty > 0 ? (
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-lg shrink-0">{qty}x</span>
                            ) : !noStock ? (
                              <Plus size={14} className="text-zinc-300 group-hover:text-emerald-500 shrink-0"/>
                            ) : null}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-100 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── componente principal ──────────────────────────────────────────────────────

export function ComandasTab({
  comandas,
  products,
  services,
  professionals,
  setIsComandaModalOpen,
  selectedComanda,
  setSelectedComanda,
  isComandaDetailOpen,
  setIsComandaDetailOpen,
  handlePayComanda,
  handleDeleteComanda,
  fetchComandas,
}: ComandasTabProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "paid">("all");
  const [search, setSearch] = useState("");
  const [editingComanda, setEditingComanda] = useState<any | null>(null);

  const openCount = comandas.filter(c => c.status === "open").length;
  const paidCount = comandas.filter(c => c.status === "paid").length;
  const totalOpen = comandas.filter(c => c.status === "open").reduce((a, c) => a + Number(c.total), 0);
  const totalPaid = comandas.filter(c => c.status === "paid").reduce((a, c) => a + Number(c.total), 0);

  const filtered = useMemo(() => {
    let list = comandas;
    if (statusFilter === "open") list = list.filter(c => c.status === "open");
    if (statusFilter === "paid") list = list.filter(c => c.status === "paid");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.client?.name?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.items?.some((it: any) => it.name?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [comandas, statusFilter, search]);

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Em Aberto",      value: openCount,          sub: "aguardando pagamento", color: "text-amber-600" },
          { label: "A Receber",      value: fmtBRL(totalOpen),  sub: "valor pendente",        color: "text-red-500" },
          { label: "Pagas",          value: paidCount,          sub: "finalizadas",            color: "text-emerald-600" },
          { label: "Total Recebido", value: fmtBRL(totalPaid),  sub: "receita total",          color: "text-zinc-900" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{kpi.label}</p>
            <p className={cn("text-2xl font-black mt-1", kpi.color)}>{kpi.value}</p>
            <p className="text-[10px] text-zinc-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "open", "paid"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  statusFilter === s
                    ? s === "open" ? "bg-amber-500 text-white border-amber-500"
                      : s === "paid" ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                )}
              >
                {s === "all" ? `Todos (${comandas.length})` : s === "open" ? `Em Aberto (${openCount})` : `Pagas (${paidCount})`}
              </button>
            ))}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"/>
              <input
                type="text" placeholder="Buscar..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 w-40"
              />
            </div>
          </div>
          <button
            onClick={() => setIsComandaModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus size={14}/> Nova Comanda
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                {["Cliente","Itens","Data","Desconto","Total","Pgto","Status","Ações"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 whitespace-nowrap last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.025 }}
                  className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                  onClick={() => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-black text-amber-600 shrink-0">
                        {c.client?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 whitespace-nowrap">{c.client?.name || "—"}</p>
                        <p className="text-[10px] text-zinc-400">{c.client?.phone || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {c.items?.slice(0, 3).map((it: any, i: number) => (
                        <span key={i} className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                          {it.productId ? <Package size={9}/> : <Scissors size={9}/>}
                          {it.name}
                          <span className="bg-amber-100 px-0.5 rounded text-[8px]">{it.quantity}x</span>
                        </span>
                      ))}
                      {(c.items?.length || 0) > 3 && (
                        <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-lg">+{c.items.length - 3}</span>
                      )}
                      {(!c.items || c.items.length === 0) && (
                        <span className="text-[10px] text-zinc-400 italic">Sem itens</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-500 font-medium whitespace-nowrap">
                    {format(new Date(c.createdAt || Date.now()), "dd/MM/yyyy")}
                  </td>
                  <td className="px-5 py-4">
                    {Number(c.discount) > 0
                      ? <span className="text-xs font-bold text-emerald-600">-{c.discountType === "percentage" ? `${c.discount}%` : fmtBRL(Number(c.discount))}</span>
                      : <span className="text-[10px] text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-sm font-black text-zinc-900 whitespace-nowrap">{fmtBRL(Number(c.total))}</td>
                  <td className="px-5 py-4">
                    {c.status === "paid"
                      ? <PaymentBadge method={c.paymentMethod} details={c.paymentDetails}/>
                      : <span className="text-[10px] text-zinc-300">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border whitespace-nowrap",
                      c.status === "open" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}>
                      {c.status === "open" ? "Em Aberto" : "Pago"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {c.status === "open" && (
                        <button
                          onClick={() => handlePayComanda(c)}
                          className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                        >
                          <CheckCircle size={11}/> Pagar
                        </button>
                      )}
                      <button
                        onClick={() => setEditingComanda(c)}
                        className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={14}/>
                      </button>
                      <button
                        onClick={() => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleDeleteComanda(c.id)}
                        className="p-1.5 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-8 py-16 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Nenhuma comanda encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalhes */}
      <AnimatePresence>
        {isComandaDetailOpen && selectedComanda && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-[2px]"
            onClick={() => setIsComandaDetailOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg border border-zinc-200 overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-xl text-white"><FileText size={16}/></div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Comanda #{selectedComanda.id.slice(-6).toUpperCase()}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      {format(new Date(selectedComanda.createdAt || Date.now()), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsComandaDetailOpen(false)} className="p-2 hover:bg-zinc-100 text-zinc-400 rounded-xl"><X size={16}/></button>
              </div>

              <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
                {/* Cliente */}
                <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-black text-amber-600">
                    {selectedComanda.client?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900 truncate">{selectedComanda.client?.name || "—"}</p>
                    <p className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 mt-0.5">
                      <Phone size={9}/> {selectedComanda.client?.phone || "—"}
                    </p>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                    selectedComanda.status === "open" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {selectedComanda.status === "open" ? "Em Aberto" : "Pago"}
                  </span>
                </div>

                {/* Serviços */}
                {selectedComanda.items?.filter((i: any) => !i.productId).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Scissors size={11} className="text-violet-500"/> Serviços
                    </p>
                    {selectedComanda.items.filter((i: any) => !i.productId).map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between p-2.5 bg-violet-50/50 rounded-xl border border-violet-100">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-violet-100 text-violet-600"><Scissors size={11}/></div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900">{it.name}</p>
                            <p className="text-[9px] text-zinc-400 font-bold">{it.quantity}x · Un: {fmtBRL(Number(it.price))}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-zinc-900">{fmtBRL(Number(it.total || it.price * it.quantity))}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Produtos */}
                {selectedComanda.items?.filter((i: any) => i.productId).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Package size={11} className="text-emerald-500"/> Produtos
                    </p>
                    {selectedComanda.items.filter((i: any) => i.productId).map((it: any) => (
                      <div key={it.id} className="flex items-center justify-between p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600"><Package size={11}/></div>
                          <div>
                            <p className="text-xs font-bold text-zinc-900">{it.name}</p>
                            <p className="text-[9px] text-zinc-400 font-bold">{it.quantity}x · Un: {fmtBRL(Number(it.price))}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-zinc-900">{fmtBRL(Number(it.total || it.price * it.quantity))}</p>
                      </div>
                    ))}
                  </div>
                )}

                {(!selectedComanda.items || selectedComanda.items.length === 0) && (
                  <p className="text-xs text-zinc-400 italic text-center py-4">Nenhum item vinculado.</p>
                )}

                {/* Totais */}
                <div className="bg-zinc-50 rounded-2xl p-4 space-y-2 border border-zinc-100">
                  <div className="flex justify-between text-xs font-bold text-zinc-500">
                    <span>Subtotal</span>
                    <span>{fmtBRL(selectedComanda.items?.reduce((a: number, i: any) => a + Number(i.price) * Number(i.quantity), 0) || 0)}</span>
                  </div>
                  {Number(selectedComanda.discount) > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 font-black">
                      <span className="flex items-center gap-1"><Zap size={10}/> Desconto</span>
                      <span>-{selectedComanda.discountType === "percentage" ? `${selectedComanda.discount}%` : fmtBRL(Number(selectedComanda.discount))}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-zinc-200 flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total</p>
                      <p className="text-xl font-black text-zinc-900">{fmtBRL(Number(selectedComanda.total))}</p>
                      {selectedComanda.status === "paid" && (
                        <div className="mt-1"><PaymentBadge method={selectedComanda.paymentMethod} details={selectedComanda.paymentDetails}/></div>
                      )}
                    </div>
                    {selectedComanda.status === "open" && (
                      <button
                        onClick={() => { handlePayComanda(selectedComanda); setIsComandaDetailOpen(false); }}
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                      >
                        <CheckCircle size={13}/> Pagar Agora
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar */}
      <AnimatePresence>
        {editingComanda && (
          <EditComandaModal
            comanda={editingComanda}
            products={products}
            services={services}
            onClose={() => setEditingComanda(null)}
            onSaved={fetchComandas}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
