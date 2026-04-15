import React, { useState, useEffect } from "react";
import {
  Camera,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
  ChevronLeft,
  Shield,
  Clock,
  Scissors,
  Info,
  User,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal, ModalFooter } from "@/src/components/ui/Modal";
import { Input, Textarea, Select } from "@/src/components/ui/Input";
import { Switch } from "@/src/components/ui/Switch";
import { maskCPF, maskPhone, maskDate } from "@/src/lib/masks";

interface ProfessionalModalProps {
  isProfessionalModalOpen: boolean;
  setIsProfessionalModalOpen: (v: boolean) => void;
  editingProfessional: any;
  setEditingProfessional: (v: any) => void;
  newProfessional: any;
  setNewProfessional: (v: any | ((p: any) => any)) => void;
  profPasswordVisible: boolean;
  setProfPasswordVisible: (v: boolean | ((v: boolean) => boolean)) => void;
  permissionProfiles: any[];
  emptyPermissions: Record<string, Record<string, boolean>>;
  currentTheme: any;
  handleCreateProfessional: () => void;
  emptyProfessional: any;
  services: any[];
}

const STEPS = [
  { id: 1, label: "Dados",       icon: User },
  { id: 2, label: "Permissões",  icon: Shield },
  { id: 3, label: "Horários",    icon: Clock },
  { id: 4, label: "Serviços",    icon: Scissors },
  { id: 5, label: "Finalizar",   icon: Info },
];

