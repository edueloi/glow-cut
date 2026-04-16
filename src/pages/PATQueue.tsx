import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import {
  Scissors, Clock, User, CheckCircle, RefreshCw,
  Loader2, AlertCircle, Calendar, ChevronRight,
  Package, Sparkles, Users, Timer, ArrowLeft,
  Check, X, UserMinus, Monitor, AppWindow, LayoutGrid,
  MoreVertical, ChevronDown, CheckCircle2,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { StatCard } from "@/src/components/ui/StatCard";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { useToast } from "@/src/components/ui/Toast";

// ── types ─────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  startTime: string;
  endTime?: string;
  status: "scheduled" | "confirmed" | "performed" | "missed";
  clientName: string;
  serviceName: string | null;
  serviceDuration: number | null;
  isNext: boolean;
  isPast: boolean;
}

interface ProfWithQueue {
  id: string;
  name: string;
  role: string | null;
  photo: string | null;
  queue: QueueItem[];
}

interface PatData {
  patEnabled: boolean;
  showClientName: boolean;
  showService: boolean;
  showTime: boolean;
  studio: { name: string; slug: string };
  date: string;
  // Para visão exclusiva
  professional?: { id: string; name: string; role: string; photo: string | null };
  queue?: QueueItem[];
  // Para visão geral
  professionals?: ProfWithQueue[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ── Components ───────────────────────────────────────────────────────────────

function AppointmentCard({
  item,
  index,
  onStatusChange,
  isGeneral = false,
}: {
  item: QueueItem;
  index: number;
  onStatusChange?: (id: string, status: string) => void;
  isGeneral?: boolean;
}) {
  const isFirst = item.isNext;
  const isCompleted = item.status === "performed";
  const isMissed = item.status === "missed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "group relative rounded-2xl border overflow-hidden transition-all duration-300",
        isFirst
          ? "bg-amber-50/50 border-amber-200 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/10"
          : isCompleted
          ? "bg-emerald-50/30 border-emerald-100 opacity-60"
          : isMissed
          ? "bg-red-50/30 border-red-100 opacity-60"
          : "bg-white border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200",
      )}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Time info */}
        <div className="flex flex-col items-center justify-center min-w-[56px] shrink-0 h-14 bg-zinc-50 rounded-xl border border-zinc-100 group-hover:bg-white transition-colors">
          <p className={cn(
            "text-sm font-black tabular-nums",
            isFirst ? "text-amber-600" : "text-zinc-900"
          )}>
            {item.startTime}
          </p>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
            {isFirst ? "Agora" : "Início"}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "text-[15px] font-black truncate",
              isFirst ? "text-zinc-900" : "text-zinc-700"
            )}>
              {item.clientName}
            </h3>
            {isFirst && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-0.5">
            {item.serviceName && (
              <p className="text-xs text-zinc-400 font-bold flex items-center gap-1.5 truncate">
                <Scissors size={11} className={isFirst ? "text-amber-500" : "text-zinc-300"} />
                {item.serviceName}
              </p>
            )}
            {item.serviceDuration && !isGeneral && (
              <p className="text-[10px] text-zinc-300 font-bold flex items-center gap-1">
                <Clock size={10} />
                {item.serviceDuration}m
              </p>
            )}
          </div>
        </div>

        {/* Status / Actions */}
        <div className="shrink-0 flex items-center gap-2">
           {isCompleted ? (
              <Badge color="success" size="sm" icon={<Check size={12} />}>Finalizado</Badge>
           ) : isMissed ? (
              <Badge color="danger" size="sm" icon={<X size={12} />}>Falta</Badge>
           ) : (
             <>
               {isFirst && !isGeneral && (
                 <Badge color="warning" size="sm" className="hidden sm:flex animate-bounce">A Seguir</Badge>
               )}
               
               {onStatusChange && (
                 <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onStatusChange(item.id, "performed")}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100 hover:border-emerald-500 shadow-sm shadow-emerald-500/5"
                      title="Finalizar atendimento"
                    >
                      <Check size={18} strokeWidth={3} />
                    </button>
                    {!isFirst && (
                        <button
                          onClick={() => onStatusChange(item.id, "missed")}
                          className="h-9 w-9 flex items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all border border-zinc-100 hover:border-red-100"
                          title="Marcar falta"
                        >
                          <UserMinus size={18} />
                        </button>
                    )}
                 </div>
               )}
             </>
           )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main PATQueue Component ──────────────────────────────────────────────────

export default function PATQueue() {
  const { professionalId, slug } = useParams<{ professionalId?: string; slug?: string }>();
  const isGeneralView = !!slug || professionalId === "all";
  const [data, setData] = useState<PatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const toast = useToast();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    else setRefreshing(true);

    try {
      const endpoint = isGeneralView 
        ? `/terminal/pat-general/${slug}` 
        : `/terminal/pat/${professionalId}`;
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Não foi possível carregar a fila.");
      
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao sincronizar fila");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGeneralView, professionalId, slug]);

  const updateStatus = async (apptId: string, status: string) => {
    try {
      const res = await fetch(`/terminal/pat-status/${apptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      
      toast.success(status === "performed" ? "Atendimento finalizado!" : "Falta registrada");
      fetchQueue(true); // reload
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  useEffect(() => {
    fetchQueue();
    // Refresh every 15 seconds for "real-time" feel as requested
    timerRef.current = setInterval(() => fetchQueue(true), 15_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchQueue]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFDFF]">
          <Loader2 size={40} className="animate-spin text-amber-500 mb-4" />
          <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Sincronizando Terminal PAT...</p>
      </div>
    );
  }

  if (!data?.patEnabled) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFDFF] p-6 text-center">
            <div className="w-20 h-20 bg-zinc-100 rounded-[32px] flex items-center justify-center mb-6 border border-zinc-200 shadow-inner">
                <Monitor size={32} className="text-zinc-400" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 mb-2">{data?.studio.name || "Estúdio"}</h1>
            <p className="text-sm text-zinc-400 font-medium max-w-xs">{data ? "O Terminal PAT está desativado para este estúdio." : "Terminal não encontrado."}</p>
        </div>
      );
  }

  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-zinc-900 font-sans pb-10">
      
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-zinc-100 px-4 sm:px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-950 rounded-2xl flex items-center justify-center shadow-lg shadow-zinc-900/10">
              <Scissors size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight truncate">{data.studio.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] sm:text-[11px] font-black text-zinc-400 uppercase tracking-widest">{todayLabel}</p>
                <div className="h-1 w-1 rounded-full bg-zinc-300" />
                <div className="flex items-center gap-1">
                  <span className={cn("h-1.5 w-1.5 rounded-full", refreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                  <p className="text-[10px] sm:text-[11px] font-bold text-zinc-400">
                    {refreshing ? "Sincronizando..." : `Atualizado ${format(lastUpdate, "HH:mm:ss")}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
                <p className="text-2xl font-black tabular-nums leading-none">{format(new Date(), "HH:mm")}</p>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-1">Terminal Ativo</p>
            </div>
            <button 
              onClick={() => fetchQueue(true)}
              className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all active:scale-95 shadow-sm"
              title="Atualizar agora"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 sm:p-8">
        
        {isGeneralView ? (
          // VISÃO GERAL (Grid de Todos Profissionais)
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                  <h2 className="text-2xl font-black tracking-tight">Painel Geral</h2>
                  <p className="text-sm text-zinc-500 font-medium">Acompanhamento em tempo real de toda a equipe</p>
               </div>
               <div className="flex items-center gap-2">
                  <Badge color="default" size="md" className="font-black">
                    <Users size={14} className="mr-2" /> {data.professionals?.length} Profissionais
                  </Badge>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {data.professionals?.map((prof) => {
                const upcoming = prof.queue.filter(q => q.status === "scheduled" || q.status === "confirmed");
                const next = upcoming.find(q => q.isNext);
                const doneCount = prof.queue.filter(q => q.status === "performed").length;

                return (
                  <PanelCard key={prof.id} className="flex flex-col h-full border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-zinc-50">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {prof.photo ? (
                            <img src={prof.photo} className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md" alt={prof.name} />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-amber-500/10">
                              {prof.name.charAt(0)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link to={`/pat/${prof.id}`} className="hover:text-amber-500 transition-colors">
                            <h3 className="text-lg font-black truncate">{prof.name}</h3>
                          </Link>
                          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest truncate">{prof.role ?? "Profissional"}</p>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-2xl font-black text-zinc-900">{upcoming.length}</p>
                           <p className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Pendente</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 p-5 space-y-3 bg-zinc-50/30">
                       {next ? (
                         <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-sm shadow-amber-500/5">
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                               <Sparkles size={10} /> Em atendimento / Próximo
                            </p>
                            <div className="flex items-center justify-between gap-3">
                               <p className="text-sm font-black text-zinc-900 truncate">{next.clientName}</p>
                               <p className="text-sm font-black text-amber-600 tabular-nums">{next.startTime}</p>
                            </div>
                         </div>
                       ) : upcoming.length > 0 ? (
                            <div className="p-4 rounded-2xl bg-white border border-zinc-100 text-center">
                                <p className="text-xs font-bold text-zinc-400 italic">Prepara-se para o próximo...</p>
                            </div>
                       ) : (
                          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                            <p className="text-xs font-black text-emerald-600">Sem agendamentos no momento</p>
                          </div>
                       )}

                       <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          <span>Realizados: {doneCount}</span>
                          <Link to={`/pat/${prof.id}`} className="flex items-center gap-1 text-amber-600 hover:text-amber-700">
                             Ver Fila <ChevronRight size={12} />
                          </Link>
                       </div>
                    </div>
                  </PanelCard>
                );
              })}
            </div>
          </div>
        ) : (
          // VISÃO EXCLUSIVA (Fila Detalhada do Profissional)
          <div className="max-w-[1000px] mx-auto space-y-6">
            
            <div className="flex items-center gap-4 mb-8">
               <Link to={`/pat/general/${data.studio.slug}`} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:border-zinc-200 transition-all shadow-sm">
                  <ArrowLeft size={18} />
               </Link>
               <div>
                  <h2 className="text-2xl font-black tracking-tight">Fila de Atendimento</h2>
                  <p className="text-sm text-zinc-500 font-medium">Controle seus atendimentos de hoje</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Sidebar: Stats + Profile */}
              <div className="lg:col-span-1 space-y-6">
                <PanelCard className="p-6 border-zinc-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 bg-amber-50 rounded-full translate-x-12 -translate-y-12 shrink-0 -z-10" />
                  
                  <div className="flex items-center gap-4 mb-6">
                    {data.professional?.photo ? (
                      <img src={data.professional.photo} className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" alt={data.professional.name} />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-amber-500/20">
                        {data.professional?.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">{getGreeting()}!</p>
                      <h1 className="text-xl font-black text-zinc-900 leading-tight">{data.professional?.name}</h1>
                      <p className="text-xs text-zinc-400 font-bold">{data.professional?.role ?? "Profissional"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-50">
                     <div className="p-3 bg-zinc-50 rounded-2xl text-center">
                        <p className="text-xl font-black">{data.queue?.filter(q => ["scheduled", "confirmed"].includes(q.status)).length}</p>
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">Pendentes</p>
                     </div>
                     <div className="p-3 bg-emerald-50 rounded-2xl text-center text-emerald-600">
                        <p className="text-xl font-black">{data.queue?.filter(q => q.status === "performed").length}</p>
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Realizados</p>
                     </div>
                  </div>
                </PanelCard>

                {/* Legend or Quick Tips */}
                <div className="p-5 rounded-3xl bg-amber-500 text-white shadow-xl shadow-amber-500/20 relative overflow-hidden">
                   <Scissors className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10" />
                   <h4 className="text-sm font-black mb-2 flex items-center gap-2">
                     <Clock size={16} /> Próximo Passo
                   </h4>
                   <p className="text-xs font-bold leading-relaxed opacity-90">
                     Clique no check verde para finalizar o atendimento atual. Isso manterá seu dashboard atualizado em tempo real.
                   </p>
                </div>
              </div>

              {/* Main Queue List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em]">Agenda do Dia</h3>
                </div>

                {!data.queue || data.queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white border-2 border-dashed border-zinc-100 rounded-[32px]">
                    <CheckCircle2 size={48} className="text-emerald-100 mb-4" />
                    <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Tudo pronto por aqui!</p>
                    <p className="text-xs text-zinc-300 font-bold mt-1">Nenhum atendimento agendado para hoje.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {data.queue.map((item, i) => (
                        <AppointmentCard 
                          key={item.id} 
                          item={item} 
                          index={i} 
                          onStatusChange={updateStatus}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <div className="pt-8 text-center">
                    <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">
                      Glow & Cut • Terminal PAT v2.0
                    </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Floating Action for Admin (optional, but requested for tablets) */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-md opacity-90 hover:opacity-100 transition-opacity">
         <div className="flex items-center gap-2 pr-4 border-r border-white/10 mr-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest">Modo Monitor</p>
         </div>
         <p className="text-[10px] font-bold text-zinc-400">Pressione F11 para tela cheia</p>
      </footer>

    </div>
  );
}
