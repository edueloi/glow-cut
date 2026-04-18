import React, { useState, useMemo } from "react";
import {
  Calendar, Check, X,
  Clock, Scissors, UserX, CheckCircle, MoreVertical,
  RefreshCw,
} from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Badge,
  Button,
  IconButton,
  StatCard,
  StatGrid,
  SectionTitle,
  FilterLineSearch,
  GridTable,
  Combobox,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Consultar Agendamentos — listagem completa com filtros avançados
// ─────────────────────────────────────────────────────────────────────────────

interface ConsultarAgendamentosProps {
  appointments: any[];
  professionals: any[];
  services: any[];
  clients: any[];
  isLoading?: boolean;
  onAppointmentClick?: (appt: any) => void;
  onUpdateStatus?: (id: string, status: string) => void;
  onNewAppointment?: () => void;
  onRefresh?: () => void;
}

type PeriodFilter = "today" | "tomorrow" | "week" | "month" | "all";

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Agendados" },
  { value: "confirmed", label: "Confirmados" },
  { value: "realizado", label: "Realizados" },
  { value: "noshow",    label: "Faltas" },
  { value: "cancelled", label: "Cancelados" },
];

const PERIOD_OPTIONS = [
  { value: "today",    label: "Hoje" },
  { value: "tomorrow", label: "Amanhã" },
  { value: "week",     label: "Semana" },
  { value: "month",    label: "Mês" },
  { value: "all",      label: "Todos" },
];

const STATUS_BADGE: Record<string, { label: string; color: "primary" | "success" | "danger" | "default" | "warning" }> = {
  scheduled: { label: "Agendado",       color: "primary" },
  confirmed: { label: "Confirmado",     color: "success" },
  noshow:    { label: "Não compareceu", color: "danger" },
  cancelled: { label: "Cancelado",      color: "default" },
  realizado: { label: "Realizado",      color: "success" },
};

