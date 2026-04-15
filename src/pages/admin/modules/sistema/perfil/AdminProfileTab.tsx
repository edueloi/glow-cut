import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import {
  User, Mail, Phone, Briefcase, FileText,
  Lock, Eye, EyeOff, Check, Edit2, Save,
  LogOut, Plus, Trash2, X, ChevronDown, Shield,
  LayoutDashboard, Calendar, Globe, Scissors,
  Users, CheckCircle, Banknote, Settings, Clock,
  UserCog, Search, Camera, Upload,
} from "lucide-react";

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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full text-xs p-3 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-semibold",
        "focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400 outline-none transition-all",
        "placeholder:text-zinc-300 disabled:opacity-50 disabled:bg-zinc-50",
        props.className
      )}
    />
  );
}

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
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nome Completo">
                  <Inp placeholder="João Silva" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </Field>
                <Field label="E-mail">
                  <Inp type="email" placeholder="joao@email.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </Field>
              </div>
              <Field label={editing ? "Nova Senha (deixe em branco para manter)" : "Senha de Acesso"}>
                <div className="relative">
                  <Inp
                    type={showPass ? "text" : "password"}
                    placeholder={editing ? "••••••••" : "Crie uma senha"}
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Cargo / Função">
                  <Inp placeholder="Ex: Recepcionista" value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} />
                </Field>
                <Field label="Telefone">
                  <Inp placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </Field>
              </div>
              <Field label="Bio / Descrição">
                <textarea
                  value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  rows={2}
                  placeholder="Descreva a função desta pessoa..."
                  className="w-full text-xs p-3 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400 outline-none resize-none transition-all placeholder:text-zinc-300"
                />
              </Field>
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
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 rounded-xl hover:bg-zinc-100 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm shadow-amber-500/20 transition-all"
          >
            {editing ? "Salvar Alterações" : "Criar Usuário"}
          </button>
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
        const stored = localStorage.getItem("adminUser");
        const adminUser = stored ? JSON.parse(stored) : null;
        const res = await apiFetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: base64, mimeType, tenantId: adminUser?.tenantId }),
        });
        if (!res.ok) throw new Error();
        const { url } = await res.json();
        onPhotoChange(url);
        if (adminUser) {
          localStorage.setItem("adminUser", JSON.stringify({ ...adminUser, photo: url }));
        }
      } catch {
        // fallback: usa base64 localmente se upload falhar
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
          onClick={(e) => { e.stopPropagation(); onPhotoChange(null); const s = localStorage.getItem("adminUser"); if (s) { const u = JSON.parse(s); u.photo = null; localStorage.setItem("adminUser", JSON.stringify(u)); } }}
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
  const stored = localStorage.getItem("adminUser");
  const adminUser = stored ? JSON.parse(stored) : null;
  const isOwner = !adminUser || adminUser.role === "admin";

  const [photo, setPhoto] = useState<string | null>(adminUser?.photo ?? null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [form, setForm] = useState({
    name: adminUser?.name ?? "Admin Studio",
    jobTitle: adminUser?.jobTitle ?? "",
    bio: adminUser?.bio ?? "",
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
    const r = await apiFetch("/api/super-admin/admin-users");
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
      localStorage.setItem("adminUser", JSON.stringify({ ...adminUser, ...body }));
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
      await apiFetch(`/api/super-admin/admin-users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await apiFetch("/api/super-admin/admin-users", {
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
    await apiFetch(`/api/super-admin/admin-users/${id}`, { method: "DELETE" });
    loadTeam();
  };

  const handleLogout = () => {
    localStorage.removeItem("isLogged");
    localStorage.removeItem("adminUser");
    window.location.href = "/login";
  };

  const initials = (form.name || "A").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const filtered = teamUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );
  const myPerms: string[] = adminUser?.permissions
    ? (() => { try { return JSON.parse(adminUser.permissions); } catch { return PRESETS[adminUser?.role] ?? []; } })()
    : PRESETS[adminUser?.role ?? "admin"] ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">

      {/* ── CARD PERFIL ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Hero banner */}
        <div className="h-20 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        </div>

        {/* Avatar + Actions */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="ring-4 ring-white rounded-2xl">
              <AvatarUpload photo={photo} initials={initials} onPhotoChange={setPhoto} />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <button
                onClick={() => { setEditingProfile(v => !v); setProfileError(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border",
                  editingProfile
                    ? "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200"
                    : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                )}
              >
                {editingProfile ? <X size={12} /> : <Edit2 size={12} />}
                {editingProfile ? "Cancelar" : "Editar Perfil"}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-red-500 hover:bg-red-50 border border-red-100 hover:border-red-200 transition-all"
              >
                <LogOut size={12} /> Sair
              </button>
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
              {saved && (
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                  <Check size={9} /> Salvo!
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
            <div className="space-y-3.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nome Completo">
                  <Inp placeholder="Seu nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </Field>
                <Field label="Cargo / Função">
                  <Inp placeholder="Ex: Proprietário" value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} />
                </Field>
              </div>
              <Field label="Telefone de Contato">
                <Inp placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </Field>
              <Field label="Sobre você / O que faz no sistema">
                <textarea
                  value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  rows={2}
                  placeholder="Descreva sua função..."
                  className="w-full text-xs p-3 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400 outline-none resize-none transition-all placeholder:text-zinc-300"
                />
              </Field>

              {/* Alterar senha */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock size={12} className="text-zinc-400" />
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Alterar Senha</p>
                  <span className="text-[9px] text-zinc-300">(em branco = manter atual)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nova Senha">
                    <div className="relative">
                      <Inp
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Nova senha"
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                        {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirmar Senha">
                    <Inp
                      type={showPass ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Confirme"
                    />
                  </Field>
                </div>
              </div>

              {profileError && (
                <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  {profileError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingProfile(false); setProfileError(""); }}
                  className="flex-1 py-2.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 rounded-xl hover:bg-zinc-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-sm shadow-amber-500/20 disabled:opacity-50 transition-all"
                >
                  <Save size={13} />
                  {saving ? "Salvando..." : "Salvar Perfil"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MINHAS PERMISSÕES (não-admin) ──────────────── */}
      {!isOwner && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-xs font-black text-zinc-800">Minhas Permissões de Acesso</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">{myPerms.length} permissões ativas</p>
          </div>
          <div className="p-4">
            <PermissionMatrix permissions={myPerms} readOnly />
          </div>
        </div>
      )}

      {/* ── GESTÃO DE EQUIPE (admin/owner) ─────────────── */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-black text-zinc-800">Equipe & Permissões</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {teamUsers.length} {teamUsers.length === 1 ? "membro" : "membros"} na equipe
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="text-xs pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 w-32 font-medium placeholder:text-zinc-300 transition-all"
                  />
                </div>
                <button
                  onClick={() => { setEditingUser(null); setUserModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-black shadow-sm shadow-amber-500/20 transition-all"
                >
                  <Plus size={12} /> Novo
                </button>
              </div>
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="py-12 text-center px-5">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-zinc-400" />
              </div>
              <p className="text-xs font-bold text-zinc-500">
                {search ? "Nenhum resultado" : "Nenhum usuário na equipe"}
              </p>
              <p className="text-[10px] text-zinc-400 mt-1">
                {search ? "Tente outro termo" : "Adicione membros para colaborar"}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((u, idx) => {
                const perms: string[] = (() => { try { return JSON.parse(u.permissions ?? "[]"); } catch { return PRESETS[u.role] ?? []; } })();
                const isViewing = viewPermsUser?.id === u.id;
                return (
                  <div key={u.id} className={cn("border-b border-zinc-100 last:border-0", isViewing && "bg-amber-50/30")}>
                    <div className="px-5 py-3.5 flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-black text-sm shadow-sm"
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
                          <p className="text-xs font-black text-zinc-900">{u.name}</p>
                          <RoleBadge role={u.role} />
                          {!u.isActive && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {u.email}
                          {u.jobTitle ? ` · ${u.jobTitle}` : ""}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] font-bold text-zinc-300 hidden sm:block mr-1">{perms.length}p</span>
                        <button
                          onClick={() => setViewPermsUser(isViewing ? null : u)}
                          className={cn(
                            "p-1.5 rounded-lg transition-all",
                            isViewing ? "bg-amber-100 text-amber-700" : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                          )}
                          title="Ver permissões"
                        >
                          <Shield size={13} />
                        </button>
                        <button
                          onClick={() => { setEditingUser(u); setUserModal(true); }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-all"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded permissions */}
                    {isViewing && (
                      <div className="mx-5 mb-4 rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-200/60">
                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                            Permissões de {u.name}
                          </p>
                          <button onClick={() => setViewPermsUser(null)} className="p-1 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors">
                            <X size={12} />
                          </button>
                        </div>
                        <div className="p-3">
                          <PermissionMatrix permissions={perms} readOnly />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal criar/editar usuário */}
      <UserModal
        open={userModal}
        onClose={() => { setUserModal(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        editing={editingUser}
      />
    </div>
  );
}
