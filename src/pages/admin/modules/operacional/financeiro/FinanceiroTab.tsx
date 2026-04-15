import React, { useEffect, useRef } from "react";
import { DollarSign } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { ADMIN_NAV_SECTIONS } from "../../../config/navigation";

// Import all views
import { ControleView } from "./views/ControleView";
import { CaixaView } from "./views/CaixaView";
import { PagamentosView } from "./views/PagamentosView";
import { FormasPagamentoView } from "./views/FormasPagamentoView";
import { DespesasView } from "./views/DespesasView";
import { ClientesDebitoView } from "./views/ClientesDebitoView";
import { CreditoClienteView } from "./views/CreditoClienteView";
import { ContasView } from "./views/ContasView";
import { ExportacaoView } from "./views/ExportacaoView";
import { AntecipacaoView } from "./views/AntecipacaoView";
import { MotivosDescontoView } from "./views/MotivosDescontoView";
import { RelatorioProfissionaisView } from "./views/RelatorioProfissionaisView";

export function FinanceiroTab({ activeSubModule, setActiveSubModule }: any) {
  useEffect(() => {
    if (!activeSubModule) {
      setActiveSubModule('controle');
    }
  }, [activeSubModule, setActiveSubModule]);

  const financeiroItem = ADMIN_NAV_SECTIONS
    .flatMap(s => s.items)
    .find(i => i.tab === 'financeiro');
  
  const subItems = financeiroItem?.subItems || [];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll mobile menu
  useEffect(() => {
    if (scrollRef.current) {
      const activeBtn = scrollRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSubModule]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#fbfbfb] pb-20 sm:pb-0">
      
      {/* Mobile Submenu */}
      <div className="flex sm:hidden overflow-x-auto no-scrollbar border-b border-zinc-100 bg-white sticky top-0 z-20" ref={scrollRef}>
        <div className="flex px-4 min-w-max">
          {subItems.map((sub: any) => (
            <button
              key={sub.key}
              data-active={activeSubModule === sub.key}
              onClick={() => setActiveSubModule(sub.key)}
              className={cn(
                "px-4 py-3.5 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-colors relative",
                activeSubModule === sub.key ? "text-amber-600" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              {sub.label}
              {activeSubModule === sub.key && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-amber-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
        <div className="w-full">
          
          {/* Header Responsivo */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="hidden sm:flex items-center gap-2 mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md border border-amber-200/50">
                  <DollarSign size={12} className="text-amber-600"/>
                  <span className="text-[9px] font-black tracking-widest uppercase text-amber-700">
                    Operacional
                  </span>
                </div>
                <div className="h-3 w-px bg-zinc-200" />
                <span className="text-[9px] font-bold tracking-widest uppercase text-zinc-400">
                  Financeiro
                </span>
              </div>
              <h1 className="hidden sm:block text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight leading-none">
                Gestão Financeira
              </h1>
              <h1 className="sm:hidden text-xl font-black text-zinc-900 tracking-tight leading-none mb-1">
                {subItems.find(i => i.key === activeSubModule)?.label || 'Financeiro'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-2 font-medium max-w-xl">
                Gestão completa de contas, caixas, comissões e fluxo financeiro do seu estúdio.
              </p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6">
            {activeSubModule === 'controle' && <ControleView />}
            {activeSubModule === 'caixa' && <CaixaView />}
            {activeSubModule === 'pagamentos' && <PagamentosView />}
            {activeSubModule === 'formas_pagamento' && <FormasPagamentoView />}
            {activeSubModule === 'despesas' && <DespesasView />}
            {activeSubModule === 'clientes_debito' && <ClientesDebitoView />}
            {activeSubModule === 'credito_cliente' && <CreditoClienteView />}
            {activeSubModule === 'contas' && <ContasView />}
            {activeSubModule === 'exportacao' && <ExportacaoView />}
            {activeSubModule === 'antecipacao' && <AntecipacaoView />}
            {activeSubModule === 'motivos_desconto' && <MotivosDescontoView />}
            {activeSubModule === 'relatorio_profissionais' && <RelatorioProfissionaisView />}
          </div>
        </div>
      </div>
    </div>
  );
}
