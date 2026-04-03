import React, { useState } from "react";
import { apiFetch } from "@/src/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarOff, Clock3, Plus, Sparkles, Sun, X } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { StatCard } from "@/src/components/ui/StatCard";
import { Switch } from "@/src/components/ui/Switch";

type SetState<T> = (value: T | ((prev: T) => T)) => void;

interface WorkingHour {
  id: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface HorariosTabProps {
  workingHours: WorkingHour[];
  setWorkingHours: SetState<WorkingHour[]>;
  localWorkingHours: WorkingHour[];
  setLocalWorkingHours: SetState<WorkingHour[]>;
  holidays: Holiday[];
  setHolidays: SetState<Holiday[]>;
  newHoliday: { date: string; name: string };
  setNewHoliday: SetState<{ date: string; name: string }>;
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function parseMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function getDurationInMinutes(startTime: string, endTime: string) {
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);

  if (start === null || end === null || end <= start) {
    return 0;
  }

  return end - start;
}

function formatMinutesLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) return "0h";
  if (minutes === 0) return `${hours}h`;
  if (hours === 0) return `${minutes}min`;

  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

function formatHolidayDate(date: string, pattern: string) {
  return format(new Date(`${date}T12:00:00`), pattern, { locale: ptBR });
}

function formatHolidayBadgeMonth(date: string) {
  return formatHolidayDate(date, "MMM").replace(".", "").slice(0, 3).toUpperCase();
}

