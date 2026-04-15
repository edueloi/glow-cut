import React from "react";
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// PageWrapper — Design System
//
// Wrapper responsivo padrão para todas as páginas do admin.
// Define o padding correto para mobile/tablet/desktop e max-width.
//
// Uso:
//   <PageWrapper>
//     <SectionTitle title="Clientes" description="Gerencie os clientes" />
//     {conteúdo da página}
//   </PageWrapper>
// ─────────────────────────────────────────────────────────────────────────────

interface PageWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Adiciona padding-bottom extra para não sobrepor o bottom-nav no mobile */
  mobileBottomPad?: boolean;
}

export function PageWrapper({ children, className, mobileBottomPad = true, ...props }: PageWrapperProps) {
  return (
    <div
      className={cn(
        // Padding horizontal: compacto no mobile, espaçoso no desktop
        "px-4 sm:px-6 lg:px-8",
        // Padding vertical
        "py-4 sm:py-6 lg:py-8",
        // Espaço para bottom-nav mobile (evitar sobreposição)
        mobileBottomPad && "pb-24 sm:pb-6 lg:pb-8",
        // Max width centralizado
        "mx-auto w-full max-w-screen-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionTitle — Cabeçalho de seção/página
// ─────────────────────────────────────────────────────────────────────────────

interface SectionTitleProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
  /** Separador inferior */
  divider?: boolean;
}

export function SectionTitle({
  title,
  description,
  icon: Icon,
  action,
  className,
  divider = false,
}: SectionTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        divider && "pb-4 border-b border-zinc-100 mb-4 sm:mb-6",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
            <Icon size={18} className="text-amber-600" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-zinc-900 font-display truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatGrid — Grid responsivo para cards de estatística
// ─────────────────────────────────────────────────────────────────────────────

interface StatGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}

export function StatGrid({ children, cols = 4, className, ...props }: StatGridProps) {
  const colsMap: Record<number, string> = {
    2: "grid-cols-2 sm:grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div
      className={cn("grid gap-3 sm:gap-4", colsMap[cols], className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContentCard — Card de conteúdo simples
// ─────────────────────────────────────────────────────────────────────────────

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

export function ContentCard({ children, padding = "md", className, ...props }: ContentCardProps) {
  const paddingMap = {
    none: "",
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-5 lg:p-6",
    lg: "p-5 sm:p-6 lg:p-8",
  };

  return (
    <div
      className={cn(
        "bg-white border border-zinc-200 rounded-2xl sm:rounded-3xl shadow-sm",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FormRow — Row de formulário com label + campo, responsivo
// ─────────────────────────────────────────────────────────────────────────────

interface FormRowProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}

export function FormRow({ children, cols = 2, className }: FormRowProps) {
  const colsMap = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className={cn("grid gap-4", colsMap[cols], className)}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Divider — Separador horizontal
// ─────────────────────────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={cn("border-t border-zinc-100", className)} />;
}
