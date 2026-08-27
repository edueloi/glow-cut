import React, { useState, useEffect } from "react";
import {
  Plus, Unlock, Lock, Clock, Trash2,
  RefreshCw, Info, CalendarOff, Search, Loader2, User
} from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { Badge, Button, DatePicker, useToast, Input, Calendar } from "@/src/components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Bloqueios e Fechamentos da Agenda
// ─────────────────────────────────────────────────────────────────────────────

interface BlockRecurrence {
  type: "none" | "weekly" | "custom";
  count: number;
  interval: number;
}

interface LiberacoesHorariosProps {
  appointments: any[];
  professionals: any[];
  workingHours: any[];
  onNewBlockAppointment: (data: { date: Date; startTime: string; endTime: string; professionalId: string; notes?: string; recurrence?: BlockRecurrence }) => Promise<any>;
  onDeleteAppointment: (id: string) => void;
  onRefresh: () => void;
}

interface Release {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  professionalId?: string;
}

interface ClosedDay {
  id: string;
  date: string;
  name: string;
}

const HOURS_LIST = Array.from({ length: 32 }, (_, i) => {
  const total = (i + 12) * 30; // 06:00 → 21:30
  const h = Math.floor(total / 60).toString().padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
});

export function LiberacoesHorarios({
  appointments,
  professionals,
  workingHours,
  onNewBlockAppointment,
  onDeleteAppointment,
  onRefresh,
}: LiberacoesHorariosProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"bloqueios" | "releases" | "fechamentos">("bloqueios");

  // ── Bloqueios ──────────────────────────────────────────────────────────────
  const bloqueios = appointments
    .filter((a) => a.type === "bloqueio" && !isBefore(new Date(a.date), startOfDay(new Date())))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const [newBlock, setNewBlock] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "12:00",
    endTime: "13:00",
    professionalId: professionals[0]?.id ?? "",
    notes: "",
    allDay: false,
    recurrence: { type: "none", count: 1, interval: 1 } as BlockRecurrence,
  });
  const [savingBlock, setSavingBlock] = useState(false);

  const handleBlockWholeWeek = () => {
    setNewBlock((p) => ({ ...p, recurrence: { type: "custom", count: 7, interval: 1 } }));
  };

  const handleCreateBlock = async () => {
    if (!newBlock.date || (!newBlock.allDay && (!newBlock.startTime || !newBlock.endTime))) {
      toast.warning("Preencha data, hora início e hora fim.");
      return;
    }
    setSavingBlock(true);
    try {
      const [y, m, d] = newBlock.date.split("-").map(Number);
      const startTime = newBlock.allDay ? HOURS_LIST[0] : newBlock.startTime;
      const endTime = newBlock.allDay ? HOURS_LIST[HOURS_LIST.length - 1] : newBlock.endTime;
      const recurrence = newBlock.recurrence.type === "none" ? undefined : newBlock.recurrence;
      const payload = {
        date: new Date(y, m - 1, d),
        startTime,
        endTime,
        notes: newBlock.notes || undefined,
        recurrence,
      };

      if (newBlock.professionalId === "all") {
        const activeProfs = professionals.filter((p) => p.isActive !== false);
        const results = await Promise.allSettled(activeProfs.map((prof) =>
          onNewBlockAppointment({ ...payload, professionalId: prof.id }).then((res: any) => {
            if (res && res.ok === false) throw new Error(prof.name);
          })
        ));
        const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        if (failed.length > 0) {
          toast.error(`Não foi possível bloquear para: ${failed.map((f) => f.reason?.message || "profissional").join(", ")}`);
        } else {
          toast.success("Bloqueio criado com sucesso.");
        }
      } else {
        await onNewBlockAppointment({ ...payload, professionalId: newBlock.professionalId });
        toast.success("Bloqueio criado com sucesso.");
      }
      setNewBlock((prev) => ({ ...prev, notes: "", recurrence: { type: "none", count: 1, interval: 1 } }));
    } finally {
      setSavingBlock(false);
    }
  };

  const [deletingSeriesId, setDeletingSeriesId] = useState<string | null>(null);
  const handleDeleteSeries = async (groupId: string) => {
    setDeletingSeriesId(groupId);
    try {
      const res = await apiFetch(`/api/appointments/group/${groupId}`);
      if (!res.ok) {
        toast.error("Erro ao buscar a série do bloqueio.");
        return;
      }
      const group = await res.json();
      const ids = Array.isArray(group) ? group.map((a: any) => a.id) : [];
      if (ids.length === 0) return;
      await apiFetch("/api/appointments/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      toast.success("Série de bloqueios removida.");
      onRefresh();
    } finally {
      setDeletingSeriesId(null);
    }
  };

  // ── Liberações especiais ───────────────────────────────────────────────────
  const [releases, setReleases] = useState<Release[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [newRelease, setNewRelease] = useState({
    date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "13:00",
    notes: "",
    professionalId: professionals[0]?.id ?? "",
  });
  const [savingRelease, setSavingRelease] = useState(false);

  const fetchReleases = async () => {
    setLoadingReleases(true);
    try {
      const res = await apiFetch("/api/settings/agenda");
      if (res.ok) {
        const d = await res.json();
        setReleases(Array.isArray(d.releases) ? d.releases : []);
      }
    } catch {}
    setLoadingReleases(false);
  };

  const handleSaveRelease = async () => {
    if (!newRelease.date || !newRelease.startTime || !newRelease.endTime) {
      toast.warning("Preencha todos os campos.");
      return;
    }
    setSavingRelease(true);
    try {
      const res = await apiFetch("/api/settings/agenda/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRelease),
      });
      if (res.ok) {
        toast.success("Liberação salva com sucesso.");
        fetchReleases();
        setNewRelease((prev) => ({ ...prev, notes: "" }));
      } else {
        toast.error("Erro ao salvar liberação.");
      }
    } finally {
      setSavingRelease(false);
    }
  };

  const handleDeleteRelease = async (id: string) => {
    await apiFetch(`/api/settings/agenda/releases/${id}`, { method: "DELETE" });
    toast.success("Liberação removida.");
    fetchReleases();
  };

  // ── Fechamentos (Feriados) ────────────────────────────────────────────────
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [loadingClosed, setLoadingClosed] = useState(false);
  const [newClosed, setNewClosed] = useState({ date: format(addDays(new Date(), 1), "yyyy-MM-dd"), name: "" });
  const [savingClosed, setSavingClosed] = useState(false);

  const fetchClosedDays = async () => {
    setLoadingClosed(true);
    try {
      const res = await apiFetch("/api/settings/closed-days");
      if (res.ok) {
        const d = await res.json();
        setClosedDays(d);
      }
    } catch {}
    setLoadingClosed(false);
  };

  const handleCreateClosedDay = async () => {
    if (!newClosed.date || !newClosed.name.trim()) {
      toast.warning("Preencha a data e o motivo do fechamento.");
      return;
    }
    setSavingClosed(true);
    try {
      const res = await apiFetch("/api/settings/closed-days", {
        method: "POST",
        body: JSON.stringify(newClosed),
      });
      if (res.ok) {
        toast.success("Dia fechado com sucesso.");
        fetchClosedDays();
        setNewClosed({ date: format(addDays(new Date(), 1), "yyyy-MM-dd"), name: "" });
      }
    } finally {
      setSavingClosed(false);
    }
  };

  const handleDeleteClosedDay = async (id: string) => {
    await apiFetch(`/api/settings/closed-days/${id}`, { method: "DELETE" });
    toast.success("Fechamento removido.");
    fetchClosedDays();
  };

  useEffect(() => {
    fetchReleases();
    fetchClosedDays();
  }, []);

  return (
    <div className="w-full min-w-0 space-y-4 p-3 pb-24 animate-in fade-in duration-700 sm:p-5 sm:pb-6 lg:space-y-6 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:rounded-3xl">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100 shadow-sm">
            <CalendarOff size={20} className="text-rose-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">Bloqueios e Fechamentos</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Gerencie ausências, feriados e horários excepcionais.</p>
          </div>
        </div>
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 sm:mx-0 sm:rounded-2xl">
          {(["bloqueios", "fechamentos", "releases"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "min-h-10 shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wide transition-all sm:flex-1 sm:rounded-xl sm:text-[11px]",
                activeTab === tab ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              {tab === "bloqueios" ? "Bloqueios" : tab === "fechamentos" ? "Feriados" : "Intervalos Extras"}
            </button>
          ))}
        </div>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50 p-4 shadow-sm sm:gap-4 sm:p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 sm:h-10 sm:w-10">
          <Info size={18} className="text-amber-600" />
        </div>
        <div className="space-y-1">
           <p className="text-sm font-black text-amber-900">Como gerenciar sua agenda?</p>
           <p className="text-xs text-amber-700 leading-relaxed max-w-2xl">
             Use <strong>Bloqueios</strong> para fechar horários específicos de um profissional hoje. 
             Use <strong>Feriados</strong> para fechar o dia inteiro do estúdio. 
             Use <strong>Intervalos Extras</strong> para abrir horários fora da grade normal.
           </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {/* ────── TAB: BLOQUEIOS ────── */}
          {activeTab === "bloqueios" && (
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-5 lg:space-y-6">
                <Calendar 
                  mode="select"
                  selectedDate={newBlock.date}
                  onDateSelect={(d) => setNewBlock(p => ({ ...p, date: d }))}
                  blockedDates={bloqueios.map(b => b.date.split('T')[0])}
                  closedDates={closedDays.map(d => d.date.split('T')[0])}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Bloqueios Ativos ({bloqueios.length})</p>
                    <Button variant="ghost" size="xs" onClick={onRefresh} className="h-7 text-zinc-400">
                      <RefreshCw size={12} className="mr-1" /> Atualizar
                    </Button>
                  </div>
                  {bloqueios.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/50 px-4 py-12 text-center sm:py-20 lg:rounded-3xl">
                      <Lock size={32} className="text-zinc-200 mx-auto mb-3" />
                      <p className="text-sm font-black text-zinc-400">Nenhum bloqueio para os próximos dias.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {bloqueios.map((b) => {
                        const seriesCount = b.repeatGroupId ? bloqueios.filter((x) => x.repeatGroupId === b.repeatGroupId).length : 1;
                        return (
                        <div key={b.id} className="group flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md sm:flex-nowrap sm:gap-4 sm:p-5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 group-hover:bg-red-50 group-hover:border-red-100 transition-colors">
                            <Clock size={20} className="text-zinc-400 group-hover:text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-900">
                              {format(new Date(b.date), "dd 'de' MMMM", { locale: ptBR })} ({format(new Date(b.date), "EEEE", { locale: ptBR })})
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                               <Badge color="default" className="bg-zinc-100 text-zinc-600 font-black h-6 px-2.5">{b.startTime} – {b.endTime}</Badge>
                               {b.professional?.name && (
                                 <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                                    <User size={10} /> {b.professional.name}
                                 </span>
                               )}
                               {b.repeatGroupId && seriesCount > 1 && (
                                 <Badge color="default" className="bg-red-50 text-red-600 font-black h-6 px-2.5">Série · {seriesCount}x</Badge>
                               )}
                            </div>
                          </div>
                          {b.repeatGroupId && seriesCount > 1 && (
                            <button
                              onClick={() => handleDeleteSeries(b.repeatGroupId)}
                              disabled={deletingSeriesId === b.repeatGroupId}
                              className="text-[10px] font-black uppercase tracking-wide text-zinc-400 hover:text-red-500 transition-all px-2 whitespace-nowrap"
                            >
                              Excluir série
                            </button>
                          )}
                          <button onClick={() => onDeleteAppointment(b.id)} aria-label="Excluir bloqueio" className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition-all hover:bg-red-50 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg sm:p-6 xl:sticky xl:top-24 xl:rounded-3xl">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-black text-zinc-900 sm:mb-6">
                   <Lock size={18} className="text-zinc-400" /> Novo Bloqueio
                </h3>
                <div className="space-y-5">
                  <DatePicker label="Qual dia? (início do bloqueio)" value={newBlock.date} onChange={(v) => setNewBlock((p) => ({ ...p, date: v ?? p.date }))} />

                  <button
                    type="button"
                    onClick={() => setNewBlock((p) => ({ ...p, allDay: !p.allDay }))}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all border",
                      newBlock.allDay ? "bg-red-50 text-red-700 border-red-200" : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300"
                    )}
                  >
                    <span>Bloquear o dia inteiro</span>
                    <div className={cn("w-9 h-5 rounded-full transition-all relative shrink-0", newBlock.allDay ? "bg-red-500" : "bg-zinc-200")}>
                      <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", newBlock.allDay ? "left-4" : "left-0.5")} />
                    </div>
                  </button>

                  {!newBlock.allDay && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="ds-label">Início</label>
                        <select value={newBlock.startTime} onChange={(e) => setNewBlock((p) => ({ ...p, startTime: e.target.value }))} className="ds-input font-bold rounded-2xl h-11">
                          {HOURS_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="ds-label">Término</label>
                        <select value={newBlock.endTime} onChange={(e) => setNewBlock((p) => ({ ...p, endTime: e.target.value }))} className="ds-input font-bold rounded-2xl h-11">
                          {HOURS_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {professionals.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="ds-label">Em qual profissional?</label>
                      <select value={newBlock.professionalId} onChange={(e) => setNewBlock((p) => ({ ...p, professionalId: e.target.value }))} className="ds-input font-bold rounded-2xl h-11">
                        <option value="all">Todos os profissionais (fecha o estúdio)</option>
                        {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="ds-label">Repetição</label>
                    <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-3">
                      {([
                        { v: "none", label: "Sem repetição" },
                        { v: "weekly", label: "Semanal" },
                        { v: "custom", label: "Personalizada" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setNewBlock((p) => ({ ...p, recurrence: { ...p.recurrence, type: opt.v } }))}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border",
                            newBlock.recurrence.type === opt.v
                              ? "bg-red-500 text-white border-red-500"
                              : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newBlock.recurrence.type !== "none" && (
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Nº de dias/sessões"
                        type="number"
                        min="1"
                        max="365"
                        value={newBlock.recurrence.count}
                        onChange={(e: any) => setNewBlock((p) => ({ ...p, recurrence: { ...p.recurrence, count: parseInt(e.target.value) || 1 } }))}
                      />
                      {newBlock.recurrence.type === "custom" && (
                        <Input
                          label="Intervalo (dias)"
                          type="number"
                          min="1"
                          value={newBlock.recurrence.interval}
                          onChange={(e: any) => setNewBlock((p) => ({ ...p, recurrence: { ...p.recurrence, interval: parseInt(e.target.value) || 1 } }))}
                        />
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleBlockWholeWeek}
                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-zinc-200 text-zinc-400 hover:border-red-300 hover:bg-red-50/40 hover:text-red-500 transition-all"
                  >
                    Bloquear semana inteira (7 dias seguidos)
                  </button>

                  <Input label="Observações" placeholder="Motivo do bloqueio..." value={newBlock.notes} onChange={(e: any) => setNewBlock((p) => ({ ...p, notes: e.target.value }))} />

                  <Button variant="danger" fullWidth loading={savingBlock} onClick={handleCreateBlock} className="h-12 rounded-2xl font-black shadow-lg shadow-red-500/20">
                    Criar Bloqueio
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ────── TAB: FECHAMENTOS (FERIADOS) ────── */}
          {activeTab === "fechamentos" && (
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-5 lg:space-y-6">
                <Calendar 
                  mode="select"
                  selectedDate={newClosed.date}
                  onDateSelect={(d) => setNewClosed(p => ({ ...p, date: d }))}
                  closedDates={closedDays.map(d => d.date.split('T')[0])}
                  blockedDates={bloqueios.map(b => b.date.split('T')[0])}
                />

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Dias de Estúdio Fechado ({closedDays.length})</p>
                  {loadingClosed ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-zinc-300" /></div>
                  ) : closedDays.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/50 px-4 py-12 text-center sm:py-20 lg:rounded-3xl">
                      <CalendarOff size={32} className="text-zinc-200 mx-auto mb-3" />
                      <p className="text-sm font-black text-zinc-400">Nenhum feriado ou fechamento cadastrado.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {closedDays.map((d) => (
                        <div key={d.id} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:gap-4 sm:p-5">
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 group-hover:bg-rose-100 transition-colors">
                            <span className="text-[9px] font-black uppercase text-rose-400 leading-none mb-1">
                              {format(new Date(d.date), "MMM", { locale: ptBR })}
                            </span>
                            <span className="text-xl font-black text-rose-600 leading-none">
                              {format(new Date(d.date), "dd")}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-900 truncate">{d.name || "Sem descrição"}</p>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                              {format(new Date(d.date), "EEEE", { locale: ptBR })} · {format(new Date(d.date), "yyyy")}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteClosedDay(d.id)} aria-label="Excluir fechamento" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition-all hover:bg-red-50 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg sm:p-6 xl:sticky xl:top-24 xl:rounded-3xl">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-black text-zinc-900 sm:mb-6">
                   <CalendarOff size={18} className="text-rose-500" /> Novo Fechamento
                </h3>
                <div className="space-y-5">
                  <DatePicker label="Dia do fechamento" value={newClosed.date} onChange={(v) => setNewClosed((p) => ({ ...p, date: v ?? p.date }))} />
                  <Input 
                    label="Motivo / Descrição" 
                    placeholder="Ex: Feriado Nacional, Reforma..." 
                    value={newClosed.name} 
                    onChange={(e: any) => setNewClosed((p) => ({ ...p, name: e.target.value }))} 
                  />
                  <Button fullWidth loading={savingClosed} onClick={handleCreateClosedDay} className="h-12 rounded-2xl font-black bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20">
                    Fechar Estúdio neste Dia
                  </Button>
                  <p className="text-[10px] text-zinc-400 text-center leading-relaxed px-4">
                    Isso impedirá agendamentos em todos os profissionais durante este dia inteiro.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ────── TAB: RELEASES ────── */}
          {activeTab === "releases" && (
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0 space-y-5 lg:space-y-6">
                <Calendar 
                  mode="select"
                  selectedDate={newRelease.date}
                  onDateSelect={(d) => setNewRelease(p => ({ ...p, date: d }))}
                  blockedDates={releases.map(r => r.date.split('T')[0])}
                  closedDates={closedDays.map(d => d.date.split('T')[0])}
                />

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Liberações Extras ({releases.length})</p>
                  {loadingReleases ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-zinc-300" /></div>
                  ) : releases.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/50 px-4 py-12 text-center sm:py-20 lg:rounded-3xl">
                      <Unlock size={32} className="text-zinc-200 mx-auto mb-3" />
                      <p className="text-sm font-black text-zinc-400">Nenhum horário extra liberado.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {releases.map((r) => (
                        <div key={r.id} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:gap-4 sm:p-5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100">
                             <Unlock size={20} className="text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-black text-zinc-900">
                               {format(new Date(r.date), "dd 'de' MMMM", { locale: ptBR })}
                             </p>
                             <Badge color="default" className="bg-emerald-50 text-emerald-700 font-black h-6 px-2.5 mt-1">{r.startTime} – {r.endTime}</Badge>
                          </div>
                          <button onClick={() => handleDeleteRelease(r.id)} aria-label="Excluir liberação" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-300 transition-all hover:bg-emerald-50 hover:text-emerald-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg sm:p-6 xl:sticky xl:top-24 xl:rounded-3xl">
                <h3 className="mb-5 flex items-center gap-2 text-lg font-black text-zinc-900 sm:mb-6">
                   <Unlock size={18} className="text-emerald-500" /> Nova Liberação Extra
                </h3>
                <div className="space-y-5">
                  <DatePicker label="Qual data?" value={newRelease.date} onChange={(v) => setNewRelease((p) => ({ ...p, date: v ?? p.date }))} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="ds-label">Início</label>
                      <select value={newRelease.startTime} onChange={(e) => setNewRelease((p) => ({ ...p, startTime: e.target.value }))} className="ds-input font-bold rounded-2xl h-11">
                        {HOURS_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="ds-label">Término</label>
                      <select value={newRelease.endTime} onChange={(e) => setNewRelease((p) => ({ ...p, endTime: e.target.value }))} className="ds-input font-bold rounded-2xl h-11">
                        {HOURS_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>

                  <Input label="Observações" placeholder="Ex: Sábado especial..." value={newRelease.notes} onChange={(e: any) => setNewRelease((p) => ({ ...p, notes: e.target.value }))} />

                  <Button fullWidth loading={savingRelease} onClick={handleSaveRelease} className="h-12 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">
                    Salvar Liberação
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
