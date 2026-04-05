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

interface AgendaTabProps {
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
}

/* ─── legend dots ─────────────────────────────────── */
const LEGEND = [
  { color: "bg-amber-400", label: "Agendado" },
  { color: "bg-emerald-500", label: "Confirmado" },
  { color: "bg-red-500", label: "Falta" },
  { color: "bg-zinc-400",  label: "Cancelado" },
];

function appColor(type: string, status?: string) {
  if (status === 'confirmed') return "bg-emerald-500";
  if (status === 'noshow') return "bg-red-500";
  if (status === 'cancelled') return "bg-zinc-400";
  return type === "bloqueio" ? "bg-red-400" : type === "pessoal" ? "bg-blue-400" : "bg-amber-400";
}
function appBg(type: string, status?: string) {
  if (status === 'confirmed') return "bg-emerald-50 border-emerald-200";
  if (status === 'noshow') return "bg-red-50 border-red-200";
  if (status === 'cancelled') return "bg-zinc-100 border-zinc-200 opacity-60";
  return type === "bloqueio"
    ? "bg-red-50 border-red-200"
    : type === "pessoal"
    ? "bg-blue-50 border-blue-200"
    : "bg-amber-50 border-amber-200";
}
function appText(type: string, status?: string) {
  if (status === 'confirmed') return "text-emerald-700";
  if (status === 'noshow') return "text-red-700";
  if (status === 'cancelled') return "text-zinc-500";
  return type === "bloqueio" ? "text-red-700" : type === "pessoal" ? "text-blue-700" : "text-zinc-900";
}
function appTimeText(type: string, status?: string) {
  if (status === 'confirmed') return "text-emerald-400";
  if (status === 'noshow') return "text-red-400";
  if (status === 'cancelled') return "text-zinc-400";
  return type === "bloqueio" ? "text-red-400" : type === "pessoal" ? "text-blue-400" : "text-zinc-500";
}

