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
              {mods.map((mod) => {
                const modPerms = perms[mod.key] || {};
                const isVisible = !!modPerms.ver;
                const isExpanded = expandedModules.has(mod.key);
                const subActions = mod.actions.filter((a) => a !== "ver");
                const hasSubActions = subActions.length > 0;

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
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <p className="text-xs font-black text-zinc-800 truncate">{mod.label}</p>
                        {isVisible && hasSubActions && (
                          <Badge color="primary" size="sm">
                            {Object.entries(modPerms).filter(([k, v]) => k !== "ver" && v).length} ações
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Expandir sub-ações */}
                        {isVisible && hasSubActions && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(mod.key)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
                          >
                            <ChevronDown
                              size={14}
                              className={cn("transition-transform", isExpanded && "rotate-180")}
                            />
                          </button>
                        )}

                        {/* Toggle de visibilidade */}
                        <button
                          type="button"
                          onClick={() => toggle(mod.key, "ver")}
                          aria-label={isVisible ? "Desativar acesso" : "Ativar acesso"}
                          className="relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1"
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

                    {/* Sub-ações expandidas */}
                    {isVisible && hasSubActions && isExpanded && (
                      <div className="border-t border-zinc-100 px-4 pb-3 pt-3 space-y-3">
                        {/* Ações sem divisão próprio/todos */}
                        {mod.splitActions ? (
                          <>
                            {/* Criar */}
                            {mod.actions.includes("criar") && (
                              <ActionChipRow
                                label="Criar"
                                chips={[{ action: "criar", label: "Criar" }]}
                                modPerms={modPerms}
                                onToggle={(a) => toggle(mod.key, a)}
                                themeColor={themeColor}
                              />
                            )}
                            {/* Editar — próprio / todos */}
                            {mod.splitActions.filter((s) => s.action === "editar").map((split) => (
                              <ActionChipRow
                                key="editar"
                                label="Editar"
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
                                label="Excluir"
                                chips={[
                                  { action: split.own, label: "Próprios" },
                                  { action: split.all, label: "Todos" },
                                ]}
                                modPerms={modPerms}
                                onToggle={(a) => toggle(mod.key, a)}
                                themeColor={themeColor}
                              />
                            ))}
                            {/* Demais ações (exportar, financeiro...) */}
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
                          </>
                        ) : (
                          // Sem divisão — exibe todos como chips individuais
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
