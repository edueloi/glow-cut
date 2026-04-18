import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/src/App";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import {
  User, Mail, Phone, Briefcase, FileText,
  Lock, Eye, EyeOff, Check, Edit2, Save,
  LogOut, Plus, Trash2, X, ChevronDown, Shield,
  LayoutDashboard, Calendar, Globe, Scissors,
  Users, CheckCircle, Banknote, Settings, Clock,
  UserCog, Search, Camera, Upload, Trash
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input, Textarea } from "@/src/components/ui/Input";
import { PageWrapper, SectionTitle, FormRow } from "@/src/components/ui/PageWrapper";
import { PanelCard } from "@/src/components/ui/PanelCard";

/* ═══════════════════════════════════════════════════════
   PERMISSÕES — mapa completo por módulo
═══════════════════════════════════════════════════════ */
const MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={13} />,
    color: "amber",
    actions: [{ key: "ver", label: "Ver" }],
  },
  {
    key: "agenda",
    label: "Agenda & Reservas",
    icon: <Calendar size={13} />,
    color: "blue",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "minha_agenda",
    label: "Minha Agenda Online",
    icon: <Globe size={13} />,
    color: "cyan",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "editar", label: "Editar" },
    ],
  },
  {
    key: "clientes",
    label: "Gestão de Clientes",
    icon: <Users size={13} />,
    color: "violet",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "servicos",
    label: "Serviços & Pacotes",
    icon: <Scissors size={13} />,
    color: "amber",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "comandas",
    label: "Comandas",
    icon: <CheckCircle size={13} />,
    color: "emerald",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "fechar", label: "Fechar/Pagar" },
    ],
  },
  {
    key: "fluxo",
    label: "Fluxo de Caixa",
    icon: <Banknote size={13} />,
    color: "green",
    actions: [{ key: "ver", label: "Ver" }],
  },
  {
    key: "profissionais",
    label: "Profissionais",
    icon: <UserCog size={13} />,
    color: "orange",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
  {
    key: "horarios",
    label: "Horários",
    icon: <Clock size={13} />,
    color: "slate",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "editar", label: "Editar" },
    ],
  },
  {
    key: "configuracoes",
    label: "Configurações",
    icon: <Settings size={13} />,
    color: "zinc",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "editar", label: "Editar" },
    ],
  },
  {
    key: "usuarios",
    label: "Usuários & Perfis",
    icon: <Shield size={13} />,
    color: "red",
    actions: [
      { key: "ver", label: "Ver" },
      { key: "criar", label: "Criar" },
      { key: "editar", label: "Editar" },
      { key: "excluir", label: "Excluir" },
    ],
  },
];

