import { useState, useEffect } from "react";
import {
  CalendarIcon, Scissors, Clock, LogOut,
  ChevronLeft, ChevronRight, UserCog,
} from "lucide-react";
import { format, addDays, subDays, isToday, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface ProfData {
  id: string;
  name: string;
  role: string | null;
  tenantId: string;
  permissions: string | Record<string, Record<string, boolean>> | null;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  client: { name: string; phone: string } | null;
  service: { name: string; price: number; duration: number } | null;
}

function parsePerms(raw: any): Record<string, Record<string, boolean>> {
  if (!raw) return {};
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    const result: Record<string, Record<string, boolean>> = {};
    for (const [mod, val] of Object.entries(p)) {
      if (typeof val === "boolean") result[mod] = { ver: val as boolean };
      else if (typeof val === "object" && val !== null) result[mod] = val as Record<string, boolean>;
    }
    return result;
  } catch { return {}; }
}

function canDo(perms: Record<string, Record<string, boolean>>, mod: string, action = "ver") {
  return !!perms[mod]?.[action];
}

const statusColor = (s: string) => {
  if (s === "confirmed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "cancelled")  return "bg-red-50 text-red-500 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const statusLabel = (s: string) => {
  if (s === "confirmed") return "Confirmado";
  if (s === "cancelled")  return "Cancelado";
  return "Agendado";
};

export default function ProfessionalDashboard() {
  const [prof, setProf] = useState<ProfData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("professionalLogged");
    if (stored) {
      setProf(JSON.parse(stored));
    } else {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!prof) return;
    fetchAppointments();
  }, [prof, selectedDate, view]);

  const fetchAppointments = async () => {
    if (!prof?.tenantId) return;
    setLoading(true);
    let start: Date, end: Date;
    if (view === "day") {
      start = new Date(selectedDate); start.setHours(0, 0, 0, 0);
      end   = new Date(selectedDate); end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(selectedDate); start.setHours(0, 0, 0, 0);
      end   = addDays(start, 6);      end.setHours(23, 59, 59, 999);
    }
    try {
      const res = await fetch(
        `/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}&professionalId=${prof.id}`,
        { headers: { "x-tenant-id": prof.tenantId } }
      );
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("professionalLogged");
    window.location.href = "/login";
  };

  if (!prof) return null;

  const perms = parsePerms(prof.permissions);
  const canSeeAgenda   = canDo(perms, "agenda");
  const canSeeComandas = canDo(perms, "comandas");

  const todayApps = appointments.filter((a) => isSameDay(parseISO(a.date), selectedDate));
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(selectedDate, i));

  const displayApps = (view === "day" ? todayApps : appointments)
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex flex-col">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/20">
            <Scissors className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-sm font-black text-zinc-900 tracking-tight">{prof.name}</h1>
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
              {prof.role || "Profissional"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Stats rápidas */}
          <div className="hidden md:flex items-center gap-5">
            <div className="text-center">
              <p className="text-lg font-black text-zinc-900">{todayApps.filter(a => a.status !== "cancelled").length}</p>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Hoje</p>
            </div>
            <div className="w-px h-8 bg-zinc-100" />
            <div className="text-center">
              <p className="text-lg font-black text-zinc-900">{appointments.filter(a => a.status !== "cancelled").length}</p>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                {view === "week" ? "Semana" : "Período"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all border border-red-100 cursor-pointer"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">

        {/* ── Sem permissão de agenda ─────────────────── */}
        {!canSeeAgenda ? (
          <div className="py-32 flex flex-col items-center justify-center text-zinc-400">
            <UserCog size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold text-zinc-500">Sem acesso à agenda</p>
            <p className="text-xs mt-1 text-zinc-400">Solicite ao administrador para liberar o acesso.</p>
          </div>
        ) : (
          <>
            {/* ── Navegação de data ───────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              {/* Dia / Semana */}
              <div className="flex items-center gap-1 bg-white border border-zinc-200 p-1 rounded-2xl shadow-sm">
                {(["day", "week"] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={cn(
                      "px-5 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider cursor-pointer",
                      view === v ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "text-zinc-500 hover:text-zinc-800"
                    )}
                  >
                    {v === "day" ? "Dia" : "Semana"}
                  </button>
                ))}
              </div>

              {/* Navegação de datas */}
              <div className="flex items-center gap-1 bg-white border border-zinc-200 p-1 rounded-2xl shadow-sm">
                <button
                  onClick={() => setSelectedDate(d => view === "day" ? subDays(d, 1) : subDays(d, 7))}
                  className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-zinc-800 px-3 min-w-[160px] text-center capitalize">
                  {view === "day"
                    ? format(selectedDate, "EEEE, d MMM", { locale: ptBR })
                    : `${format(selectedDate, "d MMM", { locale: ptBR })} – ${format(addDays(selectedDate, 6), "d MMM", { locale: ptBR })}`}
                </span>
                <button
                  onClick={() => setSelectedDate(d => view === "day" ? addDays(d, 1) : addDays(d, 7))}
                  className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-5 py-2 rounded-xl text-[10px] font-bold bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 shadow-sm transition-all uppercase tracking-wider cursor-pointer"
              >
                Hoje
              </button>
            </div>

            {/* ── Strip de dias (semana) ───────────────── */}
            {view === "week" && (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(day => {
                  const dayApps = appointments.filter(a => isSameDay(parseISO(a.date), day) && a.status !== "cancelled");
                  const selected = isSameDay(day, selectedDate);
                  return (
                    <button key={day.toISOString()} onClick={() => { setSelectedDate(day); setView("day"); }}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer",
                        selected ? "bg-amber-50 border-amber-300" : "bg-white border-zinc-200 hover:border-zinc-300",
                        isToday(day) && !selected && "ring-1 ring-amber-400/40"
                      )}
                    >
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        {format(day, "EEE", { locale: ptBR })}
                      </span>
                      <span className={cn("text-lg font-black mt-1", isToday(day) ? "text-amber-500" : selected ? "text-amber-600" : "text-zinc-800")}>
                        {format(day, "d")}
                      </span>
                      {dayApps.length > 0 && (
                        <span className="text-[9px] font-black text-amber-500 mt-1 bg-amber-50 rounded-full px-1.5">
                          {dayApps.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Lista de agendamentos ───────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                  {view === "day"
                    ? `Agendamentos — ${format(selectedDate, "dd/MM/yyyy")}`
                    : "Agendamentos da Semana"}
                </h2>
                <span className="text-[10px] font-bold text-zinc-400 bg-white border border-zinc-200 px-3 py-1.5 rounded-xl">
                  {displayApps.length} ativo(s)
                </span>
              </div>

              {loading ? (
                <div className="py-16 flex items-center justify-center text-zinc-400">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {displayApps.length === 0 ? (
                    <div className="py-20 bg-white rounded-[32px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
                      <CalendarIcon size={36} className="mb-3 opacity-20" />
                      <p className="text-sm font-bold text-zinc-400">Nenhum agendamento</p>
                      <p className="text-xs mt-1 text-zinc-400">
                        {view === "day" ? "Você está livre neste dia" : "Nenhum agendamento esta semana"}
                      </p>
                    </div>
                  ) : (
                    displayApps.map((app, idx) => (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="bg-white rounded-3xl border border-zinc-200 p-5 flex items-center gap-5 hover:border-amber-300 hover:shadow-md transition-all"
                      >
                        {/* Horário */}
                        <div className="text-center min-w-[52px]">
                          <p className="text-base font-black text-zinc-900">{app.startTime}</p>
                          <p className="text-[9px] text-zinc-400 font-bold">{app.endTime}</p>
                          {view === "week" && (
                            <p className="text-[9px] text-amber-500 font-bold mt-0.5">
                              {format(parseISO(app.date), "dd/MM")}
                            </p>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate">
                            {app.client?.name || "Sem cliente"}
                          </p>
                          {app.service && (
                            <div className="flex items-center gap-2 mt-1">
                              <Scissors size={10} className="text-amber-500" />
                              <span className="text-xs text-zinc-500">{app.service.name}</span>
                              <span className="text-[10px] font-bold text-amber-600">
                                R$ {app.service.price.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {app.service?.duration && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock size={10} className="text-zinc-300" />
                              <span className="text-[10px] text-zinc-400">{app.service.duration} min</span>
                            </div>
                          )}
                        </div>

                        {/* Status badge */}
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border", statusColor(app.status))}>
                          {statusLabel(app.status)}
                        </span>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}