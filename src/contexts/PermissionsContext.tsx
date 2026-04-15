import React, { createContext, useCallback, useMemo } from "react";
import {
  type PermissionSet,
  type Module,
  type Action,
  type RoleProfile,
  hasPermission,
  canDo,
  canViewModule,
  getVisibleModules,
  DEFAULT_ROLE_PROFILES,
  fullPermissions,
} from "@/src/lib/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// PermissionsContext
//
// Fornece o conjunto de permissões do usuário logado a toda a árvore.
// Em produção: conectar ao AuthContext para obter as permissões reais.
// Por ora: usa o perfil passado via prop ou default (admin = acesso total).
// ─────────────────────────────────────────────────────────────────────────────

export interface PermissionsContextType {
  permissions: PermissionSet;
  /** Retorna true se o usuário pode executar uma ação em um módulo */
  can: (module: Module, action: Action) => boolean;
  /** Retorna true se o usuário pode ver um módulo (ação "ver") */
  canView: (module: Module) => boolean;
  /** Lista de módulos visíveis */
  visibleModules: Module[];
  /** Perfil de papel atual (para exibição) */
  roleLabel: string;
  /** Perfis disponíveis (para tela de permissões) */
  availableProfiles: RoleProfile[];
}

export const PermissionsContext = createContext<PermissionsContextType | null>(null);

interface PermissionsProviderProps {
  children: React.ReactNode;
  /** Permissões do usuário logado — vem do backend/auth */
  permissions?: PermissionSet | null;
  /** Label do papel (ex: "Profissional") */
  roleLabel?: string;
}

export function PermissionsProvider({
  children,
  permissions: rawPermissions,
  roleLabel = "Admin",
}: PermissionsProviderProps) {
  // Se não tiver permissões (ex: admin antigo sem perfil), dá acesso total
  const permissions: PermissionSet = rawPermissions ?? fullPermissions();

  const can = useCallback(
    (module: Module, action: Action) => canDo(permissions, module, action),
    [permissions]
  );

  const canView = useCallback(
    (module: Module) => canViewModule(permissions, module),
    [permissions]
  );

  const visibleModules = useMemo(
    () => getVisibleModules(permissions),
    [permissions]
  );

  const value: PermissionsContextType = {
    permissions,
    can,
    canView,
    visibleModules,
    roleLabel,
    availableProfiles: DEFAULT_ROLE_PROFILES,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}
