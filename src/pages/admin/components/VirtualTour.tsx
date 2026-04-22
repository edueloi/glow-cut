import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  MousePointer2,
  Calendar,
  Users,
  LayoutDashboard,
  Settings,
  Trophy,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";

interface TourStep {
  targetId?: string;
  title: string;
  content: string;
  icon: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Agendelle!",
    content: "Tudo pronto para transformarmos a gestão do seu negócio. Vamos fazer um tour rápido pelas principais funcionalidades?",
    icon: <Sparkles className="text-amber-500" />,
    position: "center"
  },
  {
    targetId: "nav-dash",
    title: "Dashboard Inteligente",
    content: "Aqui você tem uma visão geral do seu faturamento, agendamentos do dia e notificações importantes de estoque.",
    icon: <LayoutDashboard className="text-blue-500" />,
    position: "right"
  },
  {
    targetId: "nav-agenda",
    title: "Sua Agenda",
    content: "O coração do sistema. Gerencie horários, bloqueios e agendamentos de forma visual e intuitiva.",
    icon: <Calendar className="text-emerald-500" />,
    position: "right"
  },
  {
    targetId: "nav-clients",
    title: "Gestão de Clientes",
    content: "Mantenha o histórico completo, preferências e contatos de todos os seus clientes em um só lugar.",
    icon: <Users className="text-purple-500" />,
    position: "right"
  },
  {
    targetId: "nav-settings",
    title: "Configurações",
    content: "Personalize seu link de agendamento online, horário de funcionamento e detalhes do seu estúdio.",
    icon: <Settings className="text-zinc-500" />,
    position: "right"
  },
  {
    title: "Você está pronto!",
    content: "Agora é com você. Se precisar de ajuda, nosso suporte está sempre disponível. Boas vendas!",
    icon: <Trophy className="text-amber-500" />,
    position: "center"
  }
];

export function VirtualTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const step = TOUR_STEPS[currentStep];
    if (step.targetId) {
      const el = document.getElementById(step.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-4", "ring-amber-500", "ring-offset-4", "transition-all", "duration-500", "z-[10001]");
      }
    } else {
      setTargetRect(null);
    }

    return () => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) el.classList.remove("ring-4", "ring-amber-500", "ring-offset-4", "z-[10001]");
      }
    };
  }, [currentStep]);

  const next = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {/* Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 pointer-events-auto transition-colors duration-500 ${targetRect ? "bg-transparent" : "bg-black/60"}`}
      />

      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`
              pointer-events-auto bg-white rounded-[32px] p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] 
              border border-zinc-100 max-w-sm w-full relative overflow-hidden
              ${!targetRect ? "m-auto" : "absolute"}
            `}
            style={targetRect ? {
              top: step.position === "bottom" ? targetRect.bottom + 20 : 
                   step.position === "top" ? targetRect.top - 320 : 
                   step.position === "right" ? targetRect.top : "50%",
              left: step.position === "right" ? targetRect.right + 24 : "50%",
              transform: step.position === "right" ? "none" : "translate(-50%, -50%)"
            } : {}}
          >
            {/* Decoration */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
            
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-3xl shadow-sm border border-zinc-100">
                  {step.icon}
                </div>
                <button 
                  onClick={onComplete}
                  className="w-10 h-10 rounded-xl hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-900 leading-tight">{step.title}</h3>
                <p className="text-zinc-500 leading-relaxed font-medium">{step.content}</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === currentStep ? "w-6 bg-amber-500" : "w-1.5 bg-zinc-200"
                      }`} 
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {currentStep > 0 ? (
                    <Button variant="ghost" size="sm" onClick={prev} className="rounded-xl h-10 px-4">
                      Voltar
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={onComplete} className="rounded-xl h-10 px-4 text-zinc-400">
                      Pular Tour
                    </Button>
                  )}
                  <Button onClick={next} className="rounded-xl h-10 px-6 shadow-lg shadow-amber-500/20">
                    {currentStep === TOUR_STEPS.length - 1 ? "Começar Agora!" : "Próximo"}
                    <ChevronRight size={18} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Spotlight for target element if position is center but has targetId */}
      {targetRect && (
        <div 
          className="absolute border-4 border-amber-500 rounded-2xl transition-all duration-500 pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.7)"
          }}
        />
      )}
    </div>
  );
}
