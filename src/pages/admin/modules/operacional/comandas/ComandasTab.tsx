import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, CheckCircle, X, Scissors, Banknote, CreditCard, Smartphone,
  Shuffle, Package, FileText, Phone, Zap, Trash2, Edit2,
  Minus, User, ArrowRightLeft, ChevronDown,
  MoreVertical, Eye, DollarSign, Clock, AlertCircle,
  ShoppingBag, Receipt, Calendar, Layers, ChevronRight,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { motion, AnimatePresence } from "motion/react";
import {
  PageWrapper, SectionTitle, StatCard, ContentCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineSegmented,
  Button, IconButton,
  Badge, PaymentBadge,
  Modal, ModalFooter,
  GridTable, Column,
  EmptyState,
  usePagination, Pagination,
  useToast,
} from "@/src/components/ui";
import { Combobox } from "@/src/components/ui/Combobox";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d?: string) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yy HH:mm", { locale: ptBR }); } catch { return "—"; }
}

function fmtDateShort(d?: string) {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return "—"; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

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
  handleDeleteComanda: (id: string, name?: string) => void;
  fetchComandas: () => void;
}

// ─── Sessions Badge ───────────────────────────────────────────────────────────

function SessionsBadge({ comanda, onUpdate }: { comanda: any; onUpdate?: () => void }) {
  const total   = Number(comanda.sessionCount || 1);
  const done    = Number(comanda.sessionsCompleted || 0);
  const isMulti = total > 1;
  if (!isMulti) return null;

  const pct   = Math.round((done / total) * 100);
  const color = done >= total ? "bg-emerald-500" : done > 0 ? "bg-amber-400" : "bg-zinc-300";

  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-violet-50 border border-violet-100">
        <Layers size={10} className="text-violet-500 shrink-0" />
        <span className="text-[10px] font-black text-violet-700">{done}/{total}</span>
      </div>
      <div className="w-14 h-1.5 bg-zinc-100 rounded-full overflow-hidden hidden sm:block">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Package summary in grid ──────────────────────────────────────────────────

function PackageSummary({ comanda }: { comanda: any }) {
  const packages: any[] = comanda.packages || [];
  const singleItems: any[] = (comanda.items || []).filter((i: any) => !i.packageId);

  return (
    <div className="flex flex-wrap gap-1">
      {comanda.type === 'produto' && (
        <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-orange-50 border border-orange-100 text-orange-700">
          <ShoppingBag size={8} /> Produto
        </span>
      )}
      {comanda.type === 'pacote' && packages.length === 0 && (
        <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-violet-50 border border-violet-100 text-violet-700">
          <Layers size={8} /> Pacote
        </span>
      )}
      {packages.map((pkg: any) => (
        <span key={pkg.packageId} className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-violet-50 border border-violet-100 text-violet-700">
          <Layers size={8} /> {pkg.packageName}
          <span className="bg-violet-100 px-0.5 rounded text-[8px]">{pkg.count}svc</span>
        </span>
      ))}
      {singleItems.slice(0, packages.length > 0 ? 1 : 3).map((it: any, i: number) => (
        <span key={i} className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
          {it.productId ? <Package size={9} /> : <Scissors size={9} />}
          {it.name}
        </span>
      ))}
      {singleItems.length > (packages.length > 0 ? 1 : 3) && (
        <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-lg">
          +{singleItems.length - (packages.length > 0 ? 1 : 3)}
        </span>
      )}
      {packages.length === 0 && singleItems.length === 0 && (
        <span className="text-[10px] text-zinc-400 italic">Sem itens</span>
      )}
    </div>
  );
}

// ─── ActionMenu ───────────────────────────────────────────────────────────────

function ActionMenu({ comanda, onPay, onEdit, onView, onDelete }: {
  comanda: any; onPay: () => void; onEdit: () => void; onView: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const scroll = () => setOpen(false);
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", scroll, true);
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    return () => { document.removeEventListener("mousedown", handler); window.removeEventListener("scroll", scroll, true); };
  }, [open]);

  const items = [
    (comanda.status === "open" || comanda.status === "partial") && { label: "Pagar", icon: <CheckCircle size={14} />, cls: "text-emerald-700 hover:bg-emerald-50", action: onPay },
    { label: "Editar",   icon: <Edit2 size={14} />,    cls: "text-zinc-700",                  action: onEdit },
    { label: "Detalhes", icon: <Eye size={14} />,      cls: "text-zinc-700",                  action: onView },
    null, // divider
    { label: "Excluir",  icon: <Trash2 size={14} />,   cls: "text-red-600 hover:bg-red-50",   action: onDelete },
  ].filter(Boolean) as any[];

  return (
    <>
      <IconButton ref={buttonRef} variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setOpen(!open); }}>
        <MoreVertical size={16} />
      </IconButton>
      {typeof document !== "undefined" && createPortal(
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
              {items.map((item, idx) =>
                item === null ? (
                  <div key={idx} className="border-t border-zinc-100 my-1" />
                ) : (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="xs"
                    fullWidth
                    iconLeft={item.icon}
                    onClick={e => { e.stopPropagation(); setOpen(false); item.action(); }}
                    className={cn("justify-start px-4 rounded-none", item.cls)}
                  >
                    {item.label}
                  </Button>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ─── ComandaDrawer ────────────────────────────────────────────────────────────
// Drawer lateral completo: pagamento inline, adição de itens, sessões, agendamentos

type DrawerView = "main" | "pay" | "catalog";
type PayMode = "single" | "mixed";
type PayMethod = "cash" | "card" | "pix";

function parseBRL(s: string): number {
  const digits = s.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}
function fmtInput(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PAY_CFG = {
  cash: { label: "Dinheiro", icon: Banknote,    bg: "bg-emerald-500", light: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  card: { label: "Cartão",   icon: CreditCard,  bg: "bg-blue-500",    light: "bg-blue-50 border-blue-200 text-blue-600" },
  pix:  { label: "Pix",      icon: Smartphone,  bg: "bg-violet-500",  light: "bg-violet-50 border-violet-200 text-violet-700" },
};

function DetailModal({ comanda, onClose, onPay, onEdit, fetchComandas, products, services }: {
  comanda: any; onClose: () => void; onPay: (method: string, details: any) => void;
  onEdit: () => void; fetchComandas: () => void; products: any[]; services: any[];
}) {
  const toast   = useToast();
  const [view,    setView]    = useState<DrawerView>("main");
  const [saving,  setSaving]  = useState(false);

  // ── Sessões
  const [updatingSession, setUpdatingSession] = useState(false);

  // ── Pagamento
  const [payMode,         setPayMode]         = useState<PayMode>("single");
  const [payMethod,       setPayMethod]       = useState<PayMethod>("cash");
  const [cardType,        setCardType]        = useState<"debit" | "credit">("credit");
  const [payInstallments, setPayInstallments] = useState(1);
  const [payAmount,       setPayAmount]       = useState("");
  const [mixedEntries, setMixedEntries] = useState<{ method: PayMethod; amount: string }[]>([
    { method: "cash", amount: "" }, { method: "pix", amount: "" }
  ]);

  // ── Catálogo (adição de itens rápida)
  const [catalogTab,    setCatalogTab]    = useState<"services" | "products">("services");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [addedItems, setAddedItems] = useState<{ name: string; price: number; quantity: number; productId: string | null; serviceId: string | null }[]>([]);
  const [savingItems, setSavingItems] = useState(false);

  useEffect(() => {
    if (comanda) { setView("main"); setPayAmount(""); setPayMode("single"); setPayMethod("cash"); setCardType("credit"); setPayInstallments(1); setAddedItems([]); setCatalogSearch(""); }
  }, [comanda?.id]);

  if (!comanda) return null;

  // ── Cálculos
  const packages: any[] = comanda.packages || [];
  const svcItems   = (comanda.items || []).filter((i: any) => !i.productId);
  const prodItems  = (comanda.items || []).filter((i: any) => i.productId);
  const appts: any[] = (comanda.appointments || []);
  const subtotal   = (comanda.items || []).reduce((a: number, i: any) => a + Number(i.price) * Number(i.quantity), 0);
  const totalVal   = Number(comanda.total);
  const paidAmount = Number(comanda.paidAmount || 0);
  const remaining  = Math.max(0, totalVal - paidAmount);
  const paidPct    = totalVal > 0 ? Math.min(100, Math.round((paidAmount / totalVal) * 100)) : 0;
  const sessionTotal = Number(comanda.sessionCount || 1);
  const done         = Number(comanda.sessionsCompleted || 0);
  const isMulti      = sessionTotal > 1;

  const statusColor = comanda.status === "paid" ? "success" : comanda.status === "partial" ? "info" : "warning";
  const statusLabel = comanda.status === "paid" ? "Pago" : comanda.status === "partial" ? "Parcial" : "Em Aberto";
  const canPay      = comanda.status === "open" || comanda.status === "partial";

  // ── Pagamento — cálculos
  const singleNum     = payAmount ? parseBRL(payAmount) : remaining;
  const singlePartial = singleNum < remaining - 0.01;
  const singleBalance = remaining - singleNum;
  const singleOverpay = singleNum > remaining + 0.01;
  const canPaySingle  = singleNum > 0.01 && !singleOverpay;

  const mixedTotal    = mixedEntries.reduce((s, e) => s + parseBRL(e.amount), 0);
  const mixedRem      = remaining - mixedTotal;
  const canPayMixed   = mixedTotal > 0.01 && mixedTotal <= remaining + 0.01;

  // ── Catálogo
  const filteredSvcs  = services.filter(s => s.type !== "package" && (!catalogSearch || s.name.toLowerCase().includes(catalogSearch.toLowerCase())));
  const filteredPkgs  = services.filter(s => s.type === "package"  && (!catalogSearch || s.name.toLowerCase().includes(catalogSearch.toLowerCase())));
  const filteredProds = products.filter(p => p.isForSale && (!catalogSearch || p.name.toLowerCase().includes(catalogSearch.toLowerCase())));

  // ── Handlers
  const handleSession = async (newDone: number) => {
    setUpdatingSession(true);
    try {
      await apiFetch(`/api/comandas/${comanda.id}/sessions`, { method: "PATCH", body: JSON.stringify({ sessionsCompleted: newDone }) });
      fetchComandas(); toast.success(`Sessão ${newDone}/${sessionTotal} marcada!`);
    } catch { toast.error("Erro ao atualizar sessão."); }
    finally { setUpdatingSession(false); }
  };

  const handleConfirmPayment = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (payMode === "single") {
        if (singleOverpay || !canPaySingle) return;
        const details = { mode: "single", method: payMethod, amount: singleNum, cardType: payMethod === "card" ? cardType : undefined, installments: payMethod === "card" && cardType === "credit" ? payInstallments : 1, isPartial: singlePartial, totalPaying: singleNum };
        await onPay(payMethod, details);
        toast.success(singlePartial ? `Pagamento parcial de ${fmtBRL(singleNum)} registrado!` : "Comanda paga com sucesso!");
      } else {
        if (!canPayMixed) return;
        const valid = mixedEntries.filter(e => parseBRL(e.amount) > 0);
        const methods = [...new Set(valid.map(e => e.method))];
        const label   = methods.length === 1 ? methods[0] : "mixed";
        const total   = valid.reduce((s, e) => s + parseBRL(e.amount), 0);
        const isPartialMixed = total < remaining - 0.01;
        const details = { mode: "mixed", entries: valid.map(e => ({ method: e.method, amount: parseBRL(e.amount), installments: 1 })), isPartial: isPartialMixed, totalPaying: total };
        await onPay(label, details);
        toast.success(isPartialMixed ? `Pagamento parcial de ${fmtBRL(total)} registrado!` : "Comanda paga com sucesso!");
      }
      fetchComandas();
      setView("main");
    } catch (err: any) { toast.error(err?.message || "Erro ao processar pagamento."); }
    finally { setSaving(false); }
  };

  const addCatalogItem = (item: { name: string; price: number; productId: string | null; serviceId: string | null }) => {
    setAddedItems(prev => {
      const ex = prev.find(i => (item.productId && i.productId === item.productId) || (item.serviceId && i.serviceId === item.serviceId));
      if (ex) return prev.map(i => i === ex ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const addPackageToCatalog = (pkg: any) => {
    (pkg.packageServices || []).forEach((ps: any) => {
      setAddedItems(prev => [...prev, {
        name: ps.service?.name || ps.name || pkg.name,
        price: Number(ps.service?.price ?? ps.price) || 0,
        quantity: ps.quantity || 1,
        productId: null,
        serviceId: ps.serviceId || ps.service?.id || null,
      }]);
    });
  };

  const handleSaveItems = async () => {
    if (!addedItems.length) { setView("main"); return; }
    setSavingItems(true);
    try {
      const existing: any[] = (comanda.items || []).map((i: any) => ({
        id: i.id, name: i.name, price: Number(i.price), quantity: Number(i.quantity),
        productId: i.productId || null, serviceId: i.serviceId || null,
        packageId: i.packageId || null, packageName: i.packageName || null,
      }));
      const newItems = addedItems.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, productId: i.productId, serviceId: i.serviceId, packageId: null }));
      const all = [...existing, ...newItems];
      const newSubtotal = all.reduce((s, i) => s + i.price * i.quantity, 0);
      await apiFetch(`/api/comandas/${comanda.id}/items`, {
        method: "PUT", body: JSON.stringify({ items: all, discount: Number(comanda.discount || 0), discountType: comanda.discountType || "value", total: newSubtotal }),
      });
      toast.success("Itens adicionados!");
      setAddedItems([]); setCatalogSearch("");
      fetchComandas(); setView("main");
    } catch { toast.error("Erro ao adicionar itens."); }
    finally { setSavingItems(false); }
  };

  // ── Render: drawer lateral no desktop, fullscreen no mobile
  return (
    <AnimatePresence>
      {!!comanda && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[80] backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-[81] w-full sm:w-[460px] bg-white shadow-2xl flex flex-col overflow-hidden"
          >

            {/* ── Header ── */}
            <div className={cn(
              "flex items-center gap-3 px-4 py-4 border-b shrink-0",
              view === "pay" ? "bg-emerald-50 border-emerald-100" :
              view === "catalog" ? "bg-amber-50 border-amber-100" : "bg-white border-zinc-100"
            )}>
              {view !== "main" ? (
                <button onClick={() => setView("main")} className="p-2 rounded-xl hover:bg-white/60 text-zinc-500 transition-all">
                  <ChevronRight size={18} className="rotate-180" />
                </button>
              ) : (
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 transition-all">
                  <X size={18} />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-zinc-900">
                  {view === "pay" ? "Registrar Pagamento" : view === "catalog" ? "Adicionar Itens" : `Comanda #${comanda.id?.slice(-6).toUpperCase()}`}
                </p>
                <p className="text-[10px] text-zinc-400 font-bold truncate">
                  {view === "pay" ? `Restante: ${fmtBRL(remaining)}` :
                   view === "catalog" ? `${addedItems.length} item(ns) selecionado(s)` :
                   comanda.client?.name || "Sem cliente"}
                </p>
              </div>
              {view === "main" && (
                <Badge color={statusColor} size="sm">{statusLabel}</Badge>
              )}
            </div>

            {/* ── MAIN VIEW ── */}
            {view === "main" && (
              <div className="flex-1 overflow-y-auto">

                {/* Bloco financeiro */}
                <div className="px-4 py-4 border-b border-zinc-100 bg-zinc-50/40">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0",
                      comanda.status === "paid" ? "bg-emerald-100 text-emerald-600" :
                      comanda.status === "partial" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {comanda.client?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-zinc-900 truncate">{comanda.client?.name || "Sem cliente"}</p>
                      {comanda.client?.phone && (
                        <p className="text-[10px] text-zinc-500 font-bold flex items-center gap-1"><Phone size={9} />{comanda.client.phone}</p>
                      )}
                      {comanda.professional?.name && (
                        <p className="text-[10px] text-zinc-400 font-bold flex items-center gap-1"><Scissors size={9} />{comanda.professional.name}</p>
                      )}
                    </div>
                    <p className="text-[9px] text-zinc-400 font-bold shrink-0">{fmtDate(comanda.createdAt)}</p>
                  </div>

                  {/* 3 colunas financeiras */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "Total", val: totalVal, cls: "text-zinc-900" },
                      { label: "Pago",  val: paidAmount, cls: "text-emerald-600" },
                      { label: "Restante", val: remaining, cls: remaining > 0 ? "text-amber-600" : "text-zinc-400" },
                    ].map(col => (
                      <div key={col.label} className="bg-white rounded-2xl border border-zinc-100 p-3 text-center">
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{col.label}</p>
                        <p className={cn("text-base font-black mt-0.5", col.cls)}>{fmtBRL(col.val)}</p>
                      </div>
                    ))}
                  </div>

                  {/* Barra progresso */}
                  <div className="space-y-1">
                    <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-500",
                        paidPct >= 100 ? "bg-emerald-500" : paidPct > 0 ? "bg-amber-400" : "bg-zinc-300"
                      )} style={{ width: `${paidPct}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-400">{paidPct}% pago</span>
                      <div className="flex items-center gap-2">
                        {Number(comanda.discount) > 0 && (
                          <span className="text-[9px] font-black text-emerald-600 flex items-center gap-0.5">
                            <Zap size={8} /> -{comanda.discountType === "percentage" ? `${comanda.discount}%` : fmtBRL(Number(comanda.discount))}
                          </span>
                        )}
                        {comanda.paymentMethod && comanda.status === "paid" && <PaymentBadge method={comanda.paymentMethod} />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botões de ação rápida */}
                <div className="px-4 py-3 border-b border-zinc-100 grid grid-cols-2 gap-2">
                  {canPay && (
                    <button
                      onClick={() => setView("pay")}
                      className="flex items-center gap-2 p-3 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-white transition-all active:scale-95"
                    >
                      <div className="p-1.5 bg-white/20 rounded-xl shrink-0"><CheckCircle size={15} /></div>
                      <div className="text-left min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Pagar</p>
                        <p className="text-[9px] font-bold opacity-80 mt-0.5">{fmtBRL(remaining)}</p>
                      </div>
                    </button>
                  )}
                  <button
                    onClick={() => { setView("catalog"); setCatalogSearch(""); setAddedItems([]); }}
                    className="flex items-center gap-2 p-3 bg-amber-500 hover:bg-amber-600 rounded-2xl text-white transition-all active:scale-95"
                  >
                    <div className="p-1.5 bg-white/20 rounded-xl shrink-0"><Plus size={15} /></div>
                    <div className="text-left min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Adicionar</p>
                      <p className="text-[9px] font-bold opacity-80 mt-0.5">Serv · Prod · Pacote</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { onEdit(); onClose(); }}
                    className="flex items-center gap-2 p-3 bg-zinc-100 hover:bg-zinc-200 rounded-2xl text-zinc-700 transition-all active:scale-95"
                  >
                    <div className="p-1.5 bg-zinc-200 rounded-xl shrink-0"><Edit2 size={14} /></div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">Editar</p>
                      <p className="text-[9px] font-bold text-zinc-400 mt-0.5">Desc, cliente, prof.</p>
                    </div>
                  </button>
                  {!canPay && (
                    <button
                      onClick={onClose}
                      className="flex items-center gap-2 p-3 bg-zinc-100 hover:bg-zinc-200 rounded-2xl text-zinc-700 transition-all active:scale-95"
                    >
                      <div className="p-1.5 bg-zinc-200 rounded-xl shrink-0"><X size={14} /></div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Fechar</p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Sessões */}
                {isMulti && (
                  <div className="mx-4 mt-4 p-3 bg-violet-50 rounded-2xl border border-violet-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-violet-700 uppercase tracking-widest flex items-center gap-1.5">
                          <Layers size={11} /> Sessões — {done}/{sessionTotal}
                        </p>
                        <p className="text-[9px] text-violet-400 font-bold mt-0.5">
                          {done >= sessionTotal ? "✓ Todas concluídas" : `${sessionTotal - done} restante(s)`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <IconButton size="xs" variant="outline" disabled={done <= 0 || updatingSession} onClick={() => handleSession(done - 1)}>
                          <Minus size={11} />
                        </IconButton>
                        <IconButton size="xs" variant="outline" disabled={done >= sessionTotal || updatingSession}
                          onClick={() => handleSession(done + 1)} className={done < sessionTotal ? "border-violet-300 text-violet-600" : ""}>
                          <Plus size={11} />
                        </IconButton>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: sessionTotal }).map((_, i) => (
                        <button key={i} disabled={updatingSession} onClick={() => handleSession(i < done ? i : i + 1)}
                          className={cn("flex-1 h-6 rounded-lg border text-[8px] font-black transition-all",
                            i < done ? "bg-violet-500 border-violet-500 text-white" : "bg-white border-violet-200 text-violet-300 hover:border-violet-400"
                          )}>
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Itens */}
                <div className="px-4 pt-4 pb-2">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Receipt size={11} /> Itens da Comanda
                  </p>

                  {comanda.items?.length === 0 && packages.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-zinc-300">
                      <Package size={28} className="mb-2" />
                      <p className="text-xs font-bold">Sem itens</p>
                      <button onClick={() => { setView("catalog"); setAddedItems([]); setCatalogSearch(""); }}
                        className="mt-2 text-[10px] font-black text-amber-600 hover:text-amber-700">
                        + Adicionar itens
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {packages.map((pkg: any) => (
                        <div key={pkg.packageId} className="rounded-xl border border-violet-100 overflow-hidden mb-1">
                          <div className="flex items-center gap-2 px-3 py-2 bg-violet-50">
                            <Layers size={10} className="text-violet-500 shrink-0" />
                            <span className="text-[10px] font-black text-violet-700">{pkg.packageName}</span>
                            <span className="ml-auto text-[9px] text-violet-400">{pkg.count} svc</span>
                          </div>
                          {(comanda.items || []).filter((i: any) => i.packageId === pkg.packageId).map((it: any) => (
                            <div key={it.id} className="flex items-center justify-between px-3 py-1.5 border-t border-violet-50">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Scissors size={9} className="text-violet-400 shrink-0" />
                                <span className="text-xs font-bold text-zinc-800 truncate">{it.name}</span>
                                <span className="text-[9px] text-zinc-400 shrink-0">{it.quantity}x</span>
                              </div>
                              <span className="text-xs font-black text-zinc-700 ml-2 shrink-0">{fmtBRL(Number(it.total || it.price * it.quantity))}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {svcItems.filter((i: any) => !i.packageId).map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between p-2.5 bg-amber-50/40 rounded-xl border border-amber-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600 shrink-0"><Scissors size={10} /></div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-900 truncate">{it.name}</p>
                              <p className="text-[9px] text-zinc-400">{it.quantity}x · {fmtBRL(Number(it.price))}/un</p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-zinc-900 shrink-0 ml-2">{fmtBRL(Number(it.total || it.price * it.quantity))}</p>
                        </div>
                      ))}
                      {prodItems.map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600 shrink-0"><Package size={10} /></div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-900 truncate">{it.name}</p>
                              <p className="text-[9px] text-zinc-400">{it.quantity}x · {fmtBRL(Number(it.price))}/un</p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-zinc-900 shrink-0 ml-2">{fmtBRL(Number(it.total || it.price * it.quantity))}</p>
                        </div>
                      ))}
                      <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1.5 mt-1">
                        <div className="flex justify-between text-xs font-bold text-zinc-500"><span>Subtotal</span><span>{fmtBRL(subtotal)}</span></div>
                        {Number(comanda.discount) > 0 && (
                          <div className="flex justify-between text-xs text-emerald-600 font-black">
                            <span className="flex items-center gap-1"><Zap size={9} /> Desconto</span>
                            <span>-{comanda.discountType === "percentage" ? `${comanda.discount}%` : fmtBRL(Number(comanda.discount))}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-zinc-900 pt-1 border-t border-zinc-200"><span>Total</span><span>{fmtBRL(totalVal)}</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Agendamentos */}
                {appts.length > 0 && (
                  <div className="px-4 pt-2 pb-4">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Calendar size={11} className="text-blue-500" /> Agendamentos ({appts.length})
                    </p>
                    <div className="space-y-1.5">
                      {appts.map((a: any) => {
                        const isDone  = a.status === "realizado";
                        const isSched = ["agendado", "confirmado", "reagendado"].includes(a.status);
                        const isBad   = ["cancelado", "faltou"].includes(a.status);
                        return (
                          <div key={a.id} className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-zinc-100">
                            <div className={cn("p-1.5 rounded-lg shrink-0",
                              isDone ? "bg-emerald-100 text-emerald-600" : isSched ? "bg-blue-100 text-blue-600" : isBad ? "bg-red-100 text-red-400" : "bg-zinc-100 text-zinc-400"
                            )}>
                              <Calendar size={10} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-900 truncate">{a.serviceName || a.service?.name || "Serviço"}</p>
                              <p className="text-[9px] text-zinc-400">
                                {a.date ? format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR }) : "—"}{a.startTime ? ` · ${a.startTime}` : ""}
                                {a.professional?.name ? ` · ${a.professional.name}` : ""}
                              </p>
                            </div>
                            <Badge color={isDone ? "success" : isSched ? "info" : isBad ? "danger" : "default"} size="sm">
                              <span className="capitalize">{a.status}</span>
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {comanda.description && (
                  <div className="mx-4 mb-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Observações</p>
                    <p className="text-xs text-zinc-700 font-bold leading-relaxed">{comanda.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── PAY VIEW ── */}
            {view === "pay" && (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Modo */}
                <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
                  {([["single", "Único"], ["mixed", "Misto"]] as const).map(([v, label]) => (
                    <button key={v} onClick={() => setPayMode(v)}
                      className={cn("flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        payMode === v ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400"
                      )}>
                      {label}
                    </button>
                  ))}
                </div>

                {payMode === "single" && (
                  <div className="space-y-4">
                    {/* Métodos */}
                    <div className="grid grid-cols-3 gap-2">
                      {(["cash", "card", "pix"] as const).map(m => {
                        const cfg = PAY_CFG[m]; const Icon = cfg.icon; const active = payMethod === m;
                        return (
                          <button key={m} onClick={() => setPayMethod(m)}
                            className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                              active ? `${cfg.bg} border-transparent shadow-lg text-white` : `${cfg.light} border-current`
                            )}>
                            <Icon size={22} />
                            <span className="text-[10px] font-black uppercase tracking-wider">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Débito / Crédito */}
                    {payMethod === "card" && (
                      <div className="flex gap-1.5 p-1 bg-blue-50 rounded-2xl border border-blue-100">
                        {([["debit", "Débito"], ["credit", "Crédito"]] as const).map(([v, label]) => (
                          <button key={v} onClick={() => { setCardType(v); if (v === "debit") setPayInstallments(1); }}
                            className={cn("flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                              cardType === v ? "bg-blue-500 text-white shadow-sm" : "text-blue-400 hover:text-blue-600"
                            )}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Valor */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor a Pagar</p>
                        <button onClick={() => setPayAmount("")} className="text-[10px] font-black text-amber-600">
                          Pagar tudo ({fmtBRL(remaining)})
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">R$</span>
                        <input type="text" inputMode="numeric" value={payAmount}
                          onChange={e => setPayAmount(fmtInput(e.target.value))}
                          placeholder={fmtBRL(remaining).replace("R$ ", "")}
                          className={cn("w-full pl-10 pr-4 py-3 border-2 rounded-2xl text-xl font-black text-zinc-900 outline-none transition-all",
                            singleOverpay ? "border-red-300 bg-red-50" : singlePartial && payAmount ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white focus:border-amber-400"
                          )}
                        />
                      </div>
                      {payAmount && (
                        <div className={cn("mt-2 flex items-center justify-between p-2.5 rounded-xl text-xs font-black border",
                          singleOverpay ? "bg-red-50 border-red-200 text-red-700" :
                          singlePartial ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        )}>
                          <span>{singleOverpay ? "⚠️ Valor acima do saldo" : singlePartial ? "⚠️ Pagamento parcial — restará:" : "✅ Quita o total"}</span>
                          {singlePartial && !singleOverpay && <span>{fmtBRL(singleBalance)}</span>}
                        </div>
                      )}
                    </div>

                    {/* Parcelamento — só crédito */}
                    {payMethod === "card" && cardType === "credit" && (
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Parcelamento</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[1,2,3,4,5,6].map(n => (
                            <button key={n} onClick={() => setPayInstallments(n)}
                              className={cn("py-2.5 rounded-xl border text-xs font-black transition-all",
                                payInstallments === n ? "bg-blue-500 text-white border-transparent" : "bg-blue-50 text-blue-600 border-blue-100"
                              )}>
                              {n === 1 ? "À vista" : `${n}x`}
                              {n > 1 && <span className="block text-[8px] opacity-80">{fmtBRL((payAmount ? singleNum : remaining) / n)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {payMode === "mixed" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Divisão</p>
                      <button onClick={() => setMixedEntries(prev => [...prev, { method: "cash", amount: "" }])}
                        className="text-[10px] font-black text-amber-600 flex items-center gap-1">
                        <Plus size={11} /> Adicionar
                      </button>
                    </div>
                    {mixedEntries.map((e, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <select value={e.method} onChange={ev => setMixedEntries(prev => prev.map((x, i) => i === idx ? { ...x, method: ev.target.value as PayMethod } : x))}
                          className="text-xs font-bold bg-white border border-zinc-200 rounded-xl px-2 py-2 outline-none">
                          <option value="cash">💵 Dinheiro</option>
                          <option value="card">💳 Cartão</option>
                          <option value="pix">📲 Pix</option>
                        </select>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">R$</span>
                          <input type="text" inputMode="numeric" value={e.amount}
                            onChange={ev => setMixedEntries(prev => prev.map((x, i) => i === idx ? { ...x, amount: fmtInput(ev.target.value) } : x))}
                            placeholder="0,00"
                            className="w-full pl-9 pr-3 py-2 text-sm font-bold bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400" />
                        </div>
                        {mixedEntries.length > 1 && (
                          <button onClick={() => setMixedEntries(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 text-zinc-300 hover:text-red-400 rounded-lg">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className={cn("flex items-center justify-between p-3 rounded-xl text-xs font-black border",
                      Math.abs(mixedRem) < 0.01 ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                      mixedRem > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700"
                    )}>
                      <span>{Math.abs(mixedRem) < 0.01 ? "✅ Valores conferem!" : mixedRem > 0 ? "⚠️ Faltam" : "⚠️ Excesso"}</span>
                      {Math.abs(mixedRem) >= 0.01 && <span>{fmtBRL(Math.abs(mixedRem))}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CATALOG VIEW ── */}
            {view === "catalog" && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-zinc-100 shrink-0">
                  {[{ k: "services", label: "Serviços / Pacotes", icon: <Scissors size={11} /> },
                    { k: "products", label: "Produtos",           icon: <Package size={11} /> }
                  ].map(t => (
                    <button key={t.k} onClick={() => setCatalogTab(t.k as any)}
                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                        catalogTab === t.k ? "border-amber-500 text-amber-700 bg-amber-50/40" : "border-transparent text-zinc-400"
                      )}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                {/* Search */}
                <div className="px-4 py-2.5 border-b border-zinc-100 shrink-0">
                  <div className="relative">
                    <ShoppingBag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input autoFocus type="text" placeholder="Buscar..." value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
                {/* Lista */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                  {catalogTab === "services" && (
                    <>
                      {filteredPkgs.length > 0 && (
                        <>
                          <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest pb-1">Pacotes</p>
                          {filteredPkgs.map((pkg: any) => (
                            <button key={pkg.id} onClick={() => addPackageToCatalog(pkg)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-violet-300 hover:bg-violet-50/40 transition-all text-left">
                              <div className="p-2 bg-violet-100 text-violet-700 rounded-xl shrink-0"><Layers size={13} /></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-zinc-900 truncate">{pkg.name}</p>
                                <p className="text-[10px] text-violet-600 font-black">{fmtBRL(Number(pkg.price))}</p>
                              </div>
                              <Plus size={15} className="text-zinc-300 shrink-0" />
                            </button>
                          ))}
                          {filteredSvcs.length > 0 && <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest pt-2 pb-1">Serviços</p>}
                        </>
                      )}
                      {filteredSvcs.map((s: any) => {
                        const qty = addedItems.find(i => i.serviceId === s.id)?.quantity || 0;
                        return (
                          <button key={s.id} onClick={() => addCatalogItem({ name: s.name, price: Number(s.price), productId: null, serviceId: s.id })}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0"><Scissors size={13} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-800 truncate">{s.name}</p>
                              <p className="text-[10px] text-amber-600 font-black">{fmtBRL(Number(s.price))}</p>
                            </div>
                            {qty > 0 ? <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">{qty}x</span>
                                      : <Plus size={15} className="text-zinc-300 shrink-0" />}
                          </button>
                        );
                      })}
                    </>
                  )}
                  {catalogTab === "products" && filteredProds.map((p: any) => {
                    const qty = addedItems.find(i => i.productId === p.id)?.quantity || 0;
                    const noStock = p.stock <= 0;
                    return (
                      <button key={p.id} disabled={noStock} onClick={() => !noStock && addCatalogItem({ name: p.name, price: Number(p.salePrice), productId: p.id, serviceId: null })}
                        className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                          noStock ? "border-zinc-100 opacity-40 cursor-not-allowed" : "border-zinc-100 hover:border-emerald-300 hover:bg-emerald-50/40"
                        )}>
                        <div className={cn("p-2 rounded-xl shrink-0", noStock ? "bg-zinc-100 text-zinc-400" : "bg-emerald-50 text-emerald-600")}><Package size={13} /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-800 truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] text-emerald-600 font-black">{fmtBRL(Number(p.salePrice))}</p>
                            <span className={cn("text-[8px] font-black px-1 py-0.5 rounded", noStock ? "bg-red-50 text-red-500" : "bg-zinc-100 text-zinc-500")}>
                              {noStock ? "Sem estoque" : `Est: ${p.stock}`}
                            </span>
                          </div>
                        </div>
                        {qty > 0 ? <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg">{qty}x</span>
                                  : !noStock ? <Plus size={15} className="text-zinc-300 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="px-4 py-3 border-t border-zinc-100 bg-white shrink-0">
              {view === "main" && (
                <Button variant="ghost" size="sm" fullWidth onClick={onClose} className="text-zinc-400">
                  Fechar
                </Button>
              )}
              {view === "pay" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setView("main")} className="flex-1">Voltar</Button>
                  <button
                    onClick={handleConfirmPayment}
                    disabled={saving || (payMode === "single" ? !canPaySingle : !canPayMixed)}
                    className={cn("flex-[2] py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                      saving || (payMode === "single" ? !canPaySingle : !canPayMixed)
                        ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95"
                    )}>
                    <CheckCircle size={14} />
                    {saving ? "Processando..." :
                      payMode === "single" && singlePartial && payAmount ? `Pagar ${fmtBRL(singleNum)} (Parcial)` :
                      payMode === "mixed" && mixedRem > 0.01 ? `Pagar ${fmtBRL(mixedTotal)} (Parcial)` :
                      "Confirmar Pagamento"}
                  </button>
                </div>
              )}
              {view === "catalog" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setView("main")} className="flex-1">Voltar</Button>
                  <Button variant="primary" size="sm" onClick={handleSaveItems} loading={savingItems}
                    disabled={addedItems.length === 0} className="flex-[2]">
                    Adicionar {addedItems.length > 0 ? `(${addedItems.length})` : ""}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── EditComandaModal ─────────────────────────────────────────────────────────

function EditComandaModal({
  comanda, products, services, professionals, onClose, onSaved,
}: {
  comanda: any; products: any[]; services: any[]; professionals: any[];
  onClose: () => void; onSaved: () => void;
}) {
  type Tab = "items" | "info";
  const [tab, setTab] = useState<Tab>("items");

  const [items, setItems] = useState<EditItem[]>(() => (comanda.items || []).map((it: any) => ({ ...it })));
  const [discount, setDiscount]         = useState(String(comanda.discount || 0));
  const [discountType, setDiscountType] = useState<"value" | "percentage">(comanda.discountType || "value");
  const [clientId, setClientId]         = useState(comanda.clientId || "");
  const [clientSearch, setClientSearch] = useState(comanda.client?.name || "");
  const [clientResults, setClientResults] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(comanda.client || null);
  const [professionalId, setProfessionalId] = useState(comanda.professionalId || "");
  const [description, setDescription]   = useState(comanda.description || "");
  const [catalogOpen, setCatalogOpen]   = useState(false);
  const [catalogTab, setCatalogTab]     = useState<"services" | "products">("services");
  const [panelSearch, setPanelSearch]   = useState("");
  const [saving, setSaving]             = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!clientSearch.trim() || clientId) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch(`/api/clients/search?name=${encodeURIComponent(clientSearch)}`);
        setClientResults(await r.json().then((d: any) => Array.isArray(d) ? d : []));
      } catch { setClientResults([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [clientSearch, clientId]);

  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  const d        = parseFloat(discount) || 0;
  const total    = Math.max(0, discountType === "percentage" ? subtotal * (1 - d / 100) : subtotal - d);

  const filteredServices = useMemo(() => {
    const q = panelSearch.toLowerCase();
    return {
      singles: services.filter((s: any) => s.type !== "package" && (!q || s.name.toLowerCase().includes(q))),
      pkgs:    services.filter((s: any) => s.type === "package"  && (!q || s.name.toLowerCase().includes(q))),
    };
  }, [services, panelSearch]);

  const filteredProducts = useMemo(() =>
    products.filter((p: any) => p.isForSale && (!panelSearch || p.name.toLowerCase().includes(panelSearch.toLowerCase()))),
    [products, panelSearch]
  );

  const addItem = (item: Omit<EditItem, "id">) => {
    const existing = items.find(i =>
      (item.productId && i.productId === item.productId) ||
      (item.serviceId && i.serviceId === item.serviceId && !item.packageId && !i.packageId)
    );
    if (existing) setItems(prev => prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
    else setItems(prev => [...prev, { ...item, id: `new-${Date.now()}-${Math.random()}` }]);
  };

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

  const removeItem    = (id: string)        => setItems(prev => prev.filter(i => i.id !== id));
  const removePackage = (pkgId: string)     => setItems(prev => prev.filter(i => i.packageId !== pkgId));
  const changeQty     = (id: string, d: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + d) } : i));
  const changePrice   = (id: string, v: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, price: v } : i));

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

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/comandas/${comanda.id}/items`, {
        method: "PUT",
        body: JSON.stringify({ items: items.filter(i => i.name), discount: d, discountType, total }),
      });
      const patch: any = {};
      if (clientId && clientId !== comanda.clientId) patch.clientId = clientId;
      if (professionalId !== (comanda.professionalId || "")) patch.professionalId = professionalId || null;
      if (description !== (comanda.description || "")) patch.description = description;
      if (Object.keys(patch).length > 0) {
        await apiFetch(`/api/comandas/${comanda.id}`, { method: "PUT", body: JSON.stringify(patch) });
      }
      toast.success("Comanda salva!");
      onSaved(); onClose();
    } catch { toast.error("Erro ao salvar comanda."); }
    finally { setSaving(false); }
  };

  const tabOpts = [
    { value: "items", label: "Itens" },
    { value: "info",  label: "Dados" },
  ];

  return (
    <Modal
      isOpen={!!comanda}
      onClose={onClose}
      title={`Editar Comanda #${comanda.id?.slice(-6).toUpperCase()}`}
      size="lg"
      footer={
        <ModalFooter>
          <div className="flex-1">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total</p>
            <p className="text-xl font-black text-zinc-900">{fmtBRL(total)}</p>
          </div>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Salvar</Button>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-1">
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineSegmented value={tab} onChange={v => setTab(v as Tab)} options={tabOpts} />
          </FilterLineSection>
        </FilterLine>

        {tab === "items" && (
          <div className="space-y-3">
            {/* Items list */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.length === 0 && (
                <div className="flex flex-col items-center py-10 text-zinc-400">
                  <Package size={28} className="mb-2 opacity-20" />
                  <p className="text-xs font-bold">Nenhum item</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {groupedItems.map(group => (
                  <div key={group.packageId || "singles"}>
                    {group.packageId && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 bg-violet-50 rounded-xl border border-violet-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                          <span className="text-[10px] font-black text-violet-700 uppercase tracking-widest">
                            Pacote: {group.packageName}
                          </span>
                          <span className="text-[9px] text-violet-400 font-bold">{group.items.length} serviços</span>
                        </div>
                        <IconButton variant="ghost" size="xs" onClick={() => removePackage(group.packageId!)} className="text-violet-300 hover:text-red-500">
                          <Trash2 size={11} />
                        </IconButton>
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
                          "flex items-center gap-2 p-2.5 rounded-xl border mb-1",
                          group.packageId ? "bg-violet-50/40 border-violet-100 ml-2" :
                          item.productId  ? "bg-emerald-50/30 border-emerald-100" :
                          "bg-zinc-50 border-zinc-100"
                        )}
                      >
                        <div className={cn("p-1.5 rounded-lg shrink-0", item.productId ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600")}>
                          {item.productId ? <Package size={12} /> : <Scissors size={12} />}
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
                          <IconButton variant="outline" size="xs" onClick={() => changeQty(item.id, -1)}><Minus size={10} /></IconButton>
                          <span className="w-5 text-center text-xs font-black text-zinc-900">{item.quantity}</span>
                          <IconButton variant="outline" size="xs" onClick={() => changeQty(item.id, 1)}><Plus size={10} /></IconButton>
                        </div>
                        <IconButton variant="ghost" size="xs" onClick={() => removeItem(item.id)} className="text-zinc-300 hover:text-red-500 hover:bg-red-50 shrink-0">
                          <Trash2 size={12} />
                        </IconButton>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </AnimatePresence>
            </div>

            <Button variant="outline" size="sm" fullWidth iconLeft={<Plus size={14} />}
              onClick={() => setCatalogOpen(true)} className="border-amber-200 text-amber-700 hover:bg-amber-50">
              Adicionar Serviço / Produto / Pacote
            </Button>

            {/* Discount */}
            <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest shrink-0">Desconto</span>
              <div className="flex gap-1 ml-auto items-center">
                {(["value", "percentage"] as const).map(t => (
                  <button key={t} onClick={() => setDiscountType(t)}
                    className={cn("px-2 py-1 rounded-lg text-[10px] font-black border transition-all",
                      discountType === t ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200"
                    )}>
                    {t === "value" ? "R$" : "%"}
                  </button>
                ))}
                <div className="relative w-20">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-bold pointer-events-none">
                    {discountType === "percentage" ? "%" : "R$"}
                  </span>
                  <input type="number" step="0.01" min={0}
                    className="w-full text-[11px] pl-6 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg font-bold outline-none focus:border-amber-400"
                    value={discount} onChange={e => setDiscount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "info" && (
          <div className="space-y-4">
            {/* Client transfer */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <ArrowRightLeft size={11} /> Transferir para outro cliente
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input type="text" placeholder="Buscar cliente..." value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setClientId(""); setSelectedClient(null); }}
                  className="w-full pl-9 pr-3 py-3 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 font-bold"
                />
                {clientResults.length > 0 && !clientId && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 mt-1 max-h-40 overflow-y-auto">
                    {clientResults.map((c: any) => (
                      <button key={c.id} onMouseDown={() => { setClientId(c.id); setClientSearch(c.name); setSelectedClient(c); setClientResults([]); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 transition-all border-b border-zinc-50 last:border-0">
                        <p className="font-bold text-zinc-900">{c.name}</p>
                        <p className="text-zinc-400 text-[10px]">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {clientId && clientId !== comanda.clientId && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <CheckCircle size={13} className="text-amber-500 shrink-0" />
                  <p className="text-xs font-bold text-amber-800">Comanda será transferida para <strong>{selectedClient?.name}</strong></p>
                </div>
              )}
            </div>

            {/* Professional */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                <Scissors size={11} /> Profissional
              </label>
              <Combobox
                options={[
                  { value: "", label: "Nenhum" },
                  ...professionals.map((p: any) => ({ value: p.id, label: p.name, subtitle: p.role || undefined })),
                ]}
                value={professionalId}
                onChange={v => setProfessionalId(v as string)}
                placeholder="Selecionar profissional..."
                searchPlaceholder="Buscar profissional..."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observações</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Observações da comanda..."
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 resize-none font-medium"
              />
            </div>

            {/* Summary */}
            <ContentCard>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resumo</p>
                <div className="flex justify-between text-xs font-bold text-zinc-600"><span>Itens</span><span>{items.length}</span></div>
                <div className="flex justify-between text-xs font-bold text-zinc-600"><span>Subtotal</span><span>{fmtBRL(subtotal)}</span></div>
                <div className="flex justify-between text-sm font-black text-zinc-900 pt-1 border-t border-zinc-200"><span>Total</span><span>{fmtBRL(total)}</span></div>
              </div>
            </ContentCard>
          </div>
        )}
      </div>

      {/* Catalog Bottom-Sheet */}
      <AnimatePresence>
        {catalogOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[70]"
            onClick={() => setCatalogOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] max-h-[80vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-zinc-200 rounded-full" />
              </div>
              <div className="flex border-b border-zinc-100 shrink-0 px-4">
                {[
                  { key: "services", label: "Serviços / Pacotes", icon: <Scissors size={12} />, color: "violet" },
                  { key: "products", label: "Produtos",           icon: <Package size={12} />,  color: "emerald" },
                ].map(t => (
                  <button key={t.key}
                    onClick={() => { setCatalogTab(t.key as any); setPanelSearch(""); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                      catalogTab === t.key
                        ? t.key === "services" ? "border-violet-500 text-violet-700 bg-violet-50/50" : "border-emerald-500 text-emerald-700 bg-emerald-50/50"
                        : "border-transparent text-zinc-400"
                    )}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div className="px-4 py-2.5 border-b border-zinc-100 shrink-0">
                <div className="relative">
                  <ShoppingBag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" autoFocus placeholder="Buscar..."
                    value={panelSearch} onChange={e => setPanelSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
                {catalogTab === "services" && (
                  <>
                    {filteredServices.pkgs.length > 0 && (
                      <>
                        <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest px-1 pt-1 pb-1 flex items-center gap-1">
                          <Layers size={10} className="text-violet-400" /> Pacotes
                        </p>
                        {filteredServices.pkgs.map((pkg: any) => {
                          const inComanda = items.some(i => i.packageId === pkg.id);
                          return (
                            <button key={pkg.id} onClick={() => addPackage(pkg)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-violet-300 hover:bg-violet-50/40 transition-all text-left">
                              <div className="p-2 rounded-xl bg-violet-100 text-violet-700 shrink-0"><Layers size={14} /></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-black text-zinc-900 truncate">{pkg.name}</p>
                                  <span className="text-[7px] font-black bg-violet-100 text-violet-600 px-1 py-0.5 rounded shrink-0">PACOTE</span>
                                </div>
                                <p className="text-[10px] text-violet-600 font-black mt-0.5">{fmtBRL(Number(pkg.price))}</p>
                              </div>
                              {inComanda ? <span className="text-[9px] font-black bg-violet-100 text-violet-700 px-2 py-1 rounded-lg shrink-0">✓</span>
                                         : <Plus size={16} className="text-zinc-300 shrink-0" />}
                            </button>
                          );
                        })}
                        {filteredServices.singles.length > 0 && (
                          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest px-1 pt-3 pb-1">Serviços</p>
                        )}
                      </>
                    )}
                    {filteredServices.singles.map((s: any) => {
                      const qty = items.find(i => i.serviceId === s.id && !i.packageId)?.quantity || 0;
                      return (
                        <button key={s.id} onClick={() => addItem({ name: s.name, price: Number(s.price), quantity: 1, productId: null, serviceId: s.id })}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-100 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left">
                          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0"><Scissors size={14} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-800 truncate">{s.name}</p>
                            <p className="text-[10px] text-amber-600 font-black">{fmtBRL(Number(s.price))}</p>
                          </div>
                          {qty > 0 ? <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-lg shrink-0">{qty}x</span>
                                   : <Plus size={16} className="text-zinc-300 shrink-0" />}
                        </button>
                      );
                    })}
                    {filteredServices.singles.length === 0 && filteredServices.pkgs.length === 0 && (
                      <p className="text-[10px] text-zinc-400 text-center py-8 font-bold">Nenhum serviço encontrado</p>
                    )}
                  </>
                )}
                {catalogTab === "products" && (
                  filteredProducts.length === 0
                    ? <p className="text-[10px] text-zinc-400 text-center py-8 font-bold">Nenhum produto no PDV</p>
                    : filteredProducts.map((p: any) => {
                        const qty = items.find(i => i.productId === p.id)?.quantity || 0;
                        const noStock = p.stock <= 0;
                        return (
                          <button key={p.id} disabled={noStock}
                            onClick={() => !noStock && addItem({ name: p.name, price: Number(p.salePrice), quantity: 1, productId: p.id, serviceId: null })}
                            className={cn("w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                              noStock ? "border-zinc-100 opacity-40 cursor-not-allowed" : "border-zinc-100 hover:border-emerald-300 hover:bg-emerald-50/40"
                            )}>
                            <div className={cn("p-2 rounded-xl shrink-0", noStock ? "bg-zinc-100 text-zinc-400" : "bg-emerald-50 text-emerald-600")}><Package size={14} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-800 truncate">{p.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[10px] text-emerald-600 font-black">{fmtBRL(Number(p.salePrice))}</p>
                                <span className={cn("text-[8px] font-black px-1 py-0.5 rounded",
                                  noStock ? "bg-red-50 text-red-500" : p.stock <= (p.minStock || 0) ? "bg-amber-50 text-amber-600" : "bg-zinc-100 text-zinc-500"
                                )}>
                                  {noStock ? "Sem estoque" : `Est: ${p.stock}`}
                                </span>
                              </div>
                            </div>
                            {qty > 0 ? <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg shrink-0">{qty}x</span>
                                     : !noStock ? <Plus size={16} className="text-zinc-300 shrink-0" /> : null}
                          </button>
                        );
                      })
                )}
              </div>
              <div className="px-4 py-3 border-t border-zinc-100 shrink-0">
                <Button variant="primary" size="sm" fullWidth onClick={() => setCatalogOpen(false)}>
                  Fechar ({items.length} {items.length === 1 ? "item" : "itens"})
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

// ─── ComandasTab ──────────────────────────────────────────────────────────────

export function ComandasTab({
  comandas, products, services, professionals,
  setIsComandaModalOpen,
  selectedComanda, setSelectedComanda,
  isComandaDetailOpen, setIsComandaDetailOpen,
  handlePayComanda, handleDeleteComanda,
  fetchComandas,
}: ComandasTabProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "paid">("all");
  const [search,        setSearch]      = useState("");
  const [editingComanda, setEditingComanda] = useState<any | null>(null);
  const [detailComanda,  setDetailComanda]  = useState<any | null>(null);

  const openCount = comandas.filter(c => c.status === "open").length;
  const partialCount = comandas.filter(c => c.status === "partial").length;
  const paidCount = comandas.filter(c => c.status === "paid").length;
  const totalOpen = comandas.filter(c => c.status === "open" || c.status === "partial").reduce((a, c) => a + Math.max(0, Number(c.total) - Number(c.paidAmount || 0)), 0);
  const totalPaid = comandas.filter(c => c.status === "paid").reduce((a, c) => a + Number(c.total), 0);
  const multiSessions = comandas.filter(c => Number(c.sessionCount) > 1).length;

  const filtered = useMemo(() => {
    let list = comandas;
    if (statusFilter === "open") list = list.filter(c => c.status === "open" || c.status === "partial");
    if (statusFilter === "paid") list = list.filter(c => c.status === "paid");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.client?.name?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.items?.some((it: any) => it.name?.toLowerCase().includes(q)) ||
        c.packages?.some((pkg: any) => pkg.packageName?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [comandas, statusFilter, search]);

  const { page, pageSize, paginatedData, setPage, setPageSize } = usePagination(filtered, 15);

  const statusOpts = [
    { value: "all",  label: `Todos (${comandas.length})` },
    { value: "open", label: `Aberto (${openCount + partialCount})` },
    { value: "paid", label: `Pagas (${paidCount})` },
  ];

  const columns: Column<any>[] = [
    {
      header: "Cliente",
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
            c.status === "open" ? "bg-amber-50 border border-amber-200 text-amber-600" :
            c.status === "partial" ? "bg-blue-50 border border-blue-200 text-blue-600" :
            "bg-emerald-50 border border-emerald-200 text-emerald-600"
          )}>
            {c.client?.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-xs font-black text-zinc-900 whitespace-nowrap">{c.client?.name || "—"}</p>
            <p className="text-[10px] text-zinc-400">{c.client?.phone || ""}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Itens / Pacote",
      className: "max-w-[220px]",
      hideOnMobile: true,
      render: (c) => <PackageSummary comanda={c} />,
    },
    {
      header: "Sessões",
      hideOnMobile: true,
      render: (c) => <SessionsBadge comanda={c} />,
    },
    {
      header: "Data",
      hideOnMobile: true,
      render: (c) => <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">{fmtDateShort(c.createdAt)}</span>,
    },
    {
      header: "Total",
      render: (c) => {
        const paid = Number(c.paidAmount || 0);
        const tot = Number(c.total);
        const rem = Math.max(0, tot - paid);
        return (
          <div>
            <span className="text-sm font-black text-zinc-900 whitespace-nowrap">{fmtBRL(tot)}</span>
            {Number(c.discount) > 0 && (
              <p className="text-[9px] text-emerald-600 font-bold">
                -{c.discountType === "percentage" ? `${c.discount}%` : fmtBRL(Number(c.discount))}
              </p>
            )}
            {paid > 0 && c.status !== "paid" && (
              <p className="text-[9px] text-amber-600 font-black mt-0.5">
                Restante: {fmtBRL(rem)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: "Pgto",
      hideOnMobile: true,
      render: (c) => c.status === "paid" && c.paymentMethod
        ? <PaymentBadge method={c.paymentMethod} />
        : <span className="text-[10px] text-zinc-300">—</span>,
    },
    {
      header: "Status",
      render: (c) => (
        <Badge color={c.status === "open" ? "warning" : c.status === "partial" ? "info" : "success"}>
          {c.status === "open" ? "Em Aberto" : c.status === "partial" ? "Parcial" : "Pago"}
        </Badge>
      ),
    },
    {
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {(c.status === "open" || c.status === "partial") && (
            <Button variant="primary" size="xs" iconLeft={<CheckCircle size={11} />} onClick={() => handlePayComanda(c)}>
              {c.status === "partial" ? "Pagar Resto" : "Pagar"}
            </Button>
          )}
          <ActionMenu
            comanda={c}
            onPay={() => handlePayComanda(c)}
            onEdit={() => setEditingComanda(c)}
            onView={() => setDetailComanda(c)}
            onDelete={() => handleDeleteComanda(c.id, c.client?.name || "esta comanda")}
          />
        </div>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <PageWrapper>
      <SectionTitle
        title="Comandas"
        description="Controle de serviços, pacotes e sessões"
        icon={Receipt}
        action={<Button iconLeft={<Plus size={14} />} onClick={() => setIsComandaModalOpen(true)}>Nova Comanda</Button>}
        divider
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard title="Em Aberto"   value={openCount + partialCount}  icon={Receipt}     color="warning" description={fmtBRL(totalOpen)} />
        <StatCard title="A Receber"   value={fmtBRL(totalOpen)} icon={DollarSign}  color="danger"  description={`${openCount + partialCount} pendentes${partialCount > 0 ? ` (${partialCount} parcial)` : ""}`} />
        <StatCard title="Pagas"       value={paidCount}         icon={CheckCircle} color="success" description={fmtBRL(totalPaid)} className="hidden sm:block" />
        <StatCard title="Multi-sessão" value={multiSessions}    icon={Layers}      color="default" description="Pacotes parcelados" className="hidden sm:block" />
      </div>

      {/* Filters */}
      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar por cliente, item, pacote..." />
          </FilterLineItem>
          <FilterLineItem>
            <FilterLineSegmented value={statusFilter} onChange={v => { setStatusFilter(v as any); setPage(1); }} options={statusOpts} size="sm" />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right" wrap={false}>
          <Button iconLeft={<Plus size={14} />} onClick={() => setIsComandaModalOpen(true)}>
            <span className="hidden sm:inline">Nova Comanda</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </FilterLineSection>
      </FilterLine>

      {/* Table */}
      <ContentCard padding="none">
        <GridTable
          data={paginatedData}
          columns={columns}
          keyExtractor={c => c.id}
          noDesktopCard
          onRowClick={c => setDetailComanda(c)}
          getMobileBorderClass={c => c.status === "open" ? "border-amber-200" : c.status === "partial" ? "border-blue-200" : "border-zinc-200"}
          emptyMessage={
            <EmptyState
              icon={Receipt}
              title="Nenhuma comanda encontrada"
              description={search ? "Tente ajustar o filtro." : "Crie a primeira comanda."}
              action={!search ? <Button iconLeft={<Plus size={14} />} onClick={() => setIsComandaModalOpen(true)} size="sm">Nova Comanda</Button> : undefined}
              className="m-4"
            />
          }
          renderMobileAvatar={c => (
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0",
              c.status === "open" ? "bg-amber-50 text-amber-600 border border-amber-200" :
              c.status === "partial" ? "bg-blue-50 text-blue-600 border border-blue-200" :
              "bg-emerald-50 text-emerald-600 border border-emerald-200"
            )}>
              {c.client?.name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          renderMobileItem={c => {
            const tot  = Number(c.total);
            const paid = Number(c.paidAmount || 0);
            const rem  = Math.max(0, tot - paid);
            return (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-black text-zinc-900 truncate">{c.client?.name || "Sem cliente"}</p>
                    <Badge
                      color={c.status === "paid" ? "success" : c.status === "partial" ? "info" : "warning"}
                      size="sm"
                    >
                      {c.status === "paid" ? "Pago" : c.status === "partial" ? "Parcial" : "Aberto"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                      <Clock size={9} /> {fmtDate(c.createdAt)}
                    </span>
                    {Number(c.sessionCount) > 1 && (
                      <span className="text-[10px] text-violet-600 font-black flex items-center gap-1">
                        <Layers size={9} /> {Number(c.sessionsCompleted || 0)}/{Number(c.sessionCount)}
                      </span>
                    )}
                    {(c.packages?.length || 0) > 0 && (
                      <span className="text-[10px] text-violet-600 font-bold truncate max-w-[100px]">
                        {c.packages[0].packageName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={cn("text-base font-black",
                    c.status === "paid" ? "text-emerald-600" :
                    c.status === "partial" ? "text-blue-700" : "text-zinc-900"
                  )}>
                    {fmtBRL(tot)}
                  </span>
                  {paid > 0 && c.status !== "paid" && (
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-100 mt-0.5">
                      Resta: {fmtBRL(rem)}
                    </span>
                  )}
                </div>
              </div>
            );
          }}
          renderMobileExpandedContent={c => {
            const tot  = Number(c.total);
            const paid = Number(c.paidAmount || 0);
            const rem  = Math.max(0, tot - paid);
            const pct  = tot > 0 ? Math.min(100, Math.round((paid / tot) * 100)) : 0;
            return (
              <div className="px-4 pb-4 pt-2 space-y-3">
                {/* Barra de progresso de pagamento */}
                {paid > 0 && c.status !== "paid" && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black">
                      <span className="text-emerald-600">Pago: {fmtBRL(paid)}</span>
                      <span className="text-amber-600">Resta: {fmtBRL(rem)}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {/* Pacotes */}
                {c.packages?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.packages.map((pkg: any) => (
                      <span key={pkg.packageId} className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-violet-50 border border-violet-100 text-violet-700">
                        <Layers size={8} /> {pkg.packageName} · {pkg.count}svc
                      </span>
                    ))}
                  </div>
                )}

                {/* Itens */}
                {(c.items?.length || 0) > 0 && (
                  <div className="space-y-1.5 bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
                    {c.items.filter((it: any) => !it.packageId).slice(0, 5).map((it: any, i: number) => (
                      <div key={it.id || i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={cn("p-1 rounded-md shrink-0", it.productId ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500")}>
                            {it.productId ? <Package size={9} /> : <Scissors size={9} />}
                          </div>
                          <span className="text-xs font-bold text-zinc-700 truncate">{it.name}</span>
                          <span className="text-[9px] text-zinc-400 font-bold shrink-0">{it.quantity}x</span>
                        </div>
                        <span className="text-xs font-black text-zinc-800 shrink-0 ml-2">
                          {fmtBRL(Number(it.total || it.price * it.quantity))}
                        </span>
                      </div>
                    ))}
                    {Number(c.discount) > 0 && (
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-200">
                        <span className="font-bold text-emerald-600 flex items-center gap-1"><Zap size={9} /> Desconto</span>
                        <span className="font-black text-emerald-600">
                          -{c.discountType === "percentage" ? `${c.discount}%` : fmtBRL(Number(c.discount))}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Forma de pagamento */}
                {c.status === "paid" && c.paymentMethod && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pgto:</span>
                    <PaymentBadge method={c.paymentMethod} />
                  </div>
                )}

                {/* Sessões mobile */}
                {Number(c.sessionCount) > 1 && (
                  <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-xl border border-violet-100">
                    <Layers size={11} className="text-violet-500 shrink-0" />
                    <span className="text-[10px] font-black text-violet-700">
                      Sessões: {Number(c.sessionsCompleted || 0)}/{Number(c.sessionCount)}
                    </span>
                    <div className="flex-1 h-1.5 bg-violet-100 rounded-full overflow-hidden ml-1">
                      <div className="h-full bg-violet-500 rounded-full"
                        style={{ width: `${Math.round((Number(c.sessionsCompleted || 0) / Number(c.sessionCount)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(c.status === "open" || c.status === "partial") && (
                    <Button variant="primary" size="sm" fullWidth iconLeft={<CheckCircle size={13} />}
                      onClick={e => { e.stopPropagation(); handlePayComanda(c); }}>
                      {c.status === "partial" ? `Pagar ${fmtBRL(rem)}` : `Pagar ${fmtBRL(tot)}`}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" fullWidth iconLeft={<Eye size={12} />}
                    onClick={e => { e.stopPropagation(); setDetailComanda(c); }}>
                    Detalhes
                  </Button>
                  <Button variant="outline" size="sm" fullWidth iconLeft={<Edit2 size={12} />}
                    onClick={e => { e.stopPropagation(); setEditingComanda(c); }}>
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" fullWidth iconLeft={<Trash2 size={12} />}
                    onClick={e => { e.stopPropagation(); handleDeleteComanda(c.id, c.client?.name || "esta comanda"); }}
                    className="text-red-400 hover:bg-red-50 hover:text-red-600">
                    Excluir
                  </Button>
                </div>
              </div>
            );
          }}
          pagination={{
            total: filtered.length,
            page,
            pageSize,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {filtered.length} comanda{filtered.length !== 1 ? "s" : ""}{search && ` · filtrado de ${comandas.length}`}
            </p>
            <p className="text-xs font-black text-zinc-600">
              {statusFilter === "all" ? `A receber: ${fmtBRL(totalOpen)}` : statusFilter === "paid" ? `Recebido: ${fmtBRL(totalPaid)}` : `A receber: ${fmtBRL(totalOpen)}`}
            </p>
          </div>
        )}
      </ContentCard>

      {/* FAB mobile */}
      <button
        onClick={() => setIsComandaModalOpen(true)}
        className="sm:hidden fixed bottom-24 right-4 z-50 w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-xl shadow-amber-500/30 flex items-center justify-center transition-all active:scale-90"
      >
        <Plus size={24} />
      </button>

      {/* Detail Drawer */}
      <DetailModal
        comanda={detailComanda}
        onClose={() => setDetailComanda(null)}
        onPay={async (method, details) => {
          const c = detailComanda;
          if (!c) return;
          const isPartial = details?.isPartial === true;
          if (isPartial) {
            const res = await apiFetch(`/api/comandas/${c.id}/partial-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount: details.totalPaying, paymentMethod: method, paymentDetails: details }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || "Erro ao registrar pagamento parcial."); }
          } else {
            const totalToPay = Number(c.total) || 0;
            const res = await apiFetch(`/api/comandas/${c.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "paid", paymentMethod: method, paymentDetails: details, paidAmount: totalToPay }),
            });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || "Erro ao confirmar pagamento."); }
          }
        }}
        onEdit={() => { setEditingComanda(detailComanda); setDetailComanda(null); }}
        fetchComandas={fetchComandas}
        products={products}
        services={services}
      />

      {/* Edit Modal */}
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
    </PageWrapper>
  );
}
