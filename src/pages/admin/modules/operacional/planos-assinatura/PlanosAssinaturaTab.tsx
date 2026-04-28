import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit2, Trash2, Users, CreditCard, Crown,
  CheckCircle, XCircle, Clock, RefreshCw, Copy,
  TrendingUp, Calendar, ChevronRight, AlertCircle,
  ArrowLeft, Repeat, Star, Check, X, DollarSign, Link,
} from "lucide-react";
import {
  PageWrapper, SectionTitle, StatCard, ContentCard,
  Button, IconButton, Badge, Modal, EmptyState,
  FilterLine, FilterLineSection, FilterLineSearch, FilterLineSegmented,
  GridTable, usePagination, Pagination, useToast,
} from "@/src/components/ui";
import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/App";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingCycle: string;
  creditsPerCycle: number;
  includedServices?: string;
  cancelRules?: string;
  status: string;
  subscribers?: number;
  activeSubscribers?: number;
}

interface Subscription {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  membershipPlanId: string;
  planName: string;
  planPrice: number;
  billingCycle: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextChargeDate?: string;
  currentCredit?: { totalCredits: number; usedCredits: number; cycleEnd: string } | null;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
function cycleLabel(c: string) {
  const map: Record<string, string> = { monthly: "Mensal", quarterly: "Trimestral", yearly: "Anual", weekly: "Semanal" };
  return map[c] || c;
}
function statusColor(s: string): "success" | "warning" | "danger" | "default" | "primary" {
  if (s === "active") return "success";
  if (s === "pending") return "warning";
  if (s === "cancelled") return "danger";
  if (s === "paused") return "default";
  return "default";
}
function statusLabel(s: string) {
  const map: Record<string, string> = { active: "Ativo", pending: "Pendente", cancelled: "Cancelado", paused: "Pausado" };
  return map[s] || s;
}
function parseIncluded(raw?: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map(s => s.trim()).filter(Boolean); }
}

// ─── Modal Plano ─────────────────────────────────────────────────────────────

function PlanModal({ plan, onClose, onSaved }: { plan: MembershipPlan | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    price: plan?.price?.toString() || "",
    billingCycle: plan?.billingCycle || "monthly",
    creditsPerCycle: plan?.creditsPerCycle?.toString() || "1",
    includedServices: parseIncluded(plan?.includedServices).join(", "),
    cancelRules: plan?.cancelRules || "",
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.price) { toast.warning("Nome e valor são obrigatórios."); return; }
    setLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description || null,
        price: parseFloat(form.price.replace(",", ".")),
        billingCycle: form.billingCycle,
        creditsPerCycle: parseInt(form.creditsPerCycle) || 1,
        includedServices: form.includedServices ? form.includedServices.split(",").map(s => s.trim()).filter(Boolean) : [],
        cancelRules: form.cancelRules || null,
        status: plan?.status || "active",
      };
      const url = plan ? `/api/memberships/plans/${plan.id}` : "/api/memberships/plans";
      const method = plan ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(plan ? "Plano atualizado!" : "Plano criado!");
      onSaved();
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={plan ? "Editar Plano" : "Novo Plano de Assinatura"} size="md">
      <div className="space-y-4 p-1">
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Nome do Plano *</label>
          <input className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="Ex: Corte Mensal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Descrição</label>
          <textarea className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none" rows={2} placeholder="Descreva o que está incluído..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Valor *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">R$</span>
              <input className="w-full border border-zinc-200 rounded-xl pl-8 pr-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="0,00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} inputMode="decimal" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Periodicidade</label>
            <select className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-white" value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
              <option value="yearly">Anual</option>
              <option value="weekly">Semanal</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Créditos por ciclo</label>
          <input className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="Ex: 4" value={form.creditsPerCycle} onChange={e => setForm(f => ({ ...f, creditsPerCycle: e.target.value }))} inputMode="numeric" />
          <p className="text-[10px] text-zinc-400 mt-1">Quantos serviços o cliente pode usar por ciclo (separados por vírgula se diferentes).</p>
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Serviços incluídos</label>
          <input className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="Ex: 1 corte masculino, 1 barba" value={form.includedServices} onChange={e => setForm(f => ({ ...f, includedServices: e.target.value }))} />
          <p className="text-[10px] text-zinc-400 mt-1">Separe com vírgula. Aparece na descrição pública do plano.</p>
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Regras de cancelamento</label>
          <textarea className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none" rows={2} placeholder="Ex: Cancele com 5 dias de antecedência..." value={form.cancelRules} onChange={e => setForm(f => ({ ...f, cancelRules: e.target.value }))} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-10 font-black text-xs">Cancelar</Button>
          <Button onClick={save} loading={loading} className="flex-1 h-10 font-black text-xs bg-amber-500 hover:bg-amber-600 text-white">Salvar Plano</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal Nova Assinatura ────────────────────────────────────────────────────

