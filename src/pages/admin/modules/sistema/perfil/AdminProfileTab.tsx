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
  UserCog, Search, Camera, Upload, Trash,
  Star, AlertCircle, AlertTriangle
} from "lucide-react";

import { Button } from "@/src/components/ui/Button";
import { Input, Textarea } from "@/src/components/ui/Input";
import { PageWrapper, SectionTitle, FormRow, Divider } from "@/src/components/ui/PageWrapper";

import { PanelCard } from "@/src/components/ui/PanelCard";
import { Badge } from "@/src/components/ui/Badge";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DeleteConfirmModal } from "@/src/pages/admin/dashboard/components/modals/DeleteConfirmModal";


import { AnimatePresence, motion } from "motion/react";

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

/* ═══════════════════════════════════════════════════════
   PRESETS & COLORS
═══════════════════════════════════════════════════════ */
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

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; light: string }> = {
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",  dot: "bg-amber-500",   light: "bg-amber-500/10" },
  blue:    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",   dot: "bg-blue-500",    light: "bg-blue-500/10" },
  cyan:    { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",   dot: "bg-cyan-500",    light: "bg-cyan-500/10" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200", dot: "bg-violet-500",  light: "bg-violet-500/10" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200",dot: "bg-emerald-500", light: "bg-emerald-500/10" },
  green:   { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200",  dot: "bg-green-500",   light: "bg-green-500/10" },
  orange:  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200", dot: "bg-orange-500",  light: "bg-orange-500/10" },
  slate:   { bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200",  dot: "bg-slate-500",   light: "bg-slate-500/10" },
  zinc:    { bg: "bg-zinc-100",   text: "text-zinc-700",    border: "border-zinc-200",   dot: "bg-zinc-500",    light: "bg-zinc-500/10" },
  red:     { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",    dot: "bg-red-500",     light: "bg-red-500/10" },
};

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              "rounded-[22px] border overflow-hidden transition-all duration-300",
              allActive ? colors.border + " bg-white shadow-sm" : someActive ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50/50"
            )}
          >
            <div className={cn("flex items-center gap-3 px-4 py-3", allActive ? colors.bg : "")}>
              {!readOnly && (
                <button
                  onClick={() => toggleModule(mod.key)}
                  className={cn(
                    "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                    allActive
                      ? `${colors.dot} border-transparent shadow-sm`
                      : someActive
                      ? "bg-amber-100 border-amber-300"
                      : "border-zinc-300 bg-white hover:border-zinc-400"
                  )}
                >
                  {allActive && <Check size={11} className="text-white" strokeWidth={3} />}
                  {someActive && <div className="w-2 h-2 rounded-sm bg-amber-500" />}
                </button>
              )}
              <div className={cn("p-1.5 rounded-xl border", colors.bg, colors.text, colors.border)}>
                {mod.icon}
              </div>
              <p className={cn("text-[11px] font-black flex-1 uppercase tracking-tight", allActive ? colors.text : "text-zinc-600")}>
                {mod.label}
              </p>
              <span className={cn("text-[10px] font-black tabular-nums px-2 py-0.5 rounded-full", allActive ? "bg-white/50 text-current" : "text-zinc-400")}>
                {activeCount}/{modKeys.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 bg-white/40">
              {mod.actions.map(action => {
                const key = `${mod.key}.${action.key}`;
                const active = permissions.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    disabled={readOnly}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all",
                      active
                        ? `${colors.dot} border-transparent text-white shadow-sm`
                        : "bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:text-zinc-600",
                      readOnly && "cursor-default"
                    )}
                  >
                    {active && <Check size={10} strokeWidth={3} />}
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
    cpf: "",
    birthDate: "",
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
          cpf: editing.cpf ?? "",
          birthDate: editing.birthDate ?? "",
          bio: editing.bio ?? "",
          role: editing.role ?? "manager",
          permissions: perms,
        });
      } else {
        setForm({ name: "", email: "", password: "", jobTitle: "", phone: "", cpf: "", birthDate: "", bio: "", role: "manager", permissions: PRESETS["manager"] });
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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-zinc-200 w-full sm:max-w-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500" style={{ maxHeight: "92dvh" }}>
        
        {/* Header Visual */}
        <div className="h-24 bg-gradient-to-r from-zinc-900 to-zinc-800 relative shrink-0">
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
           <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />
           <div className="absolute bottom-4 left-6">
              <h3 className="text-xl font-black text-zinc-900 tracking-tight">{editing ? "Editar Usuário" : "Novo Membro"}</h3>
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Gestão de Equipe & Acesso</p>
           </div>
           <button onClick={onClose} className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md">
             <X size={18} />
           </button>
        </div>

        {/* Tabs Modernas */}
        <div className="flex gap-1 p-1.5 bg-zinc-100 mx-6 mt-4 rounded-2xl shrink-0">
          {([
            { key: "info", label: "Informações Básicas", icon: <User size={14} /> },
            { key: "perms", label: "Nível de Acesso", icon: <Shield size={14} /> },
          ] as const).map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2",
                activeSection === s.key
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6 scrollbar-none">
          {activeSection === "info" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <FormRow>
                <Input label="Nome Completo" placeholder="Ex: João Silva" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                <Input label="E-mail Profissional" type="email" placeholder="joao@estudio.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </FormRow>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input 
                   label={editing ? "Nova Senha (opcional)" : "Senha Inicial"}
                   type={showPass ? "text" : "password"}
                   placeholder={editing ? "Manter atual" : "••••••••"}
                   value={form.password}
                   onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                   iconRight={<button type="button" onClick={() => setShowPass(v => !v)} className="text-zinc-400 hover:text-zinc-600 transition-colors">{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                 />
                 <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} iconLeft={<Phone size={14} className="text-zinc-400" />} />
              </div>

              <Input label="Cargo / Função" placeholder="Ex: Master Barber, Recepcionista..." value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} iconLeft={<Briefcase size={14} className="text-zinc-400" />} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} iconLeft={<FileText size={14} className="text-zinc-400" />} />
                 <Input label="Data de Nascimento" type="date" value={form.birthDate} onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))} iconLeft={<Calendar size={14} className="text-zinc-400" />} />
              </div>
              
              <Textarea
                label="Observações Internas (Bio)"
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                rows={3}
                placeholder="Breve descrição sobre as responsabilidades deste membro..."
              />
            </div>
          )}

          {activeSection === "perms" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Selecione um Perfil Base:</p>
                 <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "admin", label: "Admin Total", icon: <Shield size={12} /> },
                      { key: "manager", label: "Gerente", icon: <UserCog size={12} /> },
                      { key: "viewer", label: "Consultor", icon: <Eye size={12} /> },
                    ].map(r => (
                      <button
                        key={r.key}
                        onClick={() => applyPreset(r.key)}
                        className={cn(
                          "text-[10px] font-black py-2.5 rounded-xl border uppercase tracking-tight transition-all flex items-center justify-center gap-1.5",
                          form.role === r.key
                            ? "bg-zinc-900 border-zinc-900 text-white shadow-md"
                            : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400"
                        )}
                      >
                        {r.icon}
                        {r.label}
                      </button>
                    ))}
                 </div>
              </div>
              
              <div className="space-y-3">
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ajuste Fino de Permissões:</p>
                 <PermissionMatrix
                   permissions={form.permissions}
                   onChange={perms => setForm(p => ({ ...p, permissions: perms }))}
                 />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-zinc-100 bg-white shrink-0">
          <Button
            variant="ghost"
            className="flex-1 h-12 rounded-2xl font-black uppercase text-xs"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-[2] h-12 rounded-2xl font-black uppercase text-xs shadow-lg shadow-zinc-900/10"
            onClick={() => onSave(form)}
          >
            {editing ? "Atualizar Usuário" : "Finalizar Cadastro"}
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
  editable = true,
}: {
  photo: string | null;
  initials: string;
  onPhotoChange: (dataUrl: string | null) => void;
  editable?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovering, setHovering] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editable) return;
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
        className={cn(
          "w-24 h-24 md:w-32 md:h-32 rounded-[32px] overflow-hidden relative shadow-2xl ring-4 ring-white",
          editable ? "cursor-pointer" : "cursor-default"
        )}
        onMouseEnter={() => editable && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={() => editable && inputRef.current?.click()}
      >
        {photo ? (
          <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
            <span className="text-white font-black text-3xl md:text-4xl tracking-tighter italic">{initials}</span>
          </div>
        )}
        {hovering && editable && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1 backdrop-blur-sm transition-all animate-in fade-in duration-300">
            <Camera size={20} className="text-white" />
            <span className="text-[10px] text-white font-black uppercase tracking-widest">Alterar</span>
          </div>
        )}
      </div>
      
      {editable && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="absolute bottom-1 right-1 w-8 h-8 bg-white text-zinc-900 rounded-2xl flex items-center justify-center shadow-xl border border-zinc-100 hover:scale-110 transition-transform active:scale-95"
          >
            <Upload size={14} />
          </button>

          {photo && (
            <button
              onClick={(e) => { e.stopPropagation(); onPhotoChange(null); }}
              className="absolute -top-2 -right-2 w-7 h-7 bg-white text-rose-500 rounded-2xl flex items-center justify-center shadow-xl border border-zinc-100 hover:bg-rose-50 transition-colors"
              title="Remover foto"
            >
              <Trash size={14} />
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
}



/* ═══════════════════════════════════════════════════════
   ROLE BADGE
═══════════════════════════════════════════════════════ */
function RoleBadge({ role, pill = true, className }: { role: string; pill?: boolean; className?: string }) {
  const map: Record<string, { label: string; color: any; icon: any }> = {
    owner:   { label: "Proprietário", color: "primary", icon: <Shield size={10} /> },
    admin:   { label: "Administrador", color: "primary", icon: <CheckCircle size={10} /> },
    manager: { label: "Gerente", color: "info", icon: <UserCog size={10} /> },
    professional: { label: "Profissional", color: "amber", icon: <Scissors size={10} /> },
    viewer:  { label: "Visualizador", color: "default", icon: <Eye size={10} /> },
  };
  const r = map[role] ?? map["viewer"];
  return (
    <Badge color={r.color} icon={r.icon} pill={pill} className={className}>
      {r.label}
    </Badge>
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
    cpf: (adminUser as any)?.cpf ?? "",
    birthDate: (adminUser as any)?.birthDate ?? "",
    password: "",
    confirmPassword: "",
  });

  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [userModal, setUserModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewPermsUser, setViewPermsUser] = useState<any>(null);

  const loadTeam = useCallback(async () => {
    const [adminRes, profRes] = await Promise.all([
      apiFetch("/api/admin/team"),
      apiFetch("/api/professionals")
    ]);
    
    if (!adminRes.ok) return;
    const admins = await adminRes.json();
    const profs = profRes.ok ? await profRes.json() : [];
    
    const tenantId = adminUser?.tenantId;
    
    // Filtra admins do tenant (exceto o próprio)
    const filteredAdmins = admins.filter((u: any) => u.tenantId === tenantId && u.id !== adminUser?.id);
    
    // Mapeia profissionais para o formato de usuário para exibição na lista
    const mappedProfs = profs
      .filter((p: any) => p.tenantId === tenantId && (!admins.some((a: any) => a.email === p.email && a.id !== adminUser?.id)))
      .map((p: any) => ({
        ...p,
        isProfessional: true,
        jobTitle: p.role,
        role: p.isOwner ? "owner" : "professional"
      }));

    setTeamUsers([...filteredAdmins, ...mappedProfs]);
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
      const body: any = { 
        name: form.name, 
        jobTitle: form.jobTitle, 
        bio: form.bio, 
        phone: form.phone, 
        photo,
        cpf: form.cpf,
        birthDate: form.birthDate
      };
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
      cpf: data.cpf,
      birthDate: data.birthDate,
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

  const handleDeleteUser = (id: string, name: string) => {
    setDeleteConfirm({ type: "usuário", id, name });
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirm) return;
    await apiFetch(`/api/admin/team/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null);
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
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
        <SectionTitle 
          title="Central do Perfil" 
          description="Gerencie sua conta, segurança e equipe de colaboradores." 
          icon={UserCog}
        />

        {/* ── CARD PRINCIPAL DE PERFIL ──────────────────────────────────── */}
        <div className="bg-white rounded-[40px] border border-zinc-200 shadow-2xl shadow-zinc-200/50 overflow-hidden relative">
          
          {/* Banner Decorativo Premium */}
          <div className="h-32 md:h-48 bg-zinc-950 relative overflow-hidden">
             {/* Animated Gradients */}
             <div className="absolute inset-0 opacity-40">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[140%] bg-amber-500/30 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[120%] bg-blue-500/20 rounded-full blur-[100px]" />
             </div>
             {/* Pattern */}
             <div className="absolute inset-0 opacity-[0.03] grayscale" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }} />
             
             {/* Glass Actions Mobile */}
             <div className="absolute top-4 right-4 flex gap-2 lg:hidden">
                 <button onClick={() => setEditingProfile(!editingProfile)} className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                    {editingProfile ? <X size={18} /> : <Edit2 size={18} />}
                 </button>
             </div>
          </div>

          <div className="px-6 md:px-12 pb-8 md:pb-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between -mt-12 md:-mt-16 gap-6">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                 <AvatarUpload 
                   photo={photo} 
                   initials={initials} 
                   onPhotoChange={setPhoto} 
                   editable={editingProfile}
                 />

                 
                 <div className="text-center md:text-left mb-2">
                    <div className="flex flex-col md:flex-row items-center gap-3">
                       <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">{form.name}</h2>
                       <RoleBadge role={adminUser?.role ?? "admin"} />
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                       <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                          <Mail size={14} className="text-zinc-300" />
                          {adminUser?.email}
                       </span>
                       {form.jobTitle && (
                         <>
                            <span className="w-1 h-1 rounded-full bg-zinc-200 hidden md:block" />
                            <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-tight">
                               <Briefcase size={14} className="text-zinc-300" />
                               {form.jobTitle}
                            </span>
                         </>
                       )}
                    </div>
                 </div>
              </div>

              <div className="flex items-center justify-center gap-3 shrink-0 mb-2">
                 {!editingProfile ? (
                   <>
                      <Button
                        variant="outline"
                        className="rounded-2xl h-12 px-6 border-zinc-200 bg-zinc-50/50 hover:bg-white font-black uppercase text-[11px] tracking-widest transition-all"
                        onClick={() => { setEditingProfile(true); setProfileError(""); }}
                        iconLeft={<Edit2 size={16} />}
                      >
                        Editar Perfil
                      </Button>
                      <Button
                        variant="danger"
                        className="rounded-2xl h-12 w-12 md:w-auto md:px-6 bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 font-black uppercase text-[11px] tracking-widest min-w-0"
                        onClick={logout}
                        iconLeft={<LogOut size={18} />}
                      >
                        <span className="hidden md:inline ml-2">Sair</span>
                      </Button>
                   </>
                 ) : (
                   <Button
                     variant="ghost"
                     className="rounded-2xl h-12 px-6 font-black uppercase text-[11px] tracking-widest"
                     onClick={() => { setEditingProfile(false); setProfileError(""); }}
                     iconLeft={<X size={16} />}
                   >
                     Cancelar
                   </Button>
                 )}
              </div>
            </div>

            <Divider className="my-8 md:my-10 opacity-50" />

            {/* CONTEÚDO DINÂMICO */}
            <AnimatePresence mode="wait">
              {!editingProfile ? (
                <motion.div 
                  key="view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="p-5 rounded-[28px] bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition-all group">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Informações Gerais</p>
                          <div className="space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-zinc-400">
                                   <Phone size={14} />
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[9px] font-black text-zinc-400 uppercase">Telefone</p>
                                   <p className="text-sm font-bold text-zinc-700">{form.phone || "Não informado"}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-zinc-400">
                                   <FileText size={14} />
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[9px] font-black text-zinc-400 uppercase">CPF</p>
                                   <p className="text-sm font-bold text-zinc-700">{form.cpf || "Não informado"}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-zinc-400">
                                   <Calendar size={14} />
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[9px] font-black text-zinc-400 uppercase">Nascimento</p>
                                   <p className="text-sm font-bold text-zinc-700">{form.birthDate || "Não informado"}</p>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="p-5 rounded-[28px] bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition-all">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Assinatura & Validade</p>
                          <div className="space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500">
                                   <Star size={14} />
                                </div>
                                <div className="min-w-0">
                                   <p className="text-[9px] font-black text-zinc-400 uppercase">Plano Atual</p>
                                   <p className="text-sm font-bold text-zinc-700">{adminUser?.planName || "Enterprise"}</p>
                                </div>
                             </div>
                             {(() => {
                               if (!adminUser?.tenantExpiresAt) return (
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-violet-500">
                                       <Shield size={14} />
                                    </div>
                                    <div className="min-w-0">
                                       <p className="text-[9px] font-black text-zinc-400 uppercase">Status</p>
                                       <p className="text-sm font-bold text-zinc-700">Acesso Vitalício</p>
                                    </div>
                                 </div>
                               );
                               
                               const expiry = parseISO(adminUser.tenantExpiresAt);
                               const daysLeft = differenceInDays(expiry, new Date());
                               const isTrial = adminUser.planName?.toLowerCase().includes("trial") || adminUser.planName?.toLowerCase().includes("teste");
                               
                               return (
                                 <div className="flex items-center gap-3">
                                    <div className={cn("w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center", daysLeft < 7 ? "text-rose-500" : "text-emerald-500")}>
                                       <Clock size={14} />
                                    </div>
                                    <div className="min-w-0">
                                       <p className="text-[9px] font-black text-zinc-400 uppercase">
                                          {isTrial ? "Expira em (Teste)" : "Validade do Plano"}
                                       </p>
                                       <p className="text-sm font-bold text-zinc-700">
                                          {daysLeft <= 0 ? "Expirado" : `${daysLeft} dias restantes`}
                                          <span className="text-[10px] text-zinc-400 ml-1.5 font-bold">({format(expiry, "dd/MM/yyyy")})</span>
                                       </p>
                                    </div>
                                 </div>
                               );
                             })()}
                          </div>
                       </div>
                    </div>

                    <div className="p-6 rounded-[32px] bg-white border border-zinc-100 shadow-sm">

                       <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <FileText size={16} className="text-zinc-400" />
                          Sobre Mim
                       </h3>
                       <p className="text-sm text-zinc-500 leading-relaxed italic font-medium">
                          "{form.bio || "Nenhuma descrição informada. Edite seu perfil para contar um pouco sobre suas responsabilidades."}"
                       </p>
                    </div>
                  </div>

                  {/* Sidebar stats/links */}
                  <div className="space-y-4">
                     <div className="p-6 rounded-[32px] bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                           <Shield size={64} />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">Status de Segurança</h4>
                        <div className="space-y-4 relative z-10">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs font-bold">Conta Verificada</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-xs font-bold">MFA Desativado</span>
                           </div>
                        </div>
                        <button className="mt-8 w-full py-2.5 rounded-xl bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">
                           Logs de Acesso
                        </button>
                     </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="edit"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
                >
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <PanelCard title="Informações Pessoais" icon={User}>

                        <div className="space-y-4">
                          <Input label="Nome Completo" placeholder="Seu nome" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                          <FormRow>
                            <Input label="Cargo / Função" placeholder="Ex: Proprietário" value={form.jobTitle} onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))} />
                            <Input label="Telefone de Contato" placeholder="(11) 99999-9999" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                          </FormRow>
                          <FormRow>
                            <Input label="CPF" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} />
                            <Input label="Data de Nascimento" type="date" value={form.birthDate} onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))} />
                          </FormRow>
                          <Textarea
                            label="Sobre você (Bio)"
                            value={form.bio}
                            onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                            rows={3}
                            placeholder="Conte um pouco sobre você..."
                          />
                        </div>
                      </PanelCard>

                      <PanelCard title="Alterar Senha" icon={Lock}>

                        <div className="space-y-4">
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Segurança da Conta</p>
                          <Input 
                            label="Nova Senha" 
                            type={showPass ? "text" : "password"}
                            value={form.password}
                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                            placeholder="Deixe vazio para não alterar"
                            iconRight={<button type="button" onClick={() => setShowPass(v => !v)}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                          />
                          <Input 
                            label="Confirmar Nova Senha" 
                            type={showPass ? "text" : "password"}
                            value={form.confirmPassword}
                            onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                            placeholder="Repita a nova senha"
                          />
                          <div className="pt-2">
                             <div className="flex items-center gap-2 text-[10px] text-zinc-400 italic">
                                <AlertCircle size={12} />
                                Recomendamos senhas com mais de 8 caracteres.
                             </div>
                          </div>
                        </div>
                      </PanelCard>
                   </div>

                   {profileError && (
                     <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs font-black text-rose-600 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        {profileError}
                     </div>
                   )}

                   <div className="flex flex-col sm:flex-row gap-3 pt-4">
                     <Button
                       variant="ghost"
                       className="h-12 rounded-2xl flex-1 font-black uppercase text-xs tracking-widest"
                       onClick={() => { setEditingProfile(false); setProfileError(""); }}
                     >
                       Cancelar Edição
                     </Button>
                     <Button
                       variant="primary"
                       className="h-12 rounded-2xl flex-[2] font-black uppercase text-xs tracking-widest shadow-xl shadow-zinc-900/10"
                       onClick={handleSaveProfile}
                       loading={saving}
                       iconLeft={<Save size={18} />}
                     >
                       Publicar Alterações
                     </Button>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── SEÇÃO DE PERMISSÕES & EQUIPE ──────────────────────── */}
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
              <div>
                 <h3 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                    <Users size={24} className="text-zinc-400" />
                    {isOwner ? "Equipe & Colaboradores" : "Minhas Permissões"}
                 </h3>
                 <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {isOwner ? `Gerencie os ${teamUsers.length} membros que acessam seu painel administrativo.` : "Consulte os módulos e ações que você tem acesso no sistema."}
                 </p>
              </div>
              
              {isOwner && (
                <div className="flex items-center gap-3">
                   <div className="relative group">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                      <input 
                        type="text" 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou e-mail..."
                        className="h-11 w-full md:w-64 pl-10 pr-4 rounded-2xl bg-white border border-zinc-200 text-xs font-bold focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-900 transition-all"
                      />
                   </div>
                   <Button 
                      variant="primary" 
                      className="h-11 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-zinc-900/10 shrink-0"
                      onClick={() => { setEditingUser(null); setUserModal(true); }}
                      iconLeft={<Plus size={16} />}
                   >
                      Convidar
                   </Button>
                </div>
              )}
           </div>

           {!isOwner ? (
             <div className="bg-white rounded-[32px] border border-zinc-200 p-6 md:p-8">
               <PermissionMatrix permissions={myPerms} readOnly />
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-4">
                {filtered.length === 0 ? (
                  <div className="bg-white rounded-[32px] border border-dashed border-zinc-200 py-16 text-center">
                    <div className="w-16 h-16 rounded-[24px] bg-zinc-50 flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                      <Users size={24} className="text-zinc-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-900">
                      {search ? "Nenhum membro encontrado" : "Sua equipe está vazia"}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      {search ? "Tente buscar por outro nome ou e-mail." : "Adicione colaboradores para ajudar na gestão do seu estúdio."}
                    </p>
                    {!search && (
                      <Button variant="outline" className="mt-6 rounded-xl" onClick={() => setUserModal(true)}>Adicionar Primeiro Membro</Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((u) => {
                      const perms: string[] = (() => { try { return JSON.parse(u.permissions ?? "[]"); } catch { return PRESETS[u.role] ?? []; } })();
                      const isViewing = viewPermsUser?.id === u.id;
                      const avatarColor = `hsl(${(u.name.charCodeAt(0) * 37) % 360}, 60%, 45%)`;
                      
                      return (
                        <div 
                          key={u.id} 
                          className={cn(
                            "group relative bg-white rounded-[28px] border border-zinc-200 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-zinc-200/40 hover:-translate-y-1",
                            isViewing && "ring-2 ring-zinc-900 border-transparent shadow-2xl"
                          )}
                        >
                          <div className="flex items-start justify-between mb-4">
                             <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-inner shrink-0"
                               style={{ backgroundColor: avatarColor }}
                             >
                               {u.name.charAt(0).toUpperCase()}
                             </div>
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingUser(u); setUserModal(true); }} className="p-2 rounded-xl bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-all">
                                   <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-2 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-all">
                                   <Trash2 size={14} />
                                </button>
                             </div>
                          </div>

                          <div className="space-y-1">
                             <h4 className="text-sm font-black text-zinc-900 truncate">{u.name}</h4>
                             <p className="text-[10px] text-zinc-400 font-bold truncate uppercase tracking-tighter">{u.email}</p>
                          </div>

                          <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between">
                             <RoleBadge role={u.role} />
                             <button 
                               onClick={() => setViewPermsUser(isViewing ? null : u)}
                               className={cn(
                                 "text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all",
                                 isViewing ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-900"
                               )}
                             >
                                <Shield size={12} />
                                {isViewing ? "Ocultar" : "Permissões"}
                             </button>
                          </div>

                          {/* Expanded perms hover/click */}
                          {isViewing && (
                             <div className="absolute inset-x-0 top-full mt-2 z-20 animate-in fade-in zoom-in-95 duration-300">
                                <div className="bg-zinc-900 rounded-[32px] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-white w-[300px] md:w-[450px]">
                                   <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Acessos de {u.name.split(' ')[0]}</p>
                                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-white">{perms.length} Ativos</span>
                                   </div>
                                   <div className="max-h-[300px] overflow-y-auto scrollbar-none pr-1">
                                      <PermissionMatrix permissions={perms} readOnly />
                                   </div>
                                   <button onClick={() => setViewPermsUser(null)} className="w-full mt-4 py-2 rounded-xl bg-white text-zinc-950 text-[10px] font-black uppercase tracking-widest">Fechar Visualização</button>
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
        </div>

        <UserModal
          open={userModal}
          onClose={() => { setUserModal(false); setEditingUser(null); }}
          onSave={handleSaveUser}
          editing={editingUser}
        />
      </div>
      <DeleteConfirmModal deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} confirmDelete={confirmDeleteUser} />
    </PageWrapper>
  );
}

