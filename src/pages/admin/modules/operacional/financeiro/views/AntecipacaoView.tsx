import React from 'react';
import { FastForward } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function AntecipacaoView() {
  return (
    <FinanceiroViewLayout 
      title="Lançamento de antecipação"
      description="Gestão detalhada - Lançamento de antecipação."
      icon={FastForward}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-violet-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-fuchsia-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-purple-500" },
      ]}
      tableCols={["Data Solicitação", "Adquirente", "Valor Bruto", "Taxa", "Valor Líquido", "Data Prevista"]}
    />
  );
}


