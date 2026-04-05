import React from "react";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  Zap, 
  Edit2, 
  Trash2,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";

interface ProductsTabProps {
  products: any[];
  setIsProductModalOpen: (b: boolean) => void;
  setEditingProduct: (p: any) => void;
  setNewProduct: (p: any) => void;
  fetchProducts: () => void;
}

export function ProductsTab({ 
  products, 
  setIsProductModalOpen, 
  setEditingProduct, 
  setNewProduct, 
  fetchProducts 
}: ProductsTabProps) {
  const lowStockCount = products.filter((p: any) => p.stock <= p.minStock).length;
  
  const handleDeleteProduct = async (id: string) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      fetchProducts();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 h-full bg-zinc-50/30">
      {/* Header com métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex flex-col justify-between group hover:border-amber-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-amber-50 rounded-2xl group-hover:bg-amber-100 transition-colors">
              <Package className="text-amber-600" size={24} />
            </div>
            <button onClick={() => { 
                setEditingProduct(null);
                setNewProduct({
                  name: '', description: '', photo: '', costPrice: '', salePrice: '', stock: '0', minStock: '0', validUntil: '', code: '', isForSale: true, metadata: {}
                }); 
                setIsProductModalOpen(true); 
              }} 
              className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-black transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-zinc-900/10"
            >
              <Plus size={14} /> Novo Item
            </button>
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total de Itens</p>
            <p className="text-2xl font-black text-zinc-900 tracking-tighter">{products.length}</p>
          </div>
        </div>
        
        <div className={cn(
          "p-5 rounded-3xl border shadow-sm flex flex-col justify-between group transition-all",
          lowStockCount > 1 ? "bg-red-50/50 border-red-100 hover:border-red-200" : "bg-white border-zinc-100 hover:border-emerald-200"
        )}>
          <div className="flex justify-between items-start mb-4">
            <div className={cn(
              "p-2.5 rounded-2xl transition-colors",
              lowStockCount > 0 ? "bg-red-100 text-red-600" : "bg-emerald-50 text-emerald-500"
            )}>
              {lowStockCount > 0 ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
            </div>
            {lowStockCount > 0 && <span className="text-[9px] font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm border border-red-200">Atenção</span>}
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{lowStockCount > 0 ? "Estoque Crítico" : "Estoque Saudável"}</p>
            <p className={cn("text-2xl font-black tracking-tighter", lowStockCount > 0 ? "text-red-600" : "text-zinc-900")}>
              {lowStockCount} <span className="text-xs font-bold text-zinc-400">ítens</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-100 transition-colors">
              <DollarSign size={24} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Disponível p/ Venda</p>
            <p className="text-2xl font-black text-zinc-900 tracking-tighter">{products.filter((p: any) => p.isForSale).length}</p>
          </div>
        </div>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="px-8 py-6 border-b border-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-amber-500 rounded-full" />
            <div>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Inventário & PDV</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Controle total de produtos</p>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" placeholder="Buscar por nome ou SKU..." className="text-xs font-bold bg-zinc-50 border border-zinc-100 rounded-2xl pl-10 pr-4 py-3.5 w-full outline-none focus:ring-4 focus:ring-amber-500/5 focus:bg-white transition-all border-zinc-200/60" />
          </div>
        </div>
        
        <div className="overflow-x-auto h-full max-h-[600px] custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-zinc-50/50 sticky top-0 z-10">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Produto</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Código / SKU</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Estoque Atual</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Preços (R$)</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Status Venda</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center text-zinc-200 mb-4 border-2 border-dashed border-zinc-100">
                        <Package size={40} />
                      </div>
                      <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Seu estoque está vazio</p>
                      <button onClick={() => setIsProductModalOpen(true)} className="mt-4 text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline">+ Adicionar primeiro produto</button>
                    </div>
                  </td>
                </tr>
              ) : products.map((p: any) => {
                const stockStatus = p.stock <= 0 ? 'out' : p.stock <= p.minStock ? 'low' : 'ok';
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/80 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          {p.photo ? (
                            <img src={p.photo} className="w-14 h-14 rounded-2xl object-cover border border-zinc-100 shadow-sm" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-200 text-lg font-black group-hover:bg-zinc-100 transition-colors">
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {stockStatus === 'out' && <div className="absolute inset-0 bg-red-500/10 rounded-2xl flex items-center justify-center"><XCircle size={16} className="text-red-500" /></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-zinc-800 tracking-tight truncate">{p.name}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase truncate max-w-[180px] mt-0.5">{p.description || 'Sem descrição cadastrada'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-2.5 py-1.5 bg-zinc-100 text-zinc-500 text-[10px] font-black rounded-xl tracking-widest uppercase border border-zinc-200/50">
                        {p.code || 'S/ SKU'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-base font-black tracking-tighter",
                          stockStatus === 'out' ? "text-red-500" : stockStatus === 'low' ? "text-amber-500" : "text-zinc-900"
                        )}>
                          {p.stock} <span className="text-[10px] font-bold text-zinc-400">un</span>
                        </span>
                        <div className="w-20 h-1.5 bg-zinc-100 rounded-full mt-2.5 overflow-hidden shadow-inner">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              stockStatus === 'out' ? "bg-red-500 w-full" : 
                              stockStatus === 'low' ? "bg-amber-500" : "bg-emerald-500"
                            )} 
                            style={{ width: `${Math.min(100, (p.stock / (p.minStock * 4 || 10)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-12">Custo:</span>
                          <span className="text-[10px] font-bold text-zinc-500 tracking-tight">R$ {Number(p.costPrice).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest w-12">Venda:</span>
                          <span className="text-sm font-black text-emerald-600 tracking-tighter">R$ {Number(p.salePrice).toFixed(2)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shadow-sm",
                        p.isForSale 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-zinc-100 text-zinc-400 border-zinc-200"
                      )}>
                        {p.isForSale ? <><Zap size={10} fill="currentColor"/> No PDV</> : "Uso Interno"}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2.5 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => { 
                            setEditingProduct(p); 
                            setNewProduct({ 
                              ...p, 
                              costPrice: p.costPrice.toString(), 
                              salePrice: p.salePrice.toString(), 
                              stock: p.stock.toString(), 
                              minStock: p.minStock.toString(),
                              validUntil: p.validUntil ? format(new Date(p.validUntil), "yyyy-MM-dd") : ''
                            }); 
                            setIsProductModalOpen(true); 
                          }} 
                          className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-amber-500 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/10 transition-all active:scale-90"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)} 
                          className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/10 transition-all active:scale-90"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
