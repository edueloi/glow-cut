import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock, Scissors, User, CheckCircle, RefreshCw, Phone,
  ChevronRight, Loader2, Eye, EyeOff, Lock, LogOut,
  Calendar, Users, Sparkles, AlertCircle,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2)  return d;
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return d;
}

// ── types ─────────────────────────────────────────────────────────────────────

interface QueueItem {
  position: number;
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  clientName: string | null;
  clientPhone: string | null;
  serviceName: string | null;
  serviceDuration: number | null;
  isNext: boolean;
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

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ position, isNext }: { position: number; isNext: boolean }) {
  if (isNext) {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-widest animate-pulse">
        <Sparkles size={9} /> Próximo
      </span>
    );
  }
  return null;
}

// ── Queue card ────────────────────────────────────────────────────────────────

function QueueCard({
  item,
  showClientName,
  showService,
  showTime,
  isMyPosition,
}: {
  item: QueueItem;
  showClientName: boolean;
  showService: boolean;
  showTime: boolean;
  isMyPosition: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "relative flex items-center gap-4 rounded-2xl border p-4 transition-all shadow-sm",
        item.isNext
          ? "bg-amber-50 border-amber-200 shadow-amber-100"
          : isMyPosition
          ? "bg-violet-50 border-violet-200"
          : "bg-white border-zinc-200",
      )}
    >
      {/* Position number */}
      <div className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black",
        item.isNext
          ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
          : isMyPosition
          ? "bg-violet-500 text-white"
          : "bg-zinc-100 text-zinc-500",
      )}>
        {item.position}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {showClientName && item.clientName && (
          <p className={cn(
            "text-sm font-black truncate",
            item.isNext ? "text-amber-800" : isMyPosition ? "text-violet-800" : "text-zinc-800",
          )}>
            {item.clientName}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
          {showService && item.serviceName && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-bold">
              <Scissors size={10} className="shrink-0" />
              {item.serviceName}
            </span>
          )}
          {showTime && item.startTime && (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-bold">
              <Clock size={10} className="shrink-0" />
              {item.startTime}{item.endTime ? ` – ${item.endTime}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Badge */}
      <div className="shrink-0">
        {item.isNext && <StatusBadge position={item.position} isNext />}
        {isMyPosition && !item.isNext && (
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-widest">
            <User size={9} /> Você
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({
  onLogin,
  studioName,
}: {
  onLogin: (phone: string) => void;
  studioName: string;
}) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(phone);
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-zinc-50"
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Studio */}
        <div className="text-center space-y-2">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-amber-500 shadow-xl shadow-amber-200">
            <Scissors size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-zinc-900">{studioName}</h1>
          <p className="text-sm text-zinc-500 font-medium">Fila de atendimento</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
              <Lock size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-900">Entrar na fila</p>
              <p className="text-xs text-zinc-400">Informe seu telefone para ver sua posição</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">
                Seu telefone / WhatsApp
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  inputMode="numeric"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.replace(/\D/g, "").length < 10}
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-black text-sm rounded-xl transition-all shadow-sm"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
              {loading ? "Buscando..." : "Ver minha posição"}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-zinc-400 font-medium">
          Apenas para visualização. Não compartilhamos seus dados.
        </p>
      </div>
    </motion.div>
  );
}

// ── Main PATQueue page ────────────────────────────────────────────────────────

export default function PATQueue() {
  const { professionalId } = useParams<{ professionalId: string }>();
  const [data, setData] = useState<PatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myPhone, setMyPhone] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
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
    // Auto-refresh a cada 30 segundos
    intervalRef.current = setInterval(() => fetchQueue(true), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchQueue]);

  // Detecta a posição do usuário na fila pelo telefone
  const myPosition = myPhone && data
    ? data.queue.find((q) => {
        const a = (q.clientPhone || "").replace(/\D/g, "");
        const b = myPhone.replace(/\D/g, "");
        return a && b && a === b;
      })
    : null;

  // Quantos na frente
  const ahead = myPosition ? myPosition.position - 1 : null;

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-amber-500" />
          <p className="text-sm font-bold text-zinc-400">Carregando fila...</p>
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
          <button onClick={() => fetchQueue()} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold">
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
          <p className="text-sm text-zinc-400 font-medium">
            O terminal de fila de espera não está ativo no momento.
          </p>
        </div>
      </div>
    );
  }

  // ── Login ──
  if (!loggedIn) {
    return (
      <LoginForm
        studioName={data.studio.name}
        onLogin={(phone) => {
          setMyPhone(phone);
          setLoggedIn(true);
        }}
      />
    );
  }

  // ── Fila principal ──
  const today = new Date();
  const dateLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500">
              <Scissors size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900 truncate">{data.studio.name}</p>
              <p className="text-[10px] text-zinc-400 font-bold capitalize">{dateLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchQueue(true)}
              className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-all"
              title="Atualizar"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => { setLoggedIn(false); setMyPhone(null); }}
              className="p-2 rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* ── Profissional ── */}
        <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 text-lg font-black text-amber-600">
            {data.professional.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-zinc-900 truncate">{data.professional.name}</p>
            {data.professional.role && (
              <p className="text-[11px] text-zinc-400 font-bold">{data.professional.role}</p>
            )}
          </div>
          <div className="shrink-0 text-center">
            <p className="text-2xl font-black text-zinc-900">{data.queue.length}</p>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none mt-0.5">na fila</p>
          </div>
        </div>

        {/* ── Minha posição (destaque) ── */}
        {myPosition ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-4 rounded-2xl border shadow-sm",
              myPosition.isNext
                ? "bg-amber-50 border-amber-200"
                : "bg-violet-50 border-violet-200",
            )}
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5 text-zinc-500">
              <User size={11} /> Sua posição na fila
            </p>
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl font-black shadow-sm",
                myPosition.isNext ? "bg-amber-500 text-white" : "bg-violet-500 text-white",
              )}>
                {myPosition.position}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                {myPosition.isNext ? (
                  <p className="text-sm font-black text-amber-700 flex items-center gap-1.5">
                    <Sparkles size={14} /> É a sua vez!
                  </p>
                ) : (
                  <p className="text-sm font-black text-zinc-800">
                    {ahead === 1 ? "1 pessoa na sua frente" : `${ahead} pessoas na sua frente`}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {data.showService && myPosition.serviceName && (
                    <span className="text-[11px] text-zinc-500 font-bold flex items-center gap-1">
                      <Scissors size={10} /> {myPosition.serviceName}
                    </span>
                  )}
                  {data.showTime && myPosition.startTime && (
                    <span className="text-[11px] text-zinc-500 font-bold flex items-center gap-1">
                      <Clock size={10} /> {myPosition.startTime}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="p-4 rounded-2xl border border-zinc-200 bg-white shadow-sm flex items-center gap-3">
            <AlertCircle size={18} className="text-zinc-300 shrink-0" />
            <p className="text-xs text-zinc-400 font-bold">
              Seu número não foi encontrado na fila de hoje.
            </p>
          </div>
        )}

        {/* ── Fila completa ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={11} /> Fila de hoje
            </p>
            <p className="text-[10px] text-zinc-400 font-bold">
              Atualizado às {format(lastRefresh, "HH:mm")}
            </p>
          </div>

          {data.queue.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
              <CheckCircle size={32} className="mx-auto mb-3 text-emerald-300" />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fila vazia hoje</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-2">
                {data.queue.map((item) => (
                  <QueueCard
                    key={item.id}
                    item={item}
                    showClientName={data.showClientName}
                    showService={data.showService}
                    showTime={data.showTime}
                    isMyPosition={
                      !!myPhone &&
                      !!item.clientPhone &&
                      item.clientPhone.replace(/\D/g, "") === myPhone.replace(/\D/g, "")
                    }
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-300 font-bold uppercase tracking-widest pb-4">
          {data.studio.name} · Terminal PAT
        </p>
      </div>
    </div>
  );
}
