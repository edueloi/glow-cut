import React from "react";
import { Wallet, Info } from "lucide-react";
import { EmptyState } from "@/src/components/ui";

export function CreditoClienteView() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-black text-blue-800">Crédito de Cliente</p>
          <p className="text-[11px] text-blue-600 mt-0.5 leading-relaxed">
            Esta funcionalidade permite gerenciar saldos de crédito pré-pago de clientes.
            O lançamento de crédito é feito diretamente em comandas com pagamento antecipado.
          </p>
        </div>
      </div>

      <EmptyState
        title="Nenhum crédito registrado"
        description="Créditos de clientes serão exibidos aqui quando lançamentos de crédito forem realizados nas comandas."
        icon={Wallet}
      />
    </div>
  );
}
