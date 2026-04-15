import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal, ModalFooter } from "@/src/components/ui/Modal";
import { Input } from "@/src/components/ui/Input";
import { Switch } from "@/src/components/ui/Switch";

interface PermProfileModalProps {
  isPermProfileModalOpen: boolean;
  setIsPermProfileModalOpen: (v: boolean) => void;
  editingPermProfile: any;
  newPermProfile: any;
  setNewPermProfile: (v: any) => void;
  permissionProfiles: any[];
  savePermProfiles: (profiles: any[]) => void;
  emptyPermissions: Record<string, Record<string, boolean>>;
  currentTheme: any;
}

const PERM_LIST = [
  { key: "dashboard", label: "Dashboard",       icon: "📊", groups: [
    { label: "Relatórios", actions: ["ver_financeiro", "ver_operacional"], labels: ["Financeiro", "Operacional"] }
  ]},
  { key: "agenda",    label: "Agenda",          icon: "📅", groups: [
    { label: "Criar",   actions: ["criar"] },
    { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
    { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
    { label: "Ações",   actions: ["cancelar", "finalizar"], labels: ["Cancelar Agendamentos", "Finalizar Agendamentos"] }
  ]},
  { key: "comandas",  label: "Comandas",        icon: "🧾", groups: [
    { label: "Criar",   actions: ["criar"] },
    { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
    { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
    { label: "Ações",   actions: ["receber_pagamento", "estornar"], labels: ["Receber Pagamento", "Estornar Pagamento"] }
  ]},
  { key: "financeiro", label: "Financeiro / Caixa", icon: "💰", groups: [
    { label: "Lançamentos", actions: ["add_receita", "add_despesa"], labels: ["Nova Receita", "Nova Despesa"] },
    { label: "Gerenciar", actions: ["editar", "excluir"], labels: ["Editar", "Excluir"] },
    { label: "Caixa",    actions: ["fechar_caixa"], labels: ["Fechar Caixa"] }
  ]},
  { key: "clients",   label: "Clientes",        icon: "👤", groups: [
    { label: "Criar",   actions: ["criar"] },
    { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
    { label: "Ações",   actions: ["ver_historico"], labels: ["Ver Histórico Completo"] }
  ]},
  { key: "services",  label: "Serviços",        icon: "✂️",  groups: [
    { label: "Gerenciar", actions: ["criar", "editar", "excluir"], labels: ["Criar", "Editar", "Excluir"] },
    { label: "Estrutura", actions: ["gerenciar_categorias"], labels: ["Categorias"] }
  ]},
  { key: "pacotes",  label: "Pacotes",        icon: "📦",  groups: [
    { label: "Gerenciar", actions: ["criar", "editar", "excluir"], labels: ["Criar", "Editar", "Excluir"] }
  ]},
  { key: "produtos",  label: "Produtos & Estoque", icon: "🧴", groups: [
    { label: "Gerenciar", actions: ["criar", "editar", "excluir"], labels: ["Cadastrar", "Editar", "Excluir"] },
    { label: "Estoque", actions: ["ajustar_estoque"], labels: ["Ajustar Estoque Manualmente"] }
  ]},
  { key: "profissionais", label: "Profissionais", icon: "👥", groups: [
    { label: "Gerenciar", actions: ["criar", "editar", "excluir"], labels: ["Cadastrar", "Editar", "Excluir"] },
    { label: "Segurança", actions: ["gerenciar_permissoes"], labels: ["Alterar Permissões"] }
  ]},
  { key: "sistema",   label: "Configurações",    icon: "⚙️", groups: [
    { label: "Ações",   actions: ["editar_configuracoes"], labels: ["Alterar Configurações Gerais"] }
  ]}
];

export function PermProfileModal({
  isPermProfileModalOpen,
  setIsPermProfileModalOpen,
  editingPermProfile,
  newPermProfile,
  setNewPermProfile,
  permissionProfiles,
  savePermProfiles,
  emptyPermissions,
}: PermProfileModalProps) {
  const perms = newPermProfile.permissions || emptyPermissions;

  const toggleP = (mod: string, action: string) =>
    setNewPermProfile((p: any) => ({
      ...p,
      permissions: {
        ...p.permissions,
        [mod]: {
          ...p.permissions[mod],
          [action]: !p.permissions[mod]?.[action],
        },
      },
    }));

  const handleSave = () => {
    if (!newPermProfile.name) return;
    if (editingPermProfile) {
      savePermProfiles(
        permissionProfiles.map((p: any) =>
          p.id === editingPermProfile.id ? { ...p, ...newPermProfile } : p
        )
      );
    } else {
      savePermProfiles([
        ...permissionProfiles,
        { ...newPermProfile, id: Date.now().toString() },
      ]);
    }
    setIsPermProfileModalOpen(false);
  };

  const footer = (
    <ModalFooter>
      <Button
        variant="outline"
        size="md"
        onClick={() => setIsPermProfileModalOpen(false)}
        className="w-full sm:w-auto"
      >
        Cancelar
      </Button>
      <Button
        variant="primary"
        size="lg"
        onClick={handleSave}
        disabled={!newPermProfile.name}
        className="w-full sm:w-auto"
      >
        {editingPermProfile ? "Salvar Alterações" : "Criar Perfil"}
      </Button>
    </ModalFooter>
  );

  return (
    <Modal
      isOpen={isPermProfileModalOpen}
      onClose={() => setIsPermProfileModalOpen(false)}
      title={editingPermProfile ? "Editar Perfil" : "Novo Perfil de Permissão"}
      size="md"
      mobileStyle="bottom-sheet"
      footer={footer}
    >
      <div className="space-y-5">
        {/* Nome do perfil */}
        <Input
          label="Nome do Perfil *"
          placeholder="Ex: Barbeiro Completo, Recepcionista..."
          value={newPermProfile.name}
          onChange={e =>
            setNewPermProfile((p: any) => ({ ...p, name: e.target.value }))
          }
        />

        {/* Lista de permissões */}
        <div className="space-y-2">
          <p className="ds-label">Permissões</p>
          <div className="space-y-2">
            {PERM_LIST.map(({ key, label, icon, groups }) => {
              const modPerms = perms[key] || {};
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    modPerms.ver
                      ? "border-zinc-200 bg-white shadow-sm"
                      : "border-zinc-100 bg-zinc-50/50 opacity-60"
                  )}
                >
                  {/* Header do módulo */}
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{icon}</span>
                      <p className="text-[11px] font-black text-zinc-900">
                        {label}
                      </p>
                    </div>
                    <Switch
                      checked={!!modPerms.ver}
                      onCheckedChange={() => toggleP(key, "ver")}
                    />
                  </div>

                  {/* Ações granulares */}
                  {modPerms.ver && groups.length > 0 && (
                    <div className="border-t border-zinc-50 px-3.5 pb-3 pt-2 space-y-2">
                      {groups.map((group: any) => (
                        <div key={group.label} className="space-y-1">
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.15em] pt-0.5">
                            {group.label}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.actions.map(
                              (action: string, ai: number) => {
                                const chipLabel = group.labels
                                  ? group.labels[ai]
                                  : group.label;
                                const on = !!modPerms[action];
                                return (
                                  <button
                                    key={action}
                                    type="button"
                                    onClick={() => toggleP(key, action)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                      on
                                        ? "bg-zinc-900 text-white border-zinc-900"
                                        : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                                    )}
                                  >
                                    {on && (
                                      <Check
                                        size={10}
                                        className="text-emerald-400"
                                        strokeWidth={4}
                                      />
                                    )}
                                    {chipLabel}
                                  </button>
                                );
                              }
                            )}
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
      </div>
    </Modal>
  );
}
