import React, { useState } from "react";
import {
  format, isToday, isSameDay, isSameMonth,
  subMonths, addMonths, startOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek,
  addDays, subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Filter, SlidersHorizontal } from "lucide-react";
import { isHoliday } from "@/src/lib/holidays";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { motion, AnimatePresence } from "motion/react";
import { HorariosTab } from "@/src/pages/admin/modules/sistema/horarios/HorariosTab";
import { ADMIN_NAV_SECTIONS } from "../../../config/navigation";
import { useRef, useEffect } from "react";
import { AgendaPorCliente } from "./submodules/AgendaPorCliente";
import { ConsultarAgendamentos } from "./submodules/ConsultarAgendamentos";
import { LiberacoesHorarios } from "./submodules/LiberacoesHorarios";
import { PAT } from "./submodules/PAT";
import { Autoatendimento } from "./submodules/Autoatendimento";

interface AgendaTabProps {
  activeSubModule: string;
  setActiveSubModule: (val: string) => void;
  view: "day" | "week" | "month";
  setView: (val: "day" | "week" | "month") => void;
  currentMonth: Date;
  setCurrentMonth: (d: Date | ((prev: Date) => Date)) => void;
  setIsAppointmentModalOpen: (b: boolean) => void;
  selectedProfessional: string;
  setSelectedProfessional: (val: string) => void;
  professionals: any[];
  appointments: any[];
  daysInMonth: Date[];
  setSlotHover: (o: any) => void;
  setNewAppointment: (o: any) => void;
  hoveredAppointment: string | null;
  setHoveredAppointment: (val: string | null) => void;
  onAppointmentClick?: (app: any) => void;
  workingHours?: any;
  setWorkingHours?: any;
  localWorkingHours?: any;
  setLocalWorkingHours?: any;
  holidays?: any;
  setHolidays?: any;
  newHoliday?: any;
  setNewHoliday?: any;
  // Submodule data
  clients?: any[];
  services?: any[];
  onNewBlockAppointment?: (data: { date: Date; startTime: string; endTime: string; professionalId: string; notes?: string; recurrence?: { type: "none" | "weekly" | "custom"; count: number; interval: number } }) => void | Promise<void>;
  onDeleteAppointment?: (id: string) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  onRefresh?: () => void;
  onGoToMinhaAgenda?: () => void;
  blockNationalHolidays?: boolean;
  agendaClosedDays?: { id: string; date: string; name?: string; description?: string }[];
  agendaSpecialDays?: { id: string; date: string; isClosed: boolean; startTime?: string; endTime?: string; description?: string }[];
}

/* ─── legend dots ─────────────────────────────────── */
const LEGEND = [
  { color: "bg-amber-400", label: "Agendado" },
  { color: "bg-emerald-500", label: "Confirmado" },
  { color: "bg-red-500", label: "Falta" },
  { color: "bg-zinc-400",  label: "Cancelado" },
];

function appColor(type: string, status?: string) {
  if (type === "bloqueio") return "bg-zinc-400";
  if (status === 'confirmed') return "bg-emerald-500";
  if (status === 'noshow') return "bg-red-500";
  if (status === 'cancelled') return "bg-zinc-400";
  return type === "pessoal" ? "bg-blue-400" : "bg-amber-400";
}
function appBg(type: string, status?: string) {
  if (type === "bloqueio") return "bg-zinc-100 border-zinc-300";
  if (status === 'confirmed') return "bg-emerald-50 border-emerald-200";
  if (status === 'noshow') return "bg-red-50 border-red-200";
  if (status === 'cancelled') return "bg-zinc-100 border-zinc-200 opacity-60";
  return type === "pessoal"
    ? "bg-blue-50 border-blue-200"
    : "bg-amber-50 border-amber-200";
}
function appText(type: string, status?: string) {
  if (type === "bloqueio") return "text-zinc-600";
  if (status === 'confirmed') return "text-emerald-700";
  if (status === 'noshow') return "text-red-700";
  if (status === 'cancelled') return "text-zinc-500";
  return type === "pessoal" ? "text-blue-700" : "text-zinc-900";
}
function appTimeText(type: string, status?: string) {
  if (type === "bloqueio") return "text-zinc-400";
  if (status === 'confirmed') return "text-emerald-400";
  if (status === 'noshow') return "text-red-400";
  if (status === 'cancelled') return "text-zinc-400";
  return type === "pessoal" ? "text-blue-400" : "text-zinc-500";
}

