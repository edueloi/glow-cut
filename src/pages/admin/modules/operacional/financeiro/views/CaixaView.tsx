import React from 'react';
import { Banknote } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function CaixaView() {
  return (
    <FinanceiroViewLayout 
      title="Financeiro – Caixa"
      description="Gestão detalhada - Financeiro – Caixa."
      icon={Banknote}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-emerald-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-indigo-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-amber-500" },
      ]}
      tableCols={["Data", "Operador", "Abertura/Fechamento", "Saldo Final", "Diferença"]}
    />
  );
}


