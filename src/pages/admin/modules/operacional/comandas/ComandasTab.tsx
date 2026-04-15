import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import {
  Plus, CheckCircle, X, Scissors, Banknote, CreditCard, Smartphone,
  Shuffle, Package, FileText, Phone, Zap, Trash2, Edit2, Search,
  Minus, LayoutGrid, User, ArrowRightLeft, ChevronDown, Calendar,
  MoreVertical, ChevronUp, Eye, DollarSign, Clock, Filter,
  ShoppingBag, Tag, Hash, Receipt,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { motion, AnimatePresence } from "motion/react";
import { Combobox } from "@/src/components/ui/Combobox";
import { GridTable, Column } from "@/src/components/ui/GridTable";

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
  packageId?: string | null;
  packageName?: string | null;
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

// ── ActionMenu (dropdown de ações) ──────────────────────────────────────────

function ActionMenu({ comanda, onPay, onEdit, onView, onDelete }: {
  comanda: any;
  onPay: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      // Ignorar cliques no botão toggle
      if (buttonRef.current && buttonRef.current.contains(e.target as Node)) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    
    const scrollHandler = () => setOpen(false);

    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", scrollHandler, true); // capture = true (para pegar scrolls internos)

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }

    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", scrollHandler, true);
    };
  }, [open]);

  const menu = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{ duration: 0.12 }}
          style={{ top: coords.top, right: coords.right }}
          className="fixed bg-white rounded-2xl shadow-2xl border border-zinc-200 py-1.5 z-[100] min-w-[160px] overflow-hidden"
        >
          {comanda.status === "open" && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onPay(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-all"
            >
              <CheckCircle size={14} /> Pagar
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all"
          >
            <Edit2 size={14} /> Editar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onView(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-all"
          >
            <Eye size={14} /> Detalhes
          </button>
          <div className="border-t border-zinc-100 my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 rounded-xl transition-all"
      >
        <MoreVertical size={16} />
      </button>
      {typeof document !== "undefined" && createPortal(menu, document.body)}
    </>
  );
}

// ── ComandaCard (versão mobile) ───────────────────────────────────────────────

function ComandaCard({ comanda, onPay, onEdit, onView, onDelete }: {
  comanda: any;
  onPay: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const itemCount = comanda.items?.length || 0;
  const isOpen = comanda.status === "open";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl border shadow-sm overflow-hidden transition-all",
        isOpen ? "border-amber-200" : "border-zinc-200"
      )}
    >
      {/* ── Cabeçalho do card (sempre visível) ── */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-zinc-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0",
          isOpen
            ? "bg-amber-50 text-amber-600 border border-amber-200"
            : "bg-emerald-50 text-emerald-600 border border-emerald-200"
        )}>
          {comanda.client?.name?.charAt(0).toUpperCase() || "?"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-zinc-900 truncate">
              {comanda.client?.name || "Sem cliente"}
            </p>
            <span className={cn(
              "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0",
              isOpen
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            )}>
              {isOpen ? "Aberto" : "Pago"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
              <Clock size={9} />
              {format(new Date(comanda.createdAt || Date.now()), "dd/MM/yy HH:mm")}
            </span>
            {itemCount > 0 && (
              <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                <ShoppingBag size={9} />
                {itemCount} {itemCount === 1 ? "item" : "itens"}
              </span>
            )}
          </div>
        </div>

        {/* Valor + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-base font-black",
            isOpen ? "text-zinc-900" : "text-emerald-600"
          )}>
            {fmtBRL(Number(comanda.total))}
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-zinc-300" />
          </motion.div>
        </div>
      </div>

      {/* ── Conteúdo expandido ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 pt-3">
              {/* Itens */}
              {itemCount > 0 && (
                <div className="space-y-1.5">
                  {comanda.items.map((it: any, i: number) => (
                    <div key={it.id || i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "p-1 rounded-md shrink-0",
                          it.productId ? "bg-emerald-50 text-emerald-500" : "bg-violet-50 text-violet-500"
                        )}>
                          {it.productId ? <Package size={10} /> : <Scissors size={10} />}
                        </div>
                        <span className="text-xs font-bold text-zinc-700 truncate">{it.name}</span>
                        <span className="text-[9px] text-zinc-400 font-bold shrink-0">{it.quantity}x</span>
                      </div>
                      <span className="text-xs font-black text-zinc-800 shrink-0 ml-2">
                        {fmtBRL(Number(it.total || it.price * it.quantity))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Desconto */}
              {Number(comanda.discount) > 0 && (
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Zap size={10} /> Desconto
                  </span>
                  <span className="font-black text-emerald-600">
                    -{comanda.discountType === "percentage" ? `${comanda.discount}%` : fmtBRL(Number(comanda.discount))}
                  </span>
                </div>
              )}

              {/* Pagamento */}
              {comanda.status === "paid" && comanda.paymentMethod && (
                <div className="flex items-center gap-2">
                  <PaymentBadge method={comanda.paymentMethod} details={comanda.paymentDetails} />
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-1">
                {isOpen && (
                  <button
                    onClick={onPay}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
                  >
                    <CheckCircle size={13} /> Pagar
                  </button>
                )}
                <button
                  onClick={onEdit}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                >
                  <Edit2 size={12} /> Editar
                </button>
                <button
                  onClick={onView}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                >
                  <Eye size={12} />
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center justify-center py-2.5 px-3 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-xl transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── EditComandaModal ──────────────────────────────────────────────────────────

function EditComandaModal({
  comanda,
  products,
  services,
  professionals,
  onClose,
  onSaved,
}: {
  comanda: any;
  products: any[];
  services: any[];
  professionals: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  type Tab = "items" | "info";
  const [tab, setTab] = useState<Tab>("items");

  // ── itens
  const [items, setItems] = useState<EditItem[]>(() =>
    (comanda.items || []).map((it: any) => ({ ...it }))
  );
  const [discount, setDiscount]         = useState(String(comanda.discount || 0));
  const [discountType, setDiscountType] = useState<"value" | "percentage">(comanda.discountType || "value");

  // ── dados gerais
  const [clientId, setClientId]         = useState(comanda.clientId || "");
  const [clientSearch, setClientSearch] = useState(comanda.client?.name || "");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(comanda.client || null);
  const [professionalId, setProfessionalId] = useState(comanda.professionalId || "");
  const [description, setDescription]   = useState(comanda.description || "");

  // ── catálogo bottom-sheet
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogTab, setCatalogTab] = useState<"services" | "products">("services");
  const [panelSearch, setPanelSearch] = useState("");

  const [saving, setSaving] = useState(false);

  // busca de cliente
  useEffect(() => {
    if (!clientSearch.trim() || clientId) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch(`/api/clients/search?name=${encodeURIComponent(clientSearch)}`);
        const d = await r.json();
        setClientResults(Array.isArray(d) ? d : []);
      } catch { setClientResults([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [clientSearch, clientId]);

  // métricas
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const d        = parseFloat(discount) || 0;
  const total    = Math.max(0, discountType === "percentage" ? subtotal * (1 - d / 100) : subtotal - d);

  // catálogo filtrado
  const filteredServices = useMemo(() => {
    const q = panelSearch.toLowerCase();
    const singles = services
      .filter((s: any) => s.type !== "package")
      .filter((s: any) => !q || s.name.toLowerCase().includes(q));
    const pkgs = services
      .filter((s: any) => s.type === "package")
      .filter((s: any) => !q || s.name.toLowerCase().includes(q));
    return { singles, pkgs };
  }, [services, panelSearch]);

  const filteredProducts = useMemo(() => {
    const q = panelSearch.toLowerCase();
    return products
      .filter((p: any) => p.isForSale)
      .filter((p: any) => !q || p.name.toLowerCase().includes(q));
  }, [products, panelSearch]);

  // adicionar item individual
  const addItem = (item: Omit<EditItem, "id">) => {
    const existing = items.find(i =>
      (item.productId && i.productId === item.productId) ||
      (item.serviceId && i.serviceId === item.serviceId && !item.packageId && !i.packageId)
    );
    if (existing) {
      setItems(prev => prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems(prev => [...prev, { ...item, id: `new-${Date.now()}-${Math.random()}` }]);
    }
  };

  // adicionar pacote
  const addPackage = (pkg: any) => {
    const pkgServices: EditItem[] = (pkg.packageServices || []).map((ps: any) => ({
      id: `pkg-${ps.serviceId || ps.service?.id}-${Date.now()}-${Math.random()}`,
      name: ps.service?.name || ps.name || "",
      price: Number(ps.service?.price ?? ps.price) || 0,
      quantity: ps.quantity || 1,
      productId: null,
      serviceId: ps.serviceId || ps.service?.id || null,
      packageId: pkg.id,
      packageName: pkg.name,
    }));
    setItems(prev => [...prev, ...pkgServices]);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const removePackage = (packageId: string) => setItems(prev => prev.filter(i => i.packageId !== packageId));
  const changeQty   = (id: string, delta: number) =>
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
      const patch: any = {};
      if (clientId && clientId !== comanda.clientId) patch.clientId = clientId;
      if (professionalId !== (comanda.professionalId || "")) patch.professionalId = professionalId || null;
      if (description !== (comanda.description || "")) patch.description = description;
      if (Object.keys(patch).length > 0) {
        await apiFetch(`/api/comandas/${comanda.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // agrupa itens por pacote
  const groupedItems = useMemo(() => {
    const groups: { packageId: string | null; packageName: string | null; items: EditItem[] }[] = [];
    const seen = new Map<string | null, EditItem[]>();
    for (const item of items) {
      const key = item.packageId || null;
      if (!seen.has(key)) {
        const arr: EditItem[] = [];
        seen.set(key, arr);
        groups.push({ packageId: key, packageName: item.packageName || null, items: arr });
      }
      seen.get(key)!.push(item);
    }
    return groups;
  }, [items]);

  // ── renderiza catálogo item
  const renderCatalogItem = (item: any, type: "service" | "product" | "package") => {
    if (type === "package") {
      const inComanda = items.some(i => i.packageId === item.id);
      return (
        <button
          key={item.id}
          onClick={() => { addPackage(item); }}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-violet-300 hover:bg-violet-50/40 transition-all text-left active:scale-[0.98]"
        >
          <div className="p-2 rounded-xl bg-violet-100 text-violet-700 shrink-0">
            <Scissors size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-zinc-900 truncate">{item.name}</p>
              <span className="text-[7px] font-black bg-violet-100 text-violet-600 px-1 py-0.5 rounded shrink-0">PACOTE</span>
            </div>
            <p className="text-[10px] text-violet-600 font-black mt-0.5">{fmtBRL(Number(item.price))}</p>
          </div>
          {inComanda
            ? <span className="text-[9px] font-black bg-violet-100 text-violet-700 px-2 py-1 rounded-lg shrink-0">✓</span>
            : <Plus size={16} className="text-zinc-300 shrink-0" />
          }
        </button>
      );
    }

    if (type === "service") {
      const qty = items.find(i => i.serviceId === item.id && !i.packageId)?.quantity || 0;
      return (
        <button
          key={item.id}
          onClick={() => addItem({ name: item.name, price: Number(item.price), quantity: 1, productId: null, serviceId: item.id })}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left active:scale-[0.98]"
        >
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Scissors size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-800 truncate">{item.name}</p>
            <p className="text-[10px] text-amber-600 font-black">{fmtBRL(Number(item.price))}</p>
          </div>
          {qty > 0
            ? <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-lg shrink-0">{qty}x</span>
            : <Plus size={16} className="text-zinc-300 shrink-0" />
          }
        </button>
      );
    }

    // product
    const qty = items.find(i => i.productId === item.id)?.quantity || 0;
    const noStock = item.stock <= 0;
    return (
      <button
        key={item.id}
        onClick={() => !noStock && addItem({ name: item.name, price: Number(item.salePrice), quantity: 1, productId: item.id, serviceId: null })}
        disabled={noStock}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left active:scale-[0.98]",
          noStock ? "border-zinc-100 opacity-40 cursor-not-allowed" : "border-zinc-100 hover:border-emerald-300 hover:bg-emerald-50/40"
        )}
      >
        <div className={cn("p-2 rounded-xl shrink-0", noStock ? "bg-zinc-100 text-zinc-400" : "bg-emerald-50 text-emerald-600")}>
          <Package size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-zinc-800 truncate">{item.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-[10px] text-emerald-600 font-black">{fmtBRL(Number(item.salePrice))}</p>
            <span className={cn(
              "text-[8px] font-black px-1 py-0.5 rounded",
              noStock ? "bg-red-50 text-red-500" : item.stock <= (item.minStock || 0) ? "bg-amber-50 text-amber-600" : "bg-zinc-100 text-zinc-500"
            )}>
              {noStock ? "Sem estoque" : `Est: ${item.stock}`}
            </span>
          </div>
        </div>
        {qty > 0
          ? <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg shrink-0">{qty}x</span>
          : !noStock ? <Plus size={16} className="text-zinc-300 shrink-0" /> : null
        }
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }} transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-white w-full sm:max-w-2xl rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-zinc-200 flex flex-col max-h-[96vh] sm:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-100 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-zinc-900">Editar Comanda</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 truncate">
              #{comanda.id.slice(-6).toUpperCase()} · {selectedClient?.name || comanda.client?.name}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex bg-zinc-100 rounded-xl p-0.5 gap-0.5">
              <button
                onClick={() => setTab("items")}
                className={cn(
                  "px-3 py-1.5 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all",
                  tab === "items" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                )}
              >
                Itens
              </button>
              <button
                onClick={() => setTab("info")}
                className={cn(
                  "px-3 py-1.5 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all",
                  tab === "info" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
                )}
              >
                Dados
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 text-zinc-400 rounded-xl transition-all">
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* ── Aba Itens ── */}
        {tab === "items" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Lista de itens */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <Package size={32} className="mb-3 opacity-20"/>
                  <p className="text-xs font-bold">Nenhum item na comanda</p>
                  <p className="text-[10px] mt-1">Toque no botão abaixo para adicionar</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {groupedItems.map(group => (
                  <div key={group.packageId || "singles"}>
                    {group.packageId && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 mb-1.5 bg-violet-50 rounded-xl border border-violet-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400"/>
                          <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">
                            Pacote: {group.packageName}
                          </span>
                          <span className="text-[9px] text-violet-400 font-bold">{group.items.length} serviços</span>
                        </div>
                        <button
                          onClick={() => removePackage(group.packageId!)}
                          className="text-violet-300 hover:text-red-500 transition-all p-0.5 rounded"
                        >
                          <Trash2 size={11}/>
                        </button>
                      </div>
                    )}

                    {group.items.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-xl border group mb-1.5",
                          group.packageId
                            ? "bg-violet-50/40 border-violet-100 ml-2"
                            : item.productId
                              ? "bg-emerald-50/30 border-emerald-100"
                              : "bg-zinc-50 border-zinc-100"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          item.productId ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600"
                        )}>
                          {item.productId ? <Package size={12}/> : <Scissors size={12}/>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-zinc-400 font-bold">R$</span>
                            <input
                              type="number" step="0.01" min={0}
                              className="text-[10px] px-1 py-0.5 w-14 bg-white border border-zinc-200 rounded-md font-bold text-zinc-700 outline-none focus:border-amber-400"
                              value={item.price}
                              onChange={e => changePrice(item.id, parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-[9px] font-black text-zinc-400">= {fmtBRL(item.price * item.quantity)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => changeQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-all">
                            <Minus size={10}/>
                          </button>
                          <span className="w-5 text-center text-xs font-black text-zinc-900">{item.quantity}</span>
                          <button onClick={() => changeQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center transition-all">
                            <Plus size={10}/>
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-7 h-7 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all shrink-0"
                        >
                          <Trash2 size={12}/>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {/* Botão adicionar itens (abre catálogo) */}
            <div className="px-4 py-2 border-t border-zinc-100 shrink-0">
              <button
                onClick={() => setCatalogOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-amber-200"
              >
                <Plus size={14} /> Adicionar Serviço ou Produto
              </button>
            </div>

            {/* Desconto + total */}
            <div className="px-4 py-3 border-t border-zinc-100 shrink-0 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest shrink-0">Desconto</span>
                <div className="flex gap-1 ml-auto items-center">
                  {(["value", "percentage"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDiscountType(t)}
                      className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black border transition-all",
                        discountType === t ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-500 border-zinc-200"
                      )}
                    >
                      {t === "value" ? "R$" : "%"}
                    </button>
                  ))}
                  <div className="relative w-20">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold pointer-events-none">
                      {discountType === "percentage" ? "%" : "R$"}
                    </span>
                    <input
                      type="number" step="0.01" min={0}
                      className="w-full text-[11px] pl-6 pr-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg font-bold outline-none focus:border-amber-400"
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-zinc-100">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total</span>
                <span className="text-xl font-black text-zinc-900">{fmtBRL(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Aba Dados ── */}
        {tab === "info" && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-5">
            {/* Transferir cliente */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <ArrowRightLeft size={11}/> Transferir para outro cliente
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <User size={13}/>
                </div>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setClientId(""); setSelectedClient(null); }}
                  className="w-full pl-9 pr-3 py-3 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 font-bold"
                />
                {clientResults.length > 0 && !clientId && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 mt-1 max-h-40 overflow-y-auto">
                    {clientResults.map((c: any) => (
                      <button
                        key={c.id}
                        onMouseDown={() => { setClientId(c.id); setClientSearch(c.name); setSelectedClient(c); setClientResults([]); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-all border-b border-zinc-50 last:border-0"
                      >
                        <p className="font-bold text-zinc-900">{c.name}</p>
                        <p className="text-zinc-400 text-[10px]">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {clientId && clientId !== comanda.clientId && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <CheckCircle size={13} className="text-amber-500 shrink-0"/>
                  <p className="text-xs font-bold text-amber-800">
                    Comanda será transferida para <strong>{selectedClient?.name}</strong>
                  </p>
                </div>
              )}
              {(!clientId || clientId === comanda.clientId) && comanda.client && (
                <p className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 ml-1">
                  <CheckCircle size={10} className="text-emerald-400"/> Cliente atual: {comanda.client.name}
                </p>
              )}
            </div>

            {/* Profissional */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Scissors size={11}/> Profissional
              </label>
              <Combobox
                options={[
                  { value: "", label: "Nenhum" },
                  ...professionals.map((p: any) => ({
                    value: p.id,
                    label: p.name,
                    subtitle: p.role || undefined,
                  })),
                ]}
                value={professionalId}
                onChange={v => setProfessionalId(v as string)}
                placeholder="Selecionar profissional..."
                searchPlaceholder="Buscar profissional..."
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição / Observação</label>
              <textarea
                rows={3}
                placeholder="Observações da comanda..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 resize-none font-medium"
              />
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1.5">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resumo da comanda</p>
              <div className="flex justify-between text-xs font-bold text-zinc-600">
                <span>Itens</span><span>{items.length} item(ns)</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-zinc-600">
                <span>Subtotal</span><span>{fmtBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-zinc-900 pt-1 border-t border-zinc-200">
                <span>Total</span><span>{fmtBRL(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-zinc-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </motion.div>

      {/* ── Catálogo Bottom-Sheet ── */}
      <AnimatePresence>
        {catalogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[70]"
            onClick={() => setCatalogOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] max-h-[80vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-zinc-200 rounded-full" />
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-100 shrink-0 px-4">
                <button
                  onClick={() => { setCatalogTab("services"); setPanelSearch(""); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                    catalogTab === "services" ? "border-violet-500 text-violet-700 bg-violet-50/50" : "border-transparent text-zinc-400"
                  )}
                >
                  <Scissors size={12}/> Serviços
                </button>
                <button
                  onClick={() => { setCatalogTab("products"); setPanelSearch(""); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                    catalogTab === "products" ? "border-emerald-500 text-emerald-700 bg-emerald-50/50" : "border-transparent text-zinc-400"
                  )}
                >
                  <Package size={12}/> Produtos
                </button>
              </div>

              {/* Search */}
              <div className="px-4 py-2.5 border-b border-zinc-100 shrink-0">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
                  <input
                    type="text"
                    placeholder={catalogTab === "services" ? "Buscar serviço ou pacote..." : "Buscar produto..."}
                    value={panelSearch}
                    onChange={e => setPanelSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                {catalogTab === "services" && (
                  <>
                    {filteredServices.pkgs.length > 0 && (
                      <>
                        <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest px-1 pt-1 pb-1 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block"/> Pacotes
                        </p>
                        {filteredServices.pkgs.map(pkg => renderCatalogItem(pkg, "package"))}
                        {filteredServices.singles.length > 0 && (
                          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-1 pt-3 pb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/> Serviços
                          </p>
                        )}
                      </>
                    )}
                    {filteredServices.singles.length === 0 && filteredServices.pkgs.length === 0 && (
                      <p className="text-[10px] text-zinc-400 text-center py-8 font-bold">Nenhum serviço encontrado</p>
                    )}
                    {filteredServices.singles.map(s => renderCatalogItem(s, "service"))}
                  </>
                )}

                {catalogTab === "products" && (
                  <>
                    {filteredProducts.length === 0 && (
                      <p className="text-[10px] text-zinc-400 text-center py-8 font-bold">Nenhum produto no PDV</p>
                    )}
                    {filteredProducts.map(p => renderCatalogItem(p, "product"))}
                  </>
                )}
              </div>

              {/* Fechar */}
              <div className="px-4 py-3 border-t border-zinc-100 shrink-0">
                <button
                  onClick={() => setCatalogOpen(false)}
                  className="w-full py-2.5 bg-zinc-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Fechar Catálogo ({items.length} {items.length === 1 ? 'item' : 'itens'})
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── ComandasTab ───────────────────────────────────────────────────────────────

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
  const [search, setSearch]             = useState("");
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
    <div className="space-y-4 sm:space-y-6 relative pb-20 sm:pb-0">

      {/* ── KPIs — compactos no mobile ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: "Em Aberto",      value: openCount,          sub: fmtBRL(totalOpen), icon: <Receipt size={18} />,      color: "text-amber-600",   bg: "bg-amber-50", border: "border-amber-100" },
          { label: "A Receber",      value: fmtBRL(totalOpen),  sub: `${openCount} pendentes`,  icon: <DollarSign size={18} />, color: "text-red-500",     bg: "bg-red-50",    border: "border-red-100" },
          { label: "Pagas",          value: paidCount,          sub: fmtBRL(totalPaid), icon: <CheckCircle size={18} />,  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          { label: "Recebido",       value: fmtBRL(totalPaid),  sub: `${paidCount} finalizadas`, icon: <DollarSign size={18} />, color: "text-zinc-900",    bg: "bg-zinc-50",    border: "border-zinc-100" },
        ].map(kpi => (
          <div key={kpi.label} className={cn("rounded-2xl border p-3 sm:p-4 shadow-sm", kpi.bg, kpi.border)}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{kpi.label}</p>
              <div className={cn("p-1.5 rounded-lg opacity-30", kpi.bg)}>{kpi.icon}</div>
            </div>
            <p className={cn("text-lg sm:text-2xl font-black", kpi.color)}>{kpi.value}</p>
            <p className="text-[9px] sm:text-[10px] text-zinc-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros + Busca ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-5 border-b border-zinc-100">
          {/* Filtros de status */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
            {(["all", "open", "paid"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap shrink-0",
                  statusFilter === s
                    ? s === "open" ? "bg-amber-500 text-white border-amber-500"
                      : s === "paid" ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                )}
              >
                {s === "all" ? `Todos (${comandas.length})` : s === "open" ? `Aberto (${openCount})` : `Pagas (${paidCount})`}
              </button>
            ))}
          </div>

          {/* Busca + botão nova comanda (desktop) */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
              <input
                type="text" placeholder="Buscar por cliente, item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 font-bold"
              />
            </div>
            <button
              onClick={() => setIsComandaModalOpen(true)}
              className="hidden sm:flex px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm items-center gap-1.5 transition-all shrink-0"
            >
              <Plus size={14}/> Nova Comanda
            </button>
          </div>
        </div>

        {/* ── Grid responsivo (desktop tabela + mobile cards expandíveis) ── */}
        <div className="p-3 sm:p-0">
          <GridTable
            data={filtered}
            keyExtractor={(c) => c.id}
            noDesktopCard
            emptyMessage={
              <div className="py-8 text-center">
                <Receipt size={32} className="mx-auto mb-3 text-zinc-200" />
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Nenhuma comanda encontrada
                </p>
              </div>
            }
            onRowClick={(c) => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
            getMobileBorderClass={(c) => c.status === "open" ? "border-amber-200" : "border-zinc-200"}
            renderMobileAvatar={(c) => (
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0",
                c.status === "open"
                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200"
              )}>
                {c.client?.name?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            renderMobileItem={(c) => (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-zinc-900 truncate">
                      {c.client?.name || "Sem cliente"}
                    </p>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest shrink-0",
                      c.status === "open" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {c.status === "open" ? "Aberto" : "Pago"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                      <Clock size={9} />
                      {format(new Date(c.createdAt || Date.now()), "dd/MM/yy HH:mm")}
                    </span>
                    {(c.items?.length || 0) > 0 && (
                      <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                        <ShoppingBag size={9} />
                        {c.items.length} {c.items.length === 1 ? "item" : "itens"}
                      </span>
                    )}
                  </div>
                </div>
                <span className={cn(
                  "text-base font-black shrink-0",
                  c.status === "open" ? "text-zinc-900" : "text-emerald-600"
                )}>
                  {fmtBRL(Number(c.total))}
                </span>
              </div>
            )}
            renderMobileExpandedContent={(c) => (
              <div className="px-4 pb-4 pt-3 space-y-3">
                {/* Itens */}
                {(c.items?.length || 0) > 0 && (
                  <div className="space-y-1.5">
                    {c.items.map((it: any, i: number) => (
                      <div key={it.id || i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn(
                            "p-1 rounded-md shrink-0",
                            it.productId ? "bg-emerald-50 text-emerald-500" : "bg-violet-50 text-violet-500"
                          )}>
                            {it.productId ? <Package size={10} /> : <Scissors size={10} />}
                          </div>
                          <span className="text-xs font-bold text-zinc-700 truncate">{it.name}</span>
                          <span className="text-[9px] text-zinc-400 font-bold shrink-0">{it.quantity}x</span>
                        </div>
                        <span className="text-xs font-black text-zinc-800 shrink-0 ml-2">
                          {fmtBRL(Number(it.total || it.price * it.quantity))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Desconto */}
                {Number(c.discount) > 0 && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <Zap size={10} /> Desconto
                    </span>
                    <span className="font-black text-emerald-600">
                      -{c.discountType === "percentage" ? `${c.discount}%` : fmtBRL(Number(c.discount))}
                    </span>
                  </div>
                )}

                {/* Pagamento */}
                {c.status === "paid" && c.paymentMethod && (
                  <div className="flex items-center gap-2">
                    <PaymentBadge method={c.paymentMethod} details={c.paymentDetails} />
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2 pt-1">
                  {c.status === "open" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePayComanda(c); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
                    >
                      <CheckCircle size={13} /> Pagar
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingComanda(c); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteComanda(c.id); }}
                    className="flex items-center justify-center py-2.5 px-3 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-xl transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
            columns={[
              {
                header: "Cliente",
                render: (c) => (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-black text-amber-600 shrink-0">
                      {c.client?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 whitespace-nowrap">{c.client?.name || "—"}</p>
                      <p className="text-[10px] text-zinc-400">{c.client?.phone || ""}</p>
                    </div>
                  </div>
                ),
              },
              {
                header: "Itens",
                className: "max-w-[200px]",
                render: (c) => (
                  <div className="flex flex-wrap gap-1">
                    {c.items?.slice(0, 3).map((it: any, i: number) => (
                      <span key={i} className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                        {it.productId ? <Package size={9} /> : <Scissors size={9} />}
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
                ),
                hideOnMobile: true,
              },
              {
                header: "Data",
                render: (c) => (
                  <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">
                    {format(new Date(c.createdAt || Date.now()), "dd/MM/yyyy")}
                  </span>
                ),
                hideOnMobile: true,
              },
              {
                header: "Desconto",
                render: (c) =>
                  Number(c.discount) > 0
                    ? <span className="text-xs font-bold text-emerald-600">-{c.discountType === "percentage" ? `${c.discount}%` : fmtBRL(Number(c.discount))}</span>
                    : <span className="text-[10px] text-zinc-300">—</span>,
                hideOnMobile: true,
              },
              {
                header: "Total",
                render: (c) => (
                  <span className="text-sm font-black text-zinc-900 whitespace-nowrap">{fmtBRL(Number(c.total))}</span>
                ),
              },
              {
                header: "Pgto",
                render: (c) =>
                  c.status === "paid"
                    ? <PaymentBadge method={c.paymentMethod} details={c.paymentDetails} />
                    : <span className="text-[10px] text-zinc-300">—</span>,
                hideOnMobile: true,
              },
              {
                header: "Status",
                render: (c) => (
                  <span className={cn(
                    "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border whitespace-nowrap",
                    c.status === "open" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {c.status === "open" ? "Em Aberto" : "Pago"}
                  </span>
                ),
              },
              {
                header: "Ações",
                headerClassName: "text-right",
                className: "text-right",
                render: (c) => (
                  <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                    {c.status === "open" && (
                      <button
                        onClick={() => handlePayComanda(c)}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                      >
                        <CheckCircle size={11} /> Pagar
                      </button>
                    )}
                    <ActionMenu
                      comanda={c}
                      onPay={() => handlePayComanda(c)}
                      onEdit={() => setEditingComanda(c)}
                      onView={() => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                      onDelete={() => handleDeleteComanda(c.id)}
                    />
                  </div>
                ),
                hideOnMobile: true,
              },
            ]}
          />
        </div>
      </div>

      {/* ── FAB Mobile — Nova Comanda ── */}
      <button
        onClick={() => setIsComandaModalOpen(true)}
        className="sm:hidden fixed bottom-24 right-4 z-50 w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center transition-all active:scale-90"
      >
        <Plus size={24} />
      </button>

      {/* Modal Detalhes */}
      <AnimatePresence>
        {isComandaDetailOpen && selectedComanda && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-[2px]"
            onClick={() => setIsComandaDetailOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl w-full sm:max-w-lg border border-zinc-200 overflow-hidden max-h-[92vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-zinc-900 rounded-xl text-white shrink-0"><FileText size={16}/></div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-zinc-900">Comanda #{selectedComanda.id.slice(-6).toUpperCase()}</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                      {format(new Date(selectedComanda.createdAt || Date.now()), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsComandaDetailOpen(false)} className="p-2 hover:bg-zinc-100 text-zinc-400 rounded-xl shrink-0"><X size={16}/></button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 130px)' }}>
                {/* Cliente */}
                <div className="flex items-center gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-black text-amber-600 shrink-0">
                    {selectedComanda.client?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900 truncate">{selectedComanda.client?.name || "—"}</p>
                    <p className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 mt-0.5">
                      <Phone size={9}/> {selectedComanda.client?.phone || "—"}
                    </p>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shrink-0",
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
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-violet-100 text-violet-600 shrink-0"><Scissors size={11}/></div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-900 truncate">{it.name}</p>
                            <p className="text-[9px] text-zinc-400 font-bold">{it.quantity}x · Un: {fmtBRL(Number(it.price))}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-zinc-900 shrink-0 ml-2">{fmtBRL(Number(it.total || it.price * it.quantity))}</p>
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
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 shrink-0"><Package size={11}/></div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-900 truncate">{it.name}</p>
                            <p className="text-[9px] text-zinc-400 font-bold">{it.quantity}x · Un: {fmtBRL(Number(it.price))}</p>
                          </div>
                        </div>
                        <p className="text-sm font-black text-zinc-900 shrink-0 ml-2">{fmtBRL(Number(it.total || it.price * it.quantity))}</p>
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
                        <CheckCircle size={13}/> Pagar
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
            professionals={professionals}
            onClose={() => setEditingComanda(null)}
            onSaved={fetchComandas}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