/* ─── Appointment pill (shared) ───────────────────── */
function AppPill({ app, hovered, setHovered, onClick }: { app: any; hovered: boolean; setHovered: (v: string | null) => void; onClick?: () => void }) {
  const title = app.type === "bloqueio" ? "Bloqueado" : app.type === "pessoal" ? "Pessoal" : app.client?.name;

  return (
    <div
      onMouseEnter={() => setHovered(app.id)}
      onMouseLeave={() => setHovered(null)}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        "relative min-w-0 cursor-pointer rounded-lg border py-1.5 pl-2.5 pr-1.5 text-[9px] font-semibold transition-all hover:-translate-y-px hover:shadow-sm",
        appBg(app.type, app.status)
      )}
    >
      <div className={cn("absolute inset-y-1.5 left-1 w-1 rounded-full", appColor(app.type, app.status))} />
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={cn("shrink-0 font-black tabular-nums", appTimeText(app.type, app.status))}>{app.startTime}</span>
        <span className={cn("truncate font-black", appText(app.type, app.status))}>{title}</span>
      </div>
      {app.type === "atendimento" && app.service?.name && (
        <p className="mt-0.5 truncate pl-0.5 text-[8px] font-medium text-zinc-500">{app.service.name}</p>
      )}
      {hovered && (
        <div className="absolute bottom-full left-0 mb-1 z-50 pointer-events-none">
          <div className="bg-zinc-900 text-white text-[10px] font-bold rounded-xl p-2.5 shadow-2xl min-w-[150px] space-y-0.5">
            <p className="text-amber-400 text-[9px] uppercase tracking-wider">
              {app.startTime} → {app.endTime}
            </p>
            {app.type === "atendimento" ? (
              <>
                <p>{app.client?.name}</p>
                {app.service && <p className="text-zinc-400 text-[9px]">{app.service.name}</p>}
                {app.totalSessions > 1 && <p className="text-amber-500 text-[9px] font-black uppercase">Vez {app.sessionNumber}/{app.totalSessions}</p>}
              </>
            ) : (
              <p className="text-zinc-300">
                {app.type === "bloqueio" ? "Horário bloqueado" : "Compromisso pessoal"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Wrapper ──────────────────────────────── */
export function AgendaTab(props: AgendaTabProps) {
  const { activeSubModule, setActiveSubModule } = props;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSubModule) {
      setActiveSubModule('minha_agenda');
    }
  }, [activeSubModule, setActiveSubModule]);

  const agendaItem = ADMIN_NAV_SECTIONS
    .flatMap(s => s.items)
    .find((i: any) => i.tab === 'agenda');
  
  const subItems = agendaItem?.subItems || [];


  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fbfbfb] pb-20 sm:pb-0">
      

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="w-full h-full">
          {activeSubModule === 'horario-semanal' && (
            <HorariosTab
              workingHours={props.workingHours}
              setWorkingHours={props.setWorkingHours}
              localWorkingHours={props.localWorkingHours}
              setLocalWorkingHours={props.setLocalWorkingHours}
              holidays={props.holidays}
              setHolidays={props.setHolidays}
              newHoliday={props.newHoliday}
              setNewHoliday={props.setNewHoliday}
              professionals={props.professionals}
            />
          )}

          {activeSubModule === 'minha_agenda' && (
            <MinhaAgendaView {...props} />
          )}

          {activeSubModule === 'por_cliente' && (
            <AgendaPorCliente
              clients={props.clients ?? []}
              appointments={props.appointments}
              professionals={props.professionals}
              services={props.services ?? []}
              onNewAppointment={(client) => {
                const empty = { id: undefined, date: new Date(), startTime: "09:00", duration: 60, clientId: client.id, clientPhone: client.phone ?? "", clientName: client.name ?? "", serviceId: "", packageId: "", serviceIds: [], professionalId: "", status: "agendado", notes: "", recurrence: { type: "none", count: 1, interval: 7 }, comandaId: "", type: "atendimento", clientLocked: true };
                props.setNewAppointment(empty);
                props.setIsAppointmentModalOpen(true);
              }}
              onAppointmentClick={props.onAppointmentClick}
            />
          )}

          {activeSubModule === 'consultar' && (
            <ConsultarAgendamentos
              appointments={props.appointments}
              professionals={props.professionals}
              services={props.services ?? []}
              clients={props.clients ?? []}
              onAppointmentClick={props.onAppointmentClick}
              onUpdateStatus={props.onUpdateStatus}
              onNewAppointment={() => {
                const empty = { id: undefined, date: new Date(), startTime: "09:00", duration: 60, clientId: "", clientPhone: "", clientName: "", serviceId: "", packageId: "", serviceIds: [], professionalId: "", status: "agendado", notes: "", recurrence: { type: "none", count: 1, interval: 7 }, comandaId: "", type: "atendimento" };
                props.setNewAppointment(empty);
                props.setIsAppointmentModalOpen(true);
              }}
              onRefresh={props.onRefresh}
            />
          )}

          {activeSubModule === 'liberacoes' && (
            <LiberacoesHorarios
              appointments={props.appointments}
              professionals={props.professionals}
              workingHours={props.workingHours ?? []}
              onNewBlockAppointment={(data) => {
                return props.onNewBlockAppointment?.(data);
              }}
              onDeleteAppointment={(id) => props.onDeleteAppointment?.(id)}
              onRefresh={props.onRefresh ?? (() => {})}
            />
          )}

          {activeSubModule === 'pat' && (
            <PAT
              professionals={props.professionals}
              appointments={props.appointments}
              onRefresh={props.onRefresh ?? (() => {})}
            />
          )}

          {activeSubModule === 'autoatendimento' && (
            <Autoatendimento
              professionals={props.professionals}
              services={props.services ?? []}
              onRefresh={props.onRefresh ?? (() => {})}
              onGoToMinhaAgenda={props.onGoToMinhaAgenda}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Helper: check if date is manually blocked ───── */
function getDayBlockInfo(
  day: Date,
  agendaClosedDays: { id: string; date: string; name?: string; description?: string }[],
  agendaSpecialDays: { id: string; date: string; isClosed: boolean; description?: string }[],
  blockNationalHolidays?: boolean,
): { blocked: boolean; reason: string | null } {
  const dateStr = format(day, "yyyy-MM-dd");

  // Check ClosedDay
  const closedDay = agendaClosedDays.find(cd => {
    const cdDate = cd.date.slice(0, 10);
    return cdDate === dateStr;
  });
  if (closedDay) return { blocked: true, reason: closedDay.name || closedDay.description || "Agenda fechada" };

  // Check SpecialScheduleDay with isClosed=true
  const specialDay = agendaSpecialDays.find(sd => {
    const sdDate = sd.date.slice(0, 10);
    return sdDate === dateStr && sd.isClosed;
  });
  if (specialDay) return { blocked: true, reason: specialDay.description || "Horário especial — fechado" };

  // Check national holidays
  if (blockNationalHolidays) {
    const hol = isHoliday(day);
    if (hol) return { blocked: true, reason: hol.name };
  }

  return { blocked: false, reason: null };
}

/* ─── Minha Agenda View (Formerly AgendaTab) ──────── */
function MinhaAgendaView({
  view,
  setView,
  currentMonth,
  setCurrentMonth,
  setIsAppointmentModalOpen,
  selectedProfessional,
  setSelectedProfessional,
  professionals,
  appointments,
  daysInMonth,
  setSlotHover,
  setNewAppointment,
  hoveredAppointment,
  setHoveredAppointment,
  onAppointmentClick,
  activeSubModule,
  setActiveSubModule,
  workingHours,
  setWorkingHours,
  localWorkingHours,
  setLocalWorkingHours,
  holidays,
  setHolidays,
  newHoliday,
  setNewHoliday,
  blockNationalHolidays,
  agendaClosedDays = [],
  agendaSpecialDays = [],
}: AgendaTabProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const weekDays = eachDayOfInterval({ start: startOfWeek(currentMonth), end: endOfWeek(currentMonth) });
  const weekColCount = weekDays.length;

  /* date label in nav bar */
  const dateLabel =
    view === "day"
      ? format(currentMonth, "dd MMM yyyy", { locale: ptBR })
      : view === "week"
      ? `${format(startOfWeek(currentMonth), "dd MMM", { locale: ptBR })} - ${format(
          endOfWeek(currentMonth),
          "dd MMM",
          { locale: ptBR }
        )}`
      : format(currentMonth, "MMMM yyyy", { locale: ptBR });

  function navPrev() {
    if (view === "day") setCurrentMonth((p: Date) => subDays(p, 1));
    else if (view === "week") setCurrentMonth((p: Date) => addDays(p, -7));
    else setCurrentMonth((p: Date) => subMonths(p, 1));
  }
  function navNext() {
    if (view === "day") setCurrentMonth((p: Date) => addDays(p, 1));
    else if (view === "week") setCurrentMonth((p: Date) => addDays(p, 7));
    else setCurrentMonth((p: Date) => addMonths(p, 1));
  }

  return (
    <div className="flex h-full min-w-0 flex-col gap-3 overflow-hidden sm:gap-4">
      {/* ── Top controls ── */}
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:gap-2 sm:p-4 lg:rounded-3xl">
        {/* View switcher */}
        <div className="flex items-center gap-0.5 bg-zinc-100 p-1 rounded-xl w-full md:w-auto">
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider",
                view === v
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {v === "day" ? "Dia" : v === "week" ? "Sem." : "Mês"}
            </button>
          ))}
        </div>

        {/* Nav — sem o botão Novo no mobile */}
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="h-9 px-4 bg-white border border-zinc-200 rounded-xl text-[10px] font-black text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm uppercase tracking-wider shrink-0"
          >
            Hoje
          </button>
          <div className="flex items-center h-9 bg-white border border-zinc-200 px-1 rounded-xl shadow-sm flex-1 md:flex-none md:w-auto min-w-0">
            <button onClick={navPrev} className="w-7 h-7 flex items-center justify-center hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors shrink-0">
              <ChevronLeft size={14} />
            </button>
            <DatePicker
              value={format(currentMonth, "yyyy-MM-dd")}
              onChange={(val) => {
                if (val) {
                  const [y, m, d] = val.split("-").map(Number);
                  setCurrentMonth(new Date(y, m - 1, d));
                }
              }}
              renderTrigger={() => (
                <span className="text-[10px] font-black text-zinc-800 px-2 min-w-[100px] md:min-w-[120px] text-center uppercase tracking-widest cursor-pointer hover:bg-zinc-100 rounded-lg py-1 transition-colors block truncate">
                  {dateLabel}
                </span>
              )}
              className="!w-auto"
            />
            <button onClick={navNext} className="w-7 h-7 flex items-center justify-center hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors shrink-0">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Botão Novo — só aparece aqui no desktop */}
          <Button
            onClick={() => {
              const empty = { id: undefined, date: new Date(), startTime: "09:00", duration: 60, clientId: "", clientPhone: "", clientName: "", serviceId: "", packageId: "", serviceIds: [], professionalId: "", status: "agendado", notes: "", recurrence: { type: "none", count: 1, interval: 7 }, comandaId: "", type: "atendimento" };
              setIsAppointmentModalOpen(true);
              setNewAppointment(empty);
            }}
            className="hidden md:flex bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 font-bold shadow-sm items-center justify-center gap-1.5 text-xs h-9 shrink-0"
          >
            <Plus size={14} />
            Novo Agendamento
          </Button>
        </div>

        {/* Botão Novo — linha própria só no mobile, largura total */}
        <Button
          onClick={() => {
            const empty = { id: undefined, date: new Date(), startTime: "09:00", duration: 60, clientId: "", clientPhone: "", clientName: "", serviceId: "", packageId: "", serviceIds: [], professionalId: "", status: "agendado", notes: "", recurrence: { type: "none", count: 1, interval: 7 }, comandaId: "", type: "atendimento" };
            setIsAppointmentModalOpen(true);
            setNewAppointment(empty);
          }}
          className="md:hidden w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 text-sm h-11"
        >
          <Plus size={16} />
          + Novo Agendamento
        </Button>
      </div>

      {/* ── Calendar card ── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:rounded-3xl">
        {/* Sub-header: legend + filter */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/40 px-3 py-3 sm:px-5">
          {/* Legend — hide labels on xs, show on sm+ */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            {LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <div className={cn("w-2 h-2 rounded-full shrink-0", color)} />
                <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest hidden xs:inline sm:inline">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Filter — dropdown on mobile, inline on desktop */}
          <div className="relative flex items-center gap-1.5 shrink-0">
            <Filter size={12} className="text-zinc-400 hidden sm:block" />
            <select
              value={selectedProfessional}
              onChange={(e) => setSelectedProfessional(e.target.value)}
              className="text-[10px] font-bold bg-transparent text-zinc-600 outline-none cursor-pointer uppercase tracking-widest max-w-[120px] sm:max-w-none"
            >
              <option value="all">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name.split(" ")[0]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── VIEW: DAY ── */}
        {view === "day" && (() => {
          const { blocked: isDayBlocked, reason: dayBlockReason } = getDayBlockInfo(currentMonth, agendaClosedDays, agendaSpecialDays, blockNationalHolidays);
          const dayHoliday = isHoliday(currentMonth);
          return (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Day header */}
            <div className={cn("px-4 sm:px-6 py-3 border-b border-zinc-100 flex items-center gap-3 shrink-0", isDayBlocked ? "bg-red-50/60" : "bg-zinc-50/50")}>
              <div
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-base sm:text-lg shrink-0",
                  isDayBlocked
                    ? "bg-red-200 text-red-700"
                    : isToday(currentMonth)
                    ? "bg-amber-500 text-white"
                    : "bg-white border border-zinc-200 text-zinc-800"
                )}
              >
                {format(currentMonth, "d")}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs sm:text-sm font-black text-zinc-900 capitalize truncate">
                    {format(currentMonth, "EEEE", { locale: ptBR })}
                  </p>
                  {(isDayBlocked || dayHoliday) && (
                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest flex items-center gap-1 shrink-0", isDayBlocked ? "bg-red-100 text-red-700 border-red-200" : "bg-red-50 text-red-600 border-red-100")}>
                      <div className="w-1 h-1 rounded-full bg-red-400" />
                      {isDayBlocked ? `${dayBlockReason} — Fechado` : dayHoliday?.name}
                    </span>
                  )}
                </div>
                <p className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="ml-auto text-[9px] sm:text-[10px] font-bold text-zinc-400 shrink-0">
                {appointments.filter((a) => isSameDay(new Date(a.date), currentMonth)).length} agend.
              </div>
            </div>

            {/* Blocked day overlay */}
            {isDayBlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-red-300">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                  <span className="text-2xl">🚫</span>
                </div>
                <p className="text-sm font-black text-red-400">Agenda Fechada</p>
                <p className="text-xs text-red-300 font-bold">{dayBlockReason}</p>
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-zinc-50">
              {(() => {
                const todayApps = appointments.filter((a) => isSameDay(new Date(a.date), currentMonth));
                const minAppMin = todayApps.reduce((min, a) => {
                  const [h, m] = a.startTime.split(":").map(Number);
                  return Math.min(min, h * 60 + m);
                }, 480);
                const gridStartMin = Math.floor(Math.min(minAppMin, 480) / 30) * 30;
                const gridStartSlot = gridStartMin / 30;
                const gridEndSlot = 44; // 22:00
                const slotCount = gridEndSlot - gridStartSlot;
                return Array.from({ length: slotCount }).map((_, i) => {
                const totalMinutes = (gridStartSlot + i) * 30;
                const hour = Math.floor(totalMinutes / 60);
                const min = totalMinutes % 60;
                const hourStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
                const isFullHour = min === 0;
                const slotStart = totalMinutes;
                const slotEnd = slotStart + 30;
                const dayApps = appointments.filter((a) => {
                  if (!isSameDay(new Date(a.date), currentMonth)) return false;
                  const [h, m] = a.startTime.split(":").map(Number);
                  const appMin = h * 60 + m;
                  return appMin >= slotStart && appMin < slotEnd;
                });
                return (
                  <div key={hourStr} className={cn(
                    "flex gap-3 sm:gap-4 px-3 sm:px-6 hover:bg-zinc-50/50 transition-colors group",
                    isFullHour ? "pt-2 pb-1 border-t border-zinc-100" : "pt-1 pb-1"
                  )}>
                    <div className="w-10 sm:w-14 shrink-0 text-right pt-0.5">
                      <span className={cn(
                        "font-bold text-zinc-400",
                        isFullHour ? "text-[9px] sm:text-[10px]" : "text-[8px] text-zinc-300"
                      )}>{hourStr}</span>
                    </div>
                    <div className={cn("flex-1 flex flex-col gap-1.5", isFullHour ? "min-h-[40px]" : "min-h-[28px]")}>
                      {dayApps.length === 0 ? (
                        <button
                          onClick={() => {
                            const empty = { id: undefined, date: currentMonth, startTime: hourStr, duration: 60, clientId: "", clientPhone: "", clientName: "", serviceId: "", packageId: "", serviceIds: [], professionalId: "", status: "agendado", notes: "", recurrence: { type: "none", count: 1, interval: 7 }, comandaId: "", type: "atendimento" };
                            setNewAppointment(empty);
                            setIsAppointmentModalOpen(true);
                            setSlotHover(null);
                          }}
                          onMouseEnter={(e) =>
                            setSlotHover({
                              x: e.clientX,
                              y: e.clientY,
                              label: `${format(currentMonth, "EEE d", { locale: ptBR })} • ${hourStr}`,
                            })
                          }
                          onMouseMove={(e) =>
                            setSlotHover((p: any) => (p ? { ...p, x: e.clientX, y: e.clientY } : null))
                          }
                          onMouseLeave={() => setSlotHover(null)}
                          className={cn(
                            "w-full rounded-xl text-[10px] font-bold transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-crosshair border border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-400 flex items-center justify-center gap-2 text-amber-500 hover:text-amber-600",
                            isFullHour ? "h-[36px]" : "h-[24px]"
                          )}
                        >
                          <div className="w-4 h-4 rounded-full bg-amber-400/90 flex items-center justify-center">
                            <Plus size={10} className="text-white" />
                          </div>
                          <span className="hidden sm:inline">{hourStr}</span>
                        </button>
                      ) : (
                          dayApps.map((app) => (
                            <div
                              key={app.id}
                              onMouseEnter={() => setHoveredAppointment(app.id)}
                              onMouseLeave={() => setHoveredAppointment(null)}
                              onClick={(e) => { e.stopPropagation(); onAppointmentClick?.(app); }}
                              className={cn(
                                "relative flex cursor-pointer items-center gap-2 rounded-xl border p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md sm:gap-3 sm:p-3.5",
                                appBg(app.type, app.status)
                              )}
                            >
                              <div className={cn("w-1.5 self-stretch rounded-full shrink-0", appColor(app.type, app.status))} />
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-[11px] sm:text-xs font-black truncate", appText(app.type, app.status))}>
                                {app.type === "bloqueio"
                                  ? "🚫 Horário Bloqueado"
                                  : app.type === "pessoal"
                                  ? "👤 Compromisso Pessoal"
                                  : app.client?.name}
                              </p>
                              {app.type === "atendimento" && app.service && (
                                <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold mt-0.5 truncate">
                                {app.service.name}
                                {app.totalSessions > 1 && <span className="ml-2 text-amber-600">({app.sessionNumber}/{app.totalSessions})</span>}
                              </p>
                            )}
                          </div>
                            <div className="text-right shrink-0">
                              <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500">
                                {app.startTime}–{app.endTime}
                              </p>
                              {app.professional && (
                                <p className="text-[8px] text-zinc-400 hidden sm:block">
                                  {app.professional.name.split(" ")[0]}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              });
              })()}
            </div>
            )}
          </div>
          );
        })()}

        {/* ── VIEW: MONTH ── */}
        {view === "month" && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Day names */}
            <div className="grid grid-cols-7 shrink-0">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="border-b border-r border-zinc-100 bg-zinc-50 py-2.5 text-center text-[8px] font-black uppercase tracking-widest text-zinc-400 last:border-r-0 sm:text-[10px]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid — scrollable on mobile */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
              <div className="grid grid-cols-7 h-full">
                {/* Padding cells */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div
                    key={`pad-${i}`}
                    className="min-h-[72px] border-b border-r border-zinc-100 bg-zinc-50/40 sm:min-h-[105px] xl:min-h-[125px]"
                  />
                ))}

                {/* Day cells */}
                {daysInMonth.map((day, idx) => {
                  const dayApps = appointments.filter((a) => isSameDay(new Date(a.date), day));
                  const holiday = isHoliday(day);
                  const isCurrentDay = isToday(day);
                  const { blocked: isBlocked, reason: blockReason } = getDayBlockInfo(day, agendaClosedDays, agendaSpecialDays, blockNationalHolidays);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (!isBlocked) { setCurrentMonth(day); setView("day"); }
                      }}
                      title={holiday?.name}
                      className={cn(
                        "group relative min-h-[72px] border-b border-r border-zinc-100 p-1.5 transition-colors sm:min-h-[105px] sm:p-2 xl:min-h-[125px]",
                        !isSameMonth(day, currentMonth) && "opacity-30",
                        isBlocked ? "bg-red-50/60 cursor-not-allowed" : "hover:bg-zinc-50 cursor-pointer",
                        isCurrentDay && !isBlocked && "bg-amber-50/40"
                      )}
                    >
                      {/* Day number */}
                      <div className="mb-1.5 flex items-start justify-between sm:mb-2">
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-lg text-[9px] font-black sm:h-7 sm:w-7 sm:text-[10px]",
                            isCurrentDay && !isBlocked ? "bg-amber-500 text-white shadow-sm" : isBlocked ? "bg-red-200 text-red-700" : "bg-zinc-50 text-zinc-600"
                          )}
                        >
                          {format(day, "d")}
                        </div>
                        {holiday && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm mt-1 shrink-0" />
                        )}
                      </div>

                      {/* Blocked label */}
                      {isBlocked && (
                        <p className="text-[8px] text-red-400 font-bold truncate leading-tight hidden sm:block">{blockReason}</p>
                      )}

                      {/* Events — desktop: text pills, mobile: dots */}
                      {!isBlocked && (
                        <>
                          <div className="hidden space-y-1 sm:block">
                            {dayApps.slice(0, 2).map((app) => (
                              <AppPill
                                key={app.id}
                                app={app}
                                hovered={hoveredAppointment === app.id}
                                setHovered={setHoveredAppointment}
                                onClick={() => onAppointmentClick?.(app)}
                              />
                            ))}
                            {dayApps.length > 2 && (
                              <div className="rounded-md bg-zinc-100 py-0.5 text-center text-[8px] font-black uppercase tracking-tight text-zinc-500">
                                +{dayApps.length - 2} agendamento{dayApps.length - 2 > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>

                          {/* Mobile: single badge with count */}
                          {dayApps.length > 0 && (
                            <div className="flex justify-center sm:hidden mt-0.5">
                              <span className={cn(
                                "inline-flex items-center justify-center rounded-full w-5 h-5 text-[10px] font-bold text-white",
                                dayApps.some(a => a.status === "confirmed") ? "bg-emerald-500" :
                                dayApps.some(a => a.status === "noshow") ? "bg-red-500" :
                                "bg-amber-400"
                              )}>
                                {dayApps.length}
                              </span>
                            </div>
                          )}

                          {/* Hover add button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const empty = { id: undefined, date: day, startTime: "09:00", duration: 60, clientId: "", clientPhone: "", clientName: "", serviceId: "", packageId: "", serviceIds: [], professionalId: "", status: "agendado", notes: "", recurrence: { type: "none", count: 1, interval: 7 }, comandaId: "", type: "atendimento" };
                              setNewAppointment(empty);
                              setIsAppointmentModalOpen(true);
                            }}
                            className="absolute bottom-1 right-1 p-0.5 bg-zinc-100 rounded-lg text-zinc-400 opacity-0 group-hover:opacity-100 transition-all hover:text-zinc-700 border border-zinc-200"
                          >
                            <Plus size={10} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: WEEK ── */}
        {view === "week" && (
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide">
              <div style={{ minWidth: "900px", width: "100%", minHeight: "100%" }}>
                {/* Week header */}
                <div
                  className="grid border-b border-zinc-100 sticky top-0 z-10 bg-white"
                  style={{ gridTemplateColumns: `44px repeat(${weekColCount}, 1fr)` }}
                >
                  <div className="border-r border-zinc-100 shrink-0" />
                  {weekDays.map((day) => {
                    const { blocked: isBlockedDay, reason: blockReason } = getDayBlockInfo(day, agendaClosedDays, agendaSpecialDays, blockNationalHolidays);
                    const hol = isHoliday(day);
                    return (
                      <div
                        key={day.toString()}
                        onClick={() => { if (!isBlockedDay) { setCurrentMonth(day); setView("day"); } }}
                        title={isBlockedDay ? (blockReason ?? undefined) : (hol?.name ?? undefined)}
                        className={cn(
                          "relative border-r border-zinc-100 px-1 py-3 text-center transition-colors last:border-r-0",
                          isBlockedDay ? "bg-red-50/60 cursor-not-allowed" : "cursor-pointer hover:bg-zinc-50",
                          !isBlockedDay && isToday(day) && "bg-amber-50/50"
                        )}
                      >
                        <p className={cn("text-[8px] font-bold uppercase tracking-widest mb-0.5", isBlockedDay ? "text-red-400" : "text-zinc-400")}>
                          {format(day, "EEE", { locale: ptBR })}
                        </p>
                        <div className="flex items-center justify-center gap-1">
                          <p className={cn("text-sm font-black", isBlockedDay ? "text-red-500" : isToday(day) ? "text-amber-600" : "text-zinc-800")}>
                            {format(day, "d")}
                          </p>
                          {(isBlockedDay || hol) && <div className="w-1 h-1 rounded-full bg-red-400" />}
                        </div>
                        {isBlockedDay && <p className="text-[7px] text-red-400 font-bold truncate px-0.5 leading-tight">{blockReason}</p>}
                      </div>
                    );
                  })}
                </div>

                {/* Hour rows — 30-min intervals */}
                {(() => {
                  const weekStart = weekDays[0];
                  const weekEnd = weekDays[weekDays.length - 1];
                  const weekApps = appointments.filter((a) => {
                    const d = new Date(a.date);
                    return d >= weekStart && d <= weekEnd;
                  });
                  const minAppMin = weekApps.reduce((min, a) => {
                    const [h, m] = a.startTime.split(":").map(Number);
                    return Math.min(min, h * 60 + m);
                  }, 480);
                  const gridStartMin = Math.floor(Math.min(minAppMin, 480) / 30) * 30;
                  const gridStartSlot = gridStartMin / 30;
                  const gridEndSlot = 44; // 22:00
                  const slotCount = gridEndSlot - gridStartSlot;

                  // Altura real (px) de cada slot de 30min — hora cheia é mais alta que a meia-hora.
                  // Os cartões de agendamento usam essa mesma escala pra se posicionar com precisão
                  // (em vez de nascer dentro da linha de cada slot, que corta cartões de duração > 30min
                  // quando eles "vazam" pra dentro da linha seguinte).
                  const ROW_FULL_PX = 44;
                  const ROW_HALF_PX = 28;
                  const slotTops: number[] = [];
                  let acc = 0;
                  for (let s = 0; s < slotCount; s++) {
                    slotTops.push(acc);
                    acc += (gridStartSlot + s) * 30 % 60 === 0 ? ROW_FULL_PX : ROW_HALF_PX;
                  }
                  const gridHeight = acc;
                  const minutesToPixels = (min: number) => {
                    const idx = Math.min(slotCount - 1, Math.max(0, Math.floor((min - gridStartMin) / 30)));
                    const slotStartMin = gridStartMin + idx * 30;
                    const slotHeight = slotStartMin % 60 === 0 ? ROW_FULL_PX : ROW_HALF_PX;
                    const frac = Math.min(1, Math.max(0, (min - slotStartMin) / 30));
                    return slotTops[idx] + frac * slotHeight;
                  };

                  return (
                  <div className="relative">
                  {Array.from({ length: slotCount }).map((_, i) => {
                  const totalMinutes = (gridStartSlot + i) * 30;
                  const hour = Math.floor(totalMinutes / 60);
                  const min = totalMinutes % 60;
                  const hourStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
                  const isFullHour = min === 0;
                  return (
                    <div
                      key={hourStr}
                      className={cn("border-zinc-100", isFullHour ? "border-t" : "border-t border-dashed border-zinc-50")}
                      style={{ display: "grid", gridTemplateColumns: `44px repeat(${weekColCount}, 1fr)` }}
                    >
                      {/* Hour label */}
                      <div className={cn(
                        "py-1 px-1 text-right border-r border-zinc-100 bg-zinc-50/30 shrink-0",
                        isFullHour ? "text-[9px] font-bold text-zinc-400" : "text-[8px] text-zinc-300"
                      )}>
                        {isFullHour ? hourStr : <span className="opacity-60">{hourStr}</span>}
                      </div>

                      {/* Day columns */}
                      {weekDays.map((day, j) => {
                        const slotStart = totalMinutes;
                        const slotEnd = slotStart + 30;
                        const hasApps = weekApps.some((a) => {
                          if (!isSameDay(new Date(a.date), day)) return false;
                          const [h, m] = a.startTime.split(":").map(Number);
                          const appMin = h * 60 + m;
                          return appMin >= slotStart && appMin < slotEnd;
                        });
                        const { blocked: isBlockedWeekDay } = getDayBlockInfo(day, agendaClosedDays, agendaSpecialDays, blockNationalHolidays);
                        return (
                          <div
                            key={j}
                            className={cn(
                              "relative border-r border-zinc-100 last:border-r-0 p-0.5 transition-colors",
                              isFullHour ? "min-h-[44px]" : "min-h-[28px]",
                              isBlockedWeekDay ? "bg-red-50/40 cursor-not-allowed" : isToday(day) && "bg-amber-50/20"
                            )}
                            onMouseEnter={
                              !hasApps && !isBlockedWeekDay
                                ? (e) =>
                                    setSlotHover({
                                      x: e.clientX,
                                      y: e.clientY,
                                      label: `${format(day, "EEE d", { locale: ptBR })} • ${hourStr}`,
                                    })
                                : undefined
                            }
                            onMouseMove={
                              !hasApps && !isBlockedWeekDay
                                ? (e) => setSlotHover((p: any) => (p ? { ...p, x: e.clientX, y: e.clientY } : null))
                                : undefined
                            }
                            onMouseLeave={!hasApps && !isBlockedWeekDay ? () => setSlotHover(null) : undefined}
                            onClick={
                              !hasApps && !isBlockedWeekDay
                                ? () => {
                                    setSlotHover(null);
                                    const empty = { id: undefined, date: day, startTime: hourStr, duration: 60, clientId: "", clientPhone: "", clientName: "", serviceId: "", packageId: "", serviceIds: [], professionalId: "", status: "agendado", notes: "", recurrence: { type: "none", count: 1, interval: 7 }, comandaId: "", type: "atendimento" };
                                    setNewAppointment(empty);
                                    setIsAppointmentModalOpen(true);
                                  }
                                : undefined
                            }
                          >
                            {/* Empty slot hover effect */}
                            {!hasApps && !isBlockedWeekDay && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-150 cursor-crosshair">
                                <div className="inset-0 absolute bg-amber-50/60 border border-dashed border-amber-300 rounded-lg m-0.5" />
                                <div className="relative z-10 w-5 h-5 rounded-full bg-amber-400/90 flex items-center justify-center shadow-sm">
                                  <Plus size={10} className="text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                  })}

                  {/* Cartões de agendamento — uma camada só por cima da grade, posicionada por
                      pixel real (topo/altura), pra nunca ficar cortada pela linha de hora seguinte. */}
                  <div
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{ display: "grid", gridTemplateColumns: `44px repeat(${weekColCount}, 1fr)`, height: gridHeight }}
                  >
                    <div />
                    {weekDays.map((day, j) => {
                      const dayApps = weekApps.filter((a) => isSameDay(new Date(a.date), day));
                      const groups = new Map<number, typeof dayApps>();
                      dayApps.forEach((app) => {
                        const [h, m] = app.startTime.split(":").map(Number);
                        const bucket = Math.floor((h * 60 + m - gridStartMin) / 30);
                        if (!groups.has(bucket)) groups.set(bucket, []);
                        groups.get(bucket)!.push(app);
                      });
                      return (
                        <div key={j} className="relative">
                          {Array.from(groups.values()).flatMap((group) =>
                            group.map((app, idx) => {
                              const [h, m] = app.startTime.split(":").map(Number);
                              const startMin = h * 60 + m;
                              const endMin = startMin + (Number(app.duration) || 30);
                              const top = minutesToPixels(startMin);
                              const height = Math.max(minutesToPixels(endMin) - top - 2, 36);
                              const widthPct = 100 / group.length;
                              return (
                                <div
                                  key={app.id}
                                  className="absolute p-0.5 pointer-events-auto"
                                  style={{ top, height, left: `${idx * widthPct}%`, width: `${widthPct}%` }}
                                >
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onMouseEnter={() => setHoveredAppointment(app.id)}
                                    onMouseLeave={() => setHoveredAppointment(null)}
                                    onClick={(e) => { e.stopPropagation(); onAppointmentClick?.(app); }}
                                    className={cn(
                                      "flex h-full w-full cursor-pointer flex-col justify-between rounded-lg border p-1.5 shadow-sm transition-all hover:-translate-y-px hover:shadow-md sm:p-2",
                                      appBg(app.type, app.status)
                                    )}
                                  >
                                    <div className="flex flex-col gap-0 min-w-0 flex-1">
                                      <p className={cn("truncate text-[10px] font-black leading-tight", appText(app.type, app.status))}>
                                        {app.type === "bloqueio"
                                          ? "🚫 Bloq."
                                          : app.type === "pessoal"
                                          ? "👤 Pessoal"
                                          : app.client?.name}
                                      </p>
                                      {app.type === "atendimento" && app.service && app.duration >= 45 && (
                                        <p className="text-[8px] font-bold text-amber-600/80 leading-none mt-0.5 truncate">
                                          {app.service.name}
                                        </p>
                                      )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center justify-between gap-1 border-t border-black/5 pt-1">
                                      <span className={cn("text-[8px] font-bold whitespace-nowrap", appTimeText(app.type))}>
                                        {app.startTime}
                                      </span>
                                      {app.totalSessions > 1 && (
                                        <span className="text-[7px] font-black text-amber-700 bg-amber-100/80 px-0.5 rounded-sm">
                                          {app.sessionNumber}/{app.totalSessions}
                                        </span>
                                      )}
                                    </div>
                                  </motion.div>

                                  {/* Tooltip */}
                                  {hoveredAppointment === app.id && (
                                    <div className="absolute bottom-full left-0 z-50 mb-1 pointer-events-none">
                                      <div className="min-w-[170px] space-y-1 rounded-xl bg-zinc-900 p-3 text-[10px] font-bold text-white shadow-2xl">
                                        <p className="text-[9px] uppercase tracking-widest text-amber-400">
                                          {format(new Date(app.date), "EEE, d MMM", { locale: ptBR })} · {app.startTime} → {app.endTime}
                                        </p>
                                        {app.type === "atendimento" ? (
                                          <>
                                            <p className="text-white">{app.client?.name || "Cliente não informado"}</p>
                                            {app.service && (
                                              <p className="text-[9px] font-semibold text-zinc-400">{app.service.name}</p>
                                            )}
                                            {app.professional?.name && (
                                              <p className="text-[9px] font-semibold text-zinc-500">
                                                Prof.: {app.professional.name}
                                              </p>
                                            )}
                                            {app.totalSessions > 1 && (
                                              <p className="text-[9px] font-semibold text-amber-500">
                                                Sessão {app.sessionNumber}/{app.totalSessions}
                                              </p>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-zinc-300">
                                              {app.type === "bloqueio" ? "Horário bloqueado" : "Compromisso pessoal"}
                                            </p>
                                            {app.professional?.name && (
                                              <p className="text-[9px] font-semibold text-zinc-500">
                                                Prof.: {app.professional.name}
                                              </p>
                                            )}
                                            {app.notes && (
                                              <p className="text-[9px] font-semibold text-zinc-400">{app.notes}</p>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
