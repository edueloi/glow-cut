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
  Banknote,
  Package,
  Star,
  Zap,
  FileText,
  Trash2,
  UserCog,
  Eye,
  EyeOff,
  Edit2,
  XCircle
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
  const [activeTab, setActiveTab] = useState<"dash" | "agenda" | "services" | "clients" | "comandas" | "fluxo" | "settings" | "professionals">("dash");
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
  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<any>(null);
  const [newProfessional, setNewProfessional] = useState({ name: "", role: "", password: "", showPassword: false });
  const [profPasswordVisible, setProfPasswordVisible] = useState(false);
  
  // Tooltip hover state for agenda
  const [hoveredAppointment, setHoveredAppointment] = useState<string | null>(null);
  // Client comanda status for appointment modal
  const [clientComandaStatus, setClientComandaStatus] = useState<"none" | "open" | "paid" | null>(null);

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
    comandaId: "" as string | null,
    type: "atendimento" as "atendimento" | "bloqueio" | "pessoal"
  });

  // New Comanda State
  const [newComanda, setNewComanda] = useState({
    clientPhone: "",
    clientName: "",
    items: [] as { id: string, name: string, price: number, quantity: number }[],
    discount: "0",
    discountType: "value" as "value" | "percentage",
    paymentMethod: "cash" as "cash" | "card" | "pix" | "transfer"
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
    let clientId = newAppointment.clientId;

    // Only require client for regular atendimento
    if (newAppointment.type === 'atendimento') {
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
    }

    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAppointment, clientId: clientId || undefined })
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
      comandaId: null,
      type: "atendimento"
    });
    setClientComandaStatus(null);
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
    setNewAppointment(prev => ({ ...prev, clientName: name, clientId: "", clientPhone: "" }));
    setClientComandaStatus(null);
    if (name.length > 2) {
      const res = await fetch(`/api/clients/search?name=${name}`);
      const data = await res.json();
      setClientSearchResults(data || []);
    } else {
      setClientSearchResults([]);
    }
  };

  const handleSelectClientForAppointment = (c: any) => {
    const openComanda = c.comandas?.find((com: any) => com.status === "open");
    const paidComanda = c.comandas?.find((com: any) => com.status === "paid");
    setClientComandaStatus(openComanda ? "open" : paidComanda ? "paid" : "none");
    setNewAppointment(prev => ({
      ...prev,
      clientId: c.id,
      clientName: c.name,
      clientPhone: c.phone,
      comandaId: openComanda?.id || null
    }));
    setClientSearchResults([]);
  };
  
  // Service editing
  const [editingService, setEditingService] = useState<any>(null);

  // New Service/Package State
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    type: "service" as "service" | "package",
    discount: "0",
    discountType: "value" as "value" | "percentage",
    includedServices: [] as { id: string, name: string, quantity: number }[]
  });

  // Comanda detail view
  const [selectedComanda, setSelectedComanda] = useState<any>(null);
  const [isComandaDetailOpen, setIsComandaDetailOpen] = useState(false);

  // Theme color
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('themeColor') || 'amber');

  const themeColors = [
    { value: 'amber', label: 'Âmbar', hex: '#f59e0b', light: '#fef3c7', border: '#fcd34d' },
    { value: 'emerald', label: 'Esmeralda', hex: '#10b981', light: '#d1fae5', border: '#6ee7b7' },
    { value: 'blue', label: 'Azul', hex: '#3b82f6', light: '#dbeafe', border: '#93c5fd' },
    { value: 'violet', label: 'Violeta', hex: '#8b5cf6', light: '#ede9fe', border: '#c4b5fd' },
    { value: 'rose', label: 'Rosa', hex: '#f43f5e', light: '#ffe4e6', border: '#fda4af' },
    { value: 'zinc', label: 'Carvão', hex: '#18181b', light: '#f4f4f5', border: '#a1a1aa' },
  ];

  const handleThemeChange = (color: string) => {
    setThemeColor(color);
    localStorage.setItem('themeColor', color);
  };

  const currentTheme = themeColors.find(c => c.value === themeColor) || themeColors[0];

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
    if (editingService) {
      await fetch(`/api/services/${editingService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService)
      });
    } else {
      await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService)
      });
    }
    setIsServiceModalOpen(false);
    setEditingService(null);
    setNewService({ name: "", description: "", price: "", duration: "", type: "service", discount: "0", discountType: "value", includedServices: [] });
    fetch("/api/services").then(res => res.json()).then(setServices);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    fetch("/api/services").then(res => res.json()).then(setServices);
  };

  const handlePayComanda = async (comanda: any) => {
    await fetch(`/api/comandas/${comanda.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" })
    });
    fetch("/api/comandas").then(res => res.json()).then(setComandas);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'clients') {
      fetch("/api/clients").then(res => res.json()).then(setClients);
    }
    if (tab === 'services') {
      fetch("/api/services").then(res => res.json()).then(setServices);
    }
    if (tab === 'comandas' || tab === 'fluxo') {
      fetch("/api/comandas").then(res => res.json()).then(setComandas);
    }
    if (tab === 'agenda') {
      fetchAppointments();
    }
    if (tab === 'professionals') {
      fetch("/api/professionals").then(res => res.json()).then(setProfessionals);
    }
  };

  const handleCreateProfessional = async () => {
    const url = editingProfessional ? `/api/professionals/${editingProfessional.id}` : "/api/professionals";
    const method = editingProfessional ? "PUT" : "POST";
    const body: any = { name: newProfessional.name, role: newProfessional.role };
    if (newProfessional.password) body.password = newProfessional.password;
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setIsProfessionalModalOpen(false);
    setEditingProfessional(null);
    setNewProfessional({ name: "", role: "", password: "", showPassword: false });
    fetch("/api/professionals").then(res => res.json()).then(setProfessionals);
  };

  const handleDeleteProfessional = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este profissional?")) return;
    await fetch(`/api/professionals/${id}`, { method: "DELETE" });
    fetch("/api/professionals").then(res => res.json()).then(setProfessionals);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-700 font-sans selection:bg-amber-500/30">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-zinc-200 flex flex-col z-20 shadow-sm">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Scissors className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-zinc-900 tracking-tighter font-display leading-none uppercase">ELITE</h1>
              <p className="text-[10px] text-amber-500 font-bold tracking-[0.2em] uppercase mt-1">Studio Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide">
          <div className="px-4 mb-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Principal</p>
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
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Operacional</p>
          </div>
          <NavItem
            active={activeTab === 'comandas'}
            onClick={() => handleTabChange('comandas')}
            icon={<CheckCircle size={18} />}
            label="Comandas"
          />
          <NavItem
            active={activeTab === 'fluxo'}
            onClick={() => handleTabChange('fluxo')}
            icon={<Banknote size={18} />}
            label="Fluxo de Caixa"
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
          <NavItem
            active={activeTab === 'professionals'}
            onClick={() => handleTabChange('professionals')}
            icon={<UserCog size={18} />}
            label="Profissionais"
          />

          <div className="px-4 mt-8 mb-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sistema</p>
          </div>
          <NavItem
            active={activeTab === 'settings'}
            onClick={() => handleTabChange('settings')}
            icon={<Settings size={18} />}
            label="Configurações"
          />
        </nav>

        <div className="p-4 mt-auto border-t border-zinc-200">
          <div className="bg-zinc-50 rounded-2xl p-4 flex items-center gap-3 mb-4 border border-zinc-200">
            <div className="w-10 h-10 rounded-xl bg-zinc-200 flex items-center justify-center text-zinc-500">
              <Users size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-800 truncate">Admin Studio</p>
              <p className="text-[10px] text-zinc-400 truncate">edueloi.EE@gmail.com</p>
            </div>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 font-display capitalize tracking-tight">
              {activeTab === 'dash' ? 'Painel de Controle' :
               activeTab === 'agenda' ? 'Agenda de Atendimentos' :
               activeTab === 'services' ? 'Serviços & Pacotes' :
               activeTab === 'clients' ? 'Meus Clientes' :
               activeTab === 'comandas' ? 'Comandas' :
               activeTab === 'fluxo' ? 'Fluxo de Caixa' :
               activeTab === 'professionals' ? 'Profissionais' : 'Configurações'}
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente ou serviço..."
                className="pl-10 pr-4 py-2 bg-zinc-100 border border-zinc-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 rounded-xl text-xs w-64 transition-all outline-none text-zinc-700"
              />
            </div>

            <button className="p-2.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-8 w-px bg-zinc-100 mx-2"></div>
            
            {activeTab === 'services' && (
              <Button size="sm" onClick={() => {
                setNewService({
                  name: "",
                  description: "",
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
            {activeTab === 'professionals' && (
              <Button size="sm" onClick={() => { setEditingProfessional(null); setNewProfessional({ name: "", role: "", password: "", showPassword: false }); setIsProfessionalModalOpen(true); }} className="rounded-xl shadow-lg shadow-amber-500/20">
                <Plus size={16} className="mr-2" /> Novo Profissional
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
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                {(['day', 'week', 'month'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider",
                      view === v ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    )}
                  >
                    {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 transition-all shadow-sm uppercase tracking-wider"
                >
                  Hoje
                </button>
                <div className="flex items-center gap-1 bg-white border border-zinc-200 p-1 rounded-xl shadow-sm">
                  <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors"><ChevronLeft size={16}/></button>
                  <span className="text-xs font-bold text-zinc-800 px-3 min-w-[130px] text-center uppercase tracking-widest">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</span>
                  <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors"><ChevronRight size={16}/></button>
                </div>
                <Button
                  onClick={() => setIsAppointmentModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 font-bold shadow-sm flex items-center gap-2"
                >
                  <Plus size={16} />
                  Novo Agendamento
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col">
              <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Atendimento</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bloqueio</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pessoal</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-zinc-400" />
                  <select
                    value={selectedProfessional}
                    onChange={e => setSelectedProfessional(e.target.value)}
                    className="text-[10px] font-bold bg-transparent text-zinc-600 outline-none cursor-pointer uppercase tracking-widest"
                  >
                    <option value="all">Todos Profissionais</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-auto scrollbar-hide">
                {view === 'day' && (
                  <div className="flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg", isToday(currentMonth) ? "bg-amber-500 text-white" : "bg-white border border-zinc-200 text-zinc-800")}>
                        {format(currentMonth, 'd')}
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 capitalize">{format(currentMonth, "EEEE", { locale: ptBR })}</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{format(currentMonth, "MMMM yyyy", { locale: ptBR })}</p>
                      </div>
                      <div className="ml-auto text-[10px] font-bold text-zinc-400">
                        {appointments.filter(a => isSameDay(new Date(a.date), currentMonth)).length} agendamentos
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-zinc-50">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const hour = i + 8;
                        const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                        const dayApps = appointments.filter(a => isSameDay(new Date(a.date), currentMonth) && a.startTime === hourStr);
                        return (
                          <div key={hour} className="flex gap-4 px-6 py-3 hover:bg-zinc-50/50 transition-colors group">
                            <div className="w-14 shrink-0 text-right">
                              <span className="text-[10px] font-bold text-zinc-400">{hourStr}</span>
                            </div>
                            <div className="flex-1 min-h-[52px] flex flex-col gap-2">
                              {dayApps.length === 0 ? (
                                <button
                                  onClick={() => { setNewAppointment(prev => ({ ...prev, date: currentMonth, startTime: hourStr })); setIsAppointmentModalOpen(true); }}
                                  className="w-full h-[40px] border-2 border-dashed border-zinc-200 rounded-xl text-[10px] font-bold text-zinc-300 hover:border-amber-300 hover:text-amber-400 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  + Adicionar
                                </button>
                              ) : (
                                dayApps.map(app => (
                                  <div
                                    key={app.id}
                                    onMouseEnter={() => setHoveredAppointment(app.id)}
                                    onMouseLeave={() => setHoveredAppointment(null)}
                                    className={cn(
                                      "relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-default",
                                      app.type === 'bloqueio' ? "bg-red-50 border-red-200" :
                                      app.type === 'pessoal' ? "bg-blue-50 border-blue-200" :
                                      "bg-amber-50 border-amber-200"
                                    )}
                                  >
                                    <div className={cn("w-1 self-stretch rounded-full shrink-0",
                                      app.type === 'bloqueio' ? "bg-red-400" :
                                      app.type === 'pessoal' ? "bg-blue-400" : "bg-amber-400"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-black text-zinc-900 truncate">
                                        {app.type === 'bloqueio' ? '🚫 Horário Bloqueado' : app.type === 'pessoal' ? '👤 Compromisso Pessoal' : app.client?.name}
                                      </p>
                                      {app.type === 'atendimento' && app.service && (
                                        <p className="text-[10px] text-zinc-500 font-bold mt-0.5 truncate">{app.service.name}</p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-[10px] font-bold text-zinc-500">{app.startTime}–{app.endTime}</p>
                                      {app.professional && <p className="text-[9px] text-zinc-400">{app.professional.name.split(' ')[0]}</p>}
                                    </div>
                                    {hoveredAppointment === app.id && app.type === 'atendimento' && app.comanda && (
                                      <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-200 uppercase tracking-wide shrink-0">
                                        Comanda
                                      </span>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {view === 'month' && (
                  <div className="grid grid-cols-7 h-full">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="p-3 text-[10px] font-bold text-zinc-400 text-center border-b border-r border-zinc-100 uppercase tracking-widest bg-zinc-50">{day}</div>
                    ))}
                    {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                      <div key={`pad-${i}`} className="h-32 border-r border-b border-zinc-100 bg-zinc-50/50 opacity-50" />
                    ))}
                    {daysInMonth.map((day, idx) => {
                      const dayAppointments = appointments.filter(a => isSameDay(new Date(a.date), day));
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "min-h-[120px] p-3 border-b border-r border-zinc-100 transition-colors hover:bg-zinc-50 relative group",
                            !isSameMonth(day, currentMonth) && "bg-zinc-50/50 opacity-40",
                            isToday(day) && "bg-amber-50/50"
                          )}
                        >
                          <span className={cn("text-[10px] font-bold mb-2 block", isToday(day) ? "text-amber-600" : "text-zinc-500")}>
                            {format(day, 'd')}
                          </span>
                          <div className="space-y-1">
                            {dayAppointments.slice(0, 3).map(app => (
                              <div
                                key={app.id}
                                onMouseEnter={() => setHoveredAppointment(app.id)}
                                onMouseLeave={() => setHoveredAppointment(null)}
                                className={cn(
                                  "relative text-[9px] p-1.5 rounded-lg border truncate font-medium flex items-center gap-1.5 cursor-default",
                                  app.type === 'bloqueio' ? "bg-red-50 border-red-100 text-red-700" :
                                  app.type === 'pessoal' ? "bg-blue-50 border-blue-100 text-blue-700" :
                                  "bg-amber-50 border-amber-100 text-zinc-700"
                                )}
                              >
                                <div className={cn("w-1 h-1 rounded-full shrink-0",
                                  app.type === 'bloqueio' ? "bg-red-500" :
                                  app.type === 'pessoal' ? "bg-blue-500" : "bg-amber-500"
                                )} />
                                {app.startTime} {app.type === 'bloqueio' ? '🚫' : app.type === 'pessoal' ? '👤' : app.client?.name}
                                {hoveredAppointment === app.id && (
                                  <div className="absolute bottom-full left-0 mb-1 z-50 pointer-events-none">
                                    <div className="bg-zinc-900 text-white text-[10px] font-bold rounded-xl p-2.5 shadow-2xl min-w-[140px] space-y-0.5">
                                      <p className="text-amber-400 text-[9px] uppercase tracking-wider">{app.startTime} → {app.endTime}</p>
                                      {app.type === 'atendimento' ? (
                                        <>
                                          <p>{app.client?.name}</p>
                                          {app.service && <p className="text-zinc-400 text-[9px]">{app.service.name}</p>}
                                        </>
                                      ) : (
                                        <p className="text-zinc-300">{app.type === 'bloqueio' ? 'Horário bloqueado' : 'Compromisso pessoal'}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {dayAppointments.length > 3 && (
                              <div className="text-[8px] text-zinc-400 font-bold text-center mt-1 uppercase tracking-tighter">
                                +{dayAppointments.length - 3} mais
                              </div>
                            )}
                          </div>
                          <button className="absolute bottom-2 right-2 p-1 bg-zinc-100 rounded-lg text-zinc-400 opacity-0 group-hover:opacity-100 transition-all hover:text-zinc-700 border border-zinc-200">
                            <Plus size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {view === 'week' && (
                  <div className="flex flex-col h-full">
                    <div className="grid grid-cols-8 sticky top-0 z-10 bg-white border-b border-zinc-100">
                      <div className="p-4 border-r border-zinc-100" />
                      {eachDayOfInterval({
                        start: startOfWeek(currentMonth),
                        end: endOfWeek(currentMonth)
                      }).map(day => (
                        <div key={day.toString()} className={cn("p-4 text-center border-r border-zinc-100", isToday(day) && "bg-amber-50/50")}>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{format(day, 'EEE', { locale: ptBR })}</p>
                          <p className={cn("text-sm font-black", isToday(day) ? "text-amber-600" : "text-zinc-800")}>{format(day, 'd')}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const hour = i + 8;
                        return (
                          <div key={hour} className="grid grid-cols-8 border-b border-zinc-100 group">
                            <div className="p-4 text-[10px] font-bold text-zinc-400 text-right border-r border-zinc-100 bg-zinc-50/50">{hour}:00</div>
                            {Array.from({ length: 7 }).map((_, j) => {
                              const day = addDays(startOfWeek(currentMonth), j);
                              const hourStr = `${hour.toString().padStart(2, '0')}:00`;
                              const app = appointments.find(a => isSameDay(new Date(a.date), day) && a.startTime === hourStr);
                              return (
                                <div key={j} className={cn("p-1 border-r border-zinc-100 min-h-[80px] transition-colors group-hover:bg-zinc-50/30 relative", isToday(day) && "bg-amber-50/30")}>
                                  {app && (
                                    <div className="relative group/app">
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onMouseEnter={() => setHoveredAppointment(app.id)}
                                        onMouseLeave={() => setHoveredAppointment(null)}
                                        className={cn(
                                          "h-full rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all border",
                                          app.type === 'bloqueio'
                                            ? "bg-red-50 border-red-200 hover:bg-red-100"
                                            : app.type === 'pessoal'
                                            ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                                            : "bg-amber-50 border-amber-200 hover:bg-amber-100"
                                        )}
                                      >
                                        <div>
                                          <p className={cn("text-[10px] font-black leading-tight mb-1",
                                            app.type === 'bloqueio' ? "text-red-700" :
                                            app.type === 'pessoal' ? "text-blue-700" : "text-zinc-900"
                                          )}>
                                            {app.type === 'bloqueio' ? '🚫 Bloqueado' : app.type === 'pessoal' ? '👤 Pessoal' : app.client?.name}
                                          </p>
                                          {app.type === 'atendimento' && app.service && (
                                            <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter truncate">{app.service.name}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                          <span className={cn("text-[8px] font-bold",
                                            app.type === 'bloqueio' ? "text-red-400" :
                                            app.type === 'pessoal' ? "text-blue-400" : "text-zinc-500"
                                          )}>{app.startTime}–{app.endTime}</span>
                                          {app.professional && (
                                            <span className="text-[7px] font-bold text-zinc-400 truncate max-w-[50px]">{app.professional.name.split(' ')[0]}</span>
                                          )}
                                        </div>
                                      </motion.div>
                                      {/* Tooltip */}
                                      {hoveredAppointment === app.id && (
                                        <div className="absolute bottom-full left-0 mb-2 z-50 pointer-events-none">
                                          <div className="bg-zinc-900 text-white text-[10px] font-bold rounded-xl p-3 shadow-2xl min-w-[160px] space-y-1">
                                            <p className="text-amber-400 uppercase tracking-widest text-[9px]">{format(new Date(app.date), "EEEE, d MMM", { locale: ptBR })}</p>
                                            <p className="text-white">{app.startTime} → {app.endTime}</p>
                                            {app.type === 'atendimento' ? (
                                              <>
                                                <p className="text-zinc-300">{app.client?.name}</p>
                                                {app.service && <p className="text-zinc-400 text-[9px]">{app.service.name}</p>}
                                                {app.professional && <p className="text-zinc-400 text-[9px]">{app.professional.name}</p>}
                                              </>
                                            ) : (
                                              <p className="text-zinc-300">{app.type === 'bloqueio' ? 'Horário bloqueado' : 'Compromisso pessoal'}</p>
                                            )}
                                          </div>
                                          <div className="w-2 h-2 bg-zinc-900 rotate-45 ml-3 -mt-1" />
                                        </div>
                                      )}
                                    </div>
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
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Serviços</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">{services.filter(s => s.type === 'service').length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Pacotes</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">{services.filter(s => s.type === 'package').length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
                <p className="text-2xl font-black text-amber-600 mt-1">
                  R$ {services.length ? (services.reduce((a, s) => a + s.price, 0) / services.length).toFixed(0) : '0'}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Duração Média</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">
                  {services.length ? Math.round(services.reduce((a, s) => a + s.duration, 0) / services.length) : 0} min
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
                <button
                  onClick={() => setServiceSubTab('services')}
                  className={cn(
                    "px-6 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                    serviceSubTab === 'services' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  Serviços ({services.filter(s => s.type === 'service').length})
                </button>
                <button
                  onClick={() => setServiceSubTab('packages')}
                  className={cn(
                    "px-6 py-2 text-xs font-bold rounded-lg transition-all uppercase tracking-wider",
                    serviceSubTab === 'packages' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  Pacotes ({services.filter(s => s.type === 'package').length})
                </button>
              </div>
              <Button
                onClick={() => {
                  setEditingService(null);
                  setNewService({ name: "", description: "", price: "", duration: "", type: serviceSubTab === 'services' ? 'service' : 'package', discount: "0", discountType: "value", includedServices: [] });
                  setIsServiceModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Plus size={18} />
                Novo {serviceSubTab === 'services' ? 'Serviço' : 'Pacote'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.filter(s => s.type === (serviceSubTab === 'services' ? 'service' : 'package')).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white rounded-3xl border border-zinc-200 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all relative overflow-hidden flex flex-col"
                >
                  {/* Top color strip */}
                  <div className={cn("h-1.5 w-full", item.type === 'package' ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-amber-300 to-amber-500")} />

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                        item.type === 'package' ? "bg-orange-50 border border-orange-200 text-orange-500" : "bg-amber-50 border border-amber-200 text-amber-600"
                      )}>
                        {item.type === 'package' ? <Package size={22} /> : <Scissors size={22} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-zinc-900 leading-tight">{item.name}</h4>
                        {item.description && <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed line-clamp-2">{item.description}</p>}
                      </div>
                    </div>

                    {/* Price row */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Valor</p>
                        <p className="text-base font-black text-zinc-900 mt-0.5">R$ {item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex-1 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Duração</p>
                        <p className="text-base font-black text-zinc-900 mt-0.5 flex items-center gap-1"><Clock size={13} className="text-amber-500" />{item.duration}min</p>
                      </div>
                      {(item.discount > 0) && (
                        <div className="flex-1 bg-green-50 rounded-xl p-3 border border-green-100">
                          <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest">Desconto</p>
                          <p className="text-base font-black text-green-600 mt-0.5">{item.discountType === 'percentage' ? `${item.discount}%` : `R$ ${item.discount}`}</p>
                        </div>
                      )}
                    </div>

                    {/* Package items */}
                    {item.type === 'package' && item.packageServices?.length > 0 && (
                      <div className="mb-4 p-3 bg-orange-50 rounded-2xl border border-orange-100">
                        <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest mb-2">Incluído no pacote</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.packageServices.map((ps: any, i: number) => (
                            <span key={i} className="text-[9px] font-bold bg-white text-orange-600 px-2.5 py-1 rounded-lg border border-orange-200">
                              {ps.quantity}x {ps.service.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Final price if discounted */}
                    {item.discount > 0 && (
                      <div className="mb-4 flex items-center justify-between px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Preço Final</span>
                        <span className="text-sm font-black text-amber-700">
                          R$ {item.discountType === 'percentage'
                            ? (item.price * (1 - item.discount / 100)).toFixed(2)
                            : (item.price - item.discount).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="mt-auto flex gap-2">
                      <button
                        onClick={() => {
                          setEditingService(item);
                          setNewService({
                            name: item.name,
                            description: item.description || "",
                            price: item.price.toString(),
                            duration: item.duration.toString(),
                            type: item.type,
                            discount: (item.discount || 0).toString(),
                            discountType: item.discountType || "value",
                            includedServices: item.packageServices?.map((ps: any) => ({ id: ps.serviceId, name: ps.service.name, quantity: ps.quantity })) || []
                          });
                          setIsServiceModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                      >
                        <Edit2 size={13} /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteService(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
                      >
                        <Trash2 size={13} /> Excluir
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {services.filter(s => s.type === (serviceSubTab === 'services' ? 'service' : 'package')).length === 0 && (
                <div className="col-span-full py-24 bg-white rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
                  {serviceSubTab === 'services' ? <Scissors size={48} className="mb-4 opacity-20" /> : <Package size={48} className="mb-4 opacity-20" />}
                  <p className="text-sm font-bold text-zinc-500">Nenhum {serviceSubTab === 'services' ? 'serviço' : 'pacote'} cadastrado.</p>
                  <p className="text-xs mt-1 font-medium">Clique no botão acima para começar.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
                <button
                  onClick={() => setClientView('grid')}
                  className={cn("p-2 rounded-lg transition-all", clientView === 'grid' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setClientView('list')}
                  className={cn("p-2 rounded-lg transition-all", clientView === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
                >
                  <List size={18} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar clientes..."
                    className="pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all w-64"
                  />
                </div>
                <Button
                  onClick={() => setIsClientModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 font-bold shadow-sm flex items-center gap-2"
                >
                  <Plus size={16} />
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
                    className="group bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-zinc-900 truncate">{client.name}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5 font-medium">{client.phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Agendamentos</p>
                        <p className="text-lg font-black text-zinc-900 mt-1">{client.appointments?.length || 0}</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                        <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Comandas</p>
                        <p className="text-lg font-black text-amber-600 mt-1">{client.comandas?.length || 0}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 py-2 rounded-xl text-[10px] font-bold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all">Ver Perfil</button>
                      <button className="flex-1 py-2 rounded-xl text-[10px] font-bold border border-amber-200 text-amber-600 hover:bg-amber-50 transition-all">Agendar</button>
                    </div>
                  </motion.div>
                ))}
                {clients.length === 0 && (
                  <div className="col-span-full py-24 bg-white rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
                    <Users size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold text-zinc-500">Nenhum cliente cadastrado.</p>
                    <p className="text-xs mt-1 font-medium">Clique no botão acima para começar.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Contato</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Agendamentos</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(client => (
                      <tr key={client.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-bold text-amber-600">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-zinc-900">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500 font-medium">{client.phone}</td>
                        <td className="px-6 py-4 text-xs font-bold text-zinc-700">{client.appointments?.length || 0}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-zinc-100 hover:bg-amber-500 hover:text-white text-zinc-500 rounded-lg transition-all"><Edit2 size={14}/></button>
                            <button className="p-2 bg-zinc-100 hover:bg-red-500 hover:text-white text-zinc-500 rounded-lg transition-all"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {clients.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-24 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">Nenhum cliente cadastrado.</td>
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
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Em Aberto</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{comandas.filter(c => c.status === 'open').length}</p>
                <p className="text-[10px] text-zinc-400 mt-1">comandas aguardando</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">A Receber</p>
                <p className="text-2xl font-black text-red-500 mt-1">R$ {comandas.filter(c => c.status === 'open').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
                <p className="text-[10px] text-zinc-400 mt-1">valor pendente</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pagas</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{comandas.filter(c => c.status === 'paid').length}</p>
                <p className="text-[10px] text-zinc-400 mt-1">finalizadas</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Recebido</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">R$ {comandas.filter(c => c.status === 'paid').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
                <p className="text-[10px] text-zinc-400 mt-1">receita total</p>
              </div>
            </div>

            {/* Comandas table */}
            <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-zinc-900">Todas as Comandas</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-widest font-bold">{comandas.length} registros</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => setIsComandaModalOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-sm flex items-center gap-2"
                  >
                    <Plus size={16} /> Nova Comanda
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Serviços / Agendamentos</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Data</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Desconto</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandas.map((c, idx) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-zinc-100 hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                        onClick={() => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-600">
                              {c.client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900">{c.client.name}</p>
                              <p className="text-[10px] text-zinc-400">{c.client.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {c.appointments.length > 0 ? c.appointments.map((a: any, i: number) => (
                              <span key={i} className="text-[9px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg">
                                {a.service.name}
                              </span>
                            )) : (
                              <span className="text-[10px] text-zinc-400 italic">Sem agendamentos vinculados</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500 font-medium">
                          {format(new Date(c.createdAt), "dd/MM/yyyy")}
                        </td>
                        <td className="px-6 py-4">
                          {c.discount > 0 ? (
                            <span className="text-xs font-bold text-green-600">
                              -{c.discountType === 'percentage' ? `${c.discount}%` : `R$ ${c.discount}`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-zinc-900">R$ {c.total.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[9px] font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-widest border",
                            c.status === 'open' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          )}>
                            {c.status === 'open' ? 'Em Aberto' : 'Pago'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {c.status === 'open' && (
                              <button
                                onClick={() => handlePayComanda(c)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5"
                              >
                                <CheckCircle size={12} /> Pagar
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedComanda(c); setIsComandaDetailOpen(true); }}
                              className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg text-[10px] font-bold transition-all"
                            >
                              Detalhes
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {comandas.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-8 py-24 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                          Nenhuma comanda encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comanda Detail Modal */}
            {isComandaDetailOpen && selectedComanda && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsComandaDetailOpen(false)}>
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">Comanda #{selectedComanda.id.slice(-6).toUpperCase()}</h3>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mt-0.5">{format(new Date(selectedComanda.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                    </div>
                    <button onClick={() => setIsComandaDetailOpen(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"><X size={18} /></button>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-sm font-bold text-amber-600">
                      {selectedComanda.client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{selectedComanda.client.name}</p>
                      <p className="text-[10px] text-zinc-500">{selectedComanda.client.phone}</p>
                    </div>
                    <span className={cn(
                      "ml-auto text-[9px] font-bold px-2.5 py-1.5 rounded-lg uppercase tracking-widest border",
                      selectedComanda.status === 'open' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                    )}>
                      {selectedComanda.status === 'open' ? 'Em Aberto' : 'Pago'}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Agendamentos vinculados</p>
                    {selectedComanda.appointments.length > 0 ? (
                      <div className="space-y-2">
                        {selectedComanda.appointments.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-2">
                              <Scissors size={14} className="text-amber-500" />
                              <div>
                                <p className="text-xs font-bold text-zinc-900">{a.service.name}</p>
                                <p className="text-[10px] text-zinc-400">{format(new Date(a.date), "dd/MM")} • {a.startTime}–{a.endTime}</p>
                              </div>
                            </div>
                            <p className="text-sm font-black text-zinc-900">R$ {a.service.price.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 italic py-3">Nenhum agendamento vinculado a esta comanda.</p>
                    )}
                  </div>

                  <div className="border-t border-zinc-100 pt-4 space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Subtotal</span>
                      <span>R$ {selectedComanda.appointments.reduce((a: number, ap: any) => a + ap.service.price, 0).toFixed(2)}</span>
                    </div>
                    {selectedComanda.discount > 0 && (
                      <div className="flex justify-between text-xs text-green-600 font-bold">
                        <span>Desconto {selectedComanda.discountType === 'percentage' ? `(${selectedComanda.discount}%)` : ''}</span>
                        <span>-R$ {selectedComanda.discountType === 'percentage'
                          ? (selectedComanda.appointments.reduce((a: number, ap: any) => a + ap.service.price, 0) * selectedComanda.discount / 100).toFixed(2)
                          : selectedComanda.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-zinc-900 border-t border-zinc-100 pt-2">
                      <span>Total</span>
                      <span>R$ {selectedComanda.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {selectedComanda.status === 'open' && (
                    <button
                      onClick={() => { handlePayComanda(selectedComanda); setIsComandaDetailOpen(false); }}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} /> Finalizar e Pagar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fluxo' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Receita Total</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">R$ {comandas.filter(c => c.status === 'paid').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
                <p className="text-[10px] text-zinc-400 mt-1">comandas pagas</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">A Receber</p>
                <p className="text-2xl font-black text-amber-600 mt-1">R$ {comandas.filter(c => c.status === 'open').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
                <p className="text-[10px] text-zinc-400 mt-1">em aberto</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ticket Médio</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">
                  R$ {comandas.length ? (comandas.reduce((a, c) => a + c.total, 0) / comandas.length).toFixed(2) : '0.00'}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">por comanda</p>
              </div>
              <div className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Comandas</p>
                <p className="text-2xl font-black text-zinc-900 mt-1">{comandas.length}</p>
                <p className="text-[10px] text-zinc-400 mt-1">{comandas.filter(c => c.status === 'paid').length} pagas</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue area chart */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 mb-4">Receita por Dia (últimas comandas)</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={(() => {
                      const days: Record<string, number> = {};
                      comandas.filter(c => c.status === 'paid').forEach(c => {
                        const d = format(new Date(c.createdAt), "dd/MM");
                        days[d] = (days[d] || 0) + c.total;
                      });
                      return Object.entries(days).slice(-7).map(([name, value]) => ({ name, value }));
                    })()}>
                      <defs>
                        <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `R$ ${v}`} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px' }} itemStyle={{ color: '#059669' }} />
                      <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cashGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-zinc-900 mb-4">Status das Comandas</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={20} className="text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Pagas</p>
                        <p className="text-[10px] text-zinc-500">{comandas.filter(c => c.status === 'paid').length} comandas</p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-emerald-600">R$ {comandas.filter(c => c.status === 'paid').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-amber-600" />
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Em Aberto</p>
                        <p className="text-[10px] text-zinc-500">{comandas.filter(c => c.status === 'open').length} comandas</p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-amber-600">R$ {comandas.filter(c => c.status === 'open').reduce((a, c) => a + c.total, 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <TrendingUp size={20} className="text-zinc-600" />
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Taxa de Fechamento</p>
                        <p className="text-[10px] text-zinc-500">comandas pagas / total</p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-zinc-900">
                      {comandas.length ? Math.round(comandas.filter(c => c.status === 'paid').length / comandas.length * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent transactions */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-100">
                <h3 className="text-sm font-bold text-zinc-900">Últimas Transações</h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {[...comandas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8).map(c => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm", c.status === 'paid' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100")}>
                        {c.client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{c.client.name}</p>
                        <p className="text-[10px] text-zinc-400">{format(new Date(c.createdAt), "dd/MM/yyyy 'às' HH:mm")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-[9px] font-bold px-2 py-1 rounded-lg border", c.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                        {c.status === 'paid' ? 'Pago' : 'Em Aberto'}
                      </span>
                      <p className={cn("text-sm font-black", c.status === 'paid' ? "text-emerald-600" : "text-zinc-700")}>
                        {c.status === 'paid' ? '+' : ''}R$ {c.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
                {comandas.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="text-xs text-zinc-400">Nenhuma transação encontrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'professionals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">
                {professionals.length} profissional(is) cadastrado(s)
              </p>
              <Button
                onClick={() => { setEditingProfessional(null); setNewProfessional({ name: "", role: "", password: "", showPassword: false }); setIsProfessionalModalOpen(true); }}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl px-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Plus size={18} />
                Novo Profissional
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {professionals.map((prof: any, idx: number) => (
                <motion.div
                  key={prof.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all relative overflow-hidden"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-2xl font-black shrink-0">
                      {prof.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-zinc-900 truncate">{prof.name}</h4>
                      <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">{prof.role || "Sem cargo"}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-2xl text-[10px] font-bold border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 py-4 flex items-center justify-center gap-2"
                      onClick={() => {
                        setEditingProfessional(prof);
                        setNewProfessional({ name: prof.name, role: prof.role || "", password: "", showPassword: false });
                        setIsProfessionalModalOpen(true);
                      }}
                    >
                      <UserCog size={14} /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-2xl text-[10px] font-bold border-red-200 text-red-500 hover:bg-red-50 py-4 flex items-center justify-center gap-2"
                      onClick={() => handleDeleteProfessional(prof.id)}
                    >
                      <Trash2 size={14} /> Excluir
                    </Button>
                  </div>
                </motion.div>
              ))}
              {professionals.length === 0 && (
                <div className="col-span-full py-24 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
                  <UserCog size={48} className="mb-4 opacity-30" />
                  <p className="text-sm font-bold text-zinc-500">Nenhum profissional cadastrado.</p>
                  <p className="text-xs mt-1 font-medium">Clique no botão acima para adicionar.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                    <Clock size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Horário de Funcionamento</h3>
                    <p className="text-[10px] text-zinc-400 font-medium">Defina os horários que o studio estará aberto</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {workingHours.map(wh => (
                    <div key={wh.id} className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0 group">
                      <span className="text-xs font-bold text-zinc-500 w-24 group-hover:text-amber-600 transition-colors uppercase tracking-widest">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][wh.dayOfWeek]}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className={cn("flex items-center gap-2 transition-all", !wh.isOpen && "opacity-30 pointer-events-none")}>
                          <input type="text" defaultValue={wh.startTime} className="w-16 text-xs p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-bold text-zinc-800 focus:ring-2 focus:ring-amber-500/20 outline-none" />
                          <span className="text-zinc-400 text-[10px] font-bold">às</span>
                          <input type="text" defaultValue={wh.endTime} className="w-16 text-xs p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-bold text-zinc-800 focus:ring-2 focus:ring-amber-500/20 outline-none" />
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={wh.isOpen} className="sr-only peer" readOnly />
                          <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold shadow-sm">
                  Salvar Horários
                </Button>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 rounded-xl text-zinc-500">
                      <Settings size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Configurações Gerais</h3>
                      <p className="text-[10px] text-zinc-400 font-medium">Informações básicas do seu studio</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome do Studio</label>
                      <input type="text" defaultValue="Glow & Cut Studio" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone de Contato</label>
                      <input type="text" defaultValue="(11) 99999-9999" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Endereço</label>
                      <input type="text" defaultValue="Rua das Flores, 123 - Centro" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none" />
                    </div>
                  </div>
                  <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl py-3 font-bold shadow-sm">
                    Atualizar Perfil
                  </Button>
                </div>

                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 space-y-4">
                  <div className="flex items-center gap-3 text-red-600">
                    <div className="p-2.5 bg-red-100 rounded-xl">
                      <Trash2 size={18} />
                    </div>
                    <h4 className="text-sm font-bold">Zona de Perigo</h4>
                  </div>
                  <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                    Ações nesta área são irreversíveis. Tenha cuidado ao excluir dados.
                  </p>
                  <button className="w-full py-2.5 rounded-xl text-[10px] font-bold border border-red-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all uppercase tracking-widest">
                    Limpar Banco de Dados
                  </button>
                </div>
              </div>
            </div>

            {/* Theme Color */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl border" style={{ background: currentTheme.light, borderColor: currentTheme.border }}>
                  <div className="w-5 h-5 rounded-lg" style={{ background: currentTheme.hex }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Personalização de Tema</h3>
                  <p className="text-[10px] text-zinc-400 font-medium">Escolha a cor principal dos botões e destaques</p>
                </div>
                <div className="ml-auto px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border"
                  style={{ background: currentTheme.light, color: currentTheme.hex, borderColor: currentTheme.border }}>
                  {currentTheme.label}
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {themeColors.map(color => (
                  <button
                    key={color.value}
                    onClick={() => handleThemeChange(color.value)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                      themeColor === color.value ? "border-zinc-800 bg-zinc-50 shadow-sm" : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl shadow-sm border border-white/50" style={{ background: color.hex }} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{color.label}</span>
                    {themeColor === color.value && (
                      <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-zinc-900 border-2 border-white" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Pré-visualização</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all"
                    style={{ background: currentTheme.hex }}>
                    Botão Principal
                  </button>
                  <button className="px-4 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={{ background: currentTheme.light, color: currentTheme.hex, borderColor: currentTheme.border }}>
                    Botão Secundário
                  </button>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold"
                    style={{ background: currentTheme.light, color: currentTheme.hex, borderColor: currentTheme.border }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: currentTheme.hex }} />
                    Badge de Status
                  </div>
                </div>
              </div>

              <p className="text-[9px] text-zinc-400 font-medium">
                * A cor é salva localmente. Para aplicar globalmente, será necessário reiniciar o servidor.
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  </div>
</main>

      {/* Modals */}
      <Modal isOpen={isServiceModalOpen} onClose={() => { setIsServiceModalOpen(false); setEditingService(null); }} title={editingService ? `Editar ${newService.type === 'service' ? 'Serviço' : 'Pacote'}` : newService.type === 'service' ? "Novo Serviço" : "Novo Pacote"}>
        <div className="space-y-5">
          {!editingService && (
            <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
              <button
                onClick={() => setNewService({ ...newService, type: 'service' })}
                className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider", newService.type === 'service' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
              >
                Serviço
              </button>
              <button
                onClick={() => setNewService({ ...newService, type: 'package' })}
                className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider", newService.type === 'package' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
              >
                Pacote
              </button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome</label>
            <input
              type="text"
              className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
              placeholder={newService.type === 'service' ? "Ex: Corte Degradê" : "Ex: Pacote 5 Cortes"}
              value={newService.name}
              onChange={e => setNewService({ ...newService, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Descrição (opcional)</label>
            <textarea
              className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all resize-none"
              placeholder="Descreva o serviço..."
              rows={2}
              value={newService.description}
              onChange={e => setNewService({ ...newService, description: e.target.value })}
            />
          </div>

          {newService.type === 'package' && (
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Serviços Inclusos</label>
              <select
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                onChange={(e) => handleAddServiceToPackage(e.target.value)}
                value=""
              >
                <option value="" disabled>Adicionar serviço...</option>
                {services.filter(s => s.type === 'service').map(s => (
                  <option key={s.id} value={s.id}>{s.name} – R$ {s.price}</option>
                ))}
              </select>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {newService.includedServices.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold text-zinc-800">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-12 text-[10px] p-1.5 bg-white border border-zinc-200 rounded-lg text-center text-zinc-800 font-bold"
                        value={s.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setNewService(prev => ({ ...prev, includedServices: prev.includedServices.map(item => item.id === s.id ? { ...item, quantity: val } : item) }));
                        }}
                      />
                      <button onClick={() => setNewService(prev => ({ ...prev, includedServices: prev.includedServices.filter(item => item.id !== s.id) }))} className="text-red-400 hover:text-red-600 transition-colors">
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Preço (R$)</label>
              <input
                type="number"
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                placeholder="0.00"
                value={newService.price}
                onChange={e => setNewService({ ...newService, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Duração (min)</label>
              <input
                type="number"
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                placeholder="30"
                value={newService.duration}
                onChange={e => setNewService({ ...newService, duration: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Desconto</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="flex-1 text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                  placeholder="0"
                  value={newService.discount}
                  onChange={e => setNewService({ ...newService, discount: e.target.value })}
                />
                <select
                  className="w-16 text-[10px] p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-bold outline-none"
                  value={newService.discountType}
                  onChange={e => setNewService({ ...newService, discountType: e.target.value as any })}
                >
                  <option value="value">R$</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Preço Final</label>
              <div className="w-full text-sm p-3 bg-amber-50 border border-amber-200 rounded-xl font-black text-amber-700 flex items-center justify-center">
                R$ {(() => {
                  const p = parseFloat(newService.price) || 0;
                  const d = parseFloat(newService.discount) || 0;
                  return newService.discountType === 'percentage' ? (p * (1 - d / 100)).toFixed(2) : (p - d).toFixed(2);
                })()}
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold shadow-sm transition-all"
            onClick={handleCreateService}
            disabled={!newService.name || !newService.price}
          >
            {editingService ? "Salvar Alterações" : (newService.type === 'service' ? "Criar Serviço" : "Criar Pacote")}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isAppointmentModalOpen} onClose={() => { setIsAppointmentModalOpen(false); setClientComandaStatus(null); setClientSearchResults([]); }} title="Novo Agendamento">
        <div className="space-y-4">
          {/* Appointment Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Tipo de Agendamento</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'atendimento', label: 'Atendimento', icon: '✂️', desc: 'Cliente + serviço' },
                { value: 'bloqueio', label: 'Bloqueio', icon: '🚫', desc: 'Indisponível' },
                { value: 'pessoal', label: 'Pessoal', icon: '👤', desc: 'Compromisso pessoal' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setNewAppointment(prev => ({ ...prev, type: opt.value }))}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-[10px] font-bold transition-all border",
                    newAppointment.type === opt.value
                      ? opt.value === 'bloqueio' ? "bg-red-50 border-red-300 text-red-700"
                        : opt.value === 'pessoal' ? "bg-blue-50 border-blue-300 text-blue-700"
                        : "bg-amber-50 border-amber-400 text-amber-700"
                      : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300"
                  )}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="uppercase tracking-wider">{opt.label}</span>
                  <span className="font-normal text-[9px] opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Data</label>
              <input
                type="date"
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                value={format(newAppointment.date, "yyyy-MM-dd")}
                onChange={e => setNewAppointment({ ...newAppointment, date: new Date(e.target.value + 'T12:00:00') })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Horário</label>
              <input
                type="time"
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                value={newAppointment.startTime}
                onChange={e => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Cliente</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                  placeholder="Nome do cliente..."
                  value={newAppointment.clientName}
                  onChange={e => handleSearchClientByName(e.target.value)}
                />
                {clientSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto mt-1 p-1">
                    {clientSearchResults.map(c => {
                      const hasOpenComanda = c.comandas?.some((com: any) => com.status === "open");
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectClientForAppointment(c)}
                          className="w-full text-left px-3 py-2.5 text-xs hover:bg-zinc-50 rounded-lg transition-all border-b border-zinc-100 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-zinc-900">{c.name}</p>
                            {hasOpenComanda && <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md border border-amber-200 uppercase tracking-wide">Comanda aberta</span>}
                          </div>
                          <p className="text-zinc-500 text-[10px] mt-0.5">{c.phone}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <button onClick={() => setIsClientModalOpen(true)} className="px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl border border-zinc-200 transition-all">
                <Plus size={16} />
              </button>
            </div>
            {newAppointment.clientId && (
              <div className="flex items-center gap-2 ml-1 mt-1">
                <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 uppercase tracking-wider">
                  <CheckCircle size={11} /> {newAppointment.clientPhone}
                </p>
                {clientComandaStatus === "open" && (
                  <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-200 uppercase tracking-wide flex items-center gap-1">
                    <FileText size={9} /> Comanda aberta vinculada
                  </span>
                )}
                {clientComandaStatus === "none" && (
                  <span className="text-[8px] font-bold bg-zinc-50 text-zinc-400 px-2 py-0.5 rounded-lg border border-zinc-200 uppercase tracking-wide">
                    Sem comanda
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Profissional (always shown) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Profissional</label>
            <select
              className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
              value={newAppointment.professionalId}
              onChange={e => setNewAppointment(prev => ({ ...prev, professionalId: e.target.value }))}
            >
              <option value="">Selecionar profissional...</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Client + Service — only for "atendimento" */}
          {newAppointment.type === 'atendimento' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Serviço/Pacote</label>
                <select
                  className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                  value={newAppointment.serviceId}
                  onChange={e => { const s = services.find(item => item.id === e.target.value); setNewAppointment(prev => ({ ...prev, serviceId: e.target.value, recurrence: { ...prev.recurrence, count: s?.type === 'package' ? 4 : 1 } })); }}
                >
                  <option value="">Selecionar serviço...</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} – R$ {s.price}</option>)}
                </select>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Repetições</span>
                  <select
                    className="text-[10px] p-2 bg-white border border-zinc-200 rounded-lg text-zinc-700 font-bold outline-none"
                    value={newAppointment.recurrence.type}
                    onChange={e => setNewAppointment(prev => ({ ...prev, recurrence: { ...prev.recurrence, type: e.target.value } }))}
                  >
                    <option value="none">Nenhuma</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quinzenal</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
                {newAppointment.recurrence.type !== 'none' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Repetir</span>
                    <input
                      type="number"
                      className="w-14 text-xs p-2 bg-white border border-zinc-200 rounded-lg text-center text-zinc-800 font-bold outline-none"
                      value={newAppointment.recurrence.count}
                      onChange={e => setNewAppointment(prev => ({ ...prev, recurrence: { ...prev.recurrence, count: parseInt(e.target.value) } }))}
                    />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">vezes</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bloqueio / Pessoal — show note/reason */}
          {(newAppointment.type === 'bloqueio' || newAppointment.type === 'pessoal') && (
            <div className={cn(
              "p-4 rounded-xl border space-y-2",
              newAppointment.type === 'bloqueio' ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"
            )}>
              <p className={cn("text-[10px] font-bold uppercase tracking-widest",
                newAppointment.type === 'bloqueio' ? "text-red-500" : "text-blue-500"
              )}>
                {newAppointment.type === 'bloqueio'
                  ? "Este horário ficará bloqueado e indisponível para clientes."
                  : "Compromisso pessoal — não aparece para clientes."}
              </p>
            </div>
          )}

          <Button
            className={cn(
              "w-full rounded-xl py-3 font-bold shadow-sm text-white",
              newAppointment.type === 'bloqueio' ? "bg-red-500 hover:bg-red-600" :
              newAppointment.type === 'pessoal' ? "bg-blue-500 hover:bg-blue-600" :
              "bg-amber-500 hover:bg-amber-600"
            )}
            onClick={handleCreateAppointment}
            disabled={
              !newAppointment.professionalId ||
              (newAppointment.type === 'atendimento' && (!newAppointment.clientName || !newAppointment.serviceId))
            }
          >
            {newAppointment.type === 'bloqueio' ? 'Bloquear Horário' :
             newAppointment.type === 'pessoal' ? 'Salvar Compromisso' :
             'Confirmar Agendamento'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isComandaModalOpen} onClose={() => setIsComandaModalOpen(false)} title="Nova Comanda">
        <div className="space-y-4">
          {/* Client */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone</label>
              <input
                type="tel"
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                placeholder="(00) 00000-0000"
                value={newComanda.clientPhone}
                onChange={e => setNewComanda({ ...newComanda, clientPhone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome (novo cliente)</label>
              <input
                type="text"
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                placeholder="Se for novo cliente..."
                value={newComanda.clientName}
                onChange={e => setNewComanda({ ...newComanda, clientName: e.target.value })}
              />
            </div>
          </div>

          {/* Services */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Serviços / Itens</label>
            <select
              className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
              onChange={(e) => handleAddServiceToComanda(e.target.value)}
              value=""
            >
              <option value="" disabled>Adicionar serviço ou pacote...</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} — R$ {s.price}</option>
              ))}
            </select>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {newComanda.items.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div>
                    <span className="text-xs font-bold text-zinc-800">{item.name}</span>
                    <span className="text-[9px] text-zinc-500 ml-2">R$ {item.price}/un</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      className="w-12 text-xs p-1.5 bg-white border border-zinc-200 rounded-lg text-center text-zinc-800 font-bold outline-none"
                      value={item.quantity}
                      onChange={(e) => { const val = parseInt(e.target.value); setNewComanda(prev => ({ ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, quantity: val } : i) })); }}
                    />
                    <span className="text-[10px] font-bold text-zinc-700">= R$ {(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => setNewComanda(prev => ({ ...prev, items: prev.items.filter(i => i.id !== item.id) }))} className="text-red-400 hover:text-red-600 transition-colors ml-1">
                      <XCircle size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {newComanda.items.length === 0 && (
                <p className="text-[10px] text-zinc-400 text-center py-3 italic">Nenhum item adicionado</p>
              )}
            </div>
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Desconto</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="flex-1 text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                  value={newComanda.discount}
                  onChange={e => setNewComanda({ ...newComanda, discount: e.target.value })}
                />
                <select
                  className="w-14 text-[10px] p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-bold outline-none"
                  value={newComanda.discountType}
                  onChange={e => setNewComanda({ ...newComanda, discountType: e.target.value as any })}
                >
                  <option value="value">R$</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Total</label>
              <div className="w-full text-sm p-3 bg-amber-50 border border-amber-200 rounded-xl font-black text-amber-700 flex items-center justify-center">
                R$ {(() => {
                  const subtotal = newComanda.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                  const d = parseFloat(newComanda.discount) || 0;
                  return newComanda.discountType === 'percentage' ? (subtotal * (1 - d / 100)).toFixed(2) : (subtotal - d).toFixed(2);
                })()}
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Forma de Pagamento</label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: 'cash', label: 'Dinheiro' },
                { value: 'card', label: 'Cartão' },
                { value: 'pix', label: 'PIX' },
                { value: 'transfer', label: 'Transf.' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setNewComanda({ ...newComanda, paymentMethod: opt.value })}
                  className={cn(
                    "py-2.5 rounded-xl text-[10px] font-bold transition-all border",
                    newComanda.paymentMethod === opt.value
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold shadow-sm"
            onClick={handleCreateComanda}
            disabled={!newComanda.clientPhone || newComanda.items.length === 0}
          >
            Abrir Comanda
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isProfessionalModalOpen} onClose={() => { setIsProfessionalModalOpen(false); setEditingProfessional(null); }} title={editingProfessional ? "Editar Profissional" : "Novo Profissional"}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
            <input
              type="text"
              className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
              placeholder="Ex: João Silva"
              value={newProfessional.name}
              onChange={e => setNewProfessional({ ...newProfessional, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Cargo / Especialidade</label>
            <input
              type="text"
              className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
              placeholder="Ex: Barbeiro, Manicure..."
              value={newProfessional.role}
              onChange={e => setNewProfessional({ ...newProfessional, role: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">
              {editingProfessional ? "Nova Senha (vazio = manter)" : "Senha de Acesso"}
            </label>
            <div className="relative">
              <input
                type={profPasswordVisible ? "text" : "password"}
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none pr-10"
                placeholder="Mínimo 4 caracteres"
                value={newProfessional.password}
                onChange={e => setNewProfessional({ ...newProfessional, password: e.target.value })}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors" onClick={() => setProfPasswordVisible(v => !v)}>
                {profPasswordVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-[10px] text-amber-600 font-bold">Acesso em <span className="font-black">/pro/login</span> com nome e senha.</p>
          </div>
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold shadow-sm"
            onClick={handleCreateProfessional}
            disabled={!newProfessional.name || (!editingProfessional && !newProfessional.password)}
          >
            {editingProfessional ? "Salvar Alterações" : "Cadastrar Profissional"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Novo Cliente">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
            <input
              type="text"
              className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
              placeholder="Ex: João Silva"
              value={newClient.name}
              onChange={e => setNewClient({ ...newClient, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Telefone</label>
              <input
                type="tel"
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                placeholder="(00) 00000-0000"
                value={newClient.phone}
                onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Idade (Opcional)</label>
              <input
                type="number"
                className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                placeholder="25"
                value={newClient.age}
                onChange={e => setNewClient({ ...newClient, age: e.target.value })}
              />
            </div>
          </div>
          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold shadow-sm" onClick={handleCreateClient} disabled={!newClient.name || !newClient.phone}>
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
          ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
          : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <motion.div
          layoutId="nav-active"
          className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"
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
      className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 hover:shadow-md transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 transition-all duration-300">
          <Icon size={18} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border",
            trend.isUp ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"
          )}>
            {trend.isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{value}</h3>
        {description && <p className="text-[10px] text-zinc-400 mt-1.5 font-medium flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-zinc-300" />
          {description}
        </p>}
      </div>
    </motion.div>
  );
}
