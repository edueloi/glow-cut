import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/App";
import {
  CalendarIcon, Scissors, Clock, LogOut,
  ChevronLeft, ChevronRight, UserCog, Check,
  LayoutDashboard, Users, FileText, TrendingUp,
  Phone, Plus, X, DollarSign, CheckCircle2,
  AlertCircle, ChevronDown, Search, Star,
  User, Bell, RefreshCw,
  Menu, Eye, EyeOff,
} from "lucide-react";
import {
  format, addDays, subDays, isToday, parseISO, isSameDay,
  startOfToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import logoFavicon from "@/src/images/system/logo-favicon.png";
import {
  Button, IconButton,
  Modal, ModalFooter,
  Input, Select, DatePicker,
  Badge,
  EmptyState,
  useToast, ToastProvider,
} from "@/src/components/ui";
import { apiFetch, getToken } from "@/src/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfData {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  photo: string | null;
  tenantId: string;
  permissions: string | Record<string, Record<string, boolean>> | null;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  client: { name: string; phone: string } | null;
  service: { name: string; price: number; duration: number } | null;
}

interface Comanda {
  id: string;
  clientName?: string;
  client?: { name: string };
  status: "open" | "paid";
  total: number;
  createdAt: string;
  items?: { name: string; price: number }[];
}

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  totalAppointments?: number;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parsePerms(raw: any): Record<string, Record<string, boolean>> {
  if (!raw) return {};
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    const result: Record<string, Record<string, boolean>> = {};
    for (const [mod, val] of Object.entries(p)) {
      if (typeof val === "boolean") result[mod] = { ver: val as boolean };
      else if (typeof val === "object" && val !== null)
        result[mod] = val as Record<string, boolean>;
    }
    return result;
  } catch {
    return {};
  }
}

function canDo(
  perms: Record<string, Record<string, boolean>>,
  mod: string,
  action = "ver"
) {
  return !!perms[mod]?.[action];
}

function statusBadgeColor(s: string): "success" | "danger" | "warning" {
  if (s === "confirmed") return "success";
  if (s === "cancelled") return "danger";
  return "warning";
}

const statusLabel = (s: string) => {
  if (s === "confirmed") return "Confirmado";
  if (s === "cancelled") return "Cancelado";
  return "Agendado";
};

function formatPhone(phone?: string) {
  if (!phone) return "";
  return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
}

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── SECTION: Dashboard ──────────────────────────────────────────────────────

