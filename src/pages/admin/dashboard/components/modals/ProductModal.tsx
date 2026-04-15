import React, { useMemo } from "react";
import { 
  Package, 
  MapPin, 
  Tag, 
  DollarSign, 
  Boxes, 
  CalendarDays, 
  Eye,
  Info,
  ChevronDown
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { apiFetch } from "@/src/lib/api";

interface ProductModalProps {
  isProductModalOpen: boolean;
  setIsProductModalOpen: (v: boolean) => void;
  editingProduct: any;
  setEditingProduct: (v: any) => void;
  newProduct: any;
  setNewProduct: (v: any) => void;
  emptyProduct: any;
  handleCreateProduct: () => void;
  sectors: any[];
  fetchSectors: () => void;
  showNewSectorForm: boolean;
  setShowNewSectorForm: (v: boolean | ((v: boolean) => boolean)) => void;
  newSectorName: string;
  setNewSectorName: (v: string) => void;
  newSectorColor: string;
  setNewSectorColor: (v: string) => void;
}

export function ProductModal({
  isProductModalOpen,
  setIsProductModalOpen,
  editingProduct,
  setEditingProduct,
  newProduct,
  setNewProduct,
  emptyProduct,
  handleCreateProduct,
  sectors,
  fetchSectors,
  showNewSectorForm,
  setShowNewSectorForm,
  newSectorName,
  setNewSectorName,
  newSectorColor,
  setNewSectorColor,
}: ProductModalProps) {
  
  const margin = useMemo(() => {
    const cost = Number(newProduct.costPrice);
    const sale = Number(newProduct.salePrice);
    if (!cost || !sale || cost <= 0) return null;
    return (((sale - cost) / cost) * 100).toFixed(1);
  }, [newProduct.costPrice, newProduct.salePrice]);

  return (
    <Modal
      isOpen={isProductModalOpen}
      onClose={() => { 
        setIsProductModalOpen(false); 
        setEditingProduct(null); 
        setNewProduct(emptyProduct); 
        setShowNewSectorForm(false); 
        setNewSectorName(""); 
      }}
      title={editingProduct ? "Editar Produto" : "Novo Produto"}
      className="max-w-2xl"
    >
      <div className="space-y-6 sm:space-y-8">

        {/* ── Seção: Informações Básicas ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
              <Package size={14} />
            </div>
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-tight">Informações Básicas</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome do Produto *</label>
              <input
                type="text"
                className="w-full text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white outline-none transition-all placeholder:text-zinc-400"
                placeholder="Ex: Shampoo Premium 500ml"
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descrição</label>
              <textarea
                className="w-full text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white outline-none transition-all resize-none placeholder:text-zinc-400 min-h-[80px]"
                placeholder="Detalhes ou observações adicionais sobre o produto..."
                value={newProduct.description || ""}
                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                <Tag size={12} className="text-zinc-400" /> Código / SKU
              </label>
              <input
                type="text"
                className="w-full text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white outline-none transition-all placeholder:text-zinc-400 uppercase tracking-widest"
                placeholder="Ex: SHAM-001"
                value={newProduct.code || ""}
                onChange={e => setNewProduct({ ...newProduct, code: e.target.value.toUpperCase() })}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                <span className="flex items-center gap-1.5"><MapPin size={12} className="text-zinc-400" /> Setor / Categoria</span>
                <button
                  type="button"
                  onClick={() => setShowNewSectorForm(v => !v)}
                  className="text-amber-600 hover:text-amber-700 transition-colors"
                >
                  {showNewSectorForm ? "Cancelar" : "+ Novo"}
                </button>
              </label>
              
              {showNewSectorForm ? (
                <div className="flex gap-2 items-center p-2.5 bg-zinc-100 rounded-2xl border border-zinc-200 shadow-inner">
                  <input
                    type="color"
                    value={newSectorColor}
                    onChange={e => setNewSectorColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border-2 border-white cursor-pointer shrink-0 shadow-sm"
                  />
                  <input
                    type="text"
                    placeholder="Nome..."
                    value={newSectorName}
                    onChange={e => setNewSectorName(e.target.value)}
                    className="flex-1 text-sm p-2.5 bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400 font-bold"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newSectorName.trim()) return;
                      const res = await apiFetch("/api/sectors", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: newSectorName.trim(), color: newSectorColor })
                      });
                      if (res.ok) {
                        const created = await res.json();
                        await fetchSectors();
                        setNewProduct({ ...newProduct, sectorId: created.id });
                        setNewSectorName("");
                        setNewSectorColor("#6b7280");
                        setShowNewSectorForm(false);
                      }
                    }}
                    className="px-4 py-2.5 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    className="w-full text-sm p-4 pr-10 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                    value={newProduct.sectorId || ""}
                    onChange={e => setNewProduct({ ...newProduct, sectorId: e.target.value })}
                  >
                    <option value="" className="text-zinc-400">Selecione ou clique em + Novo</option>
                    {sectors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </section>


        {/* ── Seção: Preços e Margem ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-100">
              <DollarSign size={14} />
            </div>
            <h3 className="text-sm font-black text-emerald-800 uppercase tracking-tight">Precificação</h3>
          </div>
          
          <div className="bg-emerald-50/30 border border-zinc-200 rounded-[24px] p-2 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-white border border-zinc-100 rounded-[20px] p-4 shadow-sm">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 block">Preço de Custo (R$)</label>
              <input
                type="number"
                min="0" step="0.01"
                className="w-full text-xl sm:text-2xl font-black text-zinc-900 border-none outline-none focus:ring-0 p-0 placeholder:text-zinc-300"
                placeholder="0,00"
                value={newProduct.costPrice}
                onChange={e => setNewProduct({ ...newProduct, costPrice: e.target.value })}
              />
            </div>
            
            <div className="flex-1 bg-white border-2 border-emerald-500 rounded-[20px] p-4 shadow-md shadow-emerald-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 text-emerald-500 group-hover:scale-150 transition-transform duration-500"><DollarSign size={64}/></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                    Preço de Venda
                    {margin !== null && (
                      <span className={cn(
                        "px-1.5 py-0.5 rounded-md text-[8px] tracking-tight",
                        Number(margin) >= 30 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        Margem: {margin}%
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0" step="0.01"
                    className="w-full text-xl sm:text-2xl font-black text-emerald-600 border-none outline-none focus:ring-0 p-0 bg-transparent placeholder:text-emerald-200"
                    placeholder="0,00"
                    value={newProduct.salePrice}
                    onChange={e => setNewProduct({ ...newProduct, salePrice: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ── Seção: Estoque e Medidas ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 border border-indigo-100">
              <Boxes size={14} />
            </div>
            <h3 className="text-sm font-black text-zinc-800 uppercase tracking-tight">Estoque & Medidas</h3>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 block text-center sm:text-left">Atual</label>
              <input
                type="number"
                className="w-full text-lg p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-black focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-center placeholder:text-zinc-300"
                placeholder="0"
                value={newProduct.stock}
                onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 block text-center sm:text-left">Mínimo <span className="hidden sm:inline">(Alerta)</span></label>
              <input
                type="number"
                className="w-full text-lg p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-amber-600 font-black focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all text-center placeholder:text-zinc-300"
                placeholder="0"
                value={newProduct.minStock}
                onChange={e => setNewProduct({ ...newProduct, minStock: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 block text-center sm:text-left">Unidade</label>
              <div className="relative">
                <select
                  className="w-full text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all appearance-none cursor-pointer text-center sm:text-left"
                  value={newProduct.unit || "un"}
                  onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                >
                  <option value="un">Unidade (un)</option>
                  <option value="ml">Mililitro (ml)</option>
                  <option value="L">Litro (l)</option>
                  <option value="g">Grama (g)</option>
                  <option value="kg">Kilo (kg)</option>
                  <option value="cm">Cm</option>
                  <option value="m">Metro</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 block text-center sm:text-left truncate">Validade <span className="opacity-50">(Opc)</span></label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full text-xs p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all"
                  value={newProduct.validUntil || ""}
                  onChange={e => setNewProduct({ ...newProduct, validUntil: e.target.value })}
                />
              </div>
            </div>
          </div>
        </section>


        {/* ── Seção: Visibilidade ── */}
        <section className="pt-2">
          <label className="relative flex items-start sm:items-center justify-between p-4 sm:p-5 bg-zinc-50 border border-zinc-200 hover:border-amber-300 rounded-[24px] cursor-pointer transition-all group overflow-hidden">
            <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-white/60 to-transparent pointer-events-none" />
            <div className="flex gap-4 items-center z-10">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                newProduct.isForSale ? "bg-amber-100 text-amber-600" : "bg-zinc-200 text-zinc-500"
              )}>
                <Eye size={20} />
              </div>
              <div className="pr-4">
                <h4 className="text-sm font-black text-zinc-900 tracking-tight">Produto de Revenda (PDV)</h4>
                <p className="text-[11px] text-zinc-500 font-medium leading-tight mt-0.5">
                  Ative esta opção se o produto for comercializado para clientes finais no Ponto de Venda.
                </p>
              </div>
            </div>
            
            <div className="shrink-0 z-10 pt-2 sm:pt-0">
              <div className={cn(
                "relative inline-flex h-7 w-14 sm:h-8 sm:w-16 items-center rounded-full transition-colors",
                newProduct.isForSale ? "bg-amber-500 shadow-inner shadow-amber-900/20" : "bg-zinc-300 shadow-inner shadow-zinc-900/10"
              )}>
                <span
                  className={cn(
                    "inline-block h-6 w-6 sm:h-7 sm:w-7 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out",
                    newProduct.isForSale ? "translate-x-7 sm:translate-x-8" : "translate-x-1"
                  )}
                />
              </div>
            </div>
            {/* Hidden Input to update state via card click */}
            <input 
              type="checkbox" 
              className="hidden" 
              checked={newProduct.isForSale} 
              onChange={() => setNewProduct({ ...newProduct, isForSale: !newProduct.isForSale })} 
            />
          </label>
        </section>

      </div>

      <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="outline"
          className="w-full sm:w-auto px-8 rounded-[16px] py-3.5 font-bold text-sm text-zinc-500 hover:text-zinc-800 transition-all border-zinc-200"
          onClick={() => { setIsProductModalOpen(false); setEditingProduct(null); setNewProduct(emptyProduct); }}
        >
          Cancelar
        </Button>
        <Button
          className="w-full sm:flex-1 bg-zinc-900 hover:bg-black text-white rounded-[16px] py-3.5 font-black text-sm shadow-md cursor-pointer transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          onClick={handleCreateProduct}
          disabled={!newProduct.name || !newProduct.costPrice || !newProduct.salePrice}
        >
          {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
        </Button>
      </div>
    </Modal>
  );
}
