import React from 'react';
import { Landmark } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function ContasView() {
  return (
    <FinanceiroViewLayout 
      title="Contas financeiras"
      description="Gestão detalhada - Contas financeiras."
      icon={Landmark}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-blue-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-indigo-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-emerald-500" },
      ]}
      tableCols={["Banco/Conta", "Agência", "Conta", "Tipo", "Saldo Atual"]}
    />
  );
}