function DashboardSection({
  prof,
  appointments,
  comandas,
  loadingAppts,
}: {
  prof: ProfData;
  appointments: Appointment[];
  comandas: Comanda[];
  loadingAppts: boolean;
}) {
  const todayAppts = appointments.filter(
    (a) => isToday(parseISO(a.date)) && a.status !== "cancelled"
  );
  const nextAppt = todayAppts
    .filter((a) => a.startTime >= format(new Date(), "HH:mm"))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  const openComandas = comandas.filter((c) => c.status === "open");
  const totalOpen = openComandas.reduce((acc, c) => acc + c.total, 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 text-white shadow-lg shadow-amber-500/20">
        <p className="text-xs sm:text-sm font-bold opacity-80">{greeting},</p>
        <h2 className="text-xl sm:text-2xl font-black mt-0.5 leading-tight">
          {prof.name.split(" ")[0]} 👋
        </h2>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-bold opacity-80">Online agora</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-[20px] border border-zinc-200 p-3 sm:p-4 shadow-sm">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em]">
            Hoje
          </p>
          {loadingAppts ? (
            <div className="h-7 w-8 bg-zinc-100 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className="text-2xl sm:text-3xl font-black text-zinc-900 mt-1">
              {todayAppts.length}
            </p>
          )}
          <p className="text-[10px] text-zinc-400 mt-0.5">agendamento(s)</p>
        </div>
        <div className="bg-white rounded-[20px] border border-zinc-200 p-3 sm:p-4 shadow-sm">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em]">
            Em Aberto
          </p>
          <p className="text-2xl sm:text-3xl font-black text-amber-500 mt-1">
            {openComandas.length}
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {formatMoney(totalOpen)}
          </p>
        </div>
      </div>

      {/* Próximo atendimento */}
      {nextAppt ? (
        <div className="bg-white rounded-[20px] sm:rounded-[24px] border border-zinc-200 p-4 sm:p-5 shadow-sm">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.15em] mb-3">
            Próximo Atendimento
          </p>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center shrink-0">
              <span className="text-sm sm:text-base font-black text-amber-600">
                {nextAppt.startTime}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-zinc-900 truncate">
                {nextAppt.client?.name || "Sem cliente"}
              </p>
              {nextAppt.service && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Scissors size={10} className="text-amber-500" />
                  <span className="text-xs text-zinc-500">
                    {nextAppt.service.name}
                  </span>
                </div>
              )}
            </div>
            <Badge color={statusBadgeColor(nextAppt.status)} size="sm">
              {statusLabel(nextAppt.status)}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-50 rounded-[20px] sm:rounded-[24px] border border-zinc-200 p-4 sm:p-5 flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-black text-zinc-700">Tudo livre por agora</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sem próximos atendimentos hoje
            </p>
          </div>
        </div>
      )}

      {/* Agenda do dia - mini */}
      {todayAppts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em] px-1">
            Agenda de Hoje
          </p>
          {todayAppts.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-[18px] border border-zinc-200 p-4 flex items-center gap-3"
            >
              <span className="text-xs font-black text-zinc-900 w-12 shrink-0">
                {a.startTime}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-zinc-800 truncate">
                  {a.client?.name || "Sem cliente"}
                </p>
                {a.service && (
                  <p className="text-[10px] text-zinc-400">{a.service.name}</p>
                )}
              </div>
              <Badge color={statusBadgeColor(a.status)} size="sm">
                {statusLabel(a.status)}
              </Badge>
            </div>
          ))}
          {todayAppts.length > 3 && (
            <p className="text-xs text-center text-zinc-400 font-bold">
              +{todayAppts.length - 3} mais
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: Agenda ─────────────────────────────────────────────────────────

function AgendaSection({
  prof,
  appointments,
  loading,
  selectedDate,
  setSelectedDate,
  view,
  setView,
  onRefresh,
  canSeeAll,
  canCreate,
}: {
  prof: ProfData;
  appointments: Appointment[];
  loading: boolean;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  view: "day" | "week";
  setView: (v: "day" | "week") => void;
  onRefresh: () => void;
  canSeeAll: boolean;
  canCreate?: boolean;
}) {
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [form, setForm] = useState({
    clientId: "",
    serviceId: "",
    date: format(selectedDate, "yyyy-MM-dd") as string | null,
    startTime: "09:00",
    duration: 60,
    notes: "",
    recurrence: "none" as "none" | "daily" | "weekly" | "monthly",
    sessions: 1,
  });

  const selectedService = services.find(s => s.id === form.serviceId);
  const endTime = (() => {
    try {
      const [h, m] = form.startTime.split(":").map(Number);
      const total = h * 60 + m + form.duration;
      return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    } catch { return "--:--"; }
  })();

  const fetchModalData = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        apiFetch("/api/clients"),
        apiFetch("/api/services"),
      ]);
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);
      setClients(Array.isArray(cData) ? cData : []);

      const sAll = Array.isArray(sData) ? sData : [];
      const sFiltered = sAll.filter(s => {
        try {
          const ids = typeof s.professionalIds === "string"
            ? JSON.parse(s.professionalIds || "[]")
            : (Array.isArray(s.professionalIds) ? s.professionalIds : []);
          return ids.includes(prof.id);
        } catch { return false; }
      });
      setServices(sFiltered);
    } catch {}
  };

  useEffect(() => {
    if (showModal) {
      fetchModalData();
      setForm(f => ({ ...f, date: format(selectedDate, "yyyy-MM-dd") as string | null }));
      setClientSearch("");
    }
  }, [showModal]);

  useEffect(() => {
    if (selectedService) setForm(f => ({ ...f, duration: selectedService.duration }));
  }, [form.serviceId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!form.serviceId) {
      toast.error("Selecione um serviço");
      return;
    }
    if (!form.date) {
      toast.error("Selecione uma data");
      return;
    }
    setModalLoading(true);
    try {
      const res = await apiFetch("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          clientId: form.clientId,
          serviceId: form.serviceId,
          date: form.date,
          startTime: form.startTime,
          duration: form.duration,
          notes: form.notes,
          recurrence: form.recurrence,
          sessions: form.sessions,
          professionalId: prof.id,
          status: "confirmed",
        }),
      });
      if (res.ok) {
        toast.success("Agendamento criado com sucesso!");
        setShowModal(false);
        onRefresh();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao agendar");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setModalLoading(false);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(view === "week" ? selectedDate : selectedDate, i)
  );

  const displayApps = appointments
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white border border-zinc-200 p-1 rounded-2xl shadow-sm flex-1">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider cursor-pointer",
                view === v
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              {v === "day" ? "Dia" : "Semana"}
            </button>
          ))}
        </div>

        {canCreate && (
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={15} />}
            onClick={() => {
              setForm(f => ({ ...f, date: format(selectedDate, "yyyy-MM-dd") }));
              setShowModal(true);
            }}
            className="h-11 px-4 rounded-2xl text-[10px] uppercase tracking-wider"
          >
            Agendar
          </Button>
        )}

        <IconButton
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="w-11 h-11 rounded-2xl"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </IconButton>
      </div>

      {/* Date navigation */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-1 flex items-center gap-1">
        <button
          onClick={() =>
            setSelectedDate(
              view === "day"
                ? subDays(selectedDate, 1)
                : subDays(selectedDate, 7)
            )
          }
          className="p-2.5 hover:bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-800 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs font-black text-zinc-900 capitalize">
            {view === "day"
              ? format(selectedDate, "EEEE, d 'de' MMM", { locale: ptBR })
              : `${format(selectedDate, "d MMM", { locale: ptBR })} – ${format(
                  addDays(selectedDate, 6),
                  "d MMM",
                  { locale: ptBR }
                )}`}
          </p>
          {isToday(selectedDate) && view === "day" && (
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">
              Hoje
            </span>
          )}
        </div>
        <button
          onClick={() =>
            setSelectedDate(
              view === "day"
                ? addDays(selectedDate, 1)
                : addDays(selectedDate, 7)
            )
          }
          className="p-2.5 hover:bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-800 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Today button */}
      {!isToday(selectedDate) && (
        <Button
          variant="outline"
          size="sm"
          fullWidth
          onClick={() => setSelectedDate(new Date())}
          className="rounded-xl text-[10px] uppercase tracking-wider"
        >
          Voltar para Hoje
        </Button>
      )}

      {/* Week strip */}
      {view === "week" && (
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {weekDays.map((day) => {
            const dayApps = appointments.filter(
              (a) => isSameDay(parseISO(a.date), day) && a.status !== "cancelled"
            );
            const selected = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setSelectedDate(day);
                  setView("day");
                }}
                className={cn(
                  "flex flex-col items-center p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer",
                  selected
                    ? "bg-amber-500 border-amber-500"
                    : "bg-white border-zinc-200",
                  isToday(day) && !selected && "ring-1 ring-amber-400/50"
                )}
              >
                <span
                  className={cn(
                    "text-[7px] sm:text-[8px] font-black uppercase tracking-wider",
                    selected ? "text-white/70" : "text-zinc-400"
                  )}
                >
                  {format(day, "EEE", { locale: ptBR }).replace(".", "")}
                </span>
                <span
                  className={cn(
                    "text-sm sm:text-base font-black leading-none mt-0.5",
                    selected
                      ? "text-white"
                      : isToday(day)
                      ? "text-amber-500"
                      : "text-zinc-800"
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayApps.length > 0 && (
                  <span
                    className={cn(
                      "text-[7px] sm:text-[8px] font-black mt-1 rounded-full px-1",
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-amber-100 text-amber-600"
                    )}
                  >
                    {dayApps.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.12em]">
          {view === "day" ? "Agendamentos" : "Semana"}
        </p>
        <span className="text-[10px] font-bold text-zinc-400 bg-white border border-zinc-200 px-3 py-1 rounded-xl">
          {displayApps.length} ativo(s)
        </span>
      </div>

      {/* Appointments */}
      {loading ? (
        <Spinner />
      ) : displayApps.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="Nenhum agendamento"
          description={
            view === "day"
              ? "Você está livre neste dia"
              : "Nenhum agendamento esta semana"
          }
        />
      ) : (
        <AnimatePresence mode="wait">
          <div className="space-y-3">
            {displayApps.map((app, idx) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white rounded-[20px] sm:rounded-[24px] border border-zinc-200 p-3 sm:p-4 flex items-center gap-3 sm:gap-4 active:scale-[0.98] transition-transform"
              >
                {/* Time */}
                <div className="flex flex-col items-center min-w-[48px] sm:min-w-[52px] bg-zinc-50 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border border-zinc-100">
                  <p className="text-xs sm:text-sm font-black text-zinc-900">
                    {app.startTime}
                  </p>
                  <p className="text-[8px] sm:text-[9px] text-zinc-400 font-bold">
                    {app.endTime}
                  </p>
                  {view === "week" && (
                    <p className="text-[7px] sm:text-[8px] text-amber-500 font-bold mt-0.5">
                      {format(parseISO(app.date), "dd/MM")}
                    </p>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-900 truncate">
                    {app.client?.name || "Sem cliente"}
                  </p>
                  {app.client?.phone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone size={9} className="text-zinc-300" />
                      <span className="text-[10px] text-zinc-400">
                        {formatPhone(app.client.phone)}
                      </span>
                    </div>
                  )}
                  {app.service && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <Scissors size={10} className="text-amber-500" />
                      <span className="text-xs text-zinc-500">
                        {app.service.name}
                      </span>
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-lg">
                        {formatMoney(app.service.price)}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                        <Clock size={9} />
                        {app.service.duration} min
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <Badge color={statusBadgeColor(app.status)} size="sm">
                  {statusLabel(app.status)}
                </Badge>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* ── Appointment Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Agendamento"
        size="lg"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={modalLoading}
              onClick={() => {
                const f = document.getElementById("appt-form") as HTMLFormElement;
                f?.requestSubmit();
              }}
              className="flex-1"
            >
              Confirmar Agendamento
            </Button>
          </ModalFooter>
        }
      >
        <form id="appt-form" onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* ── Coluna esquerda ── */}
            <div className="space-y-4">
              {/* Cliente — busca + dropdown */}
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={e => {
                      setClientSearch(e.target.value);
                      setForm(f => ({ ...f, clientId: "" }));
                    }}
                    iconLeft={<Search size={14} />}
                    iconRight={clientSearch ? (
                      <button type="button" onClick={() => { setClientSearch(""); setForm(f => ({ ...f, clientId: "" })); }}>
                        <X size={13} className="text-zinc-400 hover:text-zinc-600" />
                      </button>
                    ) : undefined}
                  />
                  {clientSearch && !form.clientId && filteredClients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-2xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                      {filteredClients.slice(0, 8).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, clientId: c.id }));
                            setClientSearch(c.name);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xs shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-800 truncate">{c.name}</p>
                            {c.phone && <p className="text-[10px] text-zinc-400">{formatPhone(c.phone)}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {clientSearch && !form.clientId && filteredClients.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-2xl shadow-lg z-20 px-4 py-3">
                      <p className="text-xs text-zinc-400">Nenhum cliente encontrado</p>
                    </div>
                  )}
                </div>
                {form.clientId && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    <Check size={11} /> Cliente selecionado
                  </p>
                )}
              </div>

              {/* Serviço */}
              <Select
                label="Serviço"
                required
                value={form.serviceId}
                onChange={e => setForm(f => ({ ...f, serviceId: e.target.value }))}
                options={[
                  { value: "", label: "Selecione um serviço..." },
                  ...services.map(s => ({ value: s.id, label: `${s.name} — ${formatMoney(s.price)}` })),
                ]}
              />

              {/* Observações */}
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                  Observações
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Preferências, anotações..."
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-2xl bg-white text-zinc-900 placeholder-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                />
              </div>
            </div>

            {/* ── Coluna direita ── */}
            <div className="space-y-4">
              {/* Data */}
              <DatePicker
                label="Data"
                value={form.date}
                onChange={v => setForm(f => ({ ...f, date: v }))}
              />

              {/* Hora */}
              <Input
                label="Horário de início"
                type="text"
                placeholder="HH:MM"
                value={form.startTime}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g, "");
                  if (v.length > 4) v = v.slice(0, 4);
                  if (v.length > 2) v = `${v.slice(0, 2)}:${v.slice(2)}`;
                  setForm(f => ({ ...f, startTime: v }));
                }}
                iconLeft={<Clock size={14} className="text-zinc-400" />}
              />

              {/* Duração */}
              <Input
                label="Duração (minutos)"
                type="number"
                min={5}
                max={480}
                value={String(form.duration)}
                onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 60 }))}
              />

              {/* Término previsto — display only */}
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">
                  Término Previsto
                </label>
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2.5">
                  <Clock size={14} className="text-amber-500 shrink-0" />
                  <span className="text-sm font-black text-zinc-900">{endTime}</span>
                  {selectedService && (
                    <span className="text-[10px] text-zinc-400 ml-auto">{form.duration} min</span>
                  )}
                </div>
              </div>

              {/* Recorrência */}
              <div className="pt-1 border-t border-zinc-100 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3.5 bg-amber-400 rounded-full" />
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recorrência</h4>
                </div>

                <Select
                  label="Tipo"
                  value={form.recurrence}
                  onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as any }))}
                  options={[
                    { value: "none", label: "Não repetir" },
                    { value: "daily", label: "Diário" },
                    { value: "weekly", label: "Semanal" },
                    { value: "monthly", label: "Mensal" },
                  ]}
                />

                {form.recurrence !== "none" && (
                  <Input
                    label="Número de sessões"
                    type="number"
                    min={2}
                    max={52}
                    value={String(form.sessions)}
                    onChange={e => setForm(f => ({ ...f, sessions: parseInt(e.target.value) || 2 }))}
                  />
                )}
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── SECTION: Comandas ───────────────────────────────────────────────────────