export function ConsultarAgendamentos({
  appointments,
  professionals,
  services: _services,
  clients: _clients,
  isLoading = false,
  onAppointmentClick,
  onUpdateStatus,
  onNewAppointment,
  onRefresh,
}: ConsultarAgendamentosProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);   // vazio = todos
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today");
  const [profFilter, setProfFilter] = useState("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // ── Filtragem ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...appointments];
    const now = new Date();

    if (periodFilter === "today") {
      const s = startOfDay(now); const e = endOfDay(now);
      list = list.filter((a) => { const d = new Date(a.date); return d >= s && d <= e; });
    } else if (periodFilter === "tomorrow") {
      const t = new Date(now); t.setDate(t.getDate() + 1);
      const s = startOfDay(t); const e = endOfDay(t);
      list = list.filter((a) => { const d = new Date(a.date); return d >= s && d <= e; });
    } else if (periodFilter === "week") {
      const s = startOfDay(now);
      const e = new Date(now); e.setDate(e.getDate() + 7);
      list = list.filter((a) => { const d = new Date(a.date); return d >= s && d <= e; });
    } else if (periodFilter === "month") {
      const s = startOfDay(now);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      list = list.filter((a) => { const d = new Date(a.date); return d >= s && d <= e; });
    }

    if (statusFilter.length > 0) {
      list = list.filter((a) => statusFilter.includes(a.status));
    }
    if (profFilter !== "all") {
      list = list.filter((a) => a.professionalId === profFilter || a.professional?.id === profFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.client?.name?.toLowerCase().includes(q) ||
        a.service?.name?.toLowerCase().includes(q) ||
        a.professional?.name?.toLowerCase().includes(q) ||
        a.startTime?.includes(q)
      );
    }

    return list.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return (a.startTime ?? "").localeCompare(b.startTime ?? "");
    });
  }, [appointments, search, statusFilter, periodFilter, profFilter]);

  // ── Totais do dia ──────────────────────────────────────────────────────────
  const todayAppts = appointments.filter((a) => isToday(new Date(a.date)));
  const todayCounts = {
    total:     todayAppts.length,
    confirmed: todayAppts.filter((a) => a.status === "confirmed").length,
    noshow:    todayAppts.filter((a) => a.status === "noshow").length,
    remaining: todayAppts.filter((a) => ["scheduled", "confirmed"].includes(a.status)).length,
  };

  // ── Colunas ────────────────────────────────────────────────────────────────
  const columns: Column<any>[] = [
    {
      header: "Data / Hora",
      render: (a) => {
        const d = new Date(a.date);
        const label = isToday(d) ? "Hoje" : isTomorrow(d) ? "Amanhã" : isYesterday(d) ? "Ontem" : format(d, "dd/MM/yy", { locale: ptBR });
        return (
          <div>
            <p className="text-xs font-bold text-zinc-800">{label}</p>
            <p className="text-[10px] text-zinc-400 font-medium flex items-center gap-1 mt-0.5">
              <Clock size={9} />{a.startTime} – {a.endTime}
            </p>
          </div>
        );
      },
    },
    {
      header: "Cliente",
      render: (a) => (
        <div>
          <p className="text-xs font-bold text-zinc-800 truncate max-w-[140px]">
            {a.type === "bloqueio" ? "— Bloqueio —" : a.type === "pessoal" ? "— Pessoal —" : a.client?.name ?? "Sem cliente"}
          </p>
          {a.client?.phone && (
            <p className="text-[10px] text-zinc-400 mt-0.5">{a.client.phone}</p>
          )}
        </div>
      ),
    },
    {
      header: "Serviço",
      hideOnMobile: true,
      render: (a) => (
        <p className="text-xs text-zinc-700 truncate max-w-[120px]">{a.service?.name ?? "—"}</p>
      ),
    },
    {
      header: "Profissional",
      hideOnMobile: true,
      render: (a) => (
        <p className="text-xs text-zinc-700 truncate max-w-[100px]">{a.professional?.name ?? "—"}</p>
      ),
    },
    {
      header: "Status",
      render: (a) => {
        const cfg = STATUS_BADGE[a.status] ?? STATUS_BADGE.scheduled;
        return <Badge color={cfg.color} size="sm" dot>{cfg.label}</Badge>;
      },
    },
    {
      header: "Ações",
      className: "w-10",
      render: (a) => (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <IconButton
            size="sm"
            variant="ghost"
            onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
          >
            <MoreVertical size={14} />
          </IconButton>
          {openMenu === a.id && (
            <>
              <div className="fixed inset-0 z-[50]" onClick={() => setOpenMenu(null)} />
              <div className="absolute right-0 top-full mt-1 z-[51] w-44 bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden">
                {a.status === "scheduled" && (
                  <ActionMenuItem icon={<CheckCircle size={13} className="text-emerald-500" />} label="Confirmar" onClick={() => { onUpdateStatus?.(a.id, "confirmed"); setOpenMenu(null); }} />
                )}
                {["scheduled", "confirmed"].includes(a.status) && (
                  <ActionMenuItem icon={<UserX size={13} className="text-red-500" />} label="Marcar falta" onClick={() => { onUpdateStatus?.(a.id, "noshow"); setOpenMenu(null); }} />
                )}
                {["scheduled", "confirmed"].includes(a.status) && (
                  <ActionMenuItem icon={<X size={13} className="text-zinc-500" />} label="Cancelar" onClick={() => { onUpdateStatus?.(a.id, "cancelled"); setOpenMenu(null); }} />
                )}
                <ActionMenuItem icon={<Check size={13} className="text-blue-500" />} label="Ver detalhes" onClick={() => { onAppointmentClick?.(a); setOpenMenu(null); }} />
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 sm:pb-6 px-4 sm:px-5 lg:px-6 xl:px-8 pt-3 sm:pt-4 lg:pt-5">

      {/* Header */}
      <SectionTitle
        title="Consultar Agendamentos"
        description="Visualize, filtre e gerencie todos os agendamentos."
        icon={Calendar}
        action={
          <div className="flex items-center gap-2">
            {onRefresh && (
              <IconButton variant="ghost" onClick={onRefresh} title="Atualizar">
                <RefreshCw size={16} />
              </IconButton>
            )}
            {onNewAppointment && (
              <Button
                size="sm"
                iconLeft={<Calendar size={14} />}
                onClick={onNewAppointment}
              >
                <span className="hidden sm:inline">Novo Agendamento</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            )}
          </div>
        }
      />

      {/* KPIs */}
      <StatGrid cols={4}>
        <StatCard icon={Calendar} title="Total hoje"  value={todayCounts.total}     color="default"  delay={0}    />
        <StatCard icon={Check}    title="Confirmados" value={todayCounts.confirmed} color="success"  delay={0.05} />
        <StatCard icon={Clock}    title="Restantes"   value={todayCounts.remaining} color="warning"  delay={0.1}  />
        <StatCard icon={UserX}    title="Faltas"      value={todayCounts.noshow}    color="danger"   delay={0.15} />
      </StatGrid>

      {/* Filtros — tudo em uma linha no desktop, empilha só no mobile */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <FilterLineSearch
            value={search}
            onChange={setSearch}
            placeholder="Buscar..."
            className="flex-1 min-w-0"
          />
          <Combobox
            placeholder="Período"
            options={PERIOD_OPTIONS}
            value={periodFilter}
            onChange={(v) => setPeriodFilter(((v as string) || "today") as PeriodFilter)}
            className="sm:w-48 shrink-0"
            size="sm"
          />
          <Combobox
            placeholder="Profissional"
            options={[
              { value: "all", label: "Todos" },
              ...professionals.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={profFilter}
            onChange={(v) => setProfFilter((v as string) || "all")}
            className="sm:w-52 shrink-0"
            size="sm"
          />
          <Combobox
            placeholder="Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as string[])}
            multiple
            className="sm:w-48 shrink-0"
            size="sm"
          />
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs font-bold text-zinc-400">
        {filtered.length} agendamento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Tabela */}
      <GridTable
        data={filtered}
        columns={columns}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        onRowClick={onAppointmentClick}
        emptyMessage="Nenhum agendamento encontrado com os filtros aplicados."
        renderMobileItem={(a) => {
          const d = new Date(a.date);
          const cfg = STATUS_BADGE[a.status] ?? STATUS_BADGE.scheduled;
          const label = isToday(d) ? "Hoje" : isTomorrow(d) ? "Amanhã" : isYesterday(d) ? "Ontem" : format(d, "dd/MM/yy", { locale: ptBR });
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate">
                    {a.type === "bloqueio" ? "Bloqueio" : a.client?.name ?? "Sem cliente"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{a.service?.name ?? a.type}</p>
                </div>
                <Badge color={cfg.color} size="sm" dot>{cfg.label}</Badge>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-medium border-t border-zinc-100 pt-2">
                <span className="flex items-center gap-1"><Calendar size={9} />{label}</span>
                <span className="flex items-center gap-1"><Clock size={9} />{a.startTime} – {a.endTime}</span>
                {a.professional?.name && (
                  <span className="flex items-center gap-1 truncate"><Scissors size={9} />{a.professional.name.split(" ")[0]}</span>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

function ActionMenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
    >
      {icon}
      {label}
    </button>
  );
}
