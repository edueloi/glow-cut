import React from 'react';
import { Users } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function PagamentosView() {
  return (
    <FinanceiroViewLayout 
      title="Pagamento de Profissionais"
      description="Gestão detalhada - Pagamento de Profissionais."
      icon={Users}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-indigo-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-purple-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-emerald-500" },
      ]}
      tableCols={["Profissional", "Período", "Total Comissão", "Descontos", "Líquido", "Status"]}
    />
  );
}


