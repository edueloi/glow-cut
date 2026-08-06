import React, { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import type { AdminSubNavItem } from "@/src/pages/admin/config/navigation";

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  subItems?: AdminSubNavItem[];
  activeSubKey?: string;
  onSubItemClick?: (key: string) => void;
  /** Se false, o item aparece desabilitado com cadeado */
  permitted?: boolean;
  id?: string;
  /** Contador exibido como bolinha no item (ex: pendências) */
  badgeCount?: number;
}

export function NavItem({
  active,
  onClick,
  icon: Icon,
  label,
  collapsed,
  subItems,
  activeSubKey,
  onSubItemClick,
  permitted = true,
  id,
  badgeCount = 0,
}: NavItemProps) {
  const [expanded, setExpanded] = useState(active && !!subItems?.length);

  const hasSubItems = subItems && subItems.length > 0;

  const handleClick = () => {
    // Se sem permissão, não navega
    if (!permitted) return;

    if (hasSubItems && !collapsed) {
      // Só expande/colapsa — nunca navega ao clicar no item pai
      setExpanded(!expanded);
    } else {
      onClick();
    }
  };

  React.useEffect(() => {
    if (active && hasSubItems) setExpanded(true);
  }, [active, hasSubItems]);

  // Item sem permissão — não renderiza nada (oculto do menu)
  if (!permitted) {
    return null;
  }

  return (
    <div>
      <button
        id={id}
        onClick={handleClick}
        title={collapsed ? label : undefined}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 group select-none min-h-[44px]",
          collapsed ? "justify-center px-2" : "",
          active
            ? "bg-amber-500 text-white shadow-sm"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 active:bg-zinc-200"
        )}
      >
        <span className={cn("relative shrink-0 transition-colors", active ? "text-white" : "text-zinc-400 group-hover:text-zinc-700")}>
          <Icon size={18} />
          {badgeCount > 0 && collapsed && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </span>
        {!collapsed && <span className="text-xs font-bold truncate flex-1">{label}</span>}
        {!collapsed && badgeCount > 0 && (
          <span className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black min-w-[18px] text-center",
            active ? "bg-white text-amber-600" : "bg-red-500 text-white"
          )}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
        {!collapsed && hasSubItems && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={cn("shrink-0", active ? "text-white/70" : "text-zinc-400")}
          >
            <ChevronDown size={14} />
          </motion.span>
        )}
      </button>

      {/* Sub-items */}
      {!collapsed && hasSubItems && (
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="ml-4 pl-4 border-l-2 border-amber-200/50 mt-1 mb-1 space-y-0.5">
                {subItems!.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => onSubItemClick?.(sub.key)}
                    style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-all duration-150 min-h-[36px] select-none",
                      activeSubKey === sub.key
                        ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 border border-transparent"
                    )}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
