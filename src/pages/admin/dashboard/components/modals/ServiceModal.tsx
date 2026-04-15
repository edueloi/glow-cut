import React from "react";
import {
  Plus,
  Check,
  TrendingUp,
  Trash2,
  Edit2,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";

interface ServiceModalProps {
  isServiceModalOpen: boolean;
  setIsServiceModalOpen: (v: boolean) => void;
  editingService: any;
  setEditingService: (v: any) => void;
  newService: any;
  setNewService: (v: any) => void;
  professionals: any[];
  products: any[];
  handleCreateService: () => void;
  handleAddServiceToPackage: (serviceId: string) => void;
  calcPackagePrice: (services: any[]) => string;
  services: any[];
}

export function ServiceModal({
  isServiceModalOpen,
  setIsServiceModalOpen,
  editingService,
  setEditingService,
  newService,
  setNewService,
  professionals,
  products,
  handleCreateService,
  handleAddServiceToPackage,
  calcPackagePrice,
  services,
}: ServiceModalProps) {
  return (
    <>
      {/* ── MODAL: SERVIÇO INDIVIDUAL ── */}
      <Modal
        isOpen={isServiceModalOpen && newService.type === 'service'}
        onClose={() => { setIsServiceModalOpen(false); setEditingService(null); }}
        title={editingService ? "Editar Serviço" : "Novo Serviço"}
        className="max-w-md w-full"
      >
        <div className="flex flex-col gap-4">
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nome do Serviço</label>
            <input
              type="text"
              autoFocus
              className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-semibold placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all"
              placeholder="Ex: Corte Degradê"
              value={newService.name}
              onChange={e => setNewService({ ...newService, name: e.target.value })}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Descrição <span className="normal-case font-medium text-zinc-300">(opcional)</span></label>
            <textarea
              className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all resize-none"
              placeholder="O que este serviço inclui..."
              rows={2}
              value={newService.description}
              onChange={e => setNewService({ ...newService, description: e.target.value })}
            />
          </div>

          {/* Preço + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Preço (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full text-sm pl-8 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all"
                  placeholder="0,00"
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Duração (min)</label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all text-center"
                  placeholder="30"
                  value={newService.duration}
                  onChange={e => setNewService({ ...newService, duration: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 text-[10px] font-bold pointer-events-none">min</span>
              </div>
            </div>
          </div>

          {/* Desconto + Preço Final */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Preço Final</p>
              <p className="text-lg font-black text-zinc-900 leading-tight">
                R$ {(() => {
                  const p = parseFloat(newService.price) || 0;
                  const d = parseFloat(newService.discount) || 0;
                  return newService.discountType === 'percentage' ? (p * (1 - d / 100)).toFixed(2) : (p - d).toFixed(2);
                })()}
              </p>
              {parseFloat(newService.discount) > 0 && (
                <p className="text-[9px] text-zinc-400 line-through">R$ {parseFloat(newService.price || '0').toFixed(2)}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-lg overflow-hidden border border-zinc-200 h-7">
                {(['value', 'percentage'] as const).map(dt => (
                  <button key={dt} onClick={() => setNewService({ ...newService, discountType: dt })}
                    className={cn("px-2 text-[9px] font-black transition-all", newService.discountType === dt ? "bg-zinc-800 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50")}
                  >{dt === 'value' ? 'R$' : '%'}</button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                className="w-14 h-7 text-xs px-2 bg-white border border-zinc-200 rounded-lg text-center font-bold outline-none focus:border-amber-400 transition-all"
                placeholder="0"
                value={newService.discount}
                onChange={e => setNewService({ ...newService, discount: e.target.value })}
              />
            </div>
          </div>

          {/* Profissionais */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Profissionais</label>
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => setNewService({ ...newService, professionalIds: [] })}
                className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all",
                  (newService.professionalIds || []).length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-white border-zinc-200 hover:border-zinc-300"
                )}>
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  (newService.professionalIds || []).length === 0 ? "bg-emerald-500 border-emerald-500" : "border-zinc-300"
                )}>
                  {(newService.professionalIds || []).length === 0 && <Check className="text-white" size={8} strokeWidth={4} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">Todos os Profissionais</p>
                  <p className="text-[9px] text-zinc-400">Qualquer membro da equipe</p>
                </div>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                {professionals.filter((p: any) => p.isActive !== false).map((p: any) => {
                  const isSelected = (newService.professionalIds || []).includes(p.id);
                  return (
                    <button key={p.id} type="button"
                      onClick={() => {
                        const ids: string[] = newService.professionalIds || [];
                        setNewService({ ...newService, professionalIds: isSelected ? ids.filter((id: string) => id !== p.id) : [...ids, p.id] });
                      }}
                      className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all",
                        isSelected ? "bg-amber-50 border-amber-200" : "bg-white border-zinc-200 hover:border-zinc-300"
                      )}>
                      <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all",
                        isSelected ? "bg-amber-500 text-white" : "bg-zinc-100 border border-zinc-200"
                      )}>
                        {isSelected && <Check size={8} strokeWidth={4} />}
                      </div>
                      <span className={cn("text-xs font-semibold truncate", isSelected ? "text-amber-800" : "text-zinc-600")}>{p.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Controle de Custo / Produtos Consumidos */}
          <div className="space-y-1.5 border-t border-zinc-100 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black text-amber-600 uppercase tracking-[0.1em]">🛒 Controle de Custo</label>
              <span className="text-[9px] font-medium text-zinc-400">Produtos usados neste serviço</span>
            </div>
            
            {(newService.productsConsumed || []).length > 0 && (
              <div className="text-[10px] font-bold text-zinc-500 mb-1 flex items-center justify-between px-1">
                <span>Custo Previsto: R$ {(newService.productsConsumed || []).reduce((acc: number, p: any) => acc + ((Number(p.costPrice) || 0) * (Number(p.quantity) || 1)), 0).toFixed(2)}</span>
              </div>
            )}
            
            <div className="space-y-2">
              {(newService.productsConsumed || []).map((pc: any, idx: number) => (
                <div key={idx} className="flex gap-2 items-center bg-zinc-50 border border-zinc-200 p-2 rounded-xl">
                  <div className="flex-1 truncate text-xs font-bold text-zinc-700">{pc.name} <span className="text-[9px] font-normal text-zinc-400 ml-1">(Estoque: {pc.stock})</span></div>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0.01" step="0.01" className="w-16 py-1.5 px-1 text-xs text-center border border-zinc-200 bg-white rounded-lg outline-none focus:border-amber-400" value={pc.quantity} onChange={e => {
                      const newProd = [...newService.productsConsumed];
                      newProd[idx].quantity = parseFloat(e.target.value) || 0;
                      setNewService({...newService, productsConsumed: newProd});
                    }} />
                    <span className="text-[9px] text-zinc-400 font-bold uppercase">Und</span>
                  </div>
                  <button type="button" onClick={() => {
                    setNewService({...newService, productsConsumed: (newService.productsConsumed || []).filter((_: any, i: number) => i !== idx)});
                  }} className="text-zinc-400 hover:text-red-500 p-1.5 bg-white border border-zinc-200 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={13}/></button>
                </div>
              ))}
              <div className="relative">
                <select className="w-full text-xs p-3 bg-white border border-dashed border-zinc-300 hover:border-amber-400 rounded-xl text-zinc-500 font-bold outline-none appearance-none transition-all cursor-pointer" onChange={e => {
                  const pId = e.target.value;
                  if (!pId) return;
                  const prod = products.find((p: any) => p.id === pId);
                  if (prod && !(newService.productsConsumed || []).find((x: any) => x.id === pId)) {
                    setNewService({...newService, productsConsumed: [...(newService.productsConsumed || []), {id: prod.id, name: prod.name, quantity: 1, costPrice: prod.costPrice, stock: prod.stock}]});
                  }
                  e.target.value = "";
                }}>
                  <option value="">+ Adicionar Produto do Estoque...</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} (Esq: {p.stock}) - Custo: R$ {Number(p.costPrice || 0).toFixed(2)}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none"><Plus size={14}/></div>
              </div>
            </div>
          </div>

          {/* Controladoria de Custos */}
          <div className="space-y-4 pt-6 mt-6 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-lg bg-amber-500 flex items-center justify-center text-white">
                <TrendingUp size={12} strokeWidth={3} />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Controladoria de Custos</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Comissão Profissional</label>
                <div className="flex bg-white border border-zinc-200 rounded-xl p-1 h-[42px]">
                  <input
                    type="number"
                    className="flex-1 w-full px-3 text-sm bg-transparent border-none outline-none font-bold"
                    placeholder="0.00"
                    value={newService.commissionValue}
                    onChange={e => setNewService({...newService, commissionValue: parseFloat(e.target.value) || 0})}
                  />
                  <div className="flex bg-zinc-50 rounded-lg p-0.5 border border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setNewService({...newService, commissionType: "percentage"})}
                      className={cn("px-2 text-[10px] font-black rounded-md transition-all h-full", newService.commissionType === "percentage" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400")}
                    >%</button>
                    <button
                      type="button"
                      onClick={() => setNewService({...newService, commissionType: "value"})}
                      className={cn("px-2 text-[10px] font-black rounded-md transition-all h-full", newService.commissionType === "value" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400")}
                    >R$</button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Taxas / Impostos (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full text-sm px-3 h-[42px] bg-white border border-zinc-200 rounded-xl text-zinc-900 font-bold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
                    placeholder="0.00"
                    value={newService.taxRate}
                    onChange={e => setNewService({...newService, taxRate: parseFloat(e.target.value) || 0})}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-300">%</span>
                </div>
              </div>
            </div>

            {/* Simulator Box */}
            <div className="bg-zinc-900 rounded-2xl p-4 shadow-xl shadow-zinc-200/50">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Simulador de Lucro</p>
                <div className="px-2 py-0.5 bg-zinc-800 rounded-full">
                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Ficha de Custo</span>
                </div>
              </div>
              
              <div className="space-y-1.5 mb-3">
                {(() => {
                  const price = parseFloat(newService.price) || 0;
                  const productCost = (newService.productsConsumed || []).reduce((acc: number, p: any) => acc + ((Number(p.costPrice) || 0) * (Number(p.quantity) || 1)), 0);
                  const taxCost = price * (newService.taxRate / 100);
                  const commCost = newService.commissionType === "percentage" ? (price * (newService.commissionValue / 100)) : (Number(newService.commissionValue) || 0);
                  const netProfit = price - productCost - taxCost - commCost;
                  const margin = price > 0 ? (netProfit / price) * 100 : 0;

                  return (
                    <>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-zinc-500">Valor do Serviço</span>
                        <span className="text-white">R$ {price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-zinc-500">Custo de Produtos</span>
                        <span className="text-rose-400">- R$ {productCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-zinc-500">Taxas / Operação</span>
                        <span className="text-rose-400">- R$ {taxCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-zinc-500">Comissão Profissional</span>
                        <span className="text-rose-400">- R$ {commCost.toFixed(2)}</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-white/5 flex justify-between items-end">
                        <div>
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none">Lucro Líquido</p>
                          <p className={cn("text-lg font-black leading-none mt-1", netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            R$ {netProfit.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Margem</p>
                          <p className="text-xs font-black text-white leading-none mt-1">
                            {margin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>


          <Button
            className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl py-3 text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2"
            onClick={handleCreateService}
            disabled={!newService.name || !newService.price}
          >
            {editingService ? <Edit2 size={14} /> : <Plus size={14} />}
            {editingService ? "Salvar Alterações" : "Cadastrar Serviço"}
          </Button>
        </div>
      </Modal>

      {/* ── MODAL: PACOTE ── */}
      <Modal
        isOpen={isServiceModalOpen && newService.type === 'package'}
        onClose={() => { setIsServiceModalOpen(false); setEditingService(null); }}
        title={editingService ? "Editar Pacote" : "Novo Pacote"}
        className="max-w-xl w-full"
      >
        <div className="flex flex-col gap-4">
          {/* Nome + Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nome do Pacote</label>
              <input
                type="text"
                autoFocus
                className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-semibold placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all"
                placeholder="Ex: Combo Barba & Cabelo"
                value={newService.name}
                onChange={e => setNewService({ ...newService, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Descrição <span className="normal-case font-medium text-zinc-300">(opcional)</span></label>
              <input
                type="text"
                className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all"
                placeholder="Breve descrição..."
                value={newService.description}
                onChange={e => setNewService({ ...newService, description: e.target.value })}
              />
            </div>
          </div>

          {/* Serviços do pacote */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Serviços incluídos</label>
            <div className="relative">
              <select
                className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all appearance-none"
                onChange={(e) => handleAddServiceToPackage(e.target.value)}
                value=""
              >
                <option value="" disabled>+ Adicionar serviço ao pacote</option>
                {services.filter(s => s.type === 'service').map(s => (
                  <option key={s.id} value={s.id}>{s.name} — R$ {parseFloat(s.price).toFixed(2)}</option>
                ))}
              </select>
              <Plus size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/40 min-h-[80px] overflow-hidden">
              {newService.includedServices.length === 0 ? (
                <div className="flex items-center justify-center h-[80px]">
                  <p className="text-[10px] text-zinc-300 italic">Nenhum serviço adicionado</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {newService.includedServices.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className="text-xs font-semibold text-zinc-800">{s.name}</span>
                        <span className="text-[9px] text-zinc-400 ml-2">R$ {((s.price || 0) * (s.quantity || 1)).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden h-6 bg-white">
                          <button onClick={() => {
                            const val = Math.max(1, (s.quantity || 1) - 1);
                            setNewService((prev: any) => {
                              const ni = prev.includedServices.map((item: any) => item.id === s.id ? { ...item, quantity: val } : item);
                              return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                            });
                          }} className="w-6 text-zinc-500 hover:bg-zinc-100 text-xs font-bold leading-none flex items-center justify-center">−</button>
                          <span className="w-6 text-center text-[10px] font-black text-zinc-800 border-x border-zinc-200">{s.quantity}</span>
                          <button onClick={() => {
                            const val = (s.quantity || 1) + 1;
                            setNewService((prev: any) => {
                              const ni = prev.includedServices.map((item: any) => item.id === s.id ? { ...item, quantity: val } : item);
                              return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                            });
                          }} className="w-6 text-zinc-500 hover:bg-zinc-100 text-xs font-bold leading-none flex items-center justify-center">+</button>
                        </div>
                        <button onClick={() => setNewService((prev: any) => {
                          const ni = prev.includedServices.filter((item: any) => item.id !== s.id);
                          return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                        })} className="w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Duração + Desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Duração (min)</label>
              <input type="number" min="5" step="5"
                className="w-full text-sm px-2 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-bold outline-none focus:border-amber-400 transition-all text-center"
                placeholder="—"
                value={newService.duration}
                onChange={e => setNewService({ ...newService, duration: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Desconto</label>
              <div className="flex items-center gap-1">
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 h-[38px] shrink-0">
                  {(['value', 'percentage'] as const).map(dt => (
                    <button key={dt} onClick={() => setNewService({ ...newService, discountType: dt })}
                      className={cn("px-2 text-[9px] font-black transition-all h-full", newService.discountType === dt ? "bg-zinc-800 text-white" : "bg-white text-zinc-400")}
                    >{dt === 'value' ? 'R$' : '%'}</button>
                  ))}
                </div>
                <input type="number" min="0"
                  className="flex-1 min-w-0 h-[38px] text-sm px-2 bg-white border border-zinc-200 rounded-lg text-center font-bold outline-none focus:border-amber-400 transition-all"
                  placeholder="0"
                  value={newService.discount}
                  onChange={e => setNewService({ ...newService, discount: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Preço final destaque */}
          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <div>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Total serviços</p>
              <p className="text-xs text-amber-400 line-through">R$ {parseFloat(newService.price || '0').toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Preço Final</p>
              <p className="text-xl font-black text-amber-700">
                R$ {(() => {
                  const p = parseFloat(newService.price) || 0;
                  const d = parseFloat(newService.discount) || 0;
                  return newService.discountType === 'percentage' ? (p * (1 - d / 100)).toFixed(2) : (p - d).toFixed(2);
                })()}
              </p>
            </div>
          </div>

          {/* Profissionais */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Profissionais</label>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setNewService({ ...newService, professionalIds: [] })}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                  (newService.professionalIds || []).length === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}>
                {(newService.professionalIds || []).length === 0 && <Check size={10} strokeWidth={3} />}
                Todos
              </button>
              {professionals.filter((p: any) => p.isActive !== false).map((p: any) => {
                const isSelected = (newService.professionalIds || []).includes(p.id);
                return (
                  <button key={p.id} type="button"
                    onClick={() => {
                      const ids: string[] = newService.professionalIds || [];
                      setNewService({ ...newService, professionalIds: isSelected ? ids.filter((id: string) => id !== p.id) : [...ids, p.id] });
                    }}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                      isSelected ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                    )}>
                    {isSelected && <Check size={10} strokeWidth={3} />}
                    {p.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl py-3 text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2"
            onClick={handleCreateService}
            disabled={!newService.name || newService.includedServices.length === 0}
          >
            {editingService ? <Edit2 size={14} /> : <Plus size={14} />}
            {editingService ? "Salvar Alterações" : "Cadastrar Pacote"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