/* ─── Appointment pill (shared) ───────────────────── */
function AppPill({ app, hovered, setHovered, onClick }: { app: any; hovered: boolean; setHovered: (v: string | null) => void; onClick?: () => void }) {
  return (
    <div
      onMouseEnter={() => setHovered(app.id)}
      onMouseLeave={() => setHovered(null)}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        "relative text-[9px] px-1.5 py-1 rounded-lg border truncate font-semibold flex items-center gap-1 cursor-pointer transition-all hover:shadow-sm",
        appBg(app.type, app.status)
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", appColor(app.type, app.status))} />
      <span className={cn("truncate", appText(app.type, app.status))}>
        {app.startTime}{" "}
        {app.type === "bloqueio" ? "Bloq." : app.type === "pessoal" ? "Pessoal" : app.client?.name}
      </span>
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

/* ─── Main component ──────────────────────────────── */
export function AgendaTab({
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
}: AgendaTabProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false);

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
    <div className="flex flex-col h-full gap-3 sm:gap-4">
      {/* ── Top controls ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: view switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-zinc-100 p-1 rounded-xl">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider",
                  view === v
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                {v === "day" ? "Dia" : v === "week" ? "Sem." : "Mês"}
              </button>
            ))}
          </div>
        </div>

        {/* Right: nav + new button */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* today + prev/next */}
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-[10px] font-black text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm uppercase tracking-wider"
          >
            Hoje
          </button>
          <div className="flex items-center gap-0.5 bg-white border border-zinc-200 p-1 rounded-xl shadow-sm">
            <button onClick={navPrev} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors">
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
                <span className="text-[10px] font-black text-zinc-800 px-1.5 sm:px-2 min-w-[90px] sm:min-w-[120px] text-center uppercase tracking-widest cursor-pointer hover:bg-zinc-100 rounded-lg py-1 transition-colors block">
                  {dateLabel}
                </span>
              )}
              className="!w-auto"
            />
            <button onClick={navNext} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>

          <Button
            onClick={() => setIsAppointmentModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-3 sm:px-5 font-bold shadow-sm flex items-center gap-1.5 text-xs h-9"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* ── Calendar card ── */}
      <div className="flex-1 bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col min-h-0">
        {/* Sub-header: legend + filter */}
        <div className="px-3 sm:px-5 py-2.5 border-b border-zinc-100 flex items-center justify-between gap-2 shrink-0">
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
        {view === "day" && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Day header */}
            <div className="px-4 sm:px-6 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3 shrink-0">
              <div
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-base sm:text-lg shrink-0",
                  isToday(currentMonth)
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
                  {isHoliday(currentMonth) && (
                    <span className="bg-red-50 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-widest flex items-center gap-1 shrink-0">
                      <div className="w-1 h-1 rounded-full bg-red-400" />
                      {isHoliday(currentMonth)?.name}
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

            {/* Hourly slots */}
            <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-zinc-50">
              {Array.from({ length: 14 }).map((_, i) => {
                const hour = i + 8;
                const hourStr = `${hour.toString().padStart(2, "0")}:00`;
                const dayApps = appointments.filter(
                  (a) => isSameDay(new Date(a.date), currentMonth) && a.startTime === hourStr
                );
                return (
                  <div key={hour} className="flex gap-3 sm:gap-4 px-3 sm:px-6 py-2.5 hover:bg-zinc-50/50 transition-colors group">
                    <div className="w-10 sm:w-14 shrink-0 text-right pt-0.5">
                      <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400">{hourStr}</span>
                    </div>
                    <div className="flex-1 min-h-[48px] flex flex-col gap-2">
                      {dayApps.length === 0 ? (
                        <button
                          onClick={() => {
                            setNewAppointment((prev: any) => ({ ...prev, date: currentMonth, startTime: hourStr }));
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
                          className="w-full h-[40px] rounded-xl text-[10px] font-bold transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-crosshair border border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-400 flex items-center justify-center gap-2 text-amber-500 hover:text-amber-600"
                        >
                          <div className="w-4 h-4 rounded-full bg-amber-400/90 flex items-center justify-center">
                            <Plus size={10} className="text-white" />
                          </div>
                          <span className="hidden sm:inline">Clique para agendar</span>
                          <span className="sm:hidden">Agendar</span>
                        </button>
                      ) : (
                          dayApps.map((app) => (
                            <div
                              key={app.id}
                              onMouseEnter={() => setHoveredAppointment(app.id)}
                              onMouseLeave={() => setHoveredAppointment(null)}
                              onClick={(e) => { e.stopPropagation(); onAppointmentClick?.(app); }}
                              className={cn(
                                "relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                                appBg(app.type, app.status)
                              )}
                            >
                              <div className={cn("w-1 self-stretch rounded-full shrink-0", appColor(app.type, app.status))} />
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
              })}
            </div>
          </div>
        )}

        {/* ── VIEW: MONTH ── */}
        {view === "month" && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Day names */}
            <div className="grid grid-cols-7 shrink-0">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="py-2 text-[8px] sm:text-[10px] font-black text-zinc-400 text-center border-b border-r border-zinc-100 uppercase tracking-widest bg-zinc-50 last:border-r-0"
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
                    className="border-b border-r border-zinc-100 bg-zinc-50/30 min-h-[60px] sm:min-h-[90px] lg:min-h-[110px]"
                  />
                ))}

                {/* Day cells */}
                {daysInMonth.map((day, idx) => {
                  const dayApps = appointments.filter((a) => isSameDay(new Date(a.date), day));
                  const holiday = isHoliday(day);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentMonth(day);
                        setView("day");
                      }}
                      title={holiday?.name}
                      className={cn(
                        "min-h-[60px] sm:min-h-[90px] lg:min-h-[110px] border-b border-r border-zinc-100 transition-colors hover:bg-zinc-50 relative group cursor-pointer p-1 sm:p-2",
                        !isSameMonth(day, currentMonth) && "opacity-30",
                        isCurrentDay && "bg-amber-50/40"
                      )}
                    >
                      {/* Day number */}
                      <div className="flex items-start justify-between mb-1">
                        <div
                          className={cn(
                            "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black",
                            isCurrentDay ? "bg-amber-500 text-white" : "text-zinc-500"
                          )}
                        >
                          {format(day, "d")}
                        </div>
                        {holiday && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm mt-1 shrink-0" />
                        )}
                      </div>

                      {/* Events — desktop: text pills, mobile: dots */}
                      <div className="space-y-0.5 hidden sm:block">
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
                          <div className="text-[8px] text-zinc-400 font-bold text-center uppercase tracking-tighter">
                            +{dayApps.length - 2}
                          </div>
                        )}
                      </div>

                      {/* Mobile: just colored dots */}
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {dayApps.slice(0, 4).map((app) => (
                          <div
                            key={app.id}
                            className={cn("w-1.5 h-1.5 rounded-full", appColor(app.type))}
                          />
                        ))}
                        {dayApps.length > 4 && (
                          <span className="text-[7px] text-zinc-400 font-black">+{dayApps.length - 4}</span>
                        )}
                      </div>

                      {/* Hover add button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewAppointment((p: any) => ({ ...p, date: day }));
                          setIsAppointmentModalOpen(true);
                        }}
                        className="absolute bottom-1 right-1 p-0.5 bg-zinc-100 rounded-lg text-zinc-400 opacity-0 group-hover:opacity-100 transition-all hover:text-zinc-700 border border-zinc-200"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW: WEEK ── */}
        {view === "week" && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Horizontal scroll wrapper for entire week grid */}
            <div className="flex-1 overflow-auto scrollbar-hide">
              <div style={{ minWidth: "520px" }}>
                {/* Week header */}
                <div
                  className="grid border-b border-zinc-100 sticky top-0 z-10 bg-white"
                  style={{ gridTemplateColumns: "44px repeat(7, 1fr)" }}
                >
                  <div className="border-r border-zinc-100 shrink-0" />
                  {eachDayOfInterval({
                    start: startOfWeek(currentMonth),
                    end: endOfWeek(currentMonth),
                  }).map((day) => (
                    <div
                      key={day.toString()}
                      onClick={() => { setCurrentMonth(day); setView("day"); }}
                      title={isHoliday(day)?.name}
                      className={cn(
                        "py-2 px-1 text-center border-r border-zinc-100 last:border-r-0 relative cursor-pointer hover:bg-zinc-50 transition-colors",
                        isToday(day) && "bg-amber-50/50"
                      )}
                    >
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">
                        {format(day, "EEE", { locale: ptBR })}
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        <p className={cn("text-sm font-black", isToday(day) ? "text-amber-600" : "text-zinc-800")}>
                          {format(day, "d")}
                        </p>
                        {isHoliday(day) && <div className="w-1 h-1 rounded-full bg-red-400" />}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hour rows */}
                {Array.from({ length: 14 }).map((_, i) => {
                  const hour = i + 8;
                  const hourStr = `${hour.toString().padStart(2, "0")}:00`;
                  return (
                    <div
                      key={hour}
                      className="border-b border-zinc-100"
                      style={{ display: "grid", gridTemplateColumns: "44px repeat(7, 1fr)" }}
                    >
                      {/* Hour label */}
                      <div className="py-2 px-1 text-[9px] font-bold text-zinc-400 text-right border-r border-zinc-100 bg-zinc-50/30 shrink-0">
                        {hourStr}
                      </div>

                      {/* Day columns */}
                      {Array.from({ length: 7 }).map((_, j) => {
                        const day = addDays(startOfWeek(currentMonth), j);
                        const app = appointments.find(
                          (a) => isSameDay(new Date(a.date), day) && a.startTime === hourStr
                        );
                        return (
                          <div
                            key={j}
                            className={cn(
                              "relative min-h-[64px] border-r border-zinc-100 last:border-r-0 p-0.5 sm:p-1 transition-colors",
                              isToday(day) && "bg-amber-50/20"
                            )}
                            onMouseEnter={
                              !app
                                ? (e) =>
                                    setSlotHover({
                                      x: e.clientX,
                                      y: e.clientY,
                                      label: `${format(day, "EEE d", { locale: ptBR })} • ${hourStr}`,
                                    })
                                : undefined
                            }
                            onMouseMove={
                              !app
                                ? (e) => setSlotHover((p: any) => (p ? { ...p, x: e.clientX, y: e.clientY } : null))
                                : undefined
                            }
                            onMouseLeave={!app ? () => setSlotHover(null) : undefined}
                            onClick={
                              !app
                                ? () => {
                                    setSlotHover(null);
                                    setNewAppointment((p: any) => ({ ...p, date: day, startTime: hourStr }));
                                    setIsAppointmentModalOpen(true);
                                  }
                                : undefined
                            }
                          >
                            {/* Empty slot hover effect */}
                            {!app && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-150 cursor-crosshair">
                                <div className="inset-0 absolute bg-amber-50/60 border border-dashed border-amber-300 rounded-lg m-0.5" />
                                <div className="relative z-10 w-6 h-6 rounded-full bg-amber-400/90 flex items-center justify-center shadow-sm">
                                  <Plus size={12} className="text-white" />
                                </div>
                              </div>
                            )}

                            {/* Appointment card */}
                            {app && (
                              <div className="relative h-full">
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  onMouseEnter={() => setHoveredAppointment(app.id)}
                                  onMouseLeave={() => setHoveredAppointment(null)}
                                  onClick={(e) => { e.stopPropagation(); onAppointmentClick?.(app); }}
                                  className={cn(
                                    "h-full rounded-lg p-1.5 sm:p-2 flex flex-col justify-between cursor-pointer transition-all border hover:shadow-md",
                                    appBg(app.type, app.status)
                                  )}
                                >
                                  <div>
                                    <p className={cn("text-[9px] font-black leading-tight truncate", appText(app.type, app.status))}>
                                      {app.type === "bloqueio"
                                        ? "🚫 Bloq."
                                        : app.type === "pessoal"
                                        ? "👤 Pessoal"
                                        : app.client?.name}
                                    </p>
                                    {app.type === "atendimento" && app.service && (
                                      <p className="text-[8px] font-bold text-amber-600 truncate hidden sm:block">
                                        {app.service.name}
                                      </p>
                                    )}
                                  </div>
                                  <span className={cn("text-[8px] font-bold", appTimeText(app.type))}>
                                    {app.startTime}
                                  </span>
                                </motion.div>

                                {/* Tooltip */}
                                {hoveredAppointment === app.id && (
                                  <div className="absolute bottom-full left-0 mb-1 z-50 pointer-events-none">
                                    <div className="bg-zinc-900 text-white text-[10px] font-bold rounded-xl p-2.5 shadow-2xl min-w-[150px] space-y-0.5">
                                      <p className="text-amber-400 uppercase tracking-widest text-[9px]">
                                        {format(new Date(app.date), "EEE, d MMM", { locale: ptBR })}
                                      </p>
                                      <p className="text-white">{app.startTime} → {app.endTime}</p>
                                      {app.type === "atendimento" ? (
                                        <>
                                          <p className="text-zinc-300">{app.client?.name}</p>
                                          {app.service && (
                                            <p className="text-zinc-400 text-[9px]">{app.service.name}</p>
                                          )}
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
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
