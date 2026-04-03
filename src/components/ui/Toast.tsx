import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
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
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    color: 'bg-emerald-500',
    borderColor: 'border-emerald-100',
  },
  error: {
    icon: <XCircleIcon />,
    color: 'bg-rose-500',
    borderColor: 'border-rose-100',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    color: 'bg-amber-500',
    borderColor: 'border-amber-100',
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-500" />,
    color: 'bg-blue-500',
    borderColor: 'border-blue-100',
  },
};

function XCircleIcon() {
  return (
    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
      <X className="w-5 h-5 text-rose-500" />
    </div>
  );
}

export function Toast({ id, type, message, onClose }: ToastProps) {
  const config = toastConfig[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={cn(
        "flex w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl border border-zinc-100",
        "pointer-events-auto"
      )}
    >
      {/* Left Icon Bar */}
      <div className={cn("w-20 flex items-center justify-center shrink-0", config.color)}>
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm">
          {type === 'error' ? (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white">
               <X className="w-5 h-5 text-rose-500" strokeWidth={3} />
            </div>
          ) : (
             <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white">
                {React.isValidElement(config.icon) ? React.cloneElement(config.icon as React.ReactElement<any>, { className: "w-5 h-5 shadow-none" }) : config.icon}
             </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-5 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-zinc-700 leading-tight">
          {message}
        </p>
        <button
          onClick={() => onClose(id)}
          className="p-1 hover:bg-zinc-50 rounded-lg transition-colors text-zinc-400"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress Bar (Optional Visual) */}
      <motion.div
        className={cn("absolute bottom-0 left-0 h-1", config.color)}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 5, ease: "linear" }}
      />
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
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
        <AnimatePresence>
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
