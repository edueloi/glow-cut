import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Crown, CreditCard, Calendar, User, LogOut, Eye, EyeOff,
  CheckCircle, Clock, XCircle, ChevronRight, Plus, Star,
  AlertCircle, Home, Zap, RefreshCw, ArrowLeft, Check,
  Phone, Mail, CalendarPlus, DollarSign, ChevronLeft,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const API = "/api/portal-client";

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}
function cycleLabel(c: string) {
  return ({ monthly: "Mensal", quarterly: "Trimestral", yearly: "Anual", weekly: "Semanal" } as any)[c] || c;
}
function parseIncluded(raw?: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map(s => s.trim()).filter(Boolean); }
}

function portalFetch(slug: string, path: string, opts?: RequestInit) {
  const token = sessionStorage.getItem("portal_token");
  return fetch(`${API}/${slug}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
}

// ── Toast simples ─────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const colors = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-blue-500" };
  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-white text-xs font-bold max-w-xs w-full ${colors[type]}`}>
      {type === "success" ? <CheckCircle size={14} /> : type === "error" ? <XCircle size={14} /> : <AlertCircle size={14} />}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100"><XCircle size={13} /></button>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const show = useCallback((msg: string, type: "success" | "error" | "info" = "info") => setToast({ msg, type }), []);
  const node = toast ? <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} /> : null;
  return { show, node };
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = "amber" }: { color?: string }) {
  return <div className={`w-6 h-6 border-2 border-${color}-500 border-t-transparent rounded-full animate-spin`} />;
}

