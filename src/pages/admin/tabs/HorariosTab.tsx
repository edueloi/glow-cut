import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, CalendarOff, Sun, Plus, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";

interface HorariosTabProps {
  workingHours: any[];
  localWorkingHours: any[];
  setLocalWorkingHours: (val: any | ((prev: any) => any)) => void;
  holidays: any[];
  setHolidays: (val: any | ((prev: any) => any)) => void;
  newHoliday: { date: string, name: string };
  setNewHoliday: (val: any | ((prev: any) => any)) => void;
}

export function HorariosTab({
  workingHours,
  localWorkingHours,
  setLocalWorkingHours,
  holidays,
  setHolidays,
  newHoliday,
  setNewHoliday
}: HorariosTabProps) {
  return (
    <div className="max-w-3xl space-y-6">
      {/* Grade semanal */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-6 border-b border-zinc-100">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Horário de Funcionamento</h3>
            <p className="text-[10px] text-zinc-400 font-medium">Defina quais dias e horários o studio está aberto</p>
          </div>
          <Button
            className="ml-auto bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-sm"
            onClick={async () => {
              for (const wh of localWorkingHours) {
                await fetch(`/api/settings/working-hours/${wh.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ isOpen: wh.isOpen, startTime: wh.startTime, endTime: wh.endTime })
                });
              }
            }}
          >
            Salvar
          </Button>
        </div>
        <div className="divide-y divide-zinc-100">
          {(localWorkingHours.length > 0 ? localWorkingHours : workingHours).map((wh, i) => {
            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            const dayShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            return (
              <div key={wh.id} className={cn(
                "flex items-center gap-4 px-6 py-4 transition-colors",
                !wh.isOpen && "opacity-50"
              )}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500">
                  {dayShort[wh.dayOfWeek]}
                </div>
                <span className="text-xs font-bold text-zinc-800 w-20">{dayNames[wh.dayOfWeek]}</span>
                <div className={cn("flex items-center gap-2 flex-1 transition-all", !wh.isOpen && "pointer-events-none")}>
                  <input
                    type="time"
                    value={wh.startTime}
                    onChange={e => setLocalWorkingHours((prev: any[]) => prev.map((h, idx) => idx === i ? { ...h, startTime: e.target.value } : h))}
                    className="w-24 text-xs p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-bold text-zinc-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                  <span className="text-zinc-400 text-[10px] font-bold">até</span>
                  <input
                    type="time"
                    value={wh.endTime}
                    onChange={e => setLocalWorkingHours((prev: any[]) => prev.map((h, idx) => idx === i ? { ...h, endTime: e.target.value } : h))}
                    className="w-24 text-xs p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-bold text-zinc-800 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", wh.isOpen ? "text-emerald-600" : "text-zinc-400")}>
                    {wh.isOpen ? "Aberto" : "Fechado"}
                  </span>
                  <button
                    onClick={() => setLocalWorkingHours((prev: any[]) => prev.map((h, idx) => idx === i ? { ...h, isOpen: !h.isOpen } : h))}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-all duration-200",
                      wh.isOpen ? "bg-amber-500" : "bg-zinc-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200",
                      wh.isOpen ? "left-6" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feriados & Fechamentos */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-6 border-b border-zinc-100">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
            <CalendarOff size={20} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Feriados & Fechamentos</h3>
            <p className="text-[10px] text-zinc-400 font-medium">Datas bloqueadas na agenda dos clientes</p>
          </div>
        </div>

        {/* Adicionar feriado */}
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/60">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Adicionar data fechada</p>
          <div className="flex gap-3">
            <input
              type="date"
              value={newHoliday.date}
              onChange={e => setNewHoliday((prev: any) => ({ ...prev, date: e.target.value }))}
              className="text-xs p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
            />
            <input
              type="text"
              placeholder="Ex: Natal, Recesso..."
              value={newHoliday.name}
              onChange={e => setNewHoliday((prev: any) => ({ ...prev, name: e.target.value }))}
              className="flex-1 text-xs p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
            />
            <button
              onClick={() => {
                if (!newHoliday.date || !newHoliday.name) return;
                setHolidays((prev: any[]) => [...prev, { id: Date.now().toString(), ...newHoliday }]);
                setNewHoliday({ date: '', name: '' });
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Lista de feriados */}
        {holidays.length === 0 ? (
          <div className="p-10 flex flex-col items-center gap-2 text-center">
            <Sun size={28} className="text-zinc-300" />
            <p className="text-xs font-bold text-zinc-400">Nenhuma data cadastrada ainda</p>
            <p className="text-[10px] text-zinc-300">Adicione feriados e dias de folga acima</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {holidays.map(h => (
              <div key={h.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-black text-rose-400 uppercase leading-none">
                    {format(new Date(h.date + 'T12:00:00'), 'MMM', { locale: ptBR })}
                  </span>
                  <span className="text-sm font-black text-rose-600 leading-none">
                    {format(new Date(h.date + 'T12:00:00'), 'dd')}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-zinc-800">{h.name}</p>
                  <p className="text-[10px] text-zinc-400">
                    {format(new Date(h.date + 'T12:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <button
                  onClick={() => setHolidays((prev: any[]) => prev.filter(x => x.id !== h.id))}
                  className="p-2 rounded-lg hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
