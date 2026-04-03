import React from "react";
import { Plus, Scissors, Package, Edit2, Trash2, Clock } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { motion } from "motion/react";

interface ServicesTabProps {
  services: any[];
  serviceSubTab: 'services' | 'packages';
  setServiceSubTab: (val: 'services' | 'packages') => void;
  setEditingService: (s: any) => void;
  setNewService: (s: any) => void;
  setIsServiceModalOpen: (b: boolean) => void;
  handleDeleteService: (id: string) => void;
}

export function ServicesTab({
  services,
  serviceSubTab,
  setServiceSubTab,
  setEditingService,
  setNewService,
  setIsServiceModalOpen,
  handleDeleteService
}: ServicesTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Serviços</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{services.filter(s => s.type === 'service').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Pacotes</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{services.filter(s => s.type === 'package').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            R$ {services.length ? (services.reduce((a, s) => a + s.price, 0) / services.length).toFixed(0) : '0'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Duração Média</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">
            {services.length ? Math.round(services.reduce((a, s) => a + s.duration, 0) / services.length) : 0} min
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
          <button
            onClick={() => setServiceSubTab('services')}
            className={cn(
              "px-6 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
              serviceSubTab === 'services' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Serviços ({services.filter(s => s.type === 'service').length})
          </button>
          <button
            onClick={() => setServiceSubTab('packages')}
            className={cn(
              "px-6 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
              serviceSubTab === 'packages' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            Pacotes ({services.filter(s => s.type === 'package').length})
          </button>
        </div>
        <Button
          onClick={() => {
            setEditingService(null);
            setNewService({ name: "", description: "", price: "", duration: "", type: serviceSubTab === 'services' ? 'service' : 'package', discount: "0", discountType: "value", includedServices: [] });
            setIsServiceModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Novo {serviceSubTab === 'services' ? 'Serviço' : 'Pacote'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.filter(s => s.type === (serviceSubTab === 'services' ? 'service' : 'package')).map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group bg-white rounded-3xl border border-zinc-200 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all relative overflow-hidden flex flex-col"
          >
            {/* Top color strip */}
            <div className={cn("h-1.5 w-full", item.type === 'package' ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-amber-300 to-amber-500")} />

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  item.type === 'package' ? "bg-orange-50 border border-orange-200 text-orange-500" : "bg-amber-50 border border-amber-200 text-amber-600"
                )}>
                  {item.type === 'package' ? <Package size={22} /> : <Scissors size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-900 leading-tight">{item.name}</h4>
                  {item.description && <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed line-clamp-2">{item.description}</p>}
                </div>
              </div>

              {/* Price row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Valor</p>
                  <p className="text-base font-black text-zinc-900 mt-0.5">R$ {item.price.toFixed(2)}</p>
                </div>
                <div className="flex-1 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Duração</p>
                  <p className="text-base font-black text-zinc-900 mt-0.5 flex items-center gap-1"><Clock size={13} className="text-amber-500" />{item.duration}min</p>
                </div>
                {(item.discount > 0) && (
                  <div className="flex-1 bg-green-50 rounded-xl p-3 border border-green-100">
                    <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest">Desconto</p>
                    <p className="text-base font-black text-green-600 mt-0.5">{item.discountType === 'percentage' ? `${item.discount}%` : `R$ ${item.discount}`}</p>
                  </div>
                )}
              </div>

              {/* Package items */}
              {item.type === 'package' && item.packageServices?.length > 0 && (
                <div className="mb-4 p-3 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-2">Incluído no pacote</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.packageServices.map((ps: any, i: number) => (
                      <span key={i} className="text-[9px] font-bold bg-white text-orange-600 px-2.5 py-1 rounded-lg border border-orange-200">
                        {ps.quantity}x {ps.service.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Final price if discounted */}
              {item.discount > 0 && (
                <div className="mb-4 flex items-center justify-between px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Preço Final</span>
                  <span className="text-sm font-black text-amber-700">
                    R$ {item.discountType === 'percentage'
                      ? (item.price * (1 - item.discount / 100)).toFixed(2)
                      : (item.price - item.discount).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => {
                    setEditingService(item);
                    setNewService({
                      name: item.name,
                      description: item.description || "",
                      price: item.price.toString(),
                      duration: item.duration.toString(),
                      type: item.type,
                      discount: (item.discount || 0).toString(),
                      discountType: item.discountType || "value",
                      includedServices: item.packageServices?.map((ps: any) => ({ id: ps.serviceId, name: ps.service.name, quantity: ps.quantity })) || []
                    });
                    setIsServiceModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                >
                  <Edit2 size={13} /> Editar
                </button>
                <button
                  onClick={() => handleDeleteService(item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
                >
                  <Trash2 size={13} /> Excluir
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {services.filter(s => s.type === (serviceSubTab === 'services' ? 'service' : 'package')).length === 0 && (
          <div className="col-span-full py-24 bg-white rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
            {serviceSubTab === 'services' ? <Scissors size={48} className="mb-4 opacity-20" /> : <Package size={48} className="mb-4 opacity-20" />}
            <p className="text-sm font-bold text-zinc-500">Nenhum {serviceSubTab === 'services' ? 'serviço' : 'pacote'} cadastrado.</p>
            <p className="text-xs mt-1 font-medium">Clique no botão acima para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
