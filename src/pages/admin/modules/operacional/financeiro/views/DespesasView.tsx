import React from 'react';
import { TrendingDown } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function DespesasView() {
  return (
    <FinanceiroViewLayout 
      title="Despesas/Contas a Pagar"
      description="Gestão detalhada - Despesas/Contas a Pagar."
      icon={TrendingDown}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-red-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-rose-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-orange-500" },
      ]}
      tableCols={["Vencimento", "Beneficiário", "Descrição", "Valor", "Categoria", "Status"]}
    />
  );
}