function NewSubscriptionModal({ plans, onClose, onSaved }: { plans: MembershipPlan[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [clientSearch, setClientSearch] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [paidNow, setPaidNow] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientSearch.length < 2) { setClients([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=8`);
        const d = await r.json();
        setClients(d.data || d || []);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  const save = async () => {
    if (!selectedClient) { toast.warning("Selecione um cliente."); return; }
    if (!planId) { toast.warning("Selecione um plano."); return; }
    setLoading(true);
    try {
      const res = await apiFetch("/api/memberships/subscriptions", {
        method: "POST",
        body: JSON.stringify({ clientId: selectedClient.id, membershipPlanId: planId, paidNow, notes: notes || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success("Assinatura criada!");
      onSaved();
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Nova Assinatura" size="sm">
      <div className="space-y-4 p-1">
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Cliente *</label>
          {selectedClient ? (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <Users size={12} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-zinc-900 truncate">{selectedClient.name}</p>
                <p className="text-[10px] text-zinc-500">{selectedClient.phone}</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-zinc-400 hover:text-red-500 transition-colors"><X size={14} /></button>
            </div>
          ) : (
            <div className="relative">
              <input className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="Buscar cliente por nome..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
              {clients.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {clients.map((c: any) => (
                    <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(""); setClients([]); }} className="w-full text-left px-3 py-2 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0">
                      <p className="text-xs font-black text-zinc-900">{c.name}</p>
                      <p className="text-[10px] text-zinc-400">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Plano *</label>
          <select className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-white" value={planId} onChange={e => setPlanId(e.target.value)}>
            {plans.filter(p => p.status === "active").map(p => (
              <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}/{cycleLabel(p.billingCycle)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
          <button type="button" onClick={() => setPaidNow(v => !v)} className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${paidNow ? "bg-emerald-500" : "bg-zinc-300"}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${paidNow ? "translate-x-4" : "translate-x-0"}`} />
          </button>
          <div>
            <p className="text-xs font-black text-zinc-900">Pagou agora</p>
            <p className="text-[10px] text-zinc-500">{paidNow ? "Assinatura ativada e créditos liberados imediatamente" : "Fica como Pendente até o pagamento"}</p>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Observações</label>
          <input className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="Opcional..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-10 font-black text-xs">Cancelar</Button>
          <Button onClick={save} loading={loading} className="flex-1 h-10 font-black text-xs bg-emerald-500 hover:bg-emerald-600 text-white">Criar Assinatura</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modal Detalhe da Assinatura ──────────────────────────────────────────────

function SubscriptionDetailModal({ sub, onClose, onRefresh }: { sub: Subscription; onClose: () => void; onRefresh: () => void }) {
  const toast = useToast();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payMethod, setPayMethod] = useState("dinheiro");

  useEffect(() => {
    apiFetch(`/api/memberships/subscriptions/${sub.id}`)
      .then(r => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [sub.id]);

  const changeStatus = async (status: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/memberships/subscriptions/${sub.id}/status`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(`Assinatura ${statusLabel(status).toLowerCase()}.`);
      onRefresh();
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setActionLoading(false); }
  };

  const registerPayment = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/memberships/subscriptions/${sub.id}/payment`, {
        method: "POST", body: JSON.stringify({ method: payMethod }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Pagamento registrado e créditos renovados!");
      setShowPayment(false);
      onRefresh();
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setActionLoading(false); }
  };

  const credit = detail?.credits?.[0];
  const remaining = credit ? Number(credit.totalCredits) - Number(credit.usedCredits) : 0;

  return (
    <Modal isOpen onClose={onClose} title="Detalhes da Assinatura" size="md">
      {loading ? (
        <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : detail ? (
        <div className="space-y-4 p-1">
          {/* Cliente + Plano */}
          <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <Crown size={16} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-zinc-900">{detail.clientName}</p>
              <p className="text-xs text-zinc-500">{detail.planName} · {fmt(detail.planPrice)}/{cycleLabel(detail.billingCycle)}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={statusColor(detail.status)} className="text-[9px]">{statusLabel(detail.status)}</Badge>
              </div>
            </div>
          </div>

          {/* Créditos */}
          {credit && (
            <div className="p-3 bg-white border border-zinc-200 rounded-xl">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Créditos do Ciclo Atual</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (Number(credit.usedCredits) / Number(credit.totalCredits)) * 100)}%` }} />
                </div>
                <p className="text-xs font-black text-zinc-900 whitespace-nowrap">{credit.usedCredits}/{credit.totalCredits} usados</p>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Vence: {fmtDate(credit.cycleEnd)} · <span className="font-black text-emerald-600">{remaining} restantes</span></p>
            </div>
          )}

          {/* Datas */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { l: "Início do ciclo", v: fmtDate(detail.currentPeriodStart) },
              { l: "Fim do ciclo", v: fmtDate(detail.currentPeriodEnd) },
              { l: "Próxima cobrança", v: fmtDate(detail.nextChargeDate) },
              { l: "Membro desde", v: fmtDate(detail.createdAt) },
            ].map((i, idx) => (
              <div key={idx} className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 font-bold">{i.l}</p>
                <p className="text-xs font-black text-zinc-900">{i.v}</p>
              </div>
            ))}
          </div>

          {/* Histórico pagamentos */}
          {detail.payments?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Pagamentos</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {detail.payments.slice(0, 6).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={12} className={p.status === "paid" ? "text-emerald-500" : "text-zinc-300"} />
                      <span className="text-xs font-bold text-zinc-700">{fmt(p.amount)}</span>
                      {p.method && <span className="text-[9px] text-zinc-400">{p.method}</span>}
                    </div>
                    <span className="text-[10px] text-zinc-400">{fmtDate(p.paidAt || p.dueDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          {showPayment ? (
            <div className="space-y-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-black text-zinc-900">Registrar pagamento</p>
              <select className="w-full border border-zinc-200 rounded-xl px-3 h-9 text-sm font-bold bg-white focus:outline-none" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                {["dinheiro","pix","cartão de crédito","cartão de débito","transferência"].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowPayment(false)} className="flex-1 h-9 text-xs font-black">Cancelar</Button>
                <Button onClick={registerPayment} loading={actionLoading} className="flex-1 h-9 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white">Confirmar</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {detail.status !== "active" && (
                <Button onClick={() => changeStatus("active")} loading={actionLoading} className="h-9 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white px-3">
                  <CheckCircle size={13} className="mr-1" /> Ativar
                </Button>
              )}
              {detail.status === "pending" && (
                <Button onClick={() => setShowPayment(true)} className="h-9 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white px-3">
                  <DollarSign size={13} className="mr-1" /> Registrar Pgto
                </Button>
              )}
              {detail.status === "active" && (
                <Button onClick={() => setShowPayment(true)} className="h-9 text-xs font-black bg-blue-500 hover:bg-blue-600 text-white px-3">
                  <RefreshCw size={13} className="mr-1" /> Renovar
                </Button>
              )}
              {detail.status !== "cancelled" && (
                <Button onClick={() => changeStatus("cancelled")} loading={actionLoading} variant="ghost" className="h-9 text-xs font-black text-red-500 hover:bg-red-50 px-3">
                  <XCircle size={13} className="mr-1" /> Cancelar
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <EmptyState icon={AlertCircle} title="Erro ao carregar" description="Tente novamente." />
      )}
    </Modal>
  );
}

// ─── Tab principal ────────────────────────────────────────────────────────────

export default function PlanosAssinaturaTab() {
  const { user } = useAuth();
  const toast = useToast();
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const [view, setView] = useState<"plans" | "subscriptions">("plans");
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");

  // Modais
  const [planModal, setPlanModal] = useState<MembershipPlan | null | "new">(null);
  const [newSubModal, setNewSubModal] = useState(false);
  const [detailSub, setDetailSub] = useState<Subscription | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rPlans, rSubs, rStats] = await Promise.all([
        apiFetch("/api/memberships/plans").then(r => r.json()),
        apiFetch("/api/memberships/subscriptions").then(r => r.json()),
        apiFetch("/api/memberships/stats").then(r => r.json()),
      ]);
      setPlans(Array.isArray(rPlans) ? rPlans : []);
      setSubs(Array.isArray(rSubs) ? rSubs : []);
      setStats(rStats);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deletePlan = async (id: string) => {
    if (!confirm("Desativar este plano?")) return;
    try {
      const res = await apiFetch(`/api/memberships/plans/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Plano desativado.");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const portalLink = user?.tenantSlug ? `${appUrl}/portal/${user.tenantSlug}` : null;

  const copyPortal = () => {
    if (portalLink) { navigator.clipboard.writeText(portalLink); toast.success("Link copiado!"); }
  };

  // Filtros assinaturas
  const filteredSubs = subs.filter(s => {
    const matchSearch = !search || s.clientName.toLowerCase().includes(search.toLowerCase()) || s.planName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchPlan = filterPlan === "all" || s.membershipPlanId === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  // Filtros planos
  const filteredPlans = plans.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <SectionTitle
        title="Planos de Assinatura"
        description="Crie planos recorrentes e gerencie as assinaturas dos seus clientes."
        icon={Crown}
        action={
          <div className="flex items-center gap-2">
            {portalLink && (
              <Button variant="ghost" onClick={copyPortal} className="h-9 text-xs font-black gap-1.5 text-zinc-500 hover:text-zinc-900">
                <Link size={13} /> Copiar link do portal
              </Button>
            )}
            {view === "plans" ? (
              <Button onClick={() => setPlanModal("new")} className="h-9 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                <Plus size={14} /> Novo Plano
              </Button>
            ) : (
              <Button onClick={() => setNewSubModal(true)} className="h-9 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
                <Plus size={14} /> Nova Assinatura
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard title="Assinantes ativos" value={Number(stats.totals?.active ?? 0)} icon={CheckCircle} color="success" />
          <StatCard title="Pendentes" value={Number(stats.totals?.pending ?? 0)} icon={Clock} color="warning" />
          <StatCard title="Receita mensal" value={fmt(Number(stats.totals?.mrr ?? 0))} icon={TrendingUp} color="info" />
          <StatCard title="Planos ativos" value={plans.filter(p => p.status === "active").length} icon={Crown} color="purple" />
        </div>
      )}

      {/* Link portal */}
      {portalLink && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3">
          <Link size={15} className="text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-zinc-900">Portal do cliente</p>
            <p className="text-[10px] text-zinc-500 truncate">{portalLink}</p>
          </div>
          <button onClick={copyPortal} className="shrink-0 text-[10px] font-black text-amber-700 hover:text-amber-900 flex items-center gap-1 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg transition-colors">
            <Copy size={11} /> Copiar
          </button>
        </div>
      )}

      {/* Toggle visão */}
      <FilterLine>
        <FilterLineSection>
          <FilterLineSegmented
            value={view}
            onChange={v => { setView(v as any); setSearch(""); setFilterStatus("all"); }}
            options={[
              { value: "plans", label: `Planos (${plans.length})` },
              { value: "subscriptions", label: `Assinantes (${subs.length})` },
            ]}
          />
        </FilterLineSection>
        <FilterLineSearch value={search} onChange={setSearch} placeholder={view === "plans" ? "Buscar plano..." : "Buscar cliente ou plano..."} />
        {view === "subscriptions" && (
          <>
            <FilterLineSection>
              <FilterLineSegmented
                value={filterStatus}
                onChange={v => setFilterStatus(String(v))}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "active", label: "Ativos" },
                  { value: "pending", label: "Pendentes" },
                  { value: "cancelled", label: "Cancelados" },
                ]}
              />
            </FilterLineSection>
            {plans.length > 0 && (
              <FilterLineSection>
                <select className="text-xs font-bold border border-zinc-200 rounded-lg px-2 h-8 bg-white focus:outline-none" value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
                  <option value="all">Todos os planos</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </FilterLineSection>
            )}
          </>
        )}
      </FilterLine>

      {/* ── PLANOS ── */}
      {view === "plans" && (
        loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredPlans.length === 0 ? (
          <EmptyState
            icon={Crown}
            title="Nenhum plano criado"
            description="Crie planos de assinatura para seus clientes. Defina o valor, periodicidade e os serviços incluídos."
            action={<Button onClick={() => setPlanModal("new")} className="h-9 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white gap-1.5"><Plus size={14} /> Criar primeiro plano</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map(plan => {
              const included = parseIncluded(plan.includedServices);
              const planStats = stats?.plans?.find((p: any) => p.id === plan.id);
              return (
                <ContentCard key={plan.id} className="relative flex flex-col gap-3 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${plan.status === "active" ? "bg-amber-100" : "bg-zinc-100"}`}>
                        <Crown size={16} className={plan.status === "active" ? "text-amber-600" : "text-zinc-400"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-zinc-900 truncate">{plan.name}</p>
                        <p className="text-[10px] text-zinc-400 font-bold">{cycleLabel(plan.billingCycle)}</p>
                      </div>
                    </div>
                    <Badge color={plan.status === "active" ? "success" : "default"} className="text-[9px] shrink-0">
                      {plan.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-zinc-900">{fmt(plan.price)}</span>
                    <span className="text-[10px] text-zinc-400 font-bold">/{cycleLabel(plan.billingCycle).toLowerCase()}</span>
                  </div>

                  {plan.description && <p className="text-xs text-zinc-500 leading-relaxed">{plan.description}</p>}

                  {included.length > 0 && (
                    <div className="space-y-1">
                      {included.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-600 font-medium">
                          <Check size={11} className="text-emerald-500 shrink-0" /> {s}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 bg-zinc-50 rounded-lg p-2 text-center border border-zinc-100">
                      <p className="text-sm font-black text-zinc-900">{planStats?.activeSubscribers ?? 0}</p>
                      <p className="text-[9px] text-zinc-400 font-bold">Ativos</p>
                    </div>
                    <div className="flex-1 bg-zinc-50 rounded-lg p-2 text-center border border-zinc-100">
                      <p className="text-sm font-black text-zinc-900">{plan.creditsPerCycle}</p>
                      <p className="text-[9px] text-zinc-400 font-bold">Créditos</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="ghost" onClick={() => setPlanModal(plan)} className="flex-1 h-8 text-[10px] font-black gap-1 text-zinc-600 hover:bg-zinc-100">
                      <Edit2 size={11} /> Editar
                    </Button>
                    <Button variant="ghost" onClick={() => deletePlan(plan.id)} className="h-8 w-8 text-red-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </ContentCard>
              );
            })}
          </div>
        )
      )}

      {/* ── ASSINANTES ── */}
      {view === "subscriptions" && (
        loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredSubs.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhuma assinatura encontrada"
            description="Adicione clientes aos planos de assinatura."
            action={plans.length > 0 ? <Button onClick={() => setNewSubModal(true)} className="h-9 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"><Plus size={14} /> Nova Assinatura</Button> : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filteredSubs.map(sub => {
              const credit = sub.currentCredit;
              const used = credit ? Number(credit.usedCredits) : 0;
              const total = credit ? Number(credit.totalCredits) : 0;
              const pct = total > 0 ? (used / total) * 100 : 0;
              return (
                <button key={sub.id} onClick={() => setDetailSub(sub)} className="w-full text-left">
                  <ContentCard className="flex items-center gap-3 p-3.5 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sub.status === "active" ? "bg-emerald-100" : sub.status === "pending" ? "bg-amber-100" : "bg-zinc-100"}`}>
                      <Users size={15} className={sub.status === "active" ? "text-emerald-600" : sub.status === "pending" ? "text-amber-600" : "text-zinc-400"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-black text-zinc-900">{sub.clientName}</p>
                        <Badge color={statusColor(sub.status)} className="text-[8px]">{statusLabel(sub.status)}</Badge>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium">{sub.planName} · {fmt(sub.planPrice)}/{cycleLabel(sub.billingCycle)}</p>
                      {credit && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-20 bg-zinc-100 rounded-full h-1.5">
                            <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <span className="text-[9px] text-zinc-400 font-bold">{used}/{total} créditos</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-zinc-400">vence</p>
                      <p className="text-xs font-black text-zinc-700">{fmtDate(sub.currentPeriodEnd)}</p>
                    </div>
                    <ChevronRight size={14} className="text-zinc-300 shrink-0" />
                  </ContentCard>
                </button>
              );
            })}
          </div>
        )
      )}

      {/* Modais */}
      {planModal !== null && (
        <PlanModal
          plan={planModal === "new" ? null : planModal as MembershipPlan}
          onClose={() => setPlanModal(null)}
          onSaved={load}
        />
      )}
      {newSubModal && (
        <NewSubscriptionModal plans={plans} onClose={() => setNewSubModal(false)} onSaved={load} />
      )}
      {detailSub && (
        <SubscriptionDetailModal sub={detailSub} onClose={() => setDetailSub(null)} onRefresh={load} />
      )}
    </PageWrapper>
  );
}
