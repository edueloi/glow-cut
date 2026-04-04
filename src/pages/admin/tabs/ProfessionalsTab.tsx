import React from "react";
import { Plus, UserCog, Trash2, Phone, Mail, Shield, Pencil } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/src/components/ui/Button";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  agenda:    "Agenda",
  comandas:  "Comandas",
  services:  "Serviços",
  clients:   "Clientes",
  fluxo:     "Fluxo de Caixa",
};

const ACTION_LABELS: Record<string, string> = {
  ver: "Ver", criar: "Criar", editar: "Editar", excluir: "Excluir",
};

interface PermissionProfile {
  id: string;
  name: string;
  permissions: Record<string, Record<string, boolean>>;
}

interface ProfessionalsTabProps {
  professionals: any[];
  setEditingProfessional: (p: any) => void;
  setNewProfessional: (p: any) => void;
  setIsProfessionalModalOpen: (b: boolean) => void;
  handleDeleteProfessional: (id: string) => void;
  emptyProfessional: any;
  permissionProfiles: PermissionProfile[];
  onOpenPermProfileModal: () => void;
  onEditPermProfile: (p: PermissionProfile) => void;
  onDeletePermProfile: (id: string) => void;
}

function parsePerms(raw: any): Record<string, Record<string, boolean>> {
  if (!raw) return {};
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    // Suporte ao formato legado { agenda: true } → { agenda: { ver: true } }
    const result: Record<string, Record<string, boolean>> = {};
    for (const [mod, val] of Object.entries(parsed)) {
      if (typeof val === "boolean") {
        result[mod] = { ver: val as boolean };
      } else if (typeof val === "object" && val !== null) {
        result[mod] = val as Record<string, boolean>;
      }
    }
    return result;
  } catch { return {}; }
}

function PermBadges({ perms }: { perms: Record<string, Record<string, boolean>> }) {
  const chips: { mod: string; action: string }[] = [];
  for (const [mod, actions] of Object.entries(perms)) {
    for (const [action, enabled] of Object.entries(actions)) {
      if (enabled) chips.push({ mod, action });
    }
  }
  if (chips.length === 0) return null;
  const shown = chips.slice(0, 5);
  const rest = chips.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(({ mod, action }) => (
        <span
          key={`${mod}-${action}`}
          className="text-[9px] bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5 font-bold"
        >
          {MODULE_LABELS[mod] || mod} · {ACTION_LABELS[action] || action}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[9px] bg-zinc-100 text-zinc-400 rounded-full px-2 py-0.5 font-bold">
          +{rest}
        </span>
      )}
    </div>
  );
}

function ProfilePermSummary({ perms }: { perms: Record<string, Record<string, boolean>> }) {
  const modules = Object.entries(perms).filter(([, actions]) =>
    Object.values(actions).some(Boolean)
  );
  if (modules.length === 0) return <p className="text-[9px] text-zinc-400">Sem permissões</p>;
  return (
    <div className="flex flex-col gap-0.5">
      {modules.map(([mod, actions]) => {
        const activeActions = Object.entries(actions).filter(([, v]) => v).map(([a]) => ACTION_LABELS[a] || a);
        return (
          <p key={mod} className="text-[9px] text-zinc-500">
            <span className="font-black text-zinc-700">{MODULE_LABELS[mod] || mod}:</span>{" "}
            {activeActions.join(", ")}
          </p>
        );
      })}
    </div>
  );
}

