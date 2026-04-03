import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/src/lib/utils";
import {
  LayoutDashboard, Users, Building2, CreditCard, Settings,
  LogOut, Plus, Edit2, Trash2, X, Check, ChevronDown,
  Shield, Eye, EyeOff, ToggleLeft, ToggleRight,
  TrendingUp, UserCheck, Package, Crown, Search,
  Phone, Mail, Globe, FileText, AlertTriangle, User,
} from "lucide-react";

/* ─── helpers ─────────────────────────────────────────── */
function cls(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(" ");
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gerente",
  viewer: "Visualizador",
};

/* ─── sub-components ──────────────────────────────────── */
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
            <X size={15} />
          </button>
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

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn("w-full text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none", props.className)}
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn("w-full appearance-none text-xs p-2.5 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none", props.className)}
      >
        {children}
      </select>
      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
    </div>
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn("w-full text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none resize-none", props.className)}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   DASHBOARD TAB
───────────────────────────────────────────────────────── */
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/stats");
    setStats(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!stats) return <div className="flex items-center justify-center h-40 text-zinc-400 text-xs font-bold">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black text-zinc-900">Painel Geral</h2>
        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">Visão geral da plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Building2 size={16} />} label="Parceiros" value={stats.totalTenants} sub={`${stats.activeTenants} ativos`} color="amber" />
        <StatCard icon={<Users size={16} />} label="Usuários Admin" value={stats.totalAdmins} sub={`${stats.activeAdmins} ativos`} color="blue" />
        <StatCard icon={<CreditCard size={16} />} label="Planos Ativos" value={stats.plans?.filter((p: any) => p.isActive).length ?? 0} color="violet" />
        <StatCard icon={<TrendingUp size={16} />} label="Plano Top" value={stats.plans?.sort((a: any, b: any) => b._count.tenants - a._count.tenants)[0]?.name ?? "-"} color="emerald" />
      </div>

      {/* Plans breakdown */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h3 className="text-xs font-black text-zinc-800 uppercase tracking-widest">Distribuição por Plano</h3>
        </div>
        <div className="divide-y divide-zinc-100">
          {stats.plans?.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-zinc-800">{p.name}</p>
                <p className="text-[10px] text-zinc-400 font-medium">R$ {Number(p.price).toFixed(2)}/mês</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-zinc-900">{p._count.tenants}</p>
                <p className="text-[10px] text-zinc-400">parceiros</p>
              </div>
              <div className="w-20 bg-zinc-100 rounded-full h-1.5 hidden sm:block">
                <div
                  className="bg-amber-400 h-1.5 rounded-full"
                  style={{ width: `${stats.totalTenants > 0 ? (p._count.tenants / stats.totalTenants) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PLANS TAB
───────────────────────────────────────────────────────── */
function PlansTab() {
  const [plans, setPlans] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const empty = { name: "", price: "", maxProfessionals: "3", maxAdminUsers: "1", canCreateAdminUsers: false, canDeleteAccount: false, features: "" };
  const [form, setForm] = useState<any>(empty);

  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/plans");
    setPlans(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
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
    const method = editing ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
          <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{plans.length} plano{plans.length !== 1 ? "s" : ""} cadastrado{plans.length !== 1 ? "s" : ""}</p>
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
                  <button onClick={() => toggle(p)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors" title={p.isActive ? "Desativar" : "Ativar"}>
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
                    <li key={i} className="flex items-center gap-2 text-[11px] text-zinc-600 font-medium">
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
          <Field label="Nome do Plano">
            <Input placeholder="Ex: Pro" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
          </Field>
          <Field label="Preço/mês (R$)">
            <Input type="number" placeholder="99.90" value={form.price} onChange={e => setForm((p: any) => ({ ...p, price: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Máx. Profissionais">
              <Input type="number" placeholder="5" value={form.maxProfessionals} onChange={e => setForm((p: any) => ({ ...p, maxProfessionals: e.target.value }))} />
            </Field>
            <Field label="Máx. Admin Users">
              <Input type="number" placeholder="3" value={form.maxAdminUsers} onChange={e => setForm((p: any) => ({ ...p, maxAdminUsers: e.target.value }))} />
            </Field>
          </div>
          <Field label="Permissões">
            <div className="space-y-2">
              {[
                { key: "canCreateAdminUsers", label: "Pode criar usuários admin" },
                { key: "canDeleteAccount", label: "Pode excluir a conta" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => setForm((p: any) => ({ ...p, [key]: !p[key] }))}
                    className={cn("w-8 h-4.5 rounded-full border transition-colors flex items-center cursor-pointer", form[key] ? "bg-amber-500 border-amber-500" : "bg-zinc-200 border-zinc-300")}
                  >
                    <div className={cn("w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-0.5", form[key] ? "translate-x-3" : "translate-x-0")} />
                  </div>
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

/* ─────────────────────────────────────────────────────────
   TENANTS TAB
───────────────────────────────────────────────────────── */
function TenantsTab({ plans }: { plans: any[] }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const empty = { name: "", slug: "", ownerName: "", ownerEmail: "", ownerPhone: "", planId: plans[0]?.id ?? "", notes: "", adminPassword: "" };
  const [form, setForm] = useState<any>(empty);

  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/tenants");
    setTenants(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (plans.length && !form.planId) setForm((p: any) => ({ ...p, planId: plans[0]?.id ?? "" })); }, [plans]);

  const openCreate = () => { setEditing(null); setForm({ ...empty, planId: plans[0]?.id ?? "" }); setModal(true); };
  const openEdit = (t: any) => { setEditing(t); setForm({ name: t.name, slug: t.slug, ownerName: t.ownerName, ownerEmail: t.ownerEmail, ownerPhone: t.ownerPhone ?? "", planId: t.planId, notes: t.notes ?? "", adminPassword: "" }); setModal(true); };

  const save = async () => {
    const url = editing ? `/api/super-admin/tenants/${editing.id}` : "/api/super-admin/tenants";
    const method = editing ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) { const e = await r.json(); alert(e.error); return; }
    setModal(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir parceiro e todos os seus usuários?")) return;
    await fetch(`/api/super-admin/tenants/${id}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (t: any) => {
    await fetch(`/api/super-admin/tenants/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...t, isActive: !t.isActive }) });
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
          <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{tenants.length} parceiro{tenants.length !== 1 ? "s" : ""} cadastrado{tenants.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar parceiro..."
              className="text-xs pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400 w-48 font-medium"
            />
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
              <tr>
                {["Parceiro", "Proprietário", "Plano", "Usuários", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-xs text-zinc-400 font-medium">Nenhum parceiro encontrado</td></tr>
              )}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-black text-zinc-900">{t.name}</p>
                    <p className="text-[10px] text-zinc-400 font-medium flex items-center gap-1"><Globe size={9} />{t.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-zinc-700">{t.ownerName}</p>
                    <p className="text-[10px] text-zinc-400 flex items-center gap-1"><Mail size={9} />{t.ownerEmail}</p>
                  </td>
                  <td className="px-4 py-3"><Badge color="amber">{t.plan?.name}</Badge></td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-black text-zinc-700">{t.adminUsers?.length ?? 0}</span>
                    <span className="text-[10px] text-zinc-400"> usuários</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(t)}>
                      {t.isActive
                        ? <Badge color="emerald">Ativo</Badge>
                        : <Badge color="red">Inativo</Badge>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetail(t)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><Eye size={13} /></button>
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => del(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Editar Parceiro" : "Novo Parceiro"} width="max-w-xl">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do Salão/Barbearia">
              <Input placeholder="Glow & Cut Studio" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="Slug (URL)">
              <Input placeholder="glow-cut" value={form.slug} onChange={e => setForm((p: any) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} disabled={!!editing} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do Proprietário">
              <Input placeholder="João Silva" value={form.ownerName} onChange={e => setForm((p: any) => ({ ...p, ownerName: e.target.value }))} />
            </Field>
            <Field label="E-mail do Proprietário">
              <Input type="email" placeholder="joao@email.com" value={form.ownerEmail} onChange={e => setForm((p: any) => ({ ...p, ownerEmail: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <Input placeholder="(11) 99999-9999" value={form.ownerPhone} onChange={e => setForm((p: any) => ({ ...p, ownerPhone: e.target.value }))} />
            </Field>
            <Field label="Plano">
              <Select value={form.planId} onChange={e => setForm((p: any) => ({ ...p, planId: e.target.value }))}>
                {plans.map(pl => <option key={pl.id} value={pl.id}>{pl.name} — R$ {Number(pl.price).toFixed(2)}</option>)}
              </Select>
            </Field>
          </div>
          {!editing && (
            <Field label="Senha do Admin Inicial">
              <Input type="password" placeholder="Senha para o proprietário entrar" value={form.adminPassword} onChange={e => setForm((p: any) => ({ ...p, adminPassword: e.target.value }))} />
            </Field>
          )}
          <Field label="Observações">
            <Textarea rows={2} placeholder="Notas internas..." value={form.notes} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} />
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
            <button onClick={save} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors">
              {editing ? "Salvar" : "Criar Parceiro"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail drawer */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ""} width="max-w-md">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Plano</p>
                <p className="text-sm font-black text-zinc-800 mt-0.5">{detail.plan?.name}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Status</p>
                <p className={cn("text-sm font-black mt-0.5", detail.isActive ? "text-emerald-600" : "text-red-500")}>
                  {detail.isActive ? "Ativo" : "Inativo"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Usuários Admin</p>
              {detail.adminUsers?.length === 0 && <p className="text-xs text-zinc-400">Nenhum usuário</p>}
              {detail.adminUsers?.map((u: any) => (
                <div key={u.id} className="flex items-center gap-2 p-2.5 bg-zinc-50 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-800 truncate">{u.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{u.email}</p>
                  </div>
                  <Badge color={u.isActive ? "emerald" : "zinc"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                </div>
              ))}
            </div>
            {detail.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Observações</p>
                <p className="text-xs text-zinc-700 font-medium">{detail.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   USERS TAB
───────────────────────────────────────────────────────── */
function UsersTab({ plans: _plans, tenants }: { plans: any[]; tenants: any[] }) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);
  const empty = { name: "", email: "", password: "", role: "admin", jobTitle: "", bio: "", phone: "", canCreateUsers: false, canDeleteAccount: false, tenantId: tenants[0]?.id ?? "" };
  const [form, setForm] = useState<any>(empty);

  const load = useCallback(async () => {
    const r = await fetch("/api/super-admin/admin-users");
    setUsers(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tenants.length && !form.tenantId) setForm((p: any) => ({ ...p, tenantId: tenants[0]?.id ?? "" })); }, [tenants]);

  const openCreate = () => { setEditing(null); setForm({ ...empty, tenantId: tenants[0]?.id ?? "" }); setShowPass(false); setModal(true); };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, jobTitle: u.jobTitle ?? "", bio: u.bio ?? "", phone: u.phone ?? "", canCreateUsers: u.canCreateUsers, canDeleteAccount: u.canDeleteAccount, tenantId: u.tenantId });
    setShowPass(false);
    setModal(true);
  };

  const save = async () => {
    const url = editing ? `/api/super-admin/admin-users/${editing.id}` : "/api/super-admin/admin-users";
    const method = editing ? "PUT" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
    u.tenant?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-black text-zinc-900">Usuários Admin</h2>
          <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{users.length} usuário{users.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuário..." className="text-xs pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400 w-48 font-medium" />
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
              <tr>
                {["Usuário", "Parceiro", "Cargo/Função", "Permissões", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-xs text-zinc-400">Nenhum usuário encontrado</td></tr>}
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-zinc-900 truncate">{u.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><p className="text-xs font-semibold text-zinc-600 truncate max-w-[120px]">{u.tenant?.name ?? "—"}</p></td>
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
                    <button onClick={() => toggleActive(u)}>
                      {u.isActive ? <Badge color="emerald">Ativo</Badge> : <Badge color="zinc">Inativo</Badge>}
                    </button>
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
            <Field label="Nome Completo">
              <Input placeholder="João Silva" value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="E-mail">
              <Input type="email" placeholder="joao@email.com" value={form.email} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} />
            </Field>
          </div>
          <Field label={editing ? "Nova Senha (deixe em branco para manter)" : "Senha"}>
            <div className="relative">
              <Input type={showPass ? "text" : "password"} placeholder={editing ? "Nova senha..." : "Senha de acesso"} value={form.password} onChange={e => setForm((p: any) => ({ ...p, password: e.target.value }))} className="pr-9" />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Parceiro">
              <Select value={form.tenantId} onChange={e => setForm((p: any) => ({ ...p, tenantId: e.target.value }))} disabled={!!editing}>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Nível de Acesso">
              <Select value={form.role} onChange={e => setForm((p: any) => ({ ...p, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="manager">Gerente</option>
                <option value="viewer">Visualizador</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cargo/Função">
              <Input placeholder="Ex: Gerente, Recepcionista" value={form.jobTitle} onChange={e => setForm((p: any) => ({ ...p, jobTitle: e.target.value }))} />
            </Field>
            <Field label="Telefone de Contato">
              <Input placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} />
            </Field>
          </div>
          <Field label="Bio / O que faz no sistema">
            <Textarea rows={2} placeholder="Descreva brevemente a função deste usuário..." value={form.bio} onChange={e => setForm((p: any) => ({ ...p, bio: e.target.value }))} />
          </Field>
          <Field label="Permissões Extras">
            <div className="space-y-2 pt-1">
              {[
                { key: "canCreateUsers", label: "Pode criar novos usuários admin" },
                { key: "canDeleteAccount", label: "Pode excluir a conta do parceiro" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => setForm((p: any) => ({ ...p, [key]: !p[key] }))}
                    className={cn("w-8 h-4 rounded-full border transition-colors flex items-center cursor-pointer", form[key] ? "bg-amber-500 border-amber-500" : "bg-zinc-200 border-zinc-300")}
                    style={{ minWidth: 32 }}
                  >
                    <div className={cn("w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-0.5", form[key] ? "translate-x-3" : "translate-x-0")} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-700">{label}</span>
                </label>
              ))}
            </div>
          </Field>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setModal(false)} className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
            <button onClick={save} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors">
              {editing ? "Salvar Alterações" : "Criar Usuário"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PROFILE TAB (Super Admin)
───────────────────────────────────────────────────────── */
function ProfileTab({ saUsername }: { saUsername: string }) {
  return (
    <div className="space-y-4 max-w-md">
      <div>
        <h2 className="text-base font-black text-zinc-900">Meu Perfil</h2>
        <p className="text-[11px] text-zinc-400 font-medium mt-0.5">Conta do Super Administrador</p>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Crown size={24} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-zinc-900">{saUsername}</p>
            <Badge color="amber">Super Admin</Badge>
          </div>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
          <Shield size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
            Esta é a conta master da plataforma. Acesso total e irrestrito. Não aparece na lista de usuários dos parceiros.
          </p>
        </div>
        <div className="text-[10px] text-zinc-400 font-medium space-y-1">
          <p>• Login: <strong className="text-zinc-600">Admin</strong></p>
          <p>• Senha padrão: <strong className="text-zinc-600">super123</strong></p>
          <p className="text-[9px] text-amber-600">⚠️ Altere a senha no banco de dados em produção.</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN SUPER ADMIN DASHBOARD
───────────────────────────────────────────────────────── */
export default function SuperAdminDashboard({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [tab, setTab] = useState<"dash" | "plans" | "tenants" | "users" | "profile">("dash");
  const [plans, setPlans] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    const r = await fetch("/api/super-admin/plans");
    setPlans(await r.json());
  }, []);
  const loadTenants = useCallback(async () => {
    const r = await fetch("/api/super-admin/tenants");
    setTenants(await r.json());
  }, []);

  useEffect(() => { loadPlans(); loadTenants(); }, [loadPlans, loadTenants]);

  const navItems = [
    { key: "dash" as const, icon: <LayoutDashboard size={17} />, label: "Dashboard" },
    { key: "plans" as const, icon: <CreditCard size={17} />, label: "Planos" },
    { key: "tenants" as const, icon: <Building2 size={17} />, label: "Parceiros" },
    { key: "users" as const, icon: <Users size={17} />, label: "Usuários Admin" },
    { key: "profile" as const, icon: <User size={17} />, label: "Meu Perfil" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30">
            <Crown size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-white">Super Admin</p>
            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-widest">Glow & Cut</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => { setTab(item.key); setSidebarOpen(false); }}
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
      <div className="px-3 pb-4 shrink-0 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Shield size={13} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">{username}</p>
            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-widest">Super Admin</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-bold"
        >
          <LogOut size={15} /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex w-56 bg-zinc-950 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-56 bg-zinc-950 flex flex-col h-full shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-zinc-200 px-4 md:px-6 py-3 flex items-center gap-3 shrink-0">
          <button className="md:hidden p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors" onClick={() => setSidebarOpen(true)}>
            <LayoutDashboard size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-zinc-900">{navItems.find(n => n.key === tab)?.label}</p>
            <p className="text-[10px] text-zinc-400 font-medium hidden sm:block">Plataforma Glow & Cut — Painel de Controle</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl">
              <Crown size={11} className="text-amber-600" />
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Super Admin</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {tab === "dash" && <DashboardTab />}
          {tab === "plans" && <PlansTab />}
          {tab === "tenants" && <TenantsTab plans={plans} />}
          {tab === "users" && <UsersTab plans={plans} tenants={tenants} />}
          {tab === "profile" && <ProfileTab saUsername={username} />}
        </div>
      </main>
    </div>
  );
}
