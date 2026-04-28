import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Crown, CreditCard, Calendar, User, LogOut, Eye, EyeOff,
  CheckCircle, Clock, XCircle, ChevronRight, ArrowLeft,
  Lock, Mail, Phone, Star, Repeat, TrendingUp, AlertCircle,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const API = "/api/portal";
function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0); }
function fmtDate(d?: string | null) { if (!d) return "—"; return new Date(d).toLocaleDateString("pt-BR"); }
function cycleLabel(c: string) { return ({ monthly: "Mensal", quarterly: "Trimestral", yearly: "Anual", weekly: "Semanal" } as any)[c] || c; }

function portalFetch(slug: string, path: string, opts?: RequestInit) {
  const token = sessionStorage.getItem("portal_token");
  return fetch(`${API}/${slug}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
}

// ── Login / Register ─────────────────────────────────────────────────────────
function AuthScreen({ slug, tenantInfo, onAuth }: { slug: string; tenantInfo: any; onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

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

  const tName = tenantInfo?.tenant?.name || "Estabelecimento";
  const logo = tenantInfo?.tenant?.logoUrl;
  const color = tenantInfo?.tenant?.themeColor || "#f59e0b";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {logo ? <img src={logo} alt={tName} className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover shadow-lg" /> : (
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg" style={{ background: color }}><Crown size={28} className="text-white" /></div>
          )}
          <h1 className="text-xl font-black text-zinc-900">{tName}</h1>
          <p className="text-xs text-zinc-500 mt-1">Portal do Cliente</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex bg-zinc-100 rounded-xl p-1">
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 text-xs font-black py-2 rounded-lg transition-all ${mode === m ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400"}`}>
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <>
              <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Nome *</label>
                <input className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} /></div>
              <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Telefone</label>
                <input className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="(11) 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} /></div>
            </>
          )}

          <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">E-mail *</label>
            <input type="email" className="w-full border border-zinc-200 rounded-xl px-3 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>

          <div><label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Senha *</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} className="w-full border border-zinc-200 rounded-xl px-3 pr-10 h-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400" placeholder="••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">{showPass ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <button onClick={submit} disabled={loading || !email || !password || (mode === "register" && !name)}
            className="w-full h-11 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: color }}>
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </div>

        {/* Planos públicos */}
        {tenantInfo?.plans?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-black text-zinc-900 mb-3 text-center">Planos disponíveis</h2>
            <div className="space-y-3">
              {tenantInfo.plans.map((p: any) => {
                let included: string[] = [];
                try { included = JSON.parse(p.includedServices || "[]"); } catch { included = p.includedServices?.split(",").map((s: string) => s.trim()).filter(Boolean) || []; }
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-black text-zinc-900">{p.name}</p>
                      <p className="text-sm font-black" style={{ color }}>{fmt(p.price)}<span className="text-[10px] text-zinc-400 font-bold">/{cycleLabel(p.billingCycle).toLowerCase()}</span></p>
                    </div>
                    {p.description && <p className="text-xs text-zinc-500 mb-2">{p.description}</p>}
                    {included.length > 0 && <div className="space-y-1">{included.map((s: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-600"><CheckCircle size={11} className="text-emerald-500 shrink-0" /> {s}</div>
                    ))}</div>}
                    <p className="text-[10px] text-zinc-400 mt-2">{p.creditsPerCycle} crédito(s) por ciclo</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard do Cliente ─────────────────────────────────────────────────────
function PortalDashboard({ slug, onLogout }: { slug: string; onLogout: () => void }) {
  const [tab, setTab] = useState<"home" | "appointments" | "credits" | "payments">("home");
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalFetch(slug, "/me"); const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setProfile(d);
    } catch { onLogout(); } finally { setLoading(false); }
  }, [slug, onLogout]);

  useEffect(() => { load(); }, [load]);

  const loadTab = useCallback(async (t: string) => {
    try {
      if (t === "appointments") { const r = await portalFetch(slug, "/appointments"); setAppointments(await r.json()); }
      if (t === "credits") { const r = await portalFetch(slug, "/credits"); setCredits(await r.json()); }
      if (t === "payments") { const r = await portalFetch(slug, "/payments"); setPayments(await r.json()); }
    } catch {}
  }, [slug]);

  useEffect(() => { if (tab !== "home") loadTab(tab); }, [tab, loadTab]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!profile) return null;

  const client = profile.client;
  const subs = profile.subscriptions || [];
  const activeSubs = subs.filter((s: any) => s.status === "active");

  const tabs = [
    { id: "home", label: "Início", icon: Crown },
    { id: "appointments", label: "Agenda", icon: Calendar },
    { id: "credits", label: "Créditos", icon: Star },
    { id: "payments", label: "Pagamentos", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center"><User size={15} className="text-amber-600" /></div>
          <div><p className="text-sm font-black text-zinc-900 leading-none">{client?.name}</p><p className="text-[10px] text-zinc-400">{client?.email}</p></div>
        </div>
        <button onClick={onLogout} className="text-zinc-400 hover:text-red-500 transition-colors"><LogOut size={16} /></button>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-zinc-200 px-2 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-black whitespace-nowrap border-b-2 transition-all ${tab === t.id ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-400"}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* HOME */}
        {tab === "home" && (
          <div className="space-y-4">
            {activeSubs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 text-center">
                <Crown size={32} className="text-zinc-300 mx-auto mb-3" />
                <p className="text-sm font-black text-zinc-900 mb-1">Sem assinaturas ativas</p>
                <p className="text-xs text-zinc-500">Você ainda não possui planos ativos. Fale com o estabelecimento para assinar um plano.</p>
              </div>
            ) : activeSubs.map((sub: any) => {
              const cr = sub.currentCredit;
              const used = cr ? Number(cr.usedCredits) : 0;
              const total = cr ? Number(cr.totalCredits) : 0;
              const remaining = total - used;
              const pct = total > 0 ? (used / total) * 100 : 0;
              return (
                <div key={sub.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center"><Crown size={14} className="text-amber-600" /></div>
                        <div><p className="text-sm font-black text-zinc-900">{sub.planName}</p><p className="text-[10px] text-zinc-400">{fmt(sub.price)}/{cycleLabel(sub.billingCycle).toLowerCase()}</p></div>
                      </div>
                      <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-200">Ativo</span>
                    </div>
                    {sub.description && <p className="text-xs text-zinc-500 mt-2">{sub.description}</p>}
                  </div>

                  {cr && (
                    <div className="p-4 bg-zinc-50">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Créditos do ciclo</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-zinc-200 rounded-full h-2.5"><div className="bg-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                        <p className="text-xs font-black text-zinc-700 whitespace-nowrap">{used}/{total}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-zinc-400">Vence: {fmtDate(cr.cycleEnd)}</p>
                        <p className="text-[10px] font-black text-emerald-600">{remaining} restante(s)</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4 grid grid-cols-2 gap-2 border-t border-zinc-100">
                    <div className="bg-zinc-50 rounded-xl p-2.5 text-center"><p className="text-[10px] text-zinc-400">Próxima cobrança</p><p className="text-xs font-black text-zinc-900">{fmtDate(sub.nextChargeDate)}</p></div>
                    <div className="bg-zinc-50 rounded-xl p-2.5 text-center"><p className="text-[10px] text-zinc-400">Membro desde</p><p className="text-xs font-black text-zinc-900">{fmtDate(sub.currentPeriodStart)}</p></div>
                  </div>
                </div>
              );
            })}

            {/* Assinaturas pendentes/canceladas */}
            {subs.filter((s: any) => s.status !== "active").length > 0 && (
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Outros planos</p>
                {subs.filter((s: any) => s.status !== "active").map((sub: any) => (
                  <div key={sub.id} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${sub.status === "pending" ? "bg-amber-100" : "bg-zinc-100"}`}>
                      {sub.status === "pending" ? <Clock size={14} className="text-amber-500" /> : <XCircle size={14} className="text-zinc-400" />}
                    </div>
                    <div className="flex-1"><p className="text-xs font-black text-zinc-900">{sub.planName}</p><p className="text-[10px] text-zinc-400">{sub.status === "pending" ? "Pendente" : "Cancelado"}</p></div>
                    <p className="text-xs font-black text-zinc-500">{fmt(sub.price)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS */}
        {tab === "appointments" && (
          <div className="space-y-2">
            <p className="text-sm font-black text-zinc-900 mb-3">Seus agendamentos</p>
            {appointments.length === 0 ? (
              <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center"><Calendar size={28} className="text-zinc-300 mx-auto mb-2" /><p className="text-xs text-zinc-500">Nenhum agendamento encontrado.</p></div>
            ) : appointments.map((a: any, i: number) => (
              <div key={a.id || i} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.status === "realizado" ? "bg-emerald-100" : a.status === "cancelado" || a.status === "faltou" ? "bg-red-100" : "bg-blue-100"}`}>
                  <Calendar size={14} className={a.status === "realizado" ? "text-emerald-600" : a.status === "cancelado" || a.status === "faltou" ? "text-red-500" : "text-blue-600"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-900 truncate">{a.serviceName || "Serviço"}</p>
                  <p className="text-[10px] text-zinc-400">{fmtDate(a.date)} · {a.startTime}{a.professionalName ? ` · ${a.professionalName}` : ""}</p>
                </div>
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${a.status === "realizado" ? "bg-emerald-50 text-emerald-600" : a.status === "cancelado" || a.status === "faltou" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>
                  {a.status === "realizado" ? "Realizado" : a.status === "cancelado" ? "Cancelado" : a.status === "faltou" ? "Faltou" : a.status === "scheduled" ? "Agendado" : a.status || "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* CREDITS */}
        {tab === "credits" && (
          <div className="space-y-2">
            <p className="text-sm font-black text-zinc-900 mb-3">Histórico de créditos</p>
            {credits.length === 0 ? (
              <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center"><Star size={28} className="text-zinc-300 mx-auto mb-2" /><p className="text-xs text-zinc-500">Nenhum histórico de créditos.</p></div>
            ) : credits.map((c: any, i: number) => {
              const used = Number(c.usedCredits); const total = Number(c.totalCredits);
              return (
                <div key={c.id || i} className="bg-white rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-zinc-900">{c.planName || "Plano"}</p>
                    <span className="text-[10px] font-bold text-zinc-400">{fmtDate(c.cycleStart)} → {fmtDate(c.cycleEnd)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-zinc-100 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{ width: `${total > 0 ? (used / total) * 100 : 0}%` }} /></div>
                    <span className="text-xs font-black text-zinc-700">{used}/{total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PAYMENTS */}
        {tab === "payments" && (
          <div className="space-y-2">
            <p className="text-sm font-black text-zinc-900 mb-3">Histórico de pagamentos</p>
            {payments.length === 0 ? (
              <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center"><CreditCard size={28} className="text-zinc-300 mx-auto mb-2" /><p className="text-xs text-zinc-500">Nenhum pagamento registrado.</p></div>
            ) : payments.map((p: any, i: number) => (
              <div key={p.id || i} className="bg-white rounded-xl border border-zinc-200 p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.status === "paid" ? "bg-emerald-100" : "bg-amber-100"}`}>
                  {p.status === "paid" ? <CheckCircle size={14} className="text-emerald-600" /> : <Clock size={14} className="text-amber-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-900">{p.planName || "Plano"}</p>
                  <p className="text-[10px] text-zinc-400">{fmtDate(p.paidAt || p.dueDate)}{p.method ? ` · ${p.method}` : ""}</p>
                </div>
                <p className="text-sm font-black text-zinc-900">{fmt(p.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ClientPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [authed, setAuthed] = useState(!!sessionStorage.getItem("portal_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/${slug}/tenant-info`).then(r => r.json()).then(setTenantInfo).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  const handleLogout = () => { sessionStorage.removeItem("portal_token"); setAuthed(false); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!tenantInfo?.tenant) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="text-center"><AlertCircle size={40} className="text-zinc-300 mx-auto mb-3" /><p className="text-sm font-black text-zinc-900">Estabelecimento não encontrado</p><p className="text-xs text-zinc-500 mt-1">Verifique o link e tente novamente.</p></div>
    </div>
  );

  if (!authed || !slug) return <AuthScreen slug={slug || ""} tenantInfo={tenantInfo} onAuth={() => setAuthed(true)} />;
  return <PortalDashboard slug={slug} onLogout={handleLogout} />;
}
