import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import {
  Scissors, Clock, User, CheckCircle, RefreshCw,
  Loader2, AlertCircle, Calendar, ChevronRight,
  Package, Sparkles, Users, Timer, ArrowLeft,
  Check, X, UserMinus, Monitor, AppWindow, LayoutGrid,
  MoreVertical, ChevronDown, CheckCircle2, Moon, Sun,
  Filter, Grid, List, Search
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
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
  professional?: { id: string; name: string; role: string; photo: string | null };
  queue?: QueueItem[];
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
  darkMode = false,
}: {
  item: QueueItem;
  index: number;
  onStatusChange?: (id: string, status: string) => void;
  isGeneral?: boolean;
  darkMode?: boolean;
}) {
  const isFirst = item.isNext;
  const isCompleted = item.status === "performed";
  const isMissed = item.status === "missed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "group relative rounded-2xl border overflow-hidden transition-all duration-300",
        isFirst
          ? darkMode 
            ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/20"
            : "bg-amber-50/80 border-amber-200 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/10"
          : isCompleted
          ? darkMode ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" : "bg-emerald-50/30 border-emerald-100 opacity-60"
          : isMissed
          ? darkMode ? "bg-red-500/5 border-red-500/20 opacity-60" : "bg-red-50/30 border-red-100 opacity-60"
          : darkMode 
            ? "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 shadow-sm"
            : "bg-white border-zinc-100 shadow-sm hover:shadow-md hover:border-zinc-200",
      )}
    >
      <div className="flex items-center gap-4 p-4 sm:p-5">
        {/* Time info */}
        <div className={cn(
          "flex flex-col items-center justify-center min-w-[64px] shrink-0 h-16 rounded-xl border transition-colors",
          darkMode 
            ? isFirst ? "bg-amber-500/20 border-amber-500/30" : "bg-zinc-900 border-zinc-700 group-hover:bg-zinc-800"
            : isFirst ? "bg-amber-100 border-amber-200" : "bg-zinc-50 border-zinc-100 group-hover:bg-white"
        )}>
          <p className={cn(
            "text-base font-black tabular-nums tracking-tight",
            isFirst 
              ? darkMode ? "text-amber-400" : "text-amber-600"
              : darkMode ? "text-zinc-100" : "text-zinc-900"
          )}>
            {item.startTime}
          </p>
          <p className={cn(
            "text-[9px] font-black uppercase tracking-widest mt-0.5",
            isFirst 
              ? darkMode ? "text-amber-500/70" : "text-amber-500"
              : "text-zinc-400"
          )}>
            {isFirst ? "Agora" : "Início"}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "text-base sm:text-lg font-black truncate tracking-tight",
              darkMode ? "text-zinc-100" : "text-zinc-900",
              (isCompleted || isMissed) && "line-through opacity-50"
            )}>
              {item.clientName}
            </h3>
            {isFirst && !isCompleted && !isMissed && (
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0 ring-4 ring-amber-500/20" />
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            {item.serviceName && (
              <p className={cn(
                "text-xs font-bold flex items-center gap-2 truncate",
                darkMode ? "text-zinc-400" : "text-zinc-500"
              )}>
                <Scissors size={12} className={isFirst ? "text-amber-500" : darkMode ? "text-zinc-500" : "text-zinc-400"} />
                {item.serviceName}
              </p>
            )}
            {item.serviceDuration && !isGeneral && (
              <p className={cn(
                "text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border",
                darkMode ? "text-zinc-500 border-zinc-700 bg-zinc-900/50" : "text-zinc-400 border-zinc-100 bg-zinc-50"
              )}>
                <Clock size={10} />
                {item.serviceDuration} min
              </p>
            )}
          </div>
        </div>

        {/* Status / Actions */}
        <div className="shrink-0 flex items-center gap-2">
           {isCompleted ? (
              <Badge color="success" size="md" icon={<Check size={14} />}>Finalizado</Badge>
           ) : isMissed ? (
              <Badge color="danger" size="md" icon={<X size={14} />}>Falta</Badge>
           ) : (
             <div className="flex items-center gap-2">
               {isFirst && !isGeneral && (
                 <Badge color="warning" size="md" className="hidden sm:flex animate-bounce ring-4 ring-amber-500/10">Em Fila</Badge>
               )}
               
               {onStatusChange && (
                 <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStatusChange(item.id, "performed")}
                      className={cn(
                        "h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-lg",
                        darkMode 
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white shadow-emerald-500/10" 
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100 hover:border-emerald-500 shadow-emerald-500/5"
                      )}
                      title="Finalizar atendimento"
                    >
                      <Check size={20} strokeWidth={3} />
                    </button>
                    {!isFirst && (
                        <button
                          onClick={() => onStatusChange(item.id, "missed")}
                          className={cn(
                            "h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-2xl transition-all active:scale-95 border",
                            darkMode 
                              ? "bg-zinc-900 text-zinc-500 border-zinc-700 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                              : "bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100"
                          )}
                          title="Marcar falta"
                        >
                          <UserMinus size={20} />
                        </button>
                    )}
                 </div>
               )}
             </div>
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
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("pat-theme");
    return saved === "dark";
  });
  const [filterProf, setFilterProf] = useState<string>("all");
  const [currentTime, setCurrentTime] = useState(new Date());

  const toast = useToast();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleTheme = () => {
    setDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem("pat-theme", newVal ? "dark" : "light");
      return newVal;
    });
  };

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
    // Refresh every 30 seconds for "real-time" feel
    timerRef.current = setInterval(() => fetchQueue(true), 30_000);
    // Local clock update
    clockRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, [fetchQueue]);

  const filteredProfessionals = useMemo(() => {
    if (!data?.professionals) return [];
    if (filterProf === "all") return data.professionals;
    return data.professionals.filter(p => p.id === filterProf);
  }, [data?.professionals, filterProf]);

  if (loading) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center min-h-screen transition-colors duration-500",
        darkMode ? "bg-zinc-950" : "bg-[#FDFDFF]"
      )}>
          <div className="relative">
            <Loader2 size={48} className="animate-spin text-amber-500 mb-6" />
            <div className="absolute inset-0 blur-2xl bg-amber-500/20 animate-pulse" />
          </div>
          <p className={cn(
            "text-sm font-black uppercase tracking-[0.3em] animate-pulse",
            darkMode ? "text-zinc-500" : "text-zinc-400"
          )}>
            Sincronizando Terminal Agendelle...
          </p>
      </div>
    );
  }

  if (!data?.patEnabled) {
      return (
        <div className={cn(
          "flex flex-col items-center justify-center min-h-screen p-6 text-center transition-colors duration-500",
          darkMode ? "bg-zinc-950 text-white" : "bg-[#FDFDFF] text-zinc-900"
        )}>
            <div className={cn(
              "w-24 h-24 rounded-[40px] flex items-center justify-center mb-8 border shadow-xl",
              darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-500" : "bg-white border-zinc-100 text-zinc-400"
            )}>
                <Monitor size={40} className="animate-bounce" />
            </div>
            <h1 className="text-2xl font-black mb-3 tracking-tight">{data?.studio.name || "Terminal PAT"}</h1>
            <p className={cn(
              "text-sm font-medium max-w-xs leading-relaxed opacity-60",
              darkMode ? "text-zinc-400" : "text-zinc-500"
            )}>
              {data ? "O Terminal PAT está desativado nas configurações." : "Terminal não encontrado ou link expirado."}
            </p>
            <Button variant="outline" className="mt-8" onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </div>
      );
  }

  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className={cn(
      "min-h-screen font-sans pb-24 transition-colors duration-500",
      darkMode ? "bg-zinc-950 text-zinc-100" : "bg-[#FDFDFF] text-zinc-900"
    )}>
      
      {/* ── Top Header ── */}
      <header className={cn(
        "sticky top-0 z-50 backdrop-blur-xl border-b px-4 sm:px-8 py-4 transition-all duration-300",
        darkMode ? "bg-zinc-950/80 border-zinc-800/50 shadow-2xl shadow-black/20" : "bg-white/80 border-zinc-100 shadow-sm"
      )}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-transform active:scale-90",
              darkMode ? "bg-amber-500 text-zinc-950 shadow-amber-500/20" : "bg-zinc-950 text-white shadow-zinc-900/10"
            )}>
              <Scissors size={24} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate leading-none">{data.studio.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                <p className={cn(
                  "text-[10px] sm:text-[11px] font-black uppercase tracking-widest whitespace-nowrap",
                  darkMode ? "text-zinc-500" : "text-zinc-400"
                )}>
                  {todayLabel}
                </p>
                <div className={cn("h-1 w-1 rounded-full shrink-0", darkMode ? "bg-zinc-700" : "bg-zinc-300")} />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", refreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                  <p className={cn(
                    "text-[10px] font-bold truncate",
                    darkMode ? "text-zinc-500" : "text-zinc-400"
                  )}>
                    {refreshing ? "Sincronizando..." : `Sync: ${format(lastUpdate, "HH:mm:ss")}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden lg:flex flex-col items-end mr-4">
                <p className="text-3xl font-black tabular-nums leading-none tracking-tighter">{format(currentTime, "HH:mm:ss")}</p>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                   Terminal Ativo
                </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className={cn(
                  "p-3 rounded-2xl border transition-all active:scale-95 shadow-sm",
                  darkMode ? "bg-zinc-900 border-zinc-800 text-amber-400 hover:bg-zinc-800" : "bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-100"
                )}
                title="Alternar tema"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <button 
                onClick={() => fetchQueue(true)}
                className={cn(
                  "p-3 rounded-2xl border transition-all active:scale-95 shadow-sm",
                  darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" : "bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                )}
                title="Atualizar agora"
              >
                <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-8">
        
        {isGeneralView ? (
          // VISÃO GERAL (Grid de Todos Profissionais)
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black tracking-tight">Painel de Acompanhamento</h2>
                    <Badge color="primary" size="sm" className="font-black ring-4 ring-amber-500/10">Ao Vivo</Badge>
                  </div>
                  <p className={cn("text-base font-medium opacity-60", darkMode ? "text-zinc-400" : "text-zinc-500")}>
                    Gestão centralizada de atendimentos em tempo real.
                  </p>
               </div>
               
               {/* Professional Filter Chips */}
               <div className={cn(
                 "p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar",
                 darkMode ? "bg-zinc-900/50 border border-zinc-800" : "bg-zinc-100/50 border border-zinc-200/50"
               )}>
                  <button
                    onClick={() => setFilterProf("all")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      filterProf === "all" 
                        ? darkMode ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20" : "bg-zinc-900 text-white shadow-lg"
                        : "text-zinc-500 hover:opacity-70"
                    )}
                  >
                    Todos
                  </button>
                  {data.professionals?.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setFilterProf(p.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                        filterProf === p.id 
                          ? darkMode ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20" : "bg-zinc-900 text-white shadow-lg"
                          : darkMode ? "text-zinc-400 hover:bg-zinc-800" : "text-zinc-500 hover:bg-white shadow-sm"
                      )}
                    >
                      {p.photo && <img src={p.photo} className="w-4 h-4 rounded-full object-cover" />}
                      {p.name.split(" ")[0]}
                    </button>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredProfessionals.map((prof) => {
                  const upcoming = prof.queue.filter(q => q.status === "scheduled" || q.status === "confirmed");
                  const next = upcoming.find(q => q.isNext);
                  const doneCount = prof.queue.filter(q => q.status === "performed").length;
                  const missedCount = prof.queue.filter(q => q.status === "missed").length;

                  return (
                    <motion.div
                      layout
                      key={prof.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        "group flex flex-col h-full rounded-[32px] border overflow-hidden transition-all duration-500",
                        darkMode 
                          ? "bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/60 hover:border-zinc-700 shadow-2xl shadow-black/20" 
                          : "bg-white border-zinc-100 shadow-sm hover:shadow-2xl hover:shadow-zinc-200/50"
                      )}
                    >
                      <div className="p-6 border-b border-zinc-100/10">
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                            {prof.photo ? (
                              <img src={prof.photo} className="w-16 h-16 rounded-[22px] object-cover border-2 border-white shadow-xl" alt={prof.name} />
                            ) : (
                              <div className={cn(
                                "w-16 h-16 rounded-[22px] flex items-center justify-center text-2xl font-black text-white shadow-xl",
                                darkMode ? "bg-zinc-800" : "bg-amber-500"
                              )}>
                                {prof.name.charAt(0)}
                              </div>
                            )}
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link to={`/pat/${prof.id}`} className={cn("hover:text-amber-500 transition-colors block", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                              <h3 className="text-xl font-black truncate tracking-tight">{prof.name}</h3>
                            </Link>
                            <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", darkMode ? "text-zinc-500" : "text-zinc-400")}>
                              {prof.role ?? "Profissional"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={cn(
                        "flex-1 p-6 space-y-4",
                        darkMode ? "bg-zinc-950/20" : "bg-zinc-50/30"
                      )}>
                         {next ? (
                           <div className={cn(
                             "p-5 rounded-[24px] border transition-all group-hover:scale-[1.02]",
                             darkMode ? "bg-zinc-900/80 border-amber-500/20 shadow-xl" : "bg-white border-amber-100 shadow-md shadow-amber-500/5"
                           )}>
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                   <Sparkles size={12} className="animate-pulse" /> Em Fila
                                </p>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={(e) => { e.preventDefault(); updateStatus(next.id, "performed"); }}
                                    className={cn(
                                      "p-1.5 rounded-lg border transition-all active:scale-90",
                                      darkMode ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white" : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                                    )}
                                    title="Finalizar"
                                  >
                                    <Check size={14} strokeWidth={3} />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.preventDefault(); updateStatus(next.id, "missed"); }}
                                    className={cn(
                                      "p-1.5 rounded-lg border transition-all active:scale-90",
                                      darkMode ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white" : "bg-red-50 border-red-100 text-red-600 hover:bg-red-500 hover:text-white"
                                    )}
                                    title="Falta"
                                  >
                                    <X size={14} strokeWidth={3} />
                                  </button>
                                </div>
                              </div>
                              <p className={cn("text-base font-black truncate tracking-tight", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                                {next.clientName}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                {next.serviceName ? (
                                  <p className={cn("text-xs font-bold opacity-60 truncate", darkMode ? "text-zinc-400" : "text-zinc-500")}>
                                    {next.serviceName}
                                  </p>
                                ) : <div />}
                                <p className="text-xs font-black text-amber-500 tabular-nums">{next.startTime}</p>
                              </div>
                           </div>
                         ) : upcoming.length > 0 ? (
                              <div className={cn(
                                "p-6 rounded-[24px] border border-dashed flex flex-col items-center justify-center text-center",
                                darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200"
                              )}>
                                  <Timer size={24} className={darkMode ? "text-zinc-700" : "text-zinc-200"} />
                                  <p className={cn("text-xs font-bold mt-3 italic", darkMode ? "text-zinc-600" : "text-zinc-400")}>Aguardando próximo...</p>
                              </div>
                         ) : (
                            <div className={cn(
                              "p-6 rounded-[24px] border flex flex-col items-center justify-center text-center",
                              darkMode ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50/50 border-emerald-100"
                            )}>
                              <CheckCircle2 size={24} className="text-emerald-500 opacity-40 mb-2" />
                              <p className="text-xs font-black text-emerald-500/70 uppercase tracking-widest">Sem Agenda</p>
                            </div>
                         )}

                         <div className={cn(
                           "mt-6 pt-6 border-t flex items-center justify-between",
                           darkMode ? "border-zinc-800" : "border-zinc-100"
                         )}>
                            <div className="flex gap-4">
                              <div className="text-center">
                                <p className={cn("text-sm font-black", darkMode ? "text-zinc-300" : "text-zinc-700")}>{doneCount}</p>
                                <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">Ok</p>
                              </div>
                              <div className="text-center">
                                <p className={cn("text-sm font-black", missedCount > 0 ? "text-red-500" : darkMode ? "text-zinc-300" : "text-zinc-700")}>{missedCount}</p>
                                <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">Faltas</p>
                              </div>
                              <div className="text-center">
                                <p className={cn("text-sm font-black", darkMode ? "text-zinc-300" : "text-zinc-700")}>{upcoming.length}</p>
                                <p className="text-[8px] font-black uppercase text-zinc-500 tracking-tighter">Fila</p>
                              </div>
                            </div>
                            <Link 
                              to={`/pat/${prof.id}`} 
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                darkMode ? "bg-zinc-800 text-amber-500 hover:bg-zinc-700" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                              )}
                            >
                               Ver <ChevronRight size={14} />
                            </Link>
                         </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // VISÃO EXCLUSIVA (Fila Detalhada do Profissional)
          <div className="max-w-[1200px] mx-auto space-y-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                 <Link 
                   to={`/pat/general/${data.studio.slug}`} 
                   className={cn(
                     "h-12 w-12 flex items-center justify-center rounded-2xl border transition-all active:scale-90 shadow-sm shrink-0",
                     darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100" : "bg-white border-zinc-200 text-zinc-400 hover:text-zinc-900"
                   )}
                 >
                    <ArrowLeft size={22} />
                 </Link>
                 <div>
                    <h2 className="text-3xl font-black tracking-tight leading-none">Fila Individual</h2>
                    <p className={cn("text-base font-medium mt-1.5 opacity-60", darkMode ? "text-zinc-400" : "text-zinc-500")}>Acompanhe sua agenda do dia.</p>
                 </div>
              </div>

              {/* Status Header Bar */}
              <div className={cn(
                "hidden md:flex items-center gap-8 p-4 rounded-3xl border",
                darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-200/50"
              )}>
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pendentes: <span className={darkMode ? "text-zinc-100" : "text-zinc-900"}>{data.queue?.filter(q => ["scheduled", "confirmed"].includes(q.status)).length}</span></p>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Realizados: <span className={darkMode ? "text-zinc-100" : "text-zinc-900"}>{data.queue?.filter(q => q.status === "performed").length}</span></p>
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Faltas: <span className={darkMode ? "text-zinc-100" : "text-zinc-900"}>{data.queue?.filter(q => q.status === "missed").length}</span></p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Sidebar: Profile */}
              <div className="lg:col-span-4 space-y-6">
                <div className={cn(
                  "p-8 rounded-[40px] border shadow-2xl relative overflow-hidden transition-all duration-500",
                  darkMode ? "bg-zinc-900 border-zinc-800 shadow-black/40" : "bg-white border-zinc-100 shadow-zinc-200/50"
                )}>
                  <div className={cn(
                    "absolute top-0 right-0 p-12 rounded-full translate-x-12 -translate-y-12 shrink-0 -z-10",
                    darkMode ? "bg-amber-500/5" : "bg-amber-50"
                  )} />
                  
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      {data.professional?.photo ? (
                        <img src={data.professional.photo} className="w-32 h-32 rounded-[40px] object-cover border-4 border-white shadow-2xl" alt={data.professional.name} />
                      ) : (
                        <div className={cn(
                          "w-32 h-32 rounded-[40px] flex items-center justify-center text-5xl font-black text-white shadow-2xl",
                          darkMode ? "bg-zinc-800" : "bg-amber-500"
                        )}>
                          {data.professional?.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg">
                         <CheckCircle size={20} className="text-white" />
                      </div>
                    </div>
                    
                    <p className={cn("text-xs font-black uppercase tracking-[0.4em] mb-2", darkMode ? "text-zinc-500" : "text-amber-500")}>
                      {getGreeting()}!
                    </p>
                    <h1 className={cn("text-3xl font-black tracking-tight", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                      {data.professional?.name}
                    </h1>
                    <p className={cn("text-sm font-bold mt-1 opacity-60", darkMode ? "text-zinc-400" : "text-zinc-500")}>
                      {data.professional?.role ?? "Profissional Parceiro"}
                    </p>
                  </div>

                  <div className={cn(
                    "grid grid-cols-2 gap-4 mt-10 pt-10 border-t",
                    darkMode ? "border-zinc-800" : "border-zinc-50"
                  )}>
                     <div className={cn("p-4 rounded-3xl text-center", darkMode ? "bg-zinc-950/50" : "bg-zinc-50")}>
                        <p className={cn("text-3xl font-black", darkMode ? "text-zinc-100" : "text-zinc-900")}>
                          {data.queue?.filter(q => ["scheduled", "confirmed"].includes(q.status)).length}
                        </p>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Pendentes</p>
                     </div>
                     <div className={cn("p-4 rounded-3xl text-center", darkMode ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
                        <p className="text-3xl font-black">
                          {data.queue?.filter(q => q.status === "performed").length}
                        </p>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest mt-1", darkMode ? "text-emerald-500/60" : "text-emerald-400")}>Realizados</p>
                     </div>
                  </div>
                </div>

                <div className={cn(
                  "p-8 rounded-[40px] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500",
                  darkMode ? "bg-amber-600 text-zinc-950" : "bg-amber-500 text-white"
                )}>
                   <Scissors className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                   <h4 className="text-lg font-black mb-3 flex items-center gap-3">
                     <Clock size={20} /> Modo Operacional
                   </h4>
                   <p className="text-sm font-bold leading-relaxed opacity-90">
                     Ao finalizar um atendimento, clique no botão verde para atualizar o painel geral da recepção e notificar o sistema.
                   </p>
                </div>
              </div>

              {/* Main Queue List */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className={cn("text-sm font-black uppercase tracking-[0.4em]", darkMode ? "text-zinc-500" : "text-zinc-400")}>Agenda do Dia</h3>
                  {refreshing && <Loader2 size={16} className="animate-spin text-amber-500" />}
                </div>

                {!data.queue || data.queue.length === 0 ? (
                  <div className={cn(
                    "flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-[48px] transition-colors",
                    darkMode ? "bg-zinc-900/20 border-zinc-800" : "bg-white border-zinc-100"
                  )}>
                    <div className={cn(
                      "w-24 h-24 rounded-full flex items-center justify-center mb-6",
                      darkMode ? "bg-zinc-900" : "bg-emerald-50"
                    )}>
                      <CheckCircle2 size={48} className="text-emerald-500 opacity-40" />
                    </div>
                    <p className={cn("text-lg font-black tracking-tight", darkMode ? "text-zinc-400" : "text-zinc-500")}>Nenhum agendamento hoje</p>
                    <p className={cn("text-sm font-bold mt-1 opacity-50", darkMode ? "text-zinc-600" : "text-zinc-400")}>Tudo tranquilo por aqui!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                      {data.queue.map((item, i) => (
                        <AppointmentCard 
                          key={item.id} 
                          item={item} 
                          index={i} 
                          onStatusChange={updateStatus}
                          darkMode={darkMode}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <div className="pt-12 text-center">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-[0.5em] opacity-30",
                      darkMode ? "text-zinc-500" : "text-zinc-400"
                    )}>
                      Agendelle Intelligence • Terminal PAT v3.0
                    </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Floating Status Bar */}
      <footer className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-6 border backdrop-blur-xl transition-all duration-500",
        darkMode ? "bg-zinc-900/90 border-zinc-800 text-white shadow-black" : "bg-zinc-950/90 border-white/10 text-white shadow-zinc-900/20"
      )}>
         <div className="flex items-center gap-3 pr-6 border-r border-white/10">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 blur-sm animate-ping" />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Monitoramento Ativo</p>
         </div>
         <p className="hidden sm:block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pressione F11 para Tela Cheia</p>
         
         <div className="flex items-center gap-2 pl-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", darkMode ? "bg-zinc-700" : "bg-white/20")} />
            <p className="text-[10px] font-black tabular-nums opacity-60">{format(currentTime, "HH:mm")}</p>
         </div>
      </footer>

    </div>
  );
}