function ComandasSection({
  prof,
  canCreate,
}: {
  prof: ProfData;
  canCreate: boolean;
}) {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "paid">("open");

  const fetchComandas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/comandas?professionalId=${prof.id}`);
      const data = await res.json();
      setComandas(Array.isArray(data) ? data : []);
    } catch {
      setComandas([]);
    } finally {
      setLoading(false);
    }
  }, [prof.tenantId]);

  useEffect(() => {
    fetchComandas();
  }, [fetchComandas]);

  const filtered = comandas.filter((c) =>
    filter === "all" ? true : c.status === filter
  );
  const openTotal = comandas
    .filter((c) => c.status === "open")
    .reduce((a, c) => a + c.total, 0);
  const paidTotal = comandas
    .filter((c) => c.status === "paid")
    .reduce((a, c) => a + c.total, 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-4">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">
            Em Aberto
          </p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {comandas.filter((c) => c.status === "open").length}
          </p>
          <p className="text-[10px] text-amber-500 font-bold">
            {formatMoney(openTotal)}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-[20px] p-4">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">
            Recebido
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {comandas.filter((c) => c.status === "paid").length}
          </p>
          <p className="text-[10px] text-emerald-500 font-bold">
            {formatMoney(paidTotal)}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-2xl">
        {(
          [
            { k: "open", label: "Abertas" },
            { k: "paid", label: "Pagas" },
            { k: "all", label: "Todas" },
          ] as const
        ).map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn(
              "flex-1 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider",
              filter === k
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma comanda"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-white rounded-[22px] border border-zinc-200 p-4 flex items-center gap-4"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  c.status === "open"
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-emerald-50 border border-emerald-200"
                )}
              >
                {c.status === "open" ? (
                  <DollarSign size={16} className="text-amber-500" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-zinc-900 truncate">
                  {c.client?.name || c.clientName || "Sem cliente"}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {format(new Date(c.createdAt), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-zinc-900">
                  {formatMoney(c.total)}
                </p>
                <Badge
                  color={c.status === "open" ? "warning" : "success"}
                  size="sm"
                >
                  {c.status === "open" ? "Aberta" : "Paga"}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: Clientes ───────────────────────────────────────────────────────

function ClientesSection({
  prof,
  canCreate,
}: {
  prof: ProfData;
  canCreate?: boolean;
}) {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [prof.tenantId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/clients", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Cliente cadastrado com sucesso!");
        setShowCreate(false);
        setForm({ name: "", phone: "", email: "" });
        fetchClients();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao criar cliente");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<Search size={15} />}
          iconRight={search ? (
            <button onClick={() => setSearch("")}>
              <X size={14} className="text-zinc-400 hover:text-zinc-600" />
            </button>
          ) : undefined}
          wrapperClassName="flex-1"
        />
        {canCreate && (
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={16} />}
            onClick={() => setShowCreate(true)}
            className="h-[44px] px-4 rounded-2xl shrink-0"
          >
            <span className="hidden sm:inline">Novo</span>
          </Button>
        )}
      </div>

      {/* Create Client Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Novo Cliente"
        size="sm"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              loading={saving}
              onClick={() => {
                const form = document.getElementById("client-form") as HTMLFormElement;
                form?.requestSubmit();
              }}
              className="flex-1"
            >
              Cadastrar Cliente
            </Button>
          </ModalFooter>
        }
      >
        <form id="client-form" onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome Completo"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do cliente"
          />

          <Input
            label="Telefone"
            type="text"
            value={form.phone}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, "");
              if (v.length > 11) v = v.slice(0, 11);
              if (v.length > 10) {
                v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
              } else if (v.length > 6) {
                v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
              } else if (v.length > 2) {
                v = v.replace(/^(\d{2})(\d{0,4}).*/, "($1) $2");
              } else if (v.length > 0) {
                v = v.replace(/^(\d{0,2}).*/, "($1");
              }
              setForm({ ...form, phone: v });
            }}
            placeholder="(00) 00000-0000"
          />

          <Input
            label="E-mail (Opcional)"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="cliente@email.com"
          />
        </form>
      </Modal>

      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.12em] px-1">
        {filtered.length} cliente(s)
      </p>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Nenhum cliente encontrado" : "Sem clientes"}
          description={search ? undefined : "Cadastre o primeiro cliente"}
          action={canCreate && !search ? (
            <Button variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowCreate(true)}>
              Novo Cliente
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              className="bg-white rounded-[20px] border border-zinc-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-zinc-900 truncate">
                  {c.name}
                </p>
                {c.phone && (
                  <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Phone size={9} />
                    {formatPhone(c.phone)}
                  </p>
                )}
              </div>
              {c.totalAppointments != null && (
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-zinc-900">
                    {c.totalAppointments}
                  </p>
                  <p className="text-[9px] text-zinc-400">visitas</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: Serviços ───────────────────────────────────────────────────────

function ServicesSection({ prof }: { prof: ProfData }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    if (!prof?.id || !prof?.tenantId) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/services");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const all = Array.isArray(data) ? data : [];
      const filtered = all.filter(s => {
        try {
          const rawIds = s.professionalIds;
          const ids = typeof rawIds === "string"
            ? JSON.parse(rawIds || "[]")
            : (Array.isArray(rawIds) ? rawIds : []);
          return ids.includes(prof.id);
        } catch {
          return false;
        }
      });
      setServices(filtered);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [prof?.tenantId, prof?.id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.12em]">
          {services.length} serviço(s)
        </p>
        <IconButton
          onClick={fetchServices}
          variant="ghost"
          size="sm"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </IconButton>
      </div>

      {loading ? (
        <Spinner />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Nenhum serviço vinculado"
          description="Você ainda não foi associado a nenhum serviço pelo administrador."
        />
      ) : (
        <div className="space-y-2.5">
          {services.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.4) }}
              className="bg-white rounded-[20px] border border-zinc-200 p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Scissors size={16} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-zinc-900 truncate">
                  {s.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                    <Clock size={9} /> {s.duration} min
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-zinc-900">
                  {formatMoney(s.price)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SECTION: Perfil ──────────────────────────────────────────────────────────

function ProfileSection({ prof, onUpdate }: { prof: ProfData; onUpdate: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [editPassword, setEditPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [form, setForm] = useState({
    name: prof.name || "",
    email: prof.email || "",
    phone: prof.phone ? formatPhone(prof.phone) : "",
    photo: prof.photo || "",
    currentPassword: "",
    password: "",
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,4}).*/, "($1) $2");
    } else if (v.length > 0) {
      v = v.replace(/^(\d{0,2}).*/, "($1");
    }
    setForm({ ...form, phone: v });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`/api/professionals/${prof.id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Perfil atualizado com sucesso!");
        onUpdate();
      } else {
        const d = await res.json();
        toast.error(d.error || "Erro ao atualizar");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-[32px] border border-zinc-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-black shadow-lg overflow-hidden border-4 border-white">
              {form.photo ? (
                <img src={form.photo} alt={form.name} className="w-full h-full object-cover" />
              ) : (
                form.name.charAt(0).toUpperCase()
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-zinc-200 rounded-full flex items-center justify-center shadow-md cursor-pointer hover:bg-zinc-50 transition-colors">
              <Plus size={16} className="text-zinc-600" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const token = getToken();
                    const res = await fetch("/api/admin/upload", { method: "POST", body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} });
                    const data = await res.json();
                    if (data.url) setForm({ ...form, photo: data.url });
                  } catch { toast.error("Erro no upload da foto"); }
                }}
              />
            </label>
          </div>
          <h3 className="text-lg font-black text-zinc-900 mt-4">{form.name}</h3>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{prof.role || "Profissional"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome Completo"
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="E-mail (Não editável)"
              type="email"
              value={form.email}
              readOnly
              disabled
            />
          </div>

          <Input
            label="Telefone / WhatsApp"
            type="text"
            value={form.phone}
            onChange={handlePhoneChange}
            placeholder="(00) 00000-0000"
          />

          <div className="pt-2">
            {!editPassword ? (
              <button
                type="button"
                onClick={() => setEditPassword(true)}
                className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1.5 hover:text-amber-700 transition-colors"
              >
                <RefreshCw size={12} /> Alterar minha senha
              </button>
            ) : (
              <div className="space-y-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-wider">Alterar Senha</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setEditPassword(false);
                      setForm({ ...form, password: "", currentPassword: "" });
                    }}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Senha Atual"
                    type={showCurrentPassword ? "text" : "password"}
                    value={form.currentPassword}
                    onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    required={editPassword}
                    iconRight={
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                  <Input
                    label="Nova Senha"
                    type={showNewPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    required={editPassword}
                    iconRight={
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-zinc-400 hover:text-zinc-600"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            className="mt-4"
          >
            Salvar Alterações
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

function ProfessionalDashboardInner() {
  const { user: authUser, logout, refreshUser } = useAuth();
  const [prof, setProf] = useState<ProfData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [comandasForDash, setComandasForDash] = useState<Comanda[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("day");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (authUser) {
      setProf(authUser as any);
    }
  }, [authUser]);

  const perms = prof ? parsePerms(prof.permissions) : {};
  const canSeeDashboard = canDo(perms, "dashboard");
  const canSeeAgenda = canDo(perms, "agenda");
  const canSeeComandas = canDo(perms, "comandas");
  const canSeeClients = canDo(perms, "clients");
  const canSeeServices = canDo(perms, "services");
  const canCreateClients = canDo(perms, "clients", "criar");
  const canCreateAgenda = canDo(perms, "agenda", "criar");
  const canSeeAllAgenda =
    canDo(perms, "agenda", "ver_todos") ||
    canDo(perms, "agenda", "editar_todos");
  const canCreateComandas = canDo(perms, "comandas", "criar");

  const tabs = [
    { id: "dashboard", label: "Início", icon: LayoutDashboard, always: true },
    { id: "agenda", label: "Agenda", icon: CalendarIcon, perm: canSeeAgenda },
    { id: "comandas", label: "Comandas", icon: FileText, perm: canSeeComandas },
    { id: "clientes", label: "Clientes", icon: Users, perm: canSeeClients },
    { id: "servicos", label: "Serviços", icon: Scissors, perm: canSeeServices },
    { id: "perfil", label: "Meu Perfil", icon: User, always: true },
  ].filter((t) => t.always || t.perm);

  useEffect(() => {
    if (!prof) return;
    if (tabs.length > 0 && !tabs.find((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [prof]);

  const fetchAppointments = useCallback(async () => {
    if (!prof?.tenantId) return;
    setLoading(true);
    let start: Date, end: Date;
    if (view === "day") {
      start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      end = addDays(start, 6);
      end.setHours(23, 59, 59, 999);
    }
    try {
      const res = await apiFetch(
        `/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}&professionalId=${prof.id}`
      );
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [prof, selectedDate, view]);

  useEffect(() => {
    if (prof && canSeeAgenda) fetchAppointments();
  }, [prof, selectedDate, view, canSeeAgenda]);

  const fetchTodayAppointments = useCallback(async () => {
    if (!prof?.tenantId) return;
    const start = startOfToday();
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    try {
      const res = await apiFetch(
        `/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}&professionalId=${prof.id}`
      );
      const data = await res.json();
      if (Array.isArray(data)) setAppointments(data);
    } catch {}
  }, [prof]);

  useEffect(() => {
    if (!prof?.tenantId || !canSeeComandas) return;
    apiFetch(`/api/comandas?professionalId=${prof.id}`)
      .then((r) => r.json())
      .then((d) => setComandasForDash(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [prof, canSeeComandas]);

  useEffect(() => {
    if (activeTab === "dashboard" && prof) {
      fetchTodayAppointments();
    }
  }, [activeTab, prof]);

  const handleLogout = logout;

  if (!prof) return null;

  const todayCount = appointments.filter(
    (a) => isToday(parseISO(a.date)) && a.status !== "cancelled"
  ).length;

  const PageContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18 }}
      >
        {activeTab === "dashboard" && (
          <DashboardSection
            prof={prof}
            appointments={appointments}
            comandas={comandasForDash}
            loadingAppts={loading}
          />
        )}

        {activeTab === "agenda" &&
          (canSeeAgenda ? (
            <AgendaSection
              prof={prof}
              appointments={appointments}
              loading={loading}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              view={view}
              setView={setView}
              onRefresh={fetchAppointments}
              canSeeAll={canSeeAllAgenda}
              canCreate={canCreateAgenda}
            />
          ) : (
            <div className="py-24 flex flex-col items-center justify-center text-zinc-400">
              <UserCog size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-bold text-zinc-500">Sem acesso à agenda</p>
              <p className="text-xs mt-1 text-zinc-400">Solicite ao administrador.</p>
            </div>
          ))}

        {activeTab === "comandas" && (
          <ComandasSection prof={prof} canCreate={canCreateComandas} />
        )}

        {activeTab === "clientes" && <ClientesSection prof={prof} canCreate={canCreateClients} />}

        {activeTab === "servicos" && <ServicesSection prof={prof} />}

        {activeTab === "perfil" && (
          <ProfileSection
            prof={prof}
            onUpdate={async () => {
              await refreshUser();
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex">

      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR — visível apenas em telas ≥ lg (1024px)
          ═══════════════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 bg-white border-r border-zinc-200 fixed inset-y-0 left-0 z-50 shadow-sm">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-white border border-zinc-200 rounded-xl flex items-center justify-center shadow-sm overflow-hidden p-1.5 shrink-0">
            <img
              src={logoFavicon}
              alt="Agendelle"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-black text-zinc-900 tracking-tight leading-none">
              Agendelle
            </h1>
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.15em] mt-0.5 leading-none">
              Portal Profissional
            </p>
          </div>
        </div>

        {/* Profile card */}
        <div className="px-4 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3 bg-zinc-50 rounded-2xl p-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-base shrink-0 overflow-hidden shadow-inner">
              {prof.photo ? (
                <img src={prof.photo} alt={prof.name} className="w-full h-full object-cover" />
              ) : (
                prof.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-zinc-900 truncate">{prof.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-zinc-400">Online</span>
              </div>
            </div>
            {canSeeAgenda && (
              <div className="shrink-0 text-right">
                <p className="text-base font-black text-amber-500">{todayCount}</p>
                <p className="text-[8px] text-zinc-400 font-bold">hoje</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all cursor-pointer",
                  active
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-xs font-black">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-zinc-100 pt-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer"
          >
            <LogOut size={17} />
            <span className="text-xs font-black">Sair</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          ÁREA PRINCIPAL
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-60 xl:ml-64">

        {/* ── Header mobile/tablet (hidden on lg+) ───────────────────────── */}
        <header className="lg:hidden bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white border border-zinc-200 rounded-xl flex items-center justify-center shadow-sm overflow-hidden p-1.5">
              <img
                src={logoFavicon}
                alt="Agendelle"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-sm font-black text-zinc-900 tracking-tight leading-none">Agendelle</h1>
              <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.15em] mt-0.5 leading-none">Portal Profissional</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {canSeeAgenda && (
              <div className="hidden sm:block bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                <span className="text-[10px] font-black text-amber-600">{todayCount} hoje</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-xs shrink-0 overflow-hidden shadow-inner">
                {prof.photo ? (
                  <img src={prof.photo} alt={prof.name} className="w-full h-full object-cover" />
                ) : (
                  prof.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="hidden sm:block text-xs font-black text-zinc-800 max-w-[100px] truncate">
                {prof.name.split(" ")[0]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-all"
              title="Sair"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* ── Header desktop (only title bar on lg+) ─────────────────────── */}
        <header className="hidden lg:flex bg-white border-b border-zinc-200 px-6 py-3.5 items-center justify-between shadow-sm sticky top-0 z-30">
          <div>
            <h2 className="text-sm font-black text-zinc-900 capitalize">
              {tabs.find((t) => t.id === activeTab)?.label ?? "Dashboard"}
            </h2>
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-[0.12em] mt-0.5">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-500">Online</span>
            </div>
            {canSeeAgenda && (
              <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-black text-amber-600">{todayCount} agendamento(s) hoje</span>
              </div>
            )}
          </div>
        </header>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-5 pb-28 lg:pb-8 w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto lg:mx-0 lg:w-full">
          {PageContent}
        </main>

        {/* ── Bottom Nav — mobile/tablet only (hidden on lg+) ─────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]">
          <div className={cn(
            "grid h-20 items-center px-2",
            tabs.length > 4 ? "grid-cols-5" : `grid-cols-${tabs.length}`
          )}>
            {tabs.slice(0, tabs.length > 4 ? 4 : tabs.length).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center justify-center gap-1 transition-all relative"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      active ? "bg-amber-100 text-amber-600 scale-110" : "text-zinc-400"
                    )}
                  >
                    <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider",
                      active ? "text-amber-600" : "text-zinc-400"
                    )}
                  >
                    {tab.label}
                  </span>
                  {active && (
                    <motion.div
                      layoutId="bottom-nav-indicator"
                      className="absolute -top-1 w-8 h-1 bg-amber-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}

            {tabs.length > 4 && (
              <button
                onClick={() => setShowMenu(true)}
                className="flex flex-col items-center justify-center gap-1 transition-all relative"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400">
                  <Menu size={20} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  Menu
                </span>
              </button>
            )}
          </div>
        </nav>

        {/* ── Mobile Menu Overlay ────────────────────────────────────────── */}
        <AnimatePresence>
          {showMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMenu(false)}
                className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[60] lg:hidden"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[70] lg:hidden p-8 pb-12 shadow-2xl overflow-hidden"
              >
                <div className="w-12 h-1.5 bg-zinc-100 rounded-full mx-auto mb-8" />

                <div className="grid grid-cols-3 gap-6">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowMenu(false);
                        }}
                        className="flex flex-col items-center gap-3 group"
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-[22px] flex items-center justify-center transition-all duration-300 shadow-sm border",
                          active
                            ? "bg-amber-500 text-white border-amber-500 shadow-amber-500/20 scale-110"
                            : "bg-white text-zinc-400 border-zinc-100 group-active:scale-95"
                        )}>
                          <Icon size={24} />
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest text-center",
                          active ? "text-zinc-900" : "text-zinc-500"
                        )}>
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => { handleLogout(); setShowMenu(false); }}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="w-14 h-14 rounded-[22px] bg-red-50 text-red-500 border border-red-100 flex items-center justify-center shadow-sm group-active:scale-95 transition-all">
                      <LogOut size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-500 text-center">
                      Sair
                    </span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ProfessionalDashboard() {
  return (
    <ToastProvider>
      <ProfessionalDashboardInner />
    </ToastProvider>
  );
}
