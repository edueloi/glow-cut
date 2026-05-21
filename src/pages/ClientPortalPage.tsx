import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Crown, CreditCard, Calendar, User, LogOut, Eye, EyeOff,
  CheckCircle, Clock, XCircle, ChevronRight, Plus, Star,
  AlertCircle, Home, Zap, RefreshCw, ArrowLeft, Check,
  Phone, Mail, CalendarPlus, DollarSign, ChevronLeft,
  Scissors, MapPin, CalendarCheck, Ban, ChevronDown,
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
function fmtDateFull(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
function cycleLabel(c: string) {
  return ({ monthly: "Mensal", quarterly: "Trimestral", yearly: "Anual", weekly: "Semanal" } as any)[c] || c;
}
function parseIncluded(raw?: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map(s => s.trim()).filter(Boolean); }
}
function isToday(d: string) {
  const today = new Date(); const date = new Date(d);
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}
function isFuture(d: string) {
  const date = new Date(d); date.setHours(23, 59, 59);
  return date >= new Date();
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

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const colors = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-blue-500" };
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-white text-xs font-bold max-w-xs w-full ${colors[type]}`}>
      {type === "success" ? <CheckCircle size={14} /> : type === "error" ? <XCircle size={14} /> : <AlertCircle size={14} />}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose}><XCircle size={13} /></button>
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
function Spinner({ size = 24, color = "#f59e0b" }: { size?: number; color?: string }) {
  return (
    <div className="flex justify-center items-center">
      <div style={{ width: size, height: size, borderColor: color + "40", borderTopColor: color }} className="rounded-full border-2 animate-spin" />
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
      <input type={type}
        className="w-full border border-zinc-200 rounded-xl px-3 h-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
        placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────────
function apptStyle(status: string) {
  if (status === "realizado" || status === "completed") return { bg: "bg-emerald-100", text: "text-emerald-700", label: "Realizado", dot: "bg-emerald-500" };
  if (status === "cancelado" || status === "cancelled") return { bg: "bg-red-100", text: "text-red-600", label: "Cancelado", dot: "bg-red-400" };
  if (status === "faltou") return { bg: "bg-orange-100", text: "text-orange-600", label: "Faltou", dot: "bg-orange-400" };
  if (status === "confirmado") return { bg: "bg-blue-100", text: "text-blue-700", label: "Confirmado", dot: "bg-blue-500" };
  return { bg: "bg-zinc-100", text: "text-zinc-600", label: "Agendado", dot: "bg-zinc-400" };
}

// ── Tela de Auth ──────────────────────────────────────────────────────────────
function AuthScreen({ slug, tenantInfo, onAuth }: { slug: string; tenantInfo: any; onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-50">
      {/* Hero */}
      <div className="pt-12 pb-8 px-4 flex flex-col items-center text-center">
        {tenant?.logoUrl ? (
          <img src={tenant.logoUrl} alt={tenant?.name} className="w-20 h-20 rounded-3xl mx-auto mb-4 object-cover shadow-xl border-4 border-white" />
        ) : (
          <div className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl border-4 border-white/50" style={{ background: color }}>
            <Crown size={32} className="text-white" />
          </div>
        )}
        <h1 className="text-2xl font-black text-zinc-900">{tenant?.name || "Portal do Cliente"}</h1>
        <p className="text-sm text-zinc-500 mt-1">Gerencie suas assinaturas e agendamentos</p>
      </div>

      <div className="max-w-sm mx-auto px-4 pb-10 space-y-4">
        <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 p-6 space-y-4">
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
              <input type={showPass ? "text" : "password"}
                className="w-full border border-zinc-200 rounded-xl px-3 pr-10 h-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                placeholder="••••••" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()} />
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

          <button onClick={submit} disabled={loading || !email || !password || (mode === "register" && !name)}
            className="w-full h-12 rounded-2xl text-sm font-black text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:scale-95"
            style={{ background: color }}>
            {loading ? <Spinner size={18} color="white" /> : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </div>

        {plans.length > 0 && (
          <div>
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Crown size={13} className="text-amber-500" /> Planos disponíveis
            </h2>
            <div className="space-y-2.5">
              {plans.map((p: any) => {
                const included = parseIncluded(p.includedServices);
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-black text-zinc-900">{p.name}</p>
                        {p.description && <p className="text-[11px] text-zinc-400 mt-0.5">{p.description}</p>}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-base font-black" style={{ color }}>{fmt(p.price)}</p>
                        <p className="text-[9px] text-zinc-400 font-bold">/{cycleLabel(p.billingCycle).toLowerCase()}</p>
                      </div>
                    </div>
                    {included.length > 0 && (
                      <div className="space-y-1 mt-2 border-t border-zinc-100 pt-2">
                        {included.map((s: string, i: number) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                            <Check size={10} className="text-emerald-500 shrink-0" /> {s}
                          </div>
                        ))}
                      </div>
                    )}
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

// ── Modal de assinatura ───────────────────────────────────────────────────────
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
      const res = await portalFetch(slug, "/subscribe", { method: "POST", body: JSON.stringify({ membershipPlanId: selected }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(true);
      setTimeout(() => { onDone(); onClose(); }, 2000);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const plan = plans.find(p => p.id === selected);
  const included = parseIncluded(plan?.includedServices);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={32} className="text-emerald-500" />
            </div>
            <p className="text-sm font-black text-zinc-900">Solicitação enviada!</p>
            <p className="text-xs text-zinc-500 mt-1">Aguarde a confirmação pelo estabelecimento.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2"><Crown size={15} style={{ color: themeColor }} /> Assinar plano</h3>
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
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11px] text-zinc-700 flex items-start gap-2">
                <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                A assinatura ficará pendente até o estabelecimento confirmar o pagamento de <strong>{fmt(plan.price)}</strong>.
              </div>
            )}
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs font-bold text-red-600">{error}</div>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-11 rounded-2xl border border-zinc-200 text-xs font-black text-zinc-600 hover:bg-zinc-50">Cancelar</button>
              <button onClick={subscribe} disabled={loading || !selected}
                className="flex-1 h-11 rounded-2xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: themeColor }}>
                {loading ? <Spinner size={16} color="white" /> : <><Crown size={13} /> Solicitar</>}
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

  const selectedService = options?.services.find(s => s.id === serviceId);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CalendarCheck size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm font-black text-zinc-900">Agendamento criado!</p>
            <p className="text-xs text-zinc-500 mt-1">Seu horário foi reservado com sucesso.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                <CalendarPlus size={15} style={{ color: themeColor }} /> Novo Agendamento
              </h3>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1"><XCircle size={18} /></button>
            </div>

            {loading ? (
              <div className="py-10"><Spinner color={themeColor} /></div>
            ) : (
              <div className="space-y-3.5">
                {/* Serviço */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Serviço *</label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {options?.services.map(s => (
                      <button key={s.id} onClick={() => setServiceId(s.id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center justify-between gap-2 ${serviceId === s.id ? "border-amber-400 bg-amber-50" : "border-zinc-200 hover:border-zinc-300"}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: themeColor + "20" }}>
                            <Scissors size={13} style={{ color: themeColor }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-zinc-900 truncate">{s.name}</p>
                            {s.duration && <p className="text-[10px] text-zinc-400">{s.duration} min</p>}
                          </div>
                        </div>
                        {s.price > 0 && <p className="text-xs font-black text-zinc-700 shrink-0">{fmt(s.price)}</p>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profissional */}
                {options?.professionals && options.professionals.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Profissional</label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <button onClick={() => setProfessionalId("")}
                        className={`flex-shrink-0 flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all w-16 ${professionalId === "" ? "border-amber-400 bg-amber-50" : "border-zinc-200 hover:border-zinc-300"}`}>
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
                          <User size={14} className="text-zinc-400" />
                        </div>
                        <p className="text-[9px] font-black text-zinc-600 text-center leading-tight">Qualquer</p>
                      </button>
                      {options.professionals.map(p => (
                        <button key={p.id} onClick={() => setProfessionalId(p.id)}
                          className={`flex-shrink-0 flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all w-16 ${professionalId === p.id ? "border-amber-400 bg-amber-50" : "border-zinc-200 hover:border-zinc-300"}`}>
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} className="w-9 h-9 rounded-xl object-cover" alt={p.name} />
                          ) : (
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white" style={{ background: themeColor }}>
                              {p.name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <p className="text-[9px] font-black text-zinc-700 text-center leading-tight truncate w-full">{p.name?.split(" ")[0]}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data e hora */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Data *</label>
                    <input type="date" min={minDate}
                      className="w-full border border-zinc-200 rounded-xl px-3 h-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                      value={date} onChange={e => setDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Horário *</label>
                    <input type="time"
                      className="w-full border border-zinc-200 rounded-xl px-3 h-11 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400"
                      value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Observações</label>
                  <textarea
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 resize-none"
                    rows={2} placeholder="Preferências ou informações adicionais..."
                    value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs font-bold text-red-600">{error}</div>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 h-11 rounded-2xl border border-zinc-200 text-xs font-black text-zinc-600 hover:bg-zinc-50">Cancelar</button>
              <button onClick={submit} disabled={submitting || loading || !serviceId || !date || !startTime}
                className="flex-1 h-11 rounded-2xl text-xs font-black text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: themeColor }}>
                {submitting ? <Spinner size={16} color="white" /> : <><CalendarPlus size={13} /> Confirmar</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Dashboard do cliente ──────────────────────────────────────────────────────
function PortalDashboard({ slug, tenantInfo, onLogout }: { slug: string; tenantInfo: any; onLogout: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<"home" | "agenda" | "assinaturas" | "pagamentos">("home");
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [agendaFilter, setAgendaFilter] = useState<"proximos" | "historico">("proximos");

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
        const r = await portalFetch(slug, "/appointments?limit=50");
        setAppointments(Array.isArray(await r.clone().json()) ? await r.json() : []);
      }
      if (t === "pagamentos") {
        const r = await portalFetch(slug, "/payments");
        setPayments(Array.isArray(await r.clone().json()) ? await r.json() : []);
      }
    } catch {} finally { setTabLoading(false); }
  }, [slug]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => {
    if (tab === "agenda") loadTab("agenda");
    if (tab === "pagamentos") loadTab("pagamentos");
  }, [tab, loadTab]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><Spinner color={color} /></div>;
  if (!profile) return null;

  const client = profile.client;
  const subs: any[] = profile.subscriptions || [];
  const activeSubs = subs.filter(s => s.status === "active");
  const pendingSubs = subs.filter(s => s.status === "pending");

  const futureAppts = appointments.filter(a => isFuture(a.date));
  const pastAppts = appointments.filter(a => !isFuture(a.date));
  const displayAppts = agendaFilter === "proximos" ? futureAppts : pastAppts;

  const tabs = [
    { id: "home", label: "Início", icon: Home },
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "assinaturas", label: "Planos", icon: Crown },
    { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {toast.node}

      {/* Header */}
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="w-9 h-9 rounded-xl object-cover border border-zinc-100" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm" style={{ background: color }}>
                <Crown size={16} className="text-white" />
              </div>
            )}
            <div>
              <p className="text-xs font-black text-zinc-900 leading-none">{client?.name?.split(" ")[0]}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{tenant?.name}</p>
            </div>
          </div>
          <button onClick={onLogout} className="text-zinc-400 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ── INÍCIO ─────────────────────────────────────────────────────────── */}
        {tab === "home" && (
          <div className="space-y-4">
            {/* Ações rápidas */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowBookModal(true)}
                className="flex flex-col items-center gap-2.5 p-5 bg-white rounded-3xl border border-zinc-200 hover:border-amber-300 hover:shadow-md transition-all active:scale-95 shadow-sm">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: color + "18" }}>
                  <CalendarPlus size={22} style={{ color }} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-zinc-900">Agendar</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Marcar um horário</p>
                </div>
              </button>
              <button onClick={() => plans.length > 0 ? setShowSubscribeModal(true) : toast.show("Nenhum plano disponível.", "info")}
                className="flex flex-col items-center gap-2.5 p-5 bg-white rounded-3xl border border-zinc-200 hover:border-amber-300 hover:shadow-md transition-all active:scale-95 shadow-sm">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <Crown size={22} className="text-amber-500" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-zinc-900">Planos</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Assinar um plano</p>
                </div>
              </button>
            </div>

            {/* Próximo agendamento */}
            {futureAppts.length === 0 ? null : (() => {
              const next = [...futureAppts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
              const st = apptStyle(next.status);
              const todayAppt = isToday(next.date);
              return (
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Próximo agendamento</p>
                  <div onClick={() => setTab("agenda")}
                    className={`bg-white rounded-2xl border-2 p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all shadow-sm ${todayAppt ? "border-amber-300 bg-amber-50/30" : "border-zinc-200 hover:border-zinc-300"}`}>
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 ${todayAppt ? "text-white" : "bg-zinc-100"}`}
                      style={todayAppt ? { background: color } : undefined}>
                      <p className="text-base font-black leading-none">{new Date(next.date).getDate()}</p>
                      <p className="text-[9px] font-bold uppercase">
                        {todayAppt ? "hoje" : new Date(next.date).toLocaleDateString("pt-BR", { month: "short" })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-zinc-900 truncate">{next.serviceName || "Serviço"}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{next.startTime}{next.professionalName ? ` · ${next.professionalName}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${st.bg} ${st.text}`}>{st.label}</span>
                      <ChevronRight size={14} className="text-zinc-300" />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Assinaturas ativas */}
            {activeSubs.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Minhas assinaturas</p>
                <div className="space-y-3">
                  {activeSubs.map((sub: any) => {
                    const cr = sub.currentCredit;
                    const used = cr ? Number(cr.usedCredits) : 0;
                    const total = cr ? Number(cr.totalCredits) : 0;
                    const remaining = total - used;
                    const pct = total > 0 ? (used / total) * 100 : 0;
                    return (
                      <div key={sub.id} onClick={() => setTab("assinaturas")}
                        className="bg-white rounded-2xl border border-zinc-200 p-4 cursor-pointer hover:border-zinc-300 transition-all shadow-sm active:scale-[0.98]">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                              <Crown size={15} className="text-amber-600" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-zinc-900">{sub.planName}</p>
                              <p className="text-[10px] text-zinc-400">{fmt(sub.price ?? sub.planPrice)}/{cycleLabel(sub.billingCycle).toLowerCase()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-200">Ativo</span>
                            <ChevronRight size={13} className="text-zinc-300" />
                          </div>
                        </div>
                        {cr && (
                          <div>
                            <div className="flex justify-between mb-1">
                              <p className="text-[10px] text-zinc-500">Créditos do ciclo</p>
                              <p className={`text-[10px] font-black ${remaining === 0 ? "text-red-500" : "text-emerald-600"}`}>{remaining} restante{remaining !== 1 ? "s" : ""}</p>
                            </div>
                            <div className="bg-zinc-100 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-red-400" : pct > 60 ? "bg-amber-400" : "bg-emerald-400"}`}
                                style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-1">{used} de {total} usados · vence {fmtDate(cr.cycleEnd)}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pendentes */}
            {pendingSubs.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Aguardando pagamento</p>
                {pendingSubs.map((sub: any) => (
                  <div key={sub.id} className="bg-white rounded-2xl border-2 border-amber-300 overflow-hidden shadow-sm">
                    <div className="flex items-center gap-3 p-4 border-b border-amber-100">
                      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <Crown size={15} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-zinc-900">{sub.planName}</p>
                        <p className="text-[10px] text-zinc-400">{cycleLabel(sub.billingCycle)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-amber-600">{fmt(sub.price ?? sub.planPrice)}</p>
                        <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">Pendente</span>
                      </div>
                    </div>
                    <div className="p-4 bg-amber-50 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-zinc-700 leading-relaxed">
                          Realize o pagamento de <strong className="text-amber-700">{fmt(sub.price ?? sub.planPrice)}</strong> ao estabelecimento para ativar sua assinatura.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[{ icon: "💵", label: "Dinheiro", desc: "Presencialmente" }, { icon: "📱", label: "Pix", desc: "Chave do estabelecimento" }, { icon: "💳", label: "Cartão", desc: "Débito ou crédito" }, { icon: "🔁", label: "Transferência", desc: "TED/DOC" }].map(m => (
                          <div key={m.label} className="bg-white rounded-xl p-2.5 border border-amber-200 flex items-center gap-2">
                            <span>{m.icon}</span>
                            <div><p className="text-[10px] font-black text-zinc-900">{m.label}</p><p className="text-[9px] text-zinc-400">{m.desc}</p></div>
                          </div>
                        ))}
                      </div>
                      {tenant?.phone && (
                        <a href={`tel:${tenant.phone}`} className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-white border border-amber-200 text-xs font-black text-amber-700 hover:bg-amber-100 transition-colors">
                          <Phone size={13} /> Ligar para {tenant.name}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sem nada */}
            {subs.length === 0 && futureAppts.length === 0 && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <Crown size={36} className="text-zinc-200 mx-auto mb-3" />
                <p className="text-sm font-black text-zinc-900 mb-1">Bem-vindo ao portal!</p>
                <p className="text-xs text-zinc-400 mb-4">Agende um serviço ou assine um plano para aproveitar benefícios exclusivos.</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => setShowBookModal(true)} className="h-9 px-4 rounded-xl text-xs font-black border border-zinc-200 text-zinc-700 hover:bg-zinc-50">Agendar</button>
                  {plans.length > 0 && (
                    <button onClick={() => setShowSubscribeModal(true)} className="h-9 px-4 rounded-xl text-xs font-black text-white flex items-center gap-1.5" style={{ background: color }}>
                      <Crown size={12} /> Ver planos
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AGENDA ─────────────────────────────────────────────────────────── */}
        {tab === "agenda" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex bg-zinc-100 p-1 rounded-xl gap-1">
                <button onClick={() => setAgendaFilter("proximos")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${agendaFilter === "proximos" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"}`}>
                  Próximos {futureAppts.length > 0 && <span className="ml-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[9px]">{futureAppts.length}</span>}
                </button>
                <button onClick={() => setAgendaFilter("historico")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${agendaFilter === "historico" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"}`}>
                  Histórico
                </button>
              </div>
              <button onClick={() => setShowBookModal(true)}
                className="h-9 px-3.5 rounded-xl text-[11px] font-black text-white flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
                style={{ background: color }}>
                <Plus size={13} /> Agendar
              </button>
            </div>

            {tabLoading ? (
              <div className="py-12"><Spinner color={color} /></div>
            ) : displayAppts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <Calendar size={32} className="text-zinc-200 mx-auto mb-2" />
                <p className="text-sm font-black text-zinc-900 mb-1">
                  {agendaFilter === "proximos" ? "Nenhum agendamento futuro" : "Nenhum histórico"}
                </p>
                <p className="text-xs text-zinc-400 mb-4">
                  {agendaFilter === "proximos" ? "Marque um horário para começar." : "Seus atendimentos anteriores aparecerão aqui."}
                </p>
                {agendaFilter === "proximos" && (
                  <button onClick={() => setShowBookModal(true)} className="h-9 px-4 rounded-xl text-xs font-black text-white flex items-center gap-1.5 mx-auto" style={{ background: color }}>
                    <CalendarPlus size={13} /> Fazer agendamento
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {[...displayAppts]
                  .sort((a, b) => agendaFilter === "proximos"
                    ? new Date(a.date).getTime() - new Date(b.date).getTime()
                    : new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((a: any, i: number) => {
                    const st = apptStyle(a.status);
                    const todayAppt = isToday(a.date);
                    const date = new Date(a.date);
                    return (
                      <div key={a.id || i}
                        className={`bg-white rounded-2xl border p-3.5 flex items-center gap-3 shadow-sm transition-all ${todayAppt ? "border-amber-200 bg-amber-50/20" : "border-zinc-200"}`}>
                        <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${todayAppt ? "border-amber-400 text-white" : "border-zinc-200 bg-zinc-50"}`}
                          style={todayAppt ? { background: color } : undefined}>
                          <p className={`text-sm font-black leading-none ${todayAppt ? "text-white" : "text-zinc-700"}`}>{date.getDate()}</p>
                          <p className={`text-[9px] font-bold uppercase ${todayAppt ? "text-white/80" : "text-zinc-400"}`}>
                            {todayAppt ? "hoje" : date.toLocaleDateString("pt-BR", { month: "short" })}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-zinc-900 truncate">{a.serviceName || "Serviço"}</p>
                            {todayAppt && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">Hoje</span>}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {a.startTime}{a.endTime ? ` – ${a.endTime}` : ""}
                            {a.professionalName ? ` · ${a.professionalName}` : ""}
                          </p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg shrink-0 ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── ASSINATURAS ────────────────────────────────────────────────────── */}
        {tab === "assinaturas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-zinc-900">Meus Planos</h2>
              {plans.length > 0 && (
                <button onClick={() => setShowSubscribeModal(true)}
                  className="h-9 px-3.5 rounded-xl text-[11px] font-black text-white flex items-center gap-1.5"
                  style={{ background: color }}>
                  <Plus size={13} /> Assinar
                </button>
              )}
            </div>

            {subs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <Crown size={36} className="text-zinc-200 mx-auto mb-3" />
                <p className="text-sm font-black text-zinc-900 mb-1">Nenhuma assinatura</p>
                <p className="text-xs text-zinc-400 mb-4">Assine um plano para ter créditos e benefícios exclusivos.</p>
                {plans.length > 0 && (
                  <button onClick={() => setShowSubscribeModal(true)} className="h-9 px-5 rounded-xl text-xs font-black text-white flex items-center gap-1.5 mx-auto" style={{ background: color }}>
                    <Crown size={13} /> Ver planos disponíveis
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {subs.map((sub: any) => {
                  const cr = sub.currentCredit;
                  const used = cr ? Number(cr.usedCredits) : 0;
                  const total = cr ? Number(cr.totalCredits) : 0;
                  const remaining = total - used;
                  const pct = total > 0 ? (used / total) * 100 : 0;
                  const included = parseIncluded(sub.includedServices);
                  const isActive = sub.status === "active";
                  const isPending = sub.status === "pending";
                  const isCancelled = sub.status === "cancelled";

                  return (
                    <div key={sub.id} className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm ${isActive ? "border-emerald-200" : isPending ? "border-amber-300" : "border-zinc-200"}`}>
                      {/* Cabeçalho */}
                      <div className={`p-4 ${isActive ? "bg-gradient-to-r from-emerald-50 to-white" : isPending ? "bg-amber-50" : "bg-zinc-50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? "bg-emerald-100" : isPending ? "bg-amber-100" : "bg-zinc-200"}`}>
                              <Crown size={16} className={isActive ? "text-emerald-600" : isPending ? "text-amber-600" : "text-zinc-400"} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-zinc-900">{sub.planName}</p>
                              <p className="text-[10px] text-zinc-500">{fmt(sub.price ?? sub.planPrice)}/{cycleLabel(sub.billingCycle).toLowerCase()}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-xl border ${
                            isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isPending ? "bg-amber-100 text-amber-700 border-amber-300"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                          }`}>
                            {isActive ? "Ativo" : isPending ? "Pendente" : isCancelled ? "Cancelado" : sub.status}
                          </span>
                        </div>

                        {included.length > 0 && (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
                            {included.map((s: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                                <Check size={9} className="text-emerald-500 shrink-0" /> {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Créditos — só ativo */}
                      {isActive && cr && (
                        <div className="px-4 py-3 border-t border-zinc-100">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Créditos do ciclo</p>
                            <p className={`text-[10px] font-black ${remaining === 0 ? "text-red-500" : "text-emerald-600"}`}>{remaining}/{total}</p>
                          </div>
                          <div className="bg-zinc-100 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full transition-all ${pct >= 100 ? "bg-red-400" : pct > 60 ? "bg-amber-400" : "bg-emerald-400"}`}
                              style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1.5">{used} usado{used !== 1 ? "s" : ""} · vence {fmtDate(cr.cycleEnd)}</p>
                        </div>
                      )}

                      {/* Datas */}
                      <div className="px-4 py-3 grid grid-cols-2 gap-2 border-t border-zinc-100">
                        <div className="bg-zinc-50 rounded-xl p-2.5">
                          <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wide">{isActive ? "Próx. cobrança" : "Solicitado em"}</p>
                          <p className="text-xs font-black text-zinc-900 mt-0.5">{fmtDate(isActive ? sub.nextChargeDate : sub.currentPeriodStart)}</p>
                        </div>
                        <div className="bg-zinc-50 rounded-xl p-2.5">
                          <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-wide">Membro desde</p>
                          <p className="text-xs font-black text-zinc-900 mt-0.5">{fmtDate(sub.currentPeriodStart)}</p>
                        </div>
                      </div>

                      {/* Pendente — instruções */}
                      {isPending && (
                        <div className="px-4 pb-4 space-y-2">
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                            <AlertCircle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-zinc-700 leading-relaxed">
                              Pague <strong>{fmt(sub.price ?? sub.planPrice)}</strong> ao estabelecimento para ativar.
                            </p>
                          </div>
                          {tenant?.phone && (
                            <a href={`tel:${tenant.phone}`} className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-amber-100 border border-amber-200 text-xs font-black text-amber-700 hover:bg-amber-200 transition-colors">
                              <Phone size={12} /> Entrar em contato
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Planos disponíveis para assinar */}
            {plans.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2.5">Planos disponíveis</p>
                <div className="space-y-2">
                  {plans.map((p: any) => {
                    const included = parseIncluded(p.includedServices);
                    const alreadySigned = subs.some(s => s.membershipPlanId === p.id && (s.status === "active" || s.status === "pending"));
                    return (
                      <div key={p.id} className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${alreadySigned ? "border-zinc-100 opacity-60" : "border-zinc-200 hover:border-zinc-300"}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-900">{p.name}</p>
                            {p.description && <p className="text-[11px] text-zinc-400 mt-0.5">{p.description}</p>}
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-base font-black" style={{ color }}>{fmt(p.price)}</p>
                            <p className="text-[9px] text-zinc-400">/{cycleLabel(p.billingCycle).toLowerCase()}</p>
                          </div>
                        </div>
                        {included.length > 0 && (
                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mb-2">
                            {included.map((s: string, i: number) => (
                              <div key={i} className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <Check size={9} className="text-emerald-500 shrink-0" /> {s}
                              </div>
                            ))}
                          </div>
                        )}
                        {alreadySigned ? (
                          <div className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 mt-1"><CheckCircle size={11} className="text-emerald-500" /> Já assinado</div>
                        ) : (
                          <button onClick={() => { setShowSubscribeModal(true); }}
                            className="mt-1 h-8 px-4 rounded-xl text-[11px] font-black text-white flex items-center gap-1.5 transition-colors"
                            style={{ background: color }}>
                            <Crown size={11} /> Assinar este plano
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAGAMENTOS ─────────────────────────────────────────────────────── */}
        {tab === "pagamentos" && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-zinc-900">Histórico de Pagamentos</h2>
            {tabLoading ? (
              <div className="py-12"><Spinner color={color} /></div>
            ) : payments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center shadow-sm">
                <CreditCard size={32} className="text-zinc-200 mx-auto mb-2" />
                <p className="text-sm font-black text-zinc-900 mb-1">Nenhum pagamento</p>
                <p className="text-xs text-zinc-400">Os pagamentos aparecem conforme forem registrados pelo estabelecimento.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p: any, i: number) => (
                  <div key={p.id || i} className="bg-white rounded-2xl border border-zinc-200 p-3.5 flex items-center gap-3 shadow-sm">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${p.status === "paid" ? "bg-emerald-100" : "bg-amber-100"}`}>
                      {p.status === "paid" ? <CheckCircle size={18} className="text-emerald-600" /> : <Clock size={18} className="text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-zinc-900 truncate">{p.planName || "Plano"}</p>
                      <p className="text-[10px] text-zinc-400">
                        {fmtDate(p.paidAt || p.dueDate)}{p.method ? ` · ${p.method}` : ""}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(t => {
            const active = tab === t.id;
            const hasBadge = t.id === "assinaturas" && pendingSubs.length > 0;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex-1 flex flex-col items-center gap-1 pt-3 pb-2 transition-all relative ${active ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"}`}>
                <div className="relative">
                  <t.icon size={19} style={active ? { color } : undefined} />
                  {hasBadge && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />}
                </div>
                <span className="text-[9px] font-black tracking-wide" style={active ? { color } : undefined}>{t.label}</span>
                {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full" style={{ background: color }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modais */}
      {showSubscribeModal && plans.length > 0 && (
        <SubscribeModal slug={slug} plans={plans} themeColor={color}
          onClose={() => setShowSubscribeModal(false)}
          onDone={() => { loadProfile(); toast.show("Assinatura solicitada!", "success"); }} />
      )}
      {showBookModal && (
        <BookModal slug={slug} themeColor={color}
          onClose={() => setShowBookModal(false)}
          onDone={() => { loadTab("agenda"); toast.show("Agendamento criado!", "success"); }} />
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

  const handleLogout = () => { sessionStorage.removeItem("portal_token"); setAuthed(false); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!tenantInfo?.tenant) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="text-center">
        <AlertCircle size={40} className="text-zinc-300 mx-auto mb-3" />
        <p className="text-sm font-black text-zinc-900">Estabelecimento não encontrado</p>
        <p className="text-xs text-zinc-500 mt-1">Verifique o link e tente novamente.</p>
      </div>
    </div>
  );

  if (!authed || !slug) return <AuthScreen slug={slug || ""} tenantInfo={tenantInfo} onAuth={() => setAuthed(true)} />;

  return <PortalDashboard slug={slug} tenantInfo={tenantInfo} onLogout={handleLogout} />;
}
