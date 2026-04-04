import React from "react";
import { Plus, UserCog, Trash2, Phone, Mail, Shield, Pencil, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/src/components/ui/Button";

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

// ── Badges no card do profissional — agrupa por módulo ───────
function PermBadges({ perms }: { perms: Record<string, Record<string, boolean>> }) {
  const modules = Object.entries(perms)
    .filter(([, actions]) => Object.values(actions).some(Boolean))
    .map(([mod, actions]) => {
      const activeActions = Object.entries(actions).filter(([, v]) => v).map(([a]) => ACTION_LABELS[a] || a);
      return { mod, activeActions };
    });
  if (modules.length === 0) return null;
  const shown = modules.slice(0, 3);
  const rest  = modules.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(({ mod, activeActions }) => (
        <span key={mod} className="text-[9px] bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5 font-bold">
          {MODULE_LABELS[mod] || mod}
          {activeActions.length > 1 && ` (${activeActions.length})`}
        </span>
      ))}
      {rest > 0 && <span className="text-[9px] bg-zinc-100 text-zinc-400 rounded-full px-2 py-0.5 font-bold">+{rest} módulo(s)</span>}
    </div>
  );
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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-zinc-900">Perfis de Permissão</h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Crie perfis prontos com permissões granulares. Ao cadastrar um profissional, aplique um perfil para preencher as permissões automaticamente.
          </p>
        </div>
        <Button
          onClick={onOpenPermProfileModal}
          className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 font-bold flex items-center gap-2 cursor-pointer"
        >
          <Plus size={14} /> Novo Perfil
        </Button>
      </div>

      {permissionProfiles.length === 0 ? (
        <div className="py-20 bg-zinc-50 rounded-[32px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
          <Shield size={36} className="mb-3 opacity-20" />
          <p className="text-sm font-bold text-zinc-400">Nenhum perfil criado.</p>
          <p className="text-xs text-zinc-400 mt-1">Exemplos: "Barbeiro Completo", "Apenas Agenda", "Recepcionista"…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {permissionProfiles.map((profile) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <Shield size={14} className="text-amber-600" />
                  </div>
                  <p className="text-sm font-black text-zinc-900">{profile.name}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEditPermProfile(profile)}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => onDeletePermProfile(profile.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <ProfileSummary perms={parsePerms(profile.permissions)} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Legenda de escopos */}
      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Entendendo os escopos</p>
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-500"><span className="font-black text-zinc-700">Próprios:</span> o profissional pode editar/excluir apenas registros que ele mesmo criou.</p>
          <p className="text-[10px] text-zinc-500"><span className="font-black text-zinc-700">Todos:</span> o profissional pode editar/excluir qualquer registro do sistema.</p>
        </div>
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
      name: prof.name, role: prof.role || "", password: "",
      phone: prof.phone || "", email: prof.email || "",
      bio: prof.bio || "", photo: prof.photo || "",
      permissions: mergedPerms,
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
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl px-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} /> Novo Profissional
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
                    <div className="relative h-14 bg-gradient-to-r from-amber-400 to-amber-500">
                      <div className="absolute -bottom-7 left-5">
                        {prof.photo ? (
                          <img src={prof.photo} className="w-14 h-14 rounded-2xl object-cover border-4 border-white shadow-md" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-amber-500 text-xl font-black">
                            {prof.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-3">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-full ${prof.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                          {prof.isActive !== false ? "ATIVO" : "INATIVO"}
                        </span>
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
                        <Button variant="outline"
                          className="flex-1 rounded-xl text-[10px] font-bold border-zinc-200 text-zinc-600 hover:bg-zinc-50 py-3 flex items-center justify-center gap-1.5 cursor-pointer"
                          onClick={() => openEdit(prof)}
                        >
                          <UserCog size={11} /> Editar
                        </Button>
                        <Button variant="outline"
                          className="flex-1 rounded-xl text-[10px] font-bold border-red-200 text-red-500 hover:bg-red-50 py-3 flex items-center justify-center gap-1.5 cursor-pointer"
                          onClick={() => handleDeleteProfessional(prof.id)}
                        >
                          <Trash2 size={11} /> Excluir
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {professionals.length === 0 && (
                <div className="col-span-full py-24 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
                  <UserCog size={40} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold text-zinc-500">Nenhum profissional cadastrado.</p>
                  <p className="text-xs mt-1 font-medium">Clique no botão acima para adicionar.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