export function ProfessionalModal({
  isProfessionalModalOpen,
  setIsProfessionalModalOpen,
  editingProfessional,
  setEditingProfessional,
  newProfessional,
  setNewProfessional,
  profPasswordVisible,
  setProfPasswordVisible,
  permissionProfiles,
  emptyPermissions,
  currentTheme,
  handleCreateProfessional,
  emptyProfessional,
  services,
}: ProfessionalModalProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Reset steps when opening for new professional
  useEffect(() => {
    if (isProfessionalModalOpen && !editingProfessional) {
      setCurrentStep(1);
    }
  }, [isProfessionalModalOpen, editingProfessional]);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const perms = newProfessional.permissions || emptyPermissions;
  const toggleAction = (mod: string, action: string) => setNewProfessional((p: any) => ({
    ...p, permissions: { ...p.permissions, [mod]: { ...p.permissions[mod], [action]: !p.permissions[mod]?.[action] } }
  }));

  const PERM_LIST = [
    { key: "dashboard", label: "Dashboard",       icon: "📊", groups: [] },
    { key: "agenda",    label: "Agenda",          icon: "📅", groups: [
      { label: "Criar", actions: ["criar"] },
      { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
      { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
    ]},
    { key: "comandas",  label: "Comandas",        icon: "🧾", groups: [
      { label: "Criar", actions: ["criar"] },
      { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
      { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
    ]},
    { key: "services",  label: "Serviços",        icon: "✂️",  groups: [] },
    { key: "clients",   label: "Clientes",        icon: "👤", groups: [
      { label: "Criar", actions: ["criar"] },
      { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
    ]},
    { key: "fluxo",     label: "Fluxo de Caixa", icon: "💰", groups: [] },
  ];

  const toggleWorkingDay = (index: number) => {
    setNewProfessional((p: any) => {
      const hours = [...p.workingHours];
      hours[index] = { ...hours[index], active: !hours[index].active };
      return { ...p, workingHours: hours };
    });
  };

  const updateWorkingTime = (index: number, field: string, value: string) => {
    setNewProfessional((p: any) => {
      const hours = [...p.workingHours];
      hours[index] = { ...hours[index], [field]: value };
      return { ...p, workingHours: hours };
    });
  };

  const replicateTimes = (index: number) => {
    const source = newProfessional.workingHours[index];
    setNewProfessional((p: any) => ({
      ...p,
      workingHours: p.workingHours.map((h: any) =>
        h.active ? { ...h, start: source.start, end: source.end, lunchStart: source.lunchStart, lunchEnd: source.lunchEnd, breakStart: source.breakStart, breakEnd: source.breakEnd } : h
      )
    }));
  };

  const toggleServiceAccess = (serviceId: string) => {
    setNewProfessional((p: any) => {
      const current = p.services || [];
      if (current.includes(serviceId)) {
        return { ...p, services: current.filter((id: string) => id !== serviceId) };
      } else {
        return { ...p, services: [...current, serviceId] };
      }
    });
  };

  const closeModal = () => { setIsProfessionalModalOpen(false); setEditingProfessional(null); };

  // ── Footer ──────────────────────────────────────────────────────────
  const footer = (
    <ModalFooter align="between">
      <Button
        variant="ghost"
        size="md"
        onClick={prevStep}
        iconLeft={<ChevronLeft size={14} />}
        className={cn(currentStep === 1 && "opacity-0 pointer-events-none")}
      >
        Voltar
      </Button>

      {currentStep < STEPS.length ? (
        <Button
          variant="primary"
          size="lg"
          onClick={nextStep}
          disabled={currentStep === 1 && !newProfessional.name}
          iconRight={<ChevronRight size={16} />}
          className="bg-zinc-900 hover:bg-black border-zinc-800 shadow-lg shadow-zinc-900/20"
        >
          Próximo
        </Button>
      ) : (
        <Button
          variant="success"
          size="lg"
          onClick={handleCreateProfessional}
          disabled={!newProfessional.name || (!editingProfessional && !newProfessional.password)}
          iconRight={<Check size={16} strokeWidth={3} />}
          className="shadow-lg shadow-emerald-500/20"
        >
          {editingProfessional ? "Salvar" : "Cadastrar"}
        </Button>
      )}
    </ModalFooter>
  );

  return (
    <Modal
      isOpen={isProfessionalModalOpen}
      onClose={closeModal}
      title={editingProfessional ? "Editar Profissional" : "Novo Profissional"}
      size="xl"
      mobileStyle="fullscreen"
      footer={footer}
    >
      {/* ── Step Indicator ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-0 justify-between mb-5 sm:mb-6 px-1">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const active = currentStep === step.id;
          const completed = currentStep > step.id;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => (completed || active) && setCurrentStep(step.id)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 transition-all",
                  (completed || active) ? "cursor-pointer" : "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                    active
                      ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/20 scale-105"
                      : completed
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
                        : "bg-zinc-100 text-zinc-300 border border-zinc-200"
                  )}
                >
                  {completed
                    ? <Check size={13} strokeWidth={3} />
                    : <Icon size={13} />
                  }
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-wide hidden sm:block",
                  active ? "text-zinc-900" : completed ? "text-emerald-600" : "text-zinc-300"
                )}>
                  {step.label}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-1.5 sm:mx-2 max-w-[40px] sm:max-w-none",
                  completed ? "bg-emerald-300" : "bg-zinc-100"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1 — Dados Gerais ──────────────────────────────────── */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Foto */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              {newProfessional.photo ? (
                <img src={newProfessional.photo} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-zinc-100 shadow-sm" />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-50 border-2 border-zinc-100 flex items-center justify-center text-zinc-300 text-2xl sm:text-3xl font-black">
                  ?
                </div>
              )}
              <label className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-zinc-900 text-white rounded-lg flex items-center justify-center cursor-pointer shadow-md transition-all hover:scale-110 active:scale-90">
                <Camera size={13} />
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) { const r = new FileReader(); r.onload = ev => setNewProfessional((p: any) => ({ ...p, photo: ev.target?.result as string })); r.readAsDataURL(file); }
                }} />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <Input
                label="Nome Completo *"
                placeholder="Ex: Karen Lais"
                value={newProfessional.name}
                onChange={e => setNewProfessional((p: any) => ({ ...p, name: e.target.value }))}
              />
            </div>
          </div>

          {/* Grid de campos */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="CPF"
              placeholder="000.000.000-00"
              value={newProfessional.cpf}
              onChange={e => setNewProfessional((p: any) => ({ ...p, cpf: maskCPF(e.target.value) }))}
            />

            <Select
              label="Gênero"
              value={newProfessional.gender}
              onChange={e => setNewProfessional((p: any) => ({ ...p, gender: e.target.value }))}
              options={[
                { value: "male", label: "Masculino" },
                { value: "female", label: "Feminino" },
                { value: "other", label: "Outro" },
              ]}
            />

            <Input
              label="Data de Nascimento"
              placeholder="DD/MM/AAAA"
              value={newProfessional.birthDate}
              onChange={e => setNewProfessional((p: any) => ({ ...p, birthDate: maskDate(e.target.value) }))}
            />

            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={newProfessional.phone}
              onChange={e => setNewProfessional((p: any) => ({ ...p, phone: maskPhone(e.target.value) }))}
            />

            <div className="col-span-2">
              <Input
                label="E-mail"
                type="email"
                placeholder="email@exemplo.com"
                value={newProfessional.email}
                onChange={e => setNewProfessional((p: any) => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <Input
                label="Instagram"
                placeholder="@perfil_do_profissional"
                value={newProfessional.instagram}
                onChange={e => setNewProfessional((p: any) => ({ ...p, instagram: e.target.value }))}
              />
            </div>
          </div>

          {/* Card Segurança */}
          <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-white shrink-0">
                <Shield size={14} />
              </div>
              <div>
                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Segurança</h4>
                <p className="text-[10px] text-zinc-400 font-medium">Cargo e credenciais</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Cargo / Especialidade"
                placeholder="Ex: Barbeiro Master"
                value={newProfessional.role}
                onChange={e => setNewProfessional((p: any) => ({ ...p, role: e.target.value }))}
              />

              <div className="flex flex-col gap-1.5">
                <label className="ds-label">
                  {editingProfessional ? "Alterar Senha" : "Senha *"}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={profPasswordVisible ? "text" : "password"}
                    className="ds-input pr-9"
                    placeholder="Mín. 4 caracteres"
                    value={newProfessional.password}
                    onChange={e => setNewProfessional((p: any) => ({ ...p, password: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-3 text-zinc-400 hover:text-zinc-700 transition-colors"
                    onClick={() => setProfPasswordVisible((v: boolean) => !v)}
                  >
                    {profPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 — Permissões ───────────────────────────────────── */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Nível de acesso */}
          <div className="space-y-3">
            <p className="ds-label">Nível de Acesso</p>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { id: "no-access", label: "Sem Acesso", desc: "Apenas agendável", icon: "🚫" },
                { id: "custom", label: "Personalizado", desc: "Regras do gestor", icon: "⚙️" },
                { id: "full", label: "Acesso Total", desc: "Administrador", icon: "👑" },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNewProfessional((p: any) => ({ ...p, accessLevel: opt.id }))}
                  className={cn(
                    "p-3 sm:p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden",
                    newProfessional.accessLevel === opt.id
                      ? "bg-white border-zinc-900 shadow-md ring-2 ring-zinc-100"
                      : "bg-zinc-50/50 border-zinc-100 hover:border-zinc-200"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">{opt.icon}</span>
                    {newProfessional.accessLevel === opt.id && (
                      <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={4} />
                      </div>
                    )}
                  </div>
                  <p className={cn("text-[10px] sm:text-xs font-black uppercase tracking-tight", newProfessional.accessLevel === opt.id ? "text-zinc-900" : "text-zinc-500")}>{opt.label}</p>
                  <p className="text-[9px] text-zinc-400 font-medium mt-0.5 leading-tight hidden sm:block">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles PAT & Fotos */}
          <div className="bg-zinc-50 rounded-2xl border border-zinc-100 divide-y divide-zinc-100">
            <div className="flex items-center justify-between p-3.5 sm:p-4">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-black text-zinc-900 truncate">App de Atendimento (PAT)</p>
                <p className="text-[10px] text-zinc-400 font-medium truncate">Lançar serviços via celular</p>
              </div>
              <Switch
                checked={newProfessional.patAccess}
                onCheckedChange={(v) => setNewProfessional((p: any) => ({ ...p, patAccess: v }))}
              />
            </div>
            <div className="flex items-center justify-between p-3.5 sm:p-4">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-black text-zinc-900 truncate">Fotos do Portfólio</p>
                <p className="text-[10px] text-zinc-400 font-medium truncate">Antes e depois dos serviços</p>
              </div>
              <Switch
                checked={newProfessional.canAddServicePhotos}
                onCheckedChange={(v) => setNewProfessional((p: any) => ({ ...p, canAddServicePhotos: v }))}
              />
            </div>
          </div>

          {/* Permissões granulares */}
          {newProfessional.accessLevel === "custom" && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">Permissões Granulares</p>
                {permissionProfiles.length > 0 && (
                  <Select
                    wrapperClassName="w-auto"
                    className="text-[10px] !h-8 !min-h-0 !px-2 !py-0 !rounded-lg"
                    placeholder="Usar Perfil..."
                    options={permissionProfiles.map((p: any) => ({ value: p.id, label: p.name }))}
                    onChange={e => {
                      const profile = permissionProfiles.find((p: any) => p.id === e.target.value);
                      if (profile) setNewProfessional((p: any) => ({ ...p, permissions: { ...profile.permissions } }));
                    }}
                  />
                )}
              </div>

              <div className="space-y-2">
                {PERM_LIST.map(({ key, label, icon, groups }) => {
                  const modPerms = perms[key] || {};
                  return (
                    <div key={key} className={cn(
                      "rounded-xl border transition-all overflow-hidden",
                      modPerms.ver ? "bg-white border-zinc-200" : "bg-zinc-50/50 border-zinc-100 opacity-60"
                    )}>
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{icon}</span>
                          <p className="text-[11px] font-black text-zinc-900">{label}</p>
                        </div>
                        <Switch
                          checked={!!modPerms.ver}
                          onCheckedChange={() => toggleAction(key, "ver")}
                        />
                      </div>
                      {modPerms.ver && groups.length > 0 && (
                        <div className="px-3.5 pb-3 pt-0 space-y-2 border-t border-zinc-50">
                          {groups.map((group: any) => (
                            <div key={group.label} className="space-y-1">
                              <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.15em] pt-1">{group.label}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {group.actions.map((action: string, ai: number) => {
                                  const chipLabel = group.labels ? group.labels[ai] : group.label;
                                  const on = !!modPerms[action];
                                  return (
                                    <button key={action} type="button" onClick={() => toggleAction(key, action)}
                                      className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                        on ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                                      )}
                                    >
                                      {on && <Check size={10} className="text-emerald-400" strokeWidth={4} />}
                                      {chipLabel}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3 — Horários ─────────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {newProfessional.workingHours.map((hour: any, idx: number) => (
            <div
              key={hour.day}
              className={cn(
                "flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all",
                hour.active
                  ? "bg-white border-zinc-200 shadow-sm"
                  : "bg-zinc-50/50 border-zinc-100 opacity-50"
              )}
            >
              {/* Toggle dia */}
              <button
                type="button"
                onClick={() => toggleWorkingDay(idx)}
                className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all",
                  hour.active ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 hover:border-zinc-400"
                )}
              >
                {hour.active && <Check size={12} strokeWidth={4} />}
              </button>

              {/* Dia */}
              <p className="text-[11px] font-black text-zinc-900 capitalize w-16 sm:w-20 truncate shrink-0">
                {hour.day.replace("-feira", "")}
              </p>

              {/* Inputs de hora */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <Clock size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="time"
                    disabled={!hour.active}
                    className="ds-input !h-8 !text-[11px] !pl-6 !pr-1.5 !rounded-lg !min-h-0"
                    value={hour.start}
                    onChange={e => updateWorkingTime(idx, "start", e.target.value)}
                  />
                </div>
                <span className="text-zinc-300 text-[10px] font-bold shrink-0">—</span>
                <div className="relative flex-1 min-w-0">
                  <Clock size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="time"
                    disabled={!hour.active}
                    className="ds-input !h-8 !text-[11px] !pl-6 !pr-1.5 !rounded-lg !min-h-0"
                    value={hour.end}
                    onChange={e => updateWorkingTime(idx, "end", e.target.value)}
                  />
                </div>
              </div>

              {/* Replicar */}
              <button
                type="button"
                disabled={!hour.active}
                onClick={() => replicateTimes(idx)}
                title="Replicar horários para todos os dias ativos"
                className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all disabled:opacity-0 active:scale-90 shrink-0"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Step 4 — Serviços ─────────────────────────────────────── */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Habilidades</h4>
              <p className="text-[10px] text-zinc-400 font-medium truncate">Serviços que este profissional realiza</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button variant="outline" size="xs" onClick={() => setNewProfessional((p: any) => ({ ...p, services: services.map(s => s.id) }))}>
                Todos
              </Button>
              <Button variant="outline" size="xs" onClick={() => setNewProfessional((p: any) => ({ ...p, services: [] }))}>
                Nenhum
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {services.map((service: any) => {
              const isSelected = (newProfessional.services || []).includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleServiceAccess(service.id)}
                  className={cn(
                    "flex items-center justify-between p-3 sm:p-3.5 rounded-xl border-2 transition-all text-left",
                    isSelected
                      ? "bg-white border-zinc-900 shadow-sm"
                      : "bg-zinc-50 border-zinc-100 hover:border-zinc-200"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <p className={cn("text-[11px] font-black uppercase tracking-tight truncate", isSelected ? "text-zinc-900" : "text-zinc-500")}>{service.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-zinc-400 font-bold">{service.duration}m</span>
                      <span className="text-[9px] text-emerald-500 font-black">R$ {service.price}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all shrink-0",
                    isSelected ? "bg-zinc-900 border-zinc-900 text-emerald-400" : "border-zinc-200 bg-white"
                  )}>
                    <Check size={13} strokeWidth={4} className={cn("transition-all", isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50")} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 5 — Finalizar ────────────────────────────────────── */}
      {currentStep === 5 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Textarea
            label="Bio / Portfólio"
            placeholder="Descreva as habilidades, cursos e diferenciais deste profissional..."
            className="min-h-[100px] sm:min-h-[130px]"
            value={newProfessional.bio}
            onChange={e => setNewProfessional((p: any) => ({ ...p, bio: e.target.value }))}
          />

          <div className="p-5 bg-zinc-900 rounded-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <User size={80} />
            </div>
            <div className="relative z-10 flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 shrink-0">
                <Info size={18} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight uppercase">Confirmação Final</p>
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mt-1">
                  Ao finalizar, o profissional terá um perfil exclusivo e as agendas estarão prontas para receber agendamentos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
