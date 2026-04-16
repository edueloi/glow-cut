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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Seletor de Profissional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[32px] border border-zinc-200 shadow-sm relative overflow-hidden">
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
          <div className="flex gap-2 bg-zinc-100 p-1 rounded-2xl relative z-10 scale-90 sm:scale-100 origin-right">
            {professionals.map((p: any) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfId(p.id)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black transition-all",
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
          action={
            <div className="flex items-center gap-3">
              {saveStatus === "success" && (
                <Badge color="success" className="animate-in zoom-in h-8 px-3 rounded-lg font-black tracking-widest text-[10px]">
                  <CheckCircle2 size={12} className="mr-1.5" /> Salvo
                </Badge>
              )}
              {hasUnsavedChanges && (
                <Button
                  onClick={handleSaveHours}
                  disabled={isSavingHours}
                  className="bg-zinc-950 hover:bg-black text-white px-6 h-10 rounded-xl font-black shadow-lg"
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
            <div className="space-y-4">
               {scheduleRows.map((row) => (
                 <div 
                   key={row.id}
                   className={cn(
                     "group relative flex flex-col lg:flex-row lg:items-center gap-4 p-5 sm:p-6 rounded-[24px] border transition-all",
                     row.isOpen 
                       ? "bg-white border-zinc-200 hover:border-amber-200" 
                       : "bg-zinc-50/50 border-zinc-100 opacity-60"
                   )}
                 >
                   {/* Dia da Semana */}
                   <div className="flex items-center gap-4 min-w-[160px]">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black border transition-all",
                        row.isOpen ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-white border-zinc-200 text-zinc-400"
                      )}>
                        {DAY_SHORT[row.dayOfWeek]}
                      </div>
                      <div>
                        <h4 className="font-black text-zinc-900 leading-none">{DAY_NAMES[row.dayOfWeek]}</h4>
                        <p className={cn("text-[10px] font-bold mt-1.5 uppercase tracking-widest", row.isOpen ? "text-emerald-500" : "text-zinc-400")}>
                          {row.isOpen ? "Aberto para Agenda" : "Loja Fechada"}
                        </p>
                      </div>
                   </div>

                   {/* Horários */}
                   <div className={cn("flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 transition-all", !row.isOpen && "pointer-events-none")}>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Abertura</label>
                        <input 
                          type="time" 
                          value={row.startTime} 
                          onChange={(e) => handleTimeChange(row.id, "startTime", e.target.value)}
                          className="ds-input h-10 px-3 bg-zinc-50 border-zinc-100 focus:bg-white"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Início Intervalo</label>
                        <input 
                          type="time" 
                          value={row.breakStart || ""} 
                          onChange={(e) => handleTimeChange(row.id, "breakStart", e.target.value)}
                          className="ds-input h-10 px-3 bg-zinc-50 border-zinc-100 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Fim Intervalo</label>
                        <input 
                          type="time" 
                          value={row.breakEnd || ""} 
                          onChange={(e) => handleTimeChange(row.id, "breakEnd", e.target.value)}
                          className="ds-input h-10 px-3 bg-zinc-50 border-zinc-100 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter">Encerramento</label>
                        <input 
                          type="time" 
                          value={row.endTime} 
                          onChange={(e) => handleTimeChange(row.id, "endTime", e.target.value)}
                          className="ds-input h-10 px-3 bg-zinc-50 border-zinc-100 focus:bg-white"
                        />
                      </div>
                   </div>

                   {/* Switch */}
                   <div className="lg:pl-6 lg:border-l lg:border-zinc-100 flex items-center justify-between lg:justify-end gap-3 mt-2 lg:mt-0">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-tighter lg:hidden">Status do Dia</span>
                      <Switch checked={row.isOpen} onCheckedChange={() => handleToggleDay(row.id)} />
                   </div>
                 </div>
               ))}
            </div>
          )}
        </PanelCard>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-6 flex gap-4">
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
