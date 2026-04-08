import React from "react";
import { Plus, Scissors, Package, Edit2, Trash2, Clock, LayoutGrid, List } from "lucide-react";
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
  viewMode: 'grid' | 'list';
  setViewMode: (val: 'grid' | 'list') => void;
}

export function ServicesTab({
  services,
  serviceSubTab,
  setServiceSubTab,
  setEditingService,
  setNewService,
  setIsServiceModalOpen,
  handleDeleteService,
  viewMode,
  setViewMode
}: ServicesTabProps) {
  const safeServices = Array.isArray(services) ? services : [];
  const filteredServices = safeServices.filter(s => s.type === (serviceSubTab === 'services' ? 'service' : 'package'));

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Serviços</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{safeServices.filter(s => s.type === 'service').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Pacotes</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">{safeServices.filter(s => s.type === 'package').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            R$ {safeServices.length ? (safeServices.reduce((a, s) => a + (Number(s.price) || 0), 0) / safeServices.length).toFixed(0) : '0'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Duração Média</p>
          <p className="text-2xl font-black text-zinc-900 mt-1">
            {safeServices.length ? Math.round(safeServices.reduce((a, s) => a + (Number(s.duration) || 0), 0) / safeServices.length) : 0} min
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 p-4 rounded-2xl border border-zinc-200/50">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex p-1 bg-zinc-100 rounded-xl w-full sm:w-fit shadow-inner">
            <button
              onClick={() => setServiceSubTab('services')}
              className={cn(
                "flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                serviceSubTab === 'services' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Serviços
            </button>
            <button
              onClick={() => setServiceSubTab('packages')}
              className={cn(
                "flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                serviceSubTab === 'packages' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              Pacotes
            </button>
          </div>

          <div className="flex p-1 bg-zinc-100 rounded-xl shadow-inner shrink-0 scale-90 sm:scale-100">
            <button
              onClick={() => setViewMode('grid')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingService(null);
            setNewService({ name: "", description: "", price: "", duration: "", type: serviceSubTab === 'services' ? 'service' : 'package', discount: "0", discountType: "value", includedServices: [], professionalIds: [] });
            setIsServiceModalOpen(true);
          }}
          className="bg-zinc-900 hover:bg-black text-white rounded-xl px-5 font-bold shadow-sm flex items-center gap-1.5 text-xs h-9 transition-all active:scale-95"
        >
          <Plus size={14} />
          <span>Criar {serviceSubTab === 'services' ? 'Serviço' : 'Pacote'}</span>
        </Button>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((item) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={item.id}
              className="bg-white rounded-[32px] border border-zinc-200 p-6 shadow-sm hover:shadow-xl hover:border-zinc-300 transition-all flex flex-col group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:scale-110 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all duration-300 shadow-inner">
                  {item.type === 'service' ? <Scissors size={24} strokeWidth={1.5} /> : <Package size={24} strokeWidth={1.5} />}
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-zinc-900 tracking-tight">R$ {Number(item.price).toFixed(0)}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <Clock size={10} className="text-zinc-400" />
                    <span className="text-[10px] text-zinc-400 font-black uppercase tracking-tighter">{item.duration} min</span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-[13px] font-black text-zinc-900 group-hover:text-amber-600 transition-colors uppercase tracking-tight leading-tight">{item.name}</h3>
                <p className="text-[11px] text-zinc-500 mt-2 line-clamp-2 leading-relaxed font-medium">
                  {item.description || "Nenhuma descrição detalhada disponível para este item."}
                </p>
              </div>

              {item.type === 'package' && item.packageServices?.length > 0 && (
                <div className="mb-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-100/50">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em] mb-3">Serviços no Pacote</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.packageServices.map((ps: any, i: number) => (
                      <span key={i} className="text-[9px] font-bold bg-white text-zinc-600 px-2.5 py-1 rounded-lg border border-zinc-100 shadow-sm">
                        {ps.quantity}x {ps.service.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex gap-3 pt-5 border-t border-zinc-50">
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
                      includedServices: item.packageServices?.map((ps: any) => ({ id: ps.serviceId, name: ps.service.name, quantity: ps.quantity })) || [],
                      professionalIds: item.professionalIds ? (typeof item.professionalIds === 'string' ? JSON.parse(item.professionalIds) : item.professionalIds) : []
                    });
                    setIsServiceModalOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 transition-all active:scale-95"
                >
                  <Edit2 size={12} /> Editar
                </button>
                <button
                  onClick={() => handleDeleteService(item.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-50 text-red-500 hover:bg-red-50/50 hover:border-red-100 transition-all active:scale-95"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-zinc-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Duração</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Preço</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredServices.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-amber-50 group-hover:text-amber-500 transition-all">
                          {item.type === 'service' ? <Scissors size={14} /> : <Package size={14} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 uppercase tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-zinc-400 truncate max-w-[200px]">{item.description || "Sem descrição"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-zinc-600 flex items-center gap-1.5">
                        <Clock size={12} className="text-zinc-400" /> {item.duration} min
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-black text-zinc-900">R$ {Number(item.price).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
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
                              includedServices: item.packageServices?.map((ps: any) => ({ id: ps.serviceId, name: ps.service.name, quantity: ps.quantity })) || [],
                              professionalIds: item.professionalIds ? (typeof item.professionalIds === 'string' ? JSON.parse(item.professionalIds) : item.professionalIds) : []
                            });
                            setIsServiceModalOpen(true);
                          }}
                          className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteService(item.id)}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredServices.length === 0 && (
        <div className="py-24 bg-white rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
          {serviceSubTab === 'services' ? <Scissors size={48} className="mb-4 opacity-20" /> : <Package size={48} className="mb-4 opacity-20" />}
          <p className="text-sm font-bold text-zinc-500">Nenhum {serviceSubTab === 'services' ? 'serviço' : 'pacote'} cadastrado.</p>
          <p className="text-xs mt-1 font-medium">Clique no botão acima para começar.</p>
        </div>
      )}
    </div>
  );
}
