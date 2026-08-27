import React, { useMemo, useState } from "react";
import { Calendar, Clock, User, Scissors, ChevronRight, Phone, X, History, CalendarClock, ArrowLeft, Mail } from "lucide-react";
import { format, isFuture, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import {
  Badge,
  Button,
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

function isUpcomingAppointment(appointment: any) {
  const date = new Date(appointment.date);
  return appointment.status !== "cancelled" && (isFuture(date) || isToday(date));
}

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

  const appointmentSummary = useMemo(() => {
    const summary = new Map<string, { total: number; upcoming: number }>();
    appointments.forEach((appointment) => {
      const clientId = appointment.clientId || appointment.client?.id;
      if (!clientId) return;
      const current = summary.get(clientId) || { total: 0, upcoming: 0 };
      current.total += 1;
      if (isUpcomingAppointment(appointment)) current.upcoming += 1;
      summary.set(clientId, current);
    });
    return summary;
  }, [appointments]);

  const matchingClients = search.trim().length < 1
    ? clients
    : clients.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.cpf?.includes(search)
      );
  const filteredClients = matchingClients.slice(0, 30);

  const allClientAppts = selectedClient
    ? appointments.filter((a) => a.clientId === selectedClient.id || a.client?.id === selectedClient.id)
    : [];

  const clientAppointments = allClientAppts
    .filter((a) => {
      const d = new Date(a.date);
      if (filter === "future") return isUpcomingAppointment(a);
      if (filter === "past")   return isPast(d) && !isToday(d);
      return true;
    })
    .sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      const timeDiff = String(a.startTime || "").localeCompare(String(b.startTime || ""));
      return filter === "future" ? dateDiff || timeDiff : -(dateDiff || timeDiff);
    });

  const futureCount   = allClientAppts.filter(isUpcomingAppointment).length;
  const pastCount     = allClientAppts.filter((a) => isPast(new Date(a.date)) && !isToday(new Date(a.date))).length;
  const noShowCount   = allClientAppts.filter((a) => a.status === "noshow").length;

  const selectClient = (client: any) => {
    setSelectedClient((prev: any) => prev?.id === client.id ? null : client);
    setFilter("all");
  };

  // On mobile: if a client is selected, show full detail panel (hide list)
  const showDetail = !!selectedClient;

  return (
    <div className="w-full min-w-0 space-y-4 p-3 pb-24 sm:p-5 sm:pb-6 lg:space-y-5 lg:p-6">

      {/* Header — back button on mobile when viewing a client */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:rounded-3xl">
      {showDetail ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedClient(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors lg:hidden"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <SectionTitle
            title={selectedClient.name}
            description="Histórico completo de agendamentos"
            icon={User}
            action={onNewAppointment && (
              <Button
                size="sm"
                iconLeft={<Calendar size={13} />}
                onClick={() => onNewAppointment(selectedClient)}
              >
                <span className="hidden sm:inline">Novo Agendamento</span>
                <span className="sm:hidden">Agendar</span>
              </Button>
            )}
            className="flex-1"
          />
        </div>
      ) : (
        <SectionTitle
          title="Agenda por Cliente"
          description="Pesquise um cliente para ver o histórico completo de agendamentos."
          icon={User}
        />
      )}

      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">

        {/* ── Coluna esquerda: lista de clientes — oculta no mobile quando cliente selecionado ── */}
        <div className={cn("flex min-w-0 flex-col gap-3 lg:sticky lg:top-4 lg:self-start", showDetail && "hidden lg:flex")}>
          <Input
            placeholder="Nome, telefone ou CPF..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedClient(null); }}
            iconLeft={<User size={14} />}
            iconRight={search ? (
              <button onClick={() => { setSearch(""); setSelectedClient(null); }} aria-label="Limpar busca" className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
                <X size={13} />
              </button>
            ) : undefined}
          />

          <ContentCard padding="none" className="overflow-hidden">
            {filteredClients.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs font-bold text-zinc-400">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 lg:max-h-[calc(100vh-270px)] lg:overflow-y-auto">
                {filteredClients.map((client) => {
                  const summary = appointmentSummary.get(client.id) || { total: 0, upcoming: 0 };
                  const total = summary.total;
                  const upcoming = summary.upcoming;
                  const isActive = selectedClient?.id === client.id;
                  return (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className={cn(
                        "flex min-h-[68px] w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-all sm:px-4",
                        isActive
                          ? "border-l-amber-500 bg-amber-50"
                          : "border-l-transparent hover:bg-zinc-50"
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all",
                        isActive ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-500"
                      )}>
                        {client.name?.[0]?.toUpperCase() ?? "?"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-900 truncate">{client.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                          <Phone size={9} />{client.phone ?? "Sem telefone"}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <div className="text-right space-y-0.5">
                          <p className={cn("text-xs font-black", total > 0 ? "text-zinc-700" : "text-zinc-300")}>{total} <span className="text-[9px] font-medium text-zinc-400">total</span></p>
                          {upcoming > 0 && (
                            <p className="text-[9px] font-bold text-amber-600">{upcoming} próx.</p>
                          )}
                        </div>
                        <ChevronRight size={13} className="text-zinc-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {filteredClients.length > 0 && (
              <div className="border-t border-zinc-100 bg-zinc-50/70 px-4 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Exibindo {filteredClients.length} de {matchingClients.length} clientes
                </p>
              </div>
            )}
          </ContentCard>
        </div>

        {/* ── Coluna direita: histórico do cliente ── */}
        <div className={cn("flex flex-col gap-4 min-w-0", !showDetail && "hidden lg:flex")}>
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
                <div className="flex items-center gap-4">
                  {/* Avatar grande */}
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xl sm:text-2xl font-black shadow-lg shadow-amber-500/20">
                    {selectedClient.name?.[0]?.toUpperCase()}
                  </div>

                  {/* Dados */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base sm:text-lg font-black text-zinc-900">{selectedClient.name}</p>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {selectedClient.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Phone size={11} className="text-zinc-400 shrink-0" />{selectedClient.phone}
                        </span>
                      )}
                      {selectedClient.email && (
                        <span className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
                          <Mail size={11} className="shrink-0" />{selectedClient.email}
                        </span>
                      )}
                    </div>
                    {selectedClient.cpf && (
                      <p className="text-[10px] text-zinc-300 mt-1">CPF: {selectedClient.cpf}</p>
                    )}
                  </div>
                </div>
              </ContentCard>

              {/* Stats rápidos */}
              <StatGrid cols={3} className="grid-cols-3 gap-2">
                <StatCard icon={CalendarClock} title="Próximos"  value={futureCount} color="warning" delay={0}    />
                <StatCard icon={History}       title="Histórico" value={pastCount}   color="default" delay={0.05} />
                <StatCard icon={User}          title="Faltas"    value={noShowCount} color="danger"  delay={0.1}  />
              </StatGrid>

              {/* Filtro tabs */}
              <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1 sm:w-fit sm:self-start">
                {([
                  { key: "all",    label: "Todos",    count: allClientAppts.length },
                  { key: "future", label: "Próximos", count: futureCount },
                  { key: "past",   label: "Histórico", count: pastCount },
                ] as const).map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "flex min-h-9 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-black transition-all sm:flex-none",
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
