import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import {
  Scissors, Clock, User, CheckCircle, RefreshCw,
  Loader2, AlertCircle, Calendar, ChevronRight,
  Package, Sparkles, Users, Timer,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ── types ─────────────────────────────────────────────────────────────────────

interface QueueItem {
  position: number;
  id: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "confirmed";
  clientName: string;
  clientPhone: string | null;
  serviceName: string | null;
  serviceType: string | null;
  serviceDuration: number | null;
  servicePrice: number | null;
  isNext: boolean;
  isPast: boolean;
}

interface PatData {
  patEnabled: boolean;
  showClientName: boolean;
  showService: boolean;
  showTime: boolean;
  professional: { id: string; name: string; role: string };
  studio: { name: string; slug: string };
  date: string;
  queue: QueueItem[];
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ item }: { item: QueueItem }) {
  const now = format(new Date(), "HH:mm");
  if (item.isNext && item.startTime <= now) {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-amber-500 text-white uppercase tracking-widest animate-pulse">
        <Sparkles size={9} /> Atendendo
      </span>
    );
  }
  if (item.isNext) {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-widest">
        <ChevronRight size={9} /> Próximo
      </span>
    );
  }
  if (item.isPast) {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-zinc-100 text-zinc-400 uppercase tracking-widest">
        <Clock size={9} /> Aguardando
      </span>
    );
  }
  return null;
}

// ── Queue card ────────────────────────────────────────────────────────────────

