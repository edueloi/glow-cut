// ─────────────────────────────────────────────────────────────────────────────
// usePermissions — Hook de acesso ao sistema de permissões
//
// Uso:
//   const { can, canView, permissions, role } = usePermissions();
//
//   // Verificar se pode executar uma ação
//   if (!can("comandas", "criar")) return null;
//
//   // Verificar se pode ver uma tela
//   if (!canView("financeiro")) return <AccessDenied />;
//
//   // No JSX: ocultar botão se sem permissão
//   <Button disabled={!can("agenda", "excluir_todos")}>Excluir</Button>
// ─────────────────────────────────────────────────────────────────────────────

import { useContext } from "react";
import { PermissionsContext, PermissionsContextType } from "@/src/contexts/PermissionsContext";
import type { Module, Action } from "@/src/lib/permissions";

export type { PermissionsContextType };

export function usePermissions(): PermissionsContextType {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions deve ser usado dentro de <PermissionsProvider>");
  }
  return ctx;
}

// ── Overload mais simples para checar uma ação específica ─────────────────────
export function useCanDo(module: Module, action: Action): boolean {
  const { can } = usePermissions();
  return can(module, action);
}

export function useCanView(module: Module): boolean {
  const { canView } = usePermissions();
  return canView(module);
}
