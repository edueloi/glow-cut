import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CheckCircle, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { cn } from "@/src/lib/utils";
import { PaymentModal } from "@/src/components/ui/PaymentModal";

export function AdminScheduleActionModals(props: any) {
  const {
    apptDeleteModal,
    changeProfAppt,
    changeProfId,
    comandas,
    confirmDeleteAppointments,
    handleChangeProfessional,
    handleConfirmPayment,
    handleLinkComanda,
    isChangeProfModalOpen,
    isLinkComandaModalOpen,
    isPaymentModalOpen,
    linkComandaAppt,
    payingComanda,
    professionals,
    setApptDeleteModal,
    setChangeProfId,
    setIsChangeProfModalOpen,
    setIsLinkComandaModalOpen,
    setIsPaymentModalOpen,
  } = props;

  return (
    <>
      <AnimatePresence>
        {apptDeleteModal && (() => {
          const { targetId, targetAppt, siblings, selectedIds } = apptDeleteModal;
          const allIds = [targetId, ...siblings.map((sibling: any) => sibling.id)];
          const toggleId = (id: string) => {
            setApptDeleteModal((previous: any) => {
              if (!previous) return previous;
              const next = new Set(previous.selectedIds);
              if (id === targetId) return previous;
              next.has(id) ? next.delete(id) : next.add(id);
              return { ...previous, selectedIds: next };
            });
          };
          const selectAll = () => setApptDeleteModal((previous: any) => (previous ? { ...previous, selectedIds: new Set(allIds) } : previous));
          const selectOnlyThis = () => setApptDeleteModal((previous: any) => (previous ? { ...previous, selectedIds: new Set([targetId]) } : previous));
          const allSelected = allIds.every((id: string) => selectedIds.has(id));

          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setApptDeleteModal(null)} className="fixed inset-0 z-[80] bg-black/40" />
              <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.18 }} className="pointer-events-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-5 pb-3 pt-5">
                    <div>
                      <h2 className="text-sm font-black text-zinc-900">Excluir Agendamento</h2>
                      <p className="text-[10px] font-medium text-zinc-400">Sessão {targetAppt.sessionNumber}/{targetAppt.totalSessions} da série</p>
                    </div>
                    <button onClick={() => setApptDeleteModal(null)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
                      <X size={15} />
                    </button>
                  </div>
                  <div className="space-y-4 px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={selectOnlyThis} className={cn("flex-1 rounded-xl border py-2 text-[10px] font-black uppercase tracking-widest transition-all", !allSelected && selectedIds.size === 1 ? "border-red-500 bg-red-500 text-white" : "border-zinc-200 bg-white text-zinc-500 hover:border-red-300 hover:text-red-500")}>
                        Só este
                      </button>
                      <button onClick={selectAll} className={cn("flex-1 rounded-xl border py-2 text-[10px] font-black uppercase tracking-widest transition-all", allSelected ? "border-red-500 bg-red-500 text-white" : "border-zinc-200 bg-white text-zinc-500 hover:border-red-300 hover:text-red-500")}>
                        Todos ({allIds.length})
                      </button>
                    </div>
                    <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                      <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3">
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-red-500 bg-red-500">
                          <Check size={10} className="text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-900">{format(new Date(targetAppt.date), "EEE, dd MMM", { locale: ptBR })} · {targetAppt.startTime}h</p>
                          <p className="text-[10px] font-bold text-red-600">Este agendamento (sessão {targetAppt.sessionNumber})</p>
                        </div>
                      </div>
                      {siblings.map((sibling: any) => {
                        const checked = selectedIds.has(sibling.id);
                        return (
                          <button key={sibling.id} onClick={() => toggleId(sibling.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all", checked ? "border-red-200 bg-red-50" : "border-zinc-100 bg-white hover:border-zinc-200")}>
                            <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all", checked ? "border-red-500 bg-red-500" : "border-zinc-300")}>
                              {checked && <Check size={10} className="text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-900">{format(new Date(sibling.date), "EEE, dd MMM", { locale: ptBR })} · {sibling.startTime}h</p>
                              <p className="text-[10px] font-medium text-zinc-400">Sessão {sibling.sessionNumber}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-3 px-5 pb-5">
                    <button onClick={() => setApptDeleteModal(null)} className="flex-1 rounded-xl border border-zinc-200 py-3 text-xs font-bold text-zinc-500 transition-all hover:bg-zinc-50">Cancelar</button>
                    <button onClick={() => confirmDeleteAppointments(Array.from(selectedIds))} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-xs font-black text-white transition-all hover:bg-red-600">
                      <Trash2 size={13} />
                      Excluir
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); }} comanda={payingComanda} onConfirm={handleConfirmPayment} />

      {isChangeProfModalOpen && changeProfAppt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsChangeProfModalOpen(false)}>
          <div className="w-full max-w-sm space-y-5 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">Trocar Profissional</h3>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{changeProfAppt.client?.name} • {changeProfAppt.startTime}</p>
              </div>
              <button onClick={() => setIsChangeProfModalOpen(false)} className="rounded-xl p-2 text-zinc-400 transition-all hover:bg-zinc-100"><X size={18} /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {professionals.filter((professional: any) => professional.isActive).map((professional: any) => (
                <button key={professional.id} onClick={() => setChangeProfId(professional.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all", changeProfId === professional.id ? "border-violet-400 bg-violet-50" : "border-zinc-100 bg-white hover:border-zinc-200")}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xs font-black text-violet-600">{professional.name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-zinc-900">{professional.name}</p>
                    <p className="text-[10px] text-zinc-400">{professional.role || "Profissional"}</p>
                  </div>
                  {changeProfId === professional.id && <CheckCircle size={16} className="shrink-0 text-violet-500" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setIsChangeProfModalOpen(false)} className="flex-1 rounded-xl bg-zinc-100 py-2.5 text-xs font-black text-zinc-600 transition-all hover:bg-zinc-200">Cancelar</button>
              <button onClick={handleChangeProfessional} disabled={!changeProfId} className="flex-1 rounded-xl bg-violet-500 py-2.5 text-xs font-black text-white transition-all hover:bg-violet-600 disabled:opacity-40">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isLinkComandaModalOpen && linkComandaAppt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setIsLinkComandaModalOpen(false)}>
          <div className="w-full max-w-sm space-y-5 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">Importar Comanda</h3>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{linkComandaAppt.client?.name} • {linkComandaAppt.service?.name}</p>
              </div>
              <button onClick={() => setIsLinkComandaModalOpen(false)} className="rounded-xl p-2 text-zinc-400 transition-all hover:bg-zinc-100"><X size={18} /></button>
            </div>
            <button onClick={() => handleLinkComanda(null)} className="w-full rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-left transition-all hover:bg-amber-100">
              <p className="text-xs font-black text-amber-700">➕ Criar nova comanda</p>
              <p className="mt-0.5 text-[10px] text-amber-500">Valor: R$ {Number(linkComandaAppt.service?.price || 0).toFixed(2)} — {linkComandaAppt.service?.name || "Serviço"}</p>
            </button>
            {comandas.filter((comanda: any) => comanda.status === "open" && comanda.clientId === linkComandaAppt.clientId).length > 0 && (
              <div className="space-y-2">
                {comandas.filter((comanda: any) => comanda.status === "open" && comanda.clientId === linkComandaAppt.clientId).map((comanda: any) => (
                  <button key={comanda.id} onClick={() => handleLinkComanda(comanda.id)} className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-left transition-all hover:border-amber-300 hover:bg-amber-50">
                    <p className="text-xs font-bold text-zinc-900">Comanda #{comanda.id.slice(-6).toUpperCase()}</p>
                    <p className="text-[10px] text-zinc-400">R$ {Number(comanda.total).toFixed(2)} • Em Aberto</p>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setIsLinkComandaModalOpen(false)} className="w-full rounded-xl bg-zinc-100 py-2.5 text-xs font-black text-zinc-600 transition-all hover:bg-zinc-200">Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}
