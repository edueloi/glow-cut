import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import {
  LayoutDashboard, Users, Building2, CreditCard,
  LogOut, Plus, Edit2, Trash2, X, Check, ChevronDown,
  Shield, Eye, EyeOff, ToggleLeft, ToggleRight,
  TrendingUp, Crown, Search, Mail, Globe, User, Lock,
} from "lucide-react";
import logoFavicon from "../images/system/logo-favicon.png";

/* ═══════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════ */
type TabKey = "dash" | "plans" | "tenants" | "users" | "permissions" | "staff" | "profile";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gerente",
  viewer: "Visualizador",
};

/* ═══════════════════════════════════════════
   COMPONENTES BASE
═══════════════════════════════════════════ */
function Badge({ children, color = "zinc" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    zinc: "bg-zinc-100 text-zinc-600 border-zinc-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-600 border-red-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider", colors[color] ?? colors.zinc)}>
      {children}
    </span>
  );
}

function StatCard({ icon, label, value, sub, color = "amber" }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    violet: "text-violet-600 bg-violet-50 border-violet-100",
  };
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("p-2.5 rounded-xl border", colors[color])}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{label}</p>
          <p className="text-xl font-black text-zinc-900">{value}</p>
          {sub && <p className="text-[10px] text-zinc-400 font-medium">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children, width = "max-w-lg" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("relative bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full flex flex-col", width)} style={{ maxHeight: "90dvh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
          <h3 className="text-sm font-black text-zinc-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn("w-full text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none disabled:opacity-50", props.className)}
    />
  );
}

function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={cn("w-full appearance-none text-xs p-2.5 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none", props.className)}>
        {children}
      </select>
      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
    </div>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={cn("w-full text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none resize-none", props.className)} />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} className={cn("w-9 h-5 rounded-full border flex items-center cursor-pointer transition-colors shrink-0", checked ? "bg-amber-500 border-amber-500" : "bg-zinc-200 border-zinc-300")}>
      <div className={cn("w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5", checked ? "translate-x-4" : "translate-x-0")} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: DASHBOARD
