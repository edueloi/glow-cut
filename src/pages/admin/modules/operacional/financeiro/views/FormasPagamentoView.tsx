import React from 'react';
import { CreditCard } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function FormasPagamentoView() {
  return (
    <FinanceiroViewLayout 
      title="Fluxo financeiro por forma de pagamento"
      description="Gestão detalhada - Fluxo financeiro por forma de pagamento."
      icon={CreditCard}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-blue-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-emerald-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-amber-500" },
      ]}
      tableCols={["Forma de Pagto", "Transações", "Receita Bruta", "Taxas", "Receita Líquida"]}
    />
  );
}


