import React from "react";
import { ShieldOff, Lock } from "lucide-react";
import { usePermissions } from "@/src/hooks/usePermissions";
import type { Module, Action } from "@/src/lib/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// PermissionGuard — protege telas e seções inteiras
//
// Uso para proteger uma tela inteira:
//   <PermissionGuard module="financeiro" action="ver">
//     <FinanceiroPage />
//   </PermissionGuard>
//
// Uso para proteger uma seção dentro de uma tela:
//   <PermissionGuard module="comandas" action="excluir_todos" inline>
//     <BotaoExcluirTudo />
//   </PermissionGuard>
// ─────────────────────────────────────────────────────────────────────────────

interface PermissionGuardProps {
  /** Módulo que precisa de permissão */
  module: Module;
  /** Ação necessária (padrão: "ver") */
  action?: Action;
  children: React.ReactNode;
  /**
   * inline: não exibe tela de bloqueio, apenas oculta o conteúdo
   * Usar para buttons/actions dentro de uma tela já visível
   */
  inline?: boolean;
  /** Fallback customizado */
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  module,
  action = "ver",
  children,
  inline = false,
  fallback,
}: PermissionGuardProps) {
  const { can } = usePermissions();

  if (can(module, action)) {
    return <>{children}</>;
  }

  if (inline) {
    return fallback ? <>{fallback}</> : null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <AccessDeniedScreen />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tela de acesso negado
// ─────────────────────────────────────────────────────────────────────────────

export function AccessDeniedScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 border border-zinc-200 mb-4">
        <ShieldOff size={28} className="text-zinc-400" />
      </div>
      <h2 className="text-xl font-black text-zinc-800 font-display mb-2">Acesso Restrito</h2>
      <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
        Você não tem permissão para acessar esta área. Solicite ao administrador do sistema.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PermButton — Botão que some ou fica desabilitado sem permissão
//
// Uso:
//   <PermButton module="comandas" action="criar" onClick={handleNew}>
//     Nova Comanda
//   </PermButton>
//
// mode="hide"     → remove o botão completamente (padrão)
// mode="disable"  → deixa desabilitado com tooltip
// ─────────────────────────────────────────────────────────────────────────────

interface PermButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  module: Module;
  action: Action;
  mode?: "hide" | "disable";
  children: React.ReactNode;
}

export function PermButton({
  module,
  action,
  mode = "hide",
  children,
  className,
  ...props
}: PermButtonProps) {
  const { can } = usePermissions();
  const allowed = can(module, action);

  if (!allowed && mode === "hide") {
    return null;
  }

  return (
    <button
      {...props}
      disabled={!allowed || props.disabled}
      title={!allowed ? "Sem permissão para esta ação" : props.title}
      className={className}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useGate — hook para verificar permissão de forma imperativa
//
// Uso:
//   const { gate, canDo } = useGate("agenda");
//   if (!canDo("criar")) return null;
//   // ou em um handler:
//   function handleDelete() {
//     if (!gate("excluir_todos")) { toast.warning("..."); return; }
//     // ...
//   }
// ─────────────────────────────────────────────────────────────────────────────

export function useGate(module: Module) {
  const { can } = usePermissions();

  return {
    /** Verifica e retorna booleano */
    canDo: (action: Action) => can(module, action),
    /** Guard imperativo — retorna true se permitido, false se bloqueado */
    gate: (action: Action): boolean => can(module, action),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NavGuard — remove um item de menu se o módulo não é visível
// ─────────────────────────────────────────────────────────────────────────────

interface NavGuardProps {
  module: Module;
  children: React.ReactNode;
}

export function NavGuard({ module, children }: NavGuardProps) {
  const { canView } = usePermissions();
  if (!canView(module)) return null;
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// LockIcon — ícone de cadeado inline para indicar permissão restrita
// ─────────────────────────────────────────────────────────────────────────────

export function LockBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-zinc-400 ${className ?? ""}`}
      title="Sem permissão"
    >
      <Lock size={9} />
      restrito
    </span>
  );
}