function AppointmentCard({ item, index }: { item: QueueItem; index: number }) {
  const isFirst = item.isNext;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={cn(
        "relative rounded-2xl border overflow-hidden transition-all",
        isFirst
          ? "bg-amber-50 border-amber-200 shadow-md shadow-amber-100"
          : item.isPast
          ? "bg-zinc-50/60 border-zinc-200 opacity-60"
          : "bg-white border-zinc-200 shadow-sm",
      )}
    >
      {/* Left accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl",
        isFirst ? "bg-amber-500" : "bg-zinc-200",
      )} />

      <div className="flex items-center gap-4 px-5 py-4 pl-6">
        {/* Position */}
        <div className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-black",
          isFirst ? "bg-amber-500 text-white shadow-lg shadow-amber-200" : "bg-zinc-100 text-zinc-400",
        )}>
          {item.position}
        </div>

        {/* Client + Service */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              "text-base font-black truncate",
              isFirst ? "text-zinc-900" : "text-zinc-700",
            )}>
              {item.clientName}
            </p>
            <StatusChip item={item} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            {item.serviceName && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
                <Scissors size={11} className="shrink-0 text-amber-500" />
                {item.serviceName}
              </span>
            )}
            {item.serviceDuration && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <Timer size={11} className="shrink-0" />
                {item.serviceDuration} min
              </span>
            )}
          </div>
        </div>

        {/* Time */}
        <div className="shrink-0 text-right">
          <p className={cn(
            "text-lg font-black tabular-nums",
            isFirst ? "text-amber-600" : "text-zinc-600",
          )}>
            {item.startTime}
          </p>
          {item.endTime && (
            <p className="text-[10px] text-zinc-400 font-bold">até {item.endTime}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ queue }: { queue: QueueItem[] }) {
  const now = format(new Date(), "HH:mm");
  const done  = queue.filter(q => q.startTime < now && !q.isNext).length;
  const remaining = queue.filter(q => !q.isPast || q.isNext).length;
  const totalMin = queue.reduce((s, q) => s + (q.serviceDuration || 0), 0);

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Na fila", value: queue.length, icon: <Users size={16} />, color: "text-zinc-900", bg: "bg-zinc-50", border: "border-zinc-200" },
        { label: "Restantes", value: remaining, icon: <ChevronRight size={16} />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
        { label: "Total (min)", value: totalMin, icon: <Timer size={16} />, color: "text-zinc-700", bg: "bg-zinc-50", border: "border-zinc-200" },
      ].map(s => (
        <div key={s.label} className={cn("rounded-2xl border p-3 sm:p-4 shadow-sm", s.bg, s.border)}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</p>
            <span className="opacity-30">{s.icon}</span>
          </div>
          <p className={cn("text-2xl font-black", s.color)}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main PATQueue page ────────────────────────────────────────────────────────

export default function PATQueue() {
  const { professionalId } = useParams<{ professionalId: string }>();
  const [data, setData] = useState<PatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async (silent = false) => {
    if (!professionalId) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/pat/${professionalId}`);
      if (!res.ok) throw new Error("Não foi possível carregar a fila.");
      const json: PatData = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    fetchQueue();
    intervalRef.current = setInterval(() => fetchQueue(true), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchQueue]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="animate-spin text-amber-500" />
          <p className="text-sm font-bold text-zinc-400">Carregando fila do dia...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 px-6">
        <div className="text-center space-y-4">
          <AlertCircle size={48} className="mx-auto text-zinc-300" />
          <p className="text-sm font-bold text-zinc-500">{error || "Fila não encontrada."}</p>
          <button
            onClick={() => fetchQueue()}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ── PAT desabilitado ──
  if (!data.patEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 px-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-zinc-100">
            <Scissors size={28} className="text-zinc-400" />
          </div>
          <h1 className="text-lg font-black text-zinc-700">{data.studio.name}</h1>
          <p className="text-sm text-zinc-400 font-medium">Terminal PAT não está ativo.</p>
          <p className="text-xs text-zinc-300">Ative o PAT nas configurações da agenda.</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dateLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const nextItem = data.queue.find(q => q.isNext);

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── Header ── */}
      <div className="bg-white border-b border-zinc-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Studio logo / icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500">
              <Scissors size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest truncate">{data.studio.name}</p>
              <p className="text-sm font-black text-zinc-900 truncate capitalize">{dateLabel}</p>
            </div>
          </div>

          {/* Refresh + clock */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-lg font-black text-zinc-900 tabular-nums">
                {format(new Date(), "HH:mm")}
              </p>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                Atualizado às {format(lastRefresh, "HH:mm:ss")}
              </p>
            </div>
            <button
              onClick={() => fetchQueue(true)}
              className="p-2.5 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-all border border-zinc-200"
              title="Atualizar fila"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* ── Professional banner ── */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 text-2xl font-black text-amber-600">
            {data.professional.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">
              {getGreeting()},
            </p>
            <p className="text-xl font-black text-zinc-900 truncate">{data.professional.name}</p>
            {data.professional.role && (
              <p className="text-xs text-zinc-400 font-bold">{data.professional.role}</p>
            )}
          </div>
          <div className="shrink-0 text-center">
            <p className="text-3xl font-black text-zinc-900">{data.queue.length}</p>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
              {data.queue.length === 1 ? "atend." : "atend."}
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        <SummaryBar queue={data.queue} />

        {/* ── Next call highlight ── */}
        {nextItem && (
          <motion.div
            key={nextItem.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-75 mb-2 flex items-center gap-1">
                <Sparkles size={10} /> Próximo atendimento
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-black truncate">{nextItem.clientName}</p>
                  {nextItem.serviceName && (
                    <p className="text-sm font-bold opacity-80 flex items-center gap-1.5 mt-0.5">
                      <Scissors size={12} /> {nextItem.serviceName}
                      {nextItem.serviceDuration ? ` · ${nextItem.serviceDuration} min` : ""}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-3xl font-black tabular-nums">{nextItem.startTime}</p>
                  {nextItem.endTime && (
                    <p className="text-xs font-bold opacity-70">até {nextItem.endTime}</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Full queue list ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={11} /> Todos os atendimentos de hoje
            </p>
          </div>

          {data.queue.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
              <CheckCircle size={40} className="mx-auto mb-3 text-emerald-200" />
              <p className="text-sm font-black text-zinc-400">Nenhum atendimento agendado para hoje</p>
              <p className="text-xs text-zinc-300 mt-1">Descanse, você está em dia! 🎉</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2.5">
                {data.queue.map((item, i) => (
                  <AppointmentCard key={item.id} item={item} index={i} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-300 font-bold uppercase tracking-widest pb-4">
          Terminal PAT · {data.studio.name} · Atualiza a cada 30 seg
        </p>
      </div>
    </div>
  );
}
