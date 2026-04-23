import React from "react";
import { Plus, UserCog, Trash2, Phone, Mail, Shield, Pencil, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button, IconButton } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { EmptyState } from "@/src/components/ui/EmptyState";

// ── Labels de módulos e ações ────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard", agenda: "Agenda", comandas: "Comandas",
  services: "Serviços", clients: "Clientes", fluxo: "Fluxo de Caixa",
};
const ACTION_LABELS: Record<string, string> = {
  ver: "Ver", criar: "Criar",
  editar: "Editar", excluir: "Excluir",
  editar_proprio: "Editar próprios", editar_todos: "Editar todos",
  excluir_proprio: "Excluir próprios", excluir_todos: "Excluir todos",
};

// ── Grupos de ações por módulo (para exibição nos perfis) ────
const MODULE_GROUPS: Record<string, { label: string; actions: string[]; labels?: string[] }[]> = {
  dashboard: [],
  agenda: [
    { label: "Criar",   actions: ["criar"] },
    { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
    { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
  ],
  comandas: [
    { label: "Criar",   actions: ["criar"] },
    { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
    { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
  ],
  services: [],
  clients: [
    { label: "Criar",  actions: ["criar"] },
    { label: "Editar", actions: ["editar_proprio", "editar_todos"], labels: ["Próprios", "Todos"] },
  ],
  fluxo: [],
};

// ── Parse de permissões (suporte ao formato legado) ──────────
function parsePerms(raw: any): Record<string, Record<string, boolean>> {
  if (!raw) return {};
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    const result: Record<string, Record<string, boolean>> = {};
    for (const [mod, val] of Object.entries(p)) {
      if (typeof val === "boolean") result[mod] = { ver: val as boolean };
      else if (typeof val === "object" && val !== null) result[mod] = val as Record<string, boolean>;
    }
    return result;
  } catch { return {}; }
}

// ── Resumo de permissões no card de perfil ───────────────────
function ProfileSummary({ perms }: { perms: Record<string, Record<string, boolean>> }) {
  const modules = Object.entries(perms).filter(([, actions]) => Object.values(actions).some(Boolean));
  if (modules.length === 0) return <p className="text-[9px] text-zinc-400 italic">Sem permissões definidas</p>;
  return (
    <div className="space-y-0.5">
      {modules.map(([mod, actions]) => {
        const active = Object.entries(actions).filter(([, v]) => v).map(([a]) => ACTION_LABELS[a] || a);
        return (
          <p key={mod} className="text-[9px] text-zinc-500 leading-relaxed">
            <span className="font-black text-zinc-700">{MODULE_LABELS[mod] || mod}:</span>{" "}
            {active.join(", ")}
          </p>
        );
      })}
    </div>
  );
}

// ── Aba de Permissões (inline, sem modal) ────────────────────
interface PermissionsPageProps {
  permissionProfiles: any[];
  onOpenPermProfileModal: () => void;
  onEditPermProfile: (p: any) => void;
  onDeletePermProfile: (id: string) => void;
}

function PermissionsPage({ permissionProfiles, onOpenPermProfileModal, onEditPermProfile, onDeletePermProfile }: PermissionsPageProps) {
  return (
    <div className="space-y-4">
      {/* Header — mesmo padrão da aba Profissionais */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 font-medium">
          {permissionProfiles.length} perfil(is) de permissão
        </p>
        <Button
          onClick={onOpenPermProfileModal}
          variant="primary"
          size="md"
          iconLeft={<Plus size={16} />}
          className="shadow-lg shadow-amber-500/20"
        >
          Novo Perfil
        </Button>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {permissionProfiles.map((profile, idx) => {
          const perms = parsePerms(profile.permissions);
          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group bg-white rounded-3xl border border-zinc-200 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all overflow-hidden"
            >
              {/* Banner */}
              <div className="relative h-12 bg-gradient-to-r from-zinc-700 to-zinc-800">
                <div className="absolute -bottom-6 left-5">
                  <div className="w-12 h-12 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-amber-500">
                    <Shield size={18} />
                  </div>
                </div>
              </div>

              <div className="pt-8 px-5 pb-5 space-y-3">
                <div>
                  <h4 className="text-sm font-black text-zinc-900">{profile.name}</h4>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Perfil de Permissão</p>
                </div>

                {/* Resumo de permissões */}
                {Object.values(perms).some(m => Object.values(m).some(Boolean)) ? (
                  <div className="bg-zinc-50 rounded-xl p-2.5 space-y-1">
                    {Object.entries(perms).filter(([, m]) => Object.values(m).some(Boolean)).map(([mod, actions]) => {
                      const activeActions = Object.entries(actions).filter(([, v]) => v).map(([a]) => ACTION_LABELS[a] || a);
                      return (
                        <p key={mod} className="text-[9px] text-zinc-500 leading-relaxed">
                          <span className="font-black text-zinc-700">{MODULE_LABELS[mod] || mod}:</span>{" "}
                          {activeActions.join(" · ")}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[9px] text-zinc-400 italic">Sem permissões definidas</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    iconLeft={<Pencil size={12} />}
                    onClick={() => onEditPermProfile(profile)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    iconLeft={<Trash2 size={12} />}
                    className="border-red-200 text-red-500 hover:bg-red-50"
                    onClick={() => onDeletePermProfile(profile.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}

        {permissionProfiles.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Shield}
              title="Nenhum perfil criado."
              description={'Exemplos: "Barbeiro Completo", "Apenas Agenda", "Recepcionista"…'}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Interface e componente principal ─────────────────────────
interface ProfessionalsTabProps {
  professionals: any[];
  setEditingProfessional: (p: any) => void;
  setNewProfessional: (p: any) => void;
  setIsProfessionalModalOpen: (b: boolean) => void;
  handleDeleteProfessional: (id: string) => void;
  emptyProfessional: any;
  permissionProfiles: any[];
  profSubTab: "lista" | "permissoes";
  onSubTabChange: (sub: "lista" | "permissoes") => void;
  onOpenPermProfileModal: () => void;
  onEditPermProfile: (p: any) => void;
  onDeletePermProfile: (id: string) => void;
}

export function ProfessionalsTab({
  professionals,
  setEditingProfessional,
  setNewProfessional,
  setIsProfessionalModalOpen,
  handleDeleteProfessional,
  emptyProfessional,
  permissionProfiles,
  profSubTab,
  onSubTabChange,
  onOpenPermProfileModal,
  onEditPermProfile,
  onDeletePermProfile,
}: ProfessionalsTabProps) {

  const openCreate = () => {
    setEditingProfessional(null);
    setNewProfessional(JSON.parse(JSON.stringify(emptyProfessional)));
    setIsProfessionalModalOpen(true);
  };

  const openEdit = (prof: any) => {
    setEditingProfessional(prof);
    // Mescla com emptyProfessional.permissions para garantir todas as chaves no modal
    const parsedPerms = parsePerms(prof.permissions);
    const basePerms = emptyProfessional.permissions || {};
    const mergedPerms: Record<string, Record<string, boolean>> = {};
    for (const mod of Object.keys(basePerms)) {
      mergedPerms[mod] = { ...basePerms[mod], ...(parsedPerms[mod] || {}) };
    }
    setNewProfessional({
      ...emptyProfessional,
      name: prof.name,
      nickname: prof.nickname || "",
      role: prof.role || "",
      cpf: prof.cpf || "",
      gender: prof.gender || "male",
      birthDate: prof.birthDate || "",
      phone: prof.phone || "",
      email: prof.email || "",
      instagram: prof.instagram || "",
      bio: prof.bio || "",
      photo: prof.photo || "",
      password: "",
      permissions: mergedPerms,
      accessLevel: prof.accessLevel || "no-access",
      patAccess: prof.patAccess || false,
      canAddServicePhotos: prof.canAddServicePhotos || false,
      attendsSchedule: prof.attendsSchedule !== false,
      workingHours: prof.workingHours || emptyProfessional.workingHours,
      services: prof.services || [],
    });
    setIsProfessionalModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ── Sub-abas ──────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => onSubTabChange("lista")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            profSubTab === "lista"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <Users size={13} /> Profissionais
          <span className="text-[10px] bg-zinc-200 text-zinc-600 rounded-full px-1.5 py-0.5 font-black">{professionals.length}</span>
        </button>
        <button
          onClick={() => onSubTabChange("permissoes")}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            profSubTab === "permissoes"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <Shield size={13} /> Perfis de Permissão
          {permissionProfiles.length > 0 && (
            <span className="text-[10px] bg-zinc-200 text-zinc-600 rounded-full px-1.5 py-0.5 font-black">{permissionProfiles.length}</span>
          )}
        </button>
      </div>

      {/* ── Conteúdo das abas ─────────────────────────────── */}
      <AnimatePresence mode="wait">
        {profSubTab === "permissoes" ? (
          <motion.div key="permissoes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <PermissionsPage
              permissionProfiles={permissionProfiles}
              onOpenPermProfileModal={onOpenPermProfileModal}
              onEditPermProfile={onEditPermProfile}
              onDeletePermProfile={onDeletePermProfile}
            />
          </motion.div>
        ) : (
          <motion.div key="lista" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            {/* Header da lista */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">
                {professionals.length} profissional(is) cadastrado(s)
              </p>
              <Button
                onClick={openCreate}
                variant="primary"
                size="md"
                iconLeft={<Plus size={16} />}
                className="shadow-lg shadow-amber-500/20"
              >
                Novo Profissional
              </Button>
            </div>

            {/* Grid de cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {professionals.map((prof: any, idx: number) => {
                const perms = parsePerms(prof.permissions);
                return (
                  <motion.div
                    key={prof.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white rounded-3xl border border-zinc-200 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all overflow-hidden"
                  >
                    {/* Banner */}
                    <div className={`relative h-14 bg-gradient-to-r ${prof.isOwner ? "from-zinc-700 to-zinc-900" : "from-amber-400 to-amber-500"}`}>
                      <div className="absolute -bottom-7 left-5">
                        {prof.photo ? (
                          <img src={prof.photo} className="w-14 h-14 rounded-2xl object-cover border-4 border-white shadow-md" />
                        ) : (
                          <div className={`w-14 h-14 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-xl font-black ${prof.isOwner ? "text-zinc-700" : "text-amber-500"}`}>
                            {prof.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-3 flex gap-1.5">
                        {prof.isOwner && (
                          <Badge color="default" size="sm" pill>DONO</Badge>
                        )}
                        <Badge color={prof.isActive !== false ? "success" : "default"} size="sm" pill>
                          {prof.isActive !== false ? "ATIVO" : "INATIVO"}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-9 px-5 pb-5 space-y-3">
                      <div>
                        <h4 className="text-sm font-black text-zinc-900">{prof.name}</h4>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">{prof.role || "Sem cargo"}</p>
                      </div>
                      {prof.bio && <p className="text-[11px] text-zinc-500 line-clamp-2">{prof.bio}</p>}
                      <div className="space-y-1">
                        {prof.phone && <p className="text-[10px] text-zinc-500 flex items-center gap-1.5"><Phone size={9} /> {prof.phone}</p>}
                        {prof.email && <p className="text-[10px] text-zinc-500 flex items-center gap-1.5"><Mail size={9} className="shrink-0" /><span className="truncate">{prof.email}</span></p>}
                      </div>
                      <div>
                        {prof.attendsSchedule !== false ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">✓ Atende na agenda</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-500">Somente gestão</span>
                        )}
                      </div>
                      {/* Permissões expandidas */}
                      {Object.values(perms).some(m => Object.values(m).some(Boolean)) ? (
                        <div className="bg-zinc-50 rounded-xl p-2.5 space-y-1">
                          {Object.entries(perms).filter(([, m]) => Object.values(m).some(Boolean)).map(([mod, actions]) => {
                            const activeActions = Object.entries(actions).filter(([, v]) => v).map(([a]) => ACTION_LABELS[a] || a);
                            return (
                              <p key={mod} className="text-[9px] text-zinc-500 leading-relaxed">
                                <span className="font-black text-zinc-700">{MODULE_LABELS[mod] || mod}:</span>{" "}
                                {activeActions.join(" · ")}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[9px] text-zinc-400 italic">Sem permissões</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          iconLeft={<UserCog size={12} />}
                          onClick={() => openEdit(prof)}
                        >
                          Editar
                        </Button>
                        {!prof.isOwner && (
                          <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            iconLeft={<Trash2 size={12} />}
                            className="border-red-200 text-red-500 hover:bg-red-50"
                            onClick={() => handleDeleteProfessional(prof.id)}
                          >
                            Excluir
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {professionals.length === 0 && (
                <div className="col-span-full">
                  <EmptyState
                    icon={UserCog}
                    title="Nenhum profissional cadastrado."
                    description="Clique no botão acima para adicionar."
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
