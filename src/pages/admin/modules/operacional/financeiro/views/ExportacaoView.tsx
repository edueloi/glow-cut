import React from 'react';
import { Download } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function ExportacaoView() {
  return (
    <FinanceiroViewLayout 
      title="Exportação Lançamentos Financeiros"
      description="Gestão detalhada - Exportação Lançamentos Financeiros."
      icon={Download}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-slate-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-zinc-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-neutral-500" },
      ]}
      tableCols={["Data Exportação", "Formato", "Período Referência", "Registros", "Usuário"]}
    />
  );
}