═══════════════════════════════════════════ */
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/super-admin/stats").then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <div className="flex items-center justify-center h-40 text-zinc-400 text-xs font-bold">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black text-zinc-900">Painel Geral</h2>
        <p className="text-[11px] text-zinc-400 mt-0.5">Visão geral da plataforma</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Building2 size={16} />} label="Parceiros" value={stats.totalTenants} sub={`${stats.activeTenants} ativos`} color="amber" />
        <StatCard icon={<Users size={16} />} label="Usuários Admin" value={stats.totalAdmins} sub={`${stats.activeAdmins} ativos`} color="blue" />
        <StatCard icon={<CreditCard size={16} />} label="Planos Ativos" value={stats.plans?.filter((p: any) => p.isActive).length ?? 0} color="violet" />
        <StatCard icon={<TrendingUp size={16} />} label="Plano Top" value={stats.plans?.sort((a: any, b: any) => b._count.tenants - a._count.tenants)[0]?.name ?? "—"} color="emerald" />
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest">Distribuição por Plano</h3>
        </div>
        <div className="divide-y divide-zinc-100">
          {stats.plans?.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-zinc-800">{p.name}</p>
                <p className="text-[10px] text-zinc-400">R$ {Number(p.price).toFixed(2)}/mês</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-zinc-900">{p._count.tenants}</p>
                <p className="text-[10px] text-zinc-400">parceiros</p>
              </div>
              <div className="w-20 bg-zinc-100 rounded-full h-1.5 hidden sm:block">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${stats.totalTenants > 0 ? (p._count.tenants / stats.totalTenants) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: PLANOS
═══════════════════════════════════════════ */
function PlansTab() {
  const [plans, setPlans] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { name: "", price: "", maxProfessionals: "3", maxAdminUsers: "1", canCreateAdminUsers: false, canDeleteAccount: false, features: "" };
  const [form, setForm] = useState<any>(emptyForm);

  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/plans");
    setPlans(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ ...p, features: JSON.parse(p.features || "[]").join("\n"), price: String(p.price) });
    setModal(true);
  };

  const save = async () => {
    const body = {
      ...form,
      price: parseFloat(form.price || "0"),
      maxProfessionals: parseInt(form.maxProfessionals || "3"),
      maxAdminUsers: parseInt(form.maxAdminUsers || "1"),
      features: form.features.split("\n").map((s: string) => s.trim()).filter(Boolean),
    };
    const url = editing ? `/api/super-admin/plans/${editing.id}` : "/api/super-admin/plans";
    await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setModal(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    await fetch(`/api/super-admin/plans/${id}`, { method: "DELETE" });
    load();
  };

  const toggle = async (p: any) => {
    await fetch(`/api/super-admin/plans/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, features: JSON.parse(p.features || "[]"), isActive: !p.isActive }) });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-zinc-900">Planos de Assinatura</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">{plans.length} plano{plans.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors">
          <Plus size={13} /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {plans.map(p => {
          const features: string[] = JSON.parse(p.features || "[]");
          return (
            <div key={p.id} className={cn("bg-white rounded-2xl border shadow-sm p-5 space-y-3 flex flex-col", p.isActive ? "border-zinc-200" : "border-zinc-100 opacity-60")}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-zinc-900">{p.name}</h3>
                    {!p.isActive && <Badge color="zinc">Inativo</Badge>}
                  </div>
                  <p className="text-lg font-black text-amber-600 mt-0.5">R$ {Number(p.price).toFixed(2)}<span className="text-xs text-zinc-400 font-medium">/mês</span></p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggle(p)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                    {p.isActive ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} />}
                  </button>
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => del(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-50 rounded-xl p-2.5 text-center">
                  <p className="text-base font-black text-zinc-800">{p.maxProfessionals === 999 ? "∞" : p.maxProfessionals}</p>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Profissionais</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-2.5 text-center">
                  <p className="text-base font-black text-zinc-800">{p.maxAdminUsers === 999 ? "∞" : p.maxAdminUsers}</p>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Admins</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {p.canCreateAdminUsers && <Badge color="violet">Criar usuários</Badge>}
                {p.canDeleteAccount && <Badge color="red">Excluir conta</Badge>}
              </div>
              {features.length > 0 && (
                <ul className="space-y-1">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] text-zinc-600">
                      <Check size={10} className="text-emerald-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Editar Plano" : "Novo Plano"}>
        <div className="space-y-3">
          <Field label="Nome do Plano"><Input placeholder="Ex: Pro" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Preço/mês (R$)"><Input type="number" placeholder="99.90" value={form.price} onChange={e => setForm((p: any) => ({ ...p, price: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Máx. Profissionais"><Input type="number" value={form.maxProfessionals} onChange={e => setForm((p: any) => ({ ...p, maxProfessionals: e.target.value }))} /></Field>
            <Field label="Máx. Admin Users"><Input type="number" value={form.maxAdminUsers} onChange={e => setForm((p: any) => ({ ...p, maxAdminUsers: e.target.value }))} /></Field>
          </div>
          <Field label="Permissões">
            <div className="space-y-2.5 pt-1">
              {[
                { key: "canCreateAdminUsers", label: "Pode criar usuários admin" },
                { key: "canDeleteAccount", label: "Pode excluir a conta" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <Toggle checked={!!form[key]} onChange={() => setForm((p: any) => ({ ...p, [key]: !p[key] }))} />
                  <span className="text-xs font-semibold text-zinc-700">{label}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Funcionalidades (uma por linha)">
            <Textarea rows={4} placeholder={"Agenda\nClientes\nComandas"} value={form.features} onChange={e => setForm((p: any) => ({ ...p, features: e.target.value }))} />
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
            <button onClick={save} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: PARCEIROS
═══════════════════════════════════════════ */
// Calcula status visual do tenant baseado em datas
// Status automático:
// Ativo           → dentro do prazo
// Vence em Xd     → faltam ≤7 dias para vencer
// Graça: Xd       → venceu, mas ainda nos 7 dias de tolerância
// Bloqueado       → venceu há mais de 7 dias, ou desativado manualmente (<90 dias)
// Inativo         → bloqueado há mais de 90 dias
function getTenantStatus(t: any): { label: string; color: string } {
  const now = new Date();

  if (!t.isActive) {
    if (t.blockedAt) {
      const blockedDays = (now.getTime() - new Date(t.blockedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (blockedDays > 90) return { label: "Inativo", color: "red" };
    }
    return { label: "Bloqueado", color: "zinc" };
  }

  if (t.expiresAt) {
    const diffDays = (new Date(t.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < -7) return { label: "Bloqueado", color: "zinc" };           // venceu > 7 dias atrás
    if (diffDays < 0)  return { label: `Graça: ${7 + Math.ceil(diffDays)}d`, color: "amber" }; // dentro dos 7 dias de graça
    if (diffDays <= 7) return { label: `Vence em ${Math.ceil(diffDays)}d`, color: "amber" };   // prestes a vencer
  }

  return { label: "Ativo", color: "emerald" };
}

function TenantsTab({ plans }: { plans: any[] }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const emptyForm = { name: "", slug: "", ownerName: "", ownerEmail: "", ownerPhone: "", planId: "", notes: "", adminPassword: "", expiresAt: "", maxAdminUsersOverride: "", isActive: true };
  const [form, setForm] = useState<any>(emptyForm);
  const [showPwd, setShowPwd] = useState(false);

  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  };

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const toInputDate = (d: string | null | undefined) => {
    if (!d) return "";
    return new Date(d).toISOString().slice(0, 10);
  };

  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/tenants");
    setTenants(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (plans.length) setForm((p: any) => p.planId ? p : { ...p, planId: plans[0]?.id ?? "" }); }, [plans]);

  const openCreate = () => {
    const expires = new Date(); expires.setDate(expires.getDate() + 30);
    setEditing(null);
    setForm({ ...emptyForm, planId: plans[0]?.id ?? "", _slugEdited: false, expiresAt: expires.toISOString().slice(0, 10) });
    setModal(true);
  };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      name: t.name, slug: t.slug, ownerName: t.ownerName, ownerEmail: t.ownerEmail,
      ownerPhone: t.ownerPhone ?? "", planId: t.planId, notes: t.notes ?? "",
      adminPassword: "", isActive: t.isActive,
      expiresAt: toInputDate(t.expiresAt),
      maxAdminUsersOverride: t.maxAdminUsersOverride ?? "",
    });
    setModal(true);
  };

  const save = async () => {
    const payload: any = { ...form };
    if (payload.maxAdminUsersOverride === "") payload.maxAdminUsersOverride = null;
    if (payload.expiresAt === "") payload.expiresAt = null;
    const url = editing ? `/api/super-admin/tenants/${editing.id}` : "/api/super-admin/tenants";
    const r = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { const e = await r.json(); alert(e.error); return; }
    setModal(false);
    load();
  };

  const del = (t: any) => setDeleteConfirm(t);
  
  const confirmDel = async () => {
    if (!deleteConfirm) return;
    await fetch(`/api/super-admin/tenants/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    load();
  };

  const toggleActive = async (t: any) => {
    await fetch(`/api/super-admin/tenants/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !t.isActive }) });
    load();
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    t.ownerEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-black text-zinc-900">Parceiros</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">{tenants.length} parceiro{tenants.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="text-xs pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400 w-44 font-medium" />
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors">
            <Plus size={13} /> Novo Parceiro
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>{["Parceiro", "Proprietário", "Plano", "Usuários", "Criado em", "Validade", "Status", ""].map(h => <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-xs text-zinc-400">Nenhum parceiro encontrado</td></tr>}
              {filtered.map(t => {
                const status = getTenantStatus(t);
                return (
                  <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-black text-zinc-900">{t.name}</p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1"><Globe size={9} />{t.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-zinc-700">{t.ownerName}</p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1"><Mail size={9} />{t.ownerEmail}</p>
                    </td>
                    <td className="px-4 py-3"><Badge color="amber">{t.plan?.name || "Sem Plano"}</Badge></td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-black text-zinc-700">{t.adminuser?.length ?? 0}</span>
                      {t.maxAdminUsersOverride && <span className="text-[10px] text-zinc-400">/{t.maxAdminUsersOverride}</span>}
                      <span className="text-[10px] text-zinc-400"> users</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                    <td className="px-4 py-3 text-[11px] whitespace-nowrap">
                      {t.expiresAt ? (
                        <span className={new Date(t.expiresAt) < new Date() ? "text-red-500 font-bold" : "text-zinc-500"}>
                          {fmtDate(t.expiresAt)}
                        </span>
                      ) : <span className="text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(t)}>
                        <Badge color={status.color}>{status.label}</Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetail(t)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><Eye size={13} /></button>
                        <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => del(t)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Editar Parceiro" : "Novo Parceiro"} width="max-w-xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do Negócio"><Input placeholder="Minha Empresa" value={form.name} onChange={e => {
              const name = e.target.value;
              const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
              setForm((p: any) => ({ ...p, name, ...(!p._slugEdited && { slug }) }));
            }} /></Field>
            <Field label="Slug (URL)"><Input placeholder="meu-negocio" value={form.slug} onChange={e => {
              const slug = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
              setForm((p: any) => ({ ...p, slug, _slugEdited: true }));
            }} disabled={!!editing} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do Proprietário"><Input placeholder="João Silva" value={form.ownerName} onChange={e => setForm((p: any) => ({ ...p, ownerName: e.target.value }))} /></Field>
            <Field label="E-mail"><Input type="email" placeholder="joao@email.com" value={form.ownerEmail} onChange={e => setForm((p: any) => ({ ...p, ownerEmail: e.target.value }))} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone"><Input placeholder="(11) 99999-9999" value={form.ownerPhone} onChange={e => setForm((p: any) => ({ ...p, ownerPhone: maskPhone(e.target.value) }))} /></Field>
            <Field label="Plano">
              <Sel value={form.planId} onChange={e => setForm((p: any) => ({ ...p, planId: e.target.value }))}>
                {plans.map(pl => <option key={pl.id} value={pl.id}>{pl.name} — R$ {Number(pl.price).toFixed(2)}</option>)}
              </Sel>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Validade (vencimento)"><Input type="date" value={form.expiresAt} onChange={e => setForm((p: any) => ({ ...p, expiresAt: e.target.value }))} /></Field>
            <Field label="Limite de Usuários Admin (override)"><Input type="number" min={1} placeholder="Padrão do plano" value={form.maxAdminUsersOverride} onChange={e => setForm((p: any) => ({ ...p, maxAdminUsersOverride: e.target.value }))} /></Field>
          </div>
          {editing && (
            <Field label="Status">
              <Sel value={form.isActive ? "1" : "0"} onChange={e => setForm((p: any) => ({ ...p, isActive: e.target.value === "1" }))}>
                <option value="1">Ativo</option>
                <option value="0">Bloqueado / Inativo</option>
              </Sel>
            </Field>
          )}
          {!editing && (
            <Field label="Senha do Admin Inicial">
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} placeholder="Senha para o proprietário entrar" value={form.adminPassword} onChange={e => setForm((p: any) => ({ ...p, adminPassword: e.target.value }))} className="pr-10" />
                <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>
          )}
          <Field label="Observações"><Textarea rows={2} placeholder="Notas internas..." value={form.notes} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} /></Field>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
            <button onClick={save} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors">{editing ? "Salvar" : "Criar Parceiro"}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ""} width="max-w-md">
        {detail && (() => {
          const status = getTenantStatus(detail);
          const now = new Date();
          const daysLeft = detail.expiresAt ? Math.ceil((new Date(detail.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-50 rounded-xl p-3"><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Plano</p><p className="text-sm font-black text-zinc-800 mt-0.5">{detail.plan?.name}</p></div>
                <div className="bg-zinc-50 rounded-xl p-3"><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Status</p><p className={cn("text-sm font-black mt-0.5", status.color === "emerald" ? "text-emerald-600" : status.color === "red" ? "text-red-500" : "text-amber-500")}>{status.label}</p></div>
                <div className="bg-zinc-50 rounded-xl p-3"><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Usuários</p><p className="text-sm font-black text-zinc-800 mt-0.5">{detail.adminuser?.length ?? 0}{detail.maxAdminUsersOverride ? `/${detail.maxAdminUsersOverride}` : ""}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 rounded-xl p-3"><p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Criado em</p><p className="text-xs font-bold text-zinc-700 mt-0.5">{fmtDate(detail.createdAt)}</p></div>
                <div className={cn("rounded-xl p-3", daysLeft !== null && daysLeft <= 7 ? "bg-amber-50 border border-amber-200" : "bg-zinc-50")}>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Validade</p>
                  <p className={cn("text-xs font-bold mt-0.5", daysLeft !== null && daysLeft <= 0 ? "text-red-500" : daysLeft !== null && daysLeft <= 7 ? "text-amber-600" : "text-zinc-700")}>
                    {detail.expiresAt ? `${fmtDate(detail.expiresAt)}${daysLeft !== null ? ` (${daysLeft > 0 ? `${daysLeft}d restantes` : `${Math.abs(daysLeft)}d vencido`})` : ""}` : "Sem validade"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Usuários Admin</p>
                {detail.adminuser?.length === 0 && <p className="text-xs text-zinc-400">Nenhum usuário</p>}
                {detail.adminuser?.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2 p-2.5 bg-zinc-50 rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">{(u.name || "?").charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold text-zinc-800 truncate">{u.name || "—"}</p><p className="text-[10px] text-zinc-400 truncate">{u.email}</p></div>
                    <Badge color={u.isActive ? "emerald" : "zinc"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </div>
                ))}
              </div>
              {detail.notes && <div className="bg-amber-50 border border-amber-100 rounded-xl p-3"><p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Observações</p><p className="text-xs text-zinc-700">{detail.notes}</p></div>}
            </div>
          );
        })()}
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" width="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Tem certeza que deseja excluir o parceiro <strong className="text-zinc-900">{deleteConfirm?.name}</strong> e todos os seus usuários? Esta ação <strong>não pode ser desfeita</strong>.
          </p>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={confirmDel} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm">Sim, excluir</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: USUÁRIOS ADMIN
═══════════════════════════════════════════ */
function UsersTab({ tenants }: { tenants: any[] }) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);
  const emptyForm = { name: "", email: "", password: "", role: "admin", jobTitle: "", bio: "", phone: "", canCreateUsers: false, canDeleteAccount: false, tenantId: "" };
  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  };
  const [form, setForm] = useState<any>(emptyForm);

  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/admin-users");
    setUsers(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tenants.length) setForm((p: any) => p.tenantId ? p : { ...p, tenantId: tenants[0]?.id ?? "" }); }, [tenants]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, tenantId: tenants[0]?.id ?? "" }); setShowPass(false); setModal(true); };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, jobTitle: u.jobTitle ?? "", bio: u.bio ?? "", phone: u.phone ?? "", canCreateUsers: u.canCreateUsers, canDeleteAccount: u.canDeleteAccount, tenantId: u.tenantId });
    setShowPass(false);
    setModal(true);
  };

  const save = async () => {
    const url = editing ? `/api/super-admin/admin-users/${editing.id}` : "/api/super-admin/admin-users";
    const r = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) { const e = await r.json(); alert(e.error); return; }
    setModal(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este usuário?")) return;
    await fetch(`/api/super-admin/admin-users/${id}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (u: any) => {
    await fetch(`/api/super-admin/admin-users/${u.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...u, isActive: !u.isActive }) });
    load();
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.tenant?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-black text-zinc-900">Usuários Admin</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">{users.length} usuário{users.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="text-xs pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400 w-44 font-medium" />
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm transition-colors">
            <Plus size={13} /> Novo Usuário
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>{["Usuário", "Parceiro", "Cargo / Nível", "Permissões", "Status", ""].map(h => <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-xs text-zinc-400">Nenhum usuário encontrado</td></tr>}
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">{(u.name || "?").charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-zinc-900 truncate">{u.name || "Sem Nome"}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><p className="text-xs font-semibold text-zinc-600 truncate max-w-[110px]">{u.tenant?.name ?? "—"}</p></td>
                  <td className="px-4 py-3">
                    <Badge color="amber">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    {u.jobTitle && <p className="text-[10px] text-zinc-400 mt-0.5">{u.jobTitle}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {u.canCreateUsers && <Badge color="violet">Criar usuários</Badge>}
                      {u.canDeleteAccount && <Badge color="red">Excluir conta</Badge>}
                      {!u.canCreateUsers && !u.canDeleteAccount && <span className="text-[10px] text-zinc-400">Básico</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(u)}>{u.isActive ? <Badge color="emerald">Ativo</Badge> : <Badge color="zinc">Inativo</Badge>}</button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => del(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Editar Usuário" : "Novo Usuário Admin"} width="max-w-xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome Completo"><Input placeholder="João Silva" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="E-mail"><Input type="email" placeholder="joao@email.com" value={form.email} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></Field>
          </div>
          <Field label={editing ? "Nova Senha (em branco = manter)" : "Senha"}>
            <div className="relative">
              <Input type={showPass ? "text" : "password"} placeholder={editing ? "Nova senha..." : "Senha de acesso"} value={form.password} onChange={e => setForm((p: any) => ({ ...p, password: e.target.value }))} className="pr-9" />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">{showPass ? <EyeOff size={13} /> : <Eye size={13} />}</button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parceiro">
              <Sel value={form.tenantId} onChange={e => setForm((p: any) => ({ ...p, tenantId: e.target.value }))} disabled={!!editing}>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Sel>
            </Field>
            <Field label="Nível de Acesso">
              <Sel value={form.role} onChange={e => setForm((p: any) => ({ ...p, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="manager">Gerente</option>
                <option value="viewer">Visualizador</option>
              </Sel>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo / Função"><Input placeholder="Ex: Gerente, Recepcionista" value={form.jobTitle} onChange={e => setForm((p: any) => ({ ...p, jobTitle: e.target.value }))} /></Field>
            <Field label="Telefone de Contato"><Input placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm((p: any) => ({ ...p, phone: maskPhone(e.target.value) }))} /></Field>
          </div>
          <Field label="Bio / O que faz no sistema"><Textarea rows={2} placeholder="Descreva a função deste usuário..." value={form.bio} onChange={e => setForm((p: any) => ({ ...p, bio: e.target.value }))} /></Field>
          <Field label="Permissões Extras">
            <div className="space-y-2.5 pt-1">
              {[
                { key: "canCreateUsers", label: "Pode criar novos usuários admin" },
                { key: "canDeleteAccount", label: "Pode excluir a conta do parceiro" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <Toggle checked={!!form[key]} onChange={() => setForm((p: any) => ({ ...p, [key]: !p[key] }))} />
                  <span className="text-xs font-semibold text-zinc-700">{label}</span>
                </label>
              ))}
            </div>
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
            <button onClick={save} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors">{editing ? "Salvar Alterações" : "Criar Usuário"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: PERMISSÕES
═══════════════════════════════════════════ */
const ALL_PERMISSIONS = [
  { key: "agenda", label: "Agenda & Reservas", desc: "Ver, criar, editar e cancelar agendamentos" },
  { key: "clientes", label: "Gestão de Clientes", desc: "Cadastrar, editar e visualizar clientes" },
  { key: "servicos", label: "Serviços & Pacotes", desc: "Criar e editar serviços e pacotes" },
  { key: "comandas", label: "Comandas", desc: "Abrir, editar e fechar comandas" },
  { key: "fluxo", label: "Fluxo de Caixa", desc: "Ver e registrar entradas e saídas" },
  { key: "profissionais", label: "Profissionais", desc: "Cadastrar e editar profissionais da equipe" },
  { key: "horarios", label: "Horários", desc: "Definir horários de funcionamento" },
  { key: "configuracoes", label: "Configurações", desc: "Acessar configurações gerais do sistema" },
  { key: "relatorios", label: "Relatórios", desc: "Ver relatórios e métricas" },
  { key: "criar_usuarios", label: "Criar Usuários Admin", desc: "Adicionar novos usuários ao painel" },
  { key: "excluir_conta", label: "Excluir Conta", desc: "Encerrar definitivamente a conta do parceiro" },
];

const ROLE_PRESETS: Record<string, string[]> = {
  admin: ["agenda", "clientes", "servicos", "comandas", "fluxo", "profissionais", "horarios", "configuracoes", "relatorios", "criar_usuarios"],
  manager: ["agenda", "clientes", "servicos", "comandas", "fluxo", "relatorios"],
  viewer: ["agenda", "relatorios"],
};

function PermissionsTab({ tenants }: { tenants: any[] }) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterTenant, setFilterTenant] = useState("all");

  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/admin-users");
    setUsers(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectUser = (u: any) => {
    setSelectedUser(u);
    // Derive current permissions from user flags + role preset
    const base = ROLE_PRESETS[u.role] ?? [];
    const extra: string[] = [];
    if (u.canCreateUsers) extra.push("criar_usuarios");
    if (u.canDeleteAccount) extra.push("excluir_conta");
    const merged = [...new Set([...base, ...extra])];
    setPermissions(merged);
    setSaved(false);
  };

  const applyPreset = (role: string) => {
    setPermissions(ROLE_PRESETS[role] ?? []);
    setSaved(false);
  };

  const toggle = (key: string) => {
    setPermissions(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    setSaved(false);
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const body = {
      ...selectedUser,
      role: selectedUser.role,
      canCreateUsers: permissions.includes("criar_usuarios"),
      canDeleteAccount: permissions.includes("excluir_conta"),
    };
    await fetch(`/api/super-admin/admin-users/${selectedUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filteredUsers = users.filter(u => filterTenant === "all" || u.tenantId === filterTenant);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-black text-zinc-900">Permissões de Acesso</h2>
        <p className="text-[11px] text-zinc-400 mt-0.5">Defina quais módulos cada usuário pode acessar</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de usuários */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-100 shrink-0">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Selecionar Usuário</p>
            <Sel value={filterTenant} onChange={e => setFilterTenant(e.target.value)}>
              <option value="all">Todos os parceiros</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Sel>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-zinc-100" style={{ maxHeight: 420 }}>
            {filteredUsers.length === 0 && <p className="text-xs text-zinc-400 text-center py-8">Nenhum usuário</p>}
            {filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => selectUser(u)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors",
                  selectedUser?.id === u.id ? "bg-amber-50 border-l-2 border-amber-500" : "hover:bg-zinc-50 border-l-2 border-transparent"
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-800 truncate">{u.name}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{u.tenant?.name ?? "—"}</p>
                </div>
                <Badge color={u.isActive ? "emerald" : "zinc"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Painel de permissões */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                <Lock size={20} className="text-zinc-400" />
              </div>
              <p className="text-xs font-bold text-zinc-500">Selecione um usuário para editar suas permissões</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-zinc-100 shrink-0">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0">{selectedUser.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="text-xs font-black text-zinc-900">{selectedUser.name}</p>
                      <p className="text-[10px] text-zinc-400">{selectedUser.tenant?.name} · {ROLE_LABELS[selectedUser.role]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Preset:</p>
                    {Object.keys(ROLE_PRESETS).map(r => (
                      <button key={r} onClick={() => applyPreset(r)} className="text-[10px] font-black px-2 py-1 rounded-lg border border-zinc-200 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-colors uppercase tracking-wider">
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_PERMISSIONS.map(perm => {
                    const active = permissions.includes(perm.key);
                    return (
                      <button
                        key={perm.key}
                        onClick={() => toggle(perm.key)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                          active ? "bg-amber-50 border-amber-300" : "bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        <div className={cn("w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 mt-0.5 transition-all", active ? "bg-amber-500 border-amber-500" : "border-zinc-300 bg-white")}>
                          {active && <Check size={10} className="text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className={cn("text-xs font-bold", active ? "text-amber-800" : "text-zinc-700")}>{perm.label}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{perm.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-zinc-100 shrink-0 flex items-center justify-between">
                <p className="text-[10px] text-zinc-400"><span className="font-black text-zinc-700">{permissions.length}</span> de {ALL_PERMISSIONS.length} permissões ativas</p>
                <button
                  onClick={savePermissions}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    saved ? "bg-emerald-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"
                  )}
                >
                  {saved ? <><Check size={13} /> Salvo!</> : saving ? "Salvando..." : "Salvar Permissões"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: EQUIPE (STAFF)
   Acesso interno à plataforma (outros Super Admins)
═══════════════════════════════════════════ */
function StaffTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  const sessionUser = (() => { try { return JSON.parse(localStorage.getItem("superAdminLogged") || "{}").username || ""; } catch { return ""; } })();
  const isMaster = sessionUser.toLowerCase() === "admin" || sessionUser.toLowerCase() === "flavio_sikorsky";

  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/staff");
    setUsers(await r.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const url = editing ? `/api/super-admin/staff/${editing.id}` : "/api/super-admin/staff";
    const r = await fetch(url, {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (!r.ok) { alert("Erro ao salvar usuário"); return; }
    setModal(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este acesso administrativo?")) return;
    await fetch(`/api/super-admin/staff/${id}`, { method: "DELETE" });
    load();
  };

  const openForm = (u?: any) => {
    if (!isMaster && !u) return; // Não adm não pode criar novo
    if (!isMaster && u && u.username !== sessionUser) return; // Não adm não pode editar os outros
    
    setEditing(u || null);
    setForm({ username: u?.username || "", password: "" });
    setModal(true);
  };

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-zinc-900">Minha Equipe (Super Admins)</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">{users.length} usuário(s) com acesso mestre</p>
        </div>
        {isMaster && (
          <button onClick={() => openForm()} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors">
            <Plus size={13} /> Adicionar Equipe
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Usuário</th>
              <th className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Acesso desde</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black">{u.username.charAt(0).toUpperCase()}</div>
                    <p className="text-xs font-black text-zinc-900">{u.username}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-[11px] text-zinc-500">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(isMaster || u.username === sessionUser) && (
                      <button onClick={() => openForm(u)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><Edit2 size={13} /></button>
                    )}
                    {isMaster && u.username !== sessionUser && (
                      <button onClick={() => del(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Editar Acesso" : "Novo Acesso Equipe"}>
        <div className="space-y-3">
          <Field label="Nome de Usuário (Login)"><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Ex: amanda_admin" /></Field>
          <Field label={editing ? "Nova Senha (deixe em branco para não alterar)" : "Senha"}>
            <div className="relative">
              <Input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 py-2 text-xs font-bold text-zinc-400">Cancelar</button>
            <button onClick={save} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">Salvar Equipe</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: MEU PERFIL
═══════════════════════════════════════════ */
function ProfileTab({ username }: { username: string }) {
  return (
    <div className="space-y-4 max-w-md">
      <div>
        <h2 className="text-base font-black text-zinc-900">Meu Perfil</h2>
        <p className="text-[11px] text-zinc-400 mt-0.5">Conta do Super Administrador</p>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown size={28} className="text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-zinc-900">{username}</p>
            <Badge color="amber">Super Admin</Badge>
            <p className="text-[10px] text-zinc-400">Proprietário da Plataforma</p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
          <Shield size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
            Esta é a conta master da plataforma. Acesso total e irrestrito a todos os parceiros e usuários. <strong>Não aparece</strong> na lista de usuários de nenhum parceiro.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between py-2.5 border-b border-zinc-100">
            <span className="text-xs text-zinc-500 font-semibold">Usuário</span>
            <span className="text-xs font-black text-zinc-900">{username}</span>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-zinc-100">
            <span className="text-xs text-zinc-500 font-semibold">Nível</span>
            <Badge color="amber">Super Administrador</Badge>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-zinc-100">
            <span className="text-xs text-zinc-500 font-semibold">Acesso</span>
            <span className="text-xs font-black text-emerald-600">Total — Irrestrito</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-xs text-zinc-500 font-semibold">Rota</span>
            <span className="text-[11px] font-mono font-bold text-zinc-400">/super-admin</span>
          </div>
        </div>

        {username.toLowerCase() === "admin" || username.toLowerCase() === "flavio_sikorsky" ? (
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Credenciais padrão</p>
            <p className="text-[11px] text-zinc-600 font-medium">Login: <strong className="text-zinc-800">Admin</strong> · Senha: <strong className="text-zinc-800">super123</strong></p>
            <p className="text-[9px] text-amber-600 font-bold mt-1">⚠️ Altere a senha diretamente no banco de dados em produção.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
const NAV_ITEMS: { key: TabKey; icon: React.ReactNode; label: string; path: string }[] = [
  { key: "dash",        icon: <LayoutDashboard size={17} />, label: "Dashboard",      path: "/super-admin" },
  { key: "plans",       icon: <CreditCard size={17} />,      label: "Planos",         path: "/super-admin/planos" },
  { key: "tenants",     icon: <Building2 size={17} />,       label: "Parceiros",      path: "/super-admin/parceiros" },
  { key: "users",       icon: <Users size={17} />,           label: "Usuários Admin", path: "/super-admin/usuarios" },
  { key: "permissions", icon: <Lock size={17} />,            label: "Permissões",     path: "/super-admin/permissoes" },
  { key: "staff",       icon: <Shield size={17} />,          label: "Minha Equipe",   path: "/super-admin/equipe" },
  { key: "profile",     icon: <User size={17} />,            label: "Meu Perfil",     path: "/super-admin/perfil" },
];

function pathToTab(pathname: string): TabKey {
  if (pathname === "/super-admin" || pathname === "/super-admin/") return "dash";
  if (pathname.includes("/planos"))      return "plans";
  if (pathname.includes("/parceiros"))   return "tenants";
  if (pathname.includes("/usuarios"))    return "users";
  if (pathname.includes("/permissoes"))  return "permissions";
  if (pathname.includes("/equipe"))      return "staff";
  if (pathname.includes("/perfil"))      return "profile";
  return "dash";
}

interface SidebarProps {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  username: string;
  onLogout: () => void;
  onClose?: () => void;
}

function Sidebar({ tab, setTab, username, onLogout, onClose }: SidebarProps) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30">
            <Crown size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-white">Super Admin</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-lg bg-indigo-500 flex items-center justify-center">
                <img src={logoFavicon} alt="Logo" className="w-3.5 h-3.5 object-contain invert" />
              </div>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Agendelle</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => { setTab(item.key); navigate(item.path); onClose?.(); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
              tab === item.key
                ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-5 pt-3 shrink-0 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Shield size={13} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">{username}</p>
            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-widest">Super Admin</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-bold"
        >
          <LogOut size={15} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */
export default function SuperAdminDashboard({ username, onLogout }: { username: string; onLogout: () => void }) {
  const location = useLocation();
  const [tab, setTab] = useState<TabKey>(() => pathToTab(location.pathname));

  useEffect(() => {
    setTab(pathToTab(location.pathname));
  }, [location.pathname]);
  const [plans, setPlans] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch("/api/super-admin/plans").then(r => r.json()).then(setPlans);
    fetch("/api/super-admin/tenants").then(r => r.json()).then(setTenants);
  }, []);

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:block w-56 shrink-0">
        <Sidebar tab={tab} setTab={setTab} username={username} onLogout={onLogout} />
      </aside>

      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 shadow-2xl">
            <Sidebar tab={tab} setTab={setTab} username={username} onLogout={onLogout} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-zinc-200 px-4 md:px-6 py-3 flex items-center gap-3 shrink-0">
          <button className="md:hidden p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors" onClick={() => setMobileOpen(true)}>
            <LayoutDashboard size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-zinc-900">{NAV_ITEMS.find(n => n.key === tab)?.label}</p>
            <p className="text-[10px] text-zinc-400 hidden sm:block">Plataforma Agendelle — Painel de Controle</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl">
            <Crown size={11} className="text-amber-600" />
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider hidden sm:block">Super Admin</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {tab === "dash"        && <DashboardTab />}
          {tab === "plans"       && <PlansTab />}
          {tab === "tenants"     && <TenantsTab plans={plans} />}
          {tab === "users"       && <UsersTab tenants={tenants} />}
          {tab === "permissions" && <PermissionsTab tenants={tenants} />}
          {tab === "staff"       && <StaffTab />}
          {tab === "profile"     && <ProfileTab username={username} />}
        </div>
      </main>
    </div>
  );
}
