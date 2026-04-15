import React from 'react';
import { Tag } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function MotivosDescontoView() {
  return (
    <FinanceiroViewLayout 
      title="Motivos de desconto"
      description="Gestão detalhada - Motivos de desconto."
      icon={Tag}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-pink-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-rose-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-red-500" },
      ]}
      tableCols={["Descrição", "Tipo (Valor/%)", "Uso (Qtd)", "Status Ativo"]}
    />
  );
}


