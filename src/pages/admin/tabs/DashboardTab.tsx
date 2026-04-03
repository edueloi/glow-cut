import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from "recharts";
import { 
  DollarSign, CalendarIcon, UserPlus, TrendingUp, Cake 
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { StatCard } from "@/src/components/ui/StatCard";
import { calculateAge } from "@/src/lib/masks";

interface DashboardTabProps {
  revenueData: any[];
  servicesData: any[];
  appointments: any[];
  comandas: any[];
  clients: any[];
  handleTabChange: (tab: string) => void;
}

export function DashboardTab({ 
  revenueData, servicesData, appointments, comandas, clients, handleTabChange 
}: DashboardTabProps) {
  const currentMonthNum = new Date().getMonth() + 1;
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
  const monthName = format(new Date(), "MMMM", { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Faturamento Hoje" 
          value="R$ 1.250,00" 
          icon={DollarSign} 
          trend={{ value: 12, isUp: true }}
          description="vs. ontem"
        />
        <StatCard 
          title="Agendamentos" 
          value="18" 
          icon={CalendarIcon} 
          trend={{ value: 3, isUp: true }}
          description="para hoje"
        />
        <StatCard 
          title="Novos Clientes" 
          value="5" 
          icon={UserPlus} 
          trend={{ value: 2, isUp: true }}
          description="esta semana"
        />
        <StatCard 
          title="Ticket Médio" 
          value="R$ 68,00" 
          icon={TrendingUp} 
          trend={{ value: 5, isUp: false }}
          description="vs. mês anterior"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Desempenho Semanal</h3>
              <p className="text-[10px] text-zinc-400">Faturamento bruto por dia</p>
            </div>
            <select className="text-[10px] font-bold border border-zinc-200 bg-zinc-50 text-zinc-600 rounded-lg p-1.5 outline-none">
              <option>Esta Semana</option>
              <option>Mês Passado</option>
            </select>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', color: '#18181b' }} itemStyle={{ color: '#d97706' }} />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <h3 className="text-sm font-bold text-zinc-900 mb-5">Serviços Populares</h3>
          <div className="h-[180px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={servicesData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                  {servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-3">
            {servicesData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] font-medium text-zinc-500">{item.name}</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-700">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-zinc-900">Próximos Agendamentos</h3>
            <button onClick={() => handleTabChange('agenda')} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors">Ver Todos</button>
          </div>
          <div className="space-y-3">
            {appointments.slice(0, 4).map((app) => (
              <div key={app.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">
                    {app.client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{app.client.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">{app.service.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-700">{app.startTime}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">{format(new Date(app.date), "dd/MM")}</p>
                </div>
              </div>
            ))}
            {appointments.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Nenhum agendamento próximo</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-zinc-900">Últimas Comandas</h3>
            <button onClick={() => handleTabChange('comandas')} className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors">Ver Todas</button>
          </div>
          <div className="space-y-3">
            {comandas.slice(0, 4).map((com) => (
              <div key={com.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                    <DollarSign size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{com.client.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">{com.status === 'paid' ? 'Pago' : 'Em Aberto'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">R$ {com.total.toFixed(2)}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">{format(new Date(com.createdAt), "dd/MM")}</p>
                </div>
              </div>
            ))}
            {comandas.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Nenhuma comanda hoje</p>
              </div>
            )}
          </div>
        </div>

        {/* Birthday Widget */}
        {birthdayClients.length > 0 && (
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-2xl shadow-sm border border-pink-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-pink-100 rounded-xl flex items-center justify-center">
                  <Cake size={16} className="text-pink-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Aniversariantes</h3>
                  <p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest capitalize">{monthName}</p>
                </div>
              </div>
              <span className="bg-pink-500 text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center">{birthdayClients.length}</span>
            </div>
            <div className="space-y-2.5">
              {birthdayClients.slice(0, 5).map(c => {
                const day = c.birthDate.split("/")[0];
                const age = calculateAge(c.birthDate);
                const todayDay = new Date().getDate();
                const isToday = parseInt(day) === todayDay;
                return (
                  <div key={c.id} className={cn("flex items-center gap-3 p-2.5 rounded-xl transition-all", isToday ? "bg-pink-100 border border-pink-200" : "bg-white/70 border border-transparent")}>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0", isToday ? "bg-pink-500 text-white shadow-sm shadow-pink-300" : "bg-pink-50 border border-pink-100 text-pink-600")}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-900 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-500 font-medium">
                        Dia {day}{age !== null ? ` · ${age} anos` : ""}
                      </p>
                    </div>
                    {isToday && (
                      <span className="text-[9px] font-black bg-pink-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">Hoje!</span>
                    )}
                  </div>
                );
              })}
              {birthdayClients.length > 5 && (
                <button onClick={() => handleTabChange('clients')} className="w-full text-center text-[10px] font-bold text-pink-500 hover:text-pink-700 pt-1 transition-colors">
                  +{birthdayClients.length - 5} mais
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
