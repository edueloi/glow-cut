import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  Trash2,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";

export function AdminScheduleAuxModals(props: any) {
  const {
    customRepeat,
    handleDeleteAppointment,
    handleMarkRealizado,
    handleTabChange,
    handleUpdateAppointmentStatus,
    isCustomRepeatModalOpen,
    isRepeatModalOpen,
    isViewAppointmentModalOpen,
    repeatLabel,
    selectedAppointment,
    setChangeProfAppt,
    setChangeProfId,
    setCustomRepeat,
    setIsAppointmentModalOpen,
    setIsChangeProfModalOpen,
    setIsCustomRepeatModalOpen,
    setIsLinkComandaModalOpen,
    setIsRepeatModalOpen,
    setIsViewAppointmentModalOpen,
    setLinkComandaAppt,
    setNewAppointment,
    setRepeatLabel,
  } = props;

  return (
    <>
      <Modal
        isOpen={isViewAppointmentModalOpen}
        onClose={() => setIsViewAppointmentModalOpen(false)}
        title="Detalhes do Agendamento"
        size="md"
      >
        {selectedAppointment && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <CalendarDays size={24} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-zinc-900">{selectedAppointment.client?.name || "Cliente não identificado"}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  {format(new Date(selectedAppointment.date), "EEEE, d 'de' MMMM", { locale: ptBR })} • {selectedAppointment.startTime}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-100 bg-white p-3">
                <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">Serviço/Pacote</p>
                <p className="truncate text-xs font-bold text-zinc-800">{selectedAppointment.service?.name || "-"}</p>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-white p-3">
                <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">Profissional</p>
                <p className="truncate text-xs font-bold text-zinc-800">{selectedAppointment.professional?.name || "-"}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    selectedAppointment.comanda
                      ? selectedAppointment.comanda.status === "paid"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-amber-100 text-amber-600"
                      : "bg-zinc-100 text-zinc-400"
                  )}
                >
                  <Banknote size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900">Status Financeiro</p>
                  <p className="text-[10px] font-medium text-zinc-500">
                    {selectedAppointment.comanda
                      ? selectedAppointment.comanda.status === "paid"
                        ? "Comanda Paga"
                        : "Comanda Aberta"
                      : "Sem comanda vinculada"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedAppointment.comanda ? (
                  <Button variant="outline" size="sm" onClick={() => { setIsViewAppointmentModalOpen(false); handleTabChange("comandas"); }}>
                    Ver Comanda
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-amber-500 text-white hover:bg-amber-600"
                    onClick={() => {
                      setLinkComandaAppt(selectedAppointment);
                      setIsLinkComandaModalOpen(true);
                    }}
                  >
                    Importar Comanda
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-2">
              <p className="mb-3 ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">Gerenciar Status</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, "confirmed")} className="group flex flex-col items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-emerald-600 transition-all hover:bg-emerald-100">
                  <CheckCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Confirmar</span>
                </button>
                <button onClick={() => handleMarkRealizado(selectedAppointment)} className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-900 p-3 text-white transition-all hover:bg-zinc-800">
                  <CheckCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Realizado</span>
                </button>
                <button onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, "noshow")} className="group flex flex-col items-center gap-2 rounded-xl border border-red-100 bg-red-50/50 p-3 text-red-600 transition-all hover:bg-red-100">
                  <AlertTriangle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Falta</span>
                </button>
                <button
                  onClick={() => {
                    setNewAppointment({
                      id: selectedAppointment.id,
                      date: new Date(selectedAppointment.date),
                      startTime: selectedAppointment.startTime,
                      duration: selectedAppointment.duration || 60,
                      clientId: selectedAppointment.clientId || "",
                      clientPhone: selectedAppointment.client?.phone || "",
                      clientName: selectedAppointment.client?.name || "",
                      serviceId: selectedAppointment.serviceId || "",
                      packageId: selectedAppointment.packageId || "",
                      serviceIds: [selectedAppointment.serviceId, selectedAppointment.packageId].filter(Boolean) as string[],
                      professionalId: selectedAppointment.professionalId || "",
                      status: selectedAppointment.status || "agendado",
                      notes: selectedAppointment.notes || "",
                      type: selectedAppointment.type || "atendimento",
                      recurrence: { type: "none", count: 1, interval: 7 },
                      comandaId: selectedAppointment.comandaId || "",
                    });
                    setIsViewAppointmentModalOpen(false);
                    setIsAppointmentModalOpen(true);
                  }}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-blue-600 transition-all hover:bg-blue-100"
                >
                  <Clock size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Reagendar</span>
                </button>
                <button onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, "cancelled")} className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-500 transition-all hover:bg-zinc-100">
                  <XCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span>
                </button>
                <button
                  onClick={() => {
                    setChangeProfAppt(selectedAppointment);
                    setChangeProfId(selectedAppointment.professionalId || "");
                    setIsChangeProfModalOpen(true);
                  }}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-violet-600 transition-all hover:bg-violet-100"
                >
                  <UserCog size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Trocar Prof.</span>
                </button>
                <button
                  onClick={() => {
                    handleDeleteAppointment(selectedAppointment);
                    setIsViewAppointmentModalOpen(false);
                  }}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-white p-3 text-red-400 transition-all hover:bg-red-50"
                >
                  <Trash2 size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Excluir</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <AnimatePresence>
        {isRepeatModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRepeatModalOpen(false)} className="fixed inset-0 bg-black/30" style={{ zIndex: 9990 }} />
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9990 }}>
              <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.15 }} className="pointer-events-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between px-5 pb-2 pt-5">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Seleção Atual</h3>
                    <p className="mt-0.5 text-[11px] text-zinc-400">Escolha uma opção abaixo para mudar a seleção</p>
                  </div>
                  <button onClick={() => setIsRepeatModalOpen(false)} className="rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-100">
                    <X size={14} />
                  </button>
                </div>
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5">
                    <div className="rounded-lg bg-blue-100 p-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-600">
                        <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400">Opção Atual</p>
                      <p className="text-sm font-bold text-blue-800">{repeatLabel}</p>
                    </div>
                  </div>
                  <p className="mt-2 px-1 text-[10px] italic text-blue-500">Dica: Escolha repetição semanal caso queira que sempre caia no mesmo dia da semana</p>
                </div>
                <div className="max-h-64 overflow-y-auto border-t border-zinc-100 divide-y divide-zinc-100">
                  {[
                    { label: "Não Repete", type: "none", interval: 0, count: 0 },
                    { label: "Semanal — 4 vezes", type: "weekly", interval: 7, count: 4 },
                    { label: "Semanal — 8 vezes", type: "weekly", interval: 7, count: 8 },
                    { label: "Semanal — 12 vezes", type: "weekly", interval: 7, count: 12 },
                    { label: "Semanal — 16 vezes", type: "weekly", interval: 7, count: 16 },
                    { label: "Semanal — 20 vezes", type: "weekly", interval: 7, count: 20 },
                    { label: "A cada 15 dias — 4 vezes", type: "biweekly", interval: 15, count: 4 },
                    { label: "A cada 15 dias — 8 vezes", type: "biweekly", interval: 15, count: 8 },
                    { label: "Mensal — 3 vezes", type: "monthly", interval: 30, count: 3 },
                    { label: "Mensal — 6 vezes", type: "monthly", interval: 30, count: 6 },
                    { label: "Mensal — 12 vezes", type: "monthly", interval: 30, count: 12 },
                    { label: "Personalizado...", type: "custom", interval: 0, count: 0 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => {
                        if (option.type === "custom") {
                          setIsRepeatModalOpen(false);
                          setIsCustomRepeatModalOpen(true);
                          return;
                        }
                        setRepeatLabel(option.label);
                        setNewAppointment((previous: any) => ({ ...previous, recurrence: { type: option.type, count: option.count, interval: option.interval } }));
                        setIsRepeatModalOpen(false);
                      }}
                      className={cn("flex w-full items-center justify-between px-5 py-3.5 text-xs font-bold transition-all hover:bg-zinc-50", repeatLabel === option.label ? "bg-blue-50 text-blue-600" : "text-zinc-700")}
                    >
                      <span className="uppercase tracking-widest">{option.label}</span>
                      <ChevronRight size={14} className="text-zinc-400" />
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomRepeatModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCustomRepeatModalOpen(false)} className="fixed inset-0 bg-black/30" style={{ zIndex: 9999 }} />
            <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
              <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} transition={{ duration: 0.15 }} className="pointer-events-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between px-5 pb-4 pt-5">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Configurar Repetição</h3>
                    <p className="mt-0.5 text-[11px] text-zinc-400">Defina como este agendamento irá se repetir</p>
                  </div>
                  <button onClick={() => setIsCustomRepeatModalOpen(false)} className="rounded-lg p-1.5 text-zinc-400 transition-all hover:bg-zinc-100">
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-5 px-5 pb-5">
                  <div className="overflow-hidden rounded-xl border border-zinc-200">
                    <p className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Frequência de Repetição</p>
                    <div className="p-3">
                      <select
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-bold text-zinc-800 outline-none"
                        value={customRepeat.frequency}
                        onChange={(event) => setCustomRepeat((previous: any) => ({ ...previous, frequency: event.target.value, unit: { "Semanalmente": "SEMANA(S)", "Mensalmente": "MÊS(ES)", "Diariamente": "DIA(S)", "A cada 15 dias": "SEMANA(S)" }[event.target.value] || "SEMANA(S)" }))}
                      >
                        {["Semanalmente", "Mensalmente", "Diariamente", "A cada 15 dias"].map((frequency) => (
                          <option key={frequency} value={frequency}>{frequency}</option>
                        ))}
                      </select>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">A Cada</p>
                          <input type="number" min={1} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center text-xs font-bold text-zinc-800 outline-none" value={customRepeat.interval} onChange={(event) => setCustomRepeat((previous: any) => ({ ...previous, interval: parseInt(event.target.value) || 1 }))} />
                        </div>
                        <div>
                          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">Unidade</p>
                          <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">{customRepeat.unit}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400">
                        <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
                      </svg>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Terminar Em</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setCustomRepeat((previous: any) => ({ ...previous, endType: "count" }))} className={cn("rounded-xl border-2 p-4 text-center transition-all", customRepeat.endType === "count" ? "border-amber-400 bg-amber-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300")}>
                        <p className={cn("mb-2 text-[9px] font-black uppercase tracking-widest", customRepeat.endType === "count" ? "text-amber-500" : "text-zinc-400")}>Por Vezes</p>
                        <div className="flex items-center justify-center gap-2">
                          <input type="number" min={1} className="w-12 rounded-lg border border-zinc-200 bg-white p-1 text-center text-sm font-black outline-none" value={customRepeat.count} onClick={(event) => { event.stopPropagation(); setCustomRepeat((previous: any) => ({ ...previous, endType: "count" })); }} onChange={(event) => setCustomRepeat((previous: any) => ({ ...previous, count: parseInt(event.target.value) || 1 }))} />
                          <span className="text-[9px] font-bold uppercase text-zinc-400">Vezes</span>
                        </div>
                      </button>
                      <button onClick={() => setCustomRepeat((previous: any) => ({ ...previous, endType: "date" }))} className={cn("rounded-xl border-2 p-4 text-center transition-all", customRepeat.endType === "date" ? "border-amber-400 bg-amber-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300")}>
                        <p className={cn("mb-2 text-[9px] font-black uppercase tracking-widest", customRepeat.endType === "date" ? "text-amber-500" : "text-zinc-400")}>Por Data</p>
                        <input type="date" className="w-full rounded-lg border border-zinc-200 bg-white p-1 text-center text-[10px] font-bold outline-none" value={customRepeat.endDate} onClick={(event) => { event.stopPropagation(); setCustomRepeat((previous: any) => ({ ...previous, endType: "date" })); }} onChange={(event) => setCustomRepeat((previous: any) => ({ ...previous, endDate: event.target.value }))} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => { setIsCustomRepeatModalOpen(false); setIsRepeatModalOpen(true); }} className="flex-1 rounded-xl border border-zinc-200 py-3 text-xs font-bold text-zinc-500 transition-all hover:text-zinc-700">
                      Voltar
                    </button>
                    <button
                      onClick={() => {
                        const label = `${customRepeat.frequency} — ${customRepeat.endType === "count" ? `${customRepeat.count} vezes` : `até ${customRepeat.endDate}`}`;
                        setRepeatLabel(label);
                        setNewAppointment((previous: any) => ({ ...previous, recurrence: { type: "custom", count: customRepeat.count, interval: customRepeat.interval } }));
                        setIsCustomRepeatModalOpen(false);
                      }}
                      className="flex-1 rounded-xl bg-amber-500 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-amber-600"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
