import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/src/App";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import {
  Badge,
  StatCard,
  Modal,
  ConfirmModal,
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
  useToast,
} from "@/src/components/ui";
import { RichTextEditor } from "@/src/components/ui/RichTextEditor";
import {
  LayoutDashboard, Users, Building2, CreditCard,
  LogOut, Plus, Edit2, Trash2, X, Check, ChevronDown,
  Shield, Eye, EyeOff, TrendingUp, Crown, Search,
  Mail, Globe, User, Lock, MessageCircle, RefreshCw,
  Menu, BookOpen, FileText, Tag, UserCircle2, Bell,
  BarChart2, ArrowUpRight, ArrowLeft, ExternalLink,
  CheckCircle, Clock, Archive, DollarSign,
  Camera,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { MODULE_META, DEFAULT_ROLE_PROFILES, type RoleSlug } from "@/src/lib/permissions";

/* ═══════════════════════════════════════════
   TIPOS
═══════════════════════════════════════════ */
type TabKey = "dash" | "plans" | "tenants" | "users" | "permissions" | "staff" | "profile" | "wpp" | "blog" | "sales" | "settings" | "finance" | "commissions" | "qa";

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

// Utilitário global de máscara de telefone
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
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
    canCreateAdminUsers: false, canDeleteAccount: false,
    systemBotEnabled: true, qrCodeBotEnabled: false,
    siteEnabled: true, agendaExternaEnabled: true,
    priceExtraProfessional: "0",
    stripePaymentLink: "",
    stripePriceId: "",
    features: "",
    permissions: {},
  };


  const [form, setForm] = useState<any>(empty);

  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const load = useCallback(async () => {
    const r = await apiFetch("/api/super-admin/plans?all=true");
    setPlans(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      ...p,
      features: JSON.parse(p.features || "[]").join("\n"),
      permissions: JSON.parse(p.permissions || "[]"),
      price: String(p.price),
      priceExtraProfessional: String(p.priceExtraProfessional || "0"),
      stripePaymentLink: p.stripePaymentLink || "",
      stripePriceId: p.stripePriceId || "",
    });
    setModal(true);
  };


  const save = async () => {
    const body = {
      ...form,
      price: parseFloat(form.price || "0"),
      maxProfessionals: parseInt(form.maxProfessionals || "3"),
      maxAdminUsers: parseInt(form.maxAdminUsers || "1"),
      priceExtraProfessional: parseFloat(form.priceExtraProfessional || "0"),
      features: form.features.split("\n").map((s: string) => s.trim()).filter(Boolean),
    };

    const url = editing ? `/api/super-admin/plans/${editing.id}` : "/api/super-admin/plans";
    await apiFetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setModal(false);
    load();
  };

  const del = async () => {
    if (!deleteConfirm) return;
    await apiFetch(`/api/super-admin/plans/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null);
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
                        <h3 className="text-sm font-black text-zinc-900 leading-none">{p.name}</h3>
                        {!p.isActive && <Badge color="default">Inativo</Badge>}
                      </div>
                      <p className="text-xl font-black text-amber-600 mt-1.5">
                        R$ {Number(p.price).toFixed(2)}
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest ml-1">/mês</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", p.isActive ? "text-emerald-500" : "text-zinc-400")}>
                          {p.isActive ? "Ativo" : "Inativo"}
                        </span>
                        <Switch checked={p.isActive} size="sm" onCheckedChange={() => toggle(p)} />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <IconButton size="sm" variant="ghost" onClick={() => openEdit(p)}>
                          <Edit2 size={13} />
                        </IconButton>
                        <IconButton size="sm" variant="ghost" onClick={() => setDeleteConfirm(p)} className="hover:text-red-500 hover:bg-red-50">
                          <Trash2 size={13} />
                        </IconButton>
                      </div>
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
                    {p.canCreateAdminUsers  && <Badge color="purple">Criar usuários</Badge>}
                    {p.canDeleteAccount     && <Badge color="danger">Excluir conta</Badge>}
                    {p.systemBotEnabled     && <Badge color="success">Bot Agendelle</Badge>}
                    {p.qrCodeBotEnabled     && <Badge color="success">Bot Próprio</Badge>}
                    {p.siteEnabled          && <Badge color="primary">Site/Vitrine</Badge>}
                    {p.agendaExternaEnabled && <Badge color="primary">Agenda Online</Badge>}
                    {p.stripePriceId        && <Badge color="success">✓ Price ID</Badge>}
                    {!p.stripePriceId && p.stripePaymentLink && <Badge color="warning">Link legado</Badge>}
                    {!p.stripePriceId && !p.stripePaymentLink && <Badge color="default">Sem Stripe</Badge>}
                  </div>
                  
                  {p.priceExtraProfessional > 0 && (
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                       + R$ {Number(p.priceExtraProfessional).toFixed(2)} / Prof. extra
                    </p>
                  )}

                  {features.length > 0 && (
                    <ul className="space-y-1.5 mt-2">
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
            <label className="ds-label">Recursos Rápidos</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {[
                { key: "canCreateAdminUsers", label: "Pode criar usuários admin" },
                { key: "canDeleteAccount",    label: "Pode excluir a conta" },
                { key: "systemBotEnabled",    label: "Bot Agendelle (Sistema)" },
                { key: "qrCodeBotEnabled",    label: "Bot Próprio (QR Code)" },
                { key: "siteEnabled",         label: "Site/Vitrine Digital" },
                { key: "agendaExternaEnabled", label: "Agenda Online Externa" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <Switch checked={!!form[key]} onCheckedChange={() => setF(key, !form[key])} />
                  <span className="text-[11px] font-semibold text-zinc-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <Input
            label="Preço Profissional Extra (R$)"
            type="number"
            placeholder="29.90"
            value={form.priceExtraProfessional}
            onChange={e => setF("priceExtraProfessional", e.target.value)}
          />
          <Input
            label="Price ID do Stripe (recomendado)"
            placeholder="price_1ABC..."
            value={form.stripePriceId || ""}
            onChange={e => setF("stripePriceId", e.target.value)}
            hint="ID do preço no Stripe (Produtos → selecionar produto → copiar Price ID). Usado para checkout com metadados."
          />
          <Input
            label="Payment Link do Stripe (legado)"
            placeholder="https://buy.stripe.com/..."
            value={form.stripePaymentLink}
            onChange={e => setF("stripePaymentLink", e.target.value)}
            hint="Usado como fallback se o Price ID não estiver preenchido."
          />
          <Textarea
            label="Benefícios em Destaque (Texto para o Cliente)"
            rows={4}
            placeholder={"Agenda\nClientes\nComandas"}
            value={form.features}
            onChange={e => setF("features", e.target.value)}
          />
          <FormRow cols={2}>
            <Button variant="ghost" onClick={() => setModal(false)} fullWidth>Cancelar</Button>
            <Button onClick={save} fullWidth>{editing ? "Salvar" : "Criar Plano"}</Button>
          </FormRow>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={del}
        title="Excluir Plano"
        message={`Tem certeza que deseja excluir o plano "${deleteConfirm?.name}"? Esta ação não afetará os parceiros que já usam este plano, mas ele não poderá mais ser assinado.`}
        confirmLabel="Sim, excluir"
        variant="danger"
      />
    </div>
  );
}


/* ═══════════════════════════════════════════
   ABA: PARCEIROS
═══════════════════════════════════════════ */
function getTenantStatus(t: any) {
  const now = new Date();
  if (!t.isActive) {
    if (t.blockedAt) {
      const days = (now.getTime() - new Date(t.blockedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 90) return { label: "Inativo", color: "danger" as any };
    }
    return { label: "Bloqueado", color: "default" as any };
  }
  if (t.expiresAt) {
    const diff = (new Date(t.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < -7)  return { label: "Bloqueado",                           color: "default" as any };
    if (diff < 0)   return { label: `Graça: ${7 + Math.ceil(diff)}d`,      color: "warning" as any };
    if (diff <= 7)  return { label: `Vence em ${Math.ceil(diff)}d`,        color: "warning" as any };
  }
  return { label: "Ativo", color: "success" as any };
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
  const [mode, setMode] = useState<"plans" | "users">("plans");
  const [plans, setPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterTenant, setFilterTenant] = useState("all");

  const load = useCallback(async () => {
    const [rp, ru] = await Promise.all([
      apiFetch("/api/super-admin/plans"),
      apiFetch("/api/super-admin/admin-users")
    ]);
    setPlans(await rp.json());
    setUsers(await ru.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const selectPlan = (p: any) => {
    setSelectedPlan(p);
    setSelectedUser(null);
    let perms: Record<string, any> = {};
    try { perms = typeof p.permissions === "string" ? JSON.parse(p.permissions) : (p.permissions || {}); } catch { perms = {}; }
    setPermissions(perms);
    setSaved(false);
  };

  const selectUser = (u: any) => {
    setSelectedUser(u);
    setSelectedPlan(null);
    let perms: Record<string, any> = {};
    try { perms = typeof u.permissions === "string" ? JSON.parse(u.permissions) : (u.permissions || {}); } catch { perms = {}; }
    
    if (Object.keys(perms).length === 0) {
      const roleProfile = DEFAULT_ROLE_PROFILES.find(p => p.id === (u.role as RoleSlug));
      if (roleProfile) {
        for (const [mod, actions] of Object.entries(roleProfile.permissions)) {
          perms[mod] = { ...(actions as any) };
        }
      }
    }
    setPermissions(perms);
    setSaved(false);
  };

  const toggleAction = (mod: string, action: string) => {
    setPermissions(prev => {
      const modPerms = { ...(prev[mod] || {}) };
      modPerms[action] = !modPerms[action];
      if (action === "ver" && !modPerms[action]) {
        return { ...prev, [mod]: undefined } as any;
      }
      if (action === "editar_todos"  && modPerms[action]) modPerms["editar_proprio"]  = true;
      if (action === "excluir_todos" && modPerms[action]) modPerms["excluir_proprio"] = true;
      return { ...prev, [mod]: modPerms };
    });
    setSaved(false);
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      if (mode === "plans" && selectedPlan) {
        await apiFetch(`/api/super-admin/plans/${selectedPlan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions }),
        });
      } else if (mode === "users" && selectedUser) {
        await apiFetch(`/api/super-admin/admin-users/${selectedUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions }),
        });
      }
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (filterTenant === "all" || u.tenantId === filterTenant) && u.role !== "owner"
  );

  const grouped = MODULE_META.reduce((acc, m) => {
    if (!acc[m.group]) acc[m.group] = [];
    acc[m.group].push(m);
    return acc;
  }, {} as Record<string, typeof MODULE_META>);

  const isSelected = mode === "plans" ? !!selectedPlan : !!selectedUser;
  const currentName = mode === "plans" ? selectedPlan?.name : selectedUser?.name;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionTitle
          title="Gestão de Acessos"
          description="Controle o que cada plano e cada usuário pode acessar"
          icon={Lock}
        />
        <div className="flex bg-zinc-100 p-1 rounded-2xl self-start">
          <button 
            onClick={() => { setMode("plans"); setSelectedUser(null); setSelectedPlan(null); setPermissions({}); }}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === "plans" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
          >
            Planos
          </button>
          <button 
            onClick={() => { setMode("users"); setSelectedUser(null); setSelectedPlan(null); setPermissions({}); }}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", mode === "users" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
          >
            Usuários
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Lado Esquerdo: Lista */}
        <ContentCard padding="none" className="flex flex-col overflow-hidden h-[600px]">
          <div className="px-4 py-4 border-b border-zinc-100 shrink-0 space-y-3 bg-zinc-50/50">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {mode === "plans" ? "Selecione um Plano" : "Selecione um Usuário"}
            </p>
            {mode === "users" && (
              <Select value={filterTenant} onChange={e => setFilterTenant(e.target.value)} size="sm">
                <option value="all">Todos os parceiros</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            )}
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-zinc-100">
            {mode === "plans" ? (
              plans.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPlan(p)}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-4 text-left transition-all border-l-4",
                    selectedPlan?.id === p.id ? "bg-amber-50/50 border-amber-500" : "hover:bg-zinc-50 border-transparent"
                  )}
                >
                  <div>
                    <p className="text-sm font-black text-zinc-800">{p.name}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">R$ {p.price.toFixed(2)}/mês</p>
                  </div>
                  <ChevronRight size={14} className={cn("transition-transform", selectedPlan?.id === p.id ? "text-amber-500 translate-x-1" : "text-zinc-300")} />
                </button>
              ))
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => selectUser(u)}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-4 text-left transition-all border-l-4",
                    selectedUser?.id === u.id ? "bg-amber-50/50 border-amber-500" : "hover:bg-zinc-50 border-transparent"
                  )}
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-800 truncate">{u.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate uppercase font-bold tracking-tighter">{u.tenant?.name ?? "—"}</p>
                  </div>
                  <Badge color="primary" size="sm" className="text-[8px]">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                </button>
              ))
            )}
          </div>
        </ContentCard>

        {/* Lado Direito: Editor */}
        <ContentCard padding="none" className="lg:col-span-2 flex flex-col overflow-hidden h-[600px]">
          {!isSelected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                <Lock size={32} />
              </div>
              <div>
                <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Aguardando Seleção</p>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px]">Selecione um {mode === "plans" ? "plano" : "usuário"} ao lado para editar suas permissões.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30 shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg">
                      {mode === "plans" ? <CreditCard size={18} /> : <UserCircle2 size={18} />}
                   </div>
                   <div>
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest leading-none mb-1">Editando Permissões de</p>
                      <h3 className="text-base font-black text-zinc-900 leading-none">{currentName}</h3>
                   </div>
                </div>
                <Button onClick={savePermissions} loading={saving} size="sm" variant={saved ? "success" : "primary"} className="min-w-[140px]">
                  {saved ? <span className="flex items-center gap-1.5"><Check size={14} /> Salvo!</span> : "Salvar Alterações"}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="flex gap-2">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 px-2">Presets Rápidos:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {DEFAULT_ROLE_PROFILES.map(rp => (
                      <button key={rp.id} onClick={() => {
                        const base: any = {};
                        for (const [mod, actions] of Object.entries(rp.permissions)) { base[mod] = { ...(actions as any) }; }
                        setPermissions(base);
                        setSaved(false);
                      }} className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-600 text-[10px] font-bold hover:bg-zinc-200 transition-colors">{rp.label}</button>
                    ))}
                  </div>
                </div>

                {Object.entries(grouped).map(([group, mods]) => (
                  <div key={group} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">{GROUP_LABELS[group] || group}</span>
                       <div className="h-px bg-zinc-100 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {mods.filter(m => !m.parent).map(m => {
                        const modPerms = permissions[m.key] || {};
                        const isModActive = !!modPerms.ver;
                        const children = mods.filter(c => c.parent === m.key);
                        
                        return (
                          <div key={m.key} className={cn(
                            "rounded-[28px] border transition-all p-5",
                            isModActive ? "bg-white border-amber-100 shadow-md ring-1 ring-amber-50" : "bg-zinc-50/50 border-zinc-100 opacity-60"
                          )}>
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-all", isModActive ? "bg-amber-500 text-white" : "bg-zinc-200 text-zinc-500")}>
                                  <Lock size={14} />
                                </div>
                                <span className="text-xs font-black text-zinc-800 uppercase tracking-tight">{m.label}</span>
                              </div>
                              <Switch checked={isModActive} onCheckedChange={() => toggleAction(m.key, "ver")} />
                            </div>

                            {isModActive && (
                              <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-50">
                                {m.actions.map(action => (
                                  <button
                                    key={action}
                                    onClick={() => toggleAction(m.key, action)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border",
                                      modPerms[action] 
                                        ? "bg-zinc-900 border-zinc-900 text-white shadow-lg" 
                                        : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
                                    )}
                                  >
                                    {ACTION_LABELS[action] || action}
                                  </button>
                                ))}
                              </div>
                            )}

                            {isModActive && children.length > 0 && (
                              <div className="mt-5 pt-5 border-t border-zinc-100 space-y-3 pl-4 border-l-2 border-amber-100">
                                {children.map(child => {
                                   const childPerms = permissions[child.key] || {};
                                   const isChildActive = !!childPerms.ver;
                                   return (
                                     <div key={child.key} className={cn("p-4 rounded-2xl border transition-all", isChildActive ? "bg-white border-amber-200/50 shadow-sm" : "bg-zinc-50/50 border-zinc-100 opacity-60")}>
                                       <div className="flex items-center justify-between">
                                         <span className="text-[11px] font-black text-zinc-700 uppercase tracking-tight">{child.label}</span>
                                         <Switch checked={isChildActive} onCheckedChange={() => toggleAction(child.key, "ver")} size="sm" />
                                       </div>
                                       {isChildActive && child.actions.filter(a => a !== "ver").length > 0 && (
                                         <div className="flex flex-wrap gap-1.5 pt-3 mt-3 border-t border-zinc-50">
                                            {child.actions.filter(a => a !== "ver").map(action => (
                                              <button 
                                                key={action} 
                                                onClick={() => toggleAction(child.key, action)} 
                                                className={cn("px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border", childPerms[action] ? "bg-zinc-800 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300")}
                                              >
                                                {ACTION_LABELS[action] || action}
                                              </button>
                                            ))}
                                         </div>
                                       )}
                                     </div>
                                   );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ContentCard>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   ABA: VENDAS E AFILIADOS
═══════════════════════════════════════════ */
function SalesTab({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [stripeStatus, setStripeStatus] = useState<any>(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (user?.id) {
      Promise.all([
        apiFetch("/api/super-admin/sales-stats").then(r => r.json()).catch(() => null),
        apiFetch("/api/super-admin/stripe-connect/status")
          .then(async r => {
            if (!r.ok) throw new Error("Status API failed");
            return r.json();
          })
          .catch(() => ({ connected: false, error: true }))
      ]).then(([statsData, stripeData]) => {
        setStats({
          totalSales: statsData?.totalSales ?? 0,
          totalActive: statsData?.totalActive ?? 0,
          totalRecurring: Number(statsData?.totalRecurring ?? 0),
          history: Array.isArray(statsData?.history) ? statsData.history : [],
        });
        setStripeStatus(stripeData);
      }).finally(() => setLoading(false));
    }
  }, [user]);

  const salesLink = user ? `${window.location.origin}/assinar?ref=${user.id}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(salesLink);
    toast.success("O seu link de vendas foi copiado para a área de transferência.");
  };

  const handleStripeConnect = async () => {
    setConnecting(true);
    try {
      const r = await apiFetch("/api/super-admin/stripe-connect", { method: "POST" });
      const data = await r.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error || "Erro ao conectar com Stripe");
    } catch (e) {
      toast.error("Erro ao conectar com Stripe");
    } finally {
      setConnecting(false);
    }
  };

  if (loading || !stats) return <div className="p-8 text-center text-sm text-zinc-400">Carregando estatísticas...</div>;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Vendas e Afiliados"
        description="Acompanhe seu desempenho e compartilhe seu link de vendas"
        icon={TrendingUp}
      />

      <ContentCard className="bg-gradient-to-br from-amber-500 to-amber-600 border-none shadow-xl shadow-amber-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2">
          <div className="space-y-2">
            <h3 className="text-lg font-black text-white">Seu Link de Vendas</h3>
            <p className="text-amber-100 text-sm font-medium">Use este link para cadastrar novos parceiros e receber atribuição direta.</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/20">
            <code className="px-4 py-2 text-white font-bold text-sm truncate max-w-[200px] md:max-w-xs">{salesLink}</code>
            <Button size="sm" variant="secondary" onClick={copyLink} iconLeft={<FileText size={14} />} className="bg-white text-amber-600 hover:bg-amber-50 border-none shadow-lg">
              Copiar Link
            </Button>
          </div>
        </div>
      </ContentCard>

      <StatGrid cols={3}>
        <StatCard icon={Crown} title="Total de Vendas" value={stats.totalSales ?? 0} color="info" delay={0} />
        <StatCard icon={CheckCircle} title="Assinaturas Ativas" value={stats.totalActive ?? 0} color="success" delay={0.1} />
        <StatCard icon={CreditCard} title="Receita Recorrente (MRR)" value={`R$ ${Number(stats.totalRecurring ?? 0).toFixed(2)}`} color="purple" delay={0.2} />
      </StatGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ContentCard className="lg:col-span-2" padding="none">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Histórico de Vendas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Parceiro</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Plano</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {stats.history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-400">Nenhuma venda realizada ainda.</td>
                  </tr>
                ) : (
                  stats.history.map((h: any) => (
                    <tr key={h.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm font-bold text-zinc-800">{h.name}</td>
                      <td className="px-5 py-4"><Badge color="info">{h.planName}</Badge></td>
                      <td className="px-5 py-4 text-sm font-black text-zinc-700">R$ {h.value.toFixed(2)}</td>
                      <td className="px-5 py-4 text-xs text-zinc-500">{new Date(h.date).toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-4">
                        <Badge color={h.status === "Ativo" ? "success" : "default"} dot>{h.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ContentCard>

        <div className="space-y-6">
          <ContentCard>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-base font-black text-zinc-900 leading-tight">Como aumentar suas vendas?</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Compartilhe seu link exclusivo em suas redes sociais, grupos de WhatsApp e e-mails. Cada parceiro que assinar através do seu link será automaticamente vinculado ao seu perfil.
              </p>
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                  <CheckCircle size={14} className="text-emerald-500" /> Atribuição vitalícia
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                  <CheckCircle size={14} className="text-emerald-500" /> Relatórios em tempo real
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-600">
                  <CheckCircle size={14} className="text-emerald-500" /> Suporte dedicado
                </div>
              </div>
            </div>
          </ContentCard>

          <ContentCard>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#635BFF]/10 flex items-center justify-center text-[#635BFF]">
                <CreditCard size={24} />
              </div>
              <h3 className="text-base font-black text-zinc-900 leading-tight">Recebimento Automático</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Conecte sua conta Stripe para receber seus repasses de comissão automaticamente na sua conta bancária.
              </p>

              {stripeStatus === undefined ? (
                <div className="h-10 bg-zinc-100 animate-pulse rounded-xl" />
              ) : stripeStatus.connected && stripeStatus.payoutsEnabled ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <CheckCircle size={16} /> Conta Conectada
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium">Seus repasses automáticos estão ativos.</p>
                  <Button variant="secondary" size="sm" onClick={handleStripeConnect} loading={connecting} className="w-full text-xs mt-2">
                    Acessar Painel Stripe
                  </Button>
                </div>
              ) : stripeStatus.connected && !stripeStatus.payoutsEnabled ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                    <TrendingUp size={16} /> Configuração Pendente
                  </div>
                  <p className="text-[10px] text-amber-600 font-medium">Faltam dados para liberar seus repasses.</p>
                  <Button onClick={handleStripeConnect} loading={connecting} className="w-full bg-[#635BFF] hover:bg-[#5249EC] text-white border-none shadow-lg mt-2">
                    Completar Cadastro
                  </Button>
                </div>
              ) : (
                <Button onClick={handleStripeConnect} loading={connecting} className="w-full bg-[#635BFF] hover:bg-[#5249EC] text-white border-none shadow-lg">
                  Conectar com Stripe
                </Button>
              )}
            </div>
          </ContentCard>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   ABA: FINANCEIRO DA PLATAFORMA
═══════════════════════════════════════════ */
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function FinanceTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any>({ income: [], expense: [] });
  const [modal, setModal] = useState(false);
  const [allocModal, setAllocModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [activeView, setActiveView] = useState<"overview" | "entries" | "allocations">("overview");
  const [filterType, setFilterType] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [form, setForm] = useState<any>({
    type: "income", category: "", description: "", amount: "", date: new Date().toISOString().split("T")[0], recurrence: "once", notes: ""
  });
  const [allocForm, setAllocForm] = useState<any>({ name: "", percentage: "", color: "#f59e0b" });
  const [editingAlloc, setEditingAlloc] = useState<any>(null);

  const loadSummary = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    const r = await apiFetch(`/api/super-admin/finance/summary?${params}`);
    setSummary(await r.json());
  }, [filterFrom, filterTo]);

  const loadEntries = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);
    params.set("limit", "100");
    const r = await apiFetch(`/api/super-admin/finance/entries?${params}`);
    const data = await r.json();
    setEntries(data.entries || []);
    setTotal(data.total || 0);
  }, [filterType, filterFrom, filterTo]);

  const loadAllocations = useCallback(async () => {
    const r = await apiFetch("/api/super-admin/finance/allocations");
    setAllocations(await r.json());
  }, []);

  const loadCategories = useCallback(async () => {
    const r = await apiFetch("/api/super-admin/finance/categories");
    setCategories(await r.json());
  }, []);

  useEffect(() => {
    Promise.all([loadSummary(), loadEntries(), loadAllocations(), loadCategories()]).finally(() => setLoading(false));
  }, [loadSummary, loadEntries, loadAllocations, loadCategories]);

  const saveEntry = async () => {
    if (!form.category || !form.amount || !form.date) { toast.error("Preencha categoria, valor e data"); return; }
    const url = editing ? `/api/super-admin/finance/entries/${editing.id}` : "/api/super-admin/finance/entries";
    const r = await apiFetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) });
    if (r.ok) { toast.success(editing ? "Lançamento atualizado!" : "Lançamento criado!"); setModal(false); setEditing(null); loadSummary(); loadEntries(); }
    else toast.error("Erro ao salvar lançamento");
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    const r = await apiFetch(`/api/super-admin/finance/entries/${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Excluído!"); loadSummary(); loadEntries(); }
  };

  const openForm = (entry?: any) => {
    setEditing(entry || null);
    setForm({
      type: entry?.type || "income", category: entry?.category || "", description: entry?.description || "",
      amount: entry?.amount?.toString() || "", date: entry?.date ? new Date(entry.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      recurrence: entry?.recurrence || "once", notes: entry?.notes || ""
    });
    setModal(true);
  };

  const saveAlloc = async () => {
    if (!allocForm.name || !allocForm.percentage) { toast.error("Preencha nome e porcentagem"); return; }
    const url = editingAlloc ? `/api/super-admin/finance/allocations/${editingAlloc.id}` : "/api/super-admin/finance/allocations";
    const r = await apiFetch(url, { method: editingAlloc ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...allocForm, percentage: parseFloat(allocForm.percentage), isActive: true }) });
    if (r.ok) { toast.success("Alocação salva!"); setAllocModal(false); setEditingAlloc(null); loadAllocations(); }
  };

  const deleteAlloc = async (id: string) => {
    if (!confirm("Excluir esta alocação?")) return;
    await apiFetch(`/api/super-admin/finance/allocations/${id}`, { method: "DELETE" });
    loadAllocations();
  };

  const totalAllocPct = allocations.reduce((s: number, a: any) => s + (a.percentage || 0), 0);

  const chartData = (() => {
    if (!summary?.monthly) return [];
    const months: Record<string, { income: number; expense: number }> = {};
    summary.monthly.forEach((r: any) => {
      if (!months[r.month]) months[r.month] = { income: 0, expense: 0 };
      months[r.month][r.type as "income" | "expense"] += r.total;
    });
    return Object.entries(months).map(([m, v]) => {
      const [y, mo] = m.split("-");
      return { label: `${MONTH_NAMES[parseInt(mo) - 1]}/${y.slice(2)}`, ...v };
    });
  })();
  const maxChartVal = Math.max(...chartData.map(d => Math.max(d.income, d.expense)), 1);

  if (loading) return <div className="flex items-center justify-center h-40 text-zinc-400 text-sm font-semibold">Carregando financeiro...</div>;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Financeiro da Plataforma"
        description="Controle completo de receitas, despesas e alocações"
        icon={BarChart2}
        action={<Button size="sm" iconLeft={<Plus size={14} />} onClick={() => openForm()}>Novo Lançamento</Button>}
      />

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "overview" as const, label: "Visão Geral", icon: LayoutDashboard },
          { key: "entries" as const, label: "Lançamentos", icon: FileText },
          { key: "allocations" as const, label: "Alocações (%)", icon: CreditCard },
        ]).map(t => (
          <button key={t.key} onClick={() => setActiveView(t.key)} className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wide transition-all border",
            activeView === t.key ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
          )}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ── VISÃO GERAL ── */}
      {activeView === "overview" && (<>
        <ContentCard>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[140px]"><Input label="De" type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} /></div>
            <div className="flex-1 min-w-[140px]"><Input label="Até" type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} /></div>
            <Button size="sm" variant="ghost" onClick={() => { setFilterFrom(""); setFilterTo(""); }} className="mb-1">Limpar</Button>
          </div>
        </ContentCard>

        <StatGrid cols={4}>
          <StatCard icon={TrendingUp} title="Receita Total" value={`R$ ${(summary?.totalIncome || 0).toFixed(2)}`} color="success" delay={0} />
          <StatCard icon={CreditCard} title="Despesas Total" value={`R$ ${(summary?.totalExpense || 0).toFixed(2)}`} color="danger" delay={0.05} />
          <StatCard icon={BarChart2} title="Saldo Líquido" value={`R$ ${(summary?.netBalance || 0).toFixed(2)}`} color={summary?.netBalance >= 0 ? "success" : "danger"} delay={0.1} />
          <StatCard icon={Crown} title="MRR Estimado" value={`R$ ${(summary?.mrr || 0).toFixed(2)}`} description={`${summary?.totalSubscribers || 0} assinantes`} color="purple" delay={0.15} />
        </StatGrid>

        {/* Gráfico mensal */}
        <ContentCard padding="none">
          <div className="px-5 py-4 border-b border-zinc-100"><h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Receitas × Despesas (12 meses)</h3></div>
          <div className="p-5">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">Registre lançamentos para ver o gráfico.</div>
            ) : (
              <div className="flex items-end gap-2 h-48 overflow-x-auto">
                {chartData.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[48px]">
                    <div className="flex items-end gap-[2px] h-36 w-full justify-center">
                      <div className="w-4 rounded-t-lg bg-emerald-400 hover:bg-emerald-500 transition-all" style={{ height: `${(d.income / maxChartVal) * 100}%`, minHeight: d.income > 0 ? 4 : 0 }} title={`Receita: R$ ${d.income.toFixed(2)}`} />
                      <div className="w-4 rounded-t-lg bg-red-400 hover:bg-red-500 transition-all" style={{ height: `${(d.expense / maxChartVal) * 100}%`, minHeight: d.expense > 0 ? 4 : 0 }} title={`Despesa: R$ ${d.expense.toFixed(2)}`} />
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400">{d.label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-6 mt-4 justify-center">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500"><div className="w-3 h-3 rounded bg-emerald-400" /> Receita</div>
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500"><div className="w-3 h-3 rounded bg-red-400" /> Despesa</div>
            </div>
          </div>
        </ContentCard>

        {/* Por categoria */}
        {summary?.byCategory?.length > 0 && (
          <ContentCard padding="none">
            <div className="px-5 py-4 border-b border-zinc-100"><h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Por Categoria</h3></div>
            <div className="divide-y divide-zinc-100">
              {summary.byCategory.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", c.type === "income" ? "bg-emerald-400" : "bg-red-400")} />
                    <span className="text-xs font-bold text-zinc-700">{c.category}</span>
                    <Badge color={c.type === "income" ? "success" : "danger"}>{c.type === "income" ? "Receita" : "Despesa"}</Badge>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-sm font-black", c.type === "income" ? "text-emerald-600" : "text-red-600")}>R$ {c.total.toFixed(2)}</span>
                    <span className="text-[10px] text-zinc-400 ml-2">({c.count}x)</span>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>
        )}
      </>)}

      {/* ── LANÇAMENTOS ── */}
      {activeView === "entries" && (<>
        <ContentCard>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[140px]">
              <Select label="Tipo" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">Todos</option>
                <option value="income">Receitas</option>
                <option value="expense">Despesas</option>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]"><Input label="De" type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} /></div>
            <div className="flex-1 min-w-[140px]"><Input label="Até" type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} /></div>
            <Button size="sm" variant="ghost" onClick={() => { setFilterType(""); setFilterFrom(""); setFilterTo(""); }} className="mb-1">Limpar</Button>
          </div>
        </ContentCard>

        {entries.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum lançamento encontrado" />
        ) : (
          <ContentCard padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-100">
                  <tr>
                    {["Data","Tipo","Categoria","Descrição","Valor","Recorrência",""].map(h => (
                      <th key={h} className={cn("text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest", h === "" && "text-right")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {entries.map(e => (
                    <tr key={e.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-zinc-600">{new Date(e.date).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3"><Badge color={e.type === "income" ? "success" : "danger"} dot>{e.type === "income" ? "Receita" : "Despesa"}</Badge></td>
                      <td className="px-4 py-3 text-xs font-bold text-zinc-700">{e.category}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 max-w-[200px] truncate">{e.description || "—"}</td>
                      <td className={cn("px-4 py-3 text-sm font-black", e.type === "income" ? "text-emerald-600" : "text-red-600")}>
                        {e.type === "income" ? "+" : "−"} R$ {e.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-zinc-400 uppercase font-bold">
                        {{ once: "Único", monthly: "Mensal", yearly: "Anual" }[e.recurrence as string] || e.recurrence}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <IconButton variant="ghost" size="xs" onClick={() => openForm(e)}><Edit2 size={13} /></IconButton>
                          <IconButton variant="danger" size="xs" onClick={() => deleteEntry(e.id)}><Trash2 size={13} /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-zinc-100 text-xs text-zinc-400 font-bold">{total} lançamento(s)</div>
          </ContentCard>
        )}
      </>)}

      {/* ── ALOCAÇÕES ── */}
      {activeView === "allocations" && (<>
        <ContentCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Distribuição do Faturamento</h3>
              <p className="text-xs text-zinc-400 mt-1">Defina percentuais para separar automaticamente o faturamento</p>
            </div>
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={() => { setEditingAlloc(null); setAllocForm({ name: "", percentage: "", color: "#f59e0b" }); setAllocModal(true); }}>Nova Alocação</Button>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Alocado</span>
              <span className={cn("text-sm font-black", totalAllocPct > 100 ? "text-red-500" : totalAllocPct === 100 ? "text-emerald-600" : "text-amber-600")}>{totalAllocPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-zinc-100 overflow-hidden flex">
              {allocations.map((a: any, i: number) => (
                <div key={i} style={{ width: `${Math.min(a.percentage, 100 - allocations.slice(0, i).reduce((s: number, x: any) => s + x.percentage, 0))}%`, background: a.color }} className="h-full transition-all" title={`${a.name}: ${a.percentage}%`} />
              ))}
            </div>
          </div>

          {allocations.length === 0 ? (
            <EmptyState icon={CreditCard} title="Nenhuma alocação criada" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allocations.map((a: any) => (
                <div key={a.id} className="p-4 rounded-2xl border border-zinc-100 bg-white hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ background: a.color }} />
                      <span className="text-xs font-black text-zinc-800 uppercase tracking-tight">{a.name}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconButton variant="ghost" size="xs" onClick={() => { setEditingAlloc(a); setAllocForm({ name: a.name, percentage: a.percentage.toString(), color: a.color }); setAllocModal(true); }}><Edit2 size={12} /></IconButton>
                      <IconButton variant="danger" size="xs" onClick={() => deleteAlloc(a.id)}><Trash2 size={12} /></IconButton>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-zinc-900">{a.percentage}%</span>
                    {summary?.totalIncome > 0 && <span className="text-xs text-zinc-400 font-bold mb-1">≈ R$ {((summary.totalIncome * a.percentage) / 100).toFixed(2)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ContentCard>
      </>)}

      {/* Modal Lançamento */}
      <Modal isOpen={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? "Editar Lançamento" : "Novo Lançamento"} size="md"
        footer={<div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={() => { setModal(false); setEditing(null); }}>Cancelar</Button>
          <Button onClick={saveEntry} disabled={!form.category || !form.amount || !form.date} className="bg-zinc-900 text-white hover:bg-black px-6">{editing ? "Atualizar" : "Criar Lançamento"}</Button>
        </div>}
      >
        <div className="space-y-5">
          <div className="flex gap-2">
            {[{ v: "income", label: "Receita", color: "bg-emerald-500" }, { v: "expense", label: "Despesa", color: "bg-red-500" }].map(t => (
              <button key={t.v} onClick={() => setForm((f: any) => ({ ...f, type: t.v, category: "" }))}
                className={cn("flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all border",
                  form.type === t.v ? `${t.color} text-white border-transparent shadow-lg` : "bg-zinc-50 text-zinc-500 border-zinc-200"
                )}>{t.label}</button>
            ))}
          </div>
          <Select label="Categoria *" value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
            <option value="">Selecionar...</option>
            {(form.type === "income" ? categories.income : categories.expense).map((c: string) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor (R$) *" type="number" step="0.01" value={form.amount} onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            <Input label="Data *" type="date" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
          </div>
          <Select label="Recorrência" value={form.recurrence} onChange={e => setForm((f: any) => ({ ...f, recurrence: e.target.value }))}>
            <option value="once">Único</option><option value="monthly">Mensal</option><option value="yearly">Anual</option>
          </Select>
          <Input label="Descrição" value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Detalhes..." />
          <Textarea label="Observações" value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notas internas..." />
        </div>
      </Modal>

      {/* Modal Alocação */}
      <Modal isOpen={allocModal} onClose={() => { setAllocModal(false); setEditingAlloc(null); }} title={editingAlloc ? "Editar Alocação" : "Nova Alocação"} size="sm"
        footer={<div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={() => { setAllocModal(false); setEditingAlloc(null); }}>Cancelar</Button>
          <Button onClick={saveAlloc} disabled={!allocForm.name || !allocForm.percentage} className="bg-zinc-900 text-white hover:bg-black px-6">{editingAlloc ? "Atualizar" : "Criar"}</Button>
        </div>}
      >
        <div className="space-y-4">
          <Input label="Nome da Alocação *" value={allocForm.name} onChange={e => setAllocForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Ex: Reserva Fiscal..." />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Porcentagem (%) *" type="number" step="0.1" value={allocForm.percentage} onChange={e => setAllocForm((f: any) => ({ ...f, percentage: e.target.value }))} placeholder="25" />
            <Input label="Cor" type="color" value={allocForm.color} onChange={e => setAllocForm((f: any) => ({ ...f, color: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}


/* ═══════════════════════════════════════════
   ABA: COMISSÕES DE VENDEDORES
═══════════════════════════════════════════ */
function CommissionsTab() {
  const toast = useToast();
  const [data, setData] = useState<{ sellers: any[]; plans: any[] }>({ sellers: [], plans: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    commissionType: "percentage",
    commissionValue: 0,
    trialDays: 30,
    commissionByPlan: {} as Record<string, { type: string; value: number }>,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/super-admin/commissions");
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openSeller = async (s: any) => {
    setSelected(s);
    setForm({
      commissionType: s.commissionType ?? "percentage",
      commissionValue: s.commissionValue ?? 0,
      trialDays: s.trialDays ?? 30,
      commissionByPlan: s.commissionByPlan ?? {},
    });
    const r = await apiFetch(`/api/super-admin/commissions/${s.id}/summary`);
    if (r.ok) setDetail(await r.json());
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/api/super-admin/commissions/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Erro ao salvar");
      toast.success("Comissão atualizada!");
      load();
      const r2 = await apiFetch(`/api/super-admin/commissions/${selected.id}/summary`);
      if (r2.ok) setDetail(await r2.json());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const setPlanOverride = (planId: string, field: "type" | "value", val: any) => {
    setForm((f: any) => {
      const byPlan = { ...(f.commissionByPlan || {}) };
      byPlan[planId] = { ...(byPlan[planId] || { type: f.commissionType, value: f.commissionValue }), [field]: field === "value" ? Number(val) : val };
      return { ...f, commissionByPlan: byPlan };
    });
  };

  const clearPlanOverride = (planId: string) => {
    setForm((f: any) => {
      const byPlan = { ...(f.commissionByPlan || {}) };
      delete byPlan[planId];
      return { ...f, commissionByPlan: byPlan };
    });
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) return <div className="flex items-center justify-center h-40 text-zinc-400 font-semibold">Carregando...</div>;

  return (
    <div className="space-y-5">
      <SectionTitle title="Comissões de Vendedores" description="Configure a comissão de cada vendedor por plano ou valor padrão" icon={DollarSign} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lista de vendedores */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Vendedores</p>
          {data.sellers.length === 0 && <EmptyState icon={Users} title="Nenhum vendedor cadastrado" />}
          {data.sellers.map(s => (
            <button
              key={s.id}
              onClick={() => openSeller(s)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === s.id ? "border-amber-400 bg-amber-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <Users size={16} className="text-zinc-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-800 truncate">{s.name || s.username}</p>
                  <p className="text-xs text-zinc-500">{s.activeSales} ativos · {s.inTrial} em trial</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-amber-600">{fmt(s.monthlyCommission)}</p>
                  <p className="text-xs text-zinc-400">MRR</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Configuração do vendedor selecionado */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-zinc-200">
              <p className="text-sm text-zinc-400 font-medium">Selecione um vendedor para configurar</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white rounded-xl border border-zinc-200 p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                    {selected.photo ? <img src={selected.photo} alt="" className="w-full h-full object-cover" /> : <Users size={18} className="text-zinc-400" />}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-800">{selected.name || selected.username}</p>
                    <p className="text-xs text-zinc-500">{selected.email || "Sem e-mail"}</p>
                  </div>
                </div>

                {/* Resumo */}
                {detail && (
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "Total vendas", value: detail.totalSales },
                      { label: "Ativos cobrados", value: detail.activeBilled },
                      { label: "Em trial", value: detail.inTrial },
                    ].map(c => (
                      <div key={c.label} className="bg-zinc-50 rounded-lg p-3 text-center">
                        <p className="text-xl font-black text-zinc-800">{c.value}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{c.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Configurações padrão */}
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Configuração padrão</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 block mb-1">Tipo</label>
                    <select
                      value={form.commissionType}
                      onChange={e => setForm((f: any) => ({ ...f, commissionType: e.target.value }))}
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="percentage">Percentual (%)</option>
                      <option value="fixed">Valor fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 block mb-1">
                      {form.commissionType === "percentage" ? "Percentual (%)" : "Valor (R$)"}
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.commissionValue}
                      onChange={e => setForm((f: any) => ({ ...f, commissionValue: e.target.value }))}
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-600 block mb-1">Trial (dias sem comissão)</label>
                    <input
                      type="number" min="0"
                      value={form.trialDays}
                      onChange={e => setForm((f: any) => ({ ...f, trialDays: e.target.value }))}
                      className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Exceções por plano */}
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Exceções por plano (opcional)</p>
                <div className="space-y-2">
                  {data.plans.map(plan => {
                    const override = form.commissionByPlan?.[plan.id];
                    const hasOverride = !!override;
                    const type  = hasOverride ? override.type  : form.commissionType;
                    const value = hasOverride ? override.value : form.commissionValue;
                    const preview = type === "fixed" ? fmt(Number(value)) : `${value}% = ${fmt(plan.price * Number(value) / 100)}`;
                    return (
                      <div key={plan.id} className={`rounded-lg border p-3 ${hasOverride ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-zinc-50"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-zinc-700 truncate">{plan.name}</span>
                            <span className="text-xs text-zinc-400">{fmt(plan.price)}/mês</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-semibold text-amber-600">{preview}</span>
                            {hasOverride ? (
                              <button onClick={() => clearPlanOverride(plan.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">remover</button>
                            ) : (
                              <button onClick={() => setPlanOverride(plan.id, "type", form.commissionType)} className="text-xs text-amber-600 hover:text-amber-800 font-medium">personalizar</button>
                            )}
                          </div>
                        </div>
                        {hasOverride && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <select value={override.type} onChange={e => setPlanOverride(plan.id, "type", e.target.value)}
                              className="border border-zinc-300 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-400">
                              <option value="percentage">Percentual (%)</option>
                              <option value="fixed">Valor fixo (R$)</option>
                            </select>
                            <input type="number" step="0.01" min="0" value={override.value}
                              onChange={e => setPlanOverride(plan.id, "value", e.target.value)}
                              className="border border-zinc-300 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-5">
                  <Button onClick={save} disabled={saving} iconLeft={saving ? undefined : <Check size={14} />}>
                    {saving ? "Salvando..." : "Salvar Configuração"}
                  </Button>
                </div>
              </div>

              {/* Tabela de parceiros deste vendedor */}
              {detail && detail.rows.length > 0 && (
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-100">
                    <p className="font-bold text-zinc-800 text-sm">Parceiros vendidos</p>
                    <p className="text-xs text-zinc-500 mt-0.5">MRR de comissão: <span className="font-bold text-amber-600">{fmt(detail.monthlyCommission)}</span></p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50">
                          {["Parceiro", "Plano", "Vlr. Plano", "Comissão", "Status"].map(h => (
                            <th key={h} className="text-left text-xs font-bold text-zinc-500 px-4 py-2.5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.rows.map((row: any) => (
                          <tr key={row.tenantId} className="border-b border-zinc-50 hover:bg-zinc-50">
                            <td className="px-4 py-3 font-semibold text-zinc-800">{row.tenantName}</td>
                            <td className="px-4 py-3 text-zinc-600">{row.planName}</td>
                            <td className="px-4 py-3 text-zinc-600">{fmt(row.planPrice)}</td>
                            <td className="px-4 py-3 font-bold text-amber-600">{fmt(row.commissionAmount)}</td>
                            <td className="px-4 py-3">
                              {!row.isActive ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-500">Inativo</span>
                              ) : row.inTrial ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">Trial</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-600">Ativo</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: EQUIPE (STAFF)
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   MÓDULOS DE PERMISSÃO — SUPER ADMIN
   Definidos aqui para serem usados no modal e sidebar
═══════════════════════════════════════════ */
const SA_MODULES = [
  { key: "dash",        label: "Dashboard",           icon: <LayoutDashboard size={14} /> },
  { key: "plans",       label: "Planos",              icon: <CreditCard size={14} /> },
  { key: "tenants",     label: "Parceiros",           icon: <Building2 size={14} /> },
  { key: "users",       label: "Usuários Admin",      icon: <Users size={14} /> },
  { key: "permissions", label: "Permissões",          icon: <Lock size={14} /> },
  { key: "blog",        label: "Blog",                icon: <BookOpen size={14} /> },
  { key: "wpp",         label: "WhatsApp",            icon: <MessageCircle size={14} /> },
  { key: "sales",       label: "Vendas e Afiliados",  icon: <TrendingUp size={14} /> },
  { key: "commissions", label: "Comissões",           icon: <DollarSign size={14} /> },
  { key: "finance",     label: "Financeiro",          icon: <BarChart2 size={14} /> },
  { key: "qa",          label: "Testes QA",           icon: <CheckCircle size={14} /> },
  { key: "staff",       label: "Minha Equipe",        icon: <Shield size={14} /> },
  { key: "settings",    label: "Configurações",        icon: <Globe size={14} /> },
  { key: "profile",     label: "Meu Perfil",          icon: <User size={14} /> },
];

function StaffTab({ username, userPermissions }: { username: string; userPermissions: any }) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<any>({ 
    username: "", password: "", name: "", email: "", phone: "", 
    birthday: "", role: "", bio: "", photo: "",
    permissions: {}
  });

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const mimeType = file.type;
      try {
        const r = await apiFetch("/api/admin/upload", {
          method: "POST",
          body: JSON.stringify({ data: base64, mimeType })
        });
        if (r.ok) {
          const data = await r.json();
          setForm((f: any) => ({ ...f, photo: data.url || data.path || "" }));
        }
      } catch (err) {
        console.error("Erro ao fazer upload da foto:", err);
      }
    };
    reader.readAsDataURL(file);
  };
  const isMaster = ["admin", "flavio_sikorsky"].includes(username.toLowerCase()) || (userPermissions === null) || (userPermissions?.staff?.ver);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch("/api/super-admin/staff");
      const data = await r.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao carregar equipe:", err);
      setUsers([]);
    }
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
    setEditing(u || null);
    setForm({
      username: u?.username || "",
      password: "",
      name: u?.name || "",
      email: u?.email || "",
      phone: u?.phone || "",
      birthday: u?.birthday ? u.birthday.split("T")[0] : "",
      role: u?.role || "",
      bio: u?.bio || "",
      photo: u?.photo || "",
      permissions: typeof u?.permissions === 'string' ? JSON.parse(u.permissions || '{}') : (u?.permissions || {})
    });
    setModal(true);
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Minha Equipe"
        description={`${(users || []).length} usuário(s) com acesso mestre`}
        icon={Shield}
        action={
          isMaster ? (
            <Button size="sm" iconLeft={<Plus size={14} />} onClick={() => openForm()}>
              Adicionar
            </Button>
          ) : undefined
        }
      />

      {(!users || users.length === 0) ? (
        <EmptyState icon={Shield} title="Nenhum usuário na equipe" />
      ) : (
        <ContentCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  {["Usuário", "E-mail / Telefone", "Acesso desde", ""].map(h => (
                    <th key={h} className={cn("text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest", h === "" && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(users || []).map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {u.photo ? (
                          <img src={u.photo} alt={u.name || u.username} className="w-8 h-8 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-[11px] font-black shrink-0">{(u.name || u.username).charAt(0).toUpperCase()}</div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-black text-zinc-900">{u.name || u.username}</p>
                            {u.username === username && <Badge color="primary">Você</Badge>}
                          </div>
                          <p className="text-[10px] text-zinc-400">@{u.username} • {u.role || "Membro da Equipe"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-bold text-zinc-700">{u.email || "-"}</p>
                      <p className="text-[10px] text-zinc-400">{u.phone || "-"}</p>
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

      <Modal 
        isOpen={modal} 
        onClose={() => setModal(false)} 
        title={editing ? "Editar Perfil da Equipe v2" : "Novo Acesso Equipe v2"} 
        size="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="ghost" onClick={() => setModal(false)} className="text-zinc-500 hover:bg-zinc-100">
              Descartar
            </Button>
            <Button 
              onClick={save} 
              disabled={!form.username || (!editing && !form.password)}
              className="bg-zinc-900 text-white hover:bg-black px-8 shadow-xl shadow-zinc-900/20"
            >
              {editing ? "Atualizar Membro" : "Criar Acesso"}
            </Button>
          </div>
        }
      >
        <div className="space-y-8">
          {/* Seção 1: Informações Básicas e Foto */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-40 shrink-0 flex flex-col items-center">
              <div className="relative group mb-4">
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                
                <div className="w-32 h-32 rounded-[2rem] border-4 border-zinc-50 shadow-xl overflow-hidden bg-zinc-100 relative transition-transform group-hover:scale-105 duration-300">
                  {form.photo ? (
                    <img src={form.photo} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 bg-zinc-50">
                      <Camera size={32} strokeWidth={1.5} />
                      <span className="text-[10px] font-bold mt-2 uppercase tracking-widest">Sem foto</span>
                    </div>
                  )}
                  
                  <button 
                    type="button" 
                    onClick={() => photoInputRef.current?.click()} 
                    className="absolute inset-0 bg-zinc-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-2 backdrop-blur-[2px]"
                  >
                    <Camera size={20} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Alterar</span>
                  </button>
                </div>

                {form.photo && (
                  <button 
                    type="button" 
                    onClick={() => setForm((f: any) => ({ ...f, photo: "" }))} 
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-lg border border-zinc-100 flex items-center justify-center text-red-500 hover:text-red-600 hover:scale-110 transition-all z-10"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Foto de Perfil</p>
            </div>

            <div className="flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Nome Completo" 
                  value={form.name} 
                  onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} 
                  placeholder="Ex: Amanda Silva" 
                  className="bg-zinc-50/50 border-zinc-100 focus:bg-white"
                />
                <Input 
                  label="Cargo / Função" 
                  value={form.role} 
                  onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))} 
                  placeholder="Ex: Suporte, Vendas..." 
                  className="bg-zinc-50/50 border-zinc-100 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="E-mail" 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} 
                  placeholder="email@agendelle.com" 
                  iconLeft={<Mail size={14} className="text-zinc-400" />}
                  className="bg-zinc-50/50 border-zinc-100 focus:bg-white"
                />
                <Input 
                  label="Telefone" 
                  value={form.phone} 
                  onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} 
                  placeholder="(00) 00000-0000" 
                  className="bg-zinc-50/50 border-zinc-100 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Credenciais de Acesso */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <h4 className="text-[11px] font-black text-zinc-800 uppercase tracking-widest">Acesso ao Sistema</h4>
              <div className="flex-1 h-px bg-zinc-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Input 
                label="Usuário (Login) *" 
                value={form.username} 
                onChange={e => setForm((f: any) => ({ ...f, username: e.target.value }))} 
                placeholder="amanda_admin" 
                disabled={editing && form.username === "admin"}
                className="bg-zinc-50/50 border-zinc-100 focus:bg-white font-bold"
              />
              <Input 
                label={editing ? "Alterar Senha" : "Senha *"} 
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))}
                placeholder={editing ? "Manter atual" : "••••••"}
                className="bg-zinc-50/50 border-zinc-100 focus:bg-white"
                iconRight={
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />
              <Input 
                label="Data de Aniversário" 
                type="date" 
                value={form.birthday} 
                onChange={e => setForm((f: any) => ({ ...f, birthday: e.target.value }))} 
                className="bg-zinc-50/50 border-zinc-100 focus:bg-white"
              />
            </div>
            
            <Textarea 
              label="Biografia ou Observações Internas" 
              value={form.bio} 
              onChange={e => setForm((f: any) => ({ ...f, bio: e.target.value }))} 
              rows={2} 
              placeholder="Breve descrição sobre o membro da equipe..." 
              className="bg-zinc-50/50 border-zinc-100 focus:bg-white text-sm"
            />
          </div>

          {/* Seção 3: Permissões de Módulo */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <h4 className="text-[11px] font-black text-zinc-800 uppercase tracking-widest">Módulos Permitidos</h4>
              <div className="flex-1 h-px bg-zinc-100" />
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {SA_MODULES.map(m => {
                const has = form.permissions === "all" || (form.permissions[m.key]?.ver);
                const Icon = {
                  dash: LayoutDashboard,
                  plans: CreditCard,
                  tenants: Building2,
                  users: Users,
                  permissions: Lock,
                  blog: BookOpen,
                  wpp: MessageCircle,
                  sales: TrendingUp,
                  commissions: DollarSign,
                  finance: BarChart2,
                  qa: CheckCircle,
                  staff: Shield,
                  settings: Globe,
                  profile: User
                }[m.key as string] || Lock;

                return (
                  <label key={m.key} className={cn(
                    "flex flex-col gap-3 p-4 rounded-[1.25rem] border transition-all cursor-pointer group relative overflow-hidden",
                    has 
                      ? "bg-white border-amber-500 shadow-[0_8px_30px_rgb(245,158,11,0.08)] ring-1 ring-amber-500/10" 
                      : "bg-zinc-50/50 border-zinc-100 hover:border-zinc-200 grayscale opacity-70"
                  )}>
                    <div className="flex items-start justify-between">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                        has ? "bg-amber-500 text-white rotate-6" : "bg-zinc-200 text-zinc-500 group-hover:rotate-6"
                      )}>
                        <Icon size={18} />
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        has ? "bg-amber-500 border-amber-500" : "bg-white border-zinc-200"
                      )}>
                        {has && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                    
                    <div>
                      <p className={cn("text-[11px] font-black uppercase tracking-tight", has ? "text-zinc-900" : "text-zinc-500")}>
                        {m.label}
                      </p>
                      <p className="text-[9px] text-zinc-400 font-medium leading-none mt-1">Acesso ao módulo</p>
                    </div>

                    <input
                      type="checkbox"
                      checked={!!has}
                      onChange={e => {
                        const newPerms = typeof form.permissions === 'object' ? { ...form.permissions } : {};
                        if (e.target.checked) {
                          newPerms[m.key] = { ver: true };
                        } else {
                          delete newPerms[m.key];
                        }
                        setForm((f: any) => ({ ...f, permissions: newPerms }));
                      }}
                      className="hidden"
                    />
                  </label>
                );
              })}
            </div>
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
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<any>({
    id: "",
    name: "",
    email: "",
    phone: "",
    birthday: "",
    bio: "",
    photo: "",
    password: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/super-admin/profile/${username}`);
      const data = await r.json();
      if (data) {
        setForm({
          ...data,
          birthday: data.birthday ? data.birthday.split("T")[0] : "",
          password: "", // Não carregar a senha atual
        });
      }
    } catch (err) {
      toast.error("Falha ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }, [username, toast]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const r = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: formData
      });
      const d = await r.json();
      if (d.url) setForm((f: any) => ({ ...f, photo: d.url }));
    } catch {
      toast.error("Falha ao subir foto");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiFetch("/api/super-admin/profile", {
        method: "PUT",
        body: JSON.stringify(form)
      });
      if (r.ok) {
        toast.success("Perfil atualizado com sucesso!");
        setForm((f: any) => ({ ...f, password: "" })); // Limpa campo de senha após salvar
      } else {
        const d = await r.json();
        throw new Error(d.error || "Erro ao salvar");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-zinc-400 font-semibold">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      <SectionTitle title="Meu Perfil" description="Gerencie seus dados e segurança da conta" icon={User} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Info / Foto */}
        <div className="lg:col-span-1 space-y-6">
          <PanelCard>
            <div className="flex flex-col items-center text-center py-4">
              <div className="relative mb-4 group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-zinc-100 flex items-center justify-center">
                  {form.photo ? (
                    <img src={form.photo} alt={form.name} className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-zinc-300" />
                  )}
                </div>
                <label className="absolute bottom-1 right-1 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-amber-600 transition-colors border-4 border-white">
                  <Camera size={18} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                </label>
              </div>
              <h3 className="text-xl font-black text-zinc-900">{form.name || username}</h3>
              <p className="text-sm font-bold text-amber-600 uppercase tracking-widest mt-1">Super Administrador</p>
              
              <div className="mt-6 w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-left">
                <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Conta master da plataforma. Acesso total e irrestrito. Esta conta não é visível para outros parceiros.
                </p>
              </div>
            </div>
          </PanelCard>

          <PanelCard>
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Acesso ao Sistema</h4>
            <div className="space-y-4">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Usuário de Acesso</p>
                <p className="text-sm font-black text-zinc-600">{username}</p>
                <p className="text-[9px] text-zinc-400 mt-1 italic">* O nome de usuário não pode ser alterado por segurança.</p>
              </div>
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Status da Conta</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-black text-emerald-600 uppercase tracking-tighter">Ativo — Master</span>
                </div>
              </div>
            </div>
          </PanelCard>
        </div>

        {/* Lado Direito: Formulário */}
        <div className="lg:col-span-2 space-y-6">
          <PanelCard>
            <div className="px-1 pt-1 mb-6">
              <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                <UserCircle2 size={16} className="text-amber-500" />
                Dados Pessoais
              </h4>
            </div>

            <FormRow>
              <Input label="Nome Completo" value={form.name} onChange={e => setForm((f:any) => ({ ...f, name: e.target.value }))} placeholder="Ex: Luan dos Santos" />
              <Input label="E-mail" type="email" value={form.email} onChange={e => setForm((f:any) => ({ ...f, email: e.target.value }))} placeholder="luan@agendelle.com.br" />
              <Input label="WhatsApp / Telefone" value={form.phone} onChange={e => setForm((f:any) => ({ ...f, phone: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
              <Input label="Data de Nascimento" type="date" value={form.birthday} onChange={e => setForm((f:any) => ({ ...f, birthday: e.target.value }))} />
            </FormRow>
            
            <div className="mt-4">
              <Textarea 
                label="Sobre Mim / Biografia" 
                value={form.bio} 
                onChange={e => setForm((f:any) => ({ ...f, bio: e.target.value }))} 
                rows={4} 
                placeholder="Conte um pouco sobre sua trajetória profissional..." 
              />
            </div>
          </PanelCard>

          <PanelCard>
            <div className="px-1 pt-1 mb-6">
              <h4 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                <Lock size={16} className="text-amber-500" />
                Segurança
              </h4>
            </div>

            <div className="max-w-md">
              <Input 
                label="Nova Senha"
                type={showPass ? "text" : "password"} 
                value={form.password} 
                onChange={e => setForm((f:any) => ({ ...f, password: e.target.value }))} 
                placeholder="Deixe em branco para manter a atual"
                iconRight={
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-zinc-400 hover:text-zinc-600 transition-colors pr-2">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <p className="text-xs text-zinc-400 mt-2">
                Use senhas fortes com números e caracteres especiais para garantir a segurança da plataforma.
              </p>
            </div>
          </PanelCard>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={loadProfile} disabled={saving}>Descartar Alterações</Button>
            <Button onClick={save} loading={saving} iconLeft={<CheckCircle size={16} />}>Salvar Perfil Profissional</Button>
          </div>
        </div>
      </div>
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
function WppTab({ plans, onUpdatePlans }: { plans: any[]; onUpdatePlans?: () => void }) {
  const [wppSubTab, setWppSubTab] = useState<"connections" | "bot">("connections");
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
      if (onUpdatePlans) onUpdatePlans();
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
        title="WhatsApp"
        description="Gerencie conexões, permissões e o Bot Central de atendimento"
        icon={MessageCircle}
        action={
          <IconButton variant="ghost" onClick={load} title="Atualizar">
            <RefreshCw size={16} />
          </IconButton>
        }
      />

      {/* Sub-abas principais */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
        <button onClick={() => setWppSubTab("connections")}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${wppSubTab === "connections" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
          Conexões & Parceiros
        </button>
        <button onClick={() => setWppSubTab("bot")}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${wppSubTab === "bot" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
          Bot Central de Atendimento
        </button>
      </div>

      {wppSubTab === "bot" && <BotCentralTab />}

      {wppSubTab === "connections" && <>

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

      </>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   BOT CENTRAL — componente completo
═══════════════════════════════════════════ */
function BotCentralTab() {
  const [subView, setSubView] = useState<"dashboard" | "sectors" | "queue">("dashboard");
  const [sectors, setSectors] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [botStats, setBotStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal de setor
  const [sectorModal, setSectorModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [sectorForm, setSectorForm] = useState({ name: "", menuKey: "", description: "", sortOrder: 0, isActive: true });
  const [attendantList, setAttendantList] = useState<{ name: string; phone: string }[]>([{ name: "", phone: "" }]);

  // Filtro de fila
  const [queueFilter, setQueueFilter] = useState<"waiting" | "active" | "closed" | "all">("all");
  const [selectedConv, setSelectedConv] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [secR, convR, statsR] = await Promise.all([
        apiFetch("/api/super-admin/bot/sectors"),
        apiFetch("/api/super-admin/bot/conversations"),
        apiFetch("/api/super-admin/bot/stats"),
      ]);
      setSectors(Array.isArray(await secR.clone().json()) ? await secR.json() : []);
      setConversations(Array.isArray(await convR.clone().json()) ? await convR.json() : []);
      setBotStats(await statsR.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Intervalo de atualização da fila a cada 15s
  useEffect(() => {
    const t = setInterval(() => {
      if (subView === "queue" || subView === "dashboard") {
        apiFetch("/api/super-admin/bot/conversations").then(r => r.json()).then(d => { if (Array.isArray(d)) setConversations(d); }).catch(() => {});
        apiFetch("/api/super-admin/bot/stats").then(r => r.json()).then(d => setBotStats(d)).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(t);
  }, [subView]);

  const openNewSector = () => {
    setSectorForm({ name: "", menuKey: "", description: "", sortOrder: sectors.length + 1, isActive: true });
    setAttendantList([{ name: "", phone: "" }]);
    setSectorModal({ open: true, data: null });
  };

  const openEditSector = (s: any) => {
    setSectorForm({ name: s.name, menuKey: s.menuKey, description: s.description || "", sortOrder: s.sortOrder, isActive: s.isActive });
    const att = (s.attendants || []).map((a: any) =>
      typeof a === "object" ? a : { name: "", phone: String(a) }
    );
    setAttendantList(att.length ? att : [{ name: "", phone: "" }]);
    setSectorModal({ open: true, data: s });
  };

  const saveSector = async () => {
    setSaving(true);
    try {
      const attendants = attendantList
        .filter(a => a.phone.replace(/\D/g, "").length >= 10)
        .map(a => ({ name: a.name.trim(), phone: a.phone.replace(/\D/g, "") }));
      const payload = { ...sectorForm, attendants };
      if (sectorModal.data) {
        await apiFetch(`/api/super-admin/bot/sectors/${sectorModal.data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/super-admin/bot/sectors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      setSectorModal({ open: false, data: null });
      await load();
    } catch {}
    setSaving(false);
  };

  const deleteSector = async (id: string) => {
    if (!confirm("Remover este setor? As conversas existentes não serão apagadas.")) return;
    await apiFetch(`/api/super-admin/bot/sectors/${id}`, { method: "DELETE" });
    await load();
  };

  const closeConversation = async (id: string) => {
    await apiFetch(`/api/super-admin/bot/conversations/${id}/close`, { method: "PATCH" });
    setConversations(prev => prev.map(c => c.id === id ? { ...c, status: "closed" } : c));
    if (selectedConv?.id === id) setSelectedConv((p: any) => p ? { ...p, status: "closed" } : null);
  };

  const filteredConvs = conversations.filter(c => queueFilter === "all" || c.status === queueFilter);

  const statusBadge = (s: string) => {
    if (s === "waiting") return <Badge color="warning" dot>Na fila</Badge>;
    if (s === "active")  return <Badge color="success" dot>Em atendimento</Badge>;
    return <Badge color="default" dot>Encerrada</Badge>;
  };

  const SUB_TABS = [
    { key: "dashboard", label: "Visão Geral" },
    { key: "sectors",   label: "Setores" },
    { key: "queue",     label: `Fila / Conversas${botStats?.totalWaiting ? ` (${botStats.totalWaiting})` : ""}` },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Modal de setor */}
      {sectorModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-zinc-900">{sectorModal.data ? "Editar Setor" : "Novo Setor"}</h3>
              <button onClick={() => setSectorModal({ open: false, data: null })}><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-zinc-700 block mb-1">Nome do Setor *</label>
                  <Input placeholder="Ex: Vendas" value={sectorForm.name} onChange={e => setSectorForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-black text-zinc-700 block mb-1">Tecla do Menu *</label>
                  <Input placeholder="Ex: 1" value={sectorForm.menuKey} onChange={e => setSectorForm(p => ({ ...p, menuKey: e.target.value }))} maxLength={3} />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-zinc-700 block mb-1">Descrição (exibida no menu)</label>
                <Input placeholder="Ex: Falar sobre nossos planos e serviços" value={sectorForm.description} onChange={e => setSectorForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-black text-zinc-700 block mb-1">Atendentes</label>
                <div className="space-y-2">
                  {attendantList.map((att, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Nome do atendente"
                        value={att.name}
                        onChange={e => setAttendantList(prev => prev.map((a, i) => i === idx ? { ...a, name: e.target.value } : a))}
                        style={{ flex: 1 }}
                      />
                      <Input
                        placeholder="Ex: 5515999990000"
                        value={att.phone}
                        onChange={e => setAttendantList(prev => prev.map((a, i) => i === idx ? { ...a, phone: e.target.value } : a))}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => setAttendantList(prev => prev.length === 1 ? [{ name: "", phone: "" }] : prev.filter((_, i) => i !== idx))}
                        className="text-zinc-300 hover:text-red-400 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAttendantList(prev => [...prev, { name: "", phone: "" }])}
                    className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
                  >
                    <span>+ Adicionar atendente</span>
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Nome exibido no bot ao aceitar. Telefone com DDI (ex: 5515...). Receberão notificações de novo atendimento.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-zinc-700 block mb-1">Ordem no menu</label>
                  <Input type="number" value={sectorForm.sortOrder} onChange={e => setSectorForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={sectorForm.isActive} onCheckedChange={v => setSectorForm(p => ({ ...p, isActive: v }))} />
                  <span className="text-xs text-zinc-600">Ativo</span>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => setSectorModal({ open: false, data: null })}>Cancelar</Button>
                <Button variant="primary" onClick={saveSector} loading={saving} disabled={!sectorForm.name || !sectorForm.menuKey}>Salvar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes da conversa */}
      {selectedConv && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 560, maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="text-sm font-black text-zinc-900">Conversa — {selectedConv.clientPhone}</h3>
                <p className="text-xs text-zinc-400">{selectedConv.sector?.name || "Sem setor"} · {statusBadge(selectedConv.status)}</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedConv.status !== "closed" && (
                  <Button size="xs" variant="danger" onClick={() => { closeConversation(selectedConv.id); }}>Encerrar</Button>
                )}
                <button onClick={() => setSelectedConv(null)}><X size={16} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", background: "#f9fafb", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {(selectedConv.messages || []).length === 0 && <p className="text-xs text-zinc-400 text-center py-4">Sem mensagens registradas</p>}
              {(selectedConv.messages || []).map((m: any) => (
                <div key={m.id} className={`flex ${m.fromRole === "client" ? "justify-start" : "justify-end"}`}>
                  <div style={{ maxWidth: "75%", background: m.fromRole === "client" ? "#fff" : m.fromRole === "bot" ? "#fef3c7" : "#d1fae5", borderRadius: 10, padding: "6px 10px", border: "1px solid #f3f4f6" }}>
                    <p className={`text-[9px] font-black mb-1 ${m.fromRole === "client" ? "text-zinc-400" : m.fromRole === "bot" ? "text-amber-600" : "text-emerald-600"}`}>
                      {m.fromRole === "client" ? "Cliente" : m.fromRole === "bot" ? "Bot" : "Atendente"}
                      {m.fromPhone ? ` · ${m.fromPhone}` : ""}
                    </p>
                    <p className="text-xs text-zinc-800 whitespace-pre-wrap">{m.body}</p>
                    <p className="text-[9px] text-zinc-300 mt-1">{new Date(m.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SectionTitle title="Bot Central de Atendimento" description="Configure setores, acompanhe filas e histórico de conversas" icon={MessageCircle}
        action={<IconButton variant="ghost" onClick={load} title="Atualizar"><RefreshCw size={16} /></IconButton>}
      />

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubView(t.key)}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${subView === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── VISÃO GERAL ─────────────────────────────────── */}
      {subView === "dashboard" && (
        <div className="space-y-4">
          <StatGrid cols={4}>
            <StatCard icon={MessageCircle} title="Na Fila Agora"     value={botStats?.totalWaiting ?? "—"}     color="warning" delay={0}    />
            <StatCard icon={MessageCircle} title="Em Atendimento"    value={botStats?.totalActive ?? "—"}      color="success" delay={0.05} />
            <StatCard icon={MessageCircle} title="Encerradas Hoje"   value={botStats?.totalClosedToday ?? "—"} color="info"    delay={0.1}  />
            <StatCard icon={MessageCircle} title="Conversas Hoje"    value={botStats?.totalConversations ?? "—"} color="purple" delay={0.15} />
          </StatGrid>

          {/* Por setor */}
          {(botStats?.sectorCounts || []).length > 0 && (
            <ContentCard padding="none">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h3 className="text-sm font-black text-zinc-800">Status por Setor</h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {(botStats.sectorCounts || []).map((sc: any) => (
                  <div key={sc.sectorId} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm font-black text-zinc-800">{sc.name}</p>
                    <div className="flex gap-2">
                      <Badge color="warning">{sc.waiting} na fila</Badge>
                      <Badge color="success">{sc.active} em atendimento</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ContentCard>
          )}

          <ContentCard>
            <div className="space-y-3">
              <h3 className="text-sm font-black text-zinc-800">Como funciona o Bot Central</h3>
              <div className="space-y-2 text-xs text-zinc-600">
                <p>1. O número do sistema (conectado na aba <strong>WhatsApp</strong>) recebe mensagens de clientes.</p>
                <p>2. O bot exibe um menu com os setores cadastrados abaixo.</p>
                <p>3. O cliente digita o número do setor desejado e é colocado na fila.</p>
                <p>4. Os atendentes do setor recebem uma notificação via WhatsApp com os dados do cliente.</p>
                <p>5. O primeiro atendente que responder assume o atendimento.</p>
                <p>6. Qualquer parte pode digitar <strong>&SAIR</strong> para encerrar a conversa.</p>
                <p>7. O cliente pode digitar <strong>0</strong> ou <strong>menu</strong> para voltar ao menu principal.</p>
              </div>
            </div>
          </ContentCard>
        </div>
      )}

      {/* ── SETORES ─────────────────────────────────────── */}
      {subView === "sectors" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={openNewSector}>Novo Setor</Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">Carregando...</div>
          ) : sectors.length === 0 ? (
            <ContentCard>
              <div className="text-center py-8">
                <MessageCircle size={32} className="text-zinc-200 mx-auto mb-3" />
                <p className="text-sm font-black text-zinc-400">Nenhum setor cadastrado</p>
                <p className="text-xs text-zinc-300 mt-1">Crie setores para o bot redirecionar clientes</p>
                <Button variant="primary" size="sm" className="mt-4" onClick={openNewSector}>Criar primeiro setor</Button>
              </div>
            </ContentCard>
          ) : (
            <ContentCard padding="none">
              <div className="divide-y divide-zinc-100">
                {sectors.map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/60 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-zinc-600">{s.menuKey}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-zinc-900">{s.name}</p>
                        <Badge color={s.isActive ? "success" : "default"}>{s.isActive ? "Ativo" : "Inativo"}</Badge>
                      </div>
                      {s.description && <p className="text-xs text-zinc-400 mt-0.5">{s.description}</p>}
                      <p className="text-[10px] text-zinc-300 mt-1">
                        {(s.attendants || []).length === 0
                          ? "Sem atendentes cadastrados"
                          : `${(s.attendants || []).length} atendente(s): ${(s.attendants || []).map((a: any) => typeof a === "object" ? (a.name || a.phone) : a).join(", ")}`}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <IconButton variant="ghost" onClick={() => openEditSector(s)} title="Editar"><Edit2 size={14} /></IconButton>
                      <IconButton variant="ghost" onClick={() => deleteSector(s.id)} title="Remover"><Trash2 size={14} /></IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </ContentCard>
          )}

          <ContentCard>
            <div className="space-y-2">
              <h3 className="text-xs font-black text-zinc-600 uppercase tracking-wider">Preview do Menu</h3>
              <div style={{ background: "#075E54", borderRadius: 12, padding: 14, fontFamily: "monospace" }}>
                <p style={{ color: "#ECE5DD", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {sectors.filter(s => s.isActive).length === 0
                    ? "Cadastre setores para ver o preview do menu aqui."
                    : `Bom dia! 😊 Bem-vindo(a) ao nosso atendimento via WhatsApp.\n\nComo posso te ajudar hoje? Responda com o *número* da opção desejada:\n\n${sectors.filter(s => s.isActive).sort((a,b) => a.sortOrder - b.sortOrder).map(s => `*${s.menuKey}* — ${s.name}${s.description ? `\n   _${s.description}_` : ""}`).join("\n")}\n\n*0* — 🏠 Voltar ao menu principal\n\n_Digite *&SAIR* a qualquer momento para encerrar o atendimento._`}
                </p>
              </div>
            </div>
          </ContentCard>
        </div>
      )}

      {/* ── FILA / CONVERSAS ─────────────────────────────── */}
      {subView === "queue" && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "waiting", "active", "closed"] as const).map(f => (
              <button key={f} onClick={() => setQueueFilter(f)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-all ${queueFilter === f ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"}`}>
                {f === "all" ? "Todas" : f === "waiting" ? "Na Fila" : f === "active" ? "Em Atendimento" : "Encerradas"}
                {f !== "all" && ` (${conversations.filter(c => c.status === f).length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-zinc-400 text-sm">Carregando...</div>
          ) : filteredConvs.length === 0 ? (
            <ContentCard>
              <div className="text-center py-8">
                <p className="text-sm font-black text-zinc-400">Nenhuma conversa encontrada</p>
              </div>
            </ContentCard>
          ) : (
            <ContentCard padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      {["Cliente", "Setor", "Atendente", "Status", "Início", "Mensagens", "Ações"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredConvs.map(conv => (
                      <tr key={conv.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-black text-zinc-900">{conv.clientName || conv.clientPhone}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">{conv.clientPhone}</p>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-zinc-600 whitespace-nowrap">{conv.sector?.name || "—"}</td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500 font-mono whitespace-nowrap">{conv.attendantPhone || "—"}</td>
                        <td className="px-4 py-3.5">{statusBadge(conv.status)}</td>
                        <td className="px-4 py-3.5 text-[10px] text-zinc-400 whitespace-nowrap">{new Date(conv.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-4 py-3.5 text-xs text-zinc-500">{(conv.messages || []).length}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1.5">
                            <Button size="xs" variant="ghost" onClick={() => setSelectedConv(conv)}>Ver</Button>
                            {conv.status !== "closed" && (
                              <Button size="xs" variant="danger" onClick={() => closeConversation(conv.id)}>Encerrar</Button>
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
        </div>
      )}
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
  const toast = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

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
    try {
      await apiFetch(`/api/super-admin/blog/posts/${id}/publish`, { method: "PATCH" });
      toast.success("Post publicado com sucesso!");
      fetch_();
    } catch { toast.error("Erro ao publicar post"); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await apiFetch(`/api/super-admin/blog/posts/${confirmDelete.id}`, { method: "DELETE" });
      toast.success("Post excluído com sucesso!");
      fetch_();
    } catch { toast.error("Erro ao excluir post"); }
    setDeleting(null);
    setConfirmDelete(null);
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
                  <button onClick={() => setConfirmDelete({ id: post.id, title: post.title })} disabled={deleting === post.id} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Excluir">
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

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Excluir post"
        message={<>Tem certeza que deseja excluir o post <strong>"{confirmDelete?.title}"</strong>? Esta ação não pode ser desfeita.</>}
        confirmLabel="Excluir"
        loading={!!deleting}
      />
    </div>
  );
}

// ── Blog Post Editor (criar / editar) ────────────────────────────────────────
function BlogPostEditor({ post, onBack, onSaved }: { post: any; onBack: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
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
        if (match) setForm((f: any) => ({ ...f, authorId: match.id }));
      }
    });
  }, []);

  // Upload de imagem de capa
  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const mimeType = file.type;
      try {
        const r = await apiFetch("/api/admin/upload", {
          method: "POST",
          body: JSON.stringify({ data: base64, mimeType })
        });
        if (r.ok) {
          const data = await r.json();
          set("coverImage", data.url || data.path || "");
        }
      } catch {
        set("coverImage", URL.createObjectURL(file));
      } finally {
        setUploadingCover(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = async (publishNow = false) => {
    if (!form.title || !form.content) { toast.error("Título e conteúdo são obrigatórios"); return; }
    setSaving(true);
    try {
      const tagsArr = form.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
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
      if (!r.ok) {
        const err = await r.json();
        toast.error(err.error || "Erro ao salvar post");
      } else {
        toast.success(publishNow ? "Post publicado!" : post ? "Post atualizado!" : "Post salvo como rascunho!");
        onSaved();
      }
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
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
            <p className="text-xs text-zinc-400">Configure os metadados de SEO para melhorar o ranqueamento nos buscadores e o preview no WhatsApp e redes sociais.</p>

            {/* Aviso de imagem OG */}
            {!form.coverImage && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <span className="text-amber-500 text-base mt-0.5">⚠️</span>
                <p className="text-xs text-amber-700">
                  <strong>Sem imagem de capa!</strong> O WhatsApp e redes sociais vão mostrar a imagem padrão da Agendelle.
                  Adicione uma imagem de capa na aba <strong>Conteúdo</strong> para um preview personalizado.
                </p>
              </div>
            )}

            <div>
              <Input label="Título SEO" value={form.seoTitle} onChange={e => set("seoTitle", e.target.value)} placeholder="Título para buscadores (max 60 chars)" maxLength={60} />
              <p className="text-[10px] text-zinc-400 mt-1">{form.seoTitle.length}/60 caracteres</p>
            </div>
            <div>
              <Textarea label="Descrição SEO (meta description)" value={form.seoDescription} onChange={e => set("seoDescription", e.target.value)} placeholder="Descrição para buscadores (max 160 chars)" maxLength={160} rows={3} />
              <p className="text-[10px] text-zinc-400 mt-1">{form.seoDescription.length}/160 caracteres</p>
            </div>
            <Input label="Palavras-chave SEO" value={form.seoKeywords} onChange={e => set("seoKeywords", e.target.value)} placeholder="barbearia, agendamento, gestão salão" />

            {/* Preview Google */}
            <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Preview no Google</p>
              <p className="text-sm font-bold text-blue-600 truncate">{form.seoTitle || form.title || "Título do artigo"}</p>
              <p className="text-[11px] text-green-700">agendelle.com.br/blog/...</p>
              <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{form.seoDescription || form.excerpt || "Descrição do artigo..."}</p>
            </div>

            {/* Preview WhatsApp / redes sociais */}
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-4 pt-3 pb-2">Preview WhatsApp / Redes Sociais</p>
              <div className="bg-white border-t border-zinc-100">
                {form.coverImage ? (
                  <img src={form.coverImage} alt="OG preview" className="w-full h-40 object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                ) : (
                  <div className="w-full h-40 bg-amber-50 flex flex-col items-center justify-center gap-1 border-b border-amber-100">
                    <span className="text-2xl">🖼️</span>
                    <p className="text-[10px] text-amber-600 font-medium">Imagem padrão Agendelle</p>
                  </div>
                )}
                <div className="px-3 py-2.5 bg-zinc-50 border-t border-zinc-200">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wider">agendelle.com.br</p>
                  <p className="text-xs font-bold text-zinc-800 mt-0.5 truncate">{form.seoTitle || form.title || "Título do artigo"}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{form.seoDescription || form.excerpt || "Descrição do artigo..."}</p>
                </div>
              </div>
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
          <Input label="Nome *" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="Ex: Gestão, Marketing..." />
          <Input label="Descrição" value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} />
          <div>
            <p className="text-xs font-bold text-zinc-700 mb-1.5">Cor</p>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm((f: any) => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer" />
              <Input value={form.color} onChange={e => setForm((f: any) => ({ ...f, color: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-700">Categoria ativa</p>
            <Switch checked={form.isActive} onCheckedChange={v => setForm((f: any) => ({ ...f, isActive: v }))} />
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
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const mimeType = file.type;
      try {
        const r = await apiFetch("/api/admin/upload", {
          method: "POST",
          body: JSON.stringify({ data: base64, mimeType })
        });
        if (r.ok) {
          const data = await r.json();
          setForm((f: any) => ({ ...f, photo: data.url || data.path || "" }));
        }
      } catch (err) {
        console.error("Erro ao fazer upload da foto do autor:", err);
      }
    };
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
          <Input label="Nome *" value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
          <Input label="Cargo / Função" value={form.role} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))} placeholder="Ex: Redatora de Conteúdo" />
          <Textarea label="Bio" value={form.bio} onChange={e => setForm((f: any) => ({ ...f, bio: e.target.value }))} rows={3} />
          <Input label="Instagram" value={form.instagram} onChange={e => setForm((f: any) => ({ ...f, instagram: e.target.value }))} placeholder="@usuario" />
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
                  <button type="button" onClick={() => setForm((f: any) => ({ ...f, photo: "" }))}
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


// ── Settings ───────────────────────────────────────────────────────────────
function SettingsTab() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item: any | null }>({ open: false, item: null });
  const [form, setForm] = useState({ name: "", phone: "", type: "sales", isPrimary: false, isActive: true });
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/super-admin/platform-contacts").then(r => r.json());
      setContacts(Array.isArray(r) ? r : []);
    } catch (err) {
      console.error("Erro ao carregar contatos:", err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ name: "", phone: "", type: "sales", isPrimary: false, isActive: true });
    setModal({ open: true, item: null });
  };

  const openEdit = (c: any) => {
    setForm({ name: c.name, phone: c.phone, type: c.type, isPrimary: c.isPrimary, isActive: c.isActive });
    setModal({ open: true, item: c });
  };

  const handleSave = async () => {
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      const url = modal.item ? `/api/super-admin/platform-contacts/${modal.item.id}` : "/api/super-admin/platform-contacts";
      const method = modal.item ? "PUT" : "POST";
      const r = await apiFetch(url, { method, body: JSON.stringify(form) });
      if (r.ok) {
        toast.success(modal.item ? "Contato atualizado!" : "Contato criado!");
        setModal({ open: false, item: null });
        load();
      } else {
        toast.error("Erro ao salvar contato.");
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este contato?")) return;
    try {
      const r = await apiFetch(`/api/super-admin/platform-contacts/${id}`, { method: "DELETE" });
      if (r.ok) {
        toast.success("Contato removido.");
        load();
      }
    } catch (err) {
      toast.error("Erro ao excluir.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Configurações da Plataforma"
        description="Gerencie os canais de atendimento e vendas do Agendelle"
        icon={Globe}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Canais de Atendimento (WhatsApp)</h3>
            <Button onClick={openNew} size="sm" iconLeft={<Plus size={14} />}>Novo Canal</Button>
          </div>

          <ContentCard padding="none">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-400">Carregando...</div>
            ) : contacts.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="Sem canais"
                description="Cadastre números de WhatsApp para Vendas e Suporte."
                action={<Button onClick={openNew} size="sm">Adicionar Canal</Button>}
              />
            ) : (
              <div className="divide-y divide-zinc-100">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50 transition-colors">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                      c.type === "sales" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {c.type === "sales" ? <TrendingUp size={18} /> : <Shield size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-zinc-800">{c.name}</p>
                        {c.isPrimary && <Badge color="success" size="sm">Principal</Badge>}
                        {c.type === "sales" ? <Badge color="warning" size="sm">Vendas</Badge> : <Badge color="info" size="sm">Suporte</Badge>}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{c.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-1 rounded-full",
                        c.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                      )}>
                        {c.isActive ? "Ativo" : "Inativo"}
                      </span>
                      <div className="flex gap-1">
                        <IconButton onClick={() => openEdit(c)} variant="ghost" size="sm"><Edit2 size={13} /></IconButton>
                        <IconButton onClick={() => handleDelete(c.id)} variant="ghost" size="sm" className="text-red-400 hover:text-red-600"><Trash2 size={13} /></IconButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>
        </div>

        <div className="space-y-6">
          <ContentCard>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Globe size={24} />
              </div>
              <h3 className="text-base font-black text-zinc-900 leading-tight">Como funciona?</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Os contatos marcados como <strong>Principal</strong> serão exibidos nos botões de "Falar com Vendas" e "Suporte" na Landing Page e no Dashboard dos parceiros.
              </p>
              <div className="pt-2 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-700">Landing Page</p>
                    <p className="text-[10px] text-zinc-500">CTA de vendas direciona para o número principal de vendas.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-700">Dashboard Parceiro</p>
                    <p className="text-[10px] text-zinc-500">O botão de ajuda no painel do parceiro abre o WhatsApp de suporte.</p>
                  </div>
                </div>
              </div>
            </div>
          </ContentCard>
        </div>
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, item: null })}
        title={modal.item ? "Editar Canal" : "Novo Canal de Atendimento"}
      >
        <div className="p-6 space-y-4">
          <Input
            label="Nome de exibição *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: WhatsApp Vendas Principal"
          />
          <Input
            label="Número (com DDD e DDI) *"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="Ex: 5511999998888"
          />
          
          <Select
            label="Tipo de canal"
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}
          >
            <option value="sales">Vendas</option>
            <option value="support">Suporte / Atendimento</option>
          </Select>

          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
            <div>
              <p className="text-xs font-bold text-zinc-700">Canal Principal</p>
              <p className="text-[10px] text-zinc-400">Define como o número padrão para este tipo.</p>
            </div>
            <Switch checked={form.isPrimary} onCheckedChange={v => setForm({ ...form, isPrimary: v })} />
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
            <div>
              <p className="text-xs font-bold text-zinc-700">Ativo</p>
              <p className="text-[10px] text-zinc-400">Se desativado, não será usado em nenhum lugar.</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="ghost" onClick={() => setModal({ open: false, item: null })}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.phone}>
            {saving ? "Salvando..." : "Salvar Canal"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ABA: QA / TESTES DO SISTEMA
═══════════════════════════════════════════ */

const QA_TESTS: { id: string; section: string; title: string; steps: string; expected: string; warning?: string }[] = [
  // 1. Autenticação
  { id: "t1",  section: "Autenticação", title: "Login com credenciais válidas (Admin)", steps: "1. Abra o sistema\n2. Digite e-mail e senha válidos\n3. Clique em Entrar", expected: "Redireciona para /dashboard com nome do usuário na sidebar." },
  { id: "t2",  section: "Autenticação", title: "Login com senha errada", steps: "1. Digite e-mail válido + senha errada\n2. Clique em Entrar", expected: "Mensagem de erro, sem redirecionamento." },
  { id: "t3",  section: "Autenticação", title: "Recuperação de senha", steps: "1. Clique em 'Esqueci minha senha'\n2. Informe e-mail cadastrado\n3. Verifique e-mail\n4. Acesse link e defina nova senha\n5. Login com nova senha", expected: "E-mail recebido, link funciona, nova senha funciona no login." },
  { id: "t4",  section: "Autenticação", title: "Sessão expira / logout", steps: "1. Faça login\n2. Clique em Sair\n3. Tente acessar /dashboard diretamente", expected: "Redireciona para login. Sessão não persiste após fechar o browser." },
  { id: "t5",  section: "Autenticação", title: "Login como Profissional", steps: "Use credenciais de profissional (não admin)", expected: "Redireciona para /profissional com a view correta." },
  { id: "t6",  section: "Autenticação", title: "Login como Super Admin", steps: "Use credenciais de super admin", expected: "Redireciona para painel super-admin." },
  // 2. Dashboard e Navegação
  { id: "t7",  section: "Dashboard e Navegação", title: "Dashboard carrega sem erros", steps: "1. Após login verifique o painel\n2. Cheque console do browser (F12)", expected: "Cards de estatísticas visíveis, sem loading infinito, sem erros no console." },
  { id: "t8",  section: "Dashboard e Navegação", title: "Sidebar — navegação entre todas as abas", steps: "Clique em cada item do menu: Agenda, Clientes, Comandas, Financeiro, Profissionais, Serviços, Produtos, Pacotes, Planos, Site, WhatsApp, Horários, Config, Permissões, Assinatura, Perfil", expected: "Cada aba abre sem erro de layout ou 404." },
  { id: "t9",  section: "Dashboard e Navegação", title: "Sidebar — colapsar e expandir", steps: "1. Clique no botão de colapsar\n2. Verifique que só ícones ficam visíveis\n3. Expanda novamente", expected: "Layout não quebra em nenhum estado." },
  { id: "t10", section: "Dashboard e Navegação", title: "Responsividade — mobile (375px)", steps: "1. No DevTools (F12) ative modo 375px\n2. Navegue por dashboard, agenda, clientes", expected: "Menu hamburguer visível, sem texto cortado, sem scroll horizontal." },
  { id: "t11", section: "Dashboard e Navegação", title: "Notificações — sino", steps: "1. Clique no sino no topo\n2. Verifique dropdown", expected: "Dropdown abre e fecha corretamente." },
  { id: "t12", section: "Dashboard e Navegação", title: "URL — navegação direta por slug", steps: "Acesse /dashboard/agenda, /dashboard/clientes, /dashboard/financeiro diretamente", expected: "Abre a aba correta sem passar pelo dashboard inicial." },
  { id: "t13", section: "Dashboard e Navegação", title: "Cards de estatísticas do painel", steps: "Verifique os cards de agendamentos, faturamento, novos clientes", expected: "Números reais da API, sem NaN ou -." },
  // 3. Agenda
  { id: "t14", section: "Agenda", title: "Calendário carrega com slots do dia", steps: "1. Abra a aba Agenda\n2. Verifique o calendário do dia atual", expected: "Slots de horário visíveis para cada profissional ativo." },
  { id: "t15", section: "Agenda", title: "Navegar entre dias/semanas", steps: "1. Clique nos botões de avançar/voltar\n2. Vá para amanhã, depois volte para hoje", expected: "Data atualiza, agenda recarrega, botão Hoje funciona." },
  { id: "t16", section: "Agenda", title: "Criar agendamento — fluxo completo", steps: "1. Clique em slot vazio\n2. Selecione cliente\n3. Selecione profissional\n4. Selecione serviço\n5. Confirme", expected: "Agendamento salvo, aparece no calendário na cor correta." },
  { id: "t17", section: "Agenda", title: "Criar agendamento com novo cliente", steps: "1. Busque nome que não existe\n2. Use opção de cadastrar novo cliente inline", expected: "Cliente criado e agendamento salvo." },
  { id: "t18", section: "Agenda", title: "Editar agendamento existente", steps: "1. Clique em agendamento existente\n2. Altere horário ou serviço\n3. Salve", expected: "Agendamento atualizado sem duplicar." },
  { id: "t19", section: "Agenda", title: "Cancelar agendamento", steps: "1. Clique em agendamento\n2. Selecione Cancelar\n3. Confirme no modal", expected: "Agendamento removido ou marcado como cancelado." },
  { id: "t20", section: "Agenda", title: "Consultar Agendamentos — filtros", steps: "1. Abra Consultar Agendamentos\n2. Filtre por profissional e período", expected: "Lista filtra corretamente, paginação funciona." },
  { id: "t21", section: "Agenda", title: "Agenda por Cliente", steps: "1. Busque cliente pelo nome\n2. Veja histórico de agendamentos", expected: "Histórico exibido com datas e status." },
  { id: "t22", section: "Agenda", title: "PAT Terminal — fila de atendimento", steps: "1. Abra aba PAT\n2. Verifique fila do dia\n3. Avance status de atendimento", expected: "Status atualiza em tempo real." },
  { id: "t23", section: "Agenda", title: "Liberações de Horários", steps: "1. Abra Liberações\n2. Crie uma liberação para profissional", expected: "Liberação salva, reflete na agenda principal." },
  // 4. Clientes
  { id: "t24", section: "Clientes", title: "Listar clientes — busca e paginação", steps: "1. Abra aba Clientes\n2. Busque por nome parcial\n3. Navegue nas páginas", expected: "Lista filtrada corretamente, paginação funciona." },
  { id: "t25", section: "Clientes", title: "Criar novo cliente", steps: "1. Clique em + Novo Cliente\n2. Preencha nome, telefone, e-mail, CPF\n3. Salve", expected: "Cliente aparece na lista, dados gravados corretamente." },
  { id: "t26", section: "Clientes", title: "Editar cliente existente", steps: "1. Clique em cliente\n2. Altere campo\n3. Salve", expected: "Dados atualizados sem criar duplicata." },
  { id: "t27", section: "Clientes", title: "Excluir cliente", steps: "1. Clique em excluir cliente\n2. Confirme no modal", expected: "Cliente removido. Modal de confirmação aparece antes." },
  { id: "t28", section: "Clientes", title: "Máscaras — telefone, CPF, CEP", steps: "No modal de cliente, digite nos campos de telefone, CPF e CEP", expected: "Telefone (XX) XXXXX-XXXX, CPF XXX.XXX.XXX-XX, CEP XXXXX-XXX." },
  { id: "t29", section: "Clientes", title: "Portal do cliente — login e visualização", steps: "1. Acesse URL do portal\n2. Login com credenciais de cliente\n3. Verifique agendamentos", expected: "Portal carrega dados do cliente correto apenas." },
  // 5. Profissionais e Horários
  { id: "t30", section: "Profissionais e Horários", title: "Cadastrar profissional", steps: "1. Profissionais → + Novo\n2. Preencha nome, especialidade, e-mail, senha\n3. Salve", expected: "Profissional aparece na lista e pode fazer login." },
  { id: "t31", section: "Profissionais e Horários", title: "Ativar / desativar profissional", steps: "Toggle o status de ativo/inativo", expected: "Profissional inativo não aparece na agenda." },
  { id: "t32", section: "Profissionais e Horários", title: "Configurar horários de trabalho", steps: "1. Acesse Horários\n2. Configure dias e horários de profissional\n3. Salve", expected: "Horários salvos, slots disponíveis refletem a configuração." },
  { id: "t33", section: "Profissionais e Horários", title: "Dia fechado — bloqueio na agenda", steps: "1. Crie dia fechado para profissional\n2. Verifique na agenda", expected: "Slots do dia bloqueado não disponíveis para agendamento." },
  { id: "t34", section: "Profissionais e Horários", title: "Dashboard do Profissional", steps: "1. Login como profissional\n2. Verifique Minha Agenda", expected: "Apenas agendamentos do profissional logado visíveis." },
  { id: "t35", section: "Profissionais e Horários", title: "Minha Agenda Online — link público", steps: "1. Acesse Minha Agenda Online\n2. Copie o link\n3. Abra em aba anônima", expected: "Página pública de agendamento carrega." },
  // 6. Serviços e Pacotes
  { id: "t36", section: "Serviços e Pacotes", title: "Criar serviço", steps: "1. Serviços → + Novo\n2. Nome, preço, duração, comissão\n3. Salve", expected: "Serviço listado, disponível na criação de agendamentos." },
  { id: "t37", section: "Serviços e Pacotes", title: "Editar e desativar serviço", steps: "1. Edite preço\n2. Desative serviço", expected: "Serviço inativo não aparece nas opções de agendamento." },
  { id: "t38", section: "Serviços e Pacotes", title: "Vincular produto a serviço", steps: "1. Edite serviço\n2. Adicione produto como insumo\n3. Salve", expected: "Produto vinculado aparece na listagem do serviço." },
  { id: "t39", section: "Serviços e Pacotes", title: "Criar pacote de serviços", steps: "1. Pacotes → + Novo\n2. Adicione 2+ serviços\n3. Preço e validade\n4. Salve", expected: "Pacote criado, disponível para venda." },
  { id: "t40", section: "Serviços e Pacotes", title: "Planos de assinatura — criar plano", steps: "1. Planos de Assinatura\n2. Crie plano com preço mensal\n3. Vincule serviços\n4. Salve", expected: "Plano criado e visível na listagem." },
  { id: "t41", section: "Serviços e Pacotes", title: "Assinar plano para cliente", steps: "1. Abra cliente\n2. Adicione assinatura\n3. Verifique créditos gerados", expected: "Assinatura ativa, créditos disponíveis." },
  // 7. Produtos e Estoque
  { id: "t42", section: "Produtos e Estoque", title: "Cadastrar produto", steps: "1. Produtos → + Novo\n2. Nome, setor, preços, estoque inicial\n3. Salve", expected: "Produto criado, estoque inicial registrado." },
  { id: "t43", section: "Produtos e Estoque", title: "Movimentação — entrada de estoque", steps: "1. Produtos → Movimentação\n2. Crie uma entrada", expected: "Saldo de estoque atualizado." },
  { id: "t44", section: "Produtos e Estoque", title: "Venda de produto", steps: "1. Produtos → Venda\n2. Registre venda", expected: "Estoque reduzido, venda registrada no financeiro." },
  { id: "t45", section: "Produtos e Estoque", title: "Posição de Estoque", steps: "Acesse Posição de Estoque e verifique saldos", expected: "Lista com saldo atual de cada produto." },
  { id: "t46", section: "Produtos e Estoque", title: "Cadastrar fabricante e fornecedor", steps: "1. Fabricantes → + Novo\n2. Fornecedores → + Novo\n3. Vincule ao produto", expected: "Fabricante e fornecedor vinculados ao produto." },
  { id: "t47", section: "Produtos e Estoque", title: "Inventário — ajuste de estoque", steps: "1. Acesse Inventário\n2. Faça ajuste de quantidade", expected: "Saldo ajustado, movimentação registrada." },
  { id: "t48", section: "Produtos e Estoque", title: "Ranking de produtos", steps: "Acesse Produtos → Ranking", expected: "Lista ordenada por consumo/vendas carrega sem erro." },
  // 8. Comandas
  { id: "t49", section: "Comandas", title: "Abrir nova comanda", steps: "1. Comandas → + Nova\n2. Selecione cliente e profissional\n3. Adicione serviços e/ou produtos", expected: "Comanda criada com total calculado corretamente." },
  { id: "t50", section: "Comandas", title: "Aplicar desconto na comanda", steps: "1. Abra comanda\n2. Aplique desconto", expected: "Valor final recalculado corretamente." },
  { id: "t51", section: "Comandas", title: "Fechar comanda — formas de pagamento", steps: "1. Feche comanda\n2. Selecione forma (dinheiro, cartão, PIX)\n3. Confirme", expected: "Comanda fechada, lançamento criado no caixa." },
  { id: "t52", section: "Comandas", title: "Usar crédito de assinatura", steps: "1. Abra comanda para cliente com assinatura\n2. Selecione usar crédito", expected: "Crédito deduzido, comanda fechada com desconto correto." },
  { id: "t53", section: "Comandas", title: "Histórico de comandas — filtros", steps: "Filtre por data, profissional, status", expected: "Lista filtra corretamente, totais por período corretos." },
  // 9. Financeiro
  { id: "t54", section: "Financeiro", title: "Caixa — abrir e fechar caixa do dia", steps: "1. Financeiro → Caixa\n2. Abra caixa com saldo inicial\n3. Feche ao final", expected: "Caixa aberto, lançamentos visíveis, fechamento registra diferença." },
  { id: "t55", section: "Financeiro", title: "Despesas — lançar despesa", steps: "1. Financeiro → Despesas\n2. Lance despesa com categoria e valor", expected: "Despesa salva, aparece no controle financeiro." },
  { id: "t56", section: "Financeiro", title: "Controle — balanço receitas vs despesas", steps: "1. Financeiro → Controle\n2. Selecione mês atual", expected: "Resumo mostra receitas, despesas e saldo corretamente." },
  { id: "t57", section: "Financeiro", title: "Relatório Profissionais — comissões", steps: "1. Financeiro → Relatório Profissionais\n2. Selecione período", expected: "Comissões calculadas por profissional." },
  { id: "t58", section: "Financeiro", title: "Formas de pagamento — cadastrar nova", steps: "1. Financeiro → Formas de Pagamento\n2. Adicione forma customizada", expected: "Nova forma disponível na seleção de pagamento em comandas." },
  { id: "t59", section: "Financeiro", title: "Clientes em Débito", steps: "Acesse Financeiro → Clientes em Débito", expected: "Lista de clientes com saldo devedor correto." },
  { id: "t60", section: "Financeiro", title: "Exportação financeira", steps: "1. Financeiro → Exportação\n2. Gere relatório em PDF ou CSV", expected: "Arquivo gerado e baixado com dados do período." },
  { id: "t61", section: "Financeiro", title: "Contas a pagar/receber", steps: "1. Financeiro → Contas\n2. Adicione uma conta", expected: "Conta criada, vencimento correto, aparece no controle." },
  // 10. Sistema
  { id: "t62", section: "Sistema e Configurações", title: "Configurações gerais — salvar dados do negócio", steps: "1. Configurações\n2. Altere nome, telefone, endereço\n3. Salve", expected: "Dados atualizados, refletem no site público." },
  { id: "t63", section: "Sistema e Configurações", title: "Permissões — criar perfil restrito", steps: "1. Permissões\n2. Crie perfil com acesso restrito\n3. Atribua ao profissional", expected: "Profissional só vê as abas permitidas." },
  { id: "t64", section: "Sistema e Configurações", title: "WhatsApp — conectar instância", steps: "1. WhatsApp\n2. Escaneie QR Code\n3. Verifique status Conectado", expected: "Status muda para conectado, número exibido.", warning: "Requer celular com WhatsApp" },
  { id: "t65", section: "Sistema e Configurações", title: "WhatsApp — templates de mensagem", steps: "1. Edite template de confirmação\n2. Crie agendamento e verifique envio", expected: "Mensagem enviada com dados corretos.", warning: "Requer WhatsApp conectado" },
  { id: "t66", section: "Sistema e Configurações", title: "Site Profissional — personalizar e salvar", steps: "1. Meu Site\n2. Altere banner, cores, texto\n3. Salve e acesse site público", expected: "Alterações refletem no site público." },
  { id: "t67", section: "Sistema e Configurações", title: "Perfil do admin — alterar senha", steps: "1. Meu Perfil\n2. Altere senha\n3. Logout e login com nova senha", expected: "Login com nova senha funciona." },
  { id: "t68", section: "Sistema e Configurações", title: "Assinatura — ver plano atual", steps: "1. Assinatura\n2. Verifique plano ativo e data de renovação", expected: "Plano exibido com data e status Stripe." },
  // 11. Agendamento Público
  { id: "t69", section: "Agendamento Online Público", title: "Página pública de agendamento carrega", steps: "Acesse URL pública do negócio (/booking/slug)", expected: "Página carrega com nome, serviços e calendário disponível." },
  { id: "t70", section: "Agendamento Online Público", title: "Fluxo completo pelo cliente", steps: "1. Selecione serviço\n2. Escolha profissional\n3. Data e horário\n4. Nome e telefone\n5. Confirme", expected: "Agendamento criado, aparece no dashboard do admin." },
  { id: "t71", section: "Agendamento Online Público", title: "Horário indisponível não aparece", steps: "1. Crie agendamento em horário\n2. Tente agendar mesmo horário na página pública", expected: "Horário ocupado não aparece como disponível." },
  { id: "t72", section: "Agendamento Online Público", title: "Site Profissional público", steps: "Acesse URL pública do site profissional", expected: "Landing page exibe serviços, galeria e botão de agendamento." },
  { id: "t73", section: "Agendamento Online Público", title: "PAT Queue — tela pública de fila", steps: "Acesse /terminal/pat-general/[slug] em tela secundária", expected: "Fila de atendimento visível, atualiza automaticamente." },
  // 12. Super Admin
  { id: "t74", section: "Super Admin", title: "Listar tenants (negócios cadastrados)", steps: "1. Login como super admin\n2. Veja lista de tenants", expected: "Todos os negócios listados com status e plano." },
  { id: "t75", section: "Super Admin", title: "Gestão de planos da plataforma", steps: "1. Aba planos no super admin\n2. Verifique preços e limites", expected: "Planos listados com recursos e preços corretos." },
  { id: "t76", section: "Super Admin", title: "Blog — criar e publicar post", steps: "1. Super admin → Blog\n2. Crie post com título, texto, imagem\n3. Publique", expected: "Post visível em /blog na área pública." },
  { id: "t77", section: "Super Admin", title: "WhatsApp — aba super admin", steps: "1. Super admin → WhatsApp\n2. Verifique instâncias de todos os tenants", expected: "Lista de instâncias por tenant com status." },
  // 13. Layout e Estética (Checklist Visual)
  { id: "t78", section: "Layout e Estética", title: "Cores e Contraste — Padrão Agendelle", steps: "Percorra as abas principais: Dashboard, Agenda, Clientes, Financeiro.", expected: "Fundo branco/cinza claro, botões consistentes, sem 'dark cards' no meio do layout light." },
  { id: "t79", section: "Layout e Estética", title: "Ortografia e Escrita — Revisão Geral", steps: "Leia títulos e descrições de modais e botões.", expected: "Nenhum erro de digitação, termos em português (pt-BR) consistentes." },
  { id: "t80", section: "Layout e Estética", title: "Modais — Comportamento de abertura/fechamento", steps: "Abra e feche modais de cadastro (Cliente, Profissional, Serviço).", expected: "Scroll do fundo bloqueado, fecha no 'X' ou 'Cancelar', sem travar a tela." },
  { id: "t81", section: "Layout e Estética", title: "Tabelas — Alinhamento e Overflow", steps: "Verifique listas longas em telas de 1280px e 1920px.", expected: "Textos não encavalam, alinhamento de números à direita, scroll horizontal apenas se necessário." },
  { id: "t82", section: "Layout e Estética", title: "Toasts e Feedbacks — Posicionamento", steps: "Realize uma ação de sucesso e uma de erro.", expected: "Feedback visual claro, toast no canto superior direito, desaparece após 3s." },
  { id: "t83", section: "Layout e Estética", title: "Responsividade — Tablets (iPad)", steps: "Use DevTools em modo Tablet (768px).", expected: "Sidebar colapsa automaticamente, conteúdo adaptado, sem quebras graves." },
  { id: "t84", section: "Layout e Estética", title: "Ícones — Consistência Lucide", steps: "Verifique se os ícones fazem sentido com a ação.", expected: "Ícones de tamanho padrão (14-18px), cores suaves, alinhados com texto." },
  { id: "t85", section: "Layout e Estética", title: "Empty States — Mensagens de lista vazia", steps: "Acesse uma conta nova ou delete itens para ver lista vazia.", expected: "Ilustração ou ícone centralizado, mensagem clara e botão de ação se aplicável." },

  // 14. E-mail e Comunicações
  { id: "t86", section: "Comunicações", title: "E-mail de boas-vindas (Setup)", steps: "Crie um novo Tenant no Super Admin.", expected: "E-mail enviado com link de setup funcional.", warning: "Requer SMTP ativo" },
  { id: "t87", section: "Comunicações", title: "WhatsApp — Notificação de Agendamento", steps: "Agende um horário com WhatsApp conectado.", expected: "Mensagem chega no celular do cliente no formato configurado.", warning: "Requer instância conectada" },

  // 15. Casos de Borda (Edge Cases)
  { id: "t88", section: "Casos de Borda", title: "Upload de foto gigante (> 5MB)", steps: "Tente subir foto de 10MB no perfil.", expected: "Sistema deve tratar o erro ou avisar limite, sem dar 500." },
  { id: "t89", section: "Casos de Borda", title: "Concorrência — Dois agendamentos simultâneos", steps: "Tente agendar mesmo horário em duas abas ao mesmo tempo.", expected: "O sistema deve validar e impedir o segundo, dando erro amigável." },
  { id: "t90", section: "Casos de Borda", title: "Data Inválida — 31 de Fevereiro", steps: "Tente forçar data inexistente no input manual.", expected: "Input deve validar ou o banco deve rejeitar com erro tratado." },

  // 16. Fluxos Avançados (Agenda & Comanda)
  { id: "t91", section: "Fluxos Avançados", title: "Agenda — Troca de Profissional e Serviço", steps: "1. Clique em agendamento existente\n2. Mude o profissional e o serviço\n3. Salve", expected: "Agendamento move para a coluna do novo profissional com o novo serviço e valor atualizado." },
  { id: "t92", section: "Fluxos Avançados", title: "Agenda → Criar Comanda", steps: "1. Clique em agendamento 'scheduled'\n2. Use botão 'Abrir Comanda'\n3. Verifique se dados (cliente, serviço, valor) foram importados", expected: "Comanda aberta automaticamente com todos os dados do agendamento, status do agendamento muda para 'atendido'." },
  { id: "t93", section: "Fluxos Avançados", title: "Comanda — Pagamento Parcial (Débito)", steps: "1. Abra comanda de R$ 100\n2. Receba R$ 40 em dinheiro\n3. Salve como parcial", expected: "Comanda continua aberta, saldo devedor de R$ 60 visível, lançamento de R$ 40 no caixa." },
  { id: "t94", section: "Fluxos Avançados", title: "Comanda — Múltiplos Itens (Serviço + 3 Produtos)", steps: "1. Crie comanda\n2. Adicione 1 serviço e 3 produtos diferentes\n3. Verifique o somatório", expected: "Total da comanda reflete exatamente a soma de todos os itens e quantidades." },
];

const QA_SECTIONS = [...new Set(QA_TESTS.map(t => t.section))];

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "#9ca3af", bg: "#f3f4f6" },
  pass:    { label: "Passou",   color: "#16a34a", bg: "#dcfce7" },
  fail:    { label: "Falhou",   color: "#dc2626", bg: "#fee2e2" },
};

function QATab() {
  const [runs, setRuns] = useState<any[]>([]);
  const [activeRun, setActiveRun] = useState<any>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [loadingRun, setLoadingRun] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newRunModal, setNewRunModal] = useState(false);
  const [newRunForm, setNewRunForm] = useState({ title: "", testerName: "", testerEmail: "" });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [noteModal, setNoteModal] = useState<{ testId: string; title: string; current: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const toast = useToast();

  const loadRuns = () => {
    apiFetch("/api/super-admin/qa/runs").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setRuns(data);
    });
  };

  useEffect(() => { loadRuns(); }, []);

  const openRun = async (run: any) => {
    setLoadingRun(true);
    try {
      const data = await apiFetch(`/api/super-admin/qa/runs/${run.id}`).then(r => r.json());
      setActiveRun(data);
      const map: Record<string, any> = {};
      (data.results || []).forEach((r: any) => { map[r.testId] = r; });
      setResults(map);
      const exp: Record<string, boolean> = {};
      QA_SECTIONS.forEach(s => { exp[s] = true; });
      setExpandedSections(exp);
    } finally {
      setLoadingRun(false);
    }
  };

  const createRun = async () => {
    if (!newRunForm.testerName.trim()) return toast.error("Nome do testador é obrigatório");
    try {
      const run = await apiFetch("/api/super-admin/qa/runs", {
        method: "POST",
        body: JSON.stringify(newRunForm),
      }).then(r => r.json());
      setNewRunModal(false);
      setNewRunForm({ title: "", testerName: "", testerEmail: "" });
      loadRuns();
      await openRun(run);
    } catch { toast.error("Erro ao criar sessão de teste"); }
  };

  const saveResult = async (testId: string, section: string, title: string, status: string, notes?: string) => {
    if (!activeRun) return;
    setSavingId(testId);
    try {
      const res = await apiFetch(`/api/super-admin/qa/runs/${activeRun.id}/results`, {
        method: "POST",
        body: JSON.stringify({ testId, section, title, status, notes: notes ?? results[testId]?.notes ?? null }),
      }).then(r => r.json());
      setResults(prev => ({ ...prev, [testId]: res }));
      loadRuns();
    } finally {
      setSavingId(null);
    }
  };

  const saveNote = async () => {
    if (!noteModal) return;
    await saveResult(noteModal.testId, "", "", results[noteModal.testId]?.status ?? "pending", noteText);
    setNoteModal(null);
  };

  const finishRun = async () => {
    if (!activeRun) return;
    await apiFetch(`/api/super-admin/qa/runs/${activeRun.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
    });
    loadRuns();
    setActiveRun((prev: any) => prev ? { ...prev, status: "done" } : prev);
    toast.success("Sessão de testes finalizada!");
  };

  const deleteRun = async (id: string) => {
    await apiFetch(`/api/super-admin/qa/runs/${id}`, { method: "DELETE" });
    if (activeRun?.id === id) { setActiveRun(null); setResults({}); }
    loadRuns();
  };

  // Stats do run ativo
  const totalTests = QA_TESTS.length;
  const pass  = Object.values(results).filter((r: any) => r.status === "pass").length;
  const fail  = Object.values(results).filter((r: any) => r.status === "fail").length;
  const pend  = totalTests - pass - fail;
  const pct   = Math.round(((pass + fail) / totalTests) * 100);

  if (!activeRun) {
    return (
      <div className="space-y-6">
        <SectionTitle title="QA — Testes do Sistema" description="Gerencie sessões de teste e acompanhe os resultados em tempo real" icon={CheckCircle} />

        <div className="flex justify-end">
          <Button onClick={() => setNewRunModal(true)} size="sm">
            <Plus size={14} className="mr-1.5" /> Nova Sessão de Teste
          </Button>
        </div>

        {runs.length === 0 && (
          <EmptyState icon={CheckCircle} title="Nenhuma sessão de teste" description="Crie uma nova sessão e envie o link para o testador" />
        )}

        <div className="space-y-3">
          {runs.map(run => {
            const total = run.pass + run.fail;
            const pctRun = run.total > 0 ? Math.round((total / run.total) * 100) : 0;
            return (
              <div key={run.id} className="bg-white border border-zinc-100 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-zinc-800 truncate">{run.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: run.status === "done" ? "#dcfce7" : "#fef3c7", color: run.status === "done" ? "#16a34a" : "#d97706" }}>
                      {run.status === "done" ? "Finalizado" : "Em andamento"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">Testador: <strong>{run.testerName}</strong> · {new Date(run.createdAt).toLocaleDateString("pt-BR")}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-zinc-500">{run.total} testes</span>
                    <span className="text-xs text-emerald-600 font-bold">{run.pass} passaram</span>
                    <span className="text-xs text-red-500 font-bold">{run.fail} falharam</span>
                    <span className="text-xs text-zinc-400">{run.total - run.pass - run.fail} pendentes</span>
                  </div>
                  <div className="mt-2 bg-zinc-100 rounded-full h-1.5 w-48">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pctRun}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openRun(run)}>
                    <Eye size={13} className="mr-1.5" /> {run.status === "done" ? "Ver" : "Abrir"}
                  </Button>
                  <IconButton variant="ghost" size="sm" onClick={() => deleteRun(run.id)} title="Excluir">
                    <Trash2 size={14} className="text-red-400" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>

        <Modal isOpen={newRunModal} onClose={() => setNewRunModal(false)} title="Nova Sessão de Testes">
          <div className="space-y-4 p-1">
            <Input label="Título da sessão" value={newRunForm.title} onChange={e => setNewRunForm(f => ({ ...f, title: e.target.value }))} placeholder={`Teste ${new Date().toLocaleDateString("pt-BR")}`} />
            <Input label="Nome do testador *" value={newRunForm.testerName} onChange={e => setNewRunForm(f => ({ ...f, testerName: e.target.value }))} placeholder="Ex: João Silva" />
            <Input label="E-mail do testador" value={newRunForm.testerEmail} onChange={e => setNewRunForm(f => ({ ...f, testerEmail: e.target.value }))} placeholder="joao@email.com" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setNewRunModal(false)}>Cancelar</Button>
            <Button onClick={createRun}>Criar Sessão</Button>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header do run ativo */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setActiveRun(null); setResults({}); }} className="text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1 text-xs font-bold">
          <ArrowLeft size={14} /> Voltar
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-zinc-800 truncate">{activeRun.title}</h2>
          <p className="text-xs text-zinc-500">Testador: <strong>{activeRun.testerName}</strong></p>
        </div>
        {activeRun.status !== "done" && (
          <Button size="sm" onClick={finishRun}>
            <Check size={13} className="mr-1.5" /> Finalizar Sessão
          </Button>
        )}
        {activeRun.status === "done" && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: "#dcfce7", color: "#16a34a" }}>Finalizado</span>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="bg-white border border-zinc-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-zinc-600">Progresso: {pass + fail}/{totalTests} avaliados</span>
          <span className="text-xs font-black text-zinc-800">{pct}%</span>
        </div>
        <div className="bg-zinc-100 rounded-full h-2 mb-3">
          <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-6">
          <div className="text-center"><p className="text-xl font-black text-emerald-600">{pass}</p><p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Passaram</p></div>
          <div className="text-center"><p className="text-xl font-black text-red-500">{fail}</p><p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Falharam</p></div>
          <div className="text-center"><p className="text-xl font-black text-zinc-400">{pend}</p><p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Pendentes</p></div>
          <div className="text-center"><p className="text-xl font-black text-zinc-800">{totalTests}</p><p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Total</p></div>
        </div>
      </div>

      {loadingRun ? (
        <div className="flex items-center justify-center h-40 text-zinc-400 text-sm font-semibold">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {QA_SECTIONS.map(section => {
            const sectionTests = QA_TESTS.filter(t => t.section === section);
            const sPass = sectionTests.filter(t => results[t.id]?.status === "pass").length;
            const sFail = sectionTests.filter(t => results[t.id]?.status === "fail").length;
            const expanded = expandedSections[section] !== false;

            return (
              <div key={section} className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors"
                  onClick={() => setExpandedSections(prev => ({ ...prev, [section]: !expanded }))}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-zinc-800">{section}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: sPass + sFail === sectionTests.length ? "#dcfce7" : "#f3f4f6", color: sPass + sFail === sectionTests.length ? "#16a34a" : "#6b7280" }}>
                      {sPass + sFail}/{sectionTests.length}
                    </span>
                    {sFail > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#fee2e2", color: "#dc2626" }}>{sFail} falha{sFail > 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <ChevronRight size={14} style={{ color: "#9ca3af", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                </button>

                {expanded && (
                  <div className="divide-y divide-zinc-50">
                    {sectionTests.map(test => {
                      const result = results[test.id];
                      const status = result?.status ?? "pending";
                      const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                      const isSaving = savingId === test.id;
                      const isReadonly = activeRun.status === "done";

                      return (
                        <div key={test.id} style={{ background: status === "pass" ? "#f0fdf4" : status === "fail" ? "#fff1f1" : "#fff" }} className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-zinc-800">{test.title}</span>
                                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                                {test.warning && (
                                  <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#fffbeb", color: "#b45309", border: "1px solid #fcd34d" }}>{test.warning}</span>
                                )}
                              </div>
                              <div className="mt-2 text-xs text-zinc-500 bg-zinc-50 rounded-lg p-3 border-l-2 border-zinc-200 whitespace-pre-line leading-relaxed">{test.steps}</div>
                              <p className="mt-2 text-xs text-emerald-700 font-medium">✓ {test.expected}</p>
                                {result?.notes && (
                                  <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                      <AlertCircle size={10} /> Evidência do Erro
                                    </p>
                                    <p className="text-xs text-red-700 leading-relaxed italic">"{result.notes}"</p>
                                  </div>
                                )}
                            </div>
                            {!isReadonly && (
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <button
                                  disabled={isSaving}
                                  onClick={() => saveResult(test.id, test.section, test.title, "pass")}
                                  style={{ padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800, background: status === "pass" ? "#16a34a" : "#f0fdf4", color: status === "pass" ? "#fff" : "#16a34a", transition: "all 0.15s" }}
                                >
                                  ✓ Passou
                                </button>
                                <button
                                  disabled={isSaving}
                                  onClick={() => { setNoteModal({ testId: test.id, title: test.title, current: result?.notes ?? "" }); setNoteText(result?.notes ?? ""); }}
                                  style={{ padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800, background: status === "fail" ? "#dc2626" : "#fff1f1", color: status === "fail" ? "#fff" : "#dc2626", transition: "all 0.15s" }}
                                >
                                  ✗ Falhou
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Relatório de Erros / Resumo */}
          {fail > 0 && (
            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-[0.2em]">Relatório de Falhas Encontradas</h3>
                <div className="flex-1 h-px bg-red-100" />
              </div>
              
              <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6 space-y-4">
                {QA_TESTS.filter(t => results[t.id]?.status === "fail").map(t => (
                  <div key={t.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-full">{t.section}</span>
                      <span className="text-[10px] text-zinc-400 font-bold">ID: {t.id}</span>
                    </div>
                    <h4 className="text-sm font-black text-zinc-900 mb-1">{t.title}</h4>
                    <p className="text-xs text-red-700 italic flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span><strong>Erro reportado:</strong> {results[t.id]?.notes || "Nenhuma observação detalhada."}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={!!noteModal} onClose={() => setNoteModal(null)} title={noteModal ? `Reportar Erro: ${noteModal.title}` : ""}>
        <div className="p-1 space-y-3">
          <p className="text-xs text-zinc-500 font-medium leading-relaxed">
            Descreva detalhadamente o erro encontrado, o comportamento observado e se possível, onde exatamente ocorreu (ex: botão X na aba Y).
          </p>
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Ex: O layout do botão está desalinhado em telas de 1366px..."
            rows={5}
            className="text-sm border-zinc-100 focus:border-red-200"
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setNoteModal(null)} className="text-zinc-500">Cancelar</Button>
          <Button
            onClick={async () => {
              if (!noteModal) return;
              await saveResult(noteModal.testId, QA_TESTS.find(t => t.id === noteModal.testId)?.section ?? "", noteModal.title, "fail", noteText);
              setNoteModal(null);
            }}
            className="bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-lg shadow-red-600/20"
          >
            Gravar Erro e Evidência
          </Button>
        </div>
      </Modal>
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
  { key: "sales",       icon: <TrendingUp size={17} />,      label: "Vendas e Afiliados", path: "/super-admin/vendas" },
  { key: "commissions", icon: <DollarSign size={17} />,      label: "Comissões",      path: "/super-admin/comissoes" },
  { key: "finance",     icon: <BarChart2 size={17} />,        label: "Financeiro",     path: "/super-admin/financeiro" },
  { key: "qa",          icon: <CheckCircle size={17} />,      label: "Testes QA",      path: "/super-admin/qa" },
  { key: "staff",       icon: <Shield size={17} />,          label: "Minha Equipe",   path: "/super-admin/equipe" },
  { key: "settings",    icon: <Globe size={17} />,           label: "Configurações",   path: "/super-admin/configuracoes" },
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
  if (pathname.includes("/vendas"))      return "sales";
  if (pathname.includes("/comissoes"))   return "commissions";
  if (pathname.includes("/financeiro"))  return "finance";
  if (pathname.includes("/qa"))           return "qa";
  if (pathname.includes("/equipe"))      return "staff";
  if (pathname.includes("/configuracoes")) return "settings";
  if (pathname.includes("/perfil"))      return "profile";
  return "dash";
}

function Sidebar({ tab, setTab, username, onLogout, onClose, permissions }: {
  tab: TabKey; setTab: (t: TabKey) => void; username: string; onLogout: () => void; onClose?: () => void; permissions: any;
}) {
  const navigate = useNavigate();

  const filteredItems = NAV_ITEMS.filter(item => {
    if (username.toLowerCase() === "admin") return true; // Permanent Master access
    if (!permissions) return true; // Master access (legacy or explicitly set)
    if (item.key === "profile") return true; // Everyone can see profile
    return !!permissions[item.key]?.ver;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", borderRight: "1px solid #f3f4f6", width: "100%" }}>
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src="/favicon.png" alt="Agendelle" style={{ width: 20, height: 20, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: "#111", lineHeight: 1, margin: 0 }}>Agendelle</p>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.15em", margin: "3px 0 0" }}>Super Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {filteredItems.map(item => (
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
export default function SuperAdminDashboard({ username, onLogout, permissions }: { username: string; onLogout: () => void; permissions: any }) {
  const location = useLocation();
  const [tab, setTab] = useState<TabKey>(() => pathToTab(location.pathname));
  useEffect(() => { setTab(pathToTab(location.pathname)); }, [location.pathname]);

  const [plans, setPlans] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    apiFetch("/api/super-admin/plans").then(r => r.json()).then(setPlans);
    apiFetch("/api/super-admin/tenants").then(r => r.json()).then(setTenants);
    apiFetch(`/api/super-admin/profile/${username}`).then(r => r.json()).then(setUserData);
  }, [username]);

  const currentNav = NAV_ITEMS.find(n => n.key === tab);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8f9fa", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:block" style={{ width: 220, flexShrink: 0 }}>
        <Sidebar tab={tab} setTab={setTab} username={username} onLogout={onLogout} permissions={permissions} />
      </aside>

      {/* ── Sidebar mobile overlay ── */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }} className="md:hidden">
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setMobileOpen(false)} />
          <aside style={{ position: "relative", width: 240, boxShadow: "4px 0 24px rgba(0,0,0,0.15)" }}>
            <Sidebar tab={tab} setTab={setTab} username={username} onLogout={onLogout} onClose={() => setMobileOpen(false)} permissions={permissions} />
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
              <img src="/favicon.png" alt="" style={{ width: 16, height: 16, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
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
          {tab === "wpp"         && <WppTab plans={plans} onUpdatePlans={() => { apiFetch("/api/super-admin/plans").then(r => r.json()).then(setPlans); }} />}
          {tab === "sales"       && <SalesTab user={userData} />}
          {tab === "commissions" && <CommissionsTab />}
          {tab === "finance"     && <FinanceTab />}
          {tab === "qa"          && <QATab />}
          {tab === "staff"       && <StaffTab username={username} userPermissions={permissions} />}
          {tab === "settings"    && <SettingsTab />}
          {tab === "profile"     && <ProfileTab username={username} />}
        </div>
      </main>
    </div>
  );
}
