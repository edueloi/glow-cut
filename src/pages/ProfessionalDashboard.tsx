import { useState, useEffect } from "react";
import {
  CalendarIcon,
  Scissors,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Plus,
  Users
} from "lucide-react";
import {
  format,
  addDays,
  subDays,
  isToday,
  parseISO,
  isSameDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Professional {
  id: string;
  name: string;
  role: string | null;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  client: { name: string; phone: string };
  service: { name: string; price: number; duration: number };
}

export default function ProfessionalDashboard() {
  const [prof, setProf] = useState<Professional | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");

  useEffect(() => {
    const stored = localStorage.getItem("professionalLogged");
    if (stored) {
      setProf(JSON.parse(stored));
    } else {
      window.location.href = "/pro/login";
    }
  }, []);

  useEffect(() => {
    if (!prof) return;
    fetchAppointments();
  }, [prof, selectedDate, view]);

  const fetchAppointments = () => {
    if (!prof) return;
    let start: Date;
    let end: Date;
    if (view === "day") {
      start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
    }
    fetch(
      `/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}&professionalId=${prof.id}`
    )
      .then((r) => r.json())
      .then(setAppointments);
  };

  const handleLogout = () => {
    localStorage.removeItem("professionalLogged");
    window.location.href = "/pro/login";
  };

  if (!prof) return null;

  const todayApps = appointments.filter((a) =>
    isSameDay(parseISO(a.date), selectedDate)
  );

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(view === "week" ? selectedDate : selectedDate, i)
  );

  const statusColor = (status: string) => {
    if (status === "confirmed") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    if (status === "cancelled") return "bg-red-500/10 text-red-500 border-red-500/20";
    return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  };

  const statusLabel = (status: string) => {
    if (status === "confirmed") return "Confirmado";
    if (status === "cancelled") return "Cancelado";
    return "Agendado";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-300 flex flex-col">
      {/* Header */}
      <header className="bg-[#0f0f12] border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Scissors className="text-zinc-950" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-tighter">
              {prof.name}
            </h1>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
              {prof.role || "Profissional"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats inline */}
          <div className="hidden md:flex items-center gap-6 mr-4">
            <div className="text-center">
              <p className="text-lg font-black text-white">{todayApps.length}</p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Hoje</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">
                {appointments.filter((a) => a.status !== "cancelled").length}
              </p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                {view === "week" ? "Esta semana" : "Total"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all border border-red-500/10"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        {/* Date navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 bg-[#0f0f12] p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setView("day")}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider",
                view === "day"
                  ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20"
                  : "text-zinc-500 hover:text-white"
              )}
            >
              Dia
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider",
                view === "week"
                  ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20"
                  : "text-zinc-500 hover:text-white"
              )}
            >
              Semana
            </button>
          </div>

          <div className="flex items-center gap-2 bg-[#0f0f12] p-1 rounded-2xl border border-white/5">
            <button
              onClick={() =>
                setSelectedDate((d) =>
                  view === "day" ? subDays(d, 1) : subDays(d, 7)
                )
              }
              className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-white px-3 min-w-[160px] text-center uppercase tracking-widest">
              {view === "day"
                ? format(selectedDate, "EEEE, d MMM", { locale: ptBR })
                : `${format(selectedDate, "d MMM", { locale: ptBR })} – ${format(addDays(selectedDate, 6), "d MMM", { locale: ptBR })}`}
            </span>
            <button
              onClick={() =>
                setSelectedDate((d) =>
                  view === "day" ? addDays(d, 1) : addDays(d, 7)
                )
              }
              className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-5 py-2 rounded-xl text-[10px] font-bold bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 transition-all uppercase tracking-wider"
          >
            Hoje
          </button>
        </div>

        {/* Week strip (for week view) */}
        {view === "week" && (
          <div className="grid grid-cols-7 gap-2 mb-6">
            {weekDays.map((day) => {
              const dayApps = appointments.filter((a) =>
                isSameDay(parseISO(a.date), day)
              );
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelectedDate(day);
                    setView("day");
                  }}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-2xl border transition-all",
                    isSameDay(day, selectedDate)
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-[#0f0f12] border-white/5 hover:border-white/10",
                    isToday(day) && "ring-1 ring-amber-500/40"
                  )}
                >
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-black mt-1",
                      isToday(day) ? "text-amber-500" : "text-white"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayApps.length > 0 && (
                    <span className="text-[9px] font-bold text-amber-500 mt-1">
                      {dayApps.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Appointments list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">
              {view === "day"
                ? `Agendamentos — ${format(selectedDate, "dd/MM/yyyy")}`
                : "Agendamentos da Semana"}
            </h2>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-3 py-1.5 rounded-xl border border-white/5">
              {(view === "day" ? todayApps : appointments).filter(
                (a) => a.status !== "cancelled"
              ).length}{" "}
              ativos
            </span>
          </div>

          <AnimatePresence mode="wait">
            {(view === "day" ? todayApps : appointments)
              .filter((a) => a.status !== "cancelled")
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((app, idx) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-[#0f0f12] rounded-3xl border border-white/5 p-5 flex items-center gap-5 hover:border-amber-500/20 transition-all group"
                >
                  {/* Time */}
                  <div className="text-center min-w-[52px]">
                    <p className="text-base font-black text-white">{app.startTime}</p>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                      {app.endTime}
                    </p>
                    {view === "week" && (
                      <p className="text-[9px] text-amber-500 font-bold mt-1">
                        {format(parseISO(app.date), "dd/MM")}
                      </p>
                    )}
                  </div>

                  <div className="w-px h-10 bg-white/5" />

                  {/* Client */}
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black text-sm shrink-0">
                    {app.client.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{app.client.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-zinc-500 font-medium flex items-center gap-1">
                        <Scissors size={11} className="text-amber-500/60" />
                        {app.service.name}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-medium flex items-center gap-1">
                        <Clock size={11} />
                        {app.service.duration}min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-white">
                      R$ {app.service.price.toFixed(2)}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest border",
                        statusColor(app.status)
                      )}
                    >
                      {statusLabel(app.status)}
                    </span>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>

          {(view === "day" ? todayApps : appointments).filter(
            (a) => a.status !== "cancelled"
          ).length === 0 && (
            <div className="py-24 bg-zinc-900/20 rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-600">
              <CalendarIcon size={40} className="mb-4 opacity-20" />
              <p className="text-sm font-bold text-zinc-500">Nenhum agendamento</p>
              <p className="text-xs mt-1 font-medium">
                {view === "day" ? "Você está livre neste dia" : "Nenhum agendamento esta semana"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
