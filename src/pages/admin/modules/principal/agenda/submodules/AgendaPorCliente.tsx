import React, { useState } from "react";
import { Calendar, Clock, User, Scissors, ChevronRight, Phone, X, Plus, History, CalendarClock } from "lucide-react";
import { format, isFuture, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import {
  Badge,
  Button,
  IconButton,
  Input,
  SectionTitle,
  ContentCard,
  StatGrid,
  StatCard,
  EmptyState,
} from "@/src/components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Agenda por Cliente
// ─────────────────────────────────────────────────────────────────────────────

interface AgendaPorClienteProps {
  clients: any[];
  appointments: any[];
  professionals: any[];
  services: any[];
  onNewAppointment?: (client: any) => void;
  onAppointmentClick?: (appt: any) => void;
}

const STATUS_MAP: Record<string, { label: string; color: "success" | "primary" | "danger" | "default" | "warning" }> = {
  scheduled: { label: "Agendado",       color: "primary" },
  confirmed: { label: "Confirmado",     color: "success" },
  noshow:    { label: "Falta",          color: "danger" },
  cancelled: { label: "Cancelado",      color: "default" },
  realizado: { label: "Realizado",      color: "success" },
};

type FilterTab = "all" | "future" | "past";

export function AgendaPorCliente({
  clients,
  appointments,
  professionals: _professionals,
  services: _services,
  onNewAppointment,
  onAppointmentClick,
}: AgendaPorClienteProps) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [filter, setFilter] = useState<FilterTab>("all");

  const filteredClients = search.trim().length < 1
    ? clients.slice(0, 30)
    : clients.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.cpf?.includes(search)
      ).slice(0, 30);

  const allClientAppts = selectedClient
    ? appointments.filter((a) => a.clientId === selectedClient.id || a.client?.id === selectedClient.id)
    : [];

  const clientAppointments = allClientAppts
    .filter((a) => {
      const d = new Date(a.date);
      if (filter === "future") return isFuture(d) || isToday(d);
      if (filter === "past")   return isPast(d) && !isToday(d);
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const futureCount   = allClientAppts.filter((a) => isFuture(new Date(a.date)) || isToday(new Date(a.date))).length;
  const pastCount     = allClientAppts.filter((a) => isPast(new Date(a.date)) && !isToday(new Date(a.date))).length;
  const noShowCount   = allClientAppts.filter((a) => a.status === "noshow").length;

  const selectClient = (client: any) => {
    setSelectedClient((prev: any) => prev?.id === client.id ? null : client);
    setFilter("all");
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 sm:pb-6 px-4 sm:px-5 lg:px-6 xl:px-8 pt-3 sm:pt-4 lg:pt-5">

      <SectionTitle
        title="Agenda por Cliente"
        description="Pesquise um cliente para ver o histórico completo de agendamentos."
        icon={User}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">

        {/* ── Coluna esquerda: lista de clientes ── */}
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Nome, telefone ou CPF..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedClient(null); }}
            iconLeft={<User size={14} />}
            iconRight={search ? (
              <button onClick={() => { setSearch(""); setSelectedClient(null); }} className="text-zinc-400 hover:text-zinc-600">
                <X size={13} />
              </button>
            ) : undefined}
          />

          <ContentCard padding="none">
            {filteredClients.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs font-bold text-zinc-400">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredClients.map((client) => {
                  const total = appointments.filter(
                    (a) => a.clientId === client.id || a.client?.id === client.id
                  ).length;
                  const upcoming = appointments.filter(
                    (a) => (a.clientId === client.id || a.client?.id === client.id) && isFuture(new Date(a.date))
                  ).length;
                  const isActive = selectedClient?.id === client.id;
                  return (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-l-2",
                        isActive
                          ? "bg-amber-50 border-l-amber-500"
                          : "hover:bg-zinc-50 border-l-transparent"
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all",
                        isActive ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-500"
                      )}>
                        {client.name?.[0]?.toUpperCase() ?? "?"}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-900 truncate">{client.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                          <Phone size={9} />{client.phone ?? "Sem telefone"}
                        </p>
                      </div>

                      {/* Contadores */}
                      <div className="shrink-0 text-right space-y-0.5">
                        <p className="text-xs font-black text-zinc-600">{total} <span className="text-[9px] font-medium text-zinc-400">total</span></p>
                        {upcoming > 0 && (
                          <p className="text-[9px] font-bold text-amber-600">{upcoming} próx.</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ContentCard>
        </div>

        {/* ── Coluna direita: histórico do cliente ── */}
        <div className="flex flex-col gap-4 min-w-0">
          {!selectedClient ? (
            <EmptyState
              icon={User}
              title="Selecione um cliente"
              description="Escolha um cliente na lista para ver o histórico de agendamentos."
              className="py-20"
            />
          ) : (
            <>
              {/* Card do cliente */}
              <ContentCard padding="sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Avatar grande */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white text-xl font-black shadow-md shadow-amber-500/20">
                    {selectedClient.name?.[0]?.toUpperCase()}
                  </div>

                  {/* Dados */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-zinc-900">{selectedClient.name}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {selectedClient.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Phone size={11} />{selectedClient.phone}
                        </span>
                      )}
                      {selectedClient.email && (
                        <span className="text-xs text-zinc-400 truncate">{selectedClient.email}</span>
                      )}
                    </div>
                  </div>

                  {/* Botão novo agendamento */}
                  {onNewAppointment && (
                    <Button
                      size="sm"
                      iconLeft={<Calendar size={13} />}
                      onClick={() => onNewAppointment(selectedClient)}
                      className="shrink-0"
                    >
                      Novo Agendamento
                    </Button>
                  )}
                </div>
              </ContentCard>

              {/* Stats rápidos */}
              <StatGrid cols={3}>
                <StatCard icon={CalendarClock} title="Próximos"  value={futureCount} color="warning" delay={0}    />
                <StatCard icon={History}       title="Histórico" value={pastCount}   color="default" delay={0.05} />
                <StatCard icon={User}          title="Faltas"    value={noShowCount} color="danger"  delay={0.1}  />
              </StatGrid>

              {/* Filtro tabs */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl self-start">
                {([
                  { key: "all",    label: "Todos",    count: allClientAppts.length },
                  { key: "future", label: "Próximos", count: futureCount },
                  { key: "past",   label: "Histórico", count: pastCount },
                ] as const).map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all",
                      filter === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    {label}
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                      filter === key ? "bg-amber-100 text-amber-700" : "bg-zinc-200 text-zinc-500"
                    )}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Lista de agendamentos */}
              {clientAppointments.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="Nenhum agendamento"
                  description={
                    filter === "future" ? "Sem próximos agendamentos."
                    : filter === "past" ? "Sem histórico de atendimentos."
                    : "Este cliente ainda não tem agendamentos."
                  }
                />
              ) : (
                <div className="space-y-2">
                  {clientAppointments.map((appt, i) => {
                    const statusCfg = STATUS_MAP[appt.status] ?? STATUS_MAP.scheduled;
                    const date = new Date(appt.date);
                    const isPastAppt = isPast(date) && !isToday(date);
                    const isTodayAppt = isToday(date);
                    return (
                      <motion.div
                        key={appt.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => onAppointmentClick?.(appt)}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 bg-white border rounded-2xl p-3 sm:p-4 transition-all",
                          onAppointmentClick && "cursor-pointer hover:shadow-sm hover:border-zinc-300",
                          isPastAppt ? "border-zinc-100 opacity-80" : "border-zinc-200",
                          isTodayAppt && "border-amber-200 bg-amber-50/30"
                        )}
                      >
                        {/* Data mini */}
                        <div className={cn(
                          "flex flex-col items-center justify-center w-11 h-11 rounded-xl border shrink-0",
                          isTodayAppt ? "bg-amber-500 border-amber-500 text-white"
                          : isPastAppt ? "bg-zinc-50 border-zinc-200"
                          : "bg-amber-50 border-amber-200"
                        )}>
                          <p className={cn(
                            "text-base font-black leading-none",
                            isTodayAppt ? "text-white" : isPastAppt ? "text-zinc-500" : "text-amber-600"
                          )}>
                            {format(date, "d")}
                          </p>
                          <p className={cn(
                            "text-[9px] font-bold uppercase",
                            isTodayAppt ? "text-white/80" : isPastAppt ? "text-zinc-400" : "text-amber-500"
                          )}>
                            {isTodayAppt ? "hoje" : format(date, "MMM", { locale: ptBR })}
                          </p>
                        </div>

                        {/* Dados */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-zinc-900 truncate">
                              {appt.service?.name ?? "Serviço"}
                            </p>
                            <Badge color={statusCfg.color} size="sm" dot>{statusCfg.label}</Badge>
                            {isTodayAppt && <Badge color="warning" size="sm">Hoje</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-zinc-400">
                              <Clock size={10} />{appt.startTime} – {appt.endTime}
                            </span>
                            {appt.professional?.name && (
                              <span className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                                <Scissors size={10} />{appt.professional.name}
                              </span>
                            )}
                            {appt.totalSessions > 1 && (
                              <span className="text-[10px] font-black text-amber-500">
                                Sessão {appt.sessionNumber}/{appt.totalSessions}
                              </span>
                            )}
                          </div>
                        </div>

                        {onAppointmentClick && (
                          <ChevronRight size={15} className="text-zinc-300 shrink-0" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
