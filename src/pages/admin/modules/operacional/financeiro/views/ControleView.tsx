import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function ControleView() {
  return (
    <FinanceiroViewLayout 
      title="Controle de entrada e saída"
      description="Gestão detalhada - Controle de entrada e saída."
      icon={ArrowUpDown}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-emerald-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-red-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-blue-500" },
      ]}
      tableCols={["Data", "Tipo", "Descrição", "Pagamento", "Valor", "Status"]}
    />
  );
}


