import React from "react";
import { cn } from "@/src/lib/utils";
import { Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Button — Design System
//
// Variants:  primary | secondary | outline | ghost | danger | success
// Sizes:     xs | sm | md | lg
//            xs  → 28px h   (action menus, badges inline)
//            sm  → 32px h   (tabelas, filtros)
//            md  → 40px h   (formulários, toolbars)   ← default
//            lg  → 48px h   (CTAs, mobile bottom actions)
//
// Mobile: lg size é recomendado para botões de ação em rodapé de modal
// Desktop: md é o padrão geral
// ─────────────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      iconRight,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants: Record<string, string> = {
      primary:
        "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 shadow-sm shadow-amber-500/20 border border-amber-400/50",
      secondary:
        "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 active:bg-zinc-300 border border-zinc-200",
      outline:
        "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100",
      ghost:
        "bg-transparent text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200",
      danger:
        "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm shadow-red-500/20 border border-red-400/50",
      success:
        "bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-sm shadow-emerald-500/20 border border-emerald-400/50",
    };

    const sizes: Record<string, string> = {
      xs: "h-7 px-2.5 gap-1 text-[10px] rounded-lg",
      sm: "h-8 px-3 gap-1.5 text-[11px] rounded-[10px]",
      md: "h-10 px-4 gap-2 text-sm rounded-[10px]",
      lg: "h-12 px-5 gap-2 text-[15px] rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-bold transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.97]",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={size === "lg" ? 18 : size === "md" ? 16 : 14} className="animate-spin shrink-0" />
        ) : (
          iconLeft && <span className="shrink-0">{iconLeft}</span>
        )}
        {children && <span className="truncate">{children}</span>}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

// ─── IconButton ────────────────────────────────────────────────────────────
// Botão apenas com ícone, quadrado, tamanho fixo
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "primary" | "danger";
  tooltip?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", variant = "ghost", children, ...props }, ref) => {
    const sizes: Record<string, string> = {
      xs: "h-7 w-7 rounded-lg text-[14px]",
      sm: "h-8 w-8 rounded-[10px] text-[15px]",
      md: "h-10 w-10 rounded-[10px] text-[16px]",
      lg: "h-12 w-12 rounded-xl text-[18px]",
    };

    const variants: Record<string, string> = {
      ghost: "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200",
      outline: "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
      primary: "bg-amber-500 text-white hover:bg-amber-600",
      danger: "text-red-400 hover:text-red-600 hover:bg-red-50",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
          "disabled:pointer-events-none disabled:opacity-50 active:scale-90",
          sizes[size],
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
