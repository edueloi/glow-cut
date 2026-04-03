import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: <Check className="w-4 h-4 text-emerald-600" strokeWidth={3} />,
    bg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    textColor: 'text-emerald-900',
    title: 'Sucesso'
  },
  error: {
    icon: <X className="w-4 h-4 text-rose-600" strokeWidth={3} />,
    bg: 'bg-rose-500',
    lightBg: 'bg-rose-50',
    borderColor: 'border-rose-100',
    textColor: 'text-rose-900',
    title: 'Erro'
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" strokeWidth={3} />,
    bg: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    borderColor: 'border-amber-100',
    textColor: 'text-amber-900',
    title: 'Atenção'
  },
  info: {
    icon: <Info className="w-4 h-4 text-blue-600" strokeWidth={3} />,
    bg: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-100',
    textColor: 'text-blue-900',
    title: 'Informativo'
  },
};

export function Toast({ id, type, message, onClose }: ToastProps) {
  const config = toastConfig[type];

  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <motion.div
      layout
      initial={{ x: 100, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.9 }}
      className="group pointer-events-auto relative flex w-[380px] items-stretch overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-100"
    >
      {/* Decorative Accent Line */}
      <div className={cn("w-1.5 shrink-0 transition-all group-hover:w-2", config.bg)} />

      {/* Main Content Area */}
      <div className="flex flex-1 items-center p-4 gap-4">
        {/* Icon Circle */}
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm border", config.lightBg, config.borderColor)}>
          {config.icon}
        </div>

        {/* Text Area */}
        <div className="flex flex-1 flex-col pr-2">
          <p className={cn("text-[11px] font-black uppercase tracking-widest", config.textColor.replace('900', '600'))}>
            {config.title}
          </p>
          <p className="text-sm font-bold text-zinc-700 leading-snug mt-0.5">
            {message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => onClose(id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-50 hover:text-zinc-500 transition-all font-bold"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar (at the bottom) */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-zinc-50/50">
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
          className={cn("h-full", config.bg)}
        />
      </div>
    </motion.div>
  );
}

interface ToastContextType {
  show: (message: string, type: ToastType) => void;
}

export const ToastContext = React.createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: string; type: ToastType; message: string }[]>([]);

  const show = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-10 right-10 z-[9999] flex flex-col items-end gap-4">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast key={toast.id} {...toast} onClose={remove} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
