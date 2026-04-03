import React from "react";
import { format, isToday, isSameDay, isSameMonth, subMonths, addMonths, startOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react";
import { isHoliday } from "@/src/lib/holidays";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { motion } from "motion/react";

interface AgendaTabProps {
  view: 'day' | 'week' | 'month';
  setView: (val: 'day' | 'week' | 'month') => void;
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
}

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
  setHoveredAppointment
}: AgendaTabProps) {
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(['day', 'week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn("px-3 sm:px-5 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider",
                view === v ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm uppercase tracking-wider">
            Hoje
          </button>
          <div className="flex items-center gap-1 bg-white border border-zinc-200 p-1 rounded-xl shadow-sm">
            <button 
              onClick={() => {
                if (view === 'day') setCurrentMonth(prev => subDays(prev, 1));
                else if (view === 'week') setCurrentMonth(prev => addDays(prev, -7));
                else setCurrentMonth(prev => subMonths(prev, 1));
              }} 
              className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ChevronLeft size={15}/>
            </button>
            
            <div className="min-w-[130px] flex items-center justify-center">
              <DatePicker
                value={format(currentMonth, 'yyyy-MM-dd')}
                onChange={(val) => {
                  if (val) {
                    const [y, m, d] = val.split('-').map(Number);
                    setCurrentMonth(new Date(y, m - 1, d));
                  }
                }}
                renderTrigger={() => (
                  <span className="text-[11px] font-black text-zinc-800 px-2 min-w-[110px] text-center uppercase tracking-widest cursor-pointer hover:bg-zinc-100 rounded-lg py-1 transition-colors">
                    {view === 'day' ? format(currentMonth, "dd MMM yyyy", { locale: ptBR }) :
                     view === 'week' ? `${format(startOfWeek(currentMonth), "dd MMM", { locale: ptBR })} - ${format(endOfWeek(currentMonth), "dd MMM", { locale: ptBR })}` :
                     format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </span>
                )}
                className="!w-auto"
              />
            </div>

            <button 
              onClick={() => {
                if (view === 'day') setCurrentMonth(prev => addDays(prev, 1));
                else if (view === 'week') setCurrentMonth(prev => addDays(prev, 7));
                else setCurrentMonth(prev => addMonths(prev, 1));
              }} 
              className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <ChevronRight size={15}/>
            </button>
          </div>
          <Button onClick={() => setIsAppointmentModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-3 sm:px-5 font-bold shadow-sm flex items-center gap-2 text-xs">
            <Plus size={15} /><span className="hidden sm:inline">Novo Agendamento</span><span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Atendimento</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bloqueio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pessoal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-zinc-400" />
            <select
              value={selectedProfessional}
              onChange={e => setSelectedProfessional(e.target.value)}
              className="text-[10px] font-bold bg-transparent text-zinc-600 outline-none cursor-pointer uppercase tracking-widest"
            >
              <option value="all">Todos Profissionais</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-hide">
          {view === 'day' && (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg", isToday(currentMonth) ? "bg-amber-500 text-white" : "bg-white border border-zinc-200 text-zinc-800")}>
                  {format(currentMonth, 'd')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-zinc-900 capitalize">{format(currentMonth, "EEEE", { locale: ptBR })}</p>
                    {isHoliday(currentMonth) && (
                      <span className="bg-red-50 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-widest flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-red-400" />
                        Feriado: {isHoliday(currentMonth)?.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</p>
                </div>
                <div className="ml-auto text-[10px] font-bold text-zinc-400">
                  {appointments.filter(a => isSameDay(new Date(a.date), currentMonth)).length} agendamentos
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-zinc-50">
                {Array.from({ length: 14 }).map((_, i) => {
                  const hour = i + 8;
                  const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                  const dayApps = appointments.filter(a => isSameDay(new Date(a.date), currentMonth) && a.startTime === hourStr);
                  return (
                    <div key={hour} className="flex gap-4 px-6 py-3 hover:bg-zinc-50/50 transition-colors group">
                      <div className="w-14 shrink-0 text-right">
                        <span className="text-[10px] font-bold text-zinc-400">{hourStr}</span>
                      </div>
                      <div className="flex-1 min-h-[52px] flex flex-col gap-2">
                        {dayApps.length === 0 ? (
                          <button
                            onClick={() => { setNewAppointment(prev => ({ ...prev, date: currentMonth, startTime: hourStr })); setIsAppointmentModalOpen(true); setSlotHover(null); }}
                            onMouseEnter={(e) => setSlotHover({ x: e.clientX, y: e.clientY, label: `${format(currentMonth, 'EEE d', { locale: ptBR })} • ${hourStr}` })}
                            onMouseMove={(e) => setSlotHover(p => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                            onMouseLeave={() => setSlotHover(null)}
                            className="w-full h-[44px] rounded-xl text-[10px] font-bold transition-all duration-150 opacity-0 group-hover:opacity-100 cursor-crosshair relative overflow-hidden border border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-400 hover:shadow-inner flex items-center justify-center gap-2 text-amber-500 hover:text-amber-600"
                          >
                            <div className="w-5 h-5 rounded-full bg-amber-400/90 flex items-center justify-center">
                              <Plus size={11} className="text-white"/>
                            </div>
                            Clique para agendar
                          </button>
                        ) : (
                          dayApps.map(app => (
                            <div
                              key={app.id}
                              onMouseEnter={() => setHoveredAppointment(app.id)}
                              onMouseLeave={() => setHoveredAppointment(null)}
                              className={cn(
                                "relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-default",
                                app.type === 'bloqueio' ? "bg-red-50 border-red-200" :
                                app.type === 'pessoal' ? "bg-blue-50 border-blue-200" :
                                "bg-amber-50 border-amber-200"
                              )}
                            >
                              <div className={cn("w-1 self-stretch rounded-full shrink-0",
                                app.type === 'bloqueio' ? "bg-red-400" :
                                app.type === 'pessoal' ? "bg-blue-400" : "bg-amber-400"
                              )} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-zinc-900 truncate">
                                  {app.type === 'bloqueio' ? '🚫 Horário Bloqueado' : app.type === 'pessoal' ? '👤 Compromisso Pessoal' : app.client?.name}
                                </p>
                                {app.type === 'atendimento' && app.service && (
                                  <p className="text-[10px] text-zinc-500 font-bold mt-0.5 truncate">{app.service.name}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] font-bold text-zinc-500">{app.startTime}–{app.endTime}</p>
                                {app.professional && <p className="text-[9px] text-zinc-400">{app.professional.name.split(' ')[0]}</p>}
                              </div>
                              {hoveredAppointment === app.id && app.type === 'atendimento' && app.comanda && (
                                <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-200 uppercase tracking-wide shrink-0">
                                  Comanda
                                </span>
                              )}
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

          {view === 'month' && (
            <div className="grid grid-cols-7 h-full">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-3 text-[10px] font-bold text-zinc-400 text-center border-b border-r border-zinc-100 uppercase tracking-widest bg-zinc-50">{day}</div>
              ))}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} className="h-32 border-r border-b border-zinc-100 bg-zinc-50/50 opacity-50" />
              ))}
              {daysInMonth.map((day, idx) => {
                const dayAppointments = appointments.filter(a => isSameDay(new Date(a.date), day));
                return (
                  <div
                    key={idx}
                    onClick={() => { setCurrentMonth(day); setView('day'); }}
                    className={cn(
                      "min-h-[120px] p-3 border-b border-r border-zinc-100 transition-colors hover:bg-zinc-50 relative group cursor-pointer",
                      !isSameMonth(day, currentMonth) && "bg-zinc-50/50 opacity-40",
                      isToday(day) && "bg-amber-50/50"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={cn("text-[10px] font-bold block", isToday(day) ? "text-amber-600" : "text-zinc-500")}>
                        {format(day, 'd')}
                      </span>
                      {isHoliday(day) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm" title={isHoliday(day)?.name} />
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map(app => (
                        <div
                          key={app.id}
                          onMouseEnter={() => setHoveredAppointment(app.id)}
                          onMouseLeave={() => setHoveredAppointment(null)}
                          className={cn(
                            "relative text-[9px] p-1.5 rounded-lg border truncate font-medium flex items-center gap-1.5 cursor-default",
                            app.type === 'bloqueio' ? "bg-red-50 border-red-100 text-red-700" :
                            app.type === 'pessoal' ? "bg-blue-50 border-blue-100 text-blue-700" :
                            "bg-amber-50 border-amber-100 text-zinc-700"
                          )}
                        >
                          <div className={cn("w-1 h-1 rounded-full shrink-0",
                            app.type === 'bloqueio' ? "bg-red-500" :
                            app.type === 'pessoal' ? "bg-blue-500" : "bg-amber-500"
                          )} />
                          {app.startTime} {app.type === 'bloqueio' ? '🚫' : app.type === 'pessoal' ? '👤' : app.client?.name}
                          {hoveredAppointment === app.id && (
                            <div className="absolute bottom-full left-0 mb-1 z-50 pointer-events-none">
                              <div className="bg-zinc-900 text-white text-[10px] font-bold rounded-xl p-2.5 shadow-2xl min-w-[140px] space-y-0.5">
                                <p className="text-amber-400 text-[9px] uppercase tracking-wider">{app.startTime} → {app.endTime}</p>
                                {app.type === 'atendimento' ? (
                                  <>
                                    <p>{app.client?.name}</p>
                                    {app.service && <p className="text-zinc-400 text-[9px]">{app.service.name}</p>}
                                  </>
                                ) : (
                                  <p className="text-zinc-300">{app.type === 'bloqueio' ? 'Horário bloqueado' : 'Compromisso pessoal'}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-[8px] text-zinc-400 font-bold text-center mt-1 uppercase tracking-tighter">
                          +{dayAppointments.length - 3} mais
                        </div>
                      )}
                    </div>
                    <button className="absolute bottom-2 right-2 p-1 bg-zinc-100 rounded-lg text-zinc-400 opacity-0 group-hover:opacity-100 transition-all hover:text-zinc-700 border border-zinc-200">
                      <Plus size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {view === 'week' && (
            <div className="flex flex-col h-full">
              {/* Week header — scroll horizontal no mobile */}
              <div className="overflow-x-auto scrollbar-hide">
                <div className="grid border-b border-zinc-100 sticky top-0 z-10 bg-white" style={{ gridTemplateColumns: '56px repeat(7, minmax(90px, 1fr))' }}>
                  <div className="p-3 border-r border-zinc-100 shrink-0" />
                  {eachDayOfInterval({ start: startOfWeek(currentMonth), end: endOfWeek(currentMonth) }).map(day => (
                    <div key={day.toString()} className={cn("p-3 text-center border-r border-zinc-100 min-w-[90px] relative", isToday(day) && "bg-amber-50/50")}>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{format(day, 'EEE', { locale: ptBR })}</p>
                      <div className="flex items-center justify-center gap-1.5">
                        <p className={cn("text-sm font-black", isToday(day) ? "text-amber-600" : "text-zinc-800")}>{format(day, 'd')}</p>
                        {isHoliday(day) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-sm" title={isHoliday(day)?.name} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-hide">
                {Array.from({ length: 14 }).map((_, i) => {
                  const hour = i + 8;
                  return (
                    <div key={hour} className="border-b border-zinc-100" style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, minmax(90px, 1fr))' }}>
                      <div className="p-2 text-[10px] font-bold text-zinc-400 text-right border-r border-zinc-100 bg-zinc-50/50 shrink-0 w-14">{hour}:00</div>
                      {Array.from({ length: 7 }).map((_, j) => {
                        const day = addDays(startOfWeek(currentMonth), j);
                        const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                        const app = appointments.find(a => isSameDay(new Date(a.date), day) && a.startTime === hourStr);
                        return (
                          <div key={j}
                            className={cn("p-1 border-r border-zinc-100 min-h-[80px] relative transition-colors", isToday(day) && "bg-amber-50/30")}
                            onMouseEnter={!app ? (e) => setSlotHover({ x: e.clientX, y: e.clientY, label: `${format(day, 'EEE d', { locale: ptBR })} • ${hourStr}` }) : undefined}
                            onMouseMove={!app ? (e) => setSlotHover(p => p ? { ...p, x: e.clientX, y: e.clientY } : null) : undefined}
                            onMouseLeave={!app ? () => setSlotHover(null) : undefined}
                            onClick={!app ? () => { setSlotHover(null); setNewAppointment(p => ({ ...p, date: day, startTime: hourStr })); setIsAppointmentModalOpen(true); } : undefined}
                          >
                            {/* Empty slot hover indicator */}
                            {!app && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-150 cursor-crosshair group/slot">
                                <div className="inset-0 absolute bg-amber-50/60 border border-dashed border-amber-300 rounded-lg m-0.5 shadow-inner" />
                                <div className="relative z-10 w-7 h-7 rounded-full bg-amber-400/90 flex items-center justify-center shadow-sm">
                                  <Plus size={14} className="text-white" />
                                </div>
                              </div>
                            )}
                            {app && (
                              <div className="relative group/app">
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  onMouseEnter={() => setHoveredAppointment(app.id)}
                                  onMouseLeave={() => setHoveredAppointment(null)}
                                  className={cn(
                                    "h-full rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all border",
                                    app.type === 'bloqueio'
                                      ? "bg-red-50 border-red-200 hover:bg-red-100"
                                      : app.type === 'pessoal'
                                      ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                                      : "bg-amber-50 border-amber-200 hover:bg-amber-100"
                                  )}
                                >
                                  <div>
                                    <p className={cn("text-[10px] font-black leading-tight mb-1",
                                      app.type === 'bloqueio' ? "text-red-700" :
                                      app.type === 'pessoal' ? "text-blue-700" : "text-zinc-900"
                                    )}>
                                      {app.type === 'bloqueio' ? '🚫 Bloqueado' : app.type === 'pessoal' ? '👤 Pessoal' : app.client?.name}
                                    </p>
                                    {app.type === 'atendimento' && app.service && (
                                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter truncate">{app.service.name}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className={cn("text-[8px] font-bold",
                                      app.type === 'bloqueio' ? "text-red-400" :
                                      app.type === 'pessoal' ? "text-blue-400" : "text-zinc-500"
                                    )}>{app.startTime}–{app.endTime}</span>
                                    {app.professional && (
                                      <span className="text-[7px] font-bold text-zinc-400 truncate max-w-[50px]">{app.professional.name.split(' ')[0]}</span>
                                    )}
                                  </div>
                                </motion.div>
                                {/* Tooltip */}
                                {hoveredAppointment === app.id && (
                                  <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
                                    <div className="bg-zinc-900 text-white text-[10px] font-bold rounded-xl p-3 shadow-2xl min-w-[160px] space-y-1">
                                      <p className="text-amber-400 uppercase tracking-widest text-[9px]">{format(new Date(app.date), "EEEE, d MMM", { locale: ptBR })}</p>
                                      <p className="text-white">{app.startTime} → {app.endTime}</p>
                                      {app.type === 'atendimento' ? (
                                        <>
                                          <p className="text-zinc-300">{app.client?.name}</p>
                                          {app.service && <p className="text-zinc-400 text-[9px]">{app.service.name}</p>}
                                          {app.professional && <p className="text-zinc-400 text-[9px]">{app.professional.name}</p>}
                                        </>
                                      ) : (
                                        <p className="text-zinc-300">{app.type === 'bloqueio' ? 'Horário bloqueado' : 'Compromisso pessoal'}</p>
                                      )}
                                    </div>
                                    <div className="w-2 h-2 bg-zinc-900 rotate-45 ml-3 -mt-1" />
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
          )}
        </div>
      </div>
    </div>
  );
}
