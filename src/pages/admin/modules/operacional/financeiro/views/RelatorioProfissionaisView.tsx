import React from 'react';
import { BarChart3 } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function RelatorioProfissionaisView() {
  return (
    <FinanceiroViewLayout 
      title="Relatório financeiro por profissional"
      description="Gestão detalhada - Relatório financeiro por profissional."
      icon={BarChart3}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-sky-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-cyan-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-blue-500" },
      ]}
      tableCols={["Profissional", "Volume de Vendas", "Serviços", "Produtos", "Ticket Médio"]}
    />
  );
}