export function HorariosTab({
  workingHours,
  setWorkingHours,
  localWorkingHours,
  setLocalWorkingHours,
  holidays,
  setHolidays,
  newHoliday,
  setNewHoliday
}: HorariosTabProps) {
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const scheduleRows = localWorkingHours.length > 0 ? localWorkingHours : workingHours;
  const sortedHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  const openDays = scheduleRows.filter((row) => row.isOpen);
  const openDaysCount = openDays.length;
  const closedDaysCount = Math.max(scheduleRows.length - openDaysCount, 0);
  const weeklyMinutes = openDays.reduce(
    (total, row) => total + getDurationInMinutes(row.startTime, row.endTime),
    0
  );
  const today = new Date().toISOString().slice(0, 10);
  const nextHoliday = sortedHolidays.find((holiday) => holiday.date >= today);
  const hasUnsavedChanges =
    scheduleRows.length !== workingHours.length ||
    scheduleRows.some((row) => {
      const original = workingHours.find((hour) => hour.id === row.id);
      if (!original) return true;
      return (
        original.isOpen !== row.isOpen ||
        original.startTime !== row.startTime ||
        original.endTime !== row.endTime
      );
    });

  const hydrateHours = () => workingHours.map((hour) => ({ ...hour }));

  const updateHours = (updater: (hours: WorkingHour[]) => WorkingHour[]) => {
    setSaveStatus("idle");
    setLocalWorkingHours((prev) => {
      const source = prev.length > 0 ? prev : hydrateHours();
      return updater(source);
    });
  };

  const handleTimeChange = (
    id: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    updateHours((hours) =>
      hours.map((hour) => (hour.id === id ? { ...hour, [field]: value } : hour))
    );
  };

  const handleToggleDay = (id: string) => {
    updateHours((hours) =>
      hours.map((hour) =>
        hour.id === id ? { ...hour, isOpen: !hour.isOpen } : hour
      )
    );
  };

  const handleSaveHours = async () => {
    const payload = scheduleRows.map((hour) => ({
      id: hour.id,
      dayOfWeek: hour.dayOfWeek,
      isOpen: hour.isOpen,
      startTime: hour.startTime,
      endTime: hour.endTime,
      breakStart: hour.breakStart ?? null,
      breakEnd: hour.breakEnd ?? null,
    }));

    setIsSavingHours(true);
    setSaveStatus("idle");

    try {
      const response = await apiFetch("/api/settings/working-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: payload }),
      });

      if (!response.ok) {
        throw new Error("save_failed");
      }

      const nextHours = payload.map((hour) => ({ ...hour }));
      setWorkingHours(nextHours);
      setLocalWorkingHours(nextHours.map((hour) => ({ ...hour })));
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleAddHoliday = () => {
    const name = newHoliday.name.trim();
    if (!newHoliday.date || !name) return;

    setHolidays((prev) => [
      ...prev,
      { id: Date.now().toString(), date: newHoliday.date, name },
    ]);
    setNewHoliday({ date: "", name: "" });
  };

  const saveMessage =
    saveStatus === "success"
      ? "Horários salvos com sucesso."
      : saveStatus === "error"
        ? "Não foi possível salvar agora."
        : hasUnsavedChanges
          ? "Você tem alterações pendentes."
          : "Tudo sincronizado.";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Dias abertos"
          value={openDaysCount}
          icon={Clock3}
          description={`${openDaysCount === 1 ? "1 dia ativo" : `${openDaysCount} dias ativos`} na semana`}
        />
        <StatCard
          title="Dias fechados"
          value={closedDaysCount}
          icon={CalendarOff}
          description="Períodos sem agendamento disponível"
        />
        <StatCard
          title="Carga semanal"
          value={formatMinutesLabel(weeklyMinutes)}
          icon={Sun}
          description="Soma das janelas abertas para atendimento"
        />
        <StatCard
          title="Próximo fechamento"
          value={nextHoliday ? formatHolidayDate(nextHoliday.date, "dd/MM") : "Livre"}
          icon={Sparkles}
          description={nextHoliday ? nextHoliday.name : "Nenhum bloqueio futuro cadastrado"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)]">
        <PanelCard
          title="Horário de funcionamento"
          description="Ajuste os dias e faixas de atendimento com uma visualização que funciona bem no desktop e no celular."
          icon={Clock3}
          action={
            <div className="space-y-2">
              <Button
                type="button"
                onClick={handleSaveHours}
                disabled={isSavingHours || scheduleRows.length === 0 || !hasUnsavedChanges}
                className="h-11 w-full rounded-2xl bg-amber-500 px-5 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 lg:w-auto"
              >
                {isSavingHours ? "Salvando..." : "Salvar horários"}
              </Button>
              <p
                className={cn(
                  "text-right text-[11px] font-bold",
                  saveStatus === "error"
                    ? "text-red-500"
                    : saveStatus === "success"
                      ? "text-emerald-600"
                      : "text-zinc-400"
                )}
              >
                {saveMessage}
              </p>
            </div>
          }
          contentClassName="space-y-4"
        >
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-zinc-900">Grade principal da semana</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  Cada dia vira um bloco independente em telas menores para manter leitura e toque confortáveis.
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                  hasUnsavedChanges
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                )}
              >
                {hasUnsavedChanges ? "Alterações pendentes" : "Tudo salvo"}
              </span>
            </div>
          </div>

          {scheduleRows.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title="Nenhum horário disponível"
              description="Assim que os horários forem carregados, eles aparecem aqui para edição."
            />
          ) : (
            <div className="grid gap-3">
              {scheduleRows.map((hour) => (
                <div
                  key={hour.id}
                  className={cn(
                    "rounded-3xl border p-4 transition-all sm:p-5",
                    hour.isOpen
                      ? "border-zinc-200 bg-white"
                      : "border-zinc-200 bg-zinc-50/80"
                  )}
                >
                  <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center">
                    <div className="flex items-start gap-3 2xl:min-w-[240px]">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-[11px] font-black uppercase tracking-[0.22em]",
                          hour.isOpen
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-zinc-200 bg-white text-zinc-400"
                        )}
                      >
                        {DAY_SHORT[hour.dayOfWeek]}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-zinc-900">
                            {DAY_NAMES[hour.dayOfWeek]}
                          </h4>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest",
                              hour.isOpen
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-zinc-200/70 text-zinc-500"
                            )}
                          >
                            {hour.isOpen ? "Aberto" : "Fechado"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                          {hour.isOpen
                            ? `Atendimento entre ${hour.startTime} e ${hour.endTime}.`
                            : "Dia bloqueado para agendamentos."}
                        </p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] 2xl:flex-1",
                        !hour.isOpen && "opacity-60"
                      )}
                    >
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Abertura
                        </span>
                        <input
                          type="time"
                          value={hour.startTime}
                          disabled={!hour.isOpen}
                          onChange={(event) =>
                            handleTimeChange(hour.id, "startTime", event.target.value)
                          }
                          className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-800 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                        />
                      </div>

                      <div className="hidden items-end justify-center pb-3 text-[10px] font-black uppercase tracking-widest text-zinc-300 sm:flex">
                        até
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Encerramento
                        </span>
                        <input
                          type="time"
                          value={hour.endTime}
                          disabled={!hour.isOpen}
                          onChange={(event) =>
                            handleTimeChange(hour.id, "endTime", event.target.value)
                          }
                          className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-800 outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 2xl:min-w-[170px] 2xl:justify-end">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          Agenda
                        </p>
                        <p className="text-xs font-bold text-zinc-700">
                          {hour.isOpen ? "Recebendo clientes" : "Indisponível"}
                        </p>
                      </div>
                      <Switch
                        checked={hour.isOpen}
                        onCheckedChange={() => handleToggleDay(hour.id)}
                        aria-label={`Alternar disponibilidade de ${DAY_NAMES[hour.dayOfWeek]}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard
          title="Feriados e fechamentos"
          description="Bloqueie dias específicos para não oferecer horários nessas datas."
          icon={CalendarOff}
          iconWrapClassName="border-rose-100 bg-rose-50"
          iconClassName="text-rose-500"
          contentClassName="space-y-4"
        >
          <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-4">
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Data
                </span>
                <DatePicker
                  value={newHoliday.date || null}
                  onChange={(value) =>
                    setNewHoliday((prev) => ({ ...prev, date: value ?? "" }))
                  }
                  placeholder="Selecionar data"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Descrição
                </span>
                <input
                  type="text"
                  placeholder="Ex: Natal, recesso, manutenção..."
                  value={newHoliday.name}
                  onChange={(event) =>
                    setNewHoliday((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 outline-none transition-all placeholder:font-medium placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddHoliday}
                disabled={!newHoliday.date || !newHoliday.name.trim()}
                className="h-11 w-full rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600"
              >
                <Plus size={16} />
                Adicionar fechamento
              </Button>
            </div>
          </div>

          {sortedHolidays.length === 0 ? (
            <EmptyState
              icon={Sun}
              title="Nenhuma data bloqueada"
              description="Cadastre feriados, folgas ou pausas especiais para a agenda refletir isso."
              iconWrapClassName="border-zinc-200 bg-white"
              iconClassName="text-zinc-400"
            />
          ) : (
            <div className="space-y-3">
              {sortedHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-3.5"
                >
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-rose-100 bg-rose-50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                      {formatHolidayBadgeMonth(holiday.date)}
                    </span>
                    <span className="text-lg font-black leading-none text-rose-600">
                      {formatHolidayDate(holiday.date, "dd")}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-900">{holiday.name}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      {formatHolidayDate(
                        holiday.date,
                        "EEEE, d 'de' MMMM 'de' yyyy"
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setHolidays((prev) => prev.filter((item) => item.id !== holiday.id))
                    }
                    className="rounded-2xl p-2 text-zinc-300 transition-all hover:bg-red-50 hover:text-red-500"
                    aria-label={`Remover ${holiday.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
