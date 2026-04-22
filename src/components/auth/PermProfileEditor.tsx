import React, { useState } from "react";
import { cn } from "@/src/lib/utils";
import { ShieldCheck, ChevronDown } from "lucide-react";
import {
  MODULE_META,
  DEFAULT_ROLE_PROFILES,
  emptyPermissions,
  type PermissionSet,
  type Module,
  type Action,
  type RoleProfile,
} from "@/src/lib/permissions";
import { Modal, ModalFooter } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { Input } from "@/src/components/ui/Input";
import { Badge } from "@/src/components/ui/Badge";

// ─────────────────────────────────────────────────────────────────────────────
// PermProfileEditor — Editor completo de perfil de permissões
//
// Reutilizável: usa-se dentro de qualquer modal ou página
// ─────────────────────────────────────────────────────────────────────────────

interface PermProfileEditorProps {
  value: { name: string; permissions: PermissionSet };
  onChange: (v: { name: string; permissions: PermissionSet }) => void;
  /** Cor do tema atual (hex) — usada nos toggles ativos */
  themeColor?: string;
  /** Exibir campo de nome */
  showNameField?: boolean;
}

const GROUP_LABELS: Record<string, string> = {
  principal:  "Principal",
  operacional: "Operacional",
  sistema:    "Sistema",
  admin:      "Administração",
};

