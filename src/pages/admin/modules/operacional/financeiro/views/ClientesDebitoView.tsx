import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { FinanceiroViewLayout } from '../components/FinanceiroViewLayout';

export function ClientesDebitoView() {
  return (
    <FinanceiroViewLayout 
      title="Clientes em débito"
      description="Gestão detalhada - Clientes em débito."
      icon={AlertTriangle}
      kpis={[
        { label: "Principal", value: "R$ 0,00", sub: "Visão geral", color: "bg-red-500" },
        { label: "Métrica Secundária", value: "0", sub: "Acumulado", color: "bg-orange-500" },
        { label: "Indicador", value: "100%", sub: "Saúde", color: "bg-yellow-500" },
      ]}
      tableCols={["Cliente", "Contato", "Última Visita", "Valor Devido", "Atraso", "Ações"]}
    />
  );
}


