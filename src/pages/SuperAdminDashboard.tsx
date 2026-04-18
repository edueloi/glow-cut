import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import {
  Badge,
  StatCard,
  Modal,
  Switch,
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  SectionTitle,
  StatGrid,
  ContentCard,
  PanelCard,
  FormRow,
  EmptyState,
} from "@/src/components/ui";
import {
  LayoutDashboard, Users, Building2, CreditCard,
  LogOut, Plus, Edit2, Trash2, X, Check, ChevronDown,
  Shield, Eye, EyeOff, TrendingUp, Crown, Search,
  Mail, Globe, User, Lock, MessageCircle, RefreshCw,
  Menu,
} from "lucide-react";
import logoFavicon from "../images/system/logo-favicon.png";
import { MODULE_META, DEFAULT_ROLE_PROFILES, type RoleSlug } from "@/src/lib/permissions";

/* ═══════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════ */
type TabKey = "dash" | "plans" | "tenants" | "users" | "permissions" | "staff" | "profile" | "wpp";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gerente",
  viewer: "Visualizador",
  owner: "Proprietário",
  profissional: "Profissional",
  secretaria: "Secretária(o)",
  financeiro: "Financeiro",
};

/* ═══════════════════════════════════════════
   ABA: DASHBOARD
═══════════════════════════════════════════ */
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    apiFetch("/api/super-admin/stats").then(r => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-400 text-sm font-semibold">
        Carregando...
      </div>
    );
  }

  const topPlan = stats.plans?.sort((a: any, b: any) => b._count.tenants - a._count.tenants)[0]?.name ?? "—";
  const maxTenants = Math.max(...(stats.plans?.map((p: any) => p._count.tenants) ?? [1]), 1);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Painel Geral"
        description="Visão geral da plataforma"
        icon={LayoutDashboard}
      />

      <StatGrid cols={4}>
        <StatCard icon={Building2} title="Parceiros"      value={stats.totalTenants} description={`${stats.activeTenants} ativos`}  color="default"  delay={0}    />
        <StatCard icon={Users}      title="Usuários Admin" value={stats.totalAdmins}  description={`${stats.activeAdmins} ativos`}   color="info"     delay={0.05} />
        <StatCard icon={CreditCard} title="Planos Ativos"  value={stats.plans?.filter((p: any) => p.isActive).length ?? 0}            color="purple"   delay={0.1}  />
        <StatCard icon={TrendingUp} title="Plano Top"      value={topPlan}                                                            color="success"  delay={0.15} />
      </StatGrid>

      <ContentCard padding="none">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Distribuição por Plano</h3>
        </div>
        <div className="divide-y divide-zinc-100">
          {stats.plans?.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-8">Nenhum plano cadastrado</p>
          )}
          {stats.plans?.map((p: any) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-zinc-800">{p.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">R$ {Number(p.price).toFixed(2)}/mês</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-black text-zinc-900">{p._count.tenants}</p>
                <p className="text-[10px] text-zinc-400">parceiros</p>
              </div>
              <div className="w-24 bg-zinc-100 rounded-full h-1.5 hidden sm:block shrink-0">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(p._count.tenants / maxTenants) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </ContentCard>
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
  const empty = {
    name: "", price: "", maxProfessionals: "3", maxAdminUsers: "1",
    canCreateAdminUsers: false, canDeleteAccount: false, wppEnabled: false, features: "",
  };
  const [form, setForm] = useState<any>(empty);

  const load = useCallback(async () => {
    const r = await apiFetch("/api/super-admin/plans");
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
    await apiFetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setModal(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    await apiFetch(`/api/super-admin/plans/${id}`, { method: "DELETE" });
    load();
  };

  const toggle = async (p: any) => {
    await apiFetch(`/api/super-admin/plans/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, features: JSON.parse(p.features || "[]"), isActive: !p.isActive }),
    });
    load();
  };

  const setF = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Planos de Assinatura"
        description={`${plans.length} plano${plans.length !== 1 ? "s" : ""} cadastrado${plans.length !== 1 ? "s" : ""}`}
        icon={CreditCard}
        action={
          <Button size="sm" iconLeft={<Plus size={14} />} onClick={openCreate}>
            Novo Plano
          </Button>
        }
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum plano cadastrado"
          description="Crie o primeiro plano de assinatura para começar."
          action={
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={openCreate}>
              Criar Plano
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map(p => {
            const features: string[] = JSON.parse(p.features || "[]");
            return (
              <ContentCard
                key={p.id}
                padding="none"
                className={cn("flex flex-col", !p.isActive && "opacity-60")}
              >
                <div className="p-5 space-y-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-zinc-900">{p.name}</h3>
                        {!p.isActive && <Badge color="default">Inativo</Badge>}
                      </div>
                      <p className="text-xl font-black text-amber-600 mt-1">
                        R$ {Number(p.price).toFixed(2)}
                        <span className="text-xs text-zinc-400 font-medium">/mês</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Switch checked={p.isActive} onChange={() => toggle(p)} />
                      <IconButton size="sm" variant="ghost" onClick={() => openEdit(p)}>
                        <Edit2 size={13} />
                      </IconButton>
                      <IconButton size="sm" variant="ghost" onClick={() => del(p.id)} className="hover:text-red-500 hover:bg-red-50">
                        <Trash2 size={13} />
                      </IconButton>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-50 rounded-xl p-3 text-center border border-zinc-100">
                      <p className="text-lg font-black text-zinc-800">{p.maxProfessionals === 999 ? "∞" : p.maxProfessionals}</p>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Profissionais</p>
                    </div>
                    <div className="bg-zinc-50 rounded-xl p-3 text-center border border-zinc-100">
                      <p className="text-lg font-black text-zinc-800">{p.maxAdminUsers === 999 ? "∞" : p.maxAdminUsers}</p>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Admins</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {p.canCreateAdminUsers && <Badge color="purple">Criar usuários</Badge>}
                    {p.canDeleteAccount    && <Badge color="danger">Excluir conta</Badge>}
                    {p.wppEnabled          && <Badge color="success">WhatsApp</Badge>}
                  </div>

                  {features.length > 0 && (
                    <ul className="space-y-1.5">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-zinc-600">
                          <Check size={11} className="text-emerald-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </ContentCard>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? "Editar Plano" : "Novo Plano"} size="md">
        <div className="space-y-4 p-5">
          <Input label="Nome do Plano" placeholder="Ex: Pro" value={form.name} onChange={e => setF("name", e.target.value)} />
          <Input label="Preço/mês (R$)" type="number" placeholder="99.90" value={form.price} onChange={e => setF("price", e.target.value)} />
          <FormRow cols={2}>
            <Input label="Máx. Profissionais" type="number" value={form.maxProfessionals} onChange={e => setF("maxProfessionals", e.target.value)} />
            <Input label="Máx. Admin Users" type="number" value={form.maxAdminUsers} onChange={e => setF("maxAdminUsers", e.target.value)} />
          </FormRow>
          <div className="space-y-1.5">
            <label className="ds-label">Permissões</label>
            <div className="space-y-3 pt-1">
              {[
                { key: "canCreateAdminUsers", label: "Pode criar usuários admin" },
                { key: "canDeleteAccount",    label: "Pode excluir a conta" },
                { key: "wppEnabled",          label: "WhatsApp Bot incluso no plano" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <Switch checked={!!form[key]} onChange={() => setF(key, !form[key])} />
                  <span className="text-sm font-semibold text-zinc-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <Textarea
            label="Funcionalidades (uma por linha)"
            rows={4}
            placeholder={"Agenda\nClientes\nComandas"}
            value={form.features}
            onChange={e => setF("features", e.target.value)}
          />
          <FormRow cols={2}>
            <Button variant="ghost" onClick={() => setModal(false)} fullWidth>Cancelar</Button>
            <Button onClick={save} fullWidth>Salvar</Button>
          </FormRow>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: PARCEIROS
═══════════════════════════════════════════ */
function getTenantStatus(t: any): { label: string; color: "success" | "warning" | "danger" | "default" } {
  const now = new Date();
  if (!t.isActive) {
    if (t.blockedAt) {
      const days = (now.getTime() - new Date(t.blockedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 90) return { label: "Inativo", color: "danger" };
    }
    return { label: "Bloqueado", color: "default" };
  }
  if (t.expiresAt) {
    const diff = (new Date(t.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < -7)  return { label: "Bloqueado",                           color: "default" };
    if (diff < 0)   return { label: `Graça: ${7 + Math.ceil(diff)}d`,      color: "warning" };
    if (diff <= 7)  return { label: `Vence em ${Math.ceil(diff)}d`,        color: "warning" };
  }
  return { label: "Ativo", color: "success" };
}

function TenantsTab({ plans }: { plans: any[] }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [showPwd, setShowPwd] = useState(false);
  const empty = {
    name: "", slug: "", ownerName: "", ownerEmail: "", ownerPhone: "",
    planId: "", notes: "", adminPassword: "", expiresAt: "", maxAdminUsersOverride: "", isActive: true,
  };
  const [form, setForm] = useState<any>(empty);

  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  };
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
  const toInputDate = (d: any) => d ? new Date(d).toISOString().slice(0, 10) : "";

  const load = useCallback(async () => {
    const r = await apiFetch("/api/super-admin/tenants");
    setTenants(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (plans.length) setForm((p: any) => p.planId ? p : { ...p, planId: plans[0]?.id ?? "" }); }, [plans]);

  const openCreate = () => {
    const exp = new Date(); exp.setDate(exp.getDate() + 30);
    setEditing(null);
    setForm({ ...empty, planId: plans[0]?.id ?? "", _slugEdited: false, expiresAt: exp.toISOString().slice(0, 10) });
    setModal(true);
  };
  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      name: t.name, slug: t.slug, ownerName: t.ownerName, ownerEmail: t.ownerEmail,
      ownerPhone: t.ownerPhone ?? "", planId: t.planId, notes: t.notes ?? "",
      adminPassword: "", isActive: t.isActive, expiresAt: toInputDate(t.expiresAt),
      maxAdminUsersOverride: t.maxAdminUsersOverride ?? "",
    });
    setModal(true);
  };

  const save = async () => {
    const payload: any = { ...form };
    if (payload.maxAdminUsersOverride === "") payload.maxAdminUsersOverride = null;
    if (payload.expiresAt === "") payload.expiresAt = null;
    const url = editing ? `/api/super-admin/tenants/${editing.id}` : "/api/super-admin/tenants";
    const r = await apiFetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) { const e = await r.json(); alert(e.error); return; }
    setModal(false);
    load();
  };

  const setF = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    t.ownerEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Parceiros"
        description={`${tenants.length} parceiro${tenants.length !== 1 ? "s" : ""} cadastrado${tenants.length !== 1 ? "s" : ""}`}
        icon={Building2}
        action={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder="Buscar parceiro..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              iconLeft={<Search size={14} />}
              className="w-full sm:w-48"
            />
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={openCreate} className="shrink-0">
              Novo Parceiro
            </Button>
          </div>
        }
      />

      {filtered.length === 0 && !search ? (
        <EmptyState
          icon={Building2}
          title="Nenhum parceiro cadastrado"
          description="Adicione o primeiro parceiro para começar."
          action={
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={openCreate}>
              Novo Parceiro
            </Button>
          }
        />
      ) : (
        <>
          {/* Tabela desktop */}
          <ContentCard padding="none" className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-100">
                  <tr>
                    {["Parceiro", "Proprietário", "Plano", "Usuários", "Criado em", "Validade", "Status", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-sm text-zinc-400">Nenhum resultado para "{search}"</td></tr>
                  )}
                  {filtered.map(t => {
                    const st = getTenantStatus(t);
                    return (
                      <tr key={t.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-black text-zinc-900">{t.name}</p>
                          <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5"><Globe size={9} />{t.slug}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-zinc-700">{t.ownerName}</p>
                          <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5"><Mail size={9} />{t.ownerEmail}</p>
                        </td>
                        <td className="px-4 py-3.5"><Badge color="primary">{t.plan?.name || "Sem Plano"}</Badge></td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-black text-zinc-700">{t.adminuser?.length ?? 0}</span>
                          {t.maxAdminUsersOverride && <span className="text-[10px] text-zinc-400">/{t.maxAdminUsersOverride}</span>}
                          <span className="text-[10px] text-zinc-400"> users</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                        <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                          {t.expiresAt ? (
                            <span className={new Date(t.expiresAt) < new Date() ? "text-red-500 font-bold" : "text-zinc-500"}>
                              {fmtDate(t.expiresAt)}
                            </span>
                          ) : <span className="text-zinc-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={async () => {
                            await apiFetch(`/api/super-admin/tenants/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !t.isActive }) });
                            load();
                          }}>
                            <Badge color={st.color} dot>{st.label}</Badge>
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-0.5">
                            <IconButton size="sm" variant="ghost" onClick={() => setDetail(t)}><Eye size={13} /></IconButton>
                            <IconButton size="sm" variant="ghost" onClick={() => openEdit(t)}><Edit2 size={13} /></IconButton>
                            <IconButton size="sm" variant="ghost" onClick={() => setDeleteConfirm(t)} className="hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ContentCard>

          {/* Cards mobile */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <p className="text-center text-sm text-zinc-400 py-6">Nenhum resultado para "{search}"</p>
            )}
            {filtered.map(t => {
              const st = getTenantStatus(t);
              return (
                <ContentCard key={t.id} padding="sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-zinc-900">{t.name}</p>
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5"><Globe size={9} />{t.slug}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <IconButton size="sm" variant="ghost" onClick={() => setDetail(t)}><Eye size={13} /></IconButton>
                      <IconButton size="sm" variant="ghost" onClick={() => openEdit(t)}><Edit2 size={13} /></IconButton>
                      <IconButton size="sm" variant="ghost" onClick={() => setDeleteConfirm(t)} className="hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></IconButton>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge color="primary">{t.plan?.name || "Sem Plano"}</Badge>
                    <Badge color={st.color} dot>{st.label}</Badge>
                    <span className="text-[10px] text-zinc-400">{t.ownerName}</span>
                  </div>
                  {t.expiresAt && (
                    <p className={cn("text-[10px] mt-1.5", new Date(t.expiresAt) < new Date() ? "text-red-500 font-bold" : "text-zinc-400")}>
                      Validade: {fmtDate(t.expiresAt)}
                    </p>
                  )}
                </ContentCard>
              );
            })}
          </div>
        </>
      )}

      {/* Modal criar/editar */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? "Editar Parceiro" : "Novo Parceiro"} size="lg">
        <div className="space-y-4 p-5">
          <FormRow cols={2}>
            <Input
              label="Nome do Negócio"
              placeholder="Minha Empresa"
              value={form.name}
              onChange={e => {
                const name = e.target.value;
                const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                setForm((p: any) => ({ ...p, name, ...(!p._slugEdited && { slug }) }));
              }}
            />
            <Input
              label="Slug (URL)"
              placeholder="meu-negocio"
              value={form.slug}
              onChange={e => {
                const slug = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
                setForm((p: any) => ({ ...p, slug, _slugEdited: true }));
              }}
              disabled={!!editing}
            />
          </FormRow>
          <FormRow cols={2}>
            <Input label="Nome do Proprietário" placeholder="João Silva" value={form.ownerName} onChange={e => setF("ownerName", e.target.value)} />
            <Input label="E-mail" type="email" placeholder="joao@email.com" value={form.ownerEmail} onChange={e => setF("ownerEmail", e.target.value)} />
          </FormRow>
          <FormRow cols={2}>
            <Input label="Telefone" placeholder="(11) 99999-9999" value={form.ownerPhone} onChange={e => setF("ownerPhone", maskPhone(e.target.value))} />
            <Select label="Plano" value={form.planId} onChange={e => setF("planId", e.target.value)}>
              {plans.map(pl => <option key={pl.id} value={pl.id}>{pl.name} — R$ {Number(pl.price).toFixed(2)}</option>)}
            </Select>
          </FormRow>
          <FormRow cols={2}>
            <Input label="Validade" type="date" value={form.expiresAt} onChange={e => setF("expiresAt", e.target.value)} />
            <Input label="Limite Admins (override)" type="number" min={1} placeholder="Padrão do plano" value={form.maxAdminUsersOverride} onChange={e => setF("maxAdminUsersOverride", e.target.value)} />
          </FormRow>
          {editing && (
            <Select
              label="Status"
              value={form.isActive ? "1" : "0"}
              onChange={e => setF("isActive", e.target.value === "1")}
            >
              <option value="1">Ativo</option>
              <option value="0">Bloqueado / Inativo</option>
            </Select>
          )}
          {!editing && (
            <Input
              label="Senha do Admin Inicial"
              type={showPwd ? "text" : "password"}
              placeholder="Senha para o proprietário entrar"
              value={form.adminPassword}
              onChange={e => setF("adminPassword", e.target.value)}
              iconRight={
                <button type="button" onClick={() => setShowPwd(v => !v)} className="text-zinc-400 hover:text-zinc-600">
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />
          )}
          <Textarea label="Observações" rows={2} placeholder="Notas internas..." value={form.notes} onChange={e => setF("notes", e.target.value)} />
          <FormRow cols={2}>
            <Button variant="ghost" onClick={() => setModal(false)} fullWidth>Cancelar</Button>
            <Button onClick={save} fullWidth>{editing ? "Salvar" : "Criar Parceiro"}</Button>
          </FormRow>
        </div>
      </Modal>

      {/* Modal detalhe */}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ""} size="sm">
        {detail && (() => {
          const st = getTenantStatus(detail);
          const daysLeft = detail.expiresAt ? Math.ceil((new Date(detail.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          return (
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Plano",    value: detail.plan?.name },
                  { label: "Status",   value: <Badge color={st.color} dot>{st.label}</Badge> },
                  { label: "Usuários", value: `${detail.adminuser?.length ?? 0}${detail.maxAdminUsersOverride ? `/${detail.maxAdminUsersOverride}` : ""}` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-50 rounded-xl p-3 text-center border border-zinc-100">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
                    <div className="mt-1.5 text-xs font-black text-zinc-800">{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Criado em</p>
                  <p className="text-xs font-bold text-zinc-700 mt-1">{fmtDate(detail.createdAt)}</p>
                </div>
                <div className={cn("rounded-xl p-3 border", daysLeft !== null && daysLeft <= 7 ? "bg-amber-50 border-amber-200" : "bg-zinc-50 border-zinc-100")}>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Validade</p>
                  <p className={cn("text-xs font-bold mt-1", daysLeft !== null && daysLeft <= 0 ? "text-red-500" : daysLeft !== null && daysLeft <= 7 ? "text-amber-600" : "text-zinc-700")}>
                    {detail.expiresAt ? `${fmtDate(detail.expiresAt)}${daysLeft !== null ? ` (${daysLeft > 0 ? `${daysLeft}d restantes` : `${Math.abs(daysLeft)}d vencido`})` : ""}` : "Sem validade"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Usuários Admin</p>
                {detail.adminuser?.length === 0 && <p className="text-xs text-zinc-400">Nenhum usuário</p>}
                {detail.adminuser?.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2.5 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">{(u.name || "?").charAt(0).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 truncate">{u.name || "—"}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{u.email}</p>
                    </div>
                    <Badge color={u.isActive ? "success" : "default"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </div>
                ))}
              </div>
              {detail.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Observações</p>
                  <p className="text-xs text-zinc-700">{detail.notes}</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Modal confirmar exclusão */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="xs">
        <div className="space-y-4 p-5">
          <p className="text-sm text-zinc-600">
            Excluir o parceiro <strong className="text-zinc-900">{deleteConfirm?.name}</strong> e todos os seus usuários?{" "}
            <strong>Esta ação não pode ser desfeita.</strong>
          </p>
          <FormRow cols={2}>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)} fullWidth>Cancelar</Button>
            <Button variant="danger" onClick={async () => {
              await apiFetch(`/api/super-admin/tenants/${deleteConfirm.id}`, { method: "DELETE" });
              setDeleteConfirm(null); load();
            }} fullWidth>Sim, excluir</Button>
          </FormRow>
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
  const empty = {
    name: "", email: "", password: "", role: "admin", jobTitle: "", bio: "",
    phone: "", canCreateUsers: false, canDeleteAccount: false, tenantId: "",
  };
  const [form, setForm] = useState<any>(empty);

  const maskPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  };

  const load = useCallback(async () => {
    const r = await apiFetch("/api/super-admin/admin-users");
    setUsers(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tenants.length) setForm((p: any) => p.tenantId ? p : { ...p, tenantId: tenants[0]?.id ?? "" }); }, [tenants]);

  const openCreate = () => { setEditing(null); setForm({ ...empty, tenantId: tenants[0]?.id ?? "" }); setShowPass(false); setModal(true); };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, jobTitle: u.jobTitle ?? "", bio: u.bio ?? "", phone: u.phone ?? "", canCreateUsers: u.canCreateUsers, canDeleteAccount: u.canDeleteAccount, tenantId: u.tenantId });
    setShowPass(false); setModal(true);
  };

  const save = async () => {
    const url = editing ? `/api/super-admin/admin-users/${editing.id}` : "/api/super-admin/admin-users";
    const r = await apiFetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) { const e = await r.json(); alert(e.error); return; }
    setModal(false); load();
  };

  const setF = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.tenant?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Usuários Admin"
        description={`${users.length} usuário${users.length !== 1 ? "s" : ""} cadastrado${users.length !== 1 ? "s" : ""}`}
        icon={Users}
        action={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              iconLeft={<Search size={14} />}
              className="w-full sm:w-48"
            />
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={openCreate} className="shrink-0">
              Novo Usuário
            </Button>
          </div>
        }
      />

      {filtered.length === 0 && !search ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário cadastrado"
          description="Crie o primeiro usuário admin."
          action={
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={openCreate}>
              Novo Usuário
            </Button>
          }
        />
      ) : (
        <>
          {/* Tabela desktop */}
          <ContentCard padding="none" className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-100">
                  <tr>
                    {["Usuário", "Parceiro", "Cargo / Nível", "Permissões", "Status", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-sm text-zinc-400">Nenhum resultado para "{search}"</td></tr>
                  )}
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-[11px] font-black shrink-0">{(u.name || "?").charAt(0).toUpperCase()}</div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-zinc-900 truncate">{u.name || "Sem Nome"}</p>
                            <p className="text-[10px] text-zinc-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-zinc-600 truncate max-w-[120px]">{u.tenant?.name ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <Badge color="primary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        {u.jobTitle && <p className="text-[10px] text-zinc-400 mt-0.5">{u.jobTitle}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1.5 flex-wrap">
                          {u.canCreateUsers    && <Badge color="purple">Criar usuários</Badge>}
                          {u.canDeleteAccount  && <Badge color="danger">Excluir conta</Badge>}
                          {!u.canCreateUsers && !u.canDeleteAccount && <span className="text-[10px] text-zinc-400">Básico</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button onClick={async () => {
                          await apiFetch(`/api/super-admin/admin-users/${u.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...u, isActive: !u.isActive }) });
                          load();
                        }}>
                          <Badge color={u.isActive ? "success" : "default"} dot>{u.isActive ? "Ativo" : "Inativo"}</Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-0.5">
                          <IconButton size="sm" variant="ghost" onClick={() => openEdit(u)}><Edit2 size={13} /></IconButton>
                          <IconButton size="sm" variant="ghost" onClick={async () => { if (!confirm("Excluir este usuário?")) return; await apiFetch(`/api/super-admin/admin-users/${u.id}`, { method: "DELETE" }); load(); }} className="hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ContentCard>

          {/* Cards mobile */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 && (
              <p className="text-center text-sm text-zinc-400 py-6">Nenhum resultado para "{search}"</p>
            )}
            {filtered.map(u => (
              <ContentCard key={u.id} padding="sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black shrink-0">{(u.name || "?").charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900">{u.name}</p>
                    <p className="text-xs text-zinc-400">{u.email}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{u.tenant?.name ?? "—"}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <IconButton size="sm" variant="ghost" onClick={() => openEdit(u)}><Edit2 size={13} /></IconButton>
                    <IconButton size="sm" variant="ghost" onClick={async () => { if (!confirm("Excluir?")) return; await apiFetch(`/api/super-admin/admin-users/${u.id}`, { method: "DELETE" }); load(); }} className="hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></IconButton>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge color="primary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  <Badge color={u.isActive ? "success" : "default"} dot>{u.isActive ? "Ativo" : "Inativo"}</Badge>
                </div>
              </ContentCard>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? "Editar Usuário" : "Novo Usuário Admin"} size="lg">
        <div className="space-y-4 p-5">
          <FormRow cols={2}>
            <Input label="Nome Completo" placeholder="João Silva" value={form.name} onChange={e => setF("name", e.target.value)} />
            <Input label="E-mail" type="email" placeholder="joao@email.com" value={form.email} onChange={e => setF("email", e.target.value)} />
          </FormRow>
          <Input
            label={editing ? "Nova Senha (em branco = manter)" : "Senha"}
            type={showPass ? "text" : "password"}
            placeholder={editing ? "Nova senha..." : "Senha de acesso"}
            value={form.password}
            onChange={e => setF("password", e.target.value)}
            iconRight={
              <button type="button" onClick={() => setShowPass(v => !v)} className="text-zinc-400 hover:text-zinc-600">
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            }
          />
          <FormRow cols={2}>
            <Select label="Parceiro" value={form.tenantId} onChange={e => setF("tenantId", e.target.value)} disabled={!!editing}>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select label="Nível de Acesso" value={form.role} onChange={e => setF("role", e.target.value)}>
              <option value="owner">Proprietário</option>
              <option value="admin">Admin</option>
              <option value="profissional">Profissional</option>
              <option value="secretaria">Secretária(o)</option>
              <option value="financeiro">Financeiro</option>
            </Select>
          </FormRow>
          <FormRow cols={2}>
            <Input label="Cargo / Função" placeholder="Ex: Gerente, Recepcionista" value={form.jobTitle} onChange={e => setF("jobTitle", e.target.value)} />
            <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={e => setF("phone", maskPhone(e.target.value))} />
          </FormRow>
          <div className="space-y-1.5">
            <label className="ds-label">Permissões Extras</label>
            <div className="space-y-3 pt-1">
              {[
                { key: "canCreateUsers",   label: "Pode criar novos usuários admin" },
                { key: "canDeleteAccount", label: "Pode excluir a conta do parceiro" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <Switch checked={!!form[key]} onChange={() => setF(key, !form[key])} />
                  <span className="text-sm font-semibold text-zinc-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <FormRow cols={2}>
            <Button variant="ghost" onClick={() => setModal(false)} fullWidth>Cancelar</Button>
            <Button onClick={save} fullWidth>{editing ? "Salvar Alterações" : "Criar Usuário"}</Button>
          </FormRow>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: PERMISSÕES
═══════════════════════════════════════════ */
const GROUP_LABELS: Record<string, string> = {
  principal:   "Principal",
  operacional: "Operacional",
  sistema:     "Sistema",
  admin:       "Admin",
};

const ACTION_LABELS: Record<string, string> = {
  ver:             "Ver",
  criar:           "Criar",
  editar_proprio:  "Editar (próprio)",
  editar_todos:    "Editar (todos)",
  excluir_proprio: "Excluir (próprio)",
  excluir_todos:   "Excluir (todos)",
  exportar:        "Exportar",
  financeiro:      "Financeiro",
};

function PermissionsTab({ tenants }: { tenants: any[] }) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterTenant, setFilterTenant] = useState("all");

  const load = useCallback(async () => {
    const r = await apiFetch("/api/super-admin/admin-users");
    setUsers(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectUser = (u: any) => {
    setSelectedUser(u);
    const roleProfile = DEFAULT_ROLE_PROFILES.find(p => p.id === (u.role as RoleSlug));
    const base: Record<string, Record<string, boolean>> = {};
    if (roleProfile) {
      for (const [mod, actions] of Object.entries(roleProfile.permissions)) {
        base[mod] = { ...(actions as any) };
      }
    }
    if (u.canCreateUsers) { if (!base.permissoes) base.permissoes = {}; base.permissoes.ver = true; base.permissoes.criar = true; base.permissoes.editar_todos = true; }
    setPermissions(base);
    setSaved(false);
  };

  const applyPreset = (roleId: string) => {
    const rp = DEFAULT_ROLE_PROFILES.find(p => p.id === roleId);
    if (!rp) return;
    const base: Record<string, Record<string, boolean>> = {};
    for (const [mod, actions] of Object.entries(rp.permissions)) {
      base[mod] = { ...(actions as any) };
    }
    setPermissions(base);
    setSaved(false);
  };

  const toggleAction = (mod: string, action: string) => {
    setPermissions(prev => {
      const modPerms = { ...(prev[mod] || {}) };
      modPerms[action] = !modPerms[action];
      if (action === "editar_todos"  && modPerms[action]) modPerms["editar_proprio"]  = true;
      if (action === "excluir_todos" && modPerms[action]) modPerms["excluir_proprio"] = true;
      return { ...prev, [mod]: modPerms };
    });
    setSaved(false);
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const hasPermMod = permissions["permissoes"];
    const canCreateUsers = !!(hasPermMod?.ver && hasPermMod?.criar);
    await apiFetch(`/api/super-admin/admin-users/${selectedUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...selectedUser, canCreateUsers }),
    });
    await load();
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filteredUsers = users.filter(u => filterTenant === "all" || u.tenantId === filterTenant);

  const grouped = MODULE_META.reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = [];
    acc[m.group].push(m);
    return acc;
  }, {} as Record<string, typeof MODULE_META>);

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Permissões de Acesso"
        description="Defina quais módulos cada usuário do parceiro pode acessar"
        icon={Lock}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de usuários */}
        <ContentCard padding="none" className="flex flex-col">
          <div className="px-4 py-3.5 border-b border-zinc-100 shrink-0 space-y-3">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Selecionar Usuário</p>
            <Select value={filterTenant} onChange={e => setFilterTenant(e.target.value)}>
              <option value="all">Todos os parceiros</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-zinc-100" style={{ maxHeight: 480 }}>
            {filteredUsers.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-10">Nenhum usuário</p>
            )}
            {filteredUsers.map(u => (
              <button
                key={u.id}
                onClick={() => selectUser(u)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-4 py-3.5 text-left transition-colors border-l-2",
                  selectedUser?.id === u.id ? "bg-amber-50 border-amber-500" : "hover:bg-zinc-50 border-transparent"
                )}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-[11px] font-black shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-800 truncate">{u.name}</p>
                  <p className="text-[10px] text-zinc-400 truncate">{u.tenant?.name ?? "—"}</p>
                </div>
                <Badge color={u.isActive ? "success" : "default"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
              </button>
            ))}
          </div>
        </ContentCard>

        {/* Painel de permissões */}
        <div className="lg:col-span-2">
          <ContentCard padding="none" className="flex flex-col">
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                  <Lock size={22} className="text-zinc-300" />
                </div>
                <p className="text-sm font-bold text-zinc-500">Selecione um usuário</p>
                <p className="text-xs text-zinc-400 mt-1">para editar suas permissões</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-zinc-100 shrink-0">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0">{selectedUser.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-black text-zinc-900">{selectedUser.name}</p>
                        <p className="text-xs text-zinc-400">{selectedUser.tenant?.name} · {ROLE_LABELS[selectedUser.role]}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Preset:</span>
                      {DEFAULT_ROLE_PROFILES.map(rp => (
                        <button
                          key={rp.id}
                          onClick={() => applyPreset(rp.id)}
                          className="text-[9px] font-black px-2 py-1 rounded-lg border border-zinc-200 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-colors uppercase tracking-wider"
                        >
                          {rp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: 460 }}>
                  {Object.entries(grouped).map(([group, mods]) => (
                    <div key={group}>
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2.5">{GROUP_LABELS[group]}</p>
                      <div className="space-y-2">
                        {mods.map(mod => {
                          const modPerms = permissions[mod.key] || {};
                          const hasAny = mod.actions.some(a => modPerms[a]);
                          return (
                            <div key={mod.key} className={cn("rounded-xl border p-3.5 transition-all", hasAny ? "bg-amber-50/50 border-amber-200" : "bg-zinc-50 border-zinc-200")}>
                              <div className="flex items-center justify-between mb-2.5">
                                <p className={cn("text-xs font-black", hasAny ? "text-amber-900" : "text-zinc-700")}>{mod.label}</p>
                                <button
                                  onClick={() => {
                                    if (hasAny) {
                                      setPermissions(p => { const n = { ...p }; delete n[mod.key]; return n; });
                                    } else {
                                      const all: Record<string, boolean> = {};
                                      mod.actions.forEach(a => all[a] = true);
                                      setPermissions(p => ({ ...p, [mod.key]: all }));
                                    }
                                    setSaved(false);
                                  }}
                                  className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-colors", hasAny ? "text-amber-700 hover:bg-amber-100" : "text-zinc-400 hover:bg-zinc-200")}
                                >
                                  {hasAny ? "Remover tudo" : "Tudo"}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {mod.actions.map(action => {
                                  const active = !!modPerms[action];
                                  return (
                                    <button
                                      key={action}
                                      onClick={() => toggleAction(mod.key, action)}
                                      className={cn(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-bold transition-all",
                                        active ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                      )}
                                    >
                                      {active && <Check size={9} />}
                                      {ACTION_LABELS[action] ?? action}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-5 py-4 border-t border-zinc-100 shrink-0 flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-400">
                    <span className="font-black text-zinc-700">{Object.values(permissions).reduce((n, m) => n + Object.values(m).filter(Boolean).length, 0)}</span> ações ativas
                  </p>
                  <Button
                    size="sm"
                    variant={saved ? "success" : "primary"}
                    onClick={savePermissions}
                    loading={saving}
                    iconLeft={saved ? <Check size={13} /> : undefined}
                  >
                    {saved ? "Salvo!" : "Salvar Permissões"}
                  </Button>
                </div>
              </>
            )}
          </ContentCard>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: EQUIPE (STAFF)
═══════════════════════════════════════════ */
function StaffTab({ username }: { username: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const isMaster = ["admin", "flavio_sikorsky"].includes(username.toLowerCase());

  const load = useCallback(async () => {
    const r = await apiFetch("/api/super-admin/staff");
    setUsers(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const url = editing ? `/api/super-admin/staff/${editing.id}` : "/api/super-admin/staff";
    const r = await apiFetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!r.ok) { alert("Erro ao salvar"); return; }
    setModal(false); load();
  };

  const openForm = (u?: any) => {
    if (!isMaster && !u) return;
    if (!isMaster && u && u.username !== username) return;
    setEditing(u || null); setForm({ username: u?.username || "", password: "" }); setModal(true);
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Minha Equipe"
        description={`${users.length} usuário(s) com acesso mestre`}
        icon={Shield}
        action={
          isMaster ? (
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={() => openForm()}>
              Adicionar
            </Button>
          ) : undefined
        }
      />

      {users.length === 0 ? (
        <EmptyState icon={Shield} title="Nenhum usuário na equipe" />
      ) : (
        <ContentCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  {["Usuário", "Acesso desde", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-[11px] font-black shrink-0">{u.username.charAt(0).toUpperCase()}</div>
                        <p className="text-sm font-black text-zinc-900">{u.username}</p>
                        {u.username === username && <Badge color="primary">Você</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-zinc-500">{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {(isMaster || u.username === username) && (
                          <IconButton size="sm" variant="ghost" onClick={() => openForm(u)}><Edit2 size={13} /></IconButton>
                        )}
                        {isMaster && u.username !== username && (
                          <IconButton size="sm" variant="ghost" onClick={async () => { if (!confirm("Excluir acesso?")) return; await apiFetch(`/api/super-admin/staff/${u.id}`, { method: "DELETE" }); load(); }} className="hover:text-red-500 hover:bg-red-50">
                            <Trash2 size={13} />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? "Editar Acesso" : "Novo Acesso Equipe"} size="sm">
        <div className="space-y-4 p-5">
          <Input
            label="Nome de Usuário (Login)"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder="Ex: amanda_admin"
          />
          <Input
            label={editing ? "Nova Senha (branco = manter)" : "Senha"}
            type={showPass ? "text" : "password"}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="••••••"
            iconRight={
              <button type="button" onClick={() => setShowPass(!showPass)} className="text-zinc-400 hover:text-zinc-600">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
          <FormRow cols={2}>
            <Button variant="ghost" onClick={() => setModal(false)} fullWidth>Cancelar</Button>
            <Button onClick={save} fullWidth>Salvar</Button>
          </FormRow>
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
    <div className="space-y-5 max-w-lg">
      <SectionTitle title="Meu Perfil" description="Conta do Super Administrador" icon={User} />

      <PanelCard>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Crown size={28} className="text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-black text-zinc-900">{username}</p>
            <Badge color="primary">Super Admin</Badge>
            <p className="text-xs text-zinc-400">Proprietário da Plataforma</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 mb-5">
          <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium leading-relaxed">
            Esta é a conta master da plataforma. Acesso total e irrestrito a todos os parceiros.{" "}
            <strong>Não aparece</strong> na lista de usuários de nenhum parceiro.
          </p>
        </div>

        <div className="divide-y divide-zinc-100">
          {[
            { label: "Usuário",  value: username },
            { label: "Nível",    value: <Badge color="primary">Super Administrador</Badge> },
            { label: "Acesso",   value: <span className="text-sm font-black text-emerald-600">Total — Irrestrito</span> },
            { label: "Rota",     value: <span className="text-xs font-mono font-bold text-zinc-400">/super-admin</span> },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3">
              <span className="text-sm text-zinc-500 font-semibold">{label}</span>
              {typeof value === "string" ? <span className="text-sm font-black text-zinc-900">{value}</span> : value}
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: WHATSAPP — QR Modal
═══════════════════════════════════════════ */
function QrModal({ row, onClose, onConnected }: { row: any; onClose: () => void; onConnected: (tenantId: string) => void }) {
  const [qrCode, setQrCode] = useState<string | null>(row.instance?.qrCode || null);
  const [status, setStatus] = useState<string>(row.instance?.status || "not_configured");
  const [phone, setPhone] = useState<string | null>(row.instance?.phone || null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = React.useRef<any>(null);

  React.useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  React.useEffect(() => {
    if (status === "connected") { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } onConnected(row.tenantId); }
  }, [status, row.tenantId, onConnected]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await apiFetch(`/api/super-admin/wpp/tenant/${row.tenantId}/status`);
        const d = await r.json();
        setStatus(d.status); setPhone(d.phone || null);
        if (d.qrCode) setQrCode(d.qrCode);
        if (d.status === "connected") { setQrCode(null); clearInterval(pollRef.current); pollRef.current = null; }
      } catch {}
    }, 4000);
  };

  const handleConnect = async () => {
    setConnecting(true); setError(null);
    try {
      const endpoint = row.instance ? `/api/super-admin/wpp/tenant/${row.tenantId}/connect` : `/api/super-admin/wpp/tenant/${row.tenantId}/setup`;
      const r = await apiFetch(endpoint, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao conectar");
      setQrCode(d.qrCode || null); setStatus(d.status || "qr_pending"); startPolling();
    } catch (e: any) { setError(e?.message || "Erro ao gerar QR Code"); }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await apiFetch(`/api/super-admin/wpp/tenant/${row.tenantId}/disconnect`, { method: "POST" }).catch(() => {});
    setStatus("disconnected"); setQrCode(null); setPhone(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const statusBadge: Record<string, { color: "success" | "warning" | "default" | "danger"; label: string }> = {
    connected:      { color: "success", label: "Conectado" },
    qr_pending:     { color: "warning", label: "Aguardando QR" },
    connecting:     { color: "warning", label: "Conectando..." },
    disconnected:   { color: "danger",  label: "Desconectado" },
    not_configured: { color: "default", label: "Não configurado" },
  };
  const sb = statusBadge[status] || statusBadge.not_configured;

  return (
    <Modal isOpen onClose={onClose} title={row.tenantName} size="sm">
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-emerald-600" />
          </div>
          <p className="text-xs text-zinc-400 font-mono flex-1">{row.instance?.instanceName || "sem instância"}</p>
          <Badge color={sb.color} dot>{sb.label}</Badge>
        </div>

        {status === "connected" ? (
          <div className="flex flex-col items-center gap-3 py-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Check size={26} className="text-emerald-600" />
            </div>
            <p className="text-sm font-black text-zinc-900">WhatsApp conectado!</p>
            {phone && <p className="text-xs text-zinc-500 font-mono">Número: +{phone}</p>}
          </div>
        ) : qrCode ? (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-white border-2 border-zinc-200 rounded-2xl">
              <img src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-52 h-52 object-contain" />
            </div>
            <p className="text-xs text-zinc-500 text-center">Abra o WhatsApp → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong></p>
            <p className="text-[10px] text-amber-600 font-bold animate-pulse">Aguardando leitura... (atualiza automaticamente)</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-5">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <MessageCircle size={22} className="text-zinc-400" />
            </div>
            <p className="text-xs text-zinc-500 text-center">Clique em <strong>Conectar</strong> para gerar o QR Code e vincular o WhatsApp.</p>
          </div>
        )}

        {error && (
          <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold">{error}</div>
        )}

        <div className="flex gap-2 pt-1">
          {status === "connected" ? (
            <Button variant="danger" onClick={handleDisconnect} fullWidth>Desconectar</Button>
          ) : (
            <Button variant="success" onClick={handleConnect} loading={connecting} fullWidth>
              {qrCode ? "Novo QR Code" : "Conectar"}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════
   Bot do Sistema
═══════════════════════════════════════════ */
function SystemBotPanel() {
  const [status, setStatus] = React.useState<string>("not_configured");
  const [phone, setPhone] = React.useState<string | null>(null);
  const [qrCode, setQrCode] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pollRef = React.useRef<any>(null);

  React.useEffect(() => {
    apiFetch("/api/super-admin/wpp/system/status").then(r => r.json()).then(d => { setStatus(d.status); setPhone(d.phone || null); if (d.qrCode) setQrCode(d.qrCode); }).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  React.useEffect(() => {
    if (status === "connected") { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } setQrCode(null); }
  }, [status]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await apiFetch("/api/super-admin/wpp/system/poll");
        const d = await r.json();
        setStatus(d.status); setPhone(d.phone || null);
        if (d.qrCode) setQrCode(d.qrCode);
        if (d.status === "connected") { clearInterval(pollRef.current); pollRef.current = null; setQrCode(null); }
      } catch {}
    }, 4000);
  };

  const handleConnect = async () => {
    setConnecting(true); setError(null);
    try {
      const r = await apiFetch("/api/super-admin/wpp/system/connect", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao conectar");
      setQrCode(d.qrCode || null); setStatus(d.status || "qr_pending"); startPolling();
    } catch (e: any) { setError(e?.message || "Erro ao gerar QR"); }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await apiFetch("/api/super-admin/wpp/system/disconnect", { method: "POST" }).catch(() => {});
    setStatus("disconnected"); setPhone(null); setQrCode(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const statusBadge: Record<string, { color: "success" | "warning" | "danger" | "default"; label: string }> = {
    connected:      { color: "success", label: "Conectado" },
    qr_pending:     { color: "warning", label: "Aguardando QR" },
    connecting:     { color: "warning", label: "Conectando..." },
    disconnected:   { color: "danger",  label: "Desconectado" },
    not_configured: { color: "default", label: "Não configurado" },
  };
  const sb = statusBadge[status] || statusBadge.not_configured;

  return (
    <ContentCard padding="none" className="border-2 border-emerald-200">
      <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/40 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <MessageCircle size={16} className="text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-zinc-900">Bot do Sistema</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Número único para parceiros sem bot próprio</p>
        </div>
        <Badge color={sb.color} dot>{sb.label}</Badge>
      </div>

      <div className="p-5 flex flex-col sm:flex-row gap-5 items-start">
        <div className="flex-1 min-w-0">
          {status === "connected" ? (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Check size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-black text-zinc-900">WhatsApp do sistema conectado</p>
                {phone && <p className="text-xs text-zinc-400 font-mono mt-0.5">+{phone}</p>}
              </div>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="p-2 bg-white border-2 border-zinc-200 rounded-xl shrink-0">
                <img src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code Bot do Sistema" className="w-36 h-36 object-contain" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-black text-zinc-900">Escaneie o QR Code</p>
                <p className="text-xs text-zinc-500 leading-relaxed">Abra o WhatsApp → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong></p>
                <p className="text-[10px] text-amber-600 font-bold animate-pulse">Aguardando leitura... (atualiza sozinho)</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 leading-relaxed">
              {status === "disconnected" ? "Bot desconectado. Clique em Conectar Bot para gerar o QR Code." : "Configure o bot do sistema para enviar mensagens de todos os parceiros através de um único número."}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-red-500 font-semibold">{error}</p>}
        </div>

        <div className="shrink-0">
          {status === "connected" ? (
            <Button variant="danger" size="sm" onClick={handleDisconnect}>Desconectar</Button>
          ) : (
            <Button variant="success" size="sm" onClick={handleConnect} loading={connecting}>
              {qrCode ? "Novo QR" : "Conectar Bot"}
            </Button>
          )}
        </div>
      </div>
    </ContentCard>
  );
}

/* ═══════════════════════════════════════════
   ABA: WHATSAPP
═══════════════════════════════════════════ */
function WppTab({ plans }: { plans: any[] }) {
  const [instances, setInstances] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [qrRow, setQrRow] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insR, statsR] = await Promise.all([
        apiFetch("/api/super-admin/wpp/instances"),
        apiFetch("/api/super-admin/wpp/stats"),
      ]);
      const insData = await insR.json();
      setInstances(Array.isArray(insData) ? insData : []);
      setStats(await statsR.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setTenantWpp = async (tenantId: string, wppOverride: boolean | null) => {
    setSaving(tenantId);
    try {
      await apiFetch(`/api/super-admin/wpp/tenant/${tenantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wppOverride }) });
      setInstances(prev => prev.map(i => i.tenantId === tenantId ? { ...i, wppOverride, wppEnabled: wppOverride !== null ? wppOverride : i.wppByPlan } : i));
    } catch {}
    setSaving(null);
  };

  const setPlanWpp = async (planId: string, wppEnabled: boolean) => {
    setSaving(`plan_${planId}`);
    try {
      await apiFetch(`/api/super-admin/wpp/plan/${planId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wppEnabled }) });
      await load();
    } catch {}
    setSaving(null);
  };

  const handleConnected = useCallback((tenantId: string) => {
    setInstances(prev => prev.map(i => i.tenantId === tenantId ? { ...i, instance: { ...i.instance, status: "connected", isActive: true, qrCode: null } } : i));
    setQrRow((r: any) => r?.tenantId === tenantId ? { ...r, instance: { ...r.instance, status: "connected", isActive: true, qrCode: null } } : r);
  }, []);

  const filtered = instances.filter(i => !search || i.tenantName?.toLowerCase().includes(search.toLowerCase()) || i.tenantSlug?.toLowerCase().includes(search.toLowerCase()));

  const wppStatusBadge = (status?: string) => {
    const map: Record<string, { color: "success" | "warning" | "danger" | "default"; label: string }> = {
      connected:      { color: "success", label: "Conectado" },
      qr_pending:     { color: "warning", label: "Aguardando QR" },
      disconnected:   { color: "danger",  label: "Desconectado" },
      not_configured: { color: "default", label: "Não configurado" },
    };
    return map[status ?? ""] || map.not_configured;
  };

  return (
    <div className="space-y-5">
      {qrRow && <QrModal row={qrRow} onClose={() => setQrRow(null)} onConnected={handleConnected} />}

      <SectionTitle
        title="WhatsApp Bot"
        description="Gerencie conexões e permissões de todos os parceiros"
        icon={MessageCircle}
        action={
          <IconButton variant="ghost" onClick={load} title="Atualizar">
            <RefreshCw size={16} />
          </IconButton>
        }
      />

      <StatGrid cols={3}>
        <StatCard icon={MessageCircle} title="Enviadas Hoje"   value={stats?.totalToday ?? "—"} color="success" delay={0}    />
        <StatCard icon={MessageCircle} title="Lembretes 24h"   value={stats?.total24h   ?? "—"} color="info"    delay={0.05} />
        <StatCard icon={MessageCircle} title="Lembretes 60min" value={stats?.total60min ?? "—"} color="purple"  delay={0.1}  />
      </StatGrid>

      <SystemBotPanel />

      {/* Toggle WPP por plano */}
      <ContentCard padding="none">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-black text-zinc-800">WhatsApp por Plano</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Parceiros herdam esta configuração, salvo override individual</p>
        </div>
        <div className="divide-y divide-zinc-100">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-black text-zinc-800">{plan.name}</p>
                <p className="text-xs text-zinc-400">R$ {Number(plan.price).toFixed(2)}/mês</p>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge color={plan.wppEnabled ? "success" : "default"}>{plan.wppEnabled ? "WPP Incluso" : "Sem WPP"}</Badge>
                <Switch
                  checked={!!plan.wppEnabled}
                  onChange={() => saving !== `plan_${plan.id}` && setPlanWpp(plan.id, !plan.wppEnabled)}
                  disabled={saving === `plan_${plan.id}`}
                />
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      {/* Instâncias por parceiro */}
      <ContentCard padding="none">
        <div className="px-5 py-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="text-sm font-black text-zinc-800 flex-1">Conexões dos Parceiros</h3>
          <Input
            placeholder="Buscar parceiro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            iconLeft={<Search size={14} />}
            className="w-full sm:w-52"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-400 text-sm font-semibold">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  {["Parceiro", "Plano", "WPP", "Status / Número", "Ações"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(row => {
                  const sb = wppStatusBadge(row.instance?.status);
                  return (
                    <tr key={row.tenantId} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-black text-zinc-900 truncate max-w-[150px]">{row.tenantName}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{row.tenantSlug}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-zinc-600 whitespace-nowrap">{row.planName}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={!!row.wppEnabled}
                            onChange={() => saving !== row.tenantId && setTenantWpp(row.tenantId, !row.wppEnabled)}
                            disabled={saving === row.tenantId}
                          />
                          {row.wppOverride !== null && row.wppOverride !== undefined && (
                            <button onClick={() => saving !== row.tenantId && setTenantWpp(row.tenantId, null)} disabled={saving === row.tenantId} title="Remover override">
                              <Badge color="purple">override</Badge>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {row.instance ? (
                          <div className="space-y-1">
                            <Badge color={sb.color} dot>{sb.label}</Badge>
                            {row.instance.phone && <p className="text-[10px] text-zinc-500 font-mono">+{row.instance.phone}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-300">Sem instância</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Button
                          size="xs"
                          variant={row.instance?.status === "connected" ? "ghost" : "success"}
                          iconLeft={<MessageCircle size={11} />}
                          onClick={() => setQrRow(row)}
                        >
                          {row.instance?.status === "connected" ? "Gerenciar" : "Conectar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                      {search ? "Nenhum parceiro encontrado" : "Nenhum parceiro cadastrado"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      {/* Info PM2 */}
      <div className="bg-zinc-950 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Processo de Lembretes (PM2)</p>
            <p className="text-xs text-zinc-400 mt-0.5">Roda isolado — não cai com rebuild do app</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: "Iniciar bot",   cmd: "pm2 start ecosystem.config.cjs --only agendelle-wpp" },
            { label: "Reiniciar bot", cmd: "pm2 restart agendelle-wpp" },
            { label: "Ver logs",      cmd: "pm2 logs agendelle-wpp --lines 50" },
          ].map(({ label, cmd }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider w-24 shrink-0">{label}</span>
              <code className="text-[10px] text-emerald-400 bg-zinc-900 px-2.5 py-1.5 rounded-lg flex-1 overflow-x-auto whitespace-nowrap font-mono">{cmd}</code>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-zinc-600">⚡ Scheduler roda a cada 60s. 24h: janela 23h–25h. 60min: janela 55–65min. Deduplicação automática.</p>
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
  { key: "wpp",         icon: <MessageCircle size={17} />,   label: "WhatsApp",       path: "/super-admin/whatsapp" },
  { key: "staff",       icon: <Shield size={17} />,          label: "Minha Equipe",   path: "/super-admin/equipe" },
  { key: "profile",     icon: <User size={17} />,            label: "Meu Perfil",     path: "/super-admin/perfil" },
];

function pathToTab(pathname: string): TabKey {
  if (pathname === "/super-admin" || pathname === "/super-admin/") return "dash";
  if (pathname.includes("/planos"))      return "plans";
  if (pathname.includes("/parceiros"))   return "tenants";
  if (pathname.includes("/usuarios"))    return "users";
  if (pathname.includes("/permissoes"))  return "permissions";
  if (pathname.includes("/whatsapp"))    return "wpp";
  if (pathname.includes("/equipe"))      return "staff";
  if (pathname.includes("/perfil"))      return "profile";
  return "dash";
}

function Sidebar({ tab, setTab, username, onLogout, onClose }: {
  tab: TabKey; setTab: (t: TabKey) => void; username: string; onLogout: () => void; onClose?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/30 shrink-0">
            <Crown size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white">Super Admin</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-4 h-4 rounded-md bg-indigo-500 flex items-center justify-center shrink-0">
                <img src={logoFavicon} alt="Logo" className="w-3 h-3 object-contain invert" />
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

      {/* User / Logout */}
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
  useEffect(() => { setTab(pathToTab(location.pathname)); }, [location.pathname]);

  const [plans, setPlans] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    apiFetch("/api/super-admin/plans").then(r => r.json()).then(setPlans);
    apiFetch("/api/super-admin/tenants").then(r => r.json()).then(setTenants);
  }, []);

  const currentNav = NAV_ITEMS.find(n => n.key === tab);

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-56 shrink-0">
        <Sidebar tab={tab} setTab={setTab} username={username} onLogout={onLogout} />
      </aside>

      {/* Sidebar mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 shadow-2xl">
            <Sidebar tab={tab} setTab={setTab} username={username} onLogout={onLogout} onClose={() => setMobileOpen(false)} />
          </aside>
          <button className="absolute top-4 right-4 text-white p-1" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-zinc-200 px-4 md:px-6 py-3 flex items-center gap-3 shrink-0">
          <button
            className="md:hidden p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-zinc-900 truncate">{currentNav?.label}</p>
            <p className="text-[10px] text-zinc-400 hidden sm:block">Plataforma Agendelle — Painel de Controle</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl shrink-0">
            <Crown size={12} className="text-amber-600" />
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider hidden sm:block">Super Admin</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {tab === "dash"        && <DashboardTab />}
          {tab === "plans"       && <PlansTab />}
          {tab === "tenants"     && <TenantsTab plans={plans} />}
          {tab === "users"       && <UsersTab tenants={tenants} />}
          {tab === "permissions" && <PermissionsTab tenants={tenants} />}
          {tab === "wpp"         && <WppTab plans={plans} />}
          {tab === "staff"       && <StaffTab username={username} />}
          {tab === "profile"     && <ProfileTab username={username} />}
        </div>
      </main>
    </div>
  );
}