// ── Tela de Auth (Login / Cadastro) ──────────────────────────────────────────
function AuthScreen({ slug, tenantInfo, onAuth }: { slug: string; tenantInfo: any; onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tenant = tenantInfo?.tenant;
  const plans: any[] = tenantInfo?.plans || [];
  const color = tenant?.themeColor || "#f59e0b";

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      const url = mode === "login" ? `${API}/${slug}/login` : `${API}/${slug}/register`;
      const body = mode === "login" ? { email, password } : { email, password, name, phone };
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      sessionStorage.setItem("portal_token", data.token);
      onAuth();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Hero do estabelecimento */}
      <div className="pt-10 pb-6 px-4 flex flex-col items-center text-center">
        {tenant?.logoUrl ? (
          <img src={tenant.logoUrl} alt={tenant?.name} className="w-20 h-20 rounded-3xl mx-auto mb-4 object-cover shadow-xl border-2 border-white" />
        ) : (
          <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl" style={{ background: color }}>
            <Crown size={32} className="text-white" />
          </div>
        )}
        <h1 className="text-2xl font-black text-zinc-900">{tenant?.name || "Portal do Cliente"}</h1>
        <p className="text-sm text-zinc-500 mt-1">Gerencie suas assinaturas e agendamentos</p>
      </div>

      <div className="max-w-sm mx-auto px-4 pb-8 space-y-4">
        {/* Card de login/cadastro */}
        <div className="bg-white rounded-3xl shadow-xl border border-zinc-200 p-6 space-y-4">
          {/* Toggle */}
          <div className="flex bg-zinc-100 rounded-2xl p-1">
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 text-xs font-black py-2.5 rounded-xl transition-all ${mode === m ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400 hover:text-zinc-600"}`}>
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <>
              <PortalInput label="Nome *" placeholder="Seu nome completo" value={name} onChange={setName} />
              <PortalInput label="Telefone" placeholder="(11) 99999-9999" value={phone} onChange={setPhone} type="tel" />
            </>
          )}

          <PortalInput label="E-mail *" placeholder="seu@email.com" value={email} onChange={setEmail} type="email" />

          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Senha *</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                className="w-full border border-zinc-200 rounded-xl px-3 pr-10 h-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs font-bold text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !email || !password || (mode === "register" && !name)}
            className="w-full h-12 rounded-2xl text-sm font-black text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:scale-95"
            style={{ background: color }}
          >
            {loading ? <Spinner color="white" /> : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </div>

        {/* Planos disponíveis */}
        {plans.length > 0 && (
          <div>
            <h2 className="text-sm font-black text-zinc-700 mb-3 flex items-center gap-2">
              <Crown size={15} className="text-amber-500" /> Planos disponíveis
            </h2>
            <div className="space-y-3">
              {plans.map((p: any) => {
                const included = parseIncluded(p.includedServices);
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-black text-zinc-900">{p.name}</p>
                        {p.description && <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{p.description}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-base font-black" style={{ color }}>{fmt(p.price)}</p>
                        <p className="text-[9px] text-zinc-400 font-bold">/{cycleLabel(p.billingCycle).toLowerCase()}</p>
                      </div>
                    </div>
                    {included.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {included.map((s: string, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                            <Check size={10} className="text-emerald-500 shrink-0" /> {s}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-zinc-100">
                      <p className="text-[10px] text-zinc-400">{p.creditsPerCycle} crédito(s) por ciclo · {cycleLabel(p.billingCycle)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-400 text-center mt-3">Faça login para assinar um plano</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Input helper ─────────────────────────────────────────────────────────────
function PortalInput({ label, placeholder, value, onChange, type = "text" }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">{label}</label>
      <input
        type={type}
        className="w-full border border-zinc-200 rounded-xl px-3 h-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Modal de assinatura de plano ──────────────────────────────────────────────
function SubscribeModal({ slug, plans, onClose, onDone, themeColor }: {
  slug: string; plans: any[]; onClose: () => void; onDone: () => void; themeColor: string;
}) {
  const [selected, setSelected] = useState<string>(plans[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const subscribe = async () => {
    setError(""); setLoading(true);
    try {
      const res = await portalFetch(slug, "/subscribe", {
        method: "POST", body: JSON.stringify({ membershipPlanId: selected }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(true);
      setTimeout(() => { onDone(); onClose(); }, 2000);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const plan = plans.find(p => p.id === selected);
  const included = parseIncluded(plan?.includedServices);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        {success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm font-black text-zinc-900">Solicitação enviada!</p>
            <p className="text-xs text-zinc-500 mt-1">Aguarde a confirmação de pagamento pelo estabelecimento.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900">Assinar um plano</h3>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1"><XCircle size={18} /></button>
            </div>

            <div className="space-y-2">
              {plans.map(p => {
                const inc = parseIncluded(p.includedServices);
                const isSelected = selected === p.id;
                return (
                  <button key={p.id} onClick={() => setSelected(p.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all ${isSelected ? "border-amber-400 bg-amber-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-zinc-900">{p.name}</p>
                      <p className="text-xs font-black" style={{ color: isSelected ? themeColor : "#71717a" }}>
                        {fmt(p.price)}<span className="text-[9px] font-medium text-zinc-400">/{cycleLabel(p.billingCycle).toLowerCase()}</span>
                      </p>
                    </div>
                    {inc.slice(0, 2).map((s: string, i: number) => (
                      <div key={i} className="flex items-center gap-1 mt-1 text-[10px] text-zinc-500">
                        <Check size={9} className="text-emerald-500 shrink-0" /> {s}
                      </div>
                    ))}
                    <p className="text-[10px] text-zinc-400 mt-1">{p.creditsPerCycle} crédito(s)/ciclo</p>
                  </button>
                );
              })}
            </div>

            {plan && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-[11px] text-zinc-600 flex items-start gap-2">
                <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                A assinatura ficará pendente até o estabelecimento confirmar o pagamento de <strong>{fmt(plan.price)}</strong>.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs font-bold text-red-600">{error}</div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-11 rounded-2xl border border-zinc-200 text-xs font-black text-zinc-600 hover:bg-zinc-50">
                Cancelar
              </button>
              <button onClick={subscribe} disabled={loading || !selected}
                className="flex-1 h-11 rounded-2xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: themeColor }}>
                {loading ? <Spinner color="white" /> : <><Crown size={13} /> Solicitar assinatura</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modal de Agendamento ──────────────────────────────────────────────────────
function BookModal({ slug, onClose, onDone, themeColor }: {
  slug: string; onClose: () => void; onDone: () => void; themeColor: string;
}) {
  const [options, setOptions] = useState<{ services: any[]; professionals: any[] } | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    portalFetch(slug, "/booking-options")
      .then(r => r.json())
      .then(d => { setOptions(d); if (d.services?.[0]) setServiceId(d.services[0].id); })
      .catch(() => setError("Erro ao carregar opções."))
      .finally(() => setLoading(false));
  }, [slug]);

  const minDate = new Date().toISOString().split("T")[0];

  const submit = async () => {
    if (!serviceId || !date || !startTime) { setError("Preencha serviço, data e horário."); return; }
    setError(""); setSubmitting(true);
    try {
      const res = await portalFetch(slug, "/book", {
        method: "POST",
        body: JSON.stringify({ serviceId, professionalId: professionalId || undefined, date, startTime, notes: notes || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(true);
      setTimeout(() => { onDone(); onClose(); }, 2000);
    } catch (e: any) { setError(e.message); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm font-black text-zinc-900">Agendamento realizado!</p>
            <p className="text-xs text-zinc-500 mt-1">Seu agendamento foi criado com sucesso.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2"><CalendarPlus size={15} style={{ color: themeColor }} /> Novo Agendamento</h3>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1"><XCircle size={18} /></button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Serviço *</label>
                  <select
                    className="w-full border border-zinc-200 rounded-xl px-3 h-11 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                  >
                    <option value="">Selecione um serviço</option>
                    {options?.services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}{s.price ? ` — ${fmt(s.price)}` : ""}</option>
                    ))}
                  </select>
                </div>

                {options?.professionals && options.professionals.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Profissional</label>
                    <select
                      className="w-full border border-zinc-200 rounded-xl px-3 h-11 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                      value={professionalId}
                      onChange={e => setProfessionalId(e.target.value)}
                    >
                      <option value="">Qualquer disponível</option>
                      {options.professionals.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Data *</label>
                    <input
                      type="date"
                      min={minDate}
                      className="w-full border border-zinc-200 rounded-xl px-3 h-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Horário *</label>
                    <input
                      type="time"
                      className="w-full border border-zinc-200 rounded-xl px-3 h-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Observações</label>
                  <textarea
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none"
                    rows={2}
                    placeholder="Alguma preferência ou informação adicional..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs font-bold text-red-600">{error}</div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-11 rounded-2xl border border-zinc-200 text-xs font-black text-zinc-600 hover:bg-zinc-50">
                Cancelar
              </button>
              <button onClick={submit} disabled={submitting || loading || !serviceId || !date || !startTime}
                className="flex-1 h-11 rounded-2xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: themeColor }}>
                {submitting ? <Spinner color="white" /> : <><CalendarPlus size={13} /> Agendar</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────
function apptStatusStyle(status: string) {
  if (status === "realizado" || status === "completed") return { bg: "bg-emerald-100", text: "text-emerald-600", label: "Realizado" };
  if (status === "cancelado" || status === "cancelled") return { bg: "bg-red-100", text: "text-red-500", label: "Cancelado" };
  if (status === "faltou") return { bg: "bg-orange-100", text: "text-orange-500", label: "Faltou" };
  return { bg: "bg-blue-100", text: "text-blue-600", label: "Agendado" };
}

// ── Dashboard do cliente ──────────────────────────────────────────────────────
function PortalDashboard({ slug, tenantInfo, onLogout }: { slug: string; tenantInfo: any; onLogout: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<"home" | "agenda" | "credits" | "payments">("home");
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  // Modais
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);

  const tenant = tenantInfo?.tenant;
  const plans: any[] = tenantInfo?.plans || [];
  const color = tenant?.themeColor || "#f59e0b";

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalFetch(slug, "/me");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setProfile(d);
    } catch { onLogout(); } finally { setLoading(false); }
  }, [slug]);

  const loadTab = useCallback(async (t: string) => {
    setTabLoading(true);
    try {
      if (t === "agenda") {
        const r = await portalFetch(slug, "/appointments?limit=30");
        setAppointments(await r.json());
      }
      if (t === "credits") {
        const r = await portalFetch(slug, "/credits");
        setCredits(await r.json());
      }
      if (t === "payments") {
        const r = await portalFetch(slug, "/payments");
        setPayments(await r.json());
      }
    } catch {} finally { setTabLoading(false); }
  }, [slug]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { if (tab !== "home") loadTab(tab); }, [tab, loadTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Spinner color="amber" />
      </div>
    );
  }
  if (!profile) return null;

  const client = profile.client;
  const subs: any[] = profile.subscriptions || [];
  const activeSubs = subs.filter(s => s.status === "active");
  const pendingSubs = subs.filter(s => s.status === "pending");
  const hasActiveSub = activeSubs.length > 0;

  const tabs = [
    { id: "home", label: "Início", icon: Home },
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "credits", label: "Créditos", icon: Zap },
    { id: "payments", label: "Pagamentos", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Toast */}
      {toast.node}

      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="w-8 h-8 rounded-xl object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color }}>
                <Crown size={14} className="text-white" />
              </div>
            )}
            <div>
              <p className="text-xs font-black text-zinc-900 leading-none">{client?.name}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{tenant?.name}</p>
            </div>
          </div>
          <button onClick={onLogout} className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 rounded-xl hover:bg-red-50">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-0">

        {/* ── INÍCIO ─────────────────────────────────────────────────────── */}
        {tab === "home" && (
          <div className="space-y-4">
            {/* Ações rápidas */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowBookModal(true)}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-zinc-200 hover:border-amber-300 hover:shadow-md transition-all active:scale-95 shadow-sm"
              >
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: color + "20" }}>
                  <CalendarPlus size={18} style={{ color }} />
                </div>
                <p className="text-xs font-black text-zinc-900">Agendar</p>
                <p className="text-[10px] text-zinc-400 text-center leading-tight">Marcar um horário</p>
              </button>
              <button
                onClick={() => plans.length > 0 ? setShowSubscribeModal(true) : toast.show("Nenhum plano disponível no momento.", "info")}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-zinc-200 hover:border-amber-300 hover:shadow-md transition-all active:scale-95 shadow-sm"
              >
                <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <Crown size={18} className="text-amber-500" />
                </div>
                <p className="text-xs font-black text-zinc-900">Planos</p>
                <p className="text-[10px] text-zinc-400 text-center leading-tight">Assinar um plano</p>
              </button>
            </div>

            {/* Assinaturas ativas */}
            {activeSubs.length > 0 && (
              <div>
                <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2.5">Minhas assinaturas ativas</h2>
                <div className="space-y-3">
                  {activeSubs.map((sub: any) => {
                    const cr = sub.currentCredit;
                    const used = cr ? Number(cr.usedCredits) : 0;
                    const total = cr ? Number(cr.totalCredits) : 0;
                    const remaining = total - used;
                    const pct = total > 0 ? (used / total) * 100 : 0;
                    const included = parseIncluded(sub.includedServices);
                    return (
                      <div key={sub.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-zinc-100">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                <Crown size={14} className="text-amber-600" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-zinc-900">{sub.planName}</p>
                                <p className="text-[10px] text-zinc-400">{fmt(sub.price ?? sub.planPrice)}/{cycleLabel(sub.billingCycle).toLowerCase()}</p>
                              </div>
                            </div>
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-200">Ativo</span>
                          </div>
                          {included.length > 0 && (
                            <div className="mt-2 space-y-0.5">
                              {included.map((s: string, i: number) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                  <Check size={9} className="text-emerald-500" /> {s}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {cr && (
                          <div className="px-4 py-3 bg-zinc-50/80">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Créditos do ciclo</p>
                              <p className={`text-[10px] font-black ${remaining === 0 ? "text-red-500" : "text-emerald-600"}`}>
                                {remaining} restante{remaining !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="bg-zinc-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full transition-all ${pct >= 100 ? "bg-red-400" : pct > 60 ? "bg-amber-400" : "bg-emerald-400"}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1.5">
                              <p className="text-[10px] text-zinc-400">{used} usado{used !== 1 ? "s" : ""} de {total}</p>
                              <p className="text-[10px] text-zinc-400">Vence {fmtDate(cr.cycleEnd)}</p>
                            </div>
                          </div>
                        )}

                        <div className="px-4 py-3 grid grid-cols-2 gap-2 border-t border-zinc-100">
                          <div className="bg-zinc-50 rounded-xl p-2.5">
                            <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wide">Próxima cobrança</p>
                            <p className="text-xs font-black text-zinc-900 mt-0.5">{fmtDate(sub.nextChargeDate)}</p>
                          </div>
                          <div className="bg-zinc-50 rounded-xl p-2.5">
                            <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wide">Membro desde</p>
                            <p className="text-xs font-black text-zinc-900 mt-0.5">{fmtDate(sub.currentPeriodStart)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pendentes */}
            {pendingSubs.length > 0 && (
              <div>
                <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Aguardando confirmação</h2>
                {pendingSubs.map((sub: any) => (
                  <div key={sub.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-zinc-900">{sub.planName}</p>
                      <p className="text-[10px] text-amber-600 font-bold">Pendente — aguardando pagamento</p>
                    </div>
                    <p className="text-xs font-black text-zinc-700 shrink-0">{fmt(sub.price ?? sub.planPrice)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sem nada */}
            {subs.length === 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <Crown size={36} className="text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-black text-zinc-900 mb-1">Nenhuma assinatura</p>
                <p className="text-xs text-zinc-400 mb-4">Assine um plano para aproveitar créditos e benefícios exclusivos.</p>
                {plans.length > 0 && (
                  <button
                    onClick={() => setShowSubscribeModal(true)}
                    className="h-10 px-5 rounded-2xl text-xs font-black text-white flex items-center gap-1.5 mx-auto"
                    style={{ background: color }}
                  >
                    <Crown size={13} /> Ver planos disponíveis
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── AGENDA ─────────────────────────────────────────────────────── */}
        {tab === "agenda" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-zinc-900">Meus agendamentos</h2>
              <button
                onClick={() => setShowBookModal(true)}
                className="h-9 px-3.5 rounded-2xl text-[11px] font-black text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                style={{ background: color }}
              >
                <Plus size={13} /> Agendar
              </button>
            </div>

            {tabLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <Calendar size={32} className="text-zinc-300 mx-auto mb-2" />
                <p className="text-sm font-black text-zinc-900 mb-1">Nenhum agendamento</p>
                <p className="text-xs text-zinc-400 mb-4">Você ainda não tem agendamentos registrados.</p>
                <button
                  onClick={() => setShowBookModal(true)}
                  className="h-9 px-4 rounded-2xl text-xs font-black text-white flex items-center gap-1.5 mx-auto"
                  style={{ background: color }}
                >
                  <CalendarPlus size={13} /> Fazer agendamento
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map((a: any, i: number) => {
                  const st = apptStatusStyle(a.status);
                  return (
                    <div key={a.id || i} className="bg-white rounded-2xl border border-zinc-200 p-3.5 flex items-center gap-3 shadow-sm">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${st.bg}`}>
                        <Calendar size={15} className={st.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-zinc-900 truncate">{a.serviceName || "Serviço"}</p>
                        <p className="text-[10px] text-zinc-400">
                          {fmtDate(a.date)} · {a.startTime}
                          {a.professionalName ? ` · ${a.professionalName}` : ""}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${st.bg} ${st.text} shrink-0`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CRÉDITOS ───────────────────────────────────────────────────── */}
        {tab === "credits" && (
          <div>
            <h2 className="text-sm font-black text-zinc-900 mb-4">Histórico de créditos</h2>
            {tabLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : credits.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <Zap size={32} className="text-zinc-300 mx-auto mb-2" />
                <p className="text-sm font-black text-zinc-900 mb-1">Nenhum crédito</p>
                <p className="text-xs text-zinc-400">Os créditos aparecem quando você possui uma assinatura ativa.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {credits.map((c: any, i: number) => {
                  const used = Number(c.usedCredits);
                  const total = Number(c.totalCredits);
                  const remaining = total - used;
                  const pct = total > 0 ? (used / total) * 100 : 0;
                  const expired = new Date(c.cycleEnd) < new Date();
                  return (
                    <div key={c.id || i} className={`bg-white rounded-2xl border p-4 shadow-sm ${expired ? "border-zinc-200 opacity-70" : "border-zinc-200"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs font-black text-zinc-900">{c.planName || "Plano"}</p>
                          <p className="text-[10px] text-zinc-400">{fmtDate(c.cycleStart)} → {fmtDate(c.cycleEnd)}</p>
                        </div>
                        {expired ? (
                          <span className="text-[9px] font-black bg-zinc-100 text-zinc-500 px-2 py-1 rounded-lg">Expirado</span>
                        ) : (
                          <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-200">
                            {remaining} restante{remaining !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="bg-zinc-100 rounded-full h-2.5 mb-1.5">
                        <div
                          className={`h-2.5 rounded-full ${pct >= 100 ? "bg-red-400" : pct > 60 ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>{used} usado{used !== 1 ? "s" : ""}</span>
                        <span>de {total} crédito{total !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PAGAMENTOS ─────────────────────────────────────────────────── */}
        {tab === "payments" && (
          <div>
            <h2 className="text-sm font-black text-zinc-900 mb-4">Histórico de pagamentos</h2>
            {tabLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : payments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <CreditCard size={32} className="text-zinc-300 mx-auto mb-2" />
                <p className="text-sm font-black text-zinc-900 mb-1">Nenhum pagamento</p>
                <p className="text-xs text-zinc-400">Os pagamentos aparecerão aqui conforme forem registrados.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p: any, i: number) => (
                  <div key={p.id || i} className="bg-white rounded-2xl border border-zinc-200 p-3.5 flex items-center gap-3 shadow-sm">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${p.status === "paid" ? "bg-emerald-100" : "bg-amber-100"}`}>
                      {p.status === "paid"
                        ? <CheckCircle size={16} className="text-emerald-600" />
                        : <Clock size={16} className="text-amber-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-zinc-900 truncate">{p.planName || "Plano"}</p>
                      <p className="text-[10px] text-zinc-400">
                        {fmtDate(p.paidAt || p.dueDate)}
                        {p.method ? ` · ${p.method}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-zinc-900">{fmt(p.amount)}</p>
                      <span className={`text-[9px] font-black ${p.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                        {p.status === "paid" ? "Pago" : "Pendente"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-30 safe-area-bottom">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-all ${active ? "text-amber-600" : "text-zinc-400 hover:text-zinc-600"}`}
                style={active ? { color } : undefined}
              >
                <t.icon size={18} />
                <span className="text-[9px] font-black tracking-wide">{t.label}</span>
                {active && <div className="w-4 h-0.5 rounded-full" style={{ background: color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modais */}
      {showSubscribeModal && plans.length > 0 && (
        <SubscribeModal
          slug={slug}
          plans={plans}
          themeColor={color}
          onClose={() => setShowSubscribeModal(false)}
          onDone={() => { loadProfile(); toast.show("Assinatura solicitada com sucesso!", "success"); }}
        />
      )}
      {showBookModal && (
        <BookModal
          slug={slug}
          themeColor={color}
          onClose={() => setShowBookModal(false)}
          onDone={() => { loadTab("agenda"); if (tab === "agenda") {} toast.show("Agendamento criado!", "success"); }}
        />
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ClientPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [authed, setAuthed] = useState(!!sessionStorage.getItem("portal_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/${slug}/tenant-info`)
      .then(r => r.json())
      .then(setTenantInfo)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleLogout = () => {
    sessionStorage.removeItem("portal_token");
    setAuthed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenantInfo?.tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="text-center">
          <AlertCircle size={40} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-black text-zinc-900">Estabelecimento não encontrado</p>
          <p className="text-xs text-zinc-500 mt-1">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  if (!authed || !slug) {
    return <AuthScreen slug={slug || ""} tenantInfo={tenantInfo} onAuth={() => setAuthed(true)} />;
  }

  return (
    <PortalDashboard
      slug={slug}
      tenantInfo={tenantInfo}
      onLogout={handleLogout}
    />
  );
}
