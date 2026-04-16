import React, { useEffect, useState, useMemo } from "react";
import { AlertTriangle, Users, Phone, Clock } from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineSearch, Badge, EmptyState,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import { formatCurrency, formatDate } from "@/src/hooks/useFinanceiro";
import { apiFetch } from "@/src/lib/api";

interface ClienteDebito {
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  totalDivida: number;
  comandasAbertas: number;
  ultimaVisita: string;
}

export function ClientesDebitoView() {
  const [clientes, setClientes] = useState<ClienteDebito[]>([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/comandas?status=open")
      .then(r => r.json())
      .then((data: any[]) => {
        // Agrupa por cliente
        const byClient: Record<string, ClienteDebito> = {};
        (data || []).forEach((c: any) => {
          if (!c.clientId) return;
          if (!byClient[c.clientId]) {
            byClient[c.clientId] = {
              clientId: c.clientId,
              clientName: c.clientName || c.client?.name || "Cliente sem nome",
              clientPhone: c.clientPhone || c.client?.phone || null,
              totalDivida: 0,
              comandasAbertas: 0,
              ultimaVisita: c.createdAt,
            };
          }
          byClient[c.clientId].totalDivida += Number(c.total) || 0;
          byClient[c.clientId].comandasAbertas += 1;
          if (new Date(c.createdAt) > new Date(byClient[c.clientId].ultimaVisita)) {
            byClient[c.clientId].ultimaVisita = c.createdAt;
          }
        });
        setClientes(Object.values(byClient).sort((a, b) => b.totalDivida - a.totalDivida));
      })
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  }, []);

  const lista = useMemo(() => {
    const q = search.toLowerCase();
    return clientes.filter(c => !q || c.clientName.toLowerCase().includes(q));
  }, [clientes, search]);

  const totalDivida = lista.reduce((s, c) => s + c.totalDivida, 0);

  const getDiasSemVisita = (dateStr: string) => {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    return d;
  };

  const columns: Column<ClienteDebito>[] = [
    {
      header: "Cliente",
      render: row => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 font-black text-xs shrink-0">
            {row.clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-black text-zinc-900">{row.clientName}</p>
            {row.clientPhone && (
              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Phone size={9} />{row.clientPhone}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Última Visita",
      render: row => {
        const dias = getDiasSemVisita(row.ultimaVisita);
        return (
          <div>
            <p className="text-xs text-zinc-600">{formatDate(row.ultimaVisita)}</p>
            <Badge color={dias > 30 ? "danger" : dias > 14 ? "warning" : "default"} size="sm">
              {dias}d atrás
            </Badge>
          </div>
        );
      },
      hideOnMobile: true,
    },
    {
      header: "Comandas",
      render: row => <span className="text-xs font-bold text-zinc-700">{row.comandasAbertas} em aberto</span>,
      hideOnMobile: true,
    },
    {
      header: "Valor Devido",
      render: row => <span className="text-sm font-black text-red-600">{formatCurrency(row.totalDivida)}</span>,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Total em Débito" value={formatCurrency(totalDivida)} icon={AlertTriangle} color="danger" description={`${lista.length} cliente${lista.length !== 1 ? "s" : ""}`} delay={0} />
        <StatCard title="Clientes" value={lista.length} icon={Users} color="warning" description="Com comandas abertas" delay={0.05} />
        <StatCard title="Média de Débito" value={lista.length ? formatCurrency(totalDivida / lista.length) : "R$ 0,00"} icon={Clock} color="default" description="Por cliente" delay={0.1} />
      </div>

      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar cliente..." />
          </FilterLineItem>
        </FilterLineSection>
      </FilterLine>

      <GridTable<ClienteDebito>
        data={lista}
        columns={columns}
        keyExtractor={r => r.clientId}
        isLoading={loading}
        emptyMessage={
          <EmptyState
            title="Nenhum cliente em débito"
            description="Ótimo! Todos os clientes estão com as contas em dia."
            icon={AlertTriangle}
          />
        }
        renderMobileItem={row => (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 font-black text-xs shrink-0">
                {row.clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-black text-zinc-900">{row.clientName}</p>
                <p className="text-[10px] text-zinc-400">{row.comandasAbertas} comanda{row.comandasAbertas !== 1 ? "s" : ""} em aberto</p>
              </div>
            </div>
            <span className="text-sm font-black text-red-600">{formatCurrency(row.totalDivida)}</span>
          </div>
        )}
        getMobileBorderClass={() => "border-red-200"}
      />
    </div>
  );
}
