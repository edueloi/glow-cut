import React from "react";
import { Landmark, Info } from "lucide-react";
import { EmptyState } from "@/src/components/ui";

export function ContasView() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-black text-blue-800">Contas Financeiras</p>
          <p className="text-[11px] text-blue-600 mt-0.5 leading-relaxed">
            Cadastre e gerencie suas contas bancárias, cofres e carteiras digitais para
            controlar o saldo de cada conta separadamente.
          </p>
        </div>
      </div>

      <EmptyState
        title="Nenhuma conta cadastrada"
        description="Adicione suas contas bancárias para ter controle completo do seu fluxo de caixa por conta."
        icon={Landmark}
      />
    </div>
  );
}
