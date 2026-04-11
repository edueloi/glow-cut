import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, CheckCircle, X, Scissors, Banknote, CreditCard, Smartphone,
  Shuffle, Package, FileText, Phone, Zap, Trash2, Edit2, Search,
  ChevronDown, AlertCircle,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { motion, AnimatePresence } from "motion/react";

// ── Utilitários ─────────────────────────────────────────────────────────────

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

// ── Tipos ────────────────────────────────────────────────────────────────────

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

// ── Componente ───────────────────────────────────────────────────────────────

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

  // Modal de edição inline
  const [editingComanda, setEditingComanda] = useState<any | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState("0");
  const [editDiscountType, setEditDiscountType] = useState<"value" | "percentage">("value");
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (c: any) => {
    setEditingComanda(c);
    setEditItems(
      (c.items || []).map((it: any) => ({ ...it }))
    );
    setEditDiscount(String(c.discount || 0));
    setEditDiscountType(c.discountType || "value");
  };

  const closeEdit = () => {
    setEditingComanda(null);
    setEditItems([]);
  };

  const addEditItem = () => {
    setEditItems(prev => [...prev, { id: `new-${Date.now()}`, name: "", price: 0, quantity: 1, productId: null, serviceId: null }]);
  };

  const saveEdit = async () => {
    if (!editingComanda) return;
    setEditSaving(true);
    try {
      const subtotal = editItems.reduce((a, i) => a + i.price * i.quantity, 0);
      const d = parseFloat(editDiscount) || 0;
      const total = editDiscountType === "percentage" ? subtotal * (1 - d / 100) : subtotal - d;

      // Deleta todos os itens antigos e recria
      await apiFetch(`/api/comandas/${editingComanda.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editItems.filter(i => i.name),
          discount: d,
          discountType: editDiscountType,
          total: Math.max(0, total),
        }),
      });
      fetchComandas();
      closeEdit();
    } finally {
      setEditSaving(false);
    }
  };

  // Filtragem
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

  const openCount  = comandas.filter(c => c.status === "open").length;
  const paidCount  = comandas.filter(c => c.status === "paid").length;
  const totalOpen  = comandas.filter(c => c.status === "open").reduce((a, c) => a + Number(c.total), 0);
  const totalPaid  = comandas.filter(c => c.status === "paid").reduce((a, c) => a + Number(c.total), 0);

  return (
    <div className="space-y-6">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Em Aberto</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{openCount}</p>
          <p className="text-[10px] text-zinc-400 mt-1">comandas aguardando</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">A Receber</p>
          <p className="text-2xl font-black text-red-500 mt-1">{fmtBRL(totalOpen)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">valor pendente</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pagas</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{paidCount}</p>
          <p className="text-[10px] text-zinc-400 mt-1">finalizadas</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Recebido</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{fmtBRL(totalPaid)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">receita total</p>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro status */}
            <div className="flex gap-1">
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
            </div>
            {/* Busca */}
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar cliente ou item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 w-44"
              />
            </div>
          </div>
          <button
            onClick={() => setIsComandaModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} /> Nova Comanda
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Itens</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Data</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Desconto</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pgto</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-zinc-100 hover:bg-zinc-50/60 transition-colors cursor-pointer"
                  onClick={() => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                >
                  {/* Cliente */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xs font-black text-amber-600 shrink-0">
                        {c.client?.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{c.client?.name || "—"}</p>
                        <p className="text-[10px] text-zinc-400">{c.client?.phone || ""}</p>
                      </div>
                    </div>
                  </td>

                  {/* Itens */}
                  <td className="px-5 py-4 max-w-[220px]">
                    <div className="flex flex-wrap gap-1">
                      {c.items?.length > 0 ? c.items.slice(0, 3).map((it: any, i: number) => (
                        <span key={i} className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                          {it.productId ? <Package size={9}/> : <Scissors size={9}/>}
                          {it.name}
                          <span className="bg-amber-100 px-1 rounded text-[8px]">{it.quantity}x</span>
                        </span>
                      )) : (
                        <span className="text-[10px] text-zinc-400 italic">Sem itens</span>
                      )}
                      {c.items?.length > 3 && (
                        <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-lg">+{c.items.length - 3}</span>
                      )}
                    </div>
                  </td>

                  {/* Data */}
                  <td className="px-5 py-4 text-xs text-zinc-500 font-medium whitespace-nowrap">
                    {format(new Date(c.createdAt || Date.now()), "dd/MM/yyyy")}
                  </td>

                  {/* Desconto */}
                  <td className="px-5 py-4">
                    {Number(c.discount) > 0 ? (
                      <span className="text-xs font-bold text-emerald-600">
                        -{c.discountType === "percentage" ? `${c.discount}%` : fmtBRL(Number(c.discount))}
                      </span>
                    ) : <span className="text-[10px] text-zinc-300">—</span>}
                  </td>

                  {/* Total */}
                  <td className="px-5 py-4 text-sm font-black text-zinc-900 whitespace-nowrap">{fmtBRL(Number(c.total))}</td>

                  {/* Pagamento */}
                  <td className="px-5 py-4">
                    {c.status === "paid"
                      ? <PaymentBadge method={c.paymentMethod} details={c.paymentDetails} />
                      : <span className="text-[10px] text-zinc-300">—</span>}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border",
                      c.status === "open" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}>
                      {c.status === "open" ? "Em Aberto" : "Pago"}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {c.status === "open" && (
                        <button
                          onClick={() => handlePayComanda(c)}
                          className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                        >
                          <CheckCircle size={11} /> Pagar
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={14} />
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
                        <Trash2 size={14} />
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

      {/* ── Modal de Detalhes ── */}
      <AnimatePresence>
        {isComandaDetailOpen && selectedComanda && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-[2px]"
            onClick={() => setIsComandaDetailOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-xl text-white"><FileText size={18} /></div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-900">Comanda #{selectedComanda.id.slice(-6).toUpperCase()}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      {format(new Date(selectedComanda.createdAt || Date.now()), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsComandaDetailOpen(false)} className="p-2 hover:bg-zinc-100 text-zinc-400 rounded-xl transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto">
                {/* Cliente */}
                <div className="flex items-center gap-3 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-base font-black text-amber-600">
                    {selectedComanda.client?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900 truncate">{selectedComanda.client?.name || "—"}</p>
                    <p className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 mt-0.5">
                      <Phone size={9}/> {selectedComanda.client?.phone || "—"}
                    </p>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                    selectedComanda.status === "open" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {selectedComanda.status === "open" ? "Em Aberto" : "Pago"}
                  </span>
                </div>

                {/* Itens */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1 h-3 rounded-full bg-amber-500 inline-block" /> Itens e Serviços
                  </p>
                  {selectedComanda.items?.length === 0 && (
                    <p className="text-xs text-zinc-400 italic p-3 bg-zinc-50 rounded-xl">Nenhum item vinculado.</p>
                  )}
                  {selectedComanda.items?.map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-zinc-100 hover:border-amber-200 transition-all shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-1.5 rounded-lg border", it.productId ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-purple-50 border-purple-100 text-purple-600")}>
                          {it.productId ? <Package size={12}/> : <Scissors size={12}/>}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-zinc-900">{it.name}</p>
                            <span className="text-[9px] font-black text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">{it.quantity}x</span>
                          </div>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                            {it.productId ? "Produto" : "Serviço"} · Un: {fmtBRL(Number(it.price))}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-zinc-900">{fmtBRL(Number(it.total || (it.price * it.quantity)))}</p>
                    </div>
                  ))}
                </div>

                {/* Totais */}
                <div className="bg-zinc-50 rounded-2xl p-4 space-y-2.5 border border-zinc-100">
                  <div className="flex justify-between text-xs font-bold text-zinc-500">
                    <span>Subtotal</span>
                    <span>{fmtBRL(selectedComanda.items?.reduce((a: number, i: any) => a + i.price * i.quantity, 0) || 0)}</span>
                  </div>
                  {Number(selectedComanda.discount) > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 font-black">
                      <span className="flex items-center gap-1"><Zap size={10}/> Desconto</span>
                      <span>-{selectedComanda.discountType === "percentage" ? `${selectedComanda.discount}%` : fmtBRL(Number(selectedComanda.discount))}</span>
                    </div>
                  )}
                  <div className="pt-2.5 border-t border-zinc-200 flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total</p>
                      <p className="text-xl font-black text-zinc-900">{fmtBRL(Number(selectedComanda.total))}</p>
                      {selectedComanda.status === "paid" && (
                        <div className="mt-1">
                          <PaymentBadge method={selectedComanda.paymentMethod} details={selectedComanda.paymentDetails} />
                        </div>
                      )}
                    </div>
                    {selectedComanda.status === "open" && (
                      <button
                        onClick={() => { handlePayComanda(selectedComanda); setIsComandaDetailOpen(false); }}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
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

      {/* ── Modal de Edição de Comanda ── */}
      <AnimatePresence>
        {editingComanda && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[65] flex items-center justify-center p-4 backdrop-blur-[2px]"
            onClick={closeEdit}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg border border-zinc-200 flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
                <div>
                  <h3 className="text-sm font-black text-zinc-900">Editar Comanda</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">#{editingComanda.id.slice(-6).toUpperCase()} · {editingComanda.client?.name}</p>
                </div>
                <button onClick={closeEdit} className="p-2 hover:bg-zinc-100 text-zinc-400 rounded-xl transition-all"><X size={16}/></button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Itens */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Itens / PDV</label>
                  </div>

                  {/* Cabeçalho da grade */}
                  <div className="grid grid-cols-[1fr_56px_90px_32px] gap-2 px-1">
                    <span className="text-[9px] font-black text-zinc-400 uppercase">Item</span>
                    <span className="text-[9px] font-black text-zinc-400 uppercase text-center">Qtd</span>
                    <span className="text-[9px] font-black text-zinc-400 uppercase">Preço</span>
                    <span/>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {editItems.map(item => (
                      <div key={item.id} className="grid grid-cols-[1fr_56px_90px_32px] gap-2 items-center">
                        {/* Select produto/serviço */}
                        <div className="relative">
                          <select
                            className="w-full appearance-none text-[11px] p-2 pr-6 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold outline-none focus:border-amber-400 transition-all"
                            value={item.productId ? `p-${item.productId}` : item.serviceId ? `s-${item.serviceId}` : ""}
                            onChange={e => {
                              const val = e.target.value;
                              if (!val) return;
                              const isProd = val.startsWith("p-");
                              const id = val.substring(2);
                              if (isProd) {
                                const p = products.find((x: any) => x.id === id);
                                if (p) setEditItems(prev => prev.map(i => i.id === item.id ? { ...i, productId: p.id, serviceId: null, name: p.name, price: Number(p.salePrice) } : i));
                              } else {
                                const s = services.find((x: any) => x.id === id);
                                if (s) setEditItems(prev => prev.map(i => i.id === item.id ? { ...i, serviceId: s.id, productId: null, name: s.name, price: Number(s.price) } : i));
                              }
                            }}
                          >
                            <option value="">Selecione...</option>
                            <optgroup label="Serviços">
                              {services.filter((s: any) => s.type !== "package").map((s: any) => (
                                <option key={s.id} value={`s-${s.id}`}>{s.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Produtos (PDV)">
                              {products.filter((p: any) => p.isForSale).map((p: any) => (
                                <option key={p.id} value={`p-${p.id}`}>{p.name} — {fmtBRL(Number(p.salePrice))} (Estoque: {p.stock})</option>
                              ))}
                            </optgroup>
                          </select>
                          <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                        </div>

                        {/* Quantidade */}
                        <input
                          type="number" min={1}
                          className="text-[11px] p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-center font-bold outline-none focus:border-amber-400"
                          value={item.quantity}
                          onChange={e => setEditItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: parseInt(e.target.value) || 1 } : i))}
                        />

                        {/* Preço */}
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold">R$</span>
                          <input
                            type="number" step="0.01" min={0}
                            className="w-full text-[11px] pl-7 pr-2 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-bold outline-none focus:border-emerald-400 text-emerald-700"
                            value={item.price}
                            onChange={e => setEditItems(prev => prev.map(i => i.id === item.id ? { ...i, price: parseFloat(e.target.value) || 0 } : i))}
                          />
                        </div>

                        {/* Remover */}
                        <button
                          onClick={() => setEditItems(prev => prev.filter(i => i.id !== item.id))}
                          className="flex items-center justify-center w-8 h-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={addEditItem}
                    className="w-full py-2.5 border-2 border-dashed border-zinc-200 rounded-xl text-[10px] font-black text-zinc-400 hover:border-amber-400 hover:bg-amber-50/30 hover:text-amber-500 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Plus size={12}/> Adicionar Item
                  </button>
                </div>

                {/* Desconto */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Desconto</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold">
                        {editDiscountType === "percentage" ? "%" : "R$"}
                      </span>
                      <input
                        type="number" min={0} step="0.01"
                        className="w-full text-xs pl-8 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold outline-none focus:border-amber-400"
                        value={editDiscount}
                        onChange={e => setEditDiscount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tipo</label>
                    <div className="flex gap-2">
                      {(["value", "percentage"] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setEditDiscountType(t)}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                            editDiscountType === t ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          {t === "value" ? "R$" : "%"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview total */}
                {(() => {
                  const subtotal = editItems.reduce((a, i) => a + i.price * i.quantity, 0);
                  const d = parseFloat(editDiscount) || 0;
                  const total = editDiscountType === "percentage" ? subtotal * (1 - d / 100) : subtotal - d;
                  return (
                    <div className="flex justify-between items-center p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total</span>
                      <span className="text-xl font-black text-zinc-900">{fmtBRL(Math.max(0, total))}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-zinc-100 flex gap-3 shrink-0">
                <button onClick={closeEdit} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {editSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
