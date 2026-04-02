import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Scissors, 
  Users, 
  CheckCircle, 
  Settings, 
  Plus, 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  UserPlus, 
  LogOut, 
  Filter, 
  LayoutGrid, 
  List, 
  X, 
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Package as PackageIcon,
  Star,
  Zap,
  FileText,
  Trash2
} from "lucide-react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  isToday,
  startOfToday,
  subDays
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { motion, AnimatePresence } from "motion/react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Mock data for charts
const revenueData = [
  { name: 'Seg', value: 400 },
  { name: 'Ter', value: 300 },
  { name: 'Qua', value: 600 },
  { name: 'Qui', value: 800 },
  { name: 'Sex', value: 1200 },
  { name: 'Sáb', value: 1500 },
  { name: 'Dom', value: 500 },
];

const servicesData = [
  { name: 'Corte', value: 45, color: '#f59e0b' },
  { name: 'Barba', value: 25, color: '#10b981' },
  { name: 'Combo', value: 20, color: '#3b82f6' },
  { name: 'Outros', value: 10, color: '#8b5cf6' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"dash" | "agenda" | "services" | "clients" | "comandas" | "settings">("dash");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  
  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isComandaModalOpen, setIsComandaModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [comandas, setComandas] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientView, setClientView] = useState<"list" | "grid">("grid");
  const [serviceSubTab, setServiceSubTab] = useState<"services" | "packages">("services");
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  
  // New Appointment State
  const [newAppointment, setNewAppointment] = useState({
    date: new Date(),
    startTime: "09:00",
    clientId: "",
    clientPhone: "",
    clientName: "",
    serviceId: "",
    professionalId: "",
    recurrence: { type: "none", count: 1, interval: 7 },
    comandaId: "" as string | null
  });

  // New Comanda State
  const [newComanda, setNewComanda] = useState({
    clientPhone: "",
    clientName: "",
    items: [] as { id: string, name: string, price: number, quantity: number }[],
    discount: "0",
    discountType: "value" as "value" | "percentage"
  });

  // New Client State
  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    age: ""
  });

  useEffect(() => {
    fetch("/api/services").then(res => res.json()).then(setServices);
    fetch("/api/professionals").then(res => res.json()).then(profs => {
      setProfessionals(profs);
      if (profs.length > 0) setSelectedProfessional(profs[0].id);
    });
    fetch("/api/settings/working-hours").then(res => res.json()).then(setWorkingHours);
    fetch("/api/comandas").then(res => res.json()).then(setComandas);
    fetch("/api/clients").then(res => res.json()).then(setClients);
    fetchAppointments();
  }, [currentMonth, selectedProfessional]);

  const handleAddServiceToComanda = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    setNewComanda(prev => {
      const exists = prev.items.find(i => i.id === serviceId);
      if (exists) {
        return {
          ...prev,
          items: prev.items.map(i => 
            i.id === serviceId ? { ...i, quantity: i.quantity + 1 } : i
          )
        };
      }
      return {
        ...prev,
        items: [...prev.items, { id: service.id, name: service.name, price: service.price, quantity: 1 }]
      };
    });
  };

  const fetchAppointments = () => {
    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();
    let url = `/api/appointments?start=${start}&end=${end}`;
    if (selectedProfessional !== "all") url += `&professionalId=${selectedProfessional}`;
    fetch(url).then(res => res.json()).then(setAppointments);
  };

  const handleCreateAppointment = async () => {
    // First, handle client
    let clientId = newAppointment.clientId;
    if (!clientId) {
      if (!newAppointment.clientName || !newAppointment.clientPhone) {
        alert("Por favor, selecione um cliente ou preencha nome e telefone para cadastrar um novo.");
        return;
      }
      const clientRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAppointment.clientName, phone: newAppointment.clientPhone })
      });
      const client = await clientRes.json();
      clientId = client.id;
    }

    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAppointment, clientId })
    });
    setIsAppointmentModalOpen(false);
    setNewAppointment({
      date: new Date(),
      startTime: "09:00",
      clientId: "",
      clientPhone: "",
      clientName: "",
      serviceId: "",
      professionalId: "",
      recurrence: { type: "none", count: 1, interval: 7 },
      comandaId: null
    });
    fetchAppointments();
  };

  const handleCreateComanda = async () => {
    // 1. Find or create client
    let clientId = "";
    const clientRes = await fetch(`/api/clients/search?phone=${newComanda.clientPhone}`);
    const clientData = await clientRes.json();
    
    if (clientData) {
      clientId = clientData.id;
    } else {
      const newClientRes = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newComanda.clientName, phone: newComanda.clientPhone })
      });
      const newClient = await newClientRes.json();
      clientId = newClient.id;
    }

    // 2. Calculate total
    const subtotal = newComanda.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    let total = subtotal;
    const discountVal = parseFloat(newComanda.discount || "0");
    if (newComanda.discountType === 'percentage') {
      total = subtotal * (1 - discountVal / 100);
    } else {
      total = subtotal - discountVal;
    }

    // 3. Create comanda
    await fetch("/api/comandas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        discount: discountVal,
        discountType: newComanda.discountType,
        total
      })
    });

    setIsComandaModalOpen(false);
    fetch("/api/comandas").then(res => res.json()).then(setComandas);
  };

  const handleCreateClient = async () => {
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient)
    });
    setIsClientModalOpen(false);
    setNewClient({ name: "", phone: "", age: "" });
    fetch("/api/clients").then(res => res.json()).then(setClients);
  };

  const handleSearchClientByName = async (name: string) => {
    setNewAppointment({ ...newAppointment, clientName: name });
    if (name.length > 2) {
      const res = await fetch(`/api/clients/search?name=${name}`);
      const data = await res.json();
      setClientSearchResults(data || []);
    } else {
      setClientSearchResults([]);
    }
  };
  
  // New Service/Package State
  const [newService, setNewService] = useState({
    name: "",
    price: "",
    duration: "",
    type: "service" as "service" | "package",
    discount: "0",
    discountType: "value" as "value" | "percentage",
    includedServices: [] as { id: string, name: string, quantity: number }[]
  });

  const handleAddServiceToPackage = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    setNewService(prev => {
      const exists = prev.includedServices.find(s => s.id === serviceId);
      if (exists) {
        return {
          ...prev,
          includedServices: prev.includedServices.map(s => 
            s.id === serviceId ? { ...s, quantity: s.quantity + 1 } : s
          )
        };
      }
      return {
        ...prev,
        includedServices: [...prev.includedServices, { id: service.id, name: service.name, quantity: 1 }]
      };
    });
  };

  const handleCreateService = async () => {
    await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newService)
    });
    setIsServiceModalOpen(false);
    setNewService({
      name: "",
      price: "",
      duration: "",
      type: "service",
      discount: "0",
      discountType: "value",
      includedServices: []
    });
    fetch("/api/services").then(res => res.json()).then(setServices);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'clients') {
      fetch("/api/clients").then(res => res.json()).then(setClients);
    }
    if (tab === 'services') {
      fetch("/api/services").then(res => res.json()).then(setServices);
    }
    if (tab === 'comandas') {
      fetch("/api/comandas").then(res => res.json()).then(setComandas);
    }
    if (tab === 'agenda') {
      fetchAppointments();
    }
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="flex h-screen bg-[#0a0a0c] text-zinc-300 font-sans selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0f0f12] border-r border-white/5 flex flex-col z-20">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Scissors className="text-zinc-950" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tighter font-display leading-none uppercase">ELITE</h1>
              <p className="text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase mt-1">Studio Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Principal</p>
          </div>
          <NavItem 
            active={activeTab === 'dash'} 
            onClick={() => handleTabChange('dash')} 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
          />
          <NavItem 
            active={activeTab === 'agenda'} 
            onClick={() => handleTabChange('agenda')} 
            icon={<CalendarIcon size={18} />} 
            label="Agenda & Reservas" 
          />
          
          <div className="px-4 mt-8 mb-4">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Operacional</p>
          </div>
          <NavItem 
            active={activeTab === 'comandas'} 
            onClick={() => handleTabChange('comandas')} 
            icon={<CheckCircle size={18} />} 
            label="Comandas & Caixa" 
          />
          <NavItem 
            active={activeTab === 'services'} 
            onClick={() => handleTabChange('services')} 
            icon={<Scissors size={18} />} 
            label="Serviços & Pacotes" 
          />
          <NavItem 
            active={activeTab === 'clients'} 
            onClick={() => handleTabChange('clients')} 
            icon={<Users size={18} />} 
            label="Gestão de Clientes" 
          />
          
          <div className="px-4 mt-8 mb-4">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Sistema</p>
          </div>
          <NavItem 
            active={activeTab === 'settings'} 
            onClick={() => handleTabChange('settings')} 
            icon={<Settings size={18} />} 
            label="Configurações" 
          />
        </nav>

        <div className="p-4 mt-auto border-t border-white/5">
          <div className="bg-zinc-900/50 rounded-2xl p-4 flex items-center gap-3 mb-4 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400">
              <Users size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Admin Studio</p>
              <p className="text-[10px] text-zinc-500 truncate">edueloi.EE@gmail.com</p>
            </div>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0a0a0c]">
        {/* Header */}
        <header className="h-20 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-white font-display capitalize tracking-tight">
              {activeTab === 'dash' ? 'Painel de Controle' : 
               activeTab === 'agenda' ? 'Agenda de Atendimentos' :
               activeTab === 'services' ? 'Serviços & Pacotes' :
               activeTab === 'clients' ? 'Meus Clientes' :
               activeTab === 'comandas' ? 'Fluxo de Caixa' : 'Configurações'}
            </h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Buscar cliente ou serviço..." 
                className="pl-10 pr-4 py-2 bg-zinc-900 border border-white/5 focus:border-amber-500/20 focus:ring-4 focus:ring-amber-500/5 rounded-xl text-xs w-64 transition-all outline-none text-zinc-300"
              />
            </div>
            
            <button className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-8 w-px bg-zinc-100 mx-2"></div>
            
            {activeTab === 'services' && (
              <Button size="sm" onClick={() => {
                setNewService({
                  name: "",
                  price: "",
                  duration: "",
                  type: "service",
                  discount: "0",
                  discountType: "value",
                  includedServices: []
                });
                setIsServiceModalOpen(true);
              }} className="rounded-xl shadow-lg shadow-amber-500/20">
                <Plus size={16} className="mr-2" /> Novo Serviço
              </Button>
            )}
            {activeTab === 'comandas' && (
              <Button size="sm" onClick={() => setIsComandaModalOpen(true)} className="rounded-xl shadow-lg shadow-amber-500/20">
                <Plus size={16} className="mr-2" /> Nova Comanda
              </Button>
            )}
            {activeTab === 'clients' && (
              <Button size="sm" onClick={() => setIsClientModalOpen(true)} className="rounded-xl shadow-lg shadow-amber-500/20">
                <Plus size={16} className="mr-2" /> Novo Cliente
              </Button>
            )}
            {activeTab === 'agenda' && (
              <Button size="sm" onClick={() => setIsAppointmentModalOpen(true)} className="rounded-xl shadow-lg shadow-amber-500/20">
                <Plus size={16} className="mr-2" /> Novo Agendamento
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >

        {activeTab === 'dash' && (
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
              <div className="lg:col-span-2 bg-[#0f0f12] p-6 rounded-3xl shadow-sm border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-white">Desempenho Semanal</h3>
                    <p className="text-[10px] text-zinc-500">Faturamento bruto por dia</p>
                  </div>
                  <select className="text-[10px] font-bold border border-white/5 bg-zinc-900 text-zinc-300 rounded-md p-1 outline-none">
                    <option>Esta Semana</option>
                    <option>Mês Passado</option>
                  </select>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#71717a' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#71717a' }}
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f0f12',
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.05)', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
                          fontSize: '12px',
                          color: '#fff'
                        }} 
                        itemStyle={{ color: '#f59e0b' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#0f0f12] p-6 rounded-3xl shadow-sm border border-white/5">
                <h3 className="text-sm font-bold text-white mb-6">Serviços Populares</h3>
                <div className="h-[200px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={servicesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {servicesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f0f12',
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.05)', 
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {servicesData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] font-medium text-zinc-500">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-300">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity & Upcoming */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0f0f12] p-6 rounded-3xl shadow-sm border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-white">Próximos Agendamentos</h3>
                  <Button variant="ghost" size="xs" onClick={() => handleTabChange('agenda')} className="text-amber-500 hover:bg-amber-500/10">Ver Todos</Button>
                </div>
                <div className="space-y-4">
                  {appointments.slice(0, 4).map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xs border border-amber-500/20">
                          {app.client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{app.client.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">{app.service.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-300">{app.startTime}</p>
                        <p className="text-[10px] text-zinc-600 font-medium">{format(new Date(app.date), "dd/MM")}</p>
                      </div>
                    </div>
                  ))}
                  {appointments.length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Nenhum agendamento próximo</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#0f0f12] p-6 rounded-3xl shadow-sm border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-white">Últimas Comandas</h3>
                  <Button variant="ghost" size="xs" onClick={() => handleTabChange('comandas')} className="text-amber-500 hover:bg-amber-500/10">Ver Todas</Button>
                </div>
                <div className="space-y-4">
                  {comandas.slice(0, 4).map((com) => (
                    <div key={com.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xs border border-emerald-500/20">
                          <DollarSign size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{com.client.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">Finalizada</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-500">R$ {com.total.toFixed(2)}</p>
                        <p className="text-[10px] text-zinc-600 font-medium">Hoje</p>
                      </div>
                    </div>
                  ))}
                  {comandas.length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Nenhuma comanda hoje</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-[#0f0f12] p-1 rounded-2xl border border-white/5">
                <Button 
                  variant={view === 'day' ? 'primary' : 'ghost'} 
                  size="xs" 
                  onClick={() => setView('day')}
                  className={cn("rounded-xl px-6", view !== 'day' && "text-zinc-500 hover:text-white")}
                >
                  Dia
                </Button>
                <Button 
                  variant={view === 'week' ? 'primary' : 'ghost'} 
                  size="xs" 
                  onClick={() => setView('week')}
                  className={cn("rounded-xl px-6", view !== 'week' && "text-zinc-500 hover:text-white")}
                >
                  Semana
                </Button>
                <Button 
                  variant={view === 'month' ? 'primary' : 'ghost'} 
                  size="xs" 
                  onClick={() => setView('month')}
                  className={cn("rounded-xl px-6", view !== 'month' && "text-zinc-500 hover:text-white")}
                >
                  Mês
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-[#0f0f12] p-1 rounded-2xl border border-white/5">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors"><ChevronLeft size={16}/></button>
                  <span className="text-xs font-bold text-white px-4 min-w-[120px] text-center uppercase tracking-widest">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors"><ChevronRight size={16}/></button>
                </div>
                <Button 
                  onClick={() => setIsAppointmentModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl px-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  <Plus size={18} />
                  Novo Agendamento
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-[#0f0f12] rounded-3xl border border-white/5 overflow-hidden shadow-2xl flex flex-col">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Corte</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Barba</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-zinc-600" />
                  <select 
                    value={selectedProfessional} 
                    onChange={e => setSelectedProfessional(e.target.value)}
                    className="text-[10px] font-bold bg-transparent text-zinc-400 outline-none cursor-pointer hover:text-white transition-colors uppercase tracking-widest"
                  >
                    <option value="all">Todos Profissionais</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-auto scrollbar-hide">
                {view === 'month' && (
                  <div className="grid grid-cols-7 h-full">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="p-4 text-[10px] font-bold text-zinc-600 text-center border-b border-r border-white/5 uppercase tracking-widest bg-zinc-900/30">{day}</div>
                    ))}
                    {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                      <div key={`pad-${i}`} className="h-32 border-r border-b border-white/5 bg-zinc-900/10 opacity-30" />
                    ))}
                    {daysInMonth.map((day, idx) => {
                      const dayAppointments = appointments.filter(a => isSameDay(new Date(a.date), day));
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "min-h-[120px] p-3 border-b border-r border-white/5 transition-colors hover:bg-white/[0.02] relative group",
                            !isSameMonth(day, currentMonth) && "bg-zinc-900/10 opacity-30",
                            isToday(day) && "bg-amber-500/[0.03]"
                          )}
                        >
                          <span className={cn(
                            "text-[10px] font-bold mb-2 block",
                            isToday(day) ? "text-amber-500" : "text-zinc-500"
                          )}>
                            {format(day, 'd')}
                          </span>
                          <div className="space-y-1">
                            {dayAppointments.slice(0, 3).map(app => (
                              <div key={app.id} className="text-[9px] p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-300 truncate font-medium flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                                {app.startTime} - {app.client.name}
                              </div>
                            ))}
                            {dayAppointments.length > 3 && (
                              <div className="text-[8px] text-zinc-600 font-bold text-center mt-1 uppercase tracking-tighter">
                                +{dayAppointments.length - 3} mais
                              </div>
                            )}
                          </div>
                          <button className="absolute bottom-2 right-2 p-1.5 bg-zinc-900 rounded-lg text-zinc-600 opacity-0 group-hover:opacity-100 transition-all hover:text-white border border-white/5">
                            <Plus size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {view === 'week' && (
                  <div className="flex flex-col h-full">
                    <div className="grid grid-cols-8 sticky top-0 z-10 bg-[#0f0f12] border-b border-white/5">
                      <div className="p-4 border-r border-white/5" />
                      {eachDayOfInterval({
                        start: startOfWeek(currentMonth),
                        end: endOfWeek(currentMonth)
                      }).map(day => (
                        <div key={day.toString()} className={cn(
                          "p-4 text-center border-r border-white/5",
                          isToday(day) && "bg-amber-500/[0.03]"
                        )}>
                          <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">{format(day, 'EEE', { locale: ptBR })}</p>
                          <p className={cn("text-sm font-black", isToday(day) ? "text-amber-500" : "text-white")}>{format(day, 'd')}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const hour = i + 8;
                        return (
                          <div key={hour} className="grid grid-cols-8 border-b border-white/5 group">
                            <div className="p-4 text-[10px] font-bold text-zinc-600 text-right border-r border-white/5 bg-zinc-900/20">{hour}:00</div>
                            {Array.from({ length: 7 }).map((_, j) => {
                              const day = addDays(startOfWeek(currentMonth), j);
                              const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                              const app = appointments.find(a => isSameDay(new Date(a.date), day) && a.startTime === hourStr);
                              
                              return (
                                <div key={j} className={cn(
                                  "p-1 border-r border-white/5 min-h-[80px] transition-colors group-hover:bg-white/[0.01] relative",
                                  isToday(day) && "bg-amber-500/[0.01]"
                                )}>
                                  {app && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="h-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex flex-col justify-between group/app cursor-pointer hover:bg-amber-500/20 transition-all"
                                    >
                                      <div>
                                        <p className="text-[10px] font-black text-white leading-tight mb-1">{app.client.name}</p>
                                        <p className="text-[9px] font-bold text-amber-500/80 uppercase tracking-tighter">{app.service.name}</p>
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        <span className="text-[8px] font-bold text-zinc-500">{app.startTime}</span>
                                        <div className="w-5 h-5 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 opacity-0 group-hover/app:opacity-100 transition-opacity">
                                          <ChevronRight size={10} />
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
                <button 
                  onClick={() => setServiceSubTab('services')}
                  className={cn(
                    "px-6 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                    serviceSubTab === 'services' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  Serviços
                </button>
                <button 
                  onClick={() => setServiceSubTab('packages')}
                  className={cn(
                    "px-6 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                    serviceSubTab === 'packages' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  Pacotes
                </button>
              </div>
              <Button 
                onClick={() => {
                  setNewService({ ...newService, type: serviceSubTab === 'services' ? 'service' : 'package' });
                  setIsServiceModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Plus size={18} />
                Novo {serviceSubTab === 'services' ? 'Serviço' : 'Pacote'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.filter(s => s.type === (serviceSubTab === 'services' ? 'service' : 'package')).map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-[#0f0f12] rounded-3xl border border-white/5 p-6 shadow-sm hover:shadow-2xl hover:border-amber-500/30 transition-all relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="p-2 bg-zinc-900 hover:bg-amber-500 text-zinc-500 hover:text-zinc-950 rounded-xl transition-all"><Edit2 size={14}/></button>
                    <button className="p-2 bg-zinc-900 hover:bg-red-500 text-zinc-500 hover:text-white rounded-xl transition-all"><Trash2 size={14}/></button>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-amber-500 border border-white/5">
                      {serviceSubTab === 'services' ? <Scissors size={24} /> : <Package size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate font-display tracking-tight">{item.name}</h4>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm font-bold text-amber-500">R$ {item.price.toFixed(2)}</span>
                        <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                        <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                          <Clock size={12} /> {item.duration} min
                        </span>
                      </div>
                    </div>
                  </div>

                  {serviceSubTab === 'packages' && item.packageServices && (
                    <div className="mt-5 pt-5 border-t border-white/5">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Itens Inclusos</p>
                      <div className="flex flex-wrap gap-2">
                        {item.packageServices.map((ps: any, i: number) => (
                          <span key={i} className="text-[9px] font-bold bg-zinc-900 text-zinc-400 px-2.5 py-1.5 rounded-xl border border-white/5">
                            {ps.quantity}x {ps.service.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full border-2 border-[#0f0f12] bg-zinc-900"></div>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">12 vendas este mês</p>
                  </div>
                </motion.div>
              ))}
              {services.filter(s => s.type === (serviceSubTab === 'services' ? 'service' : 'package')).length === 0 && (
                <div className="col-span-full py-24 bg-zinc-900/30 rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-500">
                  <Package size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold text-zinc-400">Nenhum {serviceSubTab === 'services' ? 'serviço' : 'pacote'} cadastrado.</p>
                  <p className="text-xs mt-1 font-medium">Clique no botão acima para começar.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex p-1.5 bg-zinc-900 rounded-2xl w-fit border border-white/5">
                <button 
                  onClick={() => setClientView('grid')}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    clientView === 'grid' ? "bg-amber-500 shadow-lg shadow-amber-500/20 text-zinc-950" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <LayoutGrid size={20} />
                </button>
                <button 
                  onClick={() => setClientView('list')}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    clientView === 'list' ? "bg-amber-500 shadow-lg shadow-amber-500/20 text-zinc-950" : "text-zinc-500 hover:text-white"
                  )}
                >
                  <List size={20} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    type="text"
                    placeholder="Buscar clientes..."
                    className="pl-11 pr-5 py-3 bg-zinc-900 border border-white/5 rounded-2xl text-xs text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all w-72"
                  />
                </div>
                <Button 
                  onClick={() => setIsClientModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl px-8 py-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-3 transition-all hover:-translate-y-0.5"
                >
                  <Plus size={20} />
                  Novo Cliente
                </Button>
              </div>
            </div>

            {clientView === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clients.map((client, idx) => (
                  <motion.div 
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-[#0f0f12] rounded-3xl border border-white/5 p-6 shadow-sm hover:shadow-2xl hover:border-amber-500/30 transition-all relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center text-amber-500 text-2xl font-bold font-display border border-white/5">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate font-display tracking-tight">{client.name}</h4>
                        <p className="text-xs text-zinc-500 mt-1 font-medium">{client.phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Agendamentos</p>
                        <p className="text-lg font-bold text-white mt-1.5">{client.appointments?.length || 0}</p>
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Comandas</p>
                        <p className="text-lg font-bold text-amber-500 mt-1.5">{client.comandas?.length || 0}</p>
                      </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                      <Button variant="outline" className="flex-1 rounded-2xl text-[10px] font-bold border-white/5 text-zinc-400 hover:bg-white/5 hover:text-white py-5">Ver Perfil</Button>
                      <Button variant="outline" className="flex-1 rounded-2xl text-[10px] font-bold border-white/5 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/20 py-5">Agendar</Button>
                    </div>
                  </motion.div>
                ))}
                {clients.length === 0 && (
                  <div className="col-span-full py-24 bg-zinc-900/30 rounded-[40px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-500">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold text-zinc-400">Nenhum cliente cadastrado.</p>
                    <p className="text-xs mt-1 font-medium">Clique no botão acima para começar.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0f0f12] rounded-3xl border border-white/5 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/50 border-b border-white/5">
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Contato</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Agendamentos</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(client => (
                      <tr key={client.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-xs font-bold text-amber-500 border border-white/5">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-white">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-xs text-zinc-400 font-medium">{client.phone}</td>
                        <td className="px-8 py-5 text-xs font-bold text-white">{client.appointments?.length || 0}</td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2.5 bg-zinc-900 hover:bg-amber-500 text-zinc-500 hover:text-zinc-950 rounded-xl transition-all"><Edit2 size={16}/></button>
                            <button className="p-2.5 bg-zinc-900 hover:bg-red-500 text-zinc-500 hover:text-white rounded-xl transition-all"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-24 text-center text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum cliente cadastrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comandas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                title="Comandas Abertas" 
                value={comandas.filter(c => c.status === 'open').length} 
                icon={FileText} 
                trend={{ value: 12, isUp: true }}
                description="Aguardando pagamento"
              />
              <StatCard 
                title="Total em Aberto" 
                value={`R$ ${comandas.filter(c => c.status === 'open').reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}`} 
                icon={DollarSign} 
                trend={{ value: 8, isUp: true }}
                description="Valor a receber"
              />
              <StatCard 
                title="Comandas Pagas (Hoje)" 
                value={comandas.filter(c => c.status === 'paid').length} 
                icon={CheckCircle} 
                trend={{ value: 5, isUp: true }}
                description="Finalizadas hoje"
              />
            </div>

            <div className="bg-[#0f0f12] rounded-3xl border border-white/5 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/30">
                <div>
                  <h3 className="text-lg font-bold text-white font-display tracking-tight">Comandas em Aberto</h3>
                  <p className="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-widest font-bold">Gerenciamento de pagamentos</p>
                </div>
                <Button 
                  onClick={() => setIsComandaModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl px-8 py-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-3 transition-all hover:-translate-y-0.5"
                >
                  <Plus size={20} />
                  Nova Comanda
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/50 border-b border-white/5">
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Serviços</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Valor</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandas.map((c, idx) => (
                      <motion.tr 
                        key={c.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-xs font-bold text-amber-500 border border-white/5">
                              {c.client.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-white">{c.client.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {c.appointments.map((a: any, i: number) => (
                              <span key={i} className="text-[9px] font-bold bg-zinc-900 text-zinc-400 px-2.5 py-1 rounded-lg border border-white/5">
                                {a.service.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-white">R$ {c.total.toFixed(2)}</td>
                        <td className="px-8 py-5">
                          <span className={cn(
                            "text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest",
                            c.status === 'open' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          )}>
                            {c.status === 'open' ? 'Em Aberto' : 'Pago'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Button size="xs" className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-xl text-[10px] font-bold px-6 py-4">Pagar</Button>
                            <button className="p-2.5 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all"><MoreVertical size={16}/></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {comandas.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-24 text-center text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhuma comanda encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-5xl space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-[#0f0f12] p-10 rounded-[40px] border border-white/5 shadow-sm space-y-10">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 shadow-sm border border-amber-500/20">
                    <Clock size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-display tracking-tight">Horário de Funcionamento</h3>
                    <p className="text-xs text-zinc-500 font-medium">Defina os horários que o studio estará aberto</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {workingHours.map(wh => (
                    <div key={wh.id} className="flex items-center justify-between py-5 border-b border-white/5 last:border-0 group">
                      <span className="text-xs font-bold text-zinc-400 w-28 group-hover:text-amber-500 transition-colors uppercase tracking-widest">
                        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][wh.dayOfWeek]}
                      </span>
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "flex items-center gap-3 transition-all",
                          !wh.isOpen && "opacity-20 pointer-events-none grayscale"
                        )}>
                          <input type="text" defaultValue={wh.startTime} className="w-20 text-xs p-3 bg-zinc-900 border border-white/5 rounded-xl text-center font-bold text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                          <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">às</span>
                          <input type="text" defaultValue={wh.endTime} className="w-20 text-xs p-3 bg-zinc-900 border border-white/5 rounded-xl text-center font-bold text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={wh.isOpen} className="sr-only peer" readOnly />
                          <div className="w-12 h-7 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-zinc-400 after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-zinc-950 peer-checked:after:border-transparent shadow-inner"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-[20px] py-8 font-bold shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5">
                  Salvar Horários
                </Button>
              </div>

              <div className="space-y-8">
                <div className="bg-[#0f0f12] p-10 rounded-[40px] border border-white/5 shadow-sm space-y-8">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-zinc-900 rounded-2xl text-zinc-400 border border-white/5">
                      <Settings size={28} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white font-display tracking-tight">Configurações Gerais</h3>
                      <p className="text-xs text-zinc-500 font-medium">Informações básicas do seu studio</p>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome do Studio</label>
                      <input type="text" defaultValue="Studio Elite" className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl font-bold text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone de Contato</label>
                      <input type="text" defaultValue="(11) 99999-9999" className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl font-bold text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Endereço</label>
                      <input type="text" defaultValue="Rua das Flores, 123 - Centro" className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl font-bold text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full rounded-[20px] py-8 font-bold border-white/5 text-zinc-400 hover:bg-white/5 hover:text-white transition-all">
                    Atualizar Perfil
                  </Button>
                </div>

                <div className="bg-red-500/5 p-8 rounded-[40px] border border-red-500/10 space-y-5">
                  <div className="flex items-center gap-4 text-red-500">
                    <div className="p-3 bg-red-500/10 rounded-xl">
                      <Trash2 size={24} />
                    </div>
                    <h4 className="text-base font-bold font-display tracking-tight">Zona de Perigo</h4>
                  </div>
                  <p className="text-[11px] text-red-500/60 leading-relaxed font-bold uppercase tracking-wide">
                    Ações nesta área são irreversíveis. Tenha cuidado ao excluir dados do sistema.
                  </p>
                  <Button variant="outline" className="w-full rounded-2xl py-4 text-[10px] font-bold border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest">
                    Limpar Banco de Dados
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  </div>
</main>

      {/* Modals */}
      <Modal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={newService.type === 'service' ? "Novo Serviço" : "Novo Pacote"}>
        <div className="space-y-6">
          <div className="flex gap-2 p-1.5 bg-zinc-900 rounded-2xl border border-white/5">
            <button 
              onClick={() => setNewService({ ...newService, type: 'service' })}
              className={cn("flex-1 py-2.5 text-[10px] font-bold rounded-xl transition-all", newService.type === 'service' ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20" : "text-zinc-500 hover:text-white")}
            >
              SERVIÇO
            </button>
            <button 
              onClick={() => setNewService({ ...newService, type: 'package' })}
              className={cn("flex-1 py-2.5 text-[10px] font-bold rounded-xl transition-all", newService.type === 'package' ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20" : "text-zinc-500 hover:text-white")}
            >
              PACOTE
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome</label>
            <input 
              type="text" 
              className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" 
              placeholder={newService.type === 'service' ? "Ex: Corte Degradê" : "Ex: Pacote 5 Cortes"} 
              value={newService.name}
              onChange={e => setNewService({ ...newService, name: e.target.value })}
            />
          </div>

          {newService.type === 'package' && (
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Serviços Inclusos</label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  onChange={(e) => handleAddServiceToPackage(e.target.value)}
                  value=""
                >
                  <option value="" disabled className="bg-[#0f0f12]">Adicionar serviço...</option>
                  {services.filter(s => s.type === 'service').map(s => (
                    <option key={s.id} value={s.id} className="bg-[#0f0f12]">{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {newService.includedServices.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-white">{s.name}</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        className="w-10 text-[10px] p-1.5 bg-zinc-900 border border-white/5 rounded-lg text-center text-white font-bold" 
                        value={s.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setNewService(prev => ({
                            ...prev,
                            includedServices: prev.includedServices.map(item => 
                              item.id === s.id ? { ...item, quantity: val } : item
                            )
                          }));
                        }}
                      />
                      <button 
                        onClick={() => setNewService(prev => ({
                          ...prev,
                          includedServices: prev.includedServices.filter(item => item.id !== s.id)
                        }))}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Preço Base (R$)</label>
              <input 
                type="number" 
                className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" 
                placeholder="0.00" 
                value={newService.price}
                onChange={e => setNewService({ ...newService, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Duração (min)</label>
              <input 
                type="number" 
                className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" 
                placeholder="30" 
                value={newService.duration}
                onChange={e => setNewService({ ...newService, duration: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Desconto</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="flex-1 text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" 
                  placeholder="0" 
                  value={newService.discount}
                  onChange={e => setNewService({ ...newService, discount: e.target.value })}
                />
                <select 
                  className="w-20 text-[10px] p-2 bg-zinc-900 border border-white/5 rounded-2xl text-white font-bold"
                  value={newService.discountType}
                  onChange={e => setNewService({ ...newService, discountType: e.target.value as any })}
                >
                  <option value="value" className="bg-[#0f0f12]">R$</option>
                  <option value="percentage" className="bg-[#0f0f12]">%</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Preço Final</label>
              <div className="w-full text-sm p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl font-bold text-amber-500 flex items-center justify-center">
                R$ {(() => {
                  const p = parseFloat(newService.price) || 0;
                  const d = parseFloat(newService.discount) || 0;
                  if (newService.discountType === 'percentage') {
                    return (p * (1 - d / 100)).toFixed(2);
                  }
                  return (p - d).toFixed(2);
                })()}
              </div>
            </div>
          </div>

          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl py-7 font-bold shadow-lg shadow-amber-500/20 transition-all" onClick={handleCreateService} disabled={!newService.name || !newService.price}>
            {newService.type === 'service' ? "Criar Serviço" : "Criar Pacote"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isAppointmentModalOpen} onClose={() => setIsAppointmentModalOpen(false)} title="Novo Agendamento">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Data</label>
              <div className="text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl font-bold text-white flex items-center gap-3">
                <CalendarDays size={16} className="text-amber-500" />
                {format(newAppointment.date, "dd/MM/yyyy")}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Horário</label>
              <input 
                type="time" 
                className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold" 
                value={newAppointment.startTime}
                onChange={e => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Cliente</label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold" 
                  placeholder="Nome do cliente..."
                  value={newAppointment.clientName}
                  onChange={e => handleSearchClientByName(e.target.value)}
                />
                {clientSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-[#1a1a1e] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto mt-2 custom-scrollbar p-2">
                    {clientSearchResults.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setNewAppointment({ 
                            ...newAppointment, 
                            clientId: c.id, 
                            clientName: c.name, 
                            clientPhone: c.phone,
                            comandaId: c.comandas?.[0]?.id || null 
                          });
                          setClientSearchResults([]);
                        }}
                        className="w-full text-left px-4 py-3 text-xs hover:bg-white/5 rounded-xl transition-all border-b border-white/5 last:border-0"
                      >
                        <p className="font-bold text-white">{c.name}</p>
                        <p className="text-zinc-500 text-[10px] font-medium mt-0.5">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button className="bg-zinc-900 hover:bg-white/5 text-amber-500 border border-white/5 rounded-2xl px-5" onClick={() => setIsClientModalOpen(true)}>
                <Plus size={20} />
              </Button>
            </div>
            {newAppointment.clientId && (
              <p className="text-[9px] text-emerald-500 font-bold mt-2 flex items-center gap-1.5 ml-1 uppercase tracking-wider">
                <CheckCircle size={12} /> Cliente selecionado: {newAppointment.clientPhone}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Profissional</label>
              <select 
                className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold"
                value={newAppointment.professionalId}
                onChange={e => setNewAppointment({ ...newAppointment, professionalId: e.target.value })}
              >
                <option value="" className="bg-[#0f0f12]">Selecionar...</option>
                {professionals.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0f0f12]">{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Serviço/Pacote</label>
              <select 
                className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold"
                value={newAppointment.serviceId}
                onChange={e => {
                  const s = services.find(item => item.id === e.target.value);
                  setNewAppointment({ ...newAppointment, serviceId: e.target.value, recurrence: { ...newAppointment.recurrence, count: s?.type === 'package' ? 4 : 1 } });
                }}
              >
                <option value="" className="bg-[#0f0f12]">Selecionar...</option>
                {services.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0f0f12]">{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-5 bg-zinc-900/50 rounded-3xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Repetições</span>
              <select 
                className="text-[10px] p-2 bg-zinc-900 border border-white/5 rounded-xl text-white font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
                value={newAppointment.recurrence.type}
                onChange={e => setNewAppointment({ ...newAppointment, recurrence: { ...newAppointment.recurrence, type: e.target.value } })}
              >
                <option value="none" className="bg-[#0f0f12]">Nenhuma</option>
                <option value="weekly" className="bg-[#0f0f12]">Semanal</option>
                <option value="biweekly" className="bg-[#0f0f12]">Quinzenal</option>
                <option value="custom" className="bg-[#0f0f12]">Personalizado</option>
              </select>
            </div>
            {newAppointment.recurrence.type !== 'none' && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Repetir</span>
                <input 
                  type="number" 
                  className="w-16 text-xs p-2 bg-zinc-900 border border-white/5 rounded-xl text-center text-white font-bold" 
                  value={newAppointment.recurrence.count}
                  onChange={e => setNewAppointment({ ...newAppointment, recurrence: { ...newAppointment.recurrence, count: parseInt(e.target.value) } })}
                />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">vezes</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              {newAppointment.comandaId ? "Comanda Vinculada" : "Sem Comanda Vinculada"}
            </span>
            {!newAppointment.comandaId && (
              <Button size="xs" variant="outline" className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10 rounded-xl px-4 text-[9px] font-bold uppercase tracking-widest">Criar Comanda</Button>
            )}
          </div>

          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl py-7 font-bold shadow-lg shadow-amber-500/20 transition-all" onClick={handleCreateAppointment} disabled={!newAppointment.clientName || !newAppointment.serviceId}>
            Confirmar Agendamento
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isComandaModalOpen} onClose={() => setIsComandaModalOpen(false)} title="Nova Comanda">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone do Cliente</label>
            <input 
              type="tel" 
              className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold" 
              placeholder="(00) 00000-0000"
              value={newComanda.clientPhone}
              onChange={e => setNewComanda({ ...newComanda, clientPhone: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Adicionar Itens</label>
            <select 
              className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold"
              onChange={(e) => handleAddServiceToComanda(e.target.value)}
              value=""
            >
              <option value="" disabled className="bg-[#0f0f12]">Selecionar serviço ou pacote...</option>
              {services.map(s => (
                <option key={s.id} value={s.id} className="bg-[#0f0f12]">{s.name} - R$ {s.price}</option>
              ))}
            </select>
            
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {newComanda.items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-white">{item.name}</span>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">R$ {item.price} un.</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      className="w-12 text-xs p-2 bg-zinc-900 border border-white/5 rounded-xl text-center text-white font-bold" 
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setNewComanda(prev => ({
                          ...prev,
                          items: prev.items.map(i => i.id === item.id ? { ...i, quantity: val } : i)
                        }));
                      }}
                    />
                    <button 
                      onClick={() => setNewComanda(prev => ({
                        ...prev,
                        items: prev.items.filter(i => i.id !== item.id)
                      }))}
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Desconto Extra</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  className="flex-1 text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold" 
                  value={newComanda.discount}
                  onChange={e => setNewComanda({ ...newComanda, discount: e.target.value })}
                />
                <select 
                  className="w-20 text-[10px] p-2 bg-zinc-900 border border-white/5 rounded-2xl text-white font-bold"
                  value={newComanda.discountType}
                  onChange={e => setNewComanda({ ...newComanda, discountType: e.target.value as any })}
                >
                  <option value="value" className="bg-[#0f0f12]">R$</option>
                  <option value="percentage" className="bg-[#0f0f12]">%</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Total a Pagar</label>
              <div className="w-full text-sm p-4 bg-amber-500 text-zinc-950 rounded-2xl font-bold flex items-center justify-center shadow-lg shadow-amber-500/10">
                R$ {(() => {
                  const subtotal = newComanda.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                  const d = parseFloat(newComanda.discount) || 0;
                  if (newComanda.discountType === 'percentage') {
                    return (subtotal * (1 - d / 100)).toFixed(2);
                  }
                  return (subtotal - d).toFixed(2);
                })()}
              </div>
            </div>
          </div>

          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl py-7 font-bold shadow-lg shadow-amber-500/20 transition-all" onClick={handleCreateComanda} disabled={!newComanda.clientPhone || newComanda.items.length === 0}>
            Salvar Comanda e Finalizar
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Novo Cliente">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
            <input 
              type="text" 
              className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold" 
              placeholder="Ex: João Silva" 
              value={newClient.name}
              onChange={e => setNewClient({ ...newClient, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone</label>
              <input 
                type="tel" 
                className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold" 
                placeholder="(00) 00000-0000" 
                value={newClient.phone}
                onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Idade (Opcional)</label>
              <input 
                type="number" 
                className="w-full text-xs p-4 bg-zinc-900 border border-white/5 rounded-2xl text-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold" 
                placeholder="25" 
                value={newClient.age}
                onChange={e => setNewClient({ ...newClient, age: e.target.value })}
              />
            </div>
          </div>
          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl py-7 font-bold shadow-lg shadow-amber-500/20 transition-all" onClick={handleCreateClient} disabled={!newClient.name || !newClient.phone}>
            Cadastrar Cliente
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all relative group",
        active 
          ? "bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20" 
          : "text-zinc-500 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute right-2 w-1.5 h-1.5 bg-zinc-950 rounded-full"
        />
      )}
    </button>
  );
}

function StatCard({ title, value, icon: Icon, trend, description }: { 
  title: string, 
  value: string | number, 
  icon: any, 
  trend?: { value: number, isUp: boolean },
  description?: string
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0f0f12] p-6 rounded-3xl shadow-sm border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="p-3 bg-zinc-900 rounded-2xl group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-300 shadow-sm border border-white/5">
          <Icon size={20} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-sm border",
            trend.isUp ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
          )}>
            {trend.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white font-display tracking-tight">{value}</h3>
        {description && <p className="text-[10px] text-zinc-600 mt-2 font-medium flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          {description}
        </p>}
      </div>
    </motion.div>
  );
}