export function PermProfileEditor({
  value,
  onChange,
  themeColor = "#f59e0b",
  showNameField = true,
}: PermProfileEditorProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const perms = value.permissions || emptyPermissions();

  const toggle = (mod: Module, action: Action) => {
    const current = !!perms[mod]?.[action];
    const updated: PermissionSet = {
      ...perms,
      [mod]: { ...perms[mod], [action]: !current },
    };
    // Se desativar "ver", desativa tudo do módulo
    if (action === "ver" && current) {
      updated[mod] = {};
    }
    onChange({ ...value, permissions: updated });
  };

  const toggleExpand = (mod: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod);
      else next.add(mod);
      return next;
    });
  };

  // Agrupar módulos por grupo
  const groups = MODULE_META.reduce<Record<string, typeof MODULE_META>>((acc, mod) => {
    (acc[mod.group] ??= []).push(mod);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Nome do perfil */}
      {showNameField && (
        <Input
          label="Nome do Perfil"
          placeholder="Ex: Barbeiro, Recepcionista..."
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      )}

      {/* Módulos por grupo */}
      <div className="space-y-4">
        {Object.entries(groups).map(([group, mods]) => (
          <div key={group}>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 px-1">
              {GROUP_LABELS[group] ?? group}
            </p>

            <div className="space-y-2">
              {mods.filter(m => !m.parent).map((mod) => {
                const modPerms = perms[mod.key] || {};
                const isVisible = !!modPerms.ver;
                const isExpanded = expandedModules.has(mod.key);
                const subActions = mod.actions.filter((a) => a !== "ver");
                const children = mods.filter(c => c.parent === mod.key);
                const hasExpandableContent = subActions.length > 0 || children.length > 0;

                // Aux: verifica se TUDO está selecionado no módulo (incluindo submenus)
                const allSelected = isVisible && 
                  subActions.every(a => !!modPerms[a]) &&
                  children.every(c => !!perms[c.key]?.ver && c.actions.every(a => !!perms[c.key]?.[a]));

                const toggleAll = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const updated: PermissionSet = { ...perms };
                  if (allSelected) {
                    // Desativa tudo exceto "ver" (ou desativa tudo se preferir)
                    updated[mod.key] = { ver: true };
                    children.forEach(c => { updated[c.key] = {}; });
                  } else {
                    // Ativa tudo
                    const fullMod: any = {};
                    mod.actions.forEach(a => fullMod[a] = true);
                    updated[mod.key] = fullMod;
                    children.forEach(c => {
                      const fullChild: any = {};
                      c.actions.forEach(a => fullChild[a] = true);
                      updated[c.key] = fullChild;
                    });
                  }
                  onChange({ ...value, permissions: updated });
                };

                return (
                  <div
                    key={mod.key}
                    className={cn(
                      "rounded-2xl border transition-all overflow-hidden",
                      isVisible
                        ? "border-zinc-200 bg-white shadow-sm"
                        : "border-zinc-100 bg-zinc-50/60"
                    )}
                  >
                    {/* Row principal — toggle "ver" */}
                    <div 
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50/50 transition-colors"
                      onClick={() => toggleExpand(mod.key)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-1.5 h-6 rounded-full transition-colors",
                          isVisible ? "bg-amber-400" : "bg-zinc-200"
                        )} />
                        <div>
                          <p className="text-[13px] font-bold text-zinc-800 truncate">{mod.label}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isVisible && (
                              <Badge color="success" size="sm" className="px-1 py-0 h-4 text-[9px]">Ativo</Badge>
                            )}
                            {isVisible && subActions.length > 0 && (
                              <span className="text-[9px] font-medium text-zinc-400">
                                {Object.entries(modPerms).filter(([k, v]) => k !== "ver" && v).length}/{subActions.length} ações
                              </span>
                            )}
                            {isVisible && children.length > 0 && (
                              <span className="text-[9px] font-medium text-zinc-400">
                                • {children.filter(c => !!perms[c.key]?.ver).length}/{children.length} submenus
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Botão Selecionar Tudo */}
                        {isVisible && (hasExpandableContent) && (
                          <button
                            type="button"
                            onClick={toggleAll}
                            className={cn(
                              "text-[10px] font-black uppercase tracking-tight px-2 py-1 rounded-lg transition-all",
                              allSelected 
                                ? "text-amber-600 bg-amber-50" 
                                : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                            )}
                          >
                            {allSelected ? "Tudo Ativo" : "Ativar Tudo"}
                          </button>
                        )}

                        <div className="w-[1px] h-4 bg-zinc-100 mx-1" />

                        {/* Toggle de visibilidade */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggle(mod.key, "ver"); }}
                          aria-label={isVisible ? "Desativar acesso" : "Ativar acesso"}
                          className="relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 focus:outline-none"
                          style={{
                            background: isVisible ? themeColor : "#e4e4e7",
                          }}
                        >
                          <span
                            className="absolute top-[3px] h-[14px] w-[14px] bg-white rounded-full shadow transition-all duration-200"
                            style={{ left: isVisible ? "1.35rem" : "0.15rem" }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Conteúdo expandido */}
                    {isVisible && hasExpandableContent && isExpanded && (
                      <div className="bg-zinc-50/30 border-t border-zinc-100 px-4 pb-4 pt-4 space-y-5">
                        
                        {/* Ações do Módulo Pai */}
                        {subActions.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <div className="h-[1px] flex-1 bg-zinc-200/50" />
                              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ações de {mod.label}</span>
                              <div className="h-[1px] flex-1 bg-zinc-200/50" />
                            </div>

                            <div className="space-y-4">
                              {mod.splitActions ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Criar */}
                                  {mod.actions.includes("criar") && (
                                    <ActionChipRow
                                      label="Criação"
                                      chips={[{ action: "criar", label: "Pode Criar" }]}
                                      modPerms={modPerms}
                                      onToggle={(a) => toggle(mod.key, a)}
                                      themeColor={themeColor}
                                    />
                                  )}
                                  {/* Editar — próprio / todos */}
                                  {mod.splitActions.filter((s) => s.action === "editar").map((split) => (
                                    <ActionChipRow
                                      key="editar"
                                      label="Edição"
                                      chips={[
                                        { action: split.own, label: "Próprios" },
                                        { action: split.all, label: "Todos" },
                                      ]}
                                      modPerms={modPerms}
                                      onToggle={(a) => toggle(mod.key, a)}
                                      themeColor={themeColor}
                                    />
                                  ))}
                                  {/* Excluir — próprio / todos */}
                                  {mod.splitActions.filter((s) => s.action === "excluir").map((split) => (
                                    <ActionChipRow
                                      key="excluir"
                                      label="Exclusão"
                                      chips={[
                                        { action: split.own, label: "Próprios" },
                                        { action: split.all, label: "Todos" },
                                      ]}
                                      modPerms={modPerms}
                                      onToggle={(a) => toggle(mod.key, a)}
                                      themeColor={themeColor}
                                    />
                                  ))}
                                  {/* Demais ações */}
                                  {subActions
                                    .filter(
                                      (a) =>
                                        !["criar", "editar_proprio", "editar_todos", "excluir_proprio", "excluir_todos"].includes(a)
                                    )
                                    .map((action) => (
                                      <ActionChipRow
                                        key={action}
                                        label={ACTION_LABELS[action] ?? action}
                                        chips={[{ action, label: ACTION_LABELS[action] ?? action }]}
                                        modPerms={modPerms}
                                        onToggle={(a) => toggle(mod.key, a)}
                                        themeColor={themeColor}
                                      />
                                    ))}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {subActions.map((action) => {
                                    const active = !!modPerms[action];
                                    return (
                                      <ActionChip
                                        key={action}
                                        label={ACTION_LABELS[action] ?? action}
                                        active={active}
                                        onToggle={() => toggle(mod.key, action)}
                                        themeColor={themeColor}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Submódulos */}
                        {children.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <div className="h-[1px] flex-1 bg-zinc-200/50" />
                              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Submenus de {mod.label}</span>
                              <div className="h-[1px] flex-1 bg-zinc-200/50" />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                              {children.map(child => {
                                const childPerms = perms[child.key] || {};
                                const isChildVisible = !!childPerms.ver;
                                const childSubActions = child.actions.filter(a => a !== "ver");
                                
                                return (
                                  <div 
                                    key={child.key} 
                                    className={cn(
                                      "p-4 rounded-2xl border transition-all", 
                                      isChildVisible 
                                        ? "bg-white border-zinc-200 shadow-sm" 
                                        : "bg-zinc-100/50 border-zinc-100 opacity-60"
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={cn(
                                          "w-1 h-3 rounded-full",
                                          isChildVisible ? "bg-amber-500" : "bg-zinc-300"
                                        )} />
                                        <span className="text-[11px] font-black text-zinc-700 uppercase tracking-tight">{child.label}</span>
                                      </div>
                                      
                                      <button
                                        type="button"
                                        onClick={() => toggle(child.key, "ver")}
                                        className="relative w-9 h-4.5 rounded-full transition-colors duration-200 shrink-0 focus:outline-none"
                                        style={{ background: isChildVisible ? themeColor : "#d1d5db" }}
                                      >
                                        <span
                                          className="absolute top-[2.5px] h-3.5 w-3.5 bg-white rounded-full shadow transition-all duration-200"
                                          style={{ left: isChildVisible ? "1.2rem" : "0.15rem" }}
                                        />
                                      </button>
                                    </div>
                                    
                                    {isChildVisible && childSubActions.length > 0 && (
                                      <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-zinc-50">
                                        {childSubActions.map(action => (
                                          <ActionChip
                                            key={action}
                                            label={ACTION_LABELS[action] ?? action}
                                            active={!!childPerms[action]}
                                            onToggle={() => toggle(child.key, action)}
                                            themeColor={themeColor}
                                          />
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
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Labels para ações ────────────────────────────────────────────────────────
const ACTION_LABELS: Partial<Record<Action, string>> = {
  criar:           "Criar",
  editar_proprio:  "Próprios",
  editar_todos:    "Todos",
  excluir_proprio: "Próprios",
  excluir_todos:   "Todos",
  exportar:        "Exportar",
  financeiro:      "Ver valores",
};

// ── Chip de ação ─────────────────────────────────────────────────────────────
interface ChipItem { action: Action; label: string }

function ActionChipRow({
  label,
  chips,
  modPerms,
  onToggle,
  themeColor,
}: {
  label: string;
  chips: ChipItem[];
  modPerms: Partial<Record<Action, boolean>>;
  onToggle: (action: Action) => void;
  themeColor: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(({ action, label: chipLabel }) => (
          <ActionChip
            key={action}
            label={chipLabel}
            active={!!modPerms[action]}
            onToggle={() => onToggle(action)}
            themeColor={themeColor}
          />
        ))}
      </div>
    </div>
  );
}

function ActionChip({
  label,
  active,
  onToggle,
  themeColor,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  themeColor: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all focus:outline-none"
      style={
        active
          ? { background: `${themeColor}15`, color: themeColor, borderColor: `${themeColor}40` }
          : { background: "#f4f4f5", color: "#71717a", borderColor: "#e4e4e7" }
      }
    >
      <span
        className="w-1.5 h-1.5 rounded-full transition-colors"
        style={{ background: active ? themeColor : "#d4d4d8" }}
      />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PermProfileModal — Modal de criar/editar perfil
// ─────────────────────────────────────────────────────────────────────────────

interface PermProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProfile: RoleProfile | null;
  onSave: (profile: RoleProfile) => void;
  themeColor?: string;
}

export function PermProfileModal({
  isOpen,
  onClose,
  editingProfile,
  onSave,
  themeColor = "#f59e0b",
}: PermProfileModalProps) {
  const [draft, setDraft] = useState<{ name: string; permissions: PermissionSet }>(() =>
    editingProfile
      ? { name: editingProfile.label, permissions: editingProfile.permissions }
      : { name: "", permissions: emptyPermissions() }
  );

  React.useEffect(() => {
    if (isOpen) {
      setDraft(
        editingProfile
          ? { name: editingProfile.label, permissions: editingProfile.permissions }
          : { name: "", permissions: emptyPermissions() }
      );
    }
  }, [isOpen, editingProfile]);

  const handleSave = () => {
    if (!draft.name.trim()) return;
    onSave({
      id: editingProfile?.id ?? (Date.now().toString() as any),
      label: draft.name.trim(),
      description: "",
      isSystem: false,
      permissions: draft.permissions,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProfile ? "Editar Perfil" : "Novo Perfil de Permissão"}
      size="md"
      mobileStyle="bottom-sheet"
      footer={
        <ModalFooter>
          <Button variant="outline" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!draft.name.trim()}
            fullWidth
          >
            {editingProfile ? "Salvar Alterações" : "Criar Perfil"}
          </Button>
        </ModalFooter>
      }
    >
      <PermProfileEditor
        value={draft}
        onChange={setDraft}
        themeColor={themeColor}
      />
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PermProfileCard — Card de exibição de perfil na tela de permissões
// ─────────────────────────────────────────────────────────────────────────────

interface PermProfileCardProps {
  profile: RoleProfile;
  onEdit?: () => void;
  onDelete?: () => void;
  onApply?: () => void;
  isActive?: boolean;
}

export function PermProfileCard({
  profile,
  onEdit,
  onDelete,
  onApply,
  isActive,
}: PermProfileCardProps) {
  const moduleCount = Object.entries(profile.permissions).filter(([, v]) =>
    Object.values(v as Record<string, boolean>).some(Boolean)
  ).length;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border p-4 transition-all",
        "bg-white shadow-sm",
        isActive ? "border-amber-300 ring-1 ring-amber-200" : "border-zinc-200 hover:border-zinc-300"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
            <ShieldCheck size={16} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-900 truncate">{profile.label}</p>
            {profile.isSystem && (
              <Badge color="default" size="sm">padrão</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Descrição */}
      {profile.description && (
        <p className="text-xs text-zinc-500 leading-relaxed">{profile.description}</p>
      )}

      {/* Módulos ativos */}
      <p className="text-[10px] font-bold text-zinc-400">
        {moduleCount} {moduleCount === 1 ? "módulo" : "módulos"} com acesso
      </p>

      {/* Ações */}
      <div className="flex items-center gap-2 pt-1 border-t border-zinc-100">
        {onApply && (
          <Button variant="primary" size="sm" onClick={onApply} fullWidth>
            Aplicar
          </Button>
        )}
        {!profile.isSystem && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Editar
          </Button>
        )}
        {!profile.isSystem && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:bg-red-50">
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
