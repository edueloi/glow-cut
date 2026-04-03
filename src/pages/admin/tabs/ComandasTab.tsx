import React from "react";
import { format } from "date-fns";
import { Plus, DollarSign, CheckCircle, X, Scissors } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { motion } from "motion/react";

interface ComandasTabProps {
  comandas: any[];
  setIsComandaModalOpen: (b: boolean) => void;
  selectedComanda: any;
  setSelectedComanda: (c: any) => void;
  isComandaDetailOpen: boolean;
  setIsComandaDetailOpen: (b: boolean) => void;
  handlePayComanda: (c: any) => void;
}

export function ComandasTab({
  comandas,
  setIsComandaModalOpen,
  selectedComanda,
  setSelectedComanda,
  isComandaDetailOpen,
  setIsComandaDetailOpen,
  handlePayComanda
}: ComandasTabProps) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Em Aberto</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{comandas.filter(c => c.status === 'open').length}</p>
          <p className="text-[10px] text-zinc-400 mt-1">comandas aguardando</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">A Receber</p>
          <p className="text-2xl font-black text-red-500 mt-1">R$ {comandas.filter(c => c.status === 'open').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">valor pendente</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pagas</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{comandas.filter(c => c.status === 'paid').length}</p>
          <p className="text-[10px] text-zinc-400 mt-1">finalizadas</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Recebido</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">R$ {comandas.filter(c => c.status === 'paid').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
          <p className="text-[10px] text-zinc-400 mt-1">receita total</p>
        </div>
      </div>

      {/* Comandas table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-zinc-900">Todas as Comandas</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-widest font-bold">{comandas.length} registros</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setIsComandaModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm flex items-center gap-2"
            >
              <Plus size={16} /> Nova Comanda
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Serviços / Agendamentos</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Data</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Desconto</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {comandas.map((c, idx) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                  onClick={() => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-600">
                        {c.client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{c.client.name}</p>
                        <p className="text-[10px] text-zinc-400">{c.client.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {c.appointments.length > 0 ? c.appointments.map((a: any, i: number) => (
                        <span key={i} className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg">
                          {a.service.name}
                        </span>
                      )) : (
                        <span className="text-[10px] text-zinc-400 italic">Sem agendamentos vinculados</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                    {format(new Date(c.createdAt), "dd/MM/yyyy")}
                  </td>
                  <td className="px-6 py-4">
                    {c.discount > 0 ? (
                      <span className="text-xs font-bold text-green-600">
                        -{c.discountType === 'percentage' ? `${c.discount}%` : `R$ ${c.discount}`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-zinc-900">R$ {c.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[9px] font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-widest border",
                      c.status === 'open' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    )}>
                      {c.status === 'open' ? 'Em Aberto' : 'Pago'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {c.status === 'open' && (
                        <button
                          onClick={() => handlePayComanda(c)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle size={12} /> Pagar
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                        className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Detalhes
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {comandas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Nenhuma comanda encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comanda Detail Modal */}
      {isComandaDetailOpen && selectedComanda && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsComandaDetailOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Comanda #{selectedComanda.id.slice(-6).toUpperCase()}</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mt-0.5">{format(new Date(selectedComanda.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
              </div>
              <button onClick={() => setIsComandaDetailOpen(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"><X size={18} /></button>
            </div>

            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-bold text-amber-600">
                {selectedComanda.client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">{selectedComanda.client.name}</p>
                <p className="text-[10px] text-zinc-500">{selectedComanda.client.phone}</p>
              </div>
              <span className={cn(
                "ml-auto text-[9px] font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-widest border",
                selectedComanda.status === 'open' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
              )}>
                {selectedComanda.status === 'open' ? 'Em Aberto' : 'Pago'}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Agendamentos vinculados</p>
              {selectedComanda.appointments.length > 0 ? (
                <div className="space-y-2">
                  {selectedComanda.appointments.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="flex items-center gap-2">
                        <Scissors size={14} className="text-amber-500" />
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{a.service.name}</p>
                          <p className="text-[10px] text-zinc-400">{format(new Date(a.date), "dd/MM")} • {a.startTime}–{a.endTime}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-zinc-900">R$ {a.service.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic py-3">Nenhum agendamento vinculado a esta comanda.</p>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-4 space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal</span>
                <span>R$ {selectedComanda.appointments.reduce((a: number, ap: any) => a + ap.service.price, 0).toFixed(2)}</span>
              </div>
              {selectedComanda.discount > 0 && (
                <div className="flex justify-between text-xs text-green-600 font-bold">
                  <span>Desconto {selectedComanda.discountType === 'percentage' ? `(${selectedComanda.discount}%)` : ''}</span>
                  <span>-R$ {selectedComanda.discountType === 'percentage'
                    ? (selectedComanda.appointments.reduce((a: number, ap: any) => a + ap.service.price, 0) * selectedComanda.discount / 100).toFixed(2)
                    : selectedComanda.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-zinc-900 border-t border-zinc-100 pt-2">
                <span>Total</span>
                <span>R$ {selectedComanda.total.toFixed(2)}</span>
              </div>
            </div>

            {selectedComanda.status === 'open' && (
              <button
                onClick={() => { handlePayComanda(selectedComanda); setIsComandaDetailOpen(false); }}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} /> Finalizar e Pagar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
