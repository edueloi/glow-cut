import React from 'react';
import { Wallet } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function CreditoClienteView() {
  return (
    <FinanceiroViewLayout 
      title="Crédito de cliente"
      description="Gestão detalhada - Crédito de cliente."
      icon={Wallet}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-emerald-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-teal-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-blue-500" },
      ]}
      tableCols={["Cliente", "Contato", "Saldo Disponível", "Última Modificação", "Tipo"]}
    />
  );
}


