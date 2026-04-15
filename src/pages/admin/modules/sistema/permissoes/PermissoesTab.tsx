import React, { useState } from "react";
import { Plus, Shield, ShieldCheck, Trash2, Edit2, Users, Info } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import {
  DEFAULT_ROLE_PROFILES,
  type RoleProfile,
  type PermissionSet,
  emptyPermissions,
  MODULE_META,
} from "@/src/lib/permissions";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { ConfirmModal } from "@/src/components/ui/Modal";
import { PageWrapper, SectionTitle } from "@/src/components/ui/PageWrapper";
import { PermProfileModal, PermProfileEditor } from "@/src/components/auth/PermProfileEditor";
import { useToast } from "@/src/components/ui/Toast";

// ─────────────────────────────────────────────────────────────────────────────
// PermissoesTab — Tela de Gestão de Perfis de Permissão
//
// Mostra os perfis padrão (somente leitura) e os perfis customizados.
// Permite criar, editar e excluir perfis customizados.
// ─────────────────────────────────────────────────────────────────────────────

interface PermissoesTabProps {
  currentTheme?: { hex: string; name: string };
}

const STORAGE_KEY = "glow_perm_profiles";

function loadCustomProfiles(): RoleProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomProfiles(profiles: RoleProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function PermissoesTab({ currentTheme }: PermissoesTabProps) {
  const toast = useToast();
  const themeColor = currentTheme?.hex ?? "#f59e0b";

  const [customProfiles, setCustomProfiles] = useState<RoleProfile[]>(loadCustomProfiles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<RoleProfile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewProfile, setPreviewProfile] = useState<RoleProfile | null>(null);

  const allProfiles = [...DEFAULT_ROLE_PROFILES, ...customProfiles];

  const handleSave = (profile: RoleProfile) => {
    let updated: RoleProfile[];
    if (editingProfile) {
      updated = customProfiles.map((p) => (p.id === editingProfile.id ? profile : p));
      toast.success(`Perfil "${profile.label}" atualizado.`);
    } else {
      updated = [...customProfiles, { ...profile, id: `custom_${Date.now()}` as any }];
      toast.success(`Perfil "${profile.label}" criado.`);
    }
    setCustomProfiles(updated);
    saveCustomProfiles(updated);
    setIsModalOpen(false);
    setEditingProfile(null);
  };

  const handleDelete = (id: string) => {
    const updated = customProfiles.filter((p) => p.id !== id);
    setCustomProfiles(updated);
    saveCustomProfiles(updated);
    setDeletingId(null);
    toast.success("Perfil excluído.");
  };

  const openNew = () => {
    setEditingProfile(null);
    setIsModalOpen(true);
  };

  const openEdit = (profile: RoleProfile) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  return (
    <PageWrapper>
      <SectionTitle
        title="Perfis de Permissão"
        description="Controle o que cada tipo de usuário pode ver e fazer no sistema."
        icon={Shield}
        divider
        action={
          <Button
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={openNew}
          >
            Novo Perfil
          </Button>
        }
      />

      {/* ── Info ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200 mb-6">
        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Os <strong>perfis padrão</strong> (Administrador, Profissional, Secretária, Financeiro) são fornecidos pelo sistema e não podem ser editados.
          Crie perfis personalizados para configurar acessos específicos para o seu estúdio.
        </p>
      </div>

      {/* ── Perfis Padrão ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="ds-subheading mb-3">Perfis Padrão do Sistema</p>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {DEFAULT_ROLE_PROFILES.map((profile, i) => (
            <DefaultProfileCard
              key={profile.id}
              profile={profile}
              themeColor={themeColor}
              delay={i * 0.05}
              onPreview={() => setPreviewProfile(previewProfile?.id === profile.id ? null : profile)}
              isExpanded={previewProfile?.id === profile.id}
            />
          ))}
        </div>
      </div>

      {/* ── Perfis Customizados ─────────────────────────────────────────── */}
      <div>
        <p className="ds-subheading mb-3">
          Perfis Personalizados
          {customProfiles.length > 0 && (
            <span className="ml-2 text-zinc-500 normal-case tracking-normal font-semibold">
              ({customProfiles.length})
            </span>
          )}
        </p>

        {customProfiles.length === 0 ? (
          <EmptyCustomProfiles onNew={openNew} />
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {customProfiles.map((profile, i) => (
              <CustomProfileCard
                key={profile.id}
                profile={profile}
                themeColor={themeColor}
                delay={i * 0.05}
                onEdit={() => openEdit(profile)}
                onDelete={() => setDeletingId(profile.id)}
                onPreview={() => setPreviewProfile(previewProfile?.id === profile.id ? null : profile)}
                isExpanded={previewProfile?.id === profile.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Preview de permissões (readonly) ───────────────────────────── */}
      {previewProfile && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-zinc-100">
            <div>
              <p className="text-sm font-black text-zinc-900 font-display">{previewProfile.label}</p>
              <p className="text-xs text-zinc-400 mt-0.5">Visualização das permissões</p>
            </div>
            <button
              onClick={() => setPreviewProfile(null)}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
            >
              ×
            </button>
          </div>
          <div className="p-5 sm:p-7">
            <PermProfileEditor
              value={{ name: previewProfile.label, permissions: previewProfile.permissions }}
              onChange={() => {}} // readonly
              themeColor={themeColor}
              showNameField={false}
            />
          </div>
        </motion.div>
      )}

      {/* ── Modal criar/editar perfil ────────────────────────────────────── */}
      <PermProfileModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProfile(null); }}
        editingProfile={editingProfile}
        onSave={handleSave}
        themeColor={themeColor}
      />

      {/* ── Confirmar exclusão ───────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        title="Excluir Perfil"
        message="Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita. Profissionais com este perfil perderão as permissões associadas."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </PageWrapper>
  );
}

// ── Card de perfil padrão ────────────────────────────────────────────────────
interface DefaultProfileCardProps {
  profile: RoleProfile;
  themeColor: string;
  delay: number;
  onPreview: () => void;
  isExpanded: boolean;
}

function DefaultProfileCard({ profile, themeColor, delay, onPreview, isExpanded }: DefaultProfileCardProps) {
  const moduleCount = Object.entries(profile.permissions).filter(([, v]) =>
    Object.values(v as Record<string, boolean>).some(Boolean)
  ).length;

  const ROLE_ICONS: Record<string, React.ElementType> = {
    admin: ShieldCheck,
    profissional: Users,
    secretaria: Users,
    financeiro: Users,
  };
  const Icon = ROLE_ICONS[profile.id] ?? Shield;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border p-4 transition-all bg-white shadow-sm",
        isExpanded ? "border-amber-300 ring-1 ring-amber-200" : "border-zinc-200"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
          <Icon size={16} className="text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-zinc-900">{profile.label}</p>
            <Badge color="default" size="sm">padrão</Badge>
          </div>
          {profile.description && (
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{profile.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
        <p className="text-[10px] font-bold text-zinc-400">
          {moduleCount} módulos com acesso
        </p>
        <button
          onClick={onPreview}
          className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors"
        >
          {isExpanded ? "Ocultar" : "Ver permissões"}
        </button>
      </div>
    </motion.div>
  );
}

// ── Card de perfil customizado ────────────────────────────────────────────────
interface CustomProfileCardProps {
  profile: RoleProfile;
  themeColor: string;
  delay: number;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: () => void;
  isExpanded: boolean;
}

function CustomProfileCard({
  profile, themeColor, delay, onEdit, onDelete, onPreview, isExpanded
}: CustomProfileCardProps) {
  const moduleCount = Object.entries(profile.permissions).filter(([, v]) =>
    Object.values(v as Record<string, boolean>).some(Boolean)
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border p-4 transition-all bg-white shadow-sm",
        isExpanded ? "border-amber-300 ring-1 ring-amber-200" : "border-zinc-200 hover:border-zinc-300"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200">
          <Shield size={16} className="text-zinc-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-zinc-900">{profile.label}</p>
          {profile.description && (
            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{profile.description}</p>
          )}
        </div>
      </div>

      <p className="text-[10px] font-bold text-zinc-400">
        {moduleCount} módulos com acesso
      </p>

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
        <button
          onClick={onPreview}
          className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors mr-auto"
        >
          {isExpanded ? "Ocultar" : "Ver permissões"}
        </button>
        <Button variant="outline" size="sm" onClick={onEdit} iconLeft={<Edit2 size={12} />}>
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-500 hover:bg-red-50"
          iconLeft={<Trash2 size={12} />}
        >
          Excluir
        </Button>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyCustomProfiles({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-200 rounded-2xl text-center px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 border border-zinc-200 mb-4">
        <Shield size={24} className="text-zinc-400" />
      </div>
      <p className="text-sm font-black text-zinc-700 mb-1">Nenhum perfil personalizado</p>
      <p className="text-xs text-zinc-400 mb-4 max-w-xs leading-relaxed">
        Crie perfis personalizados para configurar acessos específicos para sua equipe.
      </p>
      <Button variant="primary" size="md" iconLeft={<Plus size={15} />} onClick={onNew}>
        Criar Primeiro Perfil
      </Button>
    </div>
  );
}
