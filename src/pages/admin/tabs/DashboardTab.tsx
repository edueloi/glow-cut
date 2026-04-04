import React, { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import {
  DollarSign, CalendarIcon, UserPlus, TrendingUp, Cake,
  Eye, EyeOff, Plus, Receipt, Users, BarChart2, Scissors,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, Zap
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { calculateAge } from "@/src/lib/masks";
import { motion, AnimatePresence } from "motion/react";

interface DashboardTabProps {
  revenueData: any[];
  servicesData: any[];
  appointments: any[];
  comandas: any[];
  clients: any[];
  handleTabChange: (tab: string) => void;
  setIsAppointmentModalOpen?: (v: boolean) => void;
  setIsComandaModalOpen?: (v: boolean) => void;
  setIsClientModalOpen?: (v: boolean) => void;
}

const QUICK_ACTIONS = [
  {
    label: "Novo Agendamento",
    sublabel: "Marcar horário",
    icon: CalendarIcon,
    color: "amber",
    bg: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    iconBg: "bg-amber-500",
    action: "appointment",
  },
  {
    label: "Nova Comanda",
    sublabel: "Abrir conta",
    icon: Receipt,
    color: "emerald",
    bg: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
    iconBg: "bg-emerald-500",
    action: "comanda",
  },
  {
    label: "Novo Cliente",
    sublabel: "Cadastrar",
    icon: UserPlus,
    color: "blue",
    bg: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    iconBg: "bg-blue-500",
    action: "client",
  },
  {
    label: "Fluxo de Caixa",
    sublabel: "Ver relatório",
    icon: BarChart2,
    color: "violet",
    bg: "bg-violet-50 border-violet-200 hover:bg-violet-100",
    iconBg: "bg-violet-500",
    action: "fluxo",
  },
];

function StatCard({ title, value, icon: Icon, trend, description, hidden }: {
  title: string; value: string; icon: any;
  trend?: { value: number; isUp: boolean }; description?: string; hidden?: boolean;
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
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
          <Icon size={18} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn(
            "flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-lg",
            trend.isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          )}>
            {trend.isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend.value}%
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">{description}</span>
        </div>
      )}
    </div>
  );
}

export function DashboardTab({
  revenueData, servicesData, appointments, comandas, clients, handleTabChange,
  setIsAppointmentModalOpen, setIsComandaModalOpen, setIsClientModalOpen
}: DashboardTabProps) {
  const [showFinancials, setShowFinancials] = useState(true);

  const currentMonthNum = new Date().getMonth() + 1;
  const todayDay = new Date().getDate();

  const birthdayClients = clients.filter(c => {
    if (!c.birthDate) return false;
    const parts = c.birthDate.split("/");
    if (parts.length !== 3) return false;
    return parseInt(parts[1]) === currentMonthNum;
  }).sort((a, b) => {
    const dayA = parseInt(a.birthDate.split("/")[0]);
    const dayB = parseInt(b.birthDate.split("/")[0]);
    return dayA - dayB;
  });

  const birthdayToday = birthdayClients.filter(c => {
    const day = parseInt(c.birthDate.split("/")[0]);
    return day === todayDay;
  });

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

  return (
    <div className="space-y-5 sm:space-y-6">

      {/* ── GREETING + TOGGLE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-zinc-900">
            {greeting}! 👋
          </h2>
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

      {/* ── STATS ── */}
      {(() => {
        const today = new Date().toDateString();
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const todayAppts = appointments.filter(a => new Date(a.date).toDateString() === today);
        const revenueToday = comandas
          .filter(c => c.status === "closed" && new Date(c.createdAt).toDateString() === today)
          .reduce((s: number, c: any) => s + (c.total || 0), 0);
        const newClientsWeek = clients.filter(c => new Date(c.createdAt) >= weekAgo).length;
        const closedComandas = comandas.filter((c: any) => c.status === "closed" && c.total > 0);
        const avgTicket = closedComandas.length > 0
          ? closedComandas.reduce((s: number, c: any) => s + (c.total || 0), 0) / closedComandas.length
          : 0;
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard title="Faturamento Hoje" value={revenueToday.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} icon={DollarSign} description="comandas fechadas hoje" hidden={!showFinancials} />
            <StatCard title="Agendamentos Hoje" value={String(todayAppts.length)} icon={CalendarIcon} description="para hoje" />
            <StatCard title="Novos Clientes" value={String(newClientsWeek)} icon={UserPlus} description="esta semana" />
            <StatCard title="Ticket Médio" value={avgTicket > 0 ? avgTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"} icon={TrendingUp} description="comandas fechadas" hidden={!showFinancials} />
          </div>
        );
      })()}

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Desempenho Semanal</h3>
              <p className="text-[10px] text-zinc-400">Faturamento bruto por dia</p>
            </div>
            <select className="text-[10px] font-bold border border-zinc-200 bg-zinc-50 text-zinc-600 rounded-lg p-1.5 outline-none">
              <option>Esta Semana</option>
              <option>Mês Passado</option>
            </select>
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
          <div className="h-[150px] sm:h-[180px] w-full flex items-center justify-center">
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
                  {app.client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-900 truncate">{app.client.name}</p>
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
          birthdayClients.length > 0
            ? "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-100"
            : "bg-white border-zinc-200"
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
                const day = c.birthDate.split("/")[0];
                const age = calculateAge(c.birthDate);
                const isToday = parseInt(day) === todayDay;
                return (
                  <div key={c.id} className={cn("flex items-center gap-2.5 p-2 rounded-xl transition-all", isToday ? "bg-pink-100 border border-pink-200" : "bg-white/60")}>
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0", isToday ? "bg-pink-500 text-white shadow-sm" : "bg-pink-50 border border-pink-100 text-pink-600")}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        Dia {day}{age !== null ? ` · ${age} anos` : ""}
                      </p>
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
    </div>
  );
}