export function ProfessionalsTab({
  professionals,
  setEditingProfessional,
  setNewProfessional,
  setIsProfessionalModalOpen,
  handleDeleteProfessional,
  emptyProfessional,
  permissionProfiles,
  onOpenPermProfileModal,
  onEditPermProfile,
  onDeletePermProfile,
}: ProfessionalsTabProps) {

  const openCreate = () => {
    setEditingProfessional(null);
    setNewProfessional({ ...emptyProfessional });
    setIsProfessionalModalOpen(true);
  };

  const openEdit = (prof: any) => {
    setEditingProfessional(prof);
    setNewProfessional({
      name:        prof.name,
      role:        prof.role || "",
      password:    "",
      phone:       prof.phone || "",
      email:       prof.email || "",
      bio:         prof.bio || "",
      photo:       prof.photo || "",
      permissions: parsePerms(prof.permissions),
    });
    setIsProfessionalModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* ── Perfis de Permissão ─────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-zinc-800">Perfis de Permissão</h3>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
              Crie perfis prontos para aplicar ao cadastrar profissionais
            </p>
          </div>
          <Button
            onClick={onOpenPermProfileModal}
            variant="outline"
            className="rounded-xl text-[10px] font-bold border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={12} /> Novo Perfil
          </Button>
        </div>

        {permissionProfiles.length === 0 ? (
          <div className="py-6 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
            <Shield size={24} className="mb-2 opacity-30" />
            <p className="text-xs font-bold text-zinc-400">Nenhum perfil criado ainda.</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Ex: "Barbeiro Completo", "Apenas Agenda"…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {permissionProfiles.map(profile => (
              <div
                key={profile.id}
                className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Shield size={13} className="text-zinc-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-black text-zinc-800 leading-tight">{profile.name}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onEditPermProfile(profile)}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => onDeletePermProfile(profile.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <ProfilePermSummary perms={parsePerms(profile.permissions)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-100" />

      {/* ── Lista de Profissionais ───────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-medium">
            {professionals.length} profissional(is) cadastrado(s)
          </p>
          <Button
            onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl px-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={18} />
            Novo Profissional
          </Button>
        </div>

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
                <div className="relative h-16 bg-gradient-to-r from-amber-400 to-amber-500">
                  <div className="absolute -bottom-8 left-5">
                    {prof.photo ? (
                      <img
                        src={prof.photo}
                        className="w-16 h-16 rounded-2xl object-cover border-4 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-amber-500 text-2xl font-black">
                        {prof.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-3">
                    <span
                      className={`text-[9px] font-black px-2 py-1 rounded-full ${
                        prof.isActive !== false
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {prof.isActive !== false ? "ATIVO" : "INATIVO"}
                    </span>
                  </div>
                </div>

                <div className="pt-10 px-5 pb-5 space-y-3">
                  <div>
                    <h4 className="text-sm font-black text-zinc-900">{prof.name}</h4>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                      {prof.role || "Sem cargo"}
                    </p>
                  </div>

                  {prof.bio && (
                    <p className="text-[11px] text-zinc-500 line-clamp-2">{prof.bio}</p>
                  )}

                  <div className="space-y-1">
                    {prof.phone && (
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        <Phone size={9} /> {prof.phone}
                      </p>
                    )}
                    {prof.email && (
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                        <Mail size={9} className="shrink-0" />
                        <span className="truncate">{prof.email}</span>
                      </p>
                    )}
                  </div>

                  <PermBadges perms={perms} />

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl text-[10px] font-bold border-zinc-200 text-zinc-600 hover:bg-zinc-50 py-3 flex items-center justify-center gap-1.5 cursor-pointer"
                      onClick={() => openEdit(prof)}
                    >
                      <UserCog size={12} /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl text-[10px] font-bold border-red-200 text-red-500 hover:bg-red-50 py-3 flex items-center justify-center gap-1.5 cursor-pointer"
                      onClick={() => handleDeleteProfessional(prof.id)}
                    >
                      <Trash2 size={12} /> Excluir
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {professionals.length === 0 && (
            <div className="col-span-full py-24 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
              <UserCog size={48} className="mb-4 opacity-30" />
              <p className="text-sm font-bold text-zinc-500">Nenhum profissional cadastrado.</p>
              <p className="text-xs mt-1 font-medium">Clique no botão acima para adicionar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
