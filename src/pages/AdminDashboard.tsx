import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard,
  Calendar as CalendarIcon,
  Globe,
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
  XCircle,
  ChevronDown,
  Sun,
  Store,
  MapPin,
  Phone,
  Palette,
  CalendarOff,
  AlertTriangle,
  Menu,
  Cake,
  Heart,
  GraduationCap,
  Baby,
  MessageCircle,
  MapPin as MapPinIcon,
  Hash
} from "lucide-react";
import { maskPhone, maskCPF, maskCEP, maskDate, calculateAge } from "@/src/lib/masks";
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
import { apiFetch } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { StatCard } from "@/src/components/ui/StatCard";
import { DashboardTab } from "@/src/pages/admin/tabs/DashboardTab";
import { ComandasTab } from "@/src/pages/admin/tabs/ComandasTab";
import { FluxoTab } from "@/src/pages/admin/tabs/FluxoTab";
import { ProfessionalsTab } from "@/src/pages/admin/tabs/ProfessionalsTab";
import { HorariosTab } from "@/src/pages/admin/tabs/HorariosTab";
import { SettingsTab } from "@/src/pages/admin/tabs/SettingsTab";
import { ClientsTab } from "@/src/pages/admin/tabs/ClientsTab";
import { ServicesTab } from "@/src/pages/admin/tabs/ServicesTab";
import { AgendaTab } from "@/src/pages/admin/tabs/AgendaTab";
import { MinhaAgendaTab } from "@/src/pages/admin/tabs/MinhaAgendaTab";
import { AdminProfileTab } from "@/src/pages/admin/tabs/AdminProfileTab";
import { Combobox, ComboboxOption } from "@/src/components/ui/Combobox";
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
  const navigate = useNavigate();
  const location = useLocation();

  // Mapeamento de abas para Slugs de URL
  const tabSlugs: Record<string, string> = {
    'dash': 'painel',
    'agenda': 'agenda',
    'minha-agenda': 'meu-link',
    'services': 'servicos',
    'clients': 'clientes',
    'comandas': 'comandas',
    'fluxo': 'fluxo',
    'professionals': 'profissionais',
    'horarios': 'horarios',
    'settings': 'config',
    'profile': 'perfil',
  };

  // Inverter o mapa para carregar a aba correta pela URL
  const slugToTab = Object.fromEntries(Object.entries(tabSlugs).map(([tab, slug]) => [slug, tab]));

  const [activeTab, setActiveTab] = useState<"dash" | "agenda" | "minha-agenda" | "services" | "clients" | "comandas" | "fluxo" | "settings" | "professionals" | "horarios" | "profile">(() => {
    const path = location.pathname.split('/').pop();
    return (slugToTab[path || ''] as any) || "dash";
  });

  // Sempre que a aba mudar, atualizar a URL (sem recarregar a página)
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    const slug = tabSlugs[tab] || 'painel';
    window.history.pushState(null, '', `/admin/${slug}`);
    
    if (tab === 'clients') {
      apiFetch("/api/clients").then(res => res.json()).then(setClients);
    }
    if (tab === 'services') {
      apiFetch("/api/services").then(res => res.json()).then(setServices);
    }
    if (tab === 'comandas' || tab === 'fluxo') {
      apiFetch("/api/comandas").then(res => res.json()).then(setComandas);
    }
    if (tab === 'agenda') {
      fetchAppointments();
    }
    if (tab === 'professionals') {
      apiFetch("/api/professionals").then(res => res.json()).then(setProfessionals);
    }
  };

  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<{ id: string; date: string; name: string }[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [localWorkingHours, setLocalWorkingHours] = useState<any[]>([]);
  const [settingsOpenCard, setSettingsOpenCard] = useState<string | null>('studio');
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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Tooltip & Hover states
  const [slotHover, setSlotHover] = useState<{ x: number, y: number, label: string } | null>(null);
  const [hoveredAppointment, setHoveredAppointment] = useState<any>(null);
  const [clientComandaStatus, setClientComandaStatus] = useState<"open" | "paid" | "none" | null>(null);

  // New Appointment State
  const [newAppointment, setNewAppointment] = useState({
    date: new Date(),
    startTime: "09:00",
    duration: 60,
    clientId: "",
    clientPhone: "",
    clientName: "",
    serviceId: "",
    packageId: "",
    professionalId: "",
    status: "agendado" as "agendado" | "confirmado" | "realizado" | "cancelado" | "faltou" | "reagendado",
    notes: "",
    recurrence: { type: "none", count: 1, interval: 7 },
    comandaId: "" as string | null,
    type: "atendimento" as "atendimento" | "bloqueio" | "pessoal"
  });
  const [isRepeatModalOpen, setIsRepeatModalOpen] = useState(false);
  const [isCustomRepeatModalOpen, setIsCustomRepeatModalOpen] = useState(false);
  const [repeatLabel, setRepeatLabel] = useState("Não Repete");
  const [customRepeat, setCustomRepeat] = useState({
    frequency: "Semanalmente", interval: 1, unit: "SEMANA(S)",
    endType: "count" as "count" | "date", count: 4, endDate: ""
  });

  // New Comanda State
  const emptyComanda = {
    type: "normal" as "normal" | "pacote",
    description: "",
    clientId: "",
    clientPhone: "",
    clientName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    value: "",
    sessionCount: "1",
    professionalId: "",
    packageId: "",
    items: [] as { id: string, name: string, price: number, quantity: number, sessions?: number, type?: string }[],
    discount: "0",
    discountType: "value" as "value" | "percentage",
    paymentMethod: "cash" as "cash" | "card" | "pix" | "transfer"
  };
  const [newComanda, setNewComanda] = useState({ ...emptyComanda });
  const [comandaClientSearchResults, setComandaClientSearchResults] = useState<any[]>([]);

  // New Client State
  const emptyClient = {
    name: "",
    phone: "",
    whatsapp: true,
    cpf: "",
    birthDate: "",
    email: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    hasChildren: false,
    isMarried: false,
    spouseName: "",
    maritalStatus: "" as "" | "solteiro" | "casado" | "divorciado" | "viuvo" | "uniao_estavel",
    education: "" as "" | "fundamental" | "medio" | "superior" | "pos" | "mestrado" | "doutorado",
    notes: ""
  };
  const [newClient, setNewClient] = useState({ ...emptyClient });
  const [editingClient, setEditingClient] = useState<any>(null);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [clientPersonalOpen, setClientPersonalOpen] = useState(false);

  useEffect(() => {
    apiFetch("/api/services").then(res => res.json()).then(setServices);
    apiFetch("/api/professionals").then(res => res.json()).then(profs => {
      setProfessionals(profs);
      if (profs.length > 0) setSelectedProfessional(profs[0].id);
    });
    apiFetch("/api/settings/working-hours").then(res => res.json()).then(setWorkingHours);
    apiFetch("/api/comandas").then(res => res.json()).then(setComandas);
    apiFetch("/api/clients").then(res => res.json()).then(setClients);
    fetchAppointments();
  }, [currentMonth, selectedProfessional]);

  const handleAddServiceToComanda = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    let sessions = 1;
    if (service.type === 'package' && service.packageServices) {
      sessions = service.packageServices.reduce((acc: number, ps: any) => acc + (ps.quantity || 1), 0);
    }
    
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
        items: [...prev.items, { 
          id: service.id, 
          name: service.name, 
          price: service.price, 
          quantity: 1,
          sessions: sessions, // Total sessions for the package
          type: service.type
        }]
      };
    });
  };

  const fetchAppointments = () => {
    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();
    let url = `/api/appointments?start=${start}&end=${end}`;
    if (selectedProfessional !== "all") url += `&professionalId=${selectedProfessional}`;
    apiFetch(url).then(res => res.json()).then(setAppointments);
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
        const clientRes = await apiFetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newAppointment.clientName, phone: newAppointment.clientPhone })
        });
        const client = await clientRes.json();
        clientId = client.id;
      }
    }

    await apiFetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newAppointment,
        clientId: clientId || undefined,
        serviceId: newAppointment.serviceId || newAppointment.packageId || undefined,
      })
    });
    setIsAppointmentModalOpen(false);
    setNewAppointment({
      date: new Date(), startTime: "09:00", duration: 60,
      clientId: "", clientPhone: "", clientName: "",
      serviceId: "", packageId: "", professionalId: "",
      status: "agendado", notes: "",
      recurrence: { type: "none", count: 1, interval: 7 },
      comandaId: null, type: "atendimento"
    });
    setRepeatLabel("Não Repete");
    setClientComandaStatus(null);
    fetchAppointments();
  };

  const handleCreateComanda = async () => {
    let clientId = newComanda.clientId;

    if (!clientId) {
      if (!newComanda.clientName || !newComanda.clientPhone) {
        alert("Por favor, selecione um cliente ou preencha nome e telefone para cadastrar um novo.");
        return;
      }
      const newClientRes = await apiFetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newComanda.clientName, phone: newComanda.clientPhone })
      });
      const newClientData = await newClientRes.json();
      clientId = newClientData.id;
    }

    const subtotal = newComanda.type === 'normal'
      ? (parseFloat(newComanda.value || "0") * parseInt(newComanda.sessionCount || "1"))
      : newComanda.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    let total = subtotal;
    const discountVal = parseFloat(newComanda.discount || "0");
    if (newComanda.discountType === 'percentage') {
      total = subtotal * (1 - discountVal / 100);
    } else {
      total = subtotal - discountVal;
    }

    const body = {
      clientId,
      discount: discountVal,
      discountType: newComanda.discountType,
      total,
      type: newComanda.type,
      items: newComanda.type === 'pacote' ? newComanda.items : [{
        name: newComanda.description || "Atendimento",
        price: parseFloat(newComanda.value || "0"),
        quantity: parseInt(newComanda.sessionCount || "1"),
        sessions: parseInt(newComanda.sessionCount || "1")
      }],
      professionalId: newComanda.professionalId,
      date: newComanda.date
    };

    await apiFetch("/api/comandas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    setIsComandaModalOpen(false);
    setNewComanda({ ...emptyComanda });
    setComandaClientSearchResults([]);
    apiFetch("/api/comandas").then(res => res.json()).then(setComandas);
  };

  const handleSearchClientForComanda = async (name: string) => {
    setNewComanda(prev => ({ ...prev, clientName: name, clientId: "", clientPhone: "" }));
    if (name.length >= 1) {
      try {
        const res = await apiFetch(`/api/clients/search?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        setComandaClientSearchResults(Array.isArray(data) ? data : []);
      } catch { setComandaClientSearchResults([]); }
    } else {
      setComandaClientSearchResults([]);
    }
  };

  const handleSelectClientForComanda = (c: any) => {
    setNewComanda(prev => ({
      ...prev,
      clientId: c.id,
      clientName: c.name,
      clientPhone: c.phone || ""
    }));
    setComandaClientSearchResults([]);
  };

  const handleCreateClient = async () => {
    const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
    const method = editingClient ? "PUT" : "POST";
    await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient)
    });
    setIsClientModalOpen(false);
    setEditingClient(null);
    setNewClient({ ...emptyClient });
    apiFetch("/api/clients").then(res => res.json()).then(setClients);
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    await apiFetch(`/api/clients/${id}`, { method: "DELETE" });
    apiFetch("/api/clients").then(res => res.json()).then(setClients);
  };

  const handleEditClient = (client: any) => {
    setEditingClient(client);
    setNewClient({
      name: client.name || "",
      phone: client.phone || "",
      whatsapp: client.whatsapp ?? true,
      cpf: client.cpf || "",
      birthDate: client.birthDate || "",
      email: client.email || "",
      cep: client.cep || "",
      street: client.street || "",
      number: client.number || "",
      complement: client.complement || "",
      neighborhood: client.neighborhood || "",
      city: client.city || "",
      state: client.state || "",
      hasChildren: client.hasChildren ?? false,
      isMarried: client.isMarried ?? false,
      spouseName: client.spouseName || "",
      maritalStatus: client.maritalStatus || "",
      education: client.education || "",
      notes: client.notes || ""
    });
    setIsClientModalOpen(true);
  };

  const handleCepSearch = async (cep: string) => {
    const raw = cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setIsCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewClient(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch { /* ignore */ } finally {
      setIsCepLoading(false);
    }
  };

  const handleSearchClientByName = async (name: string) => {
    setNewAppointment(prev => ({ ...prev, clientName: name, clientId: "", clientPhone: "" }));
    setClientComandaStatus(null);
    if (name.length >= 1) {
      try {
        const res = await apiFetch(`/api/clients/search?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        setClientSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setClientSearchResults([]);
      }
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
    includedServices: [] as { id: string, name: string, quantity: number, type?: string, sessions?: number }[]
  });

  // Comanda detail view
  const [selectedComanda, setSelectedComanda] = useState<any>(null);
  const [isComandaDetailOpen, setIsComandaDetailOpen] = useState(false);

  // Theme color
  const [themeColor, setThemeColor] = useState<string>(() => localStorage.getItem('themeColor') || 'amber');

  const themeColors = [
    { value: 'amber',   label: 'Âmbar',     hex: '#f59e0b', light: '#fffbeb', border: '#fcd34d',
      shades: { 50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309' } },
    { value: 'orange',  label: 'Laranja',   hex: '#f97316', light: '#fff7ed', border: '#fdba74',
      shades: { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c' } },
    { value: 'rose',    label: 'Rosa',      hex: '#f43f5e', light: '#fff1f2', border: '#fda4af',
      shades: { 50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c' } },
    { value: 'pink',    label: 'Pink',      hex: '#ec4899', light: '#fdf2f8', border: '#f9a8d4',
      shades: { 50:'#fdf2f8',100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899',600:'#db2777',700:'#be185d' } },
    { value: 'violet',  label: 'Violeta',   hex: '#8b5cf6', light: '#f5f3ff', border: '#c4b5fd',
      shades: { 50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9' } },
    { value: 'indigo',  label: 'Índigo',    hex: '#6366f1', light: '#eef2ff', border: '#a5b4fc',
      shades: { 50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca' } },
    { value: 'blue',    label: 'Azul',      hex: '#3b82f6', light: '#eff6ff', border: '#93c5fd',
      shades: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8' } },
    { value: 'cyan',    label: 'Ciano',     hex: '#06b6d4', light: '#ecfeff', border: '#67e8f9',
      shades: { 50:'#ecfeff',100:'#cffafe',200:'#a5f3fc',300:'#67e8f9',400:'#22d3ee',500:'#06b6d4',600:'#0891b2',700:'#0e7490' } },
    { value: 'emerald', label: 'Esmeralda', hex: '#10b981', light: '#ecfdf5', border: '#6ee7b7',
      shades: { 50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857' } },
    { value: 'zinc',    label: 'Carvão',    hex: '#18181b', light: '#f4f4f5', border: '#a1a1aa',
      shades: { 50:'#f4f4f5',100:'#f4f4f5',200:'#e4e4e7',300:'#d4d4d8',400:'#a1a1aa',500:'#71717a',600:'#52525b',700:'#3f3f46' } },
  ];

  const applyThemeToDom = (colorValue: string) => {
    const theme = themeColors.find(c => c.value === colorValue) || themeColors[0];
    const root = document.documentElement;
    Object.entries(theme.shades).forEach(([shade, val]) => {
      root.style.setProperty(`--color-amber-${shade}`, val);
    });
    root.style.setProperty('--color-primary', theme.shades[500]);
    root.style.setProperty('--color-primary-dark', theme.shades[600]);
    root.style.setProperty('--color-primary-light', theme.shades[400]);
  };

  useEffect(() => {
    applyThemeToDom(themeColor);
  }, []);

  const handleThemeChange = (color: string) => {
    setThemeColor(color);
    localStorage.setItem('themeColor', color);
    applyThemeToDom(color);
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
        includedServices: [...prev.includedServices, { 
          id: service.id, 
          name: service.name, 
          quantity: 1,
          type: service.type,
          sessions: 1
        }]
      };
    });
  };

  const handleCreateService = async () => {
    if (editingService) {
      await apiFetch(`/api/services/${editingService.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService)
      });
    } else {
      await apiFetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newService)
      });
    }
    setIsServiceModalOpen(false);
    setEditingService(null);
    setNewService({ name: "", description: "", price: "", duration: "", type: "service", discount: "0", discountType: "value", includedServices: [] });
    apiFetch("/api/services").then(res => res.json()).then(setServices);
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    await apiFetch(`/api/services/${id}`, { method: "DELETE" });
    apiFetch("/api/services").then(res => res.json()).then(setServices);
  };

  const handlePayComanda = async (comanda: any) => {
    await apiFetch(`/api/comandas/${comanda.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" })
    });
    apiFetch("/api/comandas").then(res => res.json()).then(setComandas);
  };



  const handleCreateProfessional = async () => {
    const url = editingProfessional ? `/api/professionals/${editingProfessional.id}` : "/api/professionals";
    const method = editingProfessional ? "PUT" : "POST";
    const body: any = { name: newProfessional.name, role: newProfessional.role };
    if (newProfessional.password) body.password = newProfessional.password;
    await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setIsProfessionalModalOpen(false);
    setEditingProfessional(null);
    setNewProfessional({ name: "", role: "", password: "", showPassword: false });
    apiFetch("/api/professionals").then(res => res.json()).then(setProfessionals);
  };

  const handleDeleteProfessional = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este profissional?")) return;
    await apiFetch(`/api/professionals/${id}`, { method: "DELETE" });
    apiFetch("/api/professionals").then(res => res.json()).then(setProfessionals);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-700 font-sans selection:bg-amber-500/30 overflow-hidden">
      {/* ── Tooltip flutuante de slot ───────────────────────── */}
      {slotHover && (
        <div className="fixed z-[200] pointer-events-none" style={{ left: slotHover.x + 14, top: slotHover.y - 36 }}>
          <div className="bg-zinc-900/95 text-white text-[11px] font-bold rounded-xl px-3 py-2 shadow-2xl whitespace-nowrap flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
              <Plus size={11} className="text-white"/>
            </span>
            {slotHover.label}
          </div>
          <div className="w-2 h-2 bg-zinc-900/95 rotate-45 ml-3 -mt-1" />
        </div>
      )}

      {/* ── Overlay mobile sidebar ──────────────────────────── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-zinc-200 flex flex-col z-50 shadow-sm transition-transform duration-300",
        "fixed inset-y-0 left-0 w-72 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
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
          <NavItem
            active={activeTab === 'minha-agenda'}
            onClick={() => handleTabChange('minha-agenda')}
            icon={<Globe size={18} />}
            label="Minha Agenda Online"
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
            active={activeTab === 'horarios'}
            onClick={() => handleTabChange('horarios')}
            icon={<Clock size={18} />}
            label="Horários"
          />
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
          <button onClick={() => { localStorage.removeItem("isLogged"); localStorage.removeItem("adminUser"); window.location.href = "/login"; }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all">
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white/90 backdrop-blur-xl border-b border-zinc-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 lg:hidden transition-all">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-sm md:text-xl font-bold text-zinc-900 font-display capitalize tracking-tight leading-tight">
                {activeTab === 'dash' ? 'Painel de Controle' :
                 activeTab === 'agenda' ? 'Agenda' :
                 activeTab === 'services' ? 'Serviços & Pacotes' :
                 activeTab === 'minha-agenda' ? 'Minha Agenda Online' :
                 activeTab === 'clients' ? 'Clientes' :
                 activeTab === 'comandas' ? 'Comandas' :
                 activeTab === 'fluxo' ? 'Fluxo de Caixa' :
                 activeTab === 'professionals' ? 'Profissionais' :
                 activeTab === 'horarios' ? 'Horários' :
                 activeTab === 'profile' ? 'Meu Perfil' : 'Configurações'}
              </h2>
              <p className="text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 relative">
            {/* Notificações */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-2 md:p-2.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-all relative",
                  isNotificationsOpen && "bg-zinc-100 text-zinc-900 shadow-sm"
                )}
              >
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-white"></span>
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-[320px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-100 z-50 overflow-hidden"
                    >
                      <div className="px-5 py-4 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Notificações</p>
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full">2 Novas</span>
                      </div>
                      <div className="max-h-[350px] overflow-y-auto">
                        <div className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors cursor-pointer group">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                              <CheckCircle size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-800">Novo Agendamento</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">Eduardo Eloi agendou um Corte Degradê para hoje às 14:30.</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors cursor-pointer group">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                              <AlertTriangle size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-800">Lembrete de Estoque</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">O produto "Pomada Efeito Matte" está quase acabando.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <button className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-all border-t border-zinc-50">
                        Ver Tudo
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="h-6 w-px bg-zinc-200 hidden md:block mx-1"></div>

            {/* Menu Perfil */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 p-1 pl-3 pr-2 rounded-xl hover:bg-zinc-100 transition-all group border border-transparent hover:border-zinc-200"
              >
                <div className="hidden md:block text-right">
                  <p className="text-[11px] font-black text-zinc-900 leading-none">Admin Studio</p>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Proprietário</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 overflow-hidden group-hover:shadow-sm transition-all">
                  <span className="font-black text-xs">AS</span>
                </div>
                <ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-300", isProfileMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-zinc-100 z-50 overflow-hidden"
                    >
                      <div className="p-4 bg-zinc-50/50 border-b border-zinc-50">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Conta</p>
                        <p className="text-xs font-bold text-zinc-800 truncate mt-1">edueloi.EE@gmail.com</p>
                      </div>
                      <div className="p-2">
                        <button onClick={() => { setIsProfileMenuOpen(false); handleTabChange('profile'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
                          <UserCog size={16} /> Meu Perfil
                        </button>
                        <button onClick={() => { setIsProfileMenuOpen(false); handleTabChange('settings'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
                          <Settings size={16} /> Configurações
                        </button>
                      </div>
                      <div className="p-2 border-t border-zinc-50 bg-zinc-50/20">
                        <button onClick={() => { localStorage.removeItem("isLogged"); localStorage.removeItem("adminUser"); window.location.href = "/login"; }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all">
                          <LogOut size={16} /> Sair
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {activeTab === 'services' && (
              <Button size="sm" onClick={() => { setNewService({ name:"",description:"",price:"",duration:"",type:"service",discount:"0",discountType:"value",includedServices:[] }); setIsServiceModalOpen(true); }} className="rounded-xl shadow-lg shadow-amber-500/20 text-[10px] md:text-xs">
                <Plus size={14} className="mr-1" /><span className="hidden sm:inline">Novo </span>Serviço
              </Button>
            )}
            {activeTab === 'comandas' && (
              <Button size="sm" onClick={() => setIsComandaModalOpen(true)} className="rounded-xl shadow-lg shadow-amber-500/20 text-[10px] md:text-xs">
                <Plus size={14} className="mr-1" /><span className="hidden sm:inline">Nova </span>Comanda
              </Button>
            )}
            {activeTab === 'clients' && (
              <Button size="sm" onClick={() => setIsClientModalOpen(true)} className="rounded-xl shadow-lg shadow-amber-500/20 text-[10px] md:text-xs">
                <Plus size={14} className="mr-1" /><span className="hidden sm:inline">Novo </span>Cliente
              </Button>
            )}
            {activeTab === 'agenda' && (
              <Button size="sm" onClick={() => setIsAppointmentModalOpen(true)} className="rounded-xl shadow-lg shadow-amber-500/20 text-[10px] md:text-xs">
                <Plus size={14} className="mr-1" /><span className="hidden sm:inline">Novo </span>Agendamento
              </Button>
            )}
            {activeTab === 'professionals' && (
              <Button size="sm" onClick={() => { setEditingProfessional(null); setNewProfessional({ name:"",role:"",password:"",showPassword:false }); setIsProfessionalModalOpen(true); }} className="rounded-xl shadow-lg shadow-amber-500/20 text-[10px] md:text-xs">
                <Plus size={14} className="mr-1" /><span className="hidden sm:inline">Novo </span>Profissional
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >

        {activeTab === 'dash' && (
          <DashboardTab
            revenueData={revenueData}
            servicesData={servicesData}
            appointments={appointments}
            comandas={comandas}
            clients={clients}
            handleTabChange={handleTabChange}
            setIsAppointmentModalOpen={setIsAppointmentModalOpen}
            setIsComandaModalOpen={setIsComandaModalOpen}
            setIsClientModalOpen={setIsClientModalOpen}
          />
        )}

        {activeTab === 'agenda' && (
          <AgendaTab
            view={view}
            setView={setView}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            setIsAppointmentModalOpen={setIsAppointmentModalOpen}
            selectedProfessional={selectedProfessional}
            setSelectedProfessional={setSelectedProfessional}
            professionals={professionals}
            appointments={appointments}
            daysInMonth={daysInMonth}
            setSlotHover={setSlotHover}
            setNewAppointment={setNewAppointment}
            hoveredAppointment={hoveredAppointment}
            setHoveredAppointment={setHoveredAppointment}
          />
        )}

        {activeTab === 'minha-agenda' && (
          <MinhaAgendaTab />
        )}

        {activeTab === 'services' && (
          <ServicesTab
            services={services}
            serviceSubTab={serviceSubTab}
            setServiceSubTab={setServiceSubTab}
            setEditingService={setEditingService}
            setNewService={setNewService}
            setIsServiceModalOpen={setIsServiceModalOpen}
            handleDeleteService={handleDeleteService}
          />
        )}

        {activeTab === 'clients' && (
          <ClientsTab
            clientView={clientView}
            setClientView={setClientView}
            clients={clients}
            setIsClientModalOpen={setIsClientModalOpen}
            calculateAge={calculateAge}
            handleEditClient={handleEditClient}
            handleDeleteClient={handleDeleteClient}
          />
        )}

        {activeTab === 'comandas' && (
          <ComandasTab
            comandas={comandas}
            setIsComandaModalOpen={setIsComandaModalOpen}
            selectedComanda={selectedComanda}
            setSelectedComanda={setSelectedComanda}
            isComandaDetailOpen={isComandaDetailOpen}
            setIsComandaDetailOpen={setIsComandaDetailOpen}
            handlePayComanda={handlePayComanda}
          />
        )}

        {activeTab === 'fluxo' && (
          <FluxoTab comandas={comandas} />
        )}

        {activeTab === 'professionals' && (
          <ProfessionalsTab
            professionals={professionals}
            setEditingProfessional={setEditingProfessional}
            setNewProfessional={setNewProfessional}
            setIsProfessionalModalOpen={setIsProfessionalModalOpen}
            handleDeleteProfessional={handleDeleteProfessional}
          />
        )}

        {/* ── HORÁRIOS ─────────────────────────────────────────── */}
        {activeTab === 'horarios' && (
          <HorariosTab
            workingHours={workingHours}
            setWorkingHours={setWorkingHours}
            localWorkingHours={localWorkingHours}
            setLocalWorkingHours={setLocalWorkingHours}
            holidays={holidays}
            setHolidays={setHolidays}
            newHoliday={newHoliday}
            setNewHoliday={setNewHoliday}
          />
        )}

        {/* ── MEU PERFIL ───────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <AdminProfileTab />
        )}

        {/* ── CONFIGURAÇÕES ────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <SettingsTab
            currentTheme={currentTheme}
            themeColors={themeColors}
            themeColor={themeColor}
            handleThemeChange={handleThemeChange}
            settingsOpenCard={settingsOpenCard}
            setSettingsOpenCard={setSettingsOpenCard}
          />
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

      {/* ═══ MODAL AGENDAMENTO ═══════════════════════════════════ */}
      <AnimatePresence>
        {isAppointmentModalOpen && (() => {
          const closeAppt = () => { setIsAppointmentModalOpen(false); setClientComandaStatus(null); setClientSearchResults([]); };
          const [h, m] = newAppointment.startTime.split(':').map(Number);
          const totalMins = h * 60 + m + newAppointment.duration;
          const endH = Math.floor(totalMins / 60) % 24;
          const endM = totalMins % 60;
          const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
          const statusOpts = [
            { value:'agendado', label:'Agendado', color:'bg-blue-50 text-blue-700 border-blue-200' },
            { value:'confirmado', label:'Confirmado', color:'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { value:'realizado', label:'Realizado', color:'bg-zinc-100 text-zinc-600 border-zinc-200' },
            { value:'cancelado', label:'Cancelado', color:'bg-red-50 text-red-600 border-red-200' },
            { value:'faltou', label:'Faltou', color:'bg-orange-50 text-orange-600 border-orange-200' },
            { value:'reagendado', label:'Reagendado', color:'bg-violet-50 text-violet-700 border-violet-200' },
          ];
          return (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                onClick={closeAppt} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]" />
              {/* Modal — bottom-sheet on mobile, centered on sm+ */}
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                <motion.div
                  initial={{opacity:0, y:40}} animate={{opacity:1, y:0}} exit={{opacity:0, y:40}}
                  transition={{duration:0.2, ease:[0.32,0.72,0,1]}}
                  className="w-full sm:max-w-2xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl pointer-events-auto border border-zinc-200 flex flex-col"
                  style={{maxHeight:'92dvh'}}
                >
                  {/* Mobile drag handle */}
                  <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
                    <div className="w-10 h-1 rounded-full bg-zinc-300" />
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between px-4 sm:px-6 pt-3 sm:pt-5 pb-0 shrink-0">
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-zinc-900">Novo Agendamento</h2>
                      <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 capitalize">
                        {format(newAppointment.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <button onClick={closeAppt} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all mt-0.5 shrink-0">
                      <X size={16} />
                    </button>
                  </div>

                  {/* Type Tabs */}
                  <div className="px-4 sm:px-6 pt-3 pb-2 shrink-0">
                    <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
                      {([
                        { value:'atendimento', label:'Agendamento', shortLabel:'Agend.', icon:<Scissors size={12}/> },
                        { value:'pessoal',     label:'Evento Pessoal', shortLabel:'Pessoal', icon:<Users size={12}/> },
                        { value:'bloqueio',    label:'Bloqueio Agenda', shortLabel:'Bloqueio', icon:<CalendarOff size={12}/> },
                      ] as const).map(t => (
                        <button key={t.value}
                          onClick={() => setNewAppointment((p: any) => ({...p, type: t.value}))}
                          className={cn("flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all",
                            newAppointment.type === t.value
                              ? t.value === 'bloqueio' ? "bg-white text-red-600 shadow-sm border border-red-200"
                                : t.value === 'pessoal' ? "bg-white text-blue-600 shadow-sm border border-blue-200"
                                : "bg-white text-amber-600 shadow-sm border border-amber-200"
                              : "text-zinc-500 hover:text-zinc-700"
                          )}>
                          {t.icon}
                          <span className="hidden xs:inline sm:inline">{t.label}</span>
                          <span className="xs:hidden sm:hidden">{t.shortLabel}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="px-4 sm:px-6 pb-2 overflow-y-auto flex-1">
                    {newAppointment.type === 'atendimento' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                        {/* ── ESQUERDA: Identificação ── */}
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-amber-500" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Identificação</p>
                          </div>

                          {/* Cliente combobox */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cliente</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><Users size={13}/></div>
                              <input type="text"
                                className="w-full text-xs pl-8 pr-8 py-2.5 sm:py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                                placeholder="Pesquisar ou adicionar cliente..."
                                value={newAppointment.clientName}
                                onChange={e => handleSearchClientByName(e.target.value)}
                                onBlur={() => setTimeout(() => setClientSearchResults([]), 200)}
                              />
                              {newAppointment.clientId
                                ? <button className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-red-400 transition-colors" onClick={() => { setNewAppointment((prev: any) => ({...prev, clientId:"", clientName:"", clientPhone:""})); setClientComandaStatus(null); }}><X size={13}/></button>
                                : <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"><ChevronDown size={13}/></div>
                              }
                              {newAppointment.clientName.length >= 1 && !newAppointment.clientId && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto mt-1 p-1">
                                  {clientSearchResults.length === 0 && (
                                    <p className="px-3 py-2 text-[10px] text-zinc-400 text-center font-medium">Nenhum cliente encontrado</p>
                                  )}
                                  {clientSearchResults.map((c: any) => {
                                    const hasOpen = c.comandas?.some((co:any) => co.status === "open");
                                    return (
                                      <button key={c.id}
                                        onMouseDown={() => handleSelectClientForAppointment(c)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 rounded-lg transition-all border-b border-zinc-100 last:border-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-black shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                                            <p className="font-bold text-zinc-900 truncate">{c.name}</p>
                                          </div>
                                          {hasOpen && <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md border border-amber-200 uppercase shrink-0">Comanda</span>}
                                        </div>
                                        <p className="text-zinc-400 text-[10px] mt-0.5 ml-8">{c.phone}</p>
                                      </button>
                                    );
                                  })}
                                  <button
                                    onMouseDown={() => { setIsClientModalOpen(true); setClientSearchResults([]); }}
                                    className="w-full text-left px-3 py-2 text-xs text-amber-600 font-bold hover:bg-amber-50 rounded-lg transition-all flex items-center gap-2 border-t border-zinc-100">
                                    <Plus size={12}/> Cadastrar "{newAppointment.clientName}"
                                  </button>
                                </div>
                              )}
                            </div>
                            {newAppointment.clientId && (
                              <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 ml-1">
                                <CheckCircle size={10}/> {newAppointment.clientPhone}
                              </p>
                            )}
                          </div>

                          {/* Serviço */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                              Serviço
                            </label>
                            <Combobox
                              options={services
                                .filter((s: any) => s.type !== 'package')
                                .map((s: any) => ({
                                  value: s.id,
                                  label: s.name,
                                  subtitle: s.duration ? `${s.duration} min` : undefined,
                                  badge: `R$ ${Number(s.price).toFixed(0)}`,
                                  badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
                                }))}
                              value={newAppointment.serviceId}
                              placeholder="Selecionar serviço..."
                              searchPlaceholder="Buscar serviço..."
                              onChange={val => {
                                const id = val as string;
                                const s = services.find((item: any) => item.id === id);
                                setNewAppointment((prev: any) => ({
                                  ...prev,
                                  serviceId: id,
                                  packageId: id ? "" : prev.packageId,
                                  duration: s?.duration || prev.duration,
                                }));
                              }}
                              size="sm"
                            />
                          </div>

                          {/* Pacote */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                              Pacote
                            </label>
                            <Combobox
                              options={services
                                .filter((s: any) => s.type === 'package')
                                .map((s: any) => ({
                                  value: s.id,
                                  label: s.name,
                                  subtitle: s.includedServices?.length
                                    ? `${s.includedServices.length} serviços incluídos`
                                    : undefined,
                                  badge: `R$ ${Number(s.price).toFixed(0)}`,
                                  badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
                                }))}
                              value={newAppointment.packageId}
                              placeholder="Selecionar pacote..."
                              searchPlaceholder="Buscar pacote..."
                              onChange={val => {
                                const id = val as string;
                                const s = services.find((item: any) => item.id === id);
                                setNewAppointment((prev: any) => ({
                                  ...prev,
                                  packageId: id,
                                  serviceId: id ? "" : prev.serviceId,
                                  duration: s?.duration || prev.duration,
                                  recurrence: { ...prev.recurrence, count: id ? 4 : 1 },
                                }));
                              }}
                              size="sm"
                            />
                          </div>

                          {/* Status */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</label>
                            <div className="relative">
                              <select
                                className="w-full appearance-none text-xs p-2.5 sm:p-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                                value={newAppointment.status}
                                onChange={e => setNewAppointment((p: any) => ({...p, status: e.target.value as any}))}
                              >
                                {statusOpts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                            </div>
                            <div className={cn("inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest",
                              statusOpts.find(s => s.value === newAppointment.status)?.color)}>
                              {statusOpts.find(s => s.value === newAppointment.status)?.label}
                            </div>
                          </div>
                        </div>

                        {/* ── DIREITA: Horário e Repetição ── */}
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-4 rounded-full bg-emerald-500" />
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Horário e Repetição</p>
                          </div>

                          {/* Data + Hora + Duração — 3 cols on sm+, 2 cols on xs, stacked on mobile */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Data</label>
                              <input type="date"
                                className="w-full text-[11px] p-2 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                value={format(newAppointment.date, "yyyy-MM-dd")}
                                onChange={e => setNewAppointment((p: any) => ({...p, date: new Date(e.target.value+'T12:00:00')}))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Hora</label>
                              <input type="time"
                                className="w-full text-[11px] p-2 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                value={newAppointment.startTime}
                                onChange={e => setNewAppointment((p: any) => ({...p, startTime: e.target.value}))}
                              />
                            </div>
                            <div className="space-y-1 col-span-2 sm:col-span-1">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Duração (min)</label>
                              <input type="number" min={5} step={5}
                                className="w-full text-[11px] p-2 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none text-center"
                                value={newAppointment.duration}
                                onChange={e => setNewAppointment((p: any) => ({...p, duration: parseInt(e.target.value)||60}))}
                              />
                            </div>
                          </div>

                          {/* Término previsto */}
                          <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                            <Clock size={14} className="text-zinc-400 shrink-0"/>
                            <div className="flex-1">
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Término Previsto</p>
                              <p className="text-base font-black text-amber-600">{endTime}h</p>
                            </div>
                          </div>

                            {/* Profissional */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Profissional Responsável</label>
                              <Combobox
                                options={professionals.map((p: any) => ({
                                  value: p.id,
                                  label: p.name,
                                  subtitle: p.role,
                                  badge: "Equipe",
                                  badgeColor: "bg-zinc-100 text-zinc-600 border-zinc-200"
                                }))}
                                value={newAppointment.professionalId}
                                placeholder="Buscar profissional..."
                                searchPlaceholder="Buscar equipe..."
                                onChange={val => setNewAppointment((p: any) => ({...p, professionalId: val as string}))}
                                size="sm"
                              />
                            </div>

                          {/* Repetição */}
                          <button
                            onClick={() => setIsRepeatModalOpen(true)}
                            className="w-full flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all group"
                          >
                            <div className="p-1.5 rounded-lg bg-zinc-200 group-hover:bg-amber-100 transition-colors shrink-0">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 group-hover:text-amber-600">
                                <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                              </svg>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Repetição Fixa</p>
                              <p className="text-xs font-bold text-zinc-700 group-hover:text-amber-700 truncate">{repeatLabel}</p>
                            </div>
                            <ChevronDown size={13} className="text-zinc-400 -rotate-90 shrink-0"/>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Pessoal / Bloqueio layout simples */}
                    {(newAppointment.type === 'pessoal' || newAppointment.type === 'bloqueio') && (
                      <div className="space-y-3 py-1">
                        <div className={cn("p-3 sm:p-4 rounded-xl border text-xs font-bold",
                          newAppointment.type === 'bloqueio' ? "bg-red-50 border-red-200 text-red-600" : "bg-blue-50 border-blue-200 text-blue-600"
                        )}>
                          {newAppointment.type === 'bloqueio'
                            ? "Este horário ficará bloqueado e indisponível para clientes."
                            : "Compromisso pessoal — não aparece para clientes."}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Data</label>
                            <input type="date" className="w-full text-[11px] p-2 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold outline-none"
                              value={format(newAppointment.date, "yyyy-MM-dd")}
                              onChange={e => setNewAppointment((p: any) => ({...p, date: new Date(e.target.value+'T12:00:00')}))}/>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Hora</label>
                            <input type="time" className="w-full text-[11px] p-2 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold outline-none"
                              value={newAppointment.startTime}
                              onChange={e => setNewAppointment((p: any) => ({...p, startTime: e.target.value}))}/>
                          </div>
                          <div className="space-y-1 col-span-2 sm:col-span-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Duração (min)</label>
                            <input type="number" className="w-full text-[11px] p-2 sm:p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold outline-none text-center"
                              value={newAppointment.duration}
                              onChange={e => setNewAppointment((p: any) => ({...p, duration: parseInt(e.target.value)||60}))}/>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Profissional</label>
                          <select className="w-full text-xs p-2.5 sm:p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold outline-none"
                            value={newAppointment.professionalId}
                            onChange={e => setNewAppointment((p: any) => ({...p, professionalId: e.target.value}))}>
                            <option value="">Selecionar...</option>
                            {professionals.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {newAppointment.type === 'atendimento' && (
                      <div className="mt-3 sm:mt-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-violet-400" />
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observações</p>
                        </div>
                        <textarea rows={2}
                          className="w-full text-xs p-2.5 sm:p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none resize-none placeholder:text-zinc-400"
                          placeholder="Adicione detalhes sobre o atendimento, avisos importantes..."
                          value={newAppointment.notes}
                          onChange={e => setNewAppointment((p: any) => ({...p, notes: e.target.value}))}
                        />
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-100 shrink-0">
                    <button onClick={closeAppt} className="px-3 sm:px-4 py-2 text-sm font-bold text-zinc-400 hover:text-zinc-700 transition-all">
                      Descartar
                    </button>
                    <button
                      onClick={handleCreateAppointment}
                      disabled={!newAppointment.professionalId || (newAppointment.type === 'atendimento' && (!newAppointment.clientName || (!newAppointment.serviceId && !newAppointment.packageId)))}
                      className={cn("flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all disabled:opacity-40",
                        newAppointment.type === 'bloqueio' ? "bg-red-500 hover:bg-red-600" :
                        newAppointment.type === 'pessoal' ? "bg-blue-500 hover:bg-blue-600" :
                        "bg-amber-500 hover:bg-amber-600"
                      )}
                    >
                      <CheckCircle size={14}/>
                      {newAppointment.type === 'bloqueio' ? 'Bloquear Horário' :
                       newAppointment.type === 'pessoal' ? 'Salvar Compromisso' :
                       'Confirmar Agendamento'}
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ═══ MODAL SELEÇÃO DE REPETIÇÃO ════════════════════════ */}
      <AnimatePresence>
        {isRepeatModalOpen && (() => {
          const repeatOpts = [
            { label: 'Não Repete', type:'none', interval:0, count:0 },
            { label: 'Semanal — 4 sessões',   type:'weekly', interval:7,  count:4  },
            { label: 'Semanal — 8 sessões',   type:'weekly', interval:7,  count:8  },
            { label: 'Semanal — 12 sessões',  type:'weekly', interval:7,  count:12 },
            { label: 'Semanal — 16 sessões',  type:'weekly', interval:7,  count:16 },
            { label: 'Semanal — 20 sessões',  type:'weekly', interval:7,  count:20 },
            { label: 'A cada 15 dias — 4 sessões', type:'biweekly', interval:15, count:4 },
            { label: 'A cada 15 dias — 8 sessões', type:'biweekly', interval:15, count:8 },
            { label: 'Mensal — 3 sessões',  type:'monthly', interval:30, count:3  },
            { label: 'Mensal — 6 sessões',  type:'monthly', interval:30, count:6  },
            { label: 'Mensal — 12 sessões', type:'monthly', interval:30, count:12 },
            { label: 'Personalizado...', type:'custom', interval:0, count:0 },
          ];
          return (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                onClick={() => setIsRepeatModalOpen(false)} className="fixed inset-0 z-[60] bg-black/30" />
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <motion.div initial={{opacity:0,scale:0.97,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97,y:8}} transition={{duration:0.15}}
                  className="w-full max-w-sm bg-white rounded-2xl shadow-2xl pointer-events-auto border border-zinc-200">
                  <div className="flex items-start justify-between px-5 pt-5 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Seleção Atual</h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Escolha uma opção abaixo para mudar a seleção</p>
                    </div>
                    <button onClick={() => setIsRepeatModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-all">
                      <X size={14}/>
                    </button>
                  </div>

                  {/* Current selection highlight */}
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-600">
                          <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Opção Atual</p>
                        <p className="text-sm font-bold text-blue-800">{repeatLabel}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-blue-500 italic mt-2 px-1">
                      Dica: Escolha repetição semanal caso queira que sempre caia no mesmo dia da semana
                    </p>
                  </div>

                  {/* List */}
                  <div className="max-h-64 overflow-y-auto border-t border-zinc-100 divide-y divide-zinc-100">
                    {repeatOpts.map(opt => (
                      <button key={opt.label}
                        onClick={() => {
                          if (opt.type === 'custom') {
                            setIsRepeatModalOpen(false);
                            setIsCustomRepeatModalOpen(true);
                            return;
                          }
                          setRepeatLabel(opt.label);
                          setNewAppointment(p => ({...p, recurrence: {type: opt.type, count: opt.count, interval: opt.interval}}));
                          setIsRepeatModalOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-5 py-3.5 text-xs font-bold transition-all hover:bg-zinc-50",
                          repeatLabel === opt.label ? "text-blue-600 bg-blue-50" : "text-zinc-700"
                        )}
                      >
                        <span className="uppercase tracking-widest">{opt.label}</span>
                        <ChevronRight size={14} className="text-zinc-400"/>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ═══ MODAL REPETIÇÃO PERSONALIZADA ═════════════════════ */}
      <AnimatePresence>
        {isCustomRepeatModalOpen && (() => {
          const freqOpts = ['Semanalmente', 'Mensalmente', 'Diariamente', 'A cada 15 dias'];
          const unitMap: Record<string, string> = {
            'Semanalmente':'SEMANA(S)', 'Mensalmente':'MÊS(ES)', 'Diariamente':'DIA(S)', 'A cada 15 dias':'SEMANA(S)'
          };
          return (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                onClick={() => setIsCustomRepeatModalOpen(false)} className="fixed inset-0 z-[70] bg-black/30"/>
              <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
                <motion.div initial={{opacity:0,scale:0.97,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97,y:8}} transition={{duration:0.15}}
                  className="w-full max-w-sm bg-white rounded-2xl shadow-2xl pointer-events-auto border border-zinc-200">
                  <div className="flex items-start justify-between px-5 pt-5 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Configurar Repetição</h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Defina como este agendamento irá se repetir</p>
                    </div>
                    <button onClick={() => setIsCustomRepeatModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-all">
                      <X size={14}/>
                    </button>
                  </div>

                  <div className="px-5 pb-5 space-y-5">
                    {/* Frequência */}
                    <div className="border border-zinc-200 rounded-xl overflow-hidden">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-4 py-3 bg-zinc-50 border-b border-zinc-100">Frequência de Repetição</p>
                      <div className="p-3">
                        <select
                          className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold outline-none"
                          value={customRepeat.frequency}
                          onChange={e => setCustomRepeat(p => ({...p, frequency: e.target.value, unit: unitMap[e.target.value]||'SEMANA(S)'}))}
                        >
                          {freqOpts.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">A Cada</p>
                            <input type="number" min={1}
                              className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold outline-none text-center"
                              value={customRepeat.interval}
                              onChange={e => setCustomRepeat(p => ({...p, interval: parseInt(e.target.value)||1}))}
                            />
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Unidade</p>
                            <div className="p-3 bg-zinc-100 border border-zinc-200 rounded-xl text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">
                              {customRepeat.unit}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terminar em */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400">
                          <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/>
                        </svg>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Terminar Em</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setCustomRepeat(p => ({...p, endType:'count'}))}
                          className={cn("p-4 rounded-xl border-2 text-center transition-all",
                            customRepeat.endType === 'count' ? "border-amber-400 bg-amber-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                          )}
                        >
                          <p className={cn("text-[9px] font-black uppercase tracking-widest mb-2", customRepeat.endType==='count'?"text-amber-500":"text-zinc-400")}>Por Vezes</p>
                          <div className="flex items-center justify-center gap-2">
                            <input type="number" min={1}
                              className="w-12 text-center text-sm font-black bg-white border border-zinc-200 rounded-lg p-1 outline-none"
                              value={customRepeat.count}
                              onClick={e => { e.stopPropagation(); setCustomRepeat(p => ({...p, endType:'count'})); }}
                              onChange={e => setCustomRepeat(p => ({...p, count: parseInt(e.target.value)||1}))}
                            />
                            <span className="text-[9px] font-bold text-zinc-400 uppercase">Vezes</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setCustomRepeat(p => ({...p, endType:'date'}))}
                          className={cn("p-4 rounded-xl border-2 text-center transition-all",
                            customRepeat.endType === 'date' ? "border-amber-400 bg-amber-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                          )}
                        >
                          <p className={cn("text-[9px] font-black uppercase tracking-widest mb-2", customRepeat.endType==='date'?"text-amber-500":"text-zinc-400")}>Por Data</p>
                          <input type="date"
                            className="w-full text-[10px] text-center bg-white border border-zinc-200 rounded-lg p-1 outline-none font-bold"
                            value={customRepeat.endDate}
                            onClick={e => { e.stopPropagation(); setCustomRepeat(p => ({...p, endType:'date'})); }}
                            onChange={e => setCustomRepeat(p => ({...p, endDate: e.target.value}))}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => { setIsCustomRepeatModalOpen(false); setIsRepeatModalOpen(true); }}
                        className="flex-1 py-3 text-xs font-bold text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-xl transition-all"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={() => {
                          const label = `${customRepeat.frequency} — ${customRepeat.endType==='count' ? `${customRepeat.count} sessões` : `até ${customRepeat.endDate}`}`;
                          setRepeatLabel(label);
                          setNewAppointment(p => ({...p, recurrence: {type:'custom', count: customRepeat.count, interval: customRepeat.interval}}));
                          setIsCustomRepeatModalOpen(false);
                        }}
                        className="flex-1 py-3 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all shadow-sm"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ═══ MODAL NOVA COMANDA ═══════════════════════════════ */}
      <AnimatePresence>
        {isComandaModalOpen && (() => {
          const closeComanda = () => { setIsComandaModalOpen(false); setComandaClientSearchResults([]); setNewComanda({ ...emptyComanda }); };
          const subtotal = newComanda.type === 'normal'
            ? (parseFloat(newComanda.value || "0") * parseInt(newComanda.sessionCount || "1"))
            : newComanda.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
          const d = parseFloat(newComanda.discount) || 0;
          const total = newComanda.discountType === 'percentage' ? subtotal * (1 - d / 100) : subtotal - d;
          return (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                onClick={closeComanda} className="fixed inset-0 z-50 bg-black/30" />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <motion.div initial={{opacity:0,scale:0.97,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97,y:8}} transition={{duration:0.18}}
                  className="w-full max-w-lg bg-white rounded-2xl shadow-2xl pointer-events-auto border border-zinc-200 flex flex-col max-h-[92vh]">

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
                    <h2 className="text-base font-bold text-zinc-900">Criando Comanda</h2>
                    <button onClick={closeComanda} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-all"><X size={16}/></button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">

                    {/* ── TIPO ── */}
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-zinc-500">Tipo:</span>
                      {(['normal','pacote'] as const).map(t => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer">
                          <div onClick={() => setNewComanda(p => ({...p, type: t}))}
                            className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                              newComanda.type === t ? "border-amber-500" : "border-zinc-300")}>
                            {newComanda.type === t && <div className="w-2 h-2 rounded-full bg-amber-500"/>}
                          </div>
                          <span className="text-xs font-semibold text-zinc-700">{t === 'normal' ? 'Comanda Normal' : 'Comanda Pacote'}</span>
                        </label>
                      ))}
                    </div>

                    {newComanda.type === 'normal' ? (
                      <>
                        {/* Descrição */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Descrição</label>
                          <input type="text" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                            placeholder="Ex: Sessão de Corte, Coloração, etc"
                            value={newComanda.description} onChange={e => setNewComanda(p => ({...p, description: e.target.value}))} />
                        </div>

                        {/* Cliente + Data */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cliente</label>
                            <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><Search size={12}/></div>
                              <input type="text" className="w-full text-xs pl-8 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                placeholder="Selecione um cliente..."
                                value={newComanda.clientName}
                                onChange={e => handleSearchClientForComanda(e.target.value)}
                                onBlur={() => setTimeout(() => setComandaClientSearchResults([]), 180)} />
                              {newComanda.clientName.length >= 1 && !newComanda.clientId && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto mt-1 p-1">
                                  {comandaClientSearchResults.length === 0
                                    ? <p className="px-3 py-2 text-[10px] text-zinc-400 text-center">Nenhum cliente encontrado</p>
                                    : comandaClientSearchResults.map(c => (
                                        <button key={c.id} onMouseDown={() => handleSelectClientForComanda(c)}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 rounded-lg transition-all border-b border-zinc-50 last:border-0">
                                          <p className="font-bold text-zinc-900">{c.name}</p>
                                          <p className="text-zinc-400 text-[10px]">{c.phone}</p>
                                        </button>
                                      ))
                                  }
                                  <button onMouseDown={() => { setComandaClientSearchResults([]); setIsClientModalOpen(true); }}
                                    className="w-full text-left px-3 py-2 text-xs text-amber-600 font-bold hover:bg-amber-50 rounded-lg border-t border-zinc-100 flex items-center gap-1">
                                    <Plus size={11}/> Novo cliente
                                  </button>
                                </div>
                              )}
                            </div>
                            {newComanda.clientId && <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 ml-1"><CheckCircle size={9}/> {newComanda.clientName}</p>}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Data</label>
                            <input type="date" className="w-full text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                              value={newComanda.date} onChange={e => setNewComanda(p => ({...p, date: e.target.value}))} />
                          </div>
                        </div>

                        {/* Valor + Atendimentos */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Valor Uni. (R$)</label>
                            <input type="number" min="0" step="0.01" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                              placeholder="0,00" value={newComanda.value} onChange={e => setNewComanda(p => ({...p, value: e.target.value}))} />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nº Sessões (Total)</label>
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">PROD: 0/{newComanda.sessionCount}</span>
                            </div>
                            <input type="number" min="1" className="w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                              value={newComanda.sessionCount} onChange={e => setNewComanda(p => ({...p, sessionCount: e.target.value}))} />
                          </div>
                        </div>

                        {/* Profissional */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Profissional</label>
                          <div className="relative">
                            <select className="w-full appearance-none text-xs p-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                              value={newComanda.professionalId} onChange={e => setNewComanda(p => ({...p, professionalId: e.target.value}))}>
                              <option value="">{professionals[0]?.name || "Selecionar..."}</option>
                              {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Pacote */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Pacote</label>
                          <div className="relative">
                            <select className="w-full appearance-none text-xs p-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                              value={newComanda.packageId} onChange={e => setNewComanda(p => ({...p, packageId: e.target.value}))}>
                              <option value="">Selecione uma definição de pacote</option>
                              {services.filter(s => s.type === 'package').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                          </div>
                        </div>

                        {/* Cliente */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cliente</label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"><Search size={12}/></div>
                            <input type="text" className="w-full text-xs pl-8 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                              placeholder="Selecione um cliente..."
                              value={newComanda.clientName}
                              onChange={e => handleSearchClientForComanda(e.target.value)}
                              onBlur={() => setTimeout(() => setComandaClientSearchResults([]), 180)} />
                            {newComanda.clientName.length >= 1 && !newComanda.clientId && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto mt-1 p-1">
                                {comandaClientSearchResults.map(c => (
                                  <button key={c.id} onMouseDown={() => handleSelectClientForComanda(c)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 rounded-lg transition-all border-b border-zinc-50 last:border-0">
                                    <p className="font-bold text-zinc-900">{c.name}</p>
                                    <p className="text-zinc-400 text-[10px]">{c.phone}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                            {newComanda.clientId && <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-1 ml-1"><CheckCircle size={9}/> {newComanda.clientName}</p>}
                          </div>
                        </div>

                        {/* Profissional */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Profissional</label>
                          <div className="relative">
                            <select className="w-full appearance-none text-xs p-3 pr-8 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                              value={newComanda.professionalId} onChange={e => setNewComanda(p => ({...p, professionalId: e.target.value}))}>
                              <option value="">{professionals[0]?.name || "Selecionar..."}</option>
                              {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                          </div>
                        </div>

                        {/* Itens */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Itens:</label>
                          <div className="grid grid-cols-[1fr_60px_80px_32px] gap-2 items-center">
                            <span className="text-[10px] font-bold text-zinc-400">Serviço</span>
                            <span className="text-[10px] font-bold text-zinc-400">Qtd</span>
                            <span className="text-[10px] font-bold text-zinc-400">Preço</span>
                            <span/>
                          </div>
                          <div className="space-y-2 max-h-36 overflow-y-auto">
                            {newComanda.items.map(item => (
                              <div key={item.id} className="grid grid-cols-[1fr_60px_80px_32px] gap-2 items-center">
                                <div className="relative">
                                  <select className="w-full appearance-none text-xs p-2 pr-6 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 outline-none"
                                    value={item.id} onChange={e => {
                                      const s = services.find(sv => sv.id === e.target.value);
                                      if (!s) return;
                                      setNewComanda(prev => ({...prev, items: prev.items.map(i => i.id === item.id ? {...i, id: s.id, name: s.name, price: Number(s.price)} : i)}));
                                    }}>
                                    <option value="">Selecione</option>
                                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                                </div>
                                <input type="number" min={1} className="text-xs p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-bold outline-none"
                                  value={item.quantity} onChange={e => { const val = parseInt(e.target.value)||1; setNewComanda(prev => ({...prev, items: prev.items.map(i => i.id === item.id ? {...i, quantity: val} : i)})); }} />
                                <input type="number" step="0.01" className="text-xs p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-bold outline-none"
                                  value={item.price} onChange={e => { const val = parseFloat(e.target.value)||0; setNewComanda(prev => ({...prev, items: prev.items.map(i => i.id === item.id ? {...i, price: val} : i)})); }} />
                                <button onClick={() => setNewComanda(prev => ({...prev, items: prev.items.filter(i => i.id !== item.id)}))} className="flex items-center justify-center w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setNewComanda(prev => ({...prev, items: [...prev.items, {id: `new-${Date.now()}`, name:"", price:0, quantity:1}]}))}
                            className="w-full py-2.5 border-2 border-dashed border-zinc-200 rounded-xl text-[10px] font-black text-zinc-400 hover:border-amber-300 hover:text-amber-500 transition-all uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <Plus size={12}/> Adicionar Item
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── TOTAIS ── */}
                    <div className="border-t border-zinc-100 pt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-medium">Valor Total:</span>
                        <span className="font-bold text-zinc-800">R$ {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-medium">Desconto:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
                            {(['percentage','value'] as const).map(dt => (
                              <button key={dt} onClick={() => setNewComanda(p => ({...p, discountType: dt}))}
                                className={cn("px-2 py-1 text-[10px] font-bold transition-all", newComanda.discountType === dt ? "bg-zinc-800 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50")}>
                                {dt === 'percentage' ? '%' : 'R$'}
                              </button>
                            ))}
                          </div>
                          <input type="number" min="0" step="0.01" className="w-20 text-xs p-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-right font-bold outline-none"
                            value={newComanda.discount} onChange={e => setNewComanda(p => ({...p, discount: e.target.value}))} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm font-black pt-1 border-t border-zinc-100">
                        <span className="text-zinc-700">Total Líquido:</span>
                        <span className="text-zinc-900">R$ {total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 shrink-0">
                    <button onClick={closeComanda} className="px-4 py-2 text-sm font-bold text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded-xl transition-all hover:border-zinc-300">
                      Fechar
                    </button>
                    <button
                      onClick={handleCreateComanda}
                      disabled={!newComanda.clientId && !newComanda.clientPhone}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/20 transition-all disabled:opacity-40"
                    >
                      <Plus size={15}/>
                      Criar
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

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

      <Modal
        isOpen={isClientModalOpen}
        onClose={() => { setIsClientModalOpen(false); setEditingClient(null); setNewClient({ ...emptyClient }); setClientPersonalOpen(false); }}
        title={editingClient ? "Editar Cliente" : "Novo Cliente"}
        className="max-w-lg"
      >
        {/* INPUT STYLE HELPER */}
        {(() => {
          const inp = "w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all";
          const label = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
          const field = "space-y-1.5";

          return (
            <div className="space-y-5">
              {/* DADOS BÁSICOS */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5"><Users size={11}/> Dados Básicos <span className="text-zinc-400 normal-case font-medium">(obrigatório)</span></p>
                <div className="space-y-3">
                  <div className={field}>
                    <label className={label}>Nome Completo *</label>
                    <input type="text" className={inp} placeholder="Ex: João Silva"
                      value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={field}>
                      <label className={label}>Telefone *</label>
                      <input type="tel" className={inp} placeholder="(00) 00000-0000"
                        value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: maskPhone(e.target.value) }))} />
                    </div>
                    <div className={field}>
                      <label className={label}>E-mail</label>
                      <input type="email" className={inp} placeholder="email@exemplo.com"
                        value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <div
                      onClick={() => setNewClient(p => ({ ...p, whatsapp: !p.whatsapp }))}
                      className={cn("w-9 h-5 rounded-full transition-all relative shrink-0", newClient.whatsapp ? "bg-green-500" : "bg-zinc-200")}
                    >
                      <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", newClient.whatsapp ? "left-4" : "left-0.5")} />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-600 flex items-center gap-1"><MessageCircle size={12} className="text-green-500"/>Usa WhatsApp nesse número</span>
                  </label>
                </div>
              </div>

              {/* DOCUMENTOS & NASCIMENTO */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5"><Hash size={11}/> Documentos & Nascimento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className={field}>
                    <label className={label}>CPF</label>
                    <input type="text" className={inp} placeholder="000.000.000-00"
                      value={newClient.cpf} onChange={e => setNewClient(p => ({ ...p, cpf: maskCPF(e.target.value) }))} />
                  </div>
                  <div className={field}>
                    <label className={label}>Data de Nascimento</label>
                    <input type="text" className={inp} placeholder="DD/MM/AAAA"
                      value={newClient.birthDate} onChange={e => setNewClient(p => ({ ...p, birthDate: maskDate(e.target.value) }))} />
                  </div>
                </div>
                {newClient.birthDate && (() => {
                  const age = calculateAge(newClient.birthDate);
                  return age !== null ? (
                    <p className="mt-1.5 text-[10px] font-bold text-amber-600 flex items-center gap-1">
                      <Cake size={10}/> {age} anos
                    </p>
                  ) : null;
                })()}
              </div>

              {/* ENDEREÇO */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-1.5"><MapPinIcon size={11}/> Endereço</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className={cn(field, "col-span-2")}>
                      <label className={label}>CEP</label>
                      <div className="relative">
                        <input type="text" className={inp} placeholder="00000-000"
                          value={newClient.cep}
                          onChange={e => {
                            const v = maskCEP(e.target.value);
                            setNewClient(p => ({ ...p, cep: v }));
                            if (v.replace(/\D/g, "").length === 8) handleCepSearch(v);
                          }} />
                        {isCepLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
                      </div>
                    </div>
                    <div className={field}>
                      <label className={label}>Número</label>
                      <input type="text" className={inp} placeholder="123"
                        value={newClient.number} onChange={e => setNewClient(p => ({ ...p, number: e.target.value }))} />
                    </div>
                  </div>
                  <div className={field}>
                    <label className={label}>Rua / Logradouro</label>
                    <input type="text" className={inp} placeholder="Rua das Flores"
                      value={newClient.street} onChange={e => setNewClient(p => ({ ...p, street: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={field}>
                      <label className={label}>Complemento</label>
                      <input type="text" className={inp} placeholder="Apto 12"
                        value={newClient.complement} onChange={e => setNewClient(p => ({ ...p, complement: e.target.value }))} />
                    </div>
                    <div className={field}>
                      <label className={label}>Bairro</label>
                      <input type="text" className={inp} placeholder="Centro"
                        value={newClient.neighborhood} onChange={e => setNewClient(p => ({ ...p, neighborhood: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className={cn(field, "col-span-2")}>
                      <label className={label}>Cidade</label>
                      <input type="text" className={inp} placeholder="São Paulo"
                        value={newClient.city} onChange={e => setNewClient(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div className={field}>
                      <label className={label}>UF</label>
                      <input type="text" className={inp} placeholder="SP" maxLength={2}
                        value={newClient.state} onChange={e => setNewClient(p => ({ ...p, state: e.target.value.toUpperCase() }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* DADOS PESSOAIS — accordion */}
              <div className="border border-zinc-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setClientPersonalOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <Heart size={11}/> Dados Pessoais <span className="text-zinc-400 normal-case font-medium">(opcional)</span>
                  </p>
                  <ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-200", clientPersonalOpen && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {clientPersonalOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-zinc-100">
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <div className={field}>
                            <label className={label}>Estado Civil</label>
                            <select className={inp} value={newClient.maritalStatus} onChange={e => setNewClient(p => ({ ...p, maritalStatus: e.target.value as any }))}>
                              <option value="">Selecionar</option>
                              <option value="solteiro">Solteiro(a)</option>
                              <option value="casado">Casado(a)</option>
                              <option value="divorciado">Divorciado(a)</option>
                              <option value="viuvo">Viúvo(a)</option>
                              <option value="uniao_estavel">União Estável</option>
                            </select>
                          </div>
                          <div className={field}>
                            <label className={label}>Escolaridade</label>
                            <select className={inp} value={newClient.education} onChange={e => setNewClient(p => ({ ...p, education: e.target.value as any }))}>
                              <option value="">Selecionar</option>
                              <option value="fundamental">Fund. Completo</option>
                              <option value="medio">Médio Completo</option>
                              <option value="superior">Superior</option>
                              <option value="pos">Pós-graduação</option>
                              <option value="mestrado">Mestrado</option>
                              <option value="doutorado">Doutorado</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div
                              onClick={() => setNewClient(p => ({ ...p, isMarried: !p.isMarried }))}
                              className={cn("w-9 h-5 rounded-full transition-all relative shrink-0", newClient.isMarried ? "bg-amber-500" : "bg-zinc-200")}
                            >
                              <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", newClient.isMarried ? "left-4" : "left-0.5")} />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-600 flex items-center gap-1"><Heart size={11} className="text-pink-400"/>Casado(a)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div
                              onClick={() => setNewClient(p => ({ ...p, hasChildren: !p.hasChildren }))}
                              className={cn("w-9 h-5 rounded-full transition-all relative shrink-0", newClient.hasChildren ? "bg-amber-500" : "bg-zinc-200")}
                            >
                              <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", newClient.hasChildren ? "left-4" : "left-0.5")} />
                            </div>
                            <span className="text-[11px] font-bold text-zinc-600 flex items-center gap-1"><Baby size={11} className="text-blue-400"/>Tem filhos</span>
                          </label>
                        </div>
                        {newClient.isMarried && (
                          <div className={field}>
                            <label className={label}>Nome do Cônjuge</label>
                            <input type="text" className={inp} placeholder="Ex: Maria Silva"
                              value={newClient.spouseName} onChange={e => setNewClient(p => ({ ...p, spouseName: e.target.value }))} />
                          </div>
                        )}
                        <div className={field}>
                          <label className={label}>Observações</label>
                          <textarea className={cn(inp, "resize-none")} rows={3} placeholder="Anotações sobre o cliente..."
                            value={newClient.notes} onChange={e => setNewClient(p => ({ ...p, notes: e.target.value }))} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold shadow-sm"
                onClick={handleCreateClient}
                disabled={!newClient.name || !newClient.phone}
              >
                {editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}
              </Button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
        active
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
      )}
    >
      <span className={cn("shrink-0", active ? "text-amber-600" : "text-zinc-400")}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}