import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  Sparkles,
  Calendar,
  Users,
  LayoutDashboard,
  Settings,
  Trophy,
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";

/* ── Tour Steps ─────────────────────────────────────────────────────── */

interface TourStep {
  targetId?: string;
  title: string;
  content: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Agendelle!",
    content:
      "Tudo pronto para transformarmos a gestão do seu negócio. Vamos fazer um tour rápido pelas principais funcionalidades?",
    icon: <Sparkles className="text-amber-500" />,
  },
  {
    targetId: "nav-dash",
    title: "Dashboard Inteligente",
    content:
      "Aqui você tem uma visão geral do seu faturamento, agendamentos do dia e notificações importantes de estoque.",
    icon: <LayoutDashboard className="text-blue-500" />,
  },
  {
    targetId: "nav-agenda",
    title: "Sua Agenda",
    content:
      "O coração do sistema. Gerencie horários, bloqueios e agendamentos de forma visual e intuitiva.",
    icon: <Calendar className="text-emerald-500" />,
  },
  {
    targetId: "nav-clients",
    title: "Gestão de Clientes",
    content:
      "Mantenha o histórico completo, preferências e contatos de todos os seus clientes em um só lugar.",
    icon: <Users className="text-purple-500" />,
  },
  {
    targetId: "nav-settings",
    title: "Configurações",
    content:
      "Personalize seu link de agendamento online, horário de funcionamento e detalhes do seu estúdio.",
    icon: <Settings className="text-zinc-500" />,
  },
  {
    title: "Você está pronto!",
    content:
      "Agora é com você. Se precisar de ajuda, nosso suporte está sempre disponível. Boas vendas! 🚀",
    icon: <Trophy className="text-amber-500" />,
  },
];

/* ── Component ──────────────────────────────────────────────────────── */

export function VirtualTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Highlight target element (only on desktop where sidebar is visible)
  useEffect(() => {
    const step = TOUR_STEPS[currentStep];

    if (step.targetId && !isMobile) {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("relative", "z-[10001]");
      }
    } else {
      setTargetRect(null);
    }

    return () => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) el.classList.remove("relative", "z-[10001]");
      }
    };
  }, [currentStep, isMobile]);

  const next = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-[10000]">
      {/* ── Backdrop / Spotlight ─────────────────────────────────── */}
      {targetRect && !isMobile ? (
        <div
          className="pointer-events-auto"
          style={{
            position: "absolute",
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 16,
            border: "4px solid #f59e0b",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            transition: "all 0.4s cubic-bezier(.4,0,.2,1)",
          }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-auto bg-black/65 backdrop-blur-sm"
        />
      )}

      {/* ── Card — sempre centralizado ───────────────────────────── */}
      <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -24 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="
              pointer-events-auto bg-white relative overflow-hidden
              rounded-3xl sm:rounded-[32px]
              p-6 sm:p-8
              shadow-[0_32px_80px_-12px_rgba(0,0,0,0.4)]
              border border-zinc-100
              w-full max-w-[360px]
            "
          >
            {/* Decorations */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl" />

            {/* Step indicator — top bar */}
            <div className="flex gap-1.5 mb-5 sm:mb-6">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === currentStep
                      ? "flex-[3] bg-amber-500"
                      : i < currentStep
                      ? "flex-1 bg-amber-200"
                      : "flex-1 bg-zinc-100"
                  }`}
                />
              ))}
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-50 flex items-center justify-center shadow-sm border border-zinc-100 shrink-0">
                {step.icon}
              </div>
              <button
                onClick={onComplete}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <h3 className="text-xl sm:text-2xl font-black text-zinc-900 leading-tight mb-2">
                {step.title}
              </h3>
              <p className="text-sm sm:text-[15px] text-zinc-500 leading-relaxed font-medium">
                {step.content}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-zinc-300 tabular-nums">
                {currentStep + 1}/{TOUR_STEPS.length}
              </span>

              <div className="flex gap-2">
                {isFirst ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onComplete}
                    className="rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-zinc-400 text-xs"
                  >
                    Pular
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prev}
                    className="rounded-xl h-9 sm:h-10 px-3 sm:px-4 text-xs"
                  >
                    Voltar
                  </Button>
                )}
                <Button
                  onClick={next}
                  className="rounded-xl h-9 sm:h-10 px-4 sm:px-6 shadow-lg shadow-amber-500/20 text-xs sm:text-sm font-bold"
                >
                  {isLast ? "Começar Agora!" : "Próximo"}
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
