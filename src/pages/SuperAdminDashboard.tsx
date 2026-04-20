import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/src/App";
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
import { RichTextEditor } from "@/src/components/ui/RichTextEditor";
import {
  LayoutDashboard, Users, Building2, CreditCard,
  LogOut, Plus, Edit2, Trash2, X, Check, ChevronDown,
  Shield, Eye, EyeOff, TrendingUp, Crown, Search,
  Mail, Globe, User, Lock, MessageCircle, RefreshCw,
  Menu, BookOpen, FileText, Tag, UserCircle2, Bell,
  BarChart2, ArrowUpRight, ArrowLeft, ExternalLink,
  CheckCircle, Clock, Archive,
} from "lucide-react";
import logoFavicon from "../images/system/logo-favicon.png";
import { MODULE_META, DEFAULT_ROLE_PROFILES, type RoleSlug } from "@/src/lib/permissions";

/* ═══════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════ */
type TabKey = "dash" | "plans" | "tenants" | "users" | "permissions" | "staff" | "profile" | "wpp" | "blog";

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

  // Deduplica planos por nome (caso haja seeds duplicados no banco)
  const uniquePlans: any[] = [];
  const seenNames = new Set<string>();
  (stats.plans ?? []).forEach((p: any) => { if (!seenNames.has(p.name)) { seenNames.add(p.name); uniquePlans.push(p); } });
  const topPlan = [...uniquePlans].sort((a: any, b: any) => b._count.tenants - a._count.tenants)[0]?.name ?? "—";
  const maxTenants = Math.max(...uniquePlans.map((p: any) => p._count.tenants), 1);

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
        <StatCard icon={CreditCard} title="Planos Ativos"  value={uniquePlans.filter((p: any) => p.isActive).length}  color="purple"   delay={0.1}  />
        <StatCard icon={TrendingUp} title="Plano Top"      value={topPlan}                                             color="success"  delay={0.15} />
      </StatGrid>

      <ContentCard padding="none">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Distribuição por Plano</h3>
        </div>
        <div className="divide-y divide-zinc-100">
          {uniquePlans.length === 0 && (
            <p className="text-xs text-zinc-400 text-center py-8">Nenhum plano cadastrado</p>
          )}
          {uniquePlans.map((p: any) => (
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
                      <Switch checked={p.isActive} onCheckedChange={() => toggle(p)} />
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
                  <Switch checked={!!form[key]} onCheckedChange={() => setF(key, !form[key])} />
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
                  <Switch checked={!!form[key]} onCheckedChange={() => setF(key, !form[key])} />
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
                  onCheckedChange={() => saving !== `plan_${plan.id}` && setPlanWpp(plan.id, !plan.wppEnabled)}
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
                            onCheckedChange={() => saving !== row.tenantId && setTenantWpp(row.tenantId, !row.wppEnabled)}
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
   ABA: BLOG
═══════════════════════════════════════════ */
type BlogView = "dashboard" | "posts" | "newpost" | "editpost" | "categories" | "authors" | "subscribers";

function BlogTab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [editingPost, setEditingPost] = useState<any>(null);

  // Derive view from URL
  const path = location.pathname;
  let view: BlogView = "dashboard";
  if (path.includes("/blog/posts/novo")) view = "newpost";
  else if (path.includes("/blog/posts/editar")) view = "editpost";
  else if (path.includes("/blog/posts")) view = "posts";
  else if (path.includes("/blog/categorias")) view = "categories";
  else if (path.includes("/blog/autores")) view = "authors";
  else if (path.includes("/blog/assinantes")) view = "subscribers";

  const goTo = (v: BlogView) => {
    const map: Record<BlogView, string> = {
      dashboard:   "/super-admin/blog",
      posts:       "/super-admin/blog/posts",
      newpost:     "/super-admin/blog/posts/novo",
      editpost:    "/super-admin/blog/posts/editar",
      categories:  "/super-admin/blog/categorias",
      authors:     "/super-admin/blog/autores",
      subscribers: "/super-admin/blog/assinantes",
    };
    navigate(map[v]);
  };

  return (
    <div className="space-y-0">
      {view === "dashboard"   && <BlogDashView   onNav={goTo} />}
      {view === "posts"       && <BlogPostsView  onNav={goTo} onEdit={(p) => { setEditingPost(p); goTo("editpost"); }} />}
      {view === "newpost"     && <BlogPostEditor post={null}        onBack={() => goTo("posts")} onSaved={() => goTo("posts")} />}
      {view === "editpost"    && <BlogPostEditor post={editingPost} onBack={() => goTo("posts")} onSaved={() => goTo("posts")} />}
      {view === "categories"  && <BlogCategoriesView onNav={goTo} />}
      {view === "authors"     && <BlogAuthorsView    onNav={goTo} />}
      {view === "subscribers" && <BlogSubscribersView onNav={goTo} />}
    </div>
  );
}

// ── Blog Dashboard (stats + quick actions) ──────────────────────────────────
function BlogDashView({ onNav }: { onNav: (v: BlogView) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/super-admin/blog/stats").then(r => r.json()),
      apiFetch("/api/super-admin/blog/analytics?days=30").then(r => r.json()),
    ]).then(([s, a]) => { setStats(s); setAnalytics(a.chartData || []); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40 text-zinc-400 text-sm font-semibold">Carregando...</div>;

  const maxViews = Math.max(...analytics.map((d: any) => d.views), 1);

  return (
    <div className="space-y-6">
      <SectionTitle title="Blog — Painel" description="Visão geral do blog Agendelle" icon={BookOpen} />

      <StatGrid cols={4}>
        <StatCard icon={FileText}    title="Total de Posts"   value={stats?.totalPosts ?? 0}       description={`${stats?.publishedPosts ?? 0} publicados`} color="default" delay={0} />
        <StatCard icon={BarChart2}   title="Visualizações"    value={(stats?.totalViews ?? 0).toLocaleString("pt-BR")} color="info"    delay={0.05} />
        <StatCard icon={Bell}        title="Assinantes"       value={stats?.activeSubscribers ?? 0} description={`${stats?.totalSubscribers ?? 0} total`}  color="purple"  delay={0.1} />
        <StatCard icon={Tag}         title="Categorias"       value={stats?.totalCategories ?? 0}  description={`${stats?.totalAuthors ?? 0} autores`}      color="success" delay={0.15} />
      </StatGrid>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: <Plus size={16} />, label: "Novo Post", color: "bg-amber-500 text-white", action: () => onNav("newpost") },
          { icon: <FileText size={16} />, label: "Gerenciar Posts", color: "bg-white border border-zinc-200 text-zinc-700", action: () => onNav("posts") },
          { icon: <Tag size={16} />, label: "Categorias", color: "bg-white border border-zinc-200 text-zinc-700", action: () => onNav("categories") },
          { icon: <UserCircle2 size={16} />, label: "Autores", color: "bg-white border border-zinc-200 text-zinc-700", action: () => onNav("authors") },
          { icon: <Bell size={16} />, label: "Assinantes", color: "bg-white border border-zinc-200 text-zinc-700", action: () => onNav("subscribers") },
        ].map(item => (
          <button key={item.label} onClick={item.action} className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] shadow-sm", item.color)}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Views chart */}
        <ContentCard padding="none">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Visualizações — últimos 30 dias</h3>
          </div>
          <div className="px-5 py-4">
            {analytics.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-8">Nenhuma visualização ainda</p>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {analytics.slice(-30).map((d: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.date}: ${d.views} views`}>
                    <div
                      className="w-full bg-amber-400 rounded-t-sm transition-all group-hover:bg-amber-500"
                      style={{ height: `${Math.round((d.views / maxViews) * 100)}%`, minHeight: d.views > 0 ? 2 : 0 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </ContentCard>

        {/* Top posts */}
        <ContentCard padding="none">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Posts Mais Vistos</h3>
          </div>
          <div className="divide-y divide-zinc-100">
            {(stats?.topPosts ?? []).length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-8">Nenhum post publicado ainda</p>
            )}
            {(stats?.topPosts ?? []).map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-lg font-black text-zinc-300 w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-800 truncate">{p.title}</p>
                  <p className="text-[10px] text-zinc-400">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-amber-600">{(p.views || 0).toLocaleString("pt-BR")}</p>
                  <p className="text-[9px] text-zinc-400">views</p>
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      </div>

      {/* Status breakdown */}
      <ContentCard padding="none">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Status dos Posts</h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-100">
          {[
            { label: "Publicados", value: stats?.publishedPosts ?? 0, icon: <CheckCircle size={14} className="text-green-500" /> },
            { label: "Rascunhos",  value: stats?.draftPosts ?? 0,     icon: <Clock       size={14} className="text-amber-500" /> },
            { label: "Arquivados", value: (stats?.totalPosts ?? 0) - (stats?.publishedPosts ?? 0) - (stats?.draftPosts ?? 0), icon: <Archive size={14} className="text-zinc-400" /> },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1.5 py-5">
              {s.icon}
              <p className="text-2xl font-black text-zinc-900">{s.value}</p>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </ContentCard>
    </div>
  );
}

// ── Blog Posts List ──────────────────────────────────────────────────────────
function BlogPostsView({ onNav, onEdit }: { onNav: (v: BlogView) => void; onEdit: (post: any) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetch_ = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), status: statusFilter });
    if (search) params.set("search", search);
    const r = await apiFetch(`/api/super-admin/blog/posts?${params}`).then(r => r.json());
    setPosts(r.posts || []);
    setTotalPages(r.pagination?.totalPages || 1);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, [page, statusFilter]);

  const handleSearch = () => { setPage(1); fetch_(); };

  const handlePublish = async (id: string) => {
    await apiFetch(`/api/super-admin/blog/posts/${id}/publish`, { method: "PATCH" });
    fetch_();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este post? Esta ação não pode ser desfeita.")) return;
    setDeleting(id);
    await apiFetch(`/api/super-admin/blog/posts/${id}`, { method: "DELETE" });
    setDeleting(null);
    fetch_();
  };

  const statusColor = (s: string) => s === "published" ? "bg-green-100 text-green-700" : s === "draft" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500";
  const statusLabel = (s: string) => s === "published" ? "Publicado" : s === "draft" ? "Rascunho" : "Arquivado";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => onNav("dashboard")} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <SectionTitle title="Posts do Blog" description={`Gerencie os artigos do blog Agendelle`} icon={FileText} />
        <div className="ml-auto">
          <Button onClick={() => onNav("newpost")} size="sm"><span className="flex items-center gap-1.5"><Plus size={14} />Novo Post</span></Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-0 border border-zinc-200 rounded-xl overflow-hidden bg-white">
          {[["all","Todos"],["published","Publicados"],["draft","Rascunhos"],["archived","Arquivados"]].map(([v,l]) => (
            <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
              className={cn("px-3 py-2 text-xs font-bold transition-all", statusFilter === v ? "bg-amber-500 text-white" : "text-zinc-500 hover:bg-zinc-50")}
            >{l}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="Buscar posts..." className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white outline-none focus:border-amber-400" />
          <Button onClick={handleSearch} size="sm"><span className="flex items-center gap-1.5"><Search size={14} />Buscar</span></Button>
        </div>
      </div>

      <ContentCard padding="none">
        {loading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Carregando...</div>
        ) : posts.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum post encontrado" description="Crie seu primeiro artigo para o blog." action={<Button onClick={() => onNav("newpost")} size="sm">Criar Post</Button>} />
        ) : (
          <div className="divide-y divide-zinc-100">
            {posts.map(post => (
              <div key={post.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50 transition-colors">
                <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-zinc-100">
                  {post.coverImage ? <img src={post.coverImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">✂️</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-800 truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {post.category && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: post.category.color + "20", color: post.category.color }}>{post.category.name}</span>}
                    {post.author && <span className="text-[10px] text-zinc-400">{post.author.name}</span>}
                    <span className="text-[10px] text-zinc-400">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("pt-BR") : "—"}</span>
                    <span className="text-[10px] text-zinc-400">{(post.views || 0).toLocaleString("pt-BR")} views</span>
                  </div>
                </div>
                <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shrink-0", statusColor(post.status))}>{statusLabel(post.status)}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {post.status !== "published" && (
                    <button onClick={() => handlePublish(post.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Publicar">
                      <CheckCircle size={14} />
                    </button>
                  )}
                  <button onClick={() => onEdit(post)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors" title="Editar">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(post.id)} disabled={deleting === post.id} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Excluir">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-zinc-100 flex justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg disabled:opacity-50">←</button>
            <span className="px-3 py-1.5 text-xs font-bold text-zinc-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg disabled:opacity-50">→</button>
          </div>
        )}
      </ContentCard>
    </div>
  );
}

// ── Blog Post Editor (criar / editar) ────────────────────────────────────────
function BlogPostEditor({ post, onBack, onSaved }: { post: any; onBack: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: post?.title || "",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    coverImage: post?.coverImage || "",
    status: post?.status || "draft",
    featured: post?.featured || false,
    categoryId: post?.categoryId || "",
    authorId: post?.authorId || "",
    tags: post?.tags ? (Array.isArray(JSON.parse(post.tags)) ? JSON.parse(post.tags).join(", ") : "") : "",
    seoTitle: post?.seoTitle || "",
    seoDescription: post?.seoDescription || "",
    seoKeywords: post?.seoKeywords || "",
  });
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "settings">("content");

  useEffect(() => {
    Promise.all([
      apiFetch("/api/super-admin/blog/categories").then(r => r.json()),
      apiFetch("/api/super-admin/blog/authors").then(r => r.json()),
    ]).then(([cats, auths]) => {
      const authList = Array.isArray(auths) ? auths : [];
      setCategories(Array.isArray(cats) ? cats : []);
      setAuthors(authList);
      // Se for novo post e não tiver autor definido, busca o autor que bate com o usuário logado
      if (!post && !form.authorId) {
        const match = authList.find((a: any) =>
          a.name?.toLowerCase() === (user?.name || user?.username || "")?.toLowerCase() ||
          a.name?.toLowerCase().includes((user?.name || "").toLowerCase())
        );
        if (match) setForm(f => ({ ...f, authorId: match.id }));
      }
    });
  }, []);

  // Upload de imagem de capa
  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const r = await apiFetch("/api/upload", { method: "POST", body: formData });
      if (r.ok) {
        const data = await r.json();
        set("coverImage", data.url || data.path || "");
      }
    } catch {
      // fallback: use object URL for preview only
      set("coverImage", URL.createObjectURL(file));
    }
    setUploadingCover(false);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (publishNow = false) => {
    if (!form.title || !form.content) { alert("Título e conteúdo são obrigatórios"); return; }
    setSaving(true);
    try {
      const tagsArr = form.tags.split(",").map(t => t.trim()).filter(Boolean);
      const body = {
        ...form,
        tags: JSON.stringify(tagsArr),
        status: publishNow ? "published" : form.status,
        categoryId: form.categoryId || null,
        authorId: form.authorId || null,
      };
      const url = post ? `/api/super-admin/blog/posts/${post.id}` : "/api/super-admin/blog/posts";
      const method = post ? "PUT" : "POST";
      const r = await apiFetch(url, { method, body: JSON.stringify(body) });
      if (!r.ok) { const err = await r.json(); alert(err.error || "Erro ao salvar"); }
      else onSaved();
    } catch (e: any) { alert(e.message || "Erro ao salvar"); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <SectionTitle title={post ? "Editar Post" : "Novo Post"} description="Editor de artigo do blog" icon={FileText} />
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => handleSave(false)} disabled={saving} size="sm">
            {saving ? "Salvando..." : "Salvar rascunho"}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving} size="sm">
            <span className="flex items-center gap-1.5"><CheckCircle size={14} />{saving ? "..." : post?.status === "published" ? "Atualizar" : "Publicar"}</span>
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-zinc-200">
        {[["content","Conteúdo"],["seo","SEO"],["settings","Configurações"]].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k as any)}
            className={cn("px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors", activeTab === k ? "border-amber-500 text-amber-600" : "border-transparent text-zinc-500 hover:text-zinc-700")}
          >{l}</button>
        ))}
      </div>

      {activeTab === "content" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <ContentCard>
              <div className="space-y-4">
                <Input label="Título do Post *" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex: Como aumentar o faturamento da sua barbearia" />
                <Textarea label="Resumo (excerpt)" value={form.excerpt} onChange={e => set("excerpt", e.target.value)} placeholder="Breve descrição do artigo (aparece na listagem)" rows={2} />
                <div>
                  <p className="text-xs font-bold text-zinc-700 mb-1.5">Conteúdo *</p>
                  <RichTextEditor value={form.content} onChange={v => set("content", v)} placeholder="Escreva o conteúdo do artigo aqui..." minHeight={480} />
                </div>
              </div>
            </ContentCard>
          </div>

          <div className="space-y-4">
            <ContentCard title="Imagem de Capa">
              <div className="space-y-2">
                <Input label="URL da imagem" value={form.coverImage} onChange={e => set("coverImage", e.target.value)} placeholder="https://..." />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-100" />
                  <span className="text-[10px] text-zinc-400 font-medium">ou</span>
                  <div className="flex-1 h-px bg-zinc-100" />
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full py-2.5 border-2 border-dashed border-zinc-200 rounded-xl text-xs font-bold text-zinc-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition-all disabled:opacity-60"
                >
                  {uploadingCover ? "Enviando..." : "Escolher do dispositivo"}
                </button>
                {form.coverImage && (
                  <div className="relative rounded-xl overflow-hidden border border-zinc-200">
                    <img src={form.coverImage} alt="Preview" className="w-full h-36 object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                    <button
                      type="button"
                      onClick={() => set("coverImage", "")}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </ContentCard>

            <ContentCard title="Metadados">
              <div className="space-y-3">
                <Select label="Categoria" value={form.categoryId} onChange={e => set("categoryId", e.target.value)}>
                  <option value="">— Sem categoria —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Autor" value={form.authorId} onChange={e => set("authorId", e.target.value)}>
                  <option value="">— Sem autor —</option>
                  {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
                <Select label="Status" value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </Select>
                <Input label="Tags (separadas por vírgula)" value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="gestão, marketing, barbearia" />
                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs font-bold text-zinc-700">Post em destaque</p>
                  <Switch checked={form.featured} onCheckedChange={v => set("featured", v)} />
                </div>
              </div>
            </ContentCard>
          </div>
        </div>
      )}

      {activeTab === "seo" && (
        <ContentCard>
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">Configure os metadados de SEO para melhorar o ranqueamento nos buscadores.</p>
            <div>
              <Input label="Título SEO" value={form.seoTitle} onChange={e => set("seoTitle", e.target.value)} placeholder="Título para buscadores (max 60 chars)" maxLength={60} />
              <p className="text-[10px] text-zinc-400 mt-1">{form.seoTitle.length}/60 caracteres</p>
            </div>
            <div>
              <Textarea label="Descrição SEO (meta description)" value={form.seoDescription} onChange={e => set("seoDescription", e.target.value)} placeholder="Descrição para buscadores (max 160 chars)" maxLength={160} rows={3} />
              <p className="text-[10px] text-zinc-400 mt-1">{form.seoDescription.length}/160 caracteres</p>
            </div>
            <Input label="Palavras-chave SEO" value={form.seoKeywords} onChange={e => set("seoKeywords", e.target.value)} placeholder="barbearia, agendamento, gestão salão" />
            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Preview no Google</p>
              <p className="text-sm font-bold text-blue-600 truncate">{form.seoTitle || form.title || "Título do artigo"}</p>
              <p className="text-[11px] text-green-700">agendelle.com.br/blog/...</p>
              <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{form.seoDescription || form.excerpt || "Descrição do artigo..."}</p>
            </div>
          </div>
        </ContentCard>
      )}

      {activeTab === "settings" && (
        <ContentCard>
          <div className="space-y-4">
            <Select label="Status de publicação" value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="draft">Rascunho — visível apenas no admin</option>
              <option value="published">Publicado — visível no blog público</option>
              <option value="archived">Arquivado — não aparece em listagens</option>
            </Select>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-700">Post em destaque</p>
                <p className="text-[10px] text-zinc-400">Aparece na seção de destaque da página principal do blog</p>
              </div>
              <Switch checked={form.featured} onCheckedChange={v => set("featured", v)} />
            </div>
            <div className="pt-2 border-t border-zinc-100">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">URL do post (slug)</p>
              <p className="text-sm font-mono text-zinc-600 bg-zinc-50 px-3 py-2 rounded-lg">
                /blog/{post?.slug || "gerado-automaticamente-do-titulo"}
              </p>
            </div>
          </div>
        </ContentCard>
      )}
    </div>
  );
}

// ── Blog Categories ──────────────────────────────────────────────────────────
function BlogCategoriesView({ onNav }: { onNav: (v: BlogView) => void }) {
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [form, setForm] = useState({ name: "", description: "", color: "#f59e0b", isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await apiFetch("/api/super-admin/blog/categories").then(r => r.json());
    setCats(Array.isArray(r) ? r : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: "", description: "", color: "#f59e0b", isActive: true, sortOrder: cats.length }); setModal({ open: true, item: null }); };
  const openEdit = (c: any) => { setForm({ name: c.name, description: c.description || "", color: c.color, isActive: c.isActive, sortOrder: c.sortOrder }); setModal({ open: true, item: c }); };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const url = modal.item ? `/api/super-admin/blog/categories/${modal.item.id}` : "/api/super-admin/blog/categories";
    const method = modal.item ? "PUT" : "POST";
    await apiFetch(url, { method, body: JSON.stringify(form) });
    setSaving(false);
    setModal({ open: false, item: null });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta categoria?")) return;
    await apiFetch(`/api/super-admin/blog/categories/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => onNav("dashboard")} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <SectionTitle title="Categorias do Blog" description="Organize os artigos por categoria" icon={Tag} />
        <div className="ml-auto">
          <Button onClick={openNew} size="sm"><span className="flex items-center gap-1.5"><Plus size={14} />Nova Categoria</span></Button>
        </div>
      </div>

      <ContentCard padding="none">
        {loading ? <div className="p-8 text-center text-sm text-zinc-400">Carregando...</div>
          : cats.length === 0 ? <EmptyState icon={Tag} title="Sem categorias" description="Crie categorias para organizar seus posts." action={<Button onClick={openNew} size="sm">Criar Categoria</Button>} />
          : (
            <div className="divide-y divide-zinc-100">
              {cats.map(cat => (
                <div key={cat.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-800">{cat.name}</p>
                    {cat.description && <p className="text-xs text-zinc-400 truncate">{cat.description}</p>}
                  </div>
                  <span className="text-[10px] text-zinc-400">{cat._count?.posts ?? 0} posts</span>
                  <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full", cat.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500")}>{cat.isActive ? "Ativa" : "Inativa"}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </ContentCard>

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? "Editar Categoria" : "Nova Categoria"}>
        <div className="space-y-3 p-5">
          <Input label="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Gestão, Marketing..." />
          <Input label="Descrição" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div>
            <p className="text-xs font-bold text-zinc-700 mb-1.5">Cor</p>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer" />
              <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-700">Categoria ativa</p>
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="ghost" onClick={() => setModal({ open: false, item: null })}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Blog Authors ─────────────────────────────────────────────────────────────
function BlogAuthorsView({ onNav }: { onNav: (v: BlogView) => void }) {
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [form, setForm] = useState({ name: "", bio: "", photo: "", role: "", instagram: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, photo: e.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const load = async () => {
    setLoading(true);
    const r = await apiFetch("/api/super-admin/blog/authors").then(r => r.json());
    setAuthors(Array.isArray(r) ? r : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm({ name: "", bio: "", photo: "", role: "", instagram: "", isActive: true }); setModal({ open: true, item: null }); };
  const openEdit = (a: any) => { setForm({ name: a.name, bio: a.bio || "", photo: a.photo || "", role: a.role || "", instagram: a.instagram || "", isActive: a.isActive }); setModal({ open: true, item: a }); };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const url = modal.item ? `/api/super-admin/blog/authors/${modal.item.id}` : "/api/super-admin/blog/authors";
    const method = modal.item ? "PUT" : "POST";
    await apiFetch(url, { method, body: JSON.stringify(form) });
    setSaving(false);
    setModal({ open: false, item: null });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este autor?")) return;
    await apiFetch(`/api/super-admin/blog/authors/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => onNav("dashboard")} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <SectionTitle title="Autores do Blog" description="Gerencie os redatores do blog" icon={UserCircle2} />
        <div className="ml-auto">
          <Button onClick={openNew} size="sm"><span className="flex items-center gap-1.5"><Plus size={14} />Novo Autor</span></Button>
        </div>
      </div>

      <ContentCard padding="none">
        {loading ? <div className="p-8 text-center text-sm text-zinc-400">Carregando...</div>
          : authors.length === 0 ? <EmptyState icon={UserCircle2} title="Sem autores" description="Crie autores para assinar os posts." action={<Button onClick={openNew} size="sm">Criar Autor</Button>} />
          : (
            <div className="divide-y divide-zinc-100">
              {authors.map(author => (
                <div key={author.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50">
                  {author.photo ? (
                    <img src={author.photo} alt={author.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-black text-amber-600 shrink-0">{author.name[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-800">{author.name}</p>
                    {author.role && <p className="text-xs text-zinc-400">{author.role}</p>}
                  </div>
                  <span className="text-[10px] text-zinc-400">{author._count?.posts ?? 0} posts</span>
                  <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full", author.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500")}>{author.isActive ? "Ativo" : "Inativo"}</span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(author)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(author.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </ContentCard>

      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, item: null })} title={modal.item ? "Editar Autor" : "Novo Autor"}>
        <div className="space-y-3 p-5">
          <Input label="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Cargo / Função" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="Ex: Redatora de Conteúdo" />
          <Textarea label="Bio" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} />
          <Input label="Instagram" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@usuario" />
          <div>
            <p className="text-xs font-bold text-zinc-700 mb-1.5">Foto do autor</p>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
            {form.photo ? (
              <div className="flex items-center gap-3">
                <img src={form.photo} alt="preview" className="w-16 h-16 rounded-full object-cover border-2 border-zinc-200" />
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => photoInputRef.current?.click()}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 text-left">Trocar foto</button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, photo: "" }))}
                    className="text-xs font-bold text-red-400 hover:text-red-500 text-left">Remover</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => photoInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl text-xs font-bold text-zinc-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition-all"
              >
                Escolher foto do dispositivo
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="ghost" onClick={() => setModal({ open: false, item: null })}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Blog Subscribers ──────────────────────────────────────────────────────────
function BlogSubscribersView({ onNav }: { onNav: (v: BlogView) => void }) {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    const r = await apiFetch(`/api/super-admin/blog/subscribers?${params}`).then(r => r.json());
    setSubs(r.subscribers || []);
    setTotal(r.pagination?.total || 0);
    setTotalPages(r.pagination?.totalPages || 1);
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remover assinante?")) return;
    await apiFetch(`/api/super-admin/blog/subscribers/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => onNav("dashboard")} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <SectionTitle title="Assinantes da Newsletter" description={`${total} assinante${total !== 1 ? "s" : ""} cadastrado${total !== 1 ? "s" : ""}`} icon={Bell} />
      </div>

      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} placeholder="Buscar por e-mail ou nome..." className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white outline-none focus:border-amber-400" />
        <Button onClick={load} size="sm"><span className="flex items-center gap-1.5"><Search size={14} />Buscar</span></Button>
      </div>

      <ContentCard padding="none">
        {loading ? <div className="p-8 text-center text-sm text-zinc-400">Carregando...</div>
          : subs.length === 0 ? <EmptyState icon={Bell} title="Sem assinantes" description="Ainda não há inscritos na newsletter." />
          : (
            <div className="divide-y divide-zinc-100">
              {subs.map(sub => (
                <div key={sub.id} className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50/50">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-black text-amber-600 shrink-0">
                    {(sub.name || sub.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {sub.name && <p className="text-xs font-black text-zinc-800">{sub.name}</p>}
                    <p className="text-xs text-zinc-500 truncate">{sub.email}</p>
                  </div>
                  <span className="text-[10px] text-zinc-400">{new Date(sub.createdAt).toLocaleDateString("pt-BR")}</span>
                  <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full", sub.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500")}>{sub.isActive ? "Ativo" : "Inativo"}</span>
                  <button onClick={() => handleDelete(sub.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-zinc-100 flex justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg disabled:opacity-50">←</button>
            <span className="px-3 py-1.5 text-xs font-bold text-zinc-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs border border-zinc-200 rounded-lg disabled:opacity-50">→</button>
          </div>
        )}
      </ContentCard>
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
  { key: "blog",        icon: <BookOpen size={17} />,        label: "Blog",           path: "/super-admin/blog" },
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
  if (pathname.includes("/blog"))        return "blog";
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", borderRight: "1px solid #f3f4f6", width: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src={logoFavicon} alt="Agendelle" style={{ width: 20, height: 20, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: "#111", lineHeight: 1, margin: 0 }}>Agendelle</p>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.15em", margin: "3px 0 0" }}>Super Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => { setTab(item.key); navigate(item.path); onClose?.(); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, textAlign: "left", transition: "all 0.15s",
              background: tab === item.key ? "#f59e0b" : "transparent",
              color: tab === item.key ? "#fff" : "#6b7280",
            }}
            onMouseEnter={e => { if (tab !== item.key) { (e.currentTarget as HTMLElement).style.background = "#fafafa"; (e.currentTarget as HTMLElement).style.color = "#111"; } }}
            onMouseLeave={e => { if (tab !== item.key) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6b7280"; } }}
          >
            <span style={{ flexShrink: 0, display: "flex" }}>{item.icon}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User / Logout */}
      <div style={{ padding: "8px 8px 16px", borderTop: "1px solid #f3f4f6", flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#fffbeb" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fde68a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: "#d97706" }}>{username[0]?.toUpperCase()}</span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#111", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{username}</p>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em", margin: "2px 0 0" }}>Super Admin</p>
          </div>
        </div>
        <button
          type="button" onClick={onLogout}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", fontSize: 13, fontWeight: 700, color: "#9ca3af", transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}
        >
          <LogOut size={14} />
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
    <div style={{ display: "flex", height: "100vh", background: "#f8f9fa", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:block" style={{ width: 220, flexShrink: 0 }}>
        <Sidebar tab={tab} setTab={setTab} username={username} onLogout={onLogout} />
      </aside>

      {/* ── Sidebar mobile overlay ── */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }} className="md:hidden">
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setMobileOpen(false)} />
          <aside style={{ position: "relative", width: 240, boxShadow: "4px 0 24px rgba(0,0,0,0.15)" }}>
            <Sidebar tab={tab} setTab={setTab} username={username} onLogout={onLogout} onClose={() => setMobileOpen(false)} />
          </aside>
          <button
            style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "#fff", borderRadius: 8, padding: 6, display: "flex" }}
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── Main area ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Topbar */}
        <header style={{ background: "#fff", borderBottom: "1px solid #f3f4f6", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 12, flexShrink: 0, boxShadow: "0 1px 0 #f3f4f6" }}>
          {/* Mobile menu button + logo (só aparece em mobile, md:hidden) */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, borderRadius: 8, flexShrink: 0 }}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 md:hidden" style={{ flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={logoFavicon} alt="" style={{ width: 16, height: 16, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#111" }}>Agendelle</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#111", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentNav?.label}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fffbeb", border: "1px solid #fde68a", padding: "5px 12px", borderRadius: 8, flexShrink: 0 }}>
            <Crown size={12} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em" }}>Super Admin</span>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px" }}>
          {tab === "dash"        && <DashboardTab />}
          {tab === "plans"       && <PlansTab />}
          {tab === "tenants"     && <TenantsTab plans={plans} />}
          {tab === "users"       && <UsersTab tenants={tenants} />}
          {tab === "permissions" && <PermissionsTab tenants={tenants} />}
          {tab === "blog"        && <BlogTab />}
          {tab === "wpp"         && <WppTab plans={plans} />}
          {tab === "staff"       && <StaffTab username={username} />}
          {tab === "profile"     && <ProfileTab username={username} />}
        </div>
      </main>
    </div>
  );
}