const PRESETS: Record<string, string[]> = {
  admin: MODULES.flatMap(m => m.actions.map(a => `${m.key}.${a.key}`)),
  manager: [
    "dashboard.ver",
    "agenda.ver", "agenda.criar", "agenda.editar",
    "minha_agenda.ver",
    "clientes.ver", "clientes.criar", "clientes.editar",
    "servicos.ver",
    "comandas.ver", "comandas.criar", "comandas.editar", "comandas.fechar",
    "fluxo.ver",
    "profissionais.ver",
    "horarios.ver",
  ],
  viewer: [
    "dashboard.ver",
    "agenda.ver",
    "clientes.ver",
    "servicos.ver",
    "comandas.ver",
    "fluxo.ver",
    "profissionais.ver",
  ],
};

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",  dot: "bg-amber-400" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",   dot: "bg-blue-400" },
  cyan:    { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",   dot: "bg-cyan-400" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200", dot: "bg-violet-400" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",dot: "bg-emerald-400" },
  green:   { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",  dot: "bg-green-400" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200", dot: "bg-orange-400" },
  slate:   { bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200",  dot: "bg-slate-400" },
  zinc:    { bg: "bg-zinc-100",   text: "text-zinc-700",    border: "border-zinc-200",   dot: "bg-zinc-400" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",    dot: "bg-red-400" },
};

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
// Legacy Inp and Field removed in favor of UI components

/* ═══════════════════════════════════════════════════════
   PAINEL DE PERMISSÕES
═══════════════════════════════════════════════════════ */
function PermissionMatrix({
  permissions,
  onChange,
  readOnly = false,
}: {
  permissions: string[];
  onChange?: (perms: string[]) => void;
  readOnly?: boolean;
}) {
  const toggle = (key: string) => {
    if (readOnly || !onChange) return;
    onChange(permissions.includes(key) ? permissions.filter(k => k !== key) : [...permissions, key]);
  };

  const toggleModule = (moduleKey: string) => {
    if (readOnly || !onChange) return;
    const mod = MODULES.find(m => m.key === moduleKey);
    if (!mod) return;
    const allKeys = mod.actions.map(a => `${moduleKey}.${a.key}`);
    const allActive = allKeys.every(k => permissions.includes(k));
    if (allActive) {
      onChange(permissions.filter(k => !allKeys.includes(k)));
    } else {
      onChange([...new Set([...permissions, ...allKeys])]);
    }
  };

  return (
    <div className="space-y-1.5">
      {MODULES.map(mod => {
        const modKeys = mod.actions.map(a => `${mod.key}.${a.key}`);
        const activeCount = modKeys.filter(k => permissions.includes(k)).length;
        const allActive = activeCount === modKeys.length;
        const someActive = activeCount > 0 && !allActive;
        const colors = MODULE_COLORS[mod.color];

        return (
          <div
            key={mod.key}
            className={cn(
              "rounded-xl border overflow-hidden transition-all",
              allActive ? colors.border : someActive ? "border-zinc-200" : "border-zinc-100"
            )}
          >
            <div className={cn("flex items-center gap-3 px-3.5 py-2.5", allActive ? colors.bg : "bg-zinc-50/80")}>
              {!readOnly && (
                <button
                  onClick={() => toggleModule(mod.key)}
                  className={cn(
                    "w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all",
                    allActive
                      ? `${colors.dot} border-transparent`
                      : someActive
                      ? "bg-amber-100 border-amber-300"
                      : "border-zinc-300 bg-white hover:border-zinc-400"
                  )}
                >
                  {allActive && <Check size={9} className="text-white" />}
                  {someActive && <div className="w-1.5 h-1.5 rounded-sm bg-amber-500" />}
                </button>
              )}
              <div className={cn("p-1 rounded-lg border", colors.bg, colors.text, colors.border)}>
                {mod.icon}
              </div>
              <p className={cn("text-[11px] font-black flex-1", allActive ? colors.text : "text-zinc-700")}>
                {mod.label}
              </p>
              <span className="text-[9px] font-black text-zinc-400 tabular-nums">
                {activeCount}/{modKeys.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 px-3.5 py-2 border-t border-zinc-100 bg-white">
              {mod.actions.map(action => {
                const key = `${mod.key}.${action.key}`;
                const active = permissions.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    disabled={readOnly}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all",
                      active
                        ? `${colors.dot} border-transparent text-white`
                        : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300",
                      readOnly && "cursor-default"
                    )}
                  >
                    {active && <Check size={8} />}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MODAL USUÁRIO
═══════════════════════════════════════════════════════ */
function UserModal({
  open,
  onClose,
  onSave,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editing: any;
}) {
  const [showPass, setShowPass] = useState(false);
  const [activeSection, setActiveSection] = useState<"info" | "perms">("info");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    jobTitle: "",
    phone: "",
    bio: "",
    role: "manager",
    permissions: PRESETS["manager"],
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        const perms: string[] = editing.permissions
          ? (() => { try { return JSON.parse(editing.permissions); } catch { return PRESETS[editing.role] ?? PRESETS["manager"]; } })()
          : PRESETS[editing.role] ?? PRESETS["manager"];
        setForm({
          name: editing.name ?? "",
          email: editing.email ?? "",
          password: "",
          jobTitle: editing.jobTitle ?? "",
          phone: editing.phone ?? "",
          bio: editing.bio ?? "",
          role: editing.role ?? "manager",
          permissions: perms,
        });
      } else {
        setForm({ name: "", email: "", password: "", jobTitle: "", phone: "", bio: "", role: "manager", permissions: PRESETS["manager"] });
      }
      setActiveSection("info");
      setShowPass(false);
    }
  }, [open, editing]);

  if (!open) return null;

  const applyPreset = (role: string) => {
    setForm(p => ({ ...p, role, permissions: PRESETS[role] ?? [] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-zinc-200 w-full sm:max-w-lg flex flex-col" style={{ maxHeight: "92dvh" }}>
        {/* Handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-zinc-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <div>
            <h3 className="text-sm font-black text-zinc-900">{editing ? "Editar Usuário" : "Novo Usuário"}</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">{editing ? "Atualize as informações" : "Adicione à sua equipe"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 p-3 border-b border-zinc-100 shrink-0 bg-zinc-50/50">
          {([
            { key: "info", label: "Informações" },
            { key: "perms", label: "Permissões" },
          ] as const).map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                activeSection === s.key
                  ? "bg-white text-amber-700 border border-amber-200 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 hover:bg-white/60"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {activeSection === "info" && (
            <div className="space-y-4">
              <FormRow>
                <Input label="Nome Completo" placeholder="João Silva" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                <Input label="E-mail" type="email" placeholder="joao@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </FormRow>
              <Input 
                label={editing ? "Nova Senha (deixe em branco para manter)" : "Senha de Acesso"}
                type={showPass ? "text" : "password"}
                placeholder={editing ? "••••••••" : "Crie uma senha"}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                iconRight={<button type="button" onClick={() => setShowPass(v => !v)}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
              />
              <FormRow>
                <Input label="Cargo / Função" placeholder="Ex: Recepcionista" value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} />
                <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </FormRow>
              <Textarea
                label="Bio / Descrição"
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                rows={2}
                placeholder="Descreva a função desta pessoa..."
              />
            </div>
          )}

          {activeSection === "perms" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Perfil:</p>
                {[
                  { key: "admin", label: "Admin Total" },
                  { key: "manager", label: "Gerente" },
                  { key: "viewer", label: "Visualizador" },
                ].map(r => (
                  <button
                    key={r.key}
                    onClick={() => applyPreset(r.key)}
                    className={cn(
                      "text-[10px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-wider transition-all",
                      form.role === r.key
                        ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                        : "border-zinc-200 text-zinc-500 hover:border-amber-300 hover:text-amber-700 bg-white"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <PermissionMatrix
                permissions={form.permissions}
                onChange={perms => setForm(p => ({ ...p, permissions: perms }))}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-zinc-100 shrink-0 bg-zinc-50/50">
          <Button
            variant="ghost"
            fullWidth
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={() => onSave(form)}
          >
            {editing ? "Salvar Alterações" : "Criar Usuário"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AVATAR UPLOAD
═══════════════════════════════════════════════════════ */
function AvatarUpload({
  photo,
  initials,
  onPhotoChange,
}: {
  photo: string | null;
  initials: string;
  onPhotoChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mimeType = file.type || "image/jpeg";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        const res = await apiFetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: base64, mimeType }),
        });
        if (!res.ok) throw new Error();
        const { url } = await res.json();
        onPhotoChange(url);
      } catch {
        onPhotoChange(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative shrink-0">
      <div
        className="w-20 h-20 rounded-2xl overflow-hidden cursor-pointer relative shadow-lg shadow-black/10"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={() => inputRef.current?.click()}
      >
        {photo ? (
          <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-white font-black text-2xl">{initials}</span>
          </div>
        )}
        {hovering && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
            <Camera size={16} className="text-white" />
            <span className="text-[9px] text-white font-bold">Trocar foto</span>
          </div>
        )}
      </div>
      {photo && (
        <button
          onClick={(e) => { e.stopPropagation(); onPhotoChange(null); }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
          title="Remover foto"
        >
          <X size={10} className="text-white" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROLE BADGE
═══════════════════════════════════════════════════════ */
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string }> = {
    admin: { label: "Admin", className: "bg-amber-50 text-amber-700 border-amber-200" },
    manager: { label: "Gerente", className: "bg-blue-50 text-blue-700 border-blue-200" },
    viewer: { label: "Visualizador", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  };
  const r = map[role] ?? map["viewer"];
  return (
    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider", r.className)}>
      {r.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export function AdminProfileTab() {
  const { user: adminUser, logout, refreshUser } = useAuth();
  const isOwner = !adminUser || adminUser.role === "admin" || adminUser.role === "owner";

  const [photo, setPhoto] = useState<string | null>(adminUser?.photo ?? null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [form, setForm] = useState({
    name: adminUser?.name ?? "Admin Studio",
    jobTitle: adminUser?.jobTitle ?? "",
    bio: (adminUser as any)?.bio ?? "",
    phone: adminUser?.phone ?? "",
    password: "",
    confirmPassword: "",
  });

  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewPermsUser, setViewPermsUser] = useState<any>(null);

  const loadTeam = useCallback(async () => {
      const r = await apiFetch("/api/admin/team");
    if (!r.ok) return;
    const all = await r.json();
    const tenantId = adminUser?.tenantId;
    setTeamUsers(all.filter((u: any) => u.tenantId === tenantId && u.id !== adminUser?.id));
  }, [adminUser]);

  useEffect(() => { if (isOwner) loadTeam(); }, [isOwner, loadTeam]);

  const handleSaveProfile = async () => {
    setProfileError("");
    if (form.password && form.password !== form.confirmPassword) {
      setProfileError("As senhas não coincidem.");
      return;
    }
    setSaving(true);
    try {
      const body: any = { name: form.name, jobTitle: form.jobTitle, bio: form.bio, phone: form.phone, photo };
      if (form.password) body.password = form.password;
      if (adminUser?.id) {
        const r = await apiFetch(`/api/admin/profile/${adminUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error();
      }
      // Atualiza contexto via API (não localStorage)
      await refreshUser();
      setForm(f => ({ ...f, password: "", confirmPassword: "" }));
      setEditingProfile(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setProfileError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUser = async (data: any) => {
    const body = {
      name: data.name,
      email: data.email,
      password: data.password || undefined,
      jobTitle: data.jobTitle,
      phone: data.phone,
      bio: data.bio,
      role: data.role,
      tenantId: adminUser?.tenantId,
      canCreateUsers: data.permissions.includes("usuarios.criar"),
      canDeleteAccount: false,
      permissions: JSON.stringify(data.permissions),
    };
    if (editingUser) {
      await apiFetch(`/api/admin/team/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await apiFetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setUserModal(false);
    setEditingUser(null);
    loadTeam();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Excluir este usuário da equipe?")) return;
    await apiFetch(`/api/admin/team/${id}`, { method: "DELETE" });
    loadTeam();
  };

  const initials = (form.name || "A").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const filtered = teamUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );
  // Permissões já chegam como objeto PermissionSet do AuthContext
  // Para a matrix local (que usa array flat), converter
  const myPermsObj = adminUser?.permissions as any;
  const myPerms: string[] = myPermsObj
    ? Object.entries(myPermsObj).flatMap(([mod, actions]) =>
        Object.entries(actions as Record<string, boolean>)
          .filter(([, v]) => v)
          .map(([action]) => `${mod}.${action}`)
      )
    : PRESETS[adminUser?.role ?? "admin"] ?? [];

  return (
    <PageWrapper>
      <SectionTitle 
        title="Meu Perfil"
        description="Gerencie suas informações e sua equipe"
        className="mb-6"
      />
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ── CARD PERFIL ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {/* Hero banner */}
          <div className="h-24 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 relative">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
          </div>

          {/* Avatar + Actions */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-12 mb-6">
              <div className="ring-4 ring-white rounded-2xl shadow-xl shadow-black/5">
                <AvatarUpload photo={photo} initials={initials} onPhotoChange={setPhoto} />
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={editingProfile ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => { setEditingProfile(v => !v); setProfileError(""); }}
                  iconLeft={editingProfile ? <X size={14} /> : <Edit2 size={14} />}
                >
                  {editingProfile ? "Cancelar" : "Editar Perfil"}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={logout}
                  iconLeft={<LogOut size={14} />}
                >
                  Sair
                </Button>
              </div>
            </div>

          {/* Name + badges */}
          <div className="mb-4">
            <h2 className="text-base font-black text-zinc-900">{form.name}</h2>
            {form.jobTitle && <p className="text-xs text-zinc-500 mt-0.5">{form.jobTitle}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <RoleBadge role={adminUser?.role ?? "admin"} />
              {adminUser?.tenantName && (
                <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-lg border border-zinc-200">
                  {adminUser.tenantName}
                </span>
              )}
              {adminUser?.planName && (
                <span className="text-[9px] font-bold text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded-lg border border-zinc-100">
                  Plano {adminUser.planName}
                </span>
              )}
            </div>
          </div>

          {/* View mode */}
          {!editingProfile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {[
                { icon: <Mail size={13} />, label: "E-mail", value: adminUser?.email },
                { icon: <Phone size={13} />, label: "Telefone", value: form.phone },
                { icon: <Briefcase size={13} />, label: "Cargo", value: form.jobTitle },
                { icon: <FileText size={13} />, label: "Sobre", value: form.bio },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="text-zinc-400 mt-0.5 shrink-0">{row.icon}</div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">{row.label}</p>
                    <p className="text-xs font-semibold text-zinc-700 mt-0.5 break-words">{row.value || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit mode */}
          {editingProfile && (
            <div className="space-y-6 pt-1">
              <PanelCard
                title="Informações Pessoais"
                icon={User}
              >
                <div className="space-y-4">
                  <FormRow>
                    <Input label="Nome Completo" placeholder="Seu nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    <Input label="Cargo / Função" placeholder="Ex: Proprietário" value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} />
                  </FormRow>
                  <Input label="Telefone de Contato" placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                  <Textarea
                    label="Sobre você / O que faz no sistema"
                    value={form.bio}
                    onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                    rows={3}
                    placeholder="Descreva sua função..."
                  />
                </div>
              </PanelCard>

              <PanelCard
                title="Segurança"
                icon={Lock}
                iconWrapClassName="bg-amber-50 border-amber-100"
                iconClassName="text-amber-600"
              >
                <div className="space-y-4">
                  <p className="text-[10px] text-zinc-400 font-medium">Deixe em branco para manter a senha atual.</p>
                  <FormRow>
                    <Input 
                      label="Nova Senha" 
                      type={showPass ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Nova senha"
                      iconRight={<button type="button" onClick={() => setShowPass(v => !v)}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                    />
                    <Input 
                      label="Confirmar Senha" 
                      type={showPass ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Confirme"
                    />
                  </FormRow>
                </div>
              </PanelCard>

              {profileError && (
                <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  {profileError}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => { setEditingProfile(false); setProfileError(""); }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handleSaveProfile}
                  loading={saving}
                  iconLeft={<Save size={16} />}
                >
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* ── MINHAS PERMISSÕES (não-admin) ──────────────── */}
        {!isOwner && (
          <PanelCard
            title="Minhas Permissões"
            description={`${myPerms.length} permissões ativas`}
            icon={Shield}
          >
            <PermissionMatrix permissions={myPerms} readOnly />
          </PanelCard>
        )}

        {/* ── GESTÃO DE EQUIPE (admin/owner) ─────────────── */}
        {isOwner && (
          <PanelCard
            title="Equipe & Permissões"
            description={`${teamUsers.length} ${teamUsers.length === 1 ? "membro" : "membros"} na equipe`}
            icon={Users}
            action={
              <div className="flex items-center gap-2">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-32 sm:w-48"
                  iconLeft={<Search size={14} />}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => { setEditingUser(null); setUserModal(true); }}
                  iconLeft={<Plus size={14} />}
                >
                  Novo
                </Button>
              </div>
            }
          >
            {/* List content moved from inside the old div */}
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mx-auto mb-3 border border-zinc-100">
                  <Users size={20} className="text-zinc-300" />
                </div>
                <p className="text-sm font-bold text-zinc-500">
                  {search ? "Nenhum resultado" : "Nenhum usuário na equipe"}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {search ? "Tente outro termo" : "Adicione membros para colaborar"}
                </p>
              </div>
            ) : (
              <div className="-mx-6 -mb-6 border-t border-zinc-100">
                {filtered.map((u, idx) => {
                  const perms: string[] = (() => { try { return JSON.parse(u.permissions ?? "[]"); } catch { return PRESETS[u.role] ?? []; } })();
                  const isViewing = viewPermsUser?.id === u.id;
                  return (
                    <div key={u.id} className={cn("border-b border-zinc-100 last:border-0", isViewing && "bg-amber-50/30")}>
                      <div className="px-6 py-4 flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-sm shadow-sm"
                          style={{
                            background: `hsl(${(u.name.charCodeAt(0) * 37) % 360}, 60%, 90%)`,
                            color: `hsl(${(u.name.charCodeAt(0) * 37) % 360}, 60%, 35%)`,
                          }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-zinc-900">{u.name}</p>
                            <RoleBadge role={u.role} />
                            {!u.isActive && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 uppercase tracking-wider">
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {u.email}
                            {u.jobTitle ? ` · ${u.jobTitle}` : ""}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn("px-2 min-w-0", isViewing && "bg-amber-100 text-amber-700")}
                            onClick={() => setViewPermsUser(isViewing ? null : u)}
                            title="Ver permissões"
                          >
                            <Shield size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 min-w-0"
                            onClick={() => { setEditingUser(u); setUserModal(true); }}
                          >
                            <Edit2 size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 min-w-0 hover:text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded permissions */}
                      {isViewing && (
                        <div className="mx-6 mb-6 rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/60">
                            <p className="text-xs font-black text-amber-700 uppercase tracking-wider">
                              Permissões de {u.name}
                            </p>
                            <Button variant="ghost" size="xs" onClick={() => setViewPermsUser(null)} className="min-w-0 px-1">
                              <X size={14} />
                            </Button>
                          </div>
                          <div className="p-4">
                            <PermissionMatrix permissions={perms} readOnly />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </PanelCard>
        )}

        {/* Modal criar/editar usuário */}
        <UserModal
          open={userModal}
          onClose={() => { setUserModal(false); setEditingUser(null); }}
          onSave={handleSaveUser}
          editing={editingUser}
        />
      </div>
    </PageWrapper>
  );
}
