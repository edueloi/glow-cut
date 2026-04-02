import React from "react";
import { cn } from "@/src/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "sm", ...props }, ref) => {
    const variants = {
      primary: "bg-zinc-900 text-white hover:bg-zinc-800",
      secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
      outline: "border border-zinc-200 bg-transparent hover:bg-zinc-50",
      ghost: "hover:bg-zinc-100 text-zinc-600",
      danger: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizes = {
      xs: "px-2 py-1 text-[10px]",
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
