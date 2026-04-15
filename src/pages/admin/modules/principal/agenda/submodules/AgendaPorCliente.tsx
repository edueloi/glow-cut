import React, { useState } from "react";
import { Search, Calendar, Clock, User, Scissors, ChevronRight, Phone, X, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format, isFuture, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { Badge } from "@/src/components/ui/Badge";

// ─────────────────────────────────────────────────────────────────────────────
// Agenda por Cliente — busca agendamentos vinculados a um cliente
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
  scheduled:  { label: "Agendado",       color: "primary" },
  confirmed:  { label: "Confirmado",     color: "success" },
  noshow:     { label: "Não compareceu", color: "danger" },
  cancelled:  { label: "Cancelado",      color: "default" },
  realizado:  { label: "Realizado",      color: "success" },
};

export function AgendaPorCliente({
  clients,
  appointments,
  professionals,
  services,
  onNewAppointment,
  onAppointmentClick,
}: AgendaPorClienteProps) {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "future" | "past">("all");

  const filteredClients = search.trim().length < 1
    ? clients.slice(0, 20)
    : clients.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.cpf?.includes(search)
      ).slice(0, 30);

  const clientAppointments = selectedClient
    ? appointments
        .filter((a) => a.clientId === selectedClient.id || a.client?.id === selectedClient.id)
        .filter((a) => {
          const d = new Date(a.date);
          if (filter === "future") return !isPast(d) || isFuture(d);
          if (filter === "past") return isPast(d);
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const future = appointments.filter(
    (a) => a.clientId === selectedClient?.id && isFuture(new Date(a.date))
  ).length;
  const past = appointments.filter(
    (a) => a.clientId === selectedClient?.id && isPast(new Date(a.date))
  ).length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 sm:pb-6 relative">

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
          <User size={18} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">Agenda por Cliente</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Pesquise um cliente para ver todos os agendamentos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr] gap-4 sm:gap-5">

        {/* Busca de clientes */}
        <div className="flex flex-col gap-3">
          <div className="relative flex items-center h-10 sm:h-11 rounded-[10px] border border-zinc-200 bg-zinc-50 px-3 gap-2 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/10 focus-within:bg-white transition-all">
            <Search size={15} className="shrink-0 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedClient(null); }}
              placeholder="Nome, telefone ou CPF..."
              className="w-full bg-transparent text-sm font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
            />
            {search && (
              <button onClick={() => { setSearch(""); setSelectedClient(null); }} className="text-zinc-400 hover:text-zinc-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
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
                  const isActive = selectedClient?.id === client.id;
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClient(isActive ? null : client)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all",
                        isActive
                          ? "bg-amber-50 border-l-[3px] border-l-amber-500"
                          : "hover:bg-zinc-50 border-l-[3px] border-l-transparent"
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                        isActive ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-500"
                      )}>
                        {client.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-900 truncate">{client.name}</p>
                        <p className="text-[10px] text-zinc-400 font-medium truncate">
                          {client.phone ?? "Sem telefone"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-black text-zinc-500">{total}</p>
                        <p className="text-[9px] text-zinc-400">agend.</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Agendamentos do cliente */}
        <div className="flex flex-col gap-3">
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 bg-white border border-zinc-200 border-dashed rounded-2xl text-center px-6">
              <User size={32} className="text-zinc-300 mb-3" />
              <p className="text-sm font-black text-zinc-500 mb-1">Selecione um cliente</p>
              <p className="text-xs text-zinc-400">Escolha um cliente na lista para ver o histórico de agendamentos.</p>
            </div>
          ) : (
            <>
              {/* Client header */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white text-lg sm:text-xl font-black">
                  {selectedClient.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-black text-zinc-900">{selectedClient.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {selectedClient.phone && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Phone size={11} />
                        {selectedClient.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-bold text-zinc-400">{future} <span className="text-amber-600">próximos</span></span>
                    <span className="text-[10px] font-bold text-zinc-400">{past} <span className="text-zinc-500">realizados</span></span>
                  </div>
                </div>
                {onNewAppointment && (
                  <button
                    onClick={() => onNewAppointment(selectedClient)}
                    className="flex items-center gap-2 h-9 sm:h-10 px-3 sm:px-4 rounded-[10px] bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shrink-0"
                  >
                    <Calendar size={14} />
                    Novo Agendamento
                  </button>
                )}
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-full sm:w-auto self-start">
                {([
                  { key: "all", label: "Todos" },
                  { key: "future", label: "Próximos" },
                  { key: "past", label: "Histórico" },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider",
                      filter === key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Appointments list */}
              {clientAppointments.length === 0 ? (
                <div className="py-14 bg-white border border-zinc-200 border-dashed rounded-2xl text-center">
                  <Calendar size={24} className="text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-zinc-400">Nenhum agendamento encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {clientAppointments.map((appt, i) => {
                    const statusCfg = STATUS_MAP[appt.status] ?? STATUS_MAP.scheduled;
                    const date = new Date(appt.date);
                    const isPastAppt = isPast(date);
                    return (
                      <motion.div
                        key={appt.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => onAppointmentClick?.(appt)}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 bg-white border rounded-2xl p-3 sm:p-4 shadow-sm transition-all",
                          onAppointmentClick && "cursor-pointer hover:border-zinc-300",
                          isPastAppt ? "opacity-75" : "border-zinc-200"
                        )}
                      >
                        <div className={cn(
                          "flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl border shrink-0",
                          isPastAppt ? "bg-zinc-50 border-zinc-200" : "bg-amber-50 border-amber-200"
                        )}>
                          <p className={cn("text-base sm:text-lg font-black leading-none", isPastAppt ? "text-zinc-500" : "text-amber-600")}>
                            {format(date, "d")}
                          </p>
                          <p className={cn("text-[9px] font-bold uppercase", isPastAppt ? "text-zinc-400" : "text-amber-500")}>
                            {format(date, "MMM", { locale: ptBR })}
                          </p>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-zinc-900 truncate">
                              {appt.service?.name ?? "Serviço"}
                            </p>
                            <Badge color={statusCfg.color} size="sm" dot>{statusCfg.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {appt.startTime} – {appt.endTime}
                            </span>
                            {appt.professional?.name && (
                              <span className="flex items-center gap-1 truncate">
                                <Scissors size={10} />
                                {appt.professional.name}
                              </span>
                            )}
                          </div>
                          {appt.totalSessions > 1 && (
                            <p className="text-[9px] font-black text-amber-500 uppercase mt-0.5">
                              Pacote: sessão {appt.sessionNumber}/{appt.totalSessions}
                            </p>
                          )}
                        </div>

                        {onAppointmentClick && (
                          <ChevronRight size={16} className="text-zinc-300 shrink-0" />
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
