import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit2, Trash2, Users, Crown,
  CheckCircle, XCircle, Clock, RefreshCw, Copy,
  TrendingUp, Check, X, DollarSign, Link, Zap,
  ChevronRight, AlertCircle, UserCheck,
} from "lucide-react";
import {
  PageWrapper, SectionTitle, StatCard,
  Button, Badge, Modal, EmptyState,
  FilterLineSearch, FilterLineSegmented,
  GridTable, usePagination, useToast, ContentCard,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
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

// ─── Componente de crédito visual ────────────────────────────────────────────

function CreditBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const remaining = total - used;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-zinc-100 rounded-full h-1.5 min-w-[40px]">
        <div
          className={`h-1.5 rounded-full transition-all ${pct >= 100 ? "bg-red-400" : pct > 60 ? "bg-amber-400" : "bg-emerald-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">{remaining}/{total}</span>
    </div>
  );
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

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <div>
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">{label}</label>
      {node}
      {hint && <p className="text-[10px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  );
  const inp = "w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-white";

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
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={plan ? "Editar Plano" : "Novo Plano de Assinatura"} size="md">
      <div className="space-y-4 p-1">
        {field("Nome do Plano *",
          <input className={inp} placeholder="Ex: Corte Mensal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        )}
        {field("Descrição",
          <textarea className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none" rows={2} placeholder="Descreva o que está incluído..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        )}
        <div className="grid grid-cols-2 gap-3">
          {field("Valor *",
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400">R$</span>
              <input className="w-full border border-zinc-200 rounded-xl pl-8 pr-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="0,00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} inputMode="decimal" />
            </div>
          )}
          {field("Periodicidade",
            <select className={inp} value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
              <option value="yearly">Anual</option>
              <option value="weekly">Semanal</option>
            </select>
          )}
        </div>
        {field("Créditos por ciclo",
          <input className={inp} placeholder="Ex: 4" value={form.creditsPerCycle} onChange={e => setForm(f => ({ ...f, creditsPerCycle: e.target.value }))} inputMode="numeric" />,
          "Quantos serviços o cliente pode usar por ciclo de pagamento."
        )}
        {field("Serviços incluídos",
          <input className={inp} placeholder="Ex: 1 corte masculino, 1 barba" value={form.includedServices} onChange={e => setForm(f => ({ ...f, includedServices: e.target.value }))} />,
          "Separe com vírgula. Aparece na descrição pública do plano."
        )}
        {field("Regras de cancelamento",
          <textarea className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none" rows={2} placeholder="Ex: Cancele com 5 dias de antecedência..." value={form.cancelRules} onChange={e => setForm(f => ({ ...f, cancelRules: e.target.value }))} />
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-10 font-black text-xs">Cancelar</Button>
          <Button onClick={save} loading={loading} className="flex-1 h-10 font-black text-xs bg-amber-500 hover:bg-amber-600 text-white">
            {plan ? "Salvar alterações" : "Criar Plano"}
          </Button>
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
  const [planId, setPlanId] = useState(plans.find(p => p.status === "active")?.id || "");
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

  const selectedPlan = plans.find(p => p.id === planId);

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
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Nova Assinatura" size="sm">
      <div className="space-y-4 p-1">
        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Cliente *</label>
          {selectedClient ? (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <Users size={13} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-zinc-900 truncate">{selectedClient.name}</p>
                <p className="text-[10px] text-zinc-500">{selectedClient.phone || selectedClient.email}</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-zinc-400 hover:text-red-500 transition-colors p-1">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                placeholder="Buscar cliente por nome ou telefone..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                autoFocus
              />
              {clients.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  {clients.map((c: any) => (
                    <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(""); setClients([]); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0 flex items-center gap-2">
                      <div className="w-7 h-7 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black text-zinc-500">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900">{c.name}</p>
                        <p className="text-[10px] text-zinc-400">{c.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Plano *</label>
          <select
            className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-white"
            value={planId}
            onChange={e => setPlanId(e.target.value)}
          >
            {plans.filter(p => p.status === "active").map(p => (
              <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}/{cycleLabel(p.billingCycle)}</option>
            ))}
          </select>
          {selectedPlan && (
            <div className="mt-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-[10px] text-zinc-500">{selectedPlan.creditsPerCycle} crédito(s) por ciclo</p>
              {parseIncluded(selectedPlan.includedServices).slice(0, 2).map((s, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px] text-zinc-600 mt-0.5">
                  <Check size={9} className="text-emerald-500" /> {s}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setPaidNow(v => !v)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${paidNow ? "bg-emerald-50 border-emerald-200" : "bg-zinc-50 border-zinc-200"}`}
        >
          <div className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 shrink-0 ${paidNow ? "bg-emerald-500" : "bg-zinc-300"}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${paidNow ? "translate-x-4" : "translate-x-0"}`} />
          </div>
          <div className="text-left">
            <p className="text-xs font-black text-zinc-900">{paidNow ? "Pagamento confirmado" : "Aguardando pagamento"}</p>
            <p className="text-[10px] text-zinc-500">{paidNow ? "Créditos liberados imediatamente" : "Status Pendente até registrar pagamento"}</p>
          </div>
        </button>

        <div>
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Observações</label>
          <input className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="Opcional..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-10 font-black text-xs">Cancelar</Button>
          <Button onClick={save} loading={loading} className="flex-1 h-10 font-black text-xs bg-emerald-500 hover:bg-emerald-600 text-white">
            Criar Assinatura
          </Button>
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
  const [payMethod, setPayMethod] = useState("pix");
  const [payAmount, setPayAmount] = useState("");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/memberships/subscriptions/${sub.id}`);
      const d = await r.json();
      setDetail(d);
      setPayAmount(d?.planPrice?.toString() || "");
    } catch {} finally { setLoading(false); }
  }, [sub.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const changeStatus = async (status: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/memberships/subscriptions/${sub.id}/status`, {
        method: "PATCH", body: JSON.stringify({ status }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(`Assinatura ${statusLabel(status).toLowerCase()}.`);
      onRefresh(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setActionLoading(false); }
  };

  const registerPayment = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/memberships/subscriptions/${sub.id}/payment`, {
        method: "POST",
        body: JSON.stringify({ method: payMethod, amount: parseFloat(payAmount.replace(",", ".")) || detail?.planPrice }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Pagamento registrado e créditos renovados!");
      setShowPayment(false);
      onRefresh(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setActionLoading(false); }
  };

  const credit = detail?.credits?.[0];
  const used = credit ? Number(credit.usedCredits) : 0;
  const total = credit ? Number(credit.totalCredits) : 0;
  const remaining = total - used;

  return (
    <Modal isOpen onClose={onClose} title="Detalhes da Assinatura" size="md">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : detail ? (
        <div className="space-y-4 p-1">
          {/* Cliente + Plano */}
          <div className="flex items-start gap-3 p-3.5 bg-gradient-to-br from-zinc-50 to-white rounded-2xl border border-zinc-200">
            <div className="w-11 h-11 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0 text-lg font-black text-amber-600">
              {detail.clientName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-zinc-900">{detail.clientName}</p>
              {detail.clientPhone && <p className="text-[10px] text-zinc-400">{detail.clientPhone}</p>}
              {detail.clientEmail && <p className="text-[10px] text-zinc-400">{detail.clientEmail}</p>}
            </div>
            <Badge color={statusColor(detail.status)}>{statusLabel(detail.status)}</Badge>
          </div>

          {/* Plano */}
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
            <Crown size={16} className="text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-zinc-900">{detail.planName}</p>
              <p className="text-[10px] text-zinc-500">{fmt(detail.planPrice)}/{cycleLabel(detail.billingCycle)}</p>
            </div>
          </div>

          {/* Banner de ação para pendentes */}
          {detail.status === "pending" && !showPayment && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <DollarSign size={15} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-900">Pagamento pendente</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    O cliente solicitou esta assinatura pelo portal. Confirme o recebimento de{" "}
                    <strong className="text-amber-700">{fmt(detail.planPrice)}</strong> para ativar os créditos.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowPayment(true)}
                className="w-full h-10 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white gap-2"
              >
                <CheckCircle size={14} /> Confirmar recebimento do pagamento
              </Button>
            </div>
          )}

          {/* Créditos */}
          {credit ? (
            <div className="p-3.5 bg-white border border-zinc-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Créditos do Ciclo</p>
                <span className={`text-[10px] font-black ${remaining === 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {remaining} restantes
                </span>
              </div>
              <div className="bg-zinc-100 rounded-full h-2.5 mb-1.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${used >= total ? "bg-red-400" : used > total * 0.6 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${Math.min(100, total > 0 ? (used / total) * 100 : 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>{used} usados</span>
                <span>de {total} créditos</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1.5">Vence em: <strong className="text-zinc-700">{fmtDate(credit.cycleEnd)}</strong></p>
            </div>
          ) : (
            detail.status !== "pending" && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                <p className="text-[10px] text-zinc-400 font-medium">Sem créditos no ciclo atual</p>
              </div>
            )
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
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">{i.l}</p>
                <p className="text-xs font-black text-zinc-900 mt-0.5">{i.v}</p>
              </div>
            ))}
          </div>

          {/* Histórico pagamentos */}
          {detail.payments?.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Histórico de Pagamentos</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {detail.payments.slice(0, 8).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center ${p.status === "paid" ? "bg-emerald-100" : "bg-zinc-100"}`}>
                        <CheckCircle size={11} className={p.status === "paid" ? "text-emerald-500" : "text-zinc-300"} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-zinc-800">{fmt(p.amount)}</span>
                        {p.method && <span className="text-[9px] text-zinc-400 ml-1.5 capitalize">{p.method}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400">{fmtDate(p.paidAt || p.dueDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          {showPayment ? (
            <div className="space-y-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-black text-zinc-900">Registrar pagamento manual</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Valor</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">R$</span>
                    <input
                      className="w-full border border-zinc-200 rounded-xl pl-7 pr-2 h-9 text-xs font-bold focus:outline-none bg-white"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Forma</label>
                  <select
                    className="w-full border border-zinc-200 rounded-xl px-2 h-9 text-xs font-bold bg-white focus:outline-none"
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                  >
                    {["pix", "dinheiro", "cartão de crédito", "cartão de débito", "transferência"].map(m => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowPayment(false)} className="flex-1 h-9 text-xs font-black">Cancelar</Button>
                <Button onClick={registerPayment} loading={actionLoading} className="flex-1 h-9 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white">
                  Confirmar Pagamento
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {detail.status !== "active" && (
                <Button onClick={() => changeStatus("active")} loading={actionLoading} className="h-9 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white px-3 gap-1.5">
                  <CheckCircle size={13} /> Ativar
                </Button>
              )}
              {(detail.status === "pending" || detail.status === "active") && (
                <Button onClick={() => setShowPayment(true)} className="h-9 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white px-3 gap-1.5">
                  <DollarSign size={13} /> {detail.status === "active" ? "Renovar" : "Registrar Pgto"}
                </Button>
              )}
              {detail.status !== "cancelled" && (
                <Button onClick={() => changeStatus("cancelled")} loading={actionLoading} variant="ghost" className="h-9 text-xs font-black text-red-500 hover:bg-red-50 px-3 gap-1.5">
                  <XCircle size={13} /> Cancelar
                </Button>
              )}
              {detail.status === "cancelled" && (
                <Button onClick={() => changeStatus("active")} loading={actionLoading} className="h-9 text-xs font-black bg-blue-500 hover:bg-blue-600 text-white px-3 gap-1.5">
                  <RefreshCw size={13} /> Reativar
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <EmptyState icon={AlertCircle} title="Erro ao carregar" description="Tente novamente mais tarde." />
      )}
    </Modal>
  );
}

// ─── Card de Plano ────────────────────────────────────────────────────────────

function PlanCard({
  plan, planStats, onEdit, onDelete, onNewSub,
}: {
  plan: MembershipPlan;
  planStats?: any;
  onEdit: () => void;
  onDelete: () => void;
  onNewSub: () => void;
}) {
  const included = parseIncluded(plan.includedServices);
  const isActive = plan.status === "active";
  const activeSubs = Number(planStats?.activeSubscribers ?? 0);
  const totalSubs = Number(planStats?.subscribers ?? 0);

  return (
    <ContentCard className={`flex flex-col gap-0 p-0 overflow-hidden transition-all hover:shadow-md ${!isActive ? "opacity-60" : ""}`}>
      {/* Header */}
      <div className={`p-4 pb-3 ${isActive ? "bg-gradient-to-br from-amber-50 to-white" : "bg-zinc-50"}`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-amber-100" : "bg-zinc-200"}`}>
              <Crown size={16} className={isActive ? "text-amber-600" : "text-zinc-400"} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900 truncate">{plan.name}</p>
              <p className="text-[10px] text-zinc-400 font-bold">{cycleLabel(plan.billingCycle)}</p>
            </div>
          </div>
          <Badge color={isActive ? "success" : "default"} className="text-[9px] shrink-0">
            {isActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-zinc-900 tracking-tight">{fmt(plan.price)}</span>
          <span className="text-[10px] text-zinc-400 font-bold">/{cycleLabel(plan.billingCycle).toLowerCase()}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 border-t border-zinc-100 space-y-3">
        {plan.description && (
          <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{plan.description}</p>
        )}

        {included.length > 0 && (
          <div className="space-y-1">
            {included.slice(0, 3).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-600 font-medium">
                <Check size={10} className="text-emerald-500 shrink-0" /> {s}
              </div>
            ))}
            {included.length > 3 && (
              <p className="text-[10px] text-zinc-400 pl-4">+{included.length - 3} mais</p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="bg-zinc-50 rounded-xl p-2.5 text-center border border-zinc-100">
            <p className="text-sm font-black text-zinc-900">{activeSubs}</p>
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">Ativos</p>
          </div>
          <div className="bg-zinc-50 rounded-xl p-2.5 text-center border border-zinc-100">
            <p className="text-sm font-black text-zinc-900">{totalSubs}</p>
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide">Total</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5 text-center border border-amber-100">
            <p className="text-sm font-black text-amber-700">{plan.creditsPerCycle}</p>
            <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wide">Créditos</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-100 flex gap-2">
        {isActive && (
          <Button
            onClick={onNewSub}
            className="h-8 text-[10px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 gap-1"
          >
            <Plus size={11} /> Assinante
          </Button>
        )}
        <Button variant="ghost" onClick={onEdit} className="flex-1 h-8 text-[10px] font-black gap-1 text-zinc-600 hover:bg-zinc-100">
          <Edit2 size={11} /> Editar
        </Button>
        <button
          onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </ContentCard>
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
  const [newSubForPlan, setNewSubForPlan] = useState<string | null>(null);
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

  const deletePlan = async (plan: MembershipPlan) => {
    if (!confirm(`Desativar o plano "${plan.name}"? Assinantes existentes não serão afetados.`)) return;
    try {
      const res = await apiFetch(`/api/memberships/plans/${plan.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success("Plano desativado.");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const portalLink = user?.tenantSlug ? `${appUrl}/portal/${user.tenantSlug}` : null;

  const copyPortal = () => {
    if (portalLink) { navigator.clipboard.writeText(portalLink); toast.success("Link copiado!"); }
  };

  // Filtros
  const filteredSubs = subs.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.clientName.toLowerCase().includes(q) || s.planName.toLowerCase().includes(q) || (s.clientPhone || "").includes(q);
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchPlan = filterPlan === "all" || s.membershipPlanId === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  const filteredPlans = plans.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination para assinantes
  const pagination = usePagination(filteredSubs, 15);
  const pagedSubs = pagination.paginatedData;

  // Colunas da tabela de assinantes
  const subColumns: Column<Subscription>[] = [
    {
      header: "Cliente",
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black
            ${row.status === "active" ? "bg-emerald-100 text-emerald-700" : row.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>
            {row.clientName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-zinc-900 truncate">{row.clientName}</p>
            {row.clientPhone && <p className="text-[10px] text-zinc-400">{row.clientPhone}</p>}
          </div>
        </div>
      ),
    },
    {
      header: "Plano",
      hideOnMobile: true,
      render: (row) => (
        <div>
          <p className="text-xs font-bold text-zinc-800 truncate">{row.planName}</p>
          <p className="text-[10px] text-zinc-400">{fmt(row.planPrice)}/{cycleLabel(row.billingCycle)}</p>
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <Badge color={statusColor(row.status)} className="text-[9px]">{statusLabel(row.status)}</Badge>
      ),
    },
    {
      header: "Créditos",
      hideOnMobile: true,
      render: (row) => {
        const c = row.currentCredit;
        if (!c) return <span className="text-[10px] text-zinc-300">—</span>;
        return <CreditBar used={Number(c.usedCredits)} total={Number(c.totalCredits)} />;
      },
    },
    {
      header: "Vencimento",
      hideOnMobile: true,
      render: (row) => {
        const d = row.currentPeriodEnd;
        if (!d) return <span className="text-[10px] text-zinc-300">—</span>;
        const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
        const expired = diff < 0;
        const soon = diff >= 0 && diff <= 5;
        return (
          <div>
            <p className={`text-xs font-black ${expired ? "text-red-500" : soon ? "text-amber-600" : "text-zinc-700"}`}>
              {fmtDate(d)}
            </p>
            {(expired || soon) && (
              <p className={`text-[9px] font-bold ${expired ? "text-red-400" : "text-amber-500"}`}>
                {expired ? `${Math.abs(diff)}d atrás` : `em ${diff}d`}
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: "",
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailSub(row); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      ),
    },
  ];

  // Contadores para a barra de toggle
  const activePlans = plans.filter(p => p.status === "active").length;
  const totalSubs = subs.length;
  const activeSubs = subs.filter(s => s.status === "active").length;
  const pendingSubs = subs.filter(s => s.status === "pending").length;

  return (
    <PageWrapper>
      <SectionTitle
        title="Planos de Assinatura"
        description="Crie planos recorrentes e gerencie as assinaturas dos seus clientes."
        icon={Crown}
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {portalLink && (
              <Button variant="ghost" onClick={copyPortal} className="h-9 text-xs font-black gap-1.5 text-zinc-500 hover:text-zinc-900 hidden sm:flex">
                <Link size={13} /> Copiar link do portal
              </Button>
            )}
            <Button variant="ghost" onClick={load} className="h-9 w-9 p-0 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100" title="Atualizar">
              <RefreshCw size={14} />
            </Button>
            {view === "plans" ? (
              <Button onClick={() => setPlanModal("new")} className="h-9 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                <Plus size={14} /> Novo Plano
              </Button>
            ) : (
              <Button onClick={() => setNewSubModal(true)} disabled={activePlans === 0} className="h-9 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 disabled:opacity-50">
                <Plus size={14} /> Nova Assinatura
              </Button>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard title="Assinantes ativos" value={Number(stats?.totals?.active ?? activeSubs)} icon={UserCheck} color="success" delay={0} />
        <StatCard title="Pendentes" value={Number(stats?.totals?.pending ?? pendingSubs)} icon={Clock} color="warning" delay={0.05} />
        <StatCard title="Receita mensal" value={fmt(Number(stats?.totals?.mrr ?? 0))} icon={TrendingUp} color="info" delay={0.1} />
        <StatCard title="Planos ativos" value={activePlans} icon={Crown} color="purple" delay={0.15} />
      </div>

      {/* Link portal */}
      {portalLink && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-3.5 mb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={14} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-zinc-900">Portal do cliente</p>
            <p className="text-[10px] text-zinc-500 truncate">{portalLink}</p>
          </div>
          <button
            onClick={copyPortal}
            className="shrink-0 flex items-center gap-1.5 text-[10px] font-black text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Copy size={11} /> Copiar
          </button>
        </div>
      )}

      {/* Linha 1: Toggle planos/assinantes */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <FilterLineSegmented
          value={view}
          onChange={v => { setView(v as any); setSearch(""); setFilterStatus("all"); setFilterPlan("all"); pagination.setPage(1); }}
          options={[
            { value: "plans", label: `Planos (${plans.length})` },
            { value: "subscriptions", label: `Assinantes (${totalSubs})` },
          ]}
        />
        <div className="flex-1 relative">
          <FilterLineSearch
            value={search}
            onChange={v => { setSearch(v); pagination.setPage(1); }}
            placeholder={view === "plans" ? "Buscar plano..." : "Buscar cliente, plano ou telefone..."}
          />
        </div>
      </div>

      {/* Linha 2: Filtros de status (só na aba assinantes) */}
      {view === "subscriptions" && (
        <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-2.5 shadow-sm flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Status:</span>
          {(["all", "active", "pending", "cancelled", "paused"] as const).map(s => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); pagination.setPage(1); }}
              className={`h-7 px-3 rounded-xl text-[11px] font-black transition-all ${
                filterStatus === s
                  ? s === "all" ? "bg-zinc-900 text-white"
                  : s === "active" ? "bg-emerald-500 text-white"
                  : s === "pending" ? "bg-amber-500 text-white"
                  : s === "cancelled" ? "bg-red-500 text-white"
                  : "bg-zinc-400 text-white"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
              }`}
            >
              {s === "all" ? "Todos" : s === "active" ? `Ativos${activeSubs > 0 ? ` (${activeSubs})` : ""}` : s === "pending" ? `Pendentes${pendingSubs > 0 ? ` (${pendingSubs})` : ""}` : s === "cancelled" ? "Cancelados" : "Pausados"}
            </button>
          ))}
          {plans.length > 1 && (
            <>
              <div className="w-px h-5 bg-zinc-200 mx-1 shrink-0" />
              <select
                className="h-7 text-[11px] font-bold border border-zinc-200 rounded-xl px-2 bg-white focus:outline-none"
                value={filterPlan}
                onChange={e => { setFilterPlan(e.target.value); pagination.setPage(1); }}
              >
                <option value="all">Todos os planos</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </>
          )}
        </div>
      )}

      {/* ── PLANOS ─────────────────────────────────────────────────────────────── */}
      {view === "plans" && (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPlans.length === 0 ? (
          <EmptyState
            icon={Crown}
            title={search ? "Nenhum plano encontrado" : "Nenhum plano criado"}
            description={search ? "Tente outro termo de busca." : "Crie planos de assinatura para oferecer serviços recorrentes aos seus clientes."}
            action={!search ? (
              <Button onClick={() => setPlanModal("new")} className="h-9 text-xs font-black bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                <Plus size={14} /> Criar primeiro plano
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPlans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                planStats={stats?.plans?.find((p: any) => p.id === plan.id)}
                onEdit={() => setPlanModal(plan)}
                onDelete={() => deletePlan(plan)}
                onNewSub={() => { setNewSubForPlan(plan.id); setNewSubModal(true); }}
              />
            ))}
          </div>
        )
      )}

      {/* ── ASSINANTES ─────────────────────────────────────────────────────────── */}
      {view === "subscriptions" && loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {view === "subscriptions" && !loading && (() => {
        const allPending = subs.filter(s => s.status === "pending");
        return (
          <div className="space-y-4">
            {/* Banner de pendentes */}
            {allPending.length > 0 && filterStatus !== "pending" && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Clock size={15} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-900">
                    {allPending.length} assinatura{allPending.length > 1 ? "s" : ""} aguardando confirmação
                  </p>
                  <p className="text-[10px] text-amber-700 font-medium">
                    Clique no assinante para confirmar o pagamento e ativar.
                  </p>
                </div>
                <button
                  onClick={() => { setFilterStatus("pending"); pagination.setPage(1); }}
                  className="shrink-0 text-[10px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Ver pendentes
                </button>
              </div>
            )}

            {/* Lista ou empty */}
            {filteredSubs.length === 0 ? (
              <EmptyState
                icon={Users}
                title={search || filterStatus !== "all" || filterPlan !== "all" ? "Nenhuma assinatura encontrada" : "Nenhum assinante ainda"}
                description={
                  search || filterStatus !== "all" || filterPlan !== "all"
                    ? "Tente ajustar os filtros."
                    : activePlans === 0
                      ? "Crie um plano de assinatura primeiro."
                      : "Adicione clientes aos planos para começar a gerenciar assinaturas."
                }
                action={
                  !search && filterStatus === "all" && filterPlan === "all" && activePlans > 0 ? (
                    <Button onClick={() => setNewSubModal(true)} className="h-9 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
                      <Plus size={14} /> Nova Assinatura
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <GridTable
                data={pagedSubs}
                columns={subColumns}
                keyExtractor={row => row.id}
                onRowClick={row => setDetailSub(row)}
                getMobileBorderClass={row =>
                  row.status === "active" ? "border-emerald-200"
                  : row.status === "pending" ? "border-amber-200"
                  : "border-zinc-200"
                }
                renderMobileAvatar={row => (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0
                    ${row.status === "active" ? "bg-emerald-100 text-emerald-700" : row.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {row.clientName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                renderMobileItem={row => (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-black text-zinc-900">{row.clientName}</p>
                      <Badge color={statusColor(row.status)} className="text-[8px]">{statusLabel(row.status)}</Badge>
                    </div>
                    <p className="text-[10px] text-zinc-500">{row.planName} · {fmt(row.planPrice)}/{cycleLabel(row.billingCycle)}</p>
                    {row.currentCredit && (
                      <div className="mt-1.5">
                        <CreditBar
                          used={Number(row.currentCredit.usedCredits)}
                          total={Number(row.currentCredit.totalCredits)}
                        />
                      </div>
                    )}
                  </div>
                )}
                renderMobileExpandedContent={row => (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-100">
                      <p className="text-[9px] text-zinc-400 font-bold uppercase">Vencimento</p>
                      <p className="text-xs font-black text-zinc-800 mt-0.5">{fmtDate(row.currentPeriodEnd)}</p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-100">
                      <p className="text-[9px] text-zinc-400 font-bold uppercase">Próx. cobrança</p>
                      <p className="text-xs font-black text-zinc-800 mt-0.5">{fmtDate(row.nextChargeDate)}</p>
                    </div>
                    <button
                      onClick={() => setDetailSub(row)}
                      className="col-span-2 h-8 text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors"
                    >
                      Ver detalhes
                    </button>
                  </div>
                )}
                emptyMessage="Nenhum assinante"
                pagination={filteredSubs.length > pagination.pageSize ? {
                  total: filteredSubs.length,
                  page: pagination.page,
                  pageSize: pagination.pageSize,
                  onPageChange: pagination.setPage,
                  onPageSizeChange: pagination.setPageSize,
                } : undefined}
              />
            )}
          </div>
        );
      })()}

      {/* Modais */}
      {planModal !== null && (
        <PlanModal
          plan={planModal === "new" ? null : planModal as MembershipPlan}
          onClose={() => setPlanModal(null)}
          onSaved={load}
        />
      )}
      {newSubModal && (
        <NewSubscriptionModal
          plans={plans}
          onClose={() => { setNewSubModal(false); setNewSubForPlan(null); }}
          onSaved={load}
        />
      )}
      {detailSub && (
        <SubscriptionDetailModal sub={detailSub} onClose={() => setDetailSub(null)} onRefresh={load} />
      )}
    </PageWrapper>
  );
}
