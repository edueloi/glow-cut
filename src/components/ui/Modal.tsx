import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className, size = "md" }) => {
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    full: "max-w-[95dvw]",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
          />
          <div className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] pointer-events-auto overflow-hidden border-t sm:border border-zinc-200",
                sizes[size],
                className
              )}
            >
              <div className="flex items-center justify-between px-6 py-5 sm:py-4 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-900 font-display uppercase tracking-widest">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-zinc-50 sm:bg-transparent sm:hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
