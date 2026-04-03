import React from "react";
import { cn } from "@/src/lib/utils";

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, onClick, ...props }, ref) => {
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && !disabled) {
            onCheckedChange?.(!checked);
          }
        }}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          checked
            ? "border-amber-500 bg-amber-500 shadow-sm shadow-amber-500/20"
            : "border-zinc-200 bg-zinc-200",
          className
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200",
            checked ? "left-6" : "left-1"
          )}
        />
      </button>
    );
  }
);

Switch.displayName = "Switch";
