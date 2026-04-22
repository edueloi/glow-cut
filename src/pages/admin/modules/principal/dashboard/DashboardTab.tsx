import React, { useState, useMemo, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  DollarSign, CalendarIcon, UserPlus, TrendingUp, Cake,
  Eye, EyeOff, Plus, Receipt, Users, BarChart2, Scissors,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Zap, Trophy, Star, Activity,
  Lock, Bell, Check, Loader2, Shield, AlertTriangle
} from "lucide-react";

import { cn } from "@/src/lib/utils";
import { calculateAge, parseBirthDateParts } from "@/src/lib/masks";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "@/src/lib/api";
import { Badge } from "@/src/components/ui/Badge";
import { parseISO, differenceInDays } from "date-fns";
import { Modal, ConfirmModal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";


interface DashboardTabProps {
  revenueData: any[];
  servicesData: any[];
  appointments: any[];
  comandas: any[];
  clients: any[];
  handleTabChange: (tab: "dash" | "agenda" | "minha-agenda" | "services" | "clients" | "comandas" | "fluxo" | "settings" | "professionals" | "horarios" | "profile") => void;
  setIsAppointmentModalOpen?: (v: boolean) => void;
  setIsComandaModalOpen?: (v: boolean) => void;
  setIsClientModalOpen?: (v: boolean) => void;
  onAppointmentConfirmed?: () => void;
  pendingAppointments?: any[];
}

const QUICK_ACTIONS = [
  { label: "Novo Agendamento", sublabel: "Marcar horário", icon: CalendarIcon, color: "amber", bg: "bg-amber-50 border-amber-200 hover:bg-amber-100", iconBg: "bg-amber-500", action: "appointment" },
  { label: "Nova Comanda", sublabel: "Abrir conta", icon: Receipt, color: "emerald", bg: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100", iconBg: "bg-emerald-500", action: "comanda" },
  { label: "Novo Cliente", sublabel: "Cadastrar", icon: UserPlus, color: "blue", bg: "bg-blue-50 border-blue-200 hover:bg-blue-100", iconBg: "bg-blue-500", action: "client" },
  { label: "Fluxo de Caixa", sublabel: "Ver relatório", icon: BarChart2, color: "violet", bg: "bg-violet-50 border-violet-200 hover:bg-violet-100", iconBg: "bg-violet-500", action: "fluxo" },
];

const PROF_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

type StatPeriod = "today" | "week" | "month";

function StatCard({ title, value, icon: Icon, description, hidden, accent = "amber" }: {
  title: string; value: string; icon: any; description?: string; hidden?: boolean; accent?: "emerald" | "red" | "amber";
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{title}</p>
          <p className={cn("text-xl sm:text-2xl font-black text-zinc-900 mt-1.5 transition-all", hidden && "blur-sm select-none")}>
            {hidden ? "••••" : value}
          </p>
        </div>
        <div className={cn(
          "w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0",
          accent === "emerald" ? "bg-emerald-50 border-emerald-100 text-emerald-500" :
          accent === "red" ? "bg-red-50 border-red-100 text-red-500" :
          "bg-amber-50 border-amber-100 text-amber-500"
        )}>
          <Icon size={18} />
        </div>
      </div>
      {description && (
        <p className="mt-2 text-[10px] text-zinc-400 font-medium">{description}</p>
      )}
    </div>
  );
}

export function DashboardTab({
  revenueData, servicesData, appointments, comandas, clients, handleTabChange,
  setIsAppointmentModalOpen, setIsComandaModalOpen, setIsClientModalOpen, onAppointmentConfirmed,
  pendingAppointments = []
}: DashboardTabProps) {
  const [showFinancials, setShowFinancials] = useState(true);
  const [statPeriod, setStatPeriod] = useState<StatPeriod>("today");
  const [profReport, setProfReport] = useState<any[]>([]);
  const [profitability, setProfitability] = useState<any>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [isConfirmationsModalOpen, setIsConfirmationsModalOpen] = useState(false);
  const [recurringToConfirm, setRecurringToConfirm] = useState<any | null>(null);

  const currentMonthNum = new Date().getMonth() + 1;
  const todayDay = new Date().getDate();

  // Carrega relatório de profissionais do mês atual
  useEffect(() => {
    const from = startOfMonth(new Date());
    const to = endOfMonth(new Date());
    apiFetch(`/api/reports/professionals?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then(r => r.json())
      .then(d => setProfReport(Array.isArray(d) ? d : []))
      .catch(() => setProfReport([]));
  }, []);

  // Carrega lucratividade baseado no período selecionado
  useEffect(() => {
    const { from, to } = (() => {
      const now = new Date();
      if (statPeriod === "today") {
        const s = new Date(now); s.setHours(0,0,0,0);
        const e = new Date(now); e.setHours(23,59,59,999);
        return { from: s, to: e };
      } else if (statPeriod === "week") {
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      } else {
        return { from: startOfMonth(now), to: endOfMonth(now) };
      }
    })();
    
    apiFetch(`/api/reports/profitability?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setProfitability(d && typeof d.netProfit === 'number' ? d : null))
      .catch(() => setProfitability(null));
  }, [statPeriod]);

  const birthdayClients = clients.filter(c => {
    if (!c.birthDate) return false;
    const parts = parseBirthDateParts(c.birthDate);
    if (!parts) return false;
    return parts.month === currentMonthNum;
  }).sort((a, b) => {
    const left = parseBirthDateParts(a.birthDate);
    const right = parseBirthDateParts(b.birthDate);
    return (left?.day || 0) - (right?.day || 0);
  });

  const birthdayToday = birthdayClients.filter(c => parseBirthDateParts(c.birthDate)?.day === todayDay);

  const monthName = format(new Date(), "MMMM", { locale: ptBR });
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const handleQuickAction = (action: string) => {
    if (action === "appointment") { setIsAppointmentModalOpen?.(true); handleTabChange("agenda"); }
    else if (action === "comanda") { setIsComandaModalOpen?.(true); handleTabChange("comandas"); }
    else if (action === "client") { setIsClientModalOpen?.(true); handleTabChange("clients"); }
    else if (action === "fluxo") handleTabChange("fluxo");
  };

  // Calcula métricas baseado no período selecionado
  const stats = useMemo(() => {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;
    let periodLabel = "";

    if (statPeriod === "today") {
      fromDate = new Date(now); fromDate.setHours(0,0,0,0);
      toDate = new Date(now); toDate.setHours(23,59,59,999);
      periodLabel = "hoje";
    } else if (statPeriod === "week") {
      fromDate = startOfWeek(now, { weekStartsOn: 1 });
      toDate = endOfWeek(now, { weekStartsOn: 1 });
      periodLabel = "esta semana";
    } else {
      fromDate = startOfMonth(now);
      toDate = endOfMonth(now);
      periodLabel = "este mês";
    }

    const periodComandas = comandas.filter(c => {
      const dt = new Date(c.createdAt);
      return dt >= fromDate && dt <= toDate;
    });

    const periodAppts = appointments.filter(a => {
      const dt = new Date(a.date);
      return dt >= fromDate && dt <= toDate;
    });

    const paidComandas = periodComandas.filter(c => c.status === "paid");
    const revenue = paidComandas.reduce((s, c) => s + (c.total || 0), 0);
    const avgTicket = paidComandas.length > 0 ? revenue / paidComandas.length : 0;

    const newClients = clients.filter(c => {
      const dt = new Date(c.createdAt);
      return dt >= fromDate && dt <= toDate;
    });

    return { revenue, avgTicket, apptCount: periodAppts.length, newClientsCount: newClients.length, periodLabel, paidCount: paidComandas.length };
  }, [statPeriod, comandas, appointments, clients]);

  const topProfessional = profReport[0] || null;

  // Agendamentos do dia com status "scheduled" (pendentes de confirmação)
  const today = new Date().toISOString().slice(0, 10);

  const handleConfirm = useCallback(async (apptId: string, confirmAll = false) => {
    const appt = appointments.find(a => a.id === apptId);
    
    // Se for recorrente e ainda não estamos no fluxo de confirmar tudo, perguntar
    if (!confirmAll && appt?.repeatGroupId && !confirmedIds.has(apptId)) {
      setRecurringToConfirm(appt);
      return;
    }

    setConfirmingId(apptId);
    try {
      await apiFetch(`/api/appointments/${apptId}`, {
        method: "PATCH",
        body: JSON.stringify({ 
          status: "confirmed",
          confirmAllRecurrences: confirmAll
        }),
      });

      if (confirmAll && appt?.repeatGroupId) {
        const groupIds = appointments
          .filter(a => a.repeatGroupId === appt.repeatGroupId)
          .map(a => a.id);
        setConfirmedIds(prev => {
          const next = new Set(prev);
          groupIds.forEach(id => next.add(id));
          return next;
        });
      } else {
        setConfirmedIds(prev => new Set([...prev, apptId]));
      }

      onAppointmentConfirmed?.();
      setRecurringToConfirm(null);
    } catch {
      // silently ignore
    } finally {
      setConfirmingId(null);
    }
  }, [appointments, confirmedIds, onAppointmentConfirmed]);

  const pendingConfirmations = useMemo(() => {
    // Mesclar appointments (que podem ter o que está no calendário) com pendingAppointments (que tem todos os scheduled do futuro)
    const all = [...appointments];
    pendingAppointments.forEach(p => {
      if (!all.find(a => a.id === p.id)) all.push(p);
    });

    return all.filter(a => 
      a.status === "scheduled" && 
      !confirmedIds.has(a.id) &&
      (a.date >= today || a.date === today)
    ).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
  }, [appointments, pendingAppointments, today, confirmedIds]);

  return (
    <div className="space-y-5 sm:space-y-6">



      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-zinc-900">{greeting}! 👋</h2>
          <p className="text-xs text-zinc-400 font-medium mt-0.5 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {birthdayToday.length > 0 && (
            <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 text-pink-600 text-[10px] font-black px-3 py-1.5 rounded-full animate-pulse">
              <Cake size={11} />
              {birthdayToday.length === 1
                ? `${birthdayToday[0].name.split(" ")[0]} faz anos hoje!`
                : `${birthdayToday.length} aniversariantes hoje!`}
            </div>
          )}
          <button
            onClick={() => setShowFinancials(v => !v)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-xl border transition-all",
              showFinancials
                ? "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                : "bg-zinc-900 border-zinc-900 text-white"
            )}
          >
            {showFinancials ? <Eye size={13} /> : <EyeOff size={13} />}
            <span className="hidden sm:inline">{showFinancials ? "Ocultar" : "Mostrar"} valores</span>
          </button>
        </div>
      </div>

      {/* ── AÇÕES RÁPIDAS ── */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 flex items-center gap-1.5">
          <Zap size={10} className="text-amber-500" /> Ações Rápidas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.action}
              onClick={() => handleQuickAction(qa.action)}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-2xl border-2 transition-all text-left group active:scale-95",
                qa.bg
              )}
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm group-hover:shadow-md transition-shadow", qa.iconBg)}>
                <qa.icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-zinc-900 leading-tight">{qa.label}</p>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{qa.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── PERÍODO + STATS ── */}
      <div>
        {/* Seletor de período */}
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Resumo —</p>
          <div className="flex gap-1">
            {(["today", "week", "month"] as StatPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setStatPeriod(p)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  statPeriod === p
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300"
                )}
              >
                {p === "today" ? "Hoje" : p === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard
            title="Faturamento"
            value={stats.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            icon={DollarSign}
            description={`${stats.paidCount} comanda(s) ${stats.periodLabel}`}
            hidden={!showFinancials}
          />
          <StatCard
            title="Lucro Líquido"
            value={profitability && typeof profitability.netProfit === 'number' ? profitability.netProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
            icon={TrendingUp}
            description={`Receita - Custos ${stats.periodLabel}`}
            hidden={!showFinancials}
            accent={(profitability?.netProfit ?? 0) >= 0 ? "emerald" : "red"}
          />
          <StatCard
            title="Agendamentos"
            value={String(stats.apptCount)}
            icon={CalendarIcon}
            description={stats.periodLabel}
          />
          <StatCard
            title="Novos Clientes"
            value={String(stats.newClientsCount)}
            icon={UserPlus}
            description={stats.periodLabel}
          />
          <StatCard
            title="Ticket Médio"
            value={stats.avgTicket > 0 ? stats.avgTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
            icon={Activity}
            description={stats.periodLabel}
            hidden={!showFinancials}
          />
        </div>
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Desempenho Semanal</h3>
              <p className="text-[10px] text-zinc-400">Faturamento bruto por dia</p>
            </div>
          </div>
          <AnimatePresence>
            {!showFinancials ? (
              <div className="h-[180px] sm:h-[220px] flex items-center justify-center text-zinc-300">
                <div className="text-center">
                  <EyeOff size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold text-zinc-400">Valores ocultos</p>
                </div>
              </div>
            ) : (
              <div className="h-[180px] sm:h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#a1a1aa" }} tickFormatter={(v) => `R$ ${v}`} width={55} />
                    <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e4e4e7", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "12px", color: "#18181b" }} itemStyle={{ color: "#d97706" }} />
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900 mb-4">Serviços Populares</h3>
          <div className="h-[150px] sm:h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={servicesData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                  {servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e4e4e7", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {servicesData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-medium text-zinc-500">{item.name}</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-700">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROFISSIONAIS DO MÊS ── */}
      {profReport.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Destaque do mês */}
          {topProfessional && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-3 right-3 opacity-10">
                <Trophy size={60} className="text-amber-500" />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white text-xl font-black shadow-lg mb-3">
                {topProfessional.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-[9px] font-black bg-amber-500 text-white px-2.5 py-1 rounded-full uppercase tracking-widest mb-2 flex items-center gap-1">
                <Star size={9} /> Destaque do Mês
              </span>
              <p className="text-base font-black text-zinc-900">{topProfessional.name}</p>
              <p className="text-[10px] text-zinc-500 mb-3">{topProfessional.role || "Profissional"}</p>
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="bg-white rounded-xl p-2.5 border border-amber-100">
                  <p className="text-[9px] font-black text-zinc-400 uppercase">Faturado</p>
                  <p className={cn("text-sm font-black text-amber-600", !showFinancials && "blur-sm")}>
                    {showFinancials ? (topProfessional.totalRevenue || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ ••"}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-amber-100">
                  <p className="text-[9px] font-black text-zinc-400 uppercase">Atend.</p>
                  <p className="text-sm font-black text-zinc-900">{topProfessional.totalComandas || 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* Ranking rápido */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-zinc-400" />
                <h3 className="text-sm font-bold text-zinc-900">Profissionais — Este Mês</h3>
              </div>
              <button onClick={() => handleTabChange("fluxo")} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                Ver Completo <ArrowUpRight size={11} />
              </button>
            </div>
            <div className="space-y-3">
              {profReport.slice(0, 4).map((p: any, i: number) => {
                const maxRevenue = profReport[0]?.totalRevenue || 1;
                const pct = maxRevenue > 0 ? (p.totalRevenue / maxRevenue) * 100 : 0;
                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0" style={{ backgroundColor: PROF_COLORS[i % PROF_COLORS.length] }}>
                          {i + 1}
                        </div>
                        <span className="text-xs font-bold text-zinc-800 truncate max-w-[100px] sm:max-w-[160px]">{p.name}</span>
                      </div>
                      <span className={cn("text-xs font-black text-zinc-900", !showFinancials && "blur-sm")}>
                        {showFinancials ? (p.totalRevenue || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ ••"}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: PROF_COLORS[i % PROF_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
      )}

      {/* ── LOGICA DE CONFIRMAÇÕES ── */}
      <AnimatePresence>
        {pendingConfirmations.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsConfirmationsModalOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-3.5 rounded-2xl shadow-[0_10px_40px_rgb(245,158,11,0.5)] hover:shadow-[0_10px_40px_rgb(245,158,11,0.7)] hover:scale-105 transition-all active:scale-95 group border-2 border-white/20"
          >
            <div className="bg-white/20 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <span className="font-black text-xs sm:text-sm uppercase tracking-widest">Confirmações</span>
            <div className="w-6 h-6 bg-white text-orange-600 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg animate-bounce sm:animate-none group-hover:animate-pulse">
              {pendingConfirmations.length}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
      <Modal
        isOpen={isConfirmationsModalOpen}
        onClose={() => setIsConfirmationsModalOpen(false)}
        size="lg"
        hideCloseButton
        className="p-0 sm:max-w-[550px]"
      >
        {/* Header Compacto */}
        <div className="bg-[#f59e0b] text-white px-5 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner">
              <Bell size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight leading-none">Confirmações Pendentes</h3>
              <p className="text-[9px] font-black text-white/80 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                 <span className="w-1 h-1 rounded-full bg-white/40 animate-ping" />
                 {pendingConfirmations.length} novas solicitações
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsConfirmationsModalOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-all active:scale-90"
          >
            <Plus size={22} className="rotate-45" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          {pendingConfirmations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <p className="text-base font-black text-zinc-800">Tudo em dia!</p>
              <p className="text-[11px] text-zinc-500 max-w-[180px] mt-1.5 font-medium">Nenhum agendamento aguardando confirmação.</p>
            </div>
          ) : (
            pendingConfirmations.map((appt) => {
              const isRecurrent = appt.repeatGroupId || (appt.totalSessions && appt.totalSessions > 1);
              return (
                <div key={appt.id} className="group bg-zinc-50/50 rounded-3xl border border-zinc-100 p-4 hover:border-amber-300 hover:bg-white transition-all duration-300 shadow-sm hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-[#f59e0b] font-black text-lg shrink-0 shadow-sm group-hover:bg-amber-50 group-hover:border-amber-100 transition-colors">
                      {appt.client?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-base font-black text-zinc-900 truncate tracking-tight">
                          {appt.client?.name || "Cliente"}
                        </p>
                        <p className="text-sm font-black text-emerald-600 shrink-0">
                          {(appt.service?.price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500">
                            <Scissors size={12} className="text-zinc-400" />
                            <span className="truncate">{appt.service?.name || "Serviço"}</span>
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400">
                            <CalendarIcon size={12} />
                            {format(new Date(appt.date), "dd/MM")} • {appt.startTime}
                         </div>
                      </div>

                      {isRecurrent && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1 border border-amber-200">
                            <Zap size={9} fill="currentColor" /> Recorrente
                          </span>
                          <p className="text-[8px] text-amber-600 font-bold uppercase tracking-widest opacity-60">Sessão {appt.sessionNumber}/{appt.totalSessions}</p>
                        </div>
                      )}

                      <div className="mt-4">
                        <Button
                          variant="success"
                          fullWidth
                          size="md"
                          loading={confirmingId === appt.id}
                          onClick={() => handleConfirm(appt.id)}
                          className="rounded-xl font-black uppercase tracking-[0.2em] text-[9px] h-9 shadow-md shadow-emerald-500/10"
                          iconLeft={<Check size={14} strokeWidth={3} />}
                        >
                          Confirmar Agendamento
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Ultra Compacto */}
        <div className="bg-zinc-50 border-t border-zinc-100 px-5 py-3.5 rounded-b-[2rem]">
           <p className="text-[9px] font-black text-[#f59e0b] uppercase tracking-widest flex items-center justify-center gap-2 text-center opacity-70">
             <Zap size={10} fill="currentColor" className="animate-pulse shrink-0" />
             Confirmação via WhatsApp automática.
           </p>
        </div>
      </Modal>

      {/* ── BOTTOM ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">

        {/* Próximos Agendamentos */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900">Próximos</h3>
            <button onClick={() => handleTabChange("agenda")} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
              Ver Todos <ArrowUpRight size={11} />
            </button>
          </div>
          <div className="space-y-2.5">
            {appointments.slice(0, 4).map((app) => (
              <div key={app.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black text-xs shrink-0">
                  {app.client?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-900 truncate">{app.client?.name}</p>
                  <p className="text-[10px] text-zinc-400 font-medium truncate">{app.service?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-black text-zinc-700">{app.startTime}</p>
                  <p className="text-[9px] text-zinc-400">{format(new Date(app.date), "dd/MM")}</p>
                </div>
              </div>
            ))}
            {appointments.length === 0 && (
              <div className="py-8 text-center">
                <Clock size={24} className="mx-auto mb-2 text-zinc-200" />
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Sem agendamentos</p>
              </div>
            )}
          </div>
        </div>

        {/* Últimas Comandas */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900">Comandas</h3>
            <button onClick={() => handleTabChange("comandas")} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors">
              Ver Todas <ArrowUpRight size={11} />
            </button>
          </div>
          <div className="space-y-2.5">
            {comandas.slice(0, 4).map((com) => (
              <div key={com.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0", com.status === "paid" ? "bg-emerald-50 border border-emerald-100 text-emerald-600" : "bg-orange-50 border border-orange-100 text-orange-500")}>
                  <CheckCircle2 size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-900 truncate">{com.client?.name}</p>
                  <p className={cn("text-[10px] font-bold", com.status === "paid" ? "text-emerald-500" : "text-orange-400")}>
                    {com.status === "paid" ? "Pago" : "Em Aberto"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-[11px] font-black", showFinancials ? (com.status === "paid" ? "text-emerald-600" : "text-orange-500") : "text-zinc-300 blur-sm select-none")}>
                    {showFinancials ? `R$ ${com.total?.toFixed(2)}` : "R$ ••"}
                  </p>
                  <p className="text-[9px] text-zinc-400">{format(new Date(com.createdAt), "dd/MM")}</p>
                </div>
              </div>
            ))}
            {comandas.length === 0 && (
              <div className="py-8 text-center">
                <DollarSign size={24} className="mx-auto mb-2 text-zinc-200" />
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Sem comandas</p>
              </div>
            )}
          </div>
        </div>

        {/* Aniversariantes do Mês */}
        <div className={cn(
          "rounded-2xl shadow-sm border p-4 sm:p-6",
          birthdayClients.length > 0 ? "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100" : "bg-white border-zinc-200"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-pink-100 rounded-xl flex items-center justify-center shrink-0">
                <Cake size={15} className="text-pink-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Aniversariantes</h3>
                <p className="text-[10px] text-pink-400 font-bold uppercase tracking-widest capitalize">{monthName}</p>
              </div>
            </div>
            {birthdayClients.length > 0 && (
              <span className="bg-pink-500 text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center shrink-0">{birthdayClients.length}</span>
            )}
          </div>

          {birthdayClients.length === 0 ? (
            <div className="py-6 text-center">
              <Cake size={24} className="mx-auto mb-2 text-zinc-200" />
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Nenhum este mês</p>
              <p className="text-[9px] text-zinc-400 mt-1">Cadastre datas de nascimento nos clientes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {birthdayClients.slice(0, 5).map((c) => {
                const birthParts = parseBirthDateParts(c.birthDate);
                const day = birthParts?.day ? String(birthParts.day).padStart(2, "0") : "--";
                const age = calculateAge(c.birthDate);
                const isToday = birthParts?.day === todayDay;
                return (
                  <div key={c.id} className={cn("flex items-center gap-2.5 p-2 rounded-xl transition-all", isToday ? "bg-pink-100 border border-pink-200" : "bg-white/60")}>
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0", isToday ? "bg-pink-500 text-white shadow-sm" : "bg-pink-50 border border-pink-100 text-pink-600")}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">Dia {day}{age !== null ? ` · ${age} anos` : ""}</p>
                    </div>
                    {isToday && (
                      <span className="text-[8px] font-black bg-pink-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest shrink-0">Hoje!</span>
                    )}
                  </div>
                );
              })}
              {birthdayClients.length > 5 && (
                <button onClick={() => handleTabChange("clients")} className="w-full text-center text-[10px] font-bold text-pink-500 hover:text-pink-700 pt-1 transition-colors">
                  +{birthdayClients.length - 5} mais →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        isOpen={!!recurringToConfirm}
        onClose={() => setRecurringToConfirm(null)}
        onConfirm={() => recurringToConfirm && handleConfirm(recurringToConfirm.id, true)}
        title="Confirmar Recorrência"
        message={
          <div className="space-y-2">
            <p>Este agendamento faz parte de uma série recorrente.</p>
            <p className="font-bold text-zinc-900">Deseja confirmar todas as sessões futuras deste grupo?</p>
            <p className="text-[11px] text-zinc-400 italic">Isso marcará todos os agendamentos desta série como confirmados e notificará o cliente.</p>
          </div>
        }
        confirmLabel="Confirmar Todas"
        cancelLabel="Apenas esta"
        variant="primary"
        loading={confirmingId === recurringToConfirm?.id}
      />
    </div>
  );
}
