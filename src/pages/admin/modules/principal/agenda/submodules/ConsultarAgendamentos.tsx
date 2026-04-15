import React, { useState, useMemo } from "react";
import {
  Calendar, Check, X,
  Clock, Scissors, UserX, CheckCircle, MoreVertical,
  RefreshCw,
} from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { Badge } from "@/src/components/ui/Badge";
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineSegmented } from "@/src/components/ui/FilterLine";
import { GridTable } from "@/src/components/ui/GridTable";
import type { Column } from "@/src/components/ui/GridTable";

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

type StatusFilter = "all" | "scheduled" | "confirmed" | "noshow" | "cancelled" | "realizado";
type PeriodFilter = "today" | "tomorrow" | "week" | "month" | "all";

const STATUS_OPTIONS = [
  { value: "all",       label: "Todos" },
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
  services,
  clients,
  isLoading = false,
  onAppointmentClick,
  onUpdateStatus,
  onNewAppointment,
  onRefresh,
}: ConsultarAgendamentosProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
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
            <p className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
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
            <p className="text-[10px] text-zinc-400">{a.client.phone}</p>
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
          <button
            onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
          >
            <MoreVertical size={14} />
          </button>
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
    <div className="space-y-4 sm:space-y-5 pb-20 sm:pb-6 relative">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
            <Calendar size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">Consultar Agendamentos</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Visualize, filtre e gerencie todos os agendamentos.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button onClick={onRefresh} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-all" title="Atualizar">
              <RefreshCw size={16} />
            </button>
          )}
          {onNewAppointment && (
            <button onClick={onNewAppointment} className="flex items-center gap-2 h-9 sm:h-10 px-3 sm:px-4 rounded-[10px] bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all">
              <Calendar size={14} /> Novo
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total hoje",  value: todayCounts.total,     color: "text-zinc-900" },
          { label: "Confirmados", value: todayCounts.confirmed, color: "text-emerald-600" },
          { label: "Restantes",   value: todayCounts.remaining, color: "text-amber-600" },
          { label: "Faltas",      value: todayCounts.noshow,    color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-zinc-200 rounded-2xl p-3 sm:p-4 shadow-sm">
            <p className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={cn("text-2xl font-black", color)}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar cliente, serviço..." />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection wrap>
          <FilterLineItem fullOnMobile={false}>
            <FilterLineSegmented
              value={periodFilter}
              onChange={(v) => setPeriodFilter(v as PeriodFilter)}
              options={PERIOD_OPTIONS}
              size="sm"
            />
          </FilterLineItem>
          <FilterLineItem fullOnMobile={false}>
            <select
              value={profFilter}
              onChange={(e) => setProfFilter(e.target.value)}
              className="h-9 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[11px] font-bold text-zinc-700 outline-none focus:border-amber-400 transition-all"
            >
              <option value="all">Todos os profissionais</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FilterLineItem>
          <FilterLineItem fullOnMobile={false}>
            <FilterLineSegmented
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={STATUS_OPTIONS}
              size="sm"
            />
          </FilterLineItem>
        </FilterLineSection>
      </FilterLine>

      {/* Contador */}
      <p className="text-[11px] font-bold text-zinc-400">
        {filtered.length} agendamento{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

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
                  <p className="text-xs text-zinc-500">{a.service?.name ?? a.type}</p>
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
