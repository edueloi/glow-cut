import React from "react";
import { format } from "date-fns";
import { Plus, DollarSign, CheckCircle, X, Scissors, Banknote, CreditCard, Smartphone, Shuffle } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { motion } from "motion/react";

function PaymentBadge({ method, details }: { method?: string; details?: any }) {
  const parsedDetails = (() => {
    if (!details) return null;
    try { return typeof details === "string" ? JSON.parse(details) : details; } catch { return null; }
  })();

  if (parsedDetails?.mode === "mixed") {
    const entries: any[] = parsedDetails.entries || [];
    return (
      <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
        <Shuffle size={10} />
        Misto ({entries.map((e: any) => e.method === "cash" ? "Din" : e.method === "pix" ? "Pix" : "Cart").join("+")} )
      </span>
    );
  }

  const methodMap: Record<string, { icon: any; label: string; cls: string }> = {
    cash:     { icon: Banknote,     label: "Dinheiro", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    card:     { icon: CreditCard,   label: "Cartão",   cls: "bg-blue-50 text-blue-700 border-blue-100" },
    pix:      { icon: Smartphone,   label: "Pix",      cls: "bg-violet-50 text-violet-700 border-violet-100" },
    transfer: { icon: Banknote,     label: "Transfer", cls: "bg-zinc-50 text-zinc-600 border-zinc-100" },
  };

  const m = method ? methodMap[method] : null;
  if (!m) return null;
  const Icon = m.icon;

  const installments = parsedDetails?.installments;

  return (
    <span className={cn("flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg border", m.cls)}>
      <Icon size={10} />
      {m.label}
      {installments && installments > 1 ? ` ${installments}x` : ""}
    </span>
  );
}

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
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pagamento</th>
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
                      {c.items && c.items.length > 0 ? (
                        c.items.map((it: any, i: number) => (
                          <span key={i} className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-2 py-1 rounded-lg flex items-center gap-1.5">
                            {it.productId ? <Package size={10}/> : <Scissors size={10}/>}
                            {it.name}
                            <span className="bg-amber-100 px-1 rounded text-[8px]">{it.quantity}x</span>
                          </span>
                        ))
                      ) : c.appointments.length > 0 ? (() => {
                        const groups: { [key: string]: { total: number, performed: number } } = {};
                        c.appointments.forEach((a: any) => {
                          const name = a.service.name;
                          if (!groups[name]) groups[name] = { total: 0, performed: 0 };
                          groups[name].total++;
                          if (a.status === 'realizado') groups[name].performed++;
                        });
                        return Object.entries(groups).map(([name, stats], i) => (
                          <span key={i} className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg flex items-center gap-1.5">
                            {name}
                            <span className={cn(
                              "px-1 rounded-md text-[8px]",
                              stats.performed === stats.total ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {stats.performed}/{stats.total}
                            </span>
                          </span>
                        ));
                      })() : (
                        <span className="text-[10px] text-zinc-400 italic">Sem itens vinculados</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                    {format(new Date(c.createdAt || Date.now()), "dd/MM/yyyy")}
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
                  <td className="px-6 py-4 text-sm font-black text-zinc-900">R$ {Number(c.total).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {c.status === 'paid' ? (
                      <PaymentBadge method={c.paymentMethod} details={c.paymentDetails} />
                    ) : (
                      <span className="text-[10px] text-zinc-300">—</span>
                    )}
                  </td>
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
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setIsComandaDetailOpen(false)}>
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-900 rounded-2xl text-white">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 tracking-tight">Comanda #{selectedComanda.id.slice(-6).toUpperCase()}</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.1em]">{format(new Date(selectedComanda.createdAt || Date.now()), "dd/MM/yyyy 'às' HH:mm")}</p>
                </div>
              </div>
              <button onClick={() => setIsComandaDetailOpen(false)} className="p-2.5 hover:bg-zinc-100 text-zinc-400 rounded-2xl transition-all"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Cliente */}
              <div className="flex items-center gap-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-lg font-black text-amber-600">
                  {selectedComanda.client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-900 truncate">{selectedComanda.client.name}</p>
                  <p className="text-[11px] text-zinc-500 font-bold flex items-center gap-1.5 mt-0.5"><Phone size={10}/> {selectedComanda.client.phone}</p>
                </div>
                <div className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm",
                  selectedComanda.status === 'open' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                )}>
                  {selectedComanda.status === 'open' ? 'Em Aberto' : 'Pago'}
                </div>
              </div>

              {/* Itens da Comanda */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-3.5 rounded-full bg-amber-500" />
                  <p className="text-[11px] font-black text-zinc-900 uppercase tracking-widest">Itens e Serviços</p>
                </div>
                
                <div className="space-y-2">
                  {/* Agendamentos Legados / Vinculados */}
                  {selectedComanda.appointments?.length > 0 && selectedComanda.appointments.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-amber-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-zinc-100 text-amber-500">
                          <Scissors size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{a.service.name}</p>
                          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-0.5">{a.professional?.name || 'Profissional'}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-zinc-900">R$ {Number(a.service.price).toFixed(2)}</p>
                    </div>
                  ))}

                  {/* Novos Itens (PDV) */}
                  {selectedComanda.items?.length > 0 && selectedComanda.items.map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-zinc-100 hover:border-amber-200 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-xl shadow-sm border",
                          it.productId ? "bg-emerald-50 border-emerald-100 text-emerald-500" : "bg-purple-50 border-purple-100 text-purple-500"
                        )}>
                          {it.productId ? <Package size={14} /> : <Scissors size={14} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-zinc-900">{it.name}</p>
                            <span className="text-[9px] font-black text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">{it.quantity}x</span>
                          </div>
                          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-0.5">
                            {it.productId ? 'Produto em Estoque' : 'Serviço Direto'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-zinc-900">R$ {Number(it.total || (it.price * it.quantity)).toFixed(2)}</p>
                        <p className="text-[9px] text-zinc-400 font-bold">Un: R$ {Number(it.price).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="bg-zinc-50 rounded-[28px] p-5 space-y-3.5 border border-zinc-100">
                <div className="flex justify-between text-xs font-bold text-zinc-500">
                  <span>Subtotal Bruto</span>
                  <span>R$ {selectedComanda.items?.reduce((a:number, i:any) => a + (i.price * i.quantity), 0 + (selectedComanda.appointments?.reduce((a:number, ap:any) => a + ap.service.price, 0) || 0)).toFixed(2)}</span>
                </div>
                {selectedComanda.discount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 font-black">
                    <span className="flex items-center gap-1"><Zap size={10}/> Desconto ({selectedComanda.discountType === 'percentage' ? `${selectedComanda.discount}%` : 'Valor'})</span>
                    <span>-R$ {selectedComanda.discountType === 'percentage'
                      ? ((selectedComanda.items?.reduce((a:number, i:any) => a + (i.price * i.quantity), 0 + (selectedComanda.appointments?.reduce((a:number, ap:any) => a + ap.service.price, 0) || 0))) * selectedComanda.discount / 100).toFixed(2)
                      : Number(selectedComanda.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-zinc-200 flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">Total a Pagar</p>
                    <p className="text-2xl font-black text-zinc-900 tracking-tighter">R$ {Number(selectedComanda.total).toFixed(2)}</p>
                    {selectedComanda.status === 'paid' && (
                      <div className="mt-1">
                        <PaymentBadge method={selectedComanda.paymentMethod} details={selectedComanda.paymentDetails} />
                      </div>
                    )}
                  </div>
                  {selectedComanda.status === 'open' && (
                    <button
                      onClick={() => { handlePayComanda(selectedComanda); setIsComandaDetailOpen(false); }}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                    >
                      <CheckCircle size={14} /> Pagar Agora
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Package, Scissors as ScissorsIcon, FileText, Phone, Zap } from "lucide-react";
