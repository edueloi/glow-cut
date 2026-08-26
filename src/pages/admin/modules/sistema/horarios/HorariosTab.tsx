import React, { useState } from "react";
import { 
  Clock, 
  Save, 
  Plus, 
  Trash2, 
  CalendarOff, 
  Calendar as CalendarIcon, 
  User, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Coffee
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { Button, PanelCard, Input, Badge, SectionTitle, FormRow, Divider, Switch, DatePicker } from "@/src/components/ui";
import { apiFetch } from "@/src/lib/api";

type WorkingHour = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOpen: boolean;
  breakStart: string | null;
  breakEnd: string | null;
};

type Holiday = {
  id: string;
  date: string;
  name: string;
};

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface HorariosTabProps {
  workingHours: WorkingHour[];
  setWorkingHours: SetState<WorkingHour[]>;
  localWorkingHours: WorkingHour[];
  setLocalWorkingHours: SetState<WorkingHour[]>;
  holidays: Holiday[];
  setHolidays: SetState<Holiday[]>;
  newHoliday: { date: string; name: string };
  setNewHoliday: SetState<{ date: string; name: string }>;
  professionals?: any[];
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export function HorariosTab({
  workingHours,
  setWorkingHours,
  localWorkingHours,
  setLocalWorkingHours,
  holidays,
  setHolidays,
  newHoliday,
  setNewHoliday,
  professionals = []
}: HorariosTabProps) {
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [isLoadingHours, setIsLoadingHours] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [selectedProfId, setSelectedProfId] = useState<string>("");

  // Initialize selectedProfId
  React.useEffect(() => {
    if (professionals.length > 0 && !selectedProfId) {
      setSelectedProfId(professionals[0].id);
    }
  }, [professionals]);

  // Fetch hours when professional changes
  React.useEffect(() => {
    if (selectedProfId) {
      fetchProfessionalHours(selectedProfId);
    }
  }, [selectedProfId]);

  const fetchProfessionalHours = async (id: string) => {
    setIsLoadingHours(true);
    try {
      const res = await apiFetch(`/api/settings/working-hours?professionalId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setWorkingHours(data);
        setLocalWorkingHours(data.map((h: any) => ({ ...h })));
      }
    } catch (e) {
      console.error("Erro ao buscar horários:", e);
    } finally {
      setIsLoadingHours(false);
    }
  };

  const scheduleRows = localWorkingHours.length > 0 ? localWorkingHours : workingHours;

  const handleToggleDay = (id: string) => {
    setLocalWorkingHours((prev) =>
      prev.map((row) => (row.id === id ? { ...row, isOpen: !row.isOpen } : row))
    );
    setSaveStatus("idle");
  };

  const handleTimeChange = (id: string, field: keyof WorkingHour, value: string) => {
    setLocalWorkingHours((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
    setSaveStatus("idle");
  };

  const handleSaveHours = async () => {
    setIsSavingHours(true);
    try {
      const res = await apiFetch("/api/settings/working-hours", {
        method: "PUT",
        body: JSON.stringify({ hours: localWorkingHours, professionalId: selectedProfId }),
      });
      if (res.ok) {
        setWorkingHours([...localWorkingHours]);
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSavingHours(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(localWorkingHours) !== JSON.stringify(workingHours);

  return (
    <div className="w-full min-w-0 space-y-4 p-3 animate-in fade-in duration-500 sm:p-5 lg:space-y-6 lg:p-6">
      {/* Seletor de Profissional */}
      <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:rounded-3xl">
        <div className="absolute top-0 right-0 p-4 opacity-5">
           <User size={80} />
        </div>
        <div className="relative z-10">
          <SectionTitle 
            title="Horário de Atendimento" 
            description="Configure a grade de horários padrão para recebimento de agendamentos."
          />
        </div>
        
        {professionals.length > 1 && (
          <div className="relative z-10 -mx-1 flex max-w-full gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 sm:mx-0 sm:rounded-2xl">
            {professionals.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfId(p.id)}
                className={cn(
                  "min-h-10 shrink-0 rounded-lg px-4 py-2 text-xs font-black transition-all sm:rounded-xl",
                  selectedProfId === p.id 
                    ? "bg-white text-zinc-900 shadow-sm" 
                    : "text-zinc-500 hover:text-zinc-800"
                )}
              >
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <PanelCard
          title="Grade Semanal"
          description="Defina os horários de início, término e intervalo para cada dia da semana."
          icon={Clock}
          iconWrapClassName="bg-amber-50 border-amber-100"
          iconClassName="text-amber-600"
          className="rounded-2xl lg:rounded-3xl"
          headerClassName="gap-3 px-4 py-4 sm:px-6 sm:py-5"
          contentClassName="p-3 sm:p-4 lg:p-5"
          action={
            <div className="flex w-full items-center gap-2 lg:w-auto lg:justify-end">
              {saveStatus === "success" && (
                <Badge color="success" className="animate-in zoom-in h-8 px-3 rounded-lg font-black tracking-widest text-[10px]">
                  <CheckCircle2 size={12} className="mr-1.5" /> Salvo
                </Badge>
              )}
              {hasUnsavedChanges && (
                <Button
                  onClick={handleSaveHours}
                  disabled={isSavingHours}
                  className="h-10 flex-1 rounded-xl bg-zinc-950 px-5 font-black text-white shadow-lg hover:bg-black sm:flex-none"
                  iconLeft={isSavingHours ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                >
                  {isSavingHours ? "Salvando..." : "Salvar Grade"}
                </Button>
              )}
            </div>
          }
        >
          {isLoadingHours ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-4">
               <Loader2 size={40} className="animate-spin text-amber-500" />
               <p className="text-sm font-bold animate-pulse">Carregando horários...</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
               {scheduleRows.map((row) => (
                 <div 
                   key={row.id}
                   className={cn(
                     "group relative grid min-w-0 gap-4 rounded-2xl border p-4 transition-all sm:p-5 xl:grid-cols-[180px_minmax(0,1fr)_auto] xl:items-center xl:gap-5",
                     row.isOpen 
                       ? "border-zinc-200 bg-white hover:border-amber-200 hover:shadow-sm"
                       : "border-zinc-200/70 bg-zinc-50/70"
                   )}
                 >
                   {/* Dia da Semana */}
                   <div className="flex min-w-0 items-center gap-3 pr-16 sm:gap-4 xl:pr-0">
                      <div className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[11px] font-black transition-all sm:h-12 sm:w-12 sm:rounded-2xl sm:text-xs",
                        row.isOpen ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-white border-zinc-200 text-zinc-400"
                      )}>
                        {DAY_SHORT[row.dayOfWeek]}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate font-black leading-none text-zinc-900">{DAY_NAMES[row.dayOfWeek]}</h4>
                        <p className={cn("mt-1.5 truncate text-[9px] font-bold uppercase tracking-wider sm:text-[10px]", row.isOpen ? "text-emerald-600" : "text-zinc-400")}>
                          {row.isOpen ? "Aberto para Agenda" : "Loja Fechada"}
                        </p>
                      </div>
                   </div>

                   {/* Horários */}
                   <fieldset
                     disabled={!row.isOpen}
                     className={cn(
                       "grid min-w-0 grid-cols-1 gap-3 transition-all min-[430px]:grid-cols-2 md:gap-4 xl:grid-cols-4",
                       !row.isOpen && "hidden xl:grid"
                     )}
                   >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Abertura</label>
                        <input 
                          type="time" 
                          value={row.startTime} 
                          onChange={(e) => handleTimeChange(row.id, "startTime", e.target.value)}
                          className="ds-input h-11 min-w-0 bg-zinc-50 px-3 tabular-nums focus:bg-white"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Início Intervalo</label>
                        <input 
                          type="time" 
                          value={row.breakStart || ""} 
                          onChange={(e) => handleTimeChange(row.id, "breakStart", e.target.value)}
                          className="ds-input h-11 min-w-0 bg-zinc-50 px-3 tabular-nums focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Fim Intervalo</label>
                        <input 
                          type="time" 
                          value={row.breakEnd || ""} 
                          onChange={(e) => handleTimeChange(row.id, "breakEnd", e.target.value)}
                          className="ds-input h-11 min-w-0 bg-zinc-50 px-3 tabular-nums focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Encerramento</label>
                        <input 
                          type="time" 
                          value={row.endTime} 
                          onChange={(e) => handleTimeChange(row.id, "endTime", e.target.value)}
                          className="ds-input h-11 min-w-0 bg-zinc-50 px-3 tabular-nums focus:bg-white"
                        />
                      </div>
                   </fieldset>

                   {/* Switch */}
                   <div className="absolute right-4 top-5 flex items-center sm:right-5 sm:top-6 xl:static xl:justify-end xl:border-l xl:border-zinc-100 xl:pl-5">
                      <span className="sr-only">{row.isOpen ? `Fechar ${DAY_NAMES[row.dayOfWeek]}` : `Abrir ${DAY_NAMES[row.dayOfWeek]}`}</span>
                      <Switch checked={row.isOpen} onCheckedChange={() => handleToggleDay(row.id)} />
                   </div>
                 </div>
               ))}
            </div>
          )}
        </PanelCard>

        {/* Info Box */}
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:gap-4 sm:p-5 lg:p-6">
           <Info className="text-amber-600 shrink-0" size={20} />
           <div className="space-y-1">
              <p className="text-sm font-black text-amber-900">Sobre a Grade de Horários</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Estes são os horários que aparecerão para o seu cliente na agenda online. 
                Os intervalos (almoço/pausa) removem automaticamente esses horários da disponibilidade. 
                Para fechar datas específicas ou feriados, utilize a aba de <strong>Liberações e Fechamentos</strong>.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
