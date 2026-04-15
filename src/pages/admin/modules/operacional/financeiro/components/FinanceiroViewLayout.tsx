import React from "react";
import { Plus, Search, FileText } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function FinanceiroViewLayout({ title, description, icon: Icon, kpis, tableCols }: any) {
  return (
    <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Icon className="text-amber-500" size={24} />
            {title}
          </h2>
          <p className="text-xs font-bold text-zinc-400 mt-1">{description}</p>
        </div>
        <button className="flex px-4 py-2.5 bg-gradient-to-r from-zinc-900 to-black hover:from-black hover:to-zinc-900 text-white rounded-xl font-bold text-xs shadow-sm items-center gap-1.5 transition-all shadow-zinc-900/10 active:scale-95">
          <Plus size={14} /> <span className="hidden sm:inline">Lançar Novo</span><span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {kpis.map((kpi: any, i: number) => (
          <div key={i} className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-3 sm:p-5 shadow-sm group hover:shadow-md transition-all">
            <div className={cn("absolute top-0 left-0 right-0 h-1", kpi.color)} />
            <p className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate">{kpi.label}</p>
            <p className="text-xl sm:text-3xl font-black text-zinc-900 mt-0.5 sm:mt-1 tracking-tight truncate">{kpi.value}</p>
            <p className="text-[8px] sm:text-[9px] font-bold text-zinc-400 mt-0.5 truncate">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl sm:rounded-[24px] border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[350px]">
        <div className="p-3 sm:p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder={`Buscar em ${title?.toLowerCase() || 'registros'}...`}
              className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs font-bold bg-white border border-zinc-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 outline-none transition-all shadow-sm"
            />
          </div>
          <button className="hidden sm:flex p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors shadow-sm ms-2">
            <FileText size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                {tableCols.map((c: string, i: number) => (
                  <th key={i} className="py-3.5 px-4 text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/80">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={tableCols.length} className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-[20px] bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4 shadow-inner">
                      <Icon size={28} className="text-zinc-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-600 tracking-tight">Nenhum registro ativo</p>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1 max-w-[200px] leading-relaxed">
                      Quando você lançar registros, eles aparecerão aqui.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
