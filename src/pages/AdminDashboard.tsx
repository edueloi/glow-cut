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
  Check,
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
  Hash,
  Camera
} from "lucide-react";
import logoFavicon from "../images/system/logo-favicon.png";
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
import { WppTab } from "@/src/pages/admin/tabs/WppTab";
import { ProductsTab } from "@/src/pages/admin/tabs/ProductsTab";
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
// revenueData e servicesData são calculados dinamicamente dentro do componente

// ── Componente de item de navegação da sidebar ──────────────────────────────
function NavItem({
  active,
  onClick,
  icon,
  label,
  collapsed,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-150 group",
        collapsed ? "justify-center px-2" : "",
        active
          ? "bg-amber-500 text-white shadow-sm"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      <span className={cn("shrink-0 transition-colors", active ? "text-white" : "text-zinc-400 group-hover:text-zinc-700")}>
        {icon}
      </span>
      {!collapsed && (
        <span className="text-xs font-bold truncate">{label}</span>
      )}
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminUser = (() => { try { return JSON.parse(localStorage.getItem("adminUser") || "{}"); } catch { return {}; } })();
  const tenantName: string = adminUser.tenantName || "Studio Admin";
  const tenantSlug: string = adminUser.tenantSlug || "";
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
    'wpp': 'whatsapp',
    'products': 'produtos',
  };

  // Inverter o mapa para carregar a aba correta pela URL
  const slugToTab = Object.fromEntries(Object.entries(tabSlugs).map(([tab, slug]) => [slug, tab]));

  // Sub-aba de profissionais
  const [profSubTab, setProfSubTab] = useState<"lista" | "permissoes">(() => {
    return location.pathname.includes('permissoes') ? 'permissoes' : 'lista';
  });

  const handleProfSubTab = (sub: "lista" | "permissoes") => {
    setProfSubTab(sub);
    window.history.pushState(null, '', sub === 'permissoes' ? '/admin/profissionais/permissoes' : '/admin/profissionais');
  };

  const [activeTab, setActiveTab] = useState<"dash" | "agenda" | "minha-agenda" | "services" | "clients" | "comandas" | "fluxo" | "settings" | "professionals" | "horarios" | "profile" | "wpp" | "products">(() => {
    const parts = location.pathname.replace('/admin/', '').split('/');
    const slug = parts[0];
    // Se URL é /admin/profissionais/permissoes, seta tab professionals
    if (parts[0] === 'profissionais') return 'professionals';
    return (slugToTab[slug || ''] as any) || "dash";
  });

  // Sempre que a aba mudar, atualizar a URL (sem recarregar a página)
  const handleTabChange = (tab: typeof activeTab) => {
    setIsSidebarOpen(false);
    setActiveTab(tab);
    if (tab === 'professionals') {
      setProfSubTab('lista');
      window.history.pushState(null, '', '/admin/profissionais');
    } else {
      const slug = tabSlugs[tab] || 'painel';
      window.history.pushState(null, '', `/admin/${slug}`);
    }
    
    if (tab === 'clients') {
      apiFetch("/api/clients").then(res => res.json()).then(d => setClients(Array.isArray(d) ? d : []));
    }
    if (tab === 'services') {
      apiFetch("/api/services").then(res => res.json()).then(d => setServices(Array.isArray(d) ? d : []));
    }
    if (tab === 'comandas' || tab === 'fluxo') {
      apiFetch("/api/comandas").then(res => res.json()).then(d => setComandas(Array.isArray(d) ? d : []));
    }
    if (tab === 'professionals') {
      apiFetch("/api/professionals").then(res => res.json()).then(d => setProfessionals(Array.isArray(d) ? d : []));
    }
    if (tab === 'products') {
      apiFetch("/api/products").then(res => res.json()).then(d => setProducts(Array.isArray(d) ? d : []));
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
    await apiFetch(`/api/appointments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    fetchAppointments();
    setIsViewAppointmentModalOpen(false);
  };

  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<{ id: string; date: string; name: string }[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [localWorkingHours, setLocalWorkingHours] = useState<any[]>([]);
  const [settingsOpenCard, setSettingsOpenCard] = useState<string | null>('studio');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const emptyProduct = {
    name: '',
    description: '',
    photo: '',
    costPrice: '',
    salePrice: '',
    stock: '0',
    minStock: '0',
    validUntil: '',
    code: '',
    isForSale: true,
    metadata: {}
  };
  const [newProduct, setNewProduct] = useState(emptyProduct);

  const fetchProducts = async () => {
    const res = await apiFetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      setProducts(data);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name) {
      alert("Nome do produto é obrigatório.");
      return;
    }
    const method = editingProduct ? "PUT" : "POST";
    const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
    
    await apiFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct)
    });
    
    setIsProductModalOpen(false);
    setNewProduct(emptyProduct);
    setEditingProduct(null);
    fetchProducts();
  };
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
  const [clientView, setClientView] = useState<"list" | "grid">(() => (localStorage.getItem("adminClientView") as any) || "grid");
  const [serviceView, setServiceView] = useState<"list" | "grid">(() => (localStorage.getItem("adminServiceView") as any) || "grid");
  const [serviceSubTab, setServiceSubTab] = useState<"services" | "packages">("services");
  const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<any>(null);
  // Estrutura de permissões granulares com escopo "proprio" (só o que ele criou) vs "todos"
  const emptyPermissions = {
    dashboard: { ver: false },
    agenda:    { ver: false, criar: false, editar_proprio: false, editar_todos: false, excluir_proprio: false, excluir_todos: false },
    comandas:  { ver: false, criar: false, editar_proprio: false, editar_todos: false, excluir_proprio: false, excluir_todos: false },
    services:  { ver: false },
    clients:   { ver: false, criar: false, editar_proprio: false, editar_todos: false },
    fluxo:     { ver: false },
  };
  const emptyProfessional = { name: "", role: "", password: "", phone: "", email: "", bio: "", photo: "", permissions: emptyPermissions };
  const [newProfessional, setNewProfessional] = useState<any>({ ...emptyProfessional });
  const [profPasswordVisible, setProfPasswordVisible] = useState(false);

  // Perfis de permissão (salvos em localStorage por tenant)
  const permProfilesKey = `${adminUser.tenantId}:permissionProfiles`;
  const [permissionProfiles, setPermissionProfiles] = useState<{ id: string; name: string; permissions: Record<string, Record<string, boolean>> }[]>(() => {
    try { return JSON.parse(localStorage.getItem(permProfilesKey) || "[]"); } catch { return []; }
  });
  const savePermProfiles = (profiles: typeof permissionProfiles) => {
    setPermissionProfiles(profiles);
    localStorage.setItem(permProfilesKey, JSON.stringify(profiles));
  };
  const [isPermProfileModalOpen, setIsPermProfileModalOpen] = useState(false);
  const [editingPermProfile, setEditingPermProfile] = useState<any>(null);
  const emptyPermProfile = { name: "", permissions: emptyPermissions };
  const [newPermProfile, setNewPermProfile] = useState<any>({ ...emptyPermProfile });

  // Tooltip hover state for agenda
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isViewAppointmentModalOpen, setIsViewAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  
  // Tooltip & Hover states
  const [slotHover, setSlotHover] = useState<{ x: number, y: number, label: string } | null>(null);
  const [hoveredAppointment, setHoveredAppointment] = useState<any>(null);
  const [clientComandaStatus, setClientComandaStatus] = useState<"open" | "paid" | "none" | null>(null);

  // New Appointment State
  const [newAppointment, setNewAppointment] = useState({
    id: "" as string | undefined,
    date: new Date(),
    startTime: "09:00",
    duration: 60,
    clientId: "",
    clientPhone: "",
    clientName: "",
    serviceId: "",
    packageId: "",
    serviceIds: [] as string[],   // multi-select unificado (serviços + pacotes)
    professionalId: "",
    status: "agendado" as "agendado" | "confirmado" | "realizado" | "cancelado" | "faltou" | "reagendado",
    notes: "",
    recurrence: { type: "none", count: 1, interval: 7 },
    comandaId: "" as string | null,
    type: "atendimento" as "atendimento" | "bloqueio" | "pessoal"
  });
  useEffect(() => {
    localStorage.setItem("adminClientView", clientView);
  }, [clientView]);

  useEffect(() => {
    localStorage.setItem("adminServiceView", serviceView);
  }, [serviceView]);

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
    items: [] as { id: string, name: string, price: number, quantity: number, sessions?: number, type?: string, productId?: string | null, serviceId?: string | null }[],
    discount: "0",
    discountType: "value" as "value" | "percentage",
    paymentMethod: "cash" as "cash" | "card" | "pix" | "transfer"
  };
  const [newComanda, setNewComanda] = useState({ ...emptyComanda });
  const [comandaClientSearchResults, setComandaClientSearchResults] = useState<any[]>([]);

  // Agendamento gerado junto com a comanda
  const emptyComandaAppt = {
    generate: false,
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    recurrence: { type: "none" as "none" | "weekly" | "custom", count: 1, interval: 7 },
  };
  const [comandaAppt, setComandaAppt] = useState({ ...emptyComandaAppt });

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
    apiFetch("/api/services").then(res => res.json()).then(d => setServices(Array.isArray(d) ? d : []));
    apiFetch("/api/professionals").then(res => res.json()).then(profs => {
      const profsArr = Array.isArray(profs) ? profs : [];
      setProfessionals(profsArr);
      if (profsArr.length > 0) setSelectedProfessional(profsArr[0].id);
    });
    apiFetch("/api/settings/working-hours").then(res => res.json()).then(setWorkingHours);
    apiFetch("/api/comandas").then(res => res.json()).then(d => setComandas(Array.isArray(d) ? d : []));
    apiFetch("/api/clients").then(res => res.json()).then(d => setClients(Array.isArray(d) ? d : []));
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
    // Busca do início da primeira semana do mês até o fim da última semana do mês
    // Assim garante que dias que "transbordam" entre meses apareçam na agenda (semana/mês)
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    
    let url = `/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}`;
    if (selectedProfessional !== "all") url += `&professionalId=${selectedProfessional}`;
    apiFetch(url)
      .then(res => res.ok ? res.json() : [])
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => setAppointments([]));
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

    const urlAs = newAppointment.id ? `/api/appointments/${newAppointment.id}` : "/api/appointments";
    const methodAs = newAppointment.id ? "PUT" : "POST";

    await apiFetch(urlAs, {
      method: methodAs,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newAppointment,
        clientId: clientId || undefined,
        serviceId: newAppointment.serviceId || newAppointment.packageId || undefined,
      })
    });
    setIsAppointmentModalOpen(false);
    setNewAppointment({
      id: undefined,
      date: new Date(), startTime: "09:00", duration: 60,
      clientId: "", clientPhone: "", clientName: "",
      serviceId: "", packageId: "", serviceIds: [], professionalId: "",
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

    const response = await apiFetch("/api/comandas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const createdComanda = await response.json();

    if (isAppointmentModalOpen) {
      // Tenta cruzar a descrição da comanda com um serviço existente para preencher campos
      const matchedSvc = services.find(s => 
        s.name.toLowerCase() === (newComanda.description || "").toLowerCase()
      );

      setNewAppointment(prev => ({
        ...prev,
        comandaId: createdComanda.id,
        professionalId: createdComanda.professionalId || prev.professionalId,
        serviceId: matchedSvc ? matchedSvc.id : prev.serviceId,
        duration: matchedSvc ? matchedSvc.duration : prev.duration
      }));
    }

    // ── Gerar agendamento(s) vinculado(s) à comanda ──────────────
    if (comandaAppt.generate && newComanda.professionalId) {
      // Descobre o serviceId principal
      let apptServiceId: string | null = null;
      if (newComanda.type === 'pacote' && newComanda.packageId) {
        apptServiceId = newComanda.packageId;
      } else if (newComanda.type === 'pacote' && newComanda.items.length > 0) {
        apptServiceId = newComanda.items[0].serviceId || null;
      } else {
        const matched = services.find((s: any) => s.name.toLowerCase() === (newComanda.description || "").toLowerCase());
        apptServiceId = matched?.id || null;
      }
      const count = comandaAppt.recurrence.type !== 'none' ? (comandaAppt.recurrence.count || 1) : 1;
      const interval = comandaAppt.recurrence.interval || 7;
      await apiFetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: comandaAppt.date,
          startTime: comandaAppt.startTime,
          endTime: comandaAppt.startTime,
          clientId,
          serviceId: apptServiceId,
          professionalId: newComanda.professionalId,
          comandaId: createdComanda.id,
          status: "agendado",
          type: "atendimento",
          duration: 60,
          recurrence: {
            type: comandaAppt.recurrence.type === 'none' ? 'none' : 'custom',
            count,
            interval,
          },
        }),
      });
      fetchAppointments();
    }

    setIsComandaModalOpen(false);
    setNewComanda({ ...emptyComanda });
    setComandaAppt({ ...emptyComandaAppt });
    setComandaClientSearchResults([]);
    apiFetch("/api/comandas").then(res => res.json()).then(d => setComandas(Array.isArray(d) ? d : []));
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
    apiFetch("/api/clients").then(res => res.json()).then(d => setClients(Array.isArray(d) ? d : []));
  };

  const handleDeleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    setDeleteConfirm({ type: "client", id, name: client?.name || "este cliente" });
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
    includedServices: [] as { id: string, name: string, quantity: number, price?: number, type?: string, sessions?: number }[],
    professionalIds: [] as string[]
  });

  // Comanda detail view
  const [selectedComanda, setSelectedComanda] = useState<any>(null);
  const [isComandaDetailOpen, setIsComandaDetailOpen] = useState(false);

  // User preferences — chaveadas por userId para isolar preferências por usuário
  const userPrefsKey = `prefs:${adminUser.id || 'default'}`;
  const loadUserPrefs = () => { try { return JSON.parse(localStorage.getItem(userPrefsKey) || '{}'); } catch { return {}; } };
  const saveUserPref = (key: string, value: any) => {
    const prefs = loadUserPrefs();
    prefs[key] = value;
    localStorage.setItem(userPrefsKey, JSON.stringify(prefs));
  };

  // Theme color — lê da preferência do usuário, fallback para chave legada
  const [themeColor, setThemeColor] = useState<string>(() => loadUserPrefs().themeColor || localStorage.getItem('themeColor') || 'amber');

  const themeColors = [
    { value: 'amber',   label: 'Âmbar',     hex: '#f59e0b', light: '#fffbeb', border: '#fcd34d',
      shades: { 50:'#fffbeb',100:'#fef3c7',200:'#fde68a',300:'#fcd34d',400:'#fbbf24',500:'#f59e0b',600:'#d97706',700:'#b45309' } },
    { value: 'orange',  label: 'Laranja',   hex: '#f97316', light: '#fff7ed', border: '#fdba74',
      shades: { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',300:'#fdba74',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c' } },
    { value: 'rose',    label: 'Rosa',      hex: '#f43f5e', light: '#fff1f2', border: '#fda4af',
      shades: { 50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c' } },
    { value: 'pink',    label: 'Pink',      hex: '#ec4899', light: '#fdf2f8', border: '#f9a8d4',
      shades: { 50:'#fdf2f8',100:'#fce7f3',200:'#fbcfe8',300:'#f9a8d4',400:'#f472b6',500:'#ec4899',600:'#db2777',700:'#be185d' } },
    { value: 'crimson', label: 'Vinho',     hex: '#9f1239', light: '#fff1f2', border: '#fda4af',
      shades: { 50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#e11d48',600:'#be123c',700:'#9f1239' } },
    { value: 'violet',  label: 'Violeta',   hex: '#8b5cf6', light: '#f5f3ff', border: '#c4b5fd',
      shades: { 50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',300:'#c4b5fd',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9' } },
    { value: 'indigo',  label: 'Índigo',    hex: '#6366f1', light: '#eef2ff', border: '#a5b4fc',
      shades: { 50:'#eef2ff',100:'#e0e7ff',200:'#c7d2fe',300:'#a5b4fc',400:'#818cf8',500:'#6366f1',600:'#4f46e5',700:'#4338ca' } },
    { value: 'blue',    label: 'Azul',      hex: '#3b82f6', light: '#eff6ff', border: '#93c5fd',
      shades: { 50:'#eff6ff',100:'#dbeafe',200:'#bfdbfe',300:'#93c5fd',400:'#60a5fa',500:'#3b82f6',600:'#2563eb',700:'#1d4ed8' } },
    { value: 'cyan',    label: 'Ciano',     hex: '#06b6d4', light: '#ecfeff', border: '#67e8f9',
      shades: { 50:'#ecfeff',100:'#cffafe',200:'#a5f3fc',300:'#67e8f9',400:'#22d3ee',500:'#06b6d4',600:'#0891b2',700:'#0e7490' } },
    { value: 'teal',    label: 'Teal',      hex: '#14b8a6', light: '#f0fdfa', border: '#5eead4',
      shades: { 50:'#f0fdfa',100:'#ccfbf1',200:'#99f6e4',300:'#5eead4',400:'#2dd4bf',500:'#14b8a6',600:'#0d9488',700:'#0f766e' } },
    { value: 'emerald', label: 'Esmeralda', hex: '#10b981', light: '#ecfdf5', border: '#6ee7b7',
      shades: { 50:'#ecfdf5',100:'#d1fae5',200:'#a7f3d0',300:'#6ee7b7',400:'#34d399',500:'#10b981',600:'#059669',700:'#047857' } },
    { value: 'lime',    label: 'Limão',     hex: '#84cc16', light: '#f7fee7', border: '#bef264',
      shades: { 50:'#f7fee7',100:'#ecfccb',200:'#d9f99d',300:'#bef264',400:'#a3e635',500:'#84cc16',600:'#65a30d',700:'#4d7c0f' } },
    { value: 'slate',   label: 'Grafite',   hex: '#475569', light: '#f8fafc', border: '#cbd5e1',
      shades: { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',300:'#cbd5e1',400:'#94a3b8',500:'#64748b',600:'#475569',700:'#334155' } },
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
    saveUserPref('themeColor', color);
    localStorage.setItem('themeColor', color); // mantém compatibilidade
    applyThemeToDom(color);
  };

  const currentTheme = themeColors.find(c => c.value === themeColor) || themeColors[0];

  const calcPackagePrice = (includedServices: { id: string, price?: number, quantity: number, [key: string]: any }[]) => {
    const total = includedServices.reduce((acc, s) => acc + ((s.price || 0) * (s.quantity || 1)), 0);
    return total.toFixed(2);
  };

  const handleAddServiceToPackage = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    setNewService(prev => {
      const exists = prev.includedServices.find(s => s.id === serviceId);
      let newIncluded;
      if (exists) {
        newIncluded = prev.includedServices.map(s =>
          s.id === serviceId ? { ...s, quantity: s.quantity + 1 } : s
        );
      } else {
        newIncluded = [...prev.includedServices, {
          id: service.id,
          name: service.name,
          quantity: 1,
          price: Number(service.price) || 0,
          type: service.type,
          sessions: 1
        }];
      }
      return {
        ...prev,
        includedServices: newIncluded,
        price: calcPackagePrice(newIncluded)
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
    setNewService({ name: "", description: "", price: "", duration: "", type: "service", discount: "0", discountType: "value", includedServices: [], professionalIds: [] });
    apiFetch("/api/services").then(res => res.json()).then(d => setServices(Array.isArray(d) ? d : []));
  };

  const handleDeleteService = (id: string) => {
    const service = services.find((s: any) => s.id === id);
    setDeleteConfirm({ type: "service", id, name: service?.name || "este serviço" });
  };

  const handlePayComanda = async (comanda: any) => {
    await apiFetch(`/api/comandas/${comanda.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" })
    });
    apiFetch("/api/comandas").then(res => res.json()).then(d => setComandas(Array.isArray(d) ? d : []));
  };



  const handleCreateProfessional = async () => {
    const url = editingProfessional ? `/api/professionals/${editingProfessional.id}` : "/api/professionals";
    const method = editingProfessional ? "PUT" : "POST";
    // Mescla com emptyPermissions para garantir todas as chaves no JSON salvo
    const mergedPerms: Record<string, Record<string, boolean>> = {};
    for (const mod of Object.keys(emptyPermissions)) {
      mergedPerms[mod] = { ...(emptyPermissions as any)[mod], ...((newProfessional.permissions || {})[mod] || {}) };
    }
    const body: any = {
      name: newProfessional.name,
      role: newProfessional.role,
      phone: newProfessional.phone,
      email: newProfessional.email,
      bio: newProfessional.bio,
      photo: newProfessional.photo,
      permissions: mergedPerms,
    };
    if (newProfessional.password) body.password = newProfessional.password;
    await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setIsProfessionalModalOpen(false);
    setEditingProfessional(null);
    setNewProfessional(JSON.parse(JSON.stringify(emptyProfessional)));
    apiFetch("/api/professionals").then(res => res.json()).then(d => setProfessionals(Array.isArray(d) ? d : []));
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

  // ── Estado do modal de exclusão de agendamento com repetições ──────────────
  const [apptDeleteModal, setApptDeleteModal] = useState<{
    targetId: string;
    targetAppt: any;
    siblings: any[];          // todos da mesma série (sem o próprio)
    selectedIds: Set<string>; // quais o usuário marcou
  } | null>(null);

  /** Abre o modal de exclusão: se tem grupo, busca irmãos; senão, exclui direto */
  const handleDeleteAppointment = async (appt: any) => {
    if (appt.repeatGroupId) {
      const res = await apiFetch(`/api/appointments/group/${appt.repeatGroupId}`);
      const all: any[] = await res.json();
      const siblings = all.filter((a: any) => a.id !== appt.id);
      setApptDeleteModal({
        targetId: appt.id,
        targetAppt: appt,
        siblings,
        selectedIds: new Set([appt.id]),  // começa com só este marcado
      });
    } else {
      // Agendamento simples — confirma e exclui direto
      setDeleteConfirm({ type: "appointment", id: appt.id, name: "este agendamento" });
    }
  };

  const confirmDeleteAppointments = async (ids: string[]) => {
    if (ids.length === 1) {
      await apiFetch(`/api/appointments/${ids[0]}`, { method: "DELETE" });
    } else {
      await apiFetch("/api/appointments/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    }
    setApptDeleteModal(null);
    setIsViewAppointmentModalOpen(false);
    fetchAppointments();
  };

  const handleDeleteProfessional = (id: string) => {
    const prof = professionals.find((p: any) => p.id === id);
    setDeleteConfirm({ type: "professional", id, name: prof?.name || "este profissional" });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "professional") {
      await apiFetch(`/api/professionals/${deleteConfirm.id}`, { method: "DELETE" });
      apiFetch("/api/professionals").then(res => res.json()).then(d => setProfessionals(Array.isArray(d) ? d : []));
    } else if (deleteConfirm.type === "service") {
      await apiFetch(`/api/services/${deleteConfirm.id}`, { method: "DELETE" });
      apiFetch("/api/services").then(res => res.json()).then(d => setServices(Array.isArray(d) ? d : []));
    } else if (deleteConfirm.type === "client") {
      await apiFetch(`/api/clients/${deleteConfirm.id}`, { method: "DELETE" });
      apiFetch("/api/clients").then(res => res.json()).then(d => setClients(Array.isArray(d) ? d : []));
    } else if (deleteConfirm.type === "appointment") {
      await apiFetch(`/api/appointments/${deleteConfirm.id}`, { method: "DELETE" });
      fetchAppointments();
    }
    setDeleteConfirm(null);
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
        "bg-white border-r border-zinc-200 flex flex-col z-50 shadow-sm transition-all duration-300",
        "fixed inset-y-0 left-0 lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        sidebarCollapsed ? "lg:w-[72px]" : "w-72"
      )}>
        {/* Logo */}
        <div className={cn("p-4 flex items-center transition-all duration-300", sidebarCollapsed ? "justify-center" : "p-8")}>
          <div className="flex items-center gap-3">
            <div className={cn("bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100 shadow-sm shrink-0", sidebarCollapsed ? "w-10 h-10 p-1.5" : "w-11 h-11 p-2")}>
              <img src={logoFavicon} alt="Agendelle" className="w-full h-full object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-lg font-black text-zinc-900 tracking-tight font-display leading-none">Agendelle</h1>
                <p className="text-[8px] text-zinc-400 font-bold tracking-[0.1em] uppercase mt-1">Smart Schedulings</p>
              </div>
            )}
          </div>
        </div>

        <nav className={cn("flex-1 space-y-1 scrollbar-hide transition-all duration-300", sidebarCollapsed ? "px-2 overflow-visible" : "px-4 overflow-y-auto")}>
          {!sidebarCollapsed && (
            <div className="px-4 mb-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Principal</p>
            </div>
          )}
          {sidebarCollapsed && <div className="mb-2" />}
          <NavItem
            active={activeTab === 'dash'}
            onClick={() => handleTabChange('dash')}
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'agenda'}
            onClick={() => handleTabChange('agenda')}
            icon={<CalendarIcon size={18} />}
            label="Agenda & Reservas"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'minha-agenda'}
            onClick={() => handleTabChange('minha-agenda')}
            icon={<Globe size={18} />}
            label="Minha Agenda Online"
            collapsed={sidebarCollapsed}
          />

          {!sidebarCollapsed && (
            <div className="px-4 mt-8 mb-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Operacional</p>
            </div>
          )}
          {sidebarCollapsed && <div className="mt-4" />}
          <NavItem
            active={activeTab === 'comandas'}
            onClick={() => handleTabChange('comandas')}
            icon={<CheckCircle size={18} />}
            label="Comandas"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'fluxo'}
            onClick={() => handleTabChange('fluxo')}
            icon={<Banknote size={18} />}
            label="Fluxo de Caixa"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'services'}
            onClick={() => handleTabChange('services')}
            icon={<Scissors size={18} />}
            label="Serviços & Pacotes"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'products'}
            onClick={() => handleTabChange('products')}
            icon={<Package size={18} />}
            label="Produtos & Estoque"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'clients'}
            onClick={() => handleTabChange('clients')}
            icon={<Users size={18} />}
            label="Gestão de Clientes"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'professionals'}
            onClick={() => handleTabChange('professionals')}
            icon={<UserCog size={18} />}
            label="Profissionais"
            collapsed={sidebarCollapsed}
          />

          {!sidebarCollapsed && (
            <div className="px-4 mt-8 mb-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sistema</p>
            </div>
          )}
          {sidebarCollapsed && <div className="mt-4" />}
          <NavItem
            active={activeTab === 'horarios'}
            onClick={() => handleTabChange('horarios')}
            icon={<Clock size={18} />}
            label="Horários"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'wpp'}
            onClick={() => handleTabChange('wpp')}
            icon={<MessageCircle size={18} />}
            label="WhatsApp"
            collapsed={sidebarCollapsed}
          />
          <NavItem
            active={activeTab === 'settings'}
            onClick={() => handleTabChange('settings')}
            icon={<Settings size={18} />}
            label="Configurações"
            collapsed={sidebarCollapsed}
          />
        </nav>

        <div className={cn("mt-auto border-t border-zinc-200 transition-all duration-300", sidebarCollapsed ? "p-2" : "p-4")}>
          {!sidebarCollapsed ? (
            <>
              <button onClick={() => { localStorage.removeItem("isLogged"); localStorage.removeItem("adminUser"); window.location.href = "/login"; }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all">
                <LogOut size={18} />
                <span>Sair do Sistema</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-zinc-200 flex items-center justify-center text-zinc-500">
                <Users size={18} />
              </div>
              <button
                onClick={() => { localStorage.removeItem("isLogged"); localStorage.removeItem("adminUser"); window.location.href = "/login"; }}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400 hover:bg-red-50 transition-all"
                title="Sair do Sistema"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
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
                 activeTab === 'wpp' ? 'WhatsApp' :
                 activeTab === 'profile' ? 'Meu Perfil' : 'Configurações'}
              </h2>
              <p className="text-[9px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5 hidden sm:block">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 relative">
            {/* Hambúrguer desktop — colapsa/expande sidebar */}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="hidden lg:flex p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all"
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <Menu size={20} />
            </button>

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
                              <p className="text-[10px] text-zinc-400 mt-0.5">Novo agendamento recebido para hoje às 14:30.</p>
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
                  <p className="text-[11px] font-black text-zinc-900 leading-none">{adminUser.name || "Admin Studio"}</p>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-1">{adminUser.role === "owner" ? "Proprietário" : adminUser.role === "admin" ? "Admin" : adminUser.role === "manager" ? "Gerente" : "Visualizador"}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-500 overflow-hidden group-hover:shadow-sm transition-all">
                  {adminUser.photo
                    ? <img src={adminUser.photo} alt="Avatar" className="w-full h-full object-cover" />
                    : <span className="font-black text-xs">{(adminUser.name || "AS").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}</span>
                  }
                </div>
                <ChevronDown size={14} className={cn("text-zinc-400 transition-transform duration-300", isProfileMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-zinc-100/80 z-50 overflow-hidden"
                    >
                      {/* Header com avatar + info */}
                      <div className="p-4 flex items-center gap-3 border-b border-zinc-100">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                          {adminUser.photo
                            ? <img src={adminUser.photo} alt="Avatar" className="w-full h-full object-cover" />
                            : <span className="font-black text-xs text-zinc-600">{(adminUser.name || "AS").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-zinc-900 truncate leading-tight">{adminUser.name || "Admin"}</p>
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">{adminUser.email || "—"}</p>
                          <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">
                            {adminUser.role === "owner" ? "Proprietário" : adminUser.role === "manager" ? "Gerente" : adminUser.role === "admin" ? "Admin" : "Visualizador"}
                          </span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="p-2">
                        <button onClick={() => { setIsProfileMenuOpen(false); handleTabChange('profile'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
                          <UserCog size={15} className="text-zinc-400" /> Meu Perfil
                        </button>
                        <button onClick={() => { setIsProfileMenuOpen(false); handleTabChange('settings'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all">
                          <Settings size={15} className="text-zinc-400" /> Configurações
                        </button>
                      </div>

                      {/* Sair */}
                      <div className="p-2 pt-0">
                        <div className="border-t border-zinc-100 pt-2">
                          <button onClick={() => { localStorage.removeItem("isLogged"); localStorage.removeItem("adminUser"); window.location.href = "/login"; }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all">
                            <LogOut size={15} /> Sair da conta
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

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

        {activeTab === 'dash' && (() => {
          // Calcula revenueData: faturamento por dia da semana atual (comandas fechadas)
          const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
          const today = new Date();
          const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0,0,0,0);
          const revenueByDay: Record<number, number> = {0:0,1:0,2:0,3:0,4:0,5:0,6:0};
          comandas.forEach((c: any) => {
            if (c.status === 'closed' && c.total > 0) {
              const d = new Date(c.createdAt);
              if (d >= startOfWeek) revenueByDay[d.getDay()] = (revenueByDay[d.getDay()] || 0) + c.total;
            }
          });
          const revenueData = DAYS.map((name, i) => ({ name, value: revenueByDay[i] || 0 }));

          // Calcula servicesData: top serviços por count de agendamentos
          const COLORS = ['#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#ef4444'];
          const svcCount: Record<string, number> = {};
          appointments.forEach((a: any) => {
            if (a.service?.name) svcCount[a.service.name] = (svcCount[a.service.name] || 0) + 1;
          });
          const total = Object.values(svcCount).reduce((s, v) => s + v, 0) || 1;
          const servicesData = Object.entries(svcCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count], i) => ({ name, value: Math.round(count / total * 100), color: COLORS[i] }));

          return (
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
          );
        })()}

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
            onAppointmentClick={(app) => {
              setSelectedAppointment(app);
              setIsViewAppointmentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'minha-agenda' && (
          <MinhaAgendaTab studioName={tenantName} tenantSlug={tenantSlug} />
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
            viewMode={serviceView}
            setViewMode={setServiceView}
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
            emptyProfessional={emptyProfessional}
            permissionProfiles={permissionProfiles}
            profSubTab={profSubTab}
            onSubTabChange={handleProfSubTab}
            onOpenPermProfileModal={() => { setEditingPermProfile(null); setNewPermProfile({ ...emptyPermProfile }); setIsPermProfileModalOpen(true); }}
            onEditPermProfile={(p: any) => { setEditingPermProfile(p); setNewPermProfile({ name: p.name, permissions: { ...p.permissions } }); setIsPermProfileModalOpen(true); }}
            onDeletePermProfile={(id: string) => savePermProfiles(permissionProfiles.filter(p => p.id !== id))}
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

        {activeTab === 'wpp' && (
          <WppTab />
        )}

        {activeTab === 'products' && (
          <ProductsTab
            products={products}
            setIsProductModalOpen={setIsProductModalOpen}
            setEditingProduct={setEditingProduct}
            setNewProduct={setNewProduct}
            fetchProducts={fetchProducts}
          />
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
      {/* ── MODAL: SERVIÇO INDIVIDUAL ── */}
      <Modal
        isOpen={isServiceModalOpen && newService.type === 'service'}
        onClose={() => { setIsServiceModalOpen(false); setEditingService(null); }}
        title={editingService ? "Editar Serviço" : "Novo Serviço"}
        className="max-w-md w-full"
      >
        <div className="flex flex-col gap-4">
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nome do Serviço</label>
            <input
              type="text"
              autoFocus
              className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-semibold placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all"
              placeholder="Ex: Corte Degradê"
              value={newService.name}
              onChange={e => setNewService({ ...newService, name: e.target.value })}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Descrição <span className="normal-case font-medium text-zinc-300">(opcional)</span></label>
            <textarea
              className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all resize-none"
              placeholder="O que este serviço inclui..."
              rows={2}
              value={newService.description}
              onChange={e => setNewService({ ...newService, description: e.target.value })}
            />
          </div>

          {/* Preço + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Preço (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full text-sm pl-8 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all"
                  placeholder="0,00"
                  value={newService.price}
                  onChange={e => setNewService({ ...newService, price: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Duração (min)</label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all text-center"
                  placeholder="30"
                  value={newService.duration}
                  onChange={e => setNewService({ ...newService, duration: e.target.value })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 text-[10px] font-bold pointer-events-none">min</span>
              </div>
            </div>
          </div>

          {/* Desconto + Preço Final */}
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Preço Final</p>
              <p className="text-lg font-black text-zinc-900 leading-tight">
                R$ {(() => {
                  const p = parseFloat(newService.price) || 0;
                  const d = parseFloat(newService.discount) || 0;
                  return newService.discountType === 'percentage' ? (p * (1 - d / 100)).toFixed(2) : (p - d).toFixed(2);
                })()}
              </p>
              {parseFloat(newService.discount) > 0 && (
                <p className="text-[9px] text-zinc-400 line-through">R$ {parseFloat(newService.price || '0').toFixed(2)}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-lg overflow-hidden border border-zinc-200 h-7">
                {(['value', 'percentage'] as const).map(dt => (
                  <button key={dt} onClick={() => setNewService({ ...newService, discountType: dt })}
                    className={cn("px-2 text-[9px] font-black transition-all", newService.discountType === dt ? "bg-zinc-800 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50")}
                  >{dt === 'value' ? 'R$' : '%'}</button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                className="w-14 h-7 text-xs px-2 bg-white border border-zinc-200 rounded-lg text-center font-bold outline-none focus:border-amber-400 transition-all"
                placeholder="0"
                value={newService.discount}
                onChange={e => setNewService({ ...newService, discount: e.target.value })}
              />
            </div>
          </div>

          {/* Profissionais */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Profissionais</label>
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => setNewService({ ...newService, professionalIds: [] })}
                className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all",
                  (newService.professionalIds || []).length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-white border-zinc-200 hover:border-zinc-300"
                )}>
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                  (newService.professionalIds || []).length === 0 ? "bg-emerald-500 border-emerald-500" : "border-zinc-300"
                )}>
                  {(newService.professionalIds || []).length === 0 && <Check className="text-white" size={8} strokeWidth={4} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-800">Todos os Profissionais</p>
                  <p className="text-[9px] text-zinc-400">Qualquer membro da equipe</p>
                </div>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                {professionals.filter((p: any) => p.isActive !== false).map((p: any) => {
                  const isSelected = (newService.professionalIds || []).includes(p.id);
                  return (
                    <button key={p.id} type="button"
                      onClick={() => {
                        const ids: string[] = newService.professionalIds || [];
                        setNewService({ ...newService, professionalIds: isSelected ? ids.filter(id => id !== p.id) : [...ids, p.id] });
                      }}
                      className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all",
                        isSelected ? "bg-amber-50 border-amber-200" : "bg-white border-zinc-200 hover:border-zinc-300"
                      )}>
                      <div className={cn("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 transition-all",
                        isSelected ? "bg-amber-500 text-white" : "bg-zinc-100 border border-zinc-200"
                      )}>
                        {isSelected && <Check size={8} strokeWidth={4} />}
                      </div>
                      <span className={cn("text-xs font-semibold truncate", isSelected ? "text-amber-800" : "text-zinc-600")}>{p.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl py-3 text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2"
            onClick={handleCreateService}
            disabled={!newService.name || !newService.price}
          >
            {editingService ? <Edit2 size={14} /> : <Plus size={14} />}
            {editingService ? "Salvar Alterações" : "Cadastrar Serviço"}
          </Button>
        </div>
      </Modal>

      {/* ── MODAL: PACOTE ── */}
      <Modal
        isOpen={isServiceModalOpen && newService.type === 'package'}
        onClose={() => { setIsServiceModalOpen(false); setEditingService(null); }}
        title={editingService ? "Editar Pacote" : "Novo Pacote"}
        className="max-w-xl w-full"
      >
        <div className="flex flex-col gap-4">
          {/* Nome + Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nome do Pacote</label>
              <input
                type="text"
                autoFocus
                className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-semibold placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all"
                placeholder="Ex: Combo Barba & Cabelo"
                value={newService.name}
                onChange={e => setNewService({ ...newService, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Descrição <span className="normal-case font-medium text-zinc-300">(opcional)</span></label>
              <input
                type="text"
                className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all"
                placeholder="Breve descrição..."
                value={newService.description}
                onChange={e => setNewService({ ...newService, description: e.target.value })}
              />
            </div>
          </div>

          {/* Serviços do pacote */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Serviços incluídos</label>
            <div className="relative">
              <select
                className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 outline-none transition-all appearance-none"
                onChange={(e) => handleAddServiceToPackage(e.target.value)}
                value=""
              >
                <option value="" disabled>+ Adicionar serviço ao pacote</option>
                {services.filter(s => s.type === 'service').map(s => (
                  <option key={s.id} value={s.id}>{s.name} — R$ {parseFloat(s.price).toFixed(2)}</option>
                ))}
              </select>
              <Plus size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/40 min-h-[80px] overflow-hidden">
              {newService.includedServices.length === 0 ? (
                <div className="flex items-center justify-center h-[80px]">
                  <p className="text-[10px] text-zinc-300 italic">Nenhum serviço adicionado</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {newService.includedServices.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2">
                      <div>
                        <span className="text-xs font-semibold text-zinc-800">{s.name}</span>
                        <span className="text-[9px] text-zinc-400 ml-2">R$ {((s.price || 0) * (s.quantity || 1)).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden h-6 bg-white">
                          <button onClick={() => {
                            const val = Math.max(1, (s.quantity || 1) - 1);
                            setNewService((prev: any) => {
                              const ni = prev.includedServices.map((item: any) => item.id === s.id ? { ...item, quantity: val } : item);
                              return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                            });
                          }} className="w-6 text-zinc-500 hover:bg-zinc-100 text-xs font-bold leading-none flex items-center justify-center">−</button>
                          <span className="w-6 text-center text-[10px] font-black text-zinc-800 border-x border-zinc-200">{s.quantity}</span>
                          <button onClick={() => {
                            const val = (s.quantity || 1) + 1;
                            setNewService((prev: any) => {
                              const ni = prev.includedServices.map((item: any) => item.id === s.id ? { ...item, quantity: val } : item);
                              return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                            });
                          }} className="w-6 text-zinc-500 hover:bg-zinc-100 text-xs font-bold leading-none flex items-center justify-center">+</button>
                        </div>
                        <button onClick={() => setNewService((prev: any) => {
                          const ni = prev.includedServices.filter((item: any) => item.id !== s.id);
                          return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                        })} className="w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Duração + Desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Duração (min)</label>
              <input type="number" min="5" step="5"
                className="w-full text-sm px-2 py-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-900 font-bold outline-none focus:border-amber-400 transition-all text-center"
                placeholder="—"
                value={newService.duration}
                onChange={e => setNewService({ ...newService, duration: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Desconto</label>
              <div className="flex items-center gap-1">
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 h-[38px] shrink-0">
                  {(['value', 'percentage'] as const).map(dt => (
                    <button key={dt} onClick={() => setNewService({ ...newService, discountType: dt })}
                      className={cn("px-2 text-[9px] font-black transition-all h-full", newService.discountType === dt ? "bg-zinc-800 text-white" : "bg-white text-zinc-400")}
                    >{dt === 'value' ? 'R$' : '%'}</button>
                  ))}
                </div>
                <input type="number" min="0"
                  className="flex-1 min-w-0 h-[38px] text-sm px-2 bg-white border border-zinc-200 rounded-lg text-center font-bold outline-none focus:border-amber-400 transition-all"
                  placeholder="0"
                  value={newService.discount}
                  onChange={e => setNewService({ ...newService, discount: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Preço final destaque */}
          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <div>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Total serviços</p>
              <p className="text-xs text-amber-400 line-through">R$ {parseFloat(newService.price || '0').toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Preço Final</p>
              <p className="text-xl font-black text-amber-700">
                R$ {(() => {
                  const p = parseFloat(newService.price) || 0;
                  const d = parseFloat(newService.discount) || 0;
                  return newService.discountType === 'percentage' ? (p * (1 - d / 100)).toFixed(2) : (p - d).toFixed(2);
                })()}
              </p>
            </div>
          </div>

          {/* Profissionais */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Profissionais</label>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setNewService({ ...newService, professionalIds: [] })}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                  (newService.professionalIds || []).length === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}>
                {(newService.professionalIds || []).length === 0 && <Check size={10} strokeWidth={3} />}
                Todos
              </button>
              {professionals.filter((p: any) => p.isActive !== false).map((p: any) => {
                const isSelected = (newService.professionalIds || []).includes(p.id);
                return (
                  <button key={p.id} type="button"
                    onClick={() => {
                      const ids: string[] = newService.professionalIds || [];
                      setNewService({ ...newService, professionalIds: isSelected ? ids.filter(id => id !== p.id) : [...ids, p.id] });
                    }}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                      isSelected ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                    )}>
                    {isSelected && <Check size={10} strokeWidth={3} />}
                    {p.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            className="w-full bg-zinc-900 hover:bg-black text-white rounded-xl py-3 text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2"
            onClick={handleCreateService}
            disabled={!newService.name || newService.includedServices.length === 0}
          >
            {editingService ? <Edit2 size={14} /> : <Plus size={14} />}
            {editingService ? "Salvar Alterações" : "Cadastrar Pacote"}
          </Button>
        </div>
      </Modal>

      {/* ── MODAL: DETALHES DO AGENDAMENTO ────────────────────────── */}
      <Modal
        isOpen={isViewAppointmentModalOpen}
        onClose={() => setIsViewAppointmentModalOpen(false)}
        title="Detalhes do Agendamento"
        size="md"
      >
        {selectedAppointment && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <CalendarDays size={24} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-zinc-900 truncate">{selectedAppointment.client?.name || 'Cliente não identificado'}</p>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                  {format(new Date(selectedAppointment.date), "EEEE, d 'de' MMMM", { locale: ptBR })} • {selectedAppointment.startTime}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white border border-zinc-100 rounded-xl">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Serviço/Pacote</p>
                <p className="text-xs font-bold text-zinc-800 truncate">{selectedAppointment.service?.name || '-'}</p>
              </div>
              <div className="p-3 bg-white border border-zinc-100 rounded-xl">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Profissional</p>
                <p className="text-xs font-bold text-zinc-800 truncate">{selectedAppointment.professional?.name || '-'}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border flex items-center justify-between gap-4 bg-white border-zinc-200">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  selectedAppointment.comanda ? (selectedAppointment.comanda.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600') : 'bg-zinc-100 text-zinc-400'
                )}>
                  <Banknote size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-900">Status Financeiro</p>
                  <p className="text-[10px] font-medium text-zinc-500">
                    {selectedAppointment.comanda 
                      ? (selectedAppointment.comanda.status === 'paid' ? 'Comanda Paga' : 'Comanda Aberta')
                      : 'Sem comanda vinculada'}
                  </p>
                </div>
              </div>
              {selectedAppointment.comanda && (
                <Button variant="outline" size="sm" onClick={() => { setIsViewAppointmentModalOpen(false); handleTabChange('comandas'); }}>
                  Ver Comanda
                </Button>
              )}
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 ml-1">Gerenciar Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, 'confirmed')}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-100 transition-all group"
                >
                  <CheckCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Confirmar</span>
                </button>
                <button
                  onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, 'noshow')}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-red-100 bg-red-50/50 text-red-600 hover:bg-red-100 transition-all group"
                >
                  <AlertTriangle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Falta</span>
                </button>
                <button
                  onClick={() => { 
                    setNewAppointment({
                      id: selectedAppointment.id,
                      date: new Date(selectedAppointment.date),
                      startTime: selectedAppointment.startTime,
                      duration: selectedAppointment.duration || 60,
                      clientId: selectedAppointment.clientId || "",
                      clientPhone: selectedAppointment.client?.phone || "",
                      clientName: selectedAppointment.client?.name || "",
                      serviceId: selectedAppointment.serviceId || "",
                      packageId: selectedAppointment.packageId || "",
                      serviceIds: [selectedAppointment.serviceId, selectedAppointment.packageId].filter(Boolean) as string[],
                      professionalId: selectedAppointment.professionalId || "",
                      status: selectedAppointment.status || "agendado",
                      notes: selectedAppointment.notes || "",
                      type: selectedAppointment.type || "atendimento",
                      recurrence: { type: "none", count: 1, interval: 7 },
                      comandaId: selectedAppointment.comandaId || ""
                    });
                    setIsViewAppointmentModalOpen(false); 
                    setIsAppointmentModalOpen(true); 
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-blue-100 bg-blue-50/50 text-blue-600 hover:bg-blue-100 transition-all group"
                >
                  <Clock size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Reagendar</span>
                </button>
                <button
                  onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 transition-all group"
                >
                  <XCircle size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span>
                </button>
                <button
                  onClick={() => {
                      handleDeleteAppointment(selectedAppointment);
                      setIsViewAppointmentModalOpen(false);
                  }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-red-200 bg-white text-red-400 hover:bg-red-50 transition-all group"
                >
                  <Trash2 size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Excluir</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
                          
                          {/* Comanda section */}
                          {newAppointment.clientId && (
                            <div className="space-y-1.5 p-3 bg-zinc-50 border border-zinc-100 rounded-2xl">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <Banknote size={12}/> Comanda {newAppointment.comandaId ? "Vinculada" : "Opcional"}
                                </label>
                                <button 
                                  onClick={() => {
                                  const selectedSvc = services.find(s => s.id === newAppointment.serviceId);
                                  setNewComanda({ 
                                    ...emptyComanda, 
                                    clientId: newAppointment.clientId, 
                                    clientName: newAppointment.clientName, 
                                    clientPhone: newAppointment.clientPhone,
                                    date: format(newAppointment.date, "yyyy-MM-dd"),
                                    professionalId: newAppointment.professionalId,
                                    description: selectedSvc?.name || "",
                                    value: selectedSvc?.price?.toString() || "",
                                    type: 'normal'
                                  });
                                  setIsComandaModalOpen(true);
                                }}
                                  className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest flex items-center gap-1"
                                >
                                  <Plus size={10}/> Criar Nova
                                </button>
                              </div>
                              <select 
                                className="w-full text-[11px] p-2 bg-white border border-zinc-200 rounded-xl font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                value={newAppointment.comandaId || ""}
                                onChange={(e) => {
                                  const cid = e.target.value;
                                  const selectedCom = comandas.find((c: any) => c.id === cid);

                                  // Monta lista de IDs de serviços/pacotes a partir da comanda
                                  let autoIds: string[] = [];
                                  if (selectedCom) {
                                    if (selectedCom.type === 'pacote' && selectedCom.packageId) {
                                      // Comanda de pacote: usa o pacote
                                      autoIds = [selectedCom.packageId];
                                    } else if (Array.isArray(selectedCom.items) && selectedCom.items.length > 0) {
                                      // Comanda com itens: pega os serviceIds dos itens
                                      autoIds = selectedCom.items
                                        .map((i: any) => i.serviceId)
                                        .filter(Boolean)
                                        .filter((id: string, idx: number, arr: string[]) => arr.indexOf(id) === idx);
                                    } else if (selectedCom.description) {
                                      // Comanda normal: tenta casar pelo nome
                                      const matched = services.find((s: any) =>
                                        s.name.toLowerCase() === selectedCom.description.toLowerCase()
                                      );
                                      if (matched) autoIds = [matched.id];
                                    }
                                  }

                                  const firstSvc = autoIds.find((id: string) => services.find((s: any) => s.id === id && s.type !== 'package'));
                                  const firstPkg = autoIds.find((id: string) => services.find((s: any) => s.id === id && s.type === 'package'));
                                  const firstAny = services.find((s: any) => s.id === autoIds[0]);

                                  setNewAppointment((prev: any) => ({
                                    ...prev,
                                    comandaId: cid || null,
                                    professionalId: selectedCom?.professionalId || prev.professionalId,
                                    serviceIds: autoIds.length > 0 ? autoIds : prev.serviceIds,
                                    serviceId: firstSvc || (autoIds.length > 0 ? "" : prev.serviceId),
                                    packageId: firstPkg || (autoIds.length > 0 ? "" : prev.packageId),
                                    duration: firstAny?.duration || prev.duration,
                                  }));
                                }}
                              >
                                <option value="">Nenhuma comanda vinculada</option>
                                {comandas.filter(c => c.clientId === newAppointment.clientId && c.status === 'open').map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.description || `Comanda #${c.id.slice(0,4)}`} - R$ {Number(c.total).toFixed(2)}
                                  </option>
                                ))}
                              </select>
                              {newAppointment.comandaId && (
                                <div className="mt-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-emerald-700">
                                  {(() => {
                                    const c = comandas.find(com => com.id === newAppointment.comandaId);
                                    if (!c) return null;
                                    return (
                                      <>
                                        <div className="flex items-center gap-1"><DollarSign size={10}/> Total: R$ {Number(c.total).toFixed(2)}</div>
                                        {c.discount > 0 && (
                                          <div className="flex items-center gap-1 text-red-500 font-black uppercase">
                                            <Scissors size={10}/> Desc: {c.discountType === 'percentage' ? `${c.discount}%` : `R$ ${c.discount}`}
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Serviço / Pacote — multi-select unificado */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                              Serviço / Pacote
                            </label>
                            <Combobox
                              multiple
                              options={[
                                ...services
                                  .filter((s: any) => s.type !== 'package')
                                  .map((s: any) => ({
                                    value: s.id,
                                    label: s.name,
                                    group: "Serviços",
                                    subtitle: s.duration ? `${s.duration} min` : undefined,
                                    badge: `R$ ${Number(s.price).toFixed(0)}`,
                                    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
                                  })),
                                ...services
                                  .filter((s: any) => s.type === 'package')
                                  .map((s: any) => ({
                                    value: s.id,
                                    label: s.name,
                                    group: "Pacotes",
                                    subtitle: s.packageServices?.length
                                      ? `${s.packageServices.length} serviço(s) incluído(s)`
                                      : undefined,
                                    badge: `R$ ${Number(s.price).toFixed(0)}`,
                                    badgeColor: "bg-violet-50 text-violet-700 border-violet-200",
                                  })),
                              ]}
                              value={newAppointment.serviceIds}
                              placeholder="Selecionar serviço(s) ou pacote(s)..."
                              searchPlaceholder="Buscar..."
                              onChange={vals => {
                                const ids = vals as string[];
                                const firstSvc = ids.find(id => services.find((s: any) => s.id === id && s.type !== 'package'));
                                const firstPkg = ids.find(id => services.find((s: any) => s.id === id && s.type === 'package'));
                                const firstAny = services.find((s: any) => s.id === ids[0]);
                                setNewAppointment((prev: any) => ({
                                  ...prev,
                                  serviceIds: ids,
                                  serviceId: firstSvc || "",
                                  packageId: firstPkg || "",
                                  duration: firstAny?.duration || prev.duration,
                                  recurrence: { ...prev.recurrence, count: firstPkg ? 4 : prev.recurrence.count },
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
                      disabled={!newAppointment.professionalId || (newAppointment.type === 'atendimento' && (!newAppointment.clientName || (!newAppointment.comandaId && newAppointment.serviceIds.length === 0 && !newAppointment.serviceId && !newAppointment.packageId)))}
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
            { label: 'Semanal — 4 vezes',   type:'weekly', interval:7,  count:4  },
            { label: 'Semanal — 8 vezes',   type:'weekly', interval:7,  count:8  },
            { label: 'Semanal — 12 vezes',  type:'weekly', interval:7,  count:12 },
            { label: 'Semanal — 16 vezes',  type:'weekly', interval:7,  count:16 },
            { label: 'Semanal — 20 vezes',  type:'weekly', interval:7,  count:20 },
            { label: 'A cada 15 dias — 4 vezes', type:'biweekly', interval:15, count:4 },
            { label: 'A cada 15 dias — 8 vezes', type:'biweekly', interval:15, count:8 },
            { label: 'Mensal — 3 vezes',  type:'monthly', interval:30, count:3  },
            { label: 'Mensal — 6 vezes',  type:'monthly', interval:30, count:6  },
            { label: 'Mensal — 12 vezes', type:'monthly', interval:30, count:12 },
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
                          const label = `${customRepeat.frequency} — ${customRepeat.endType==='count' ? `${customRepeat.count} vezes` : `até ${customRepeat.endDate}`}`;
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
          const closeComanda = () => { setIsComandaModalOpen(false); setComandaClientSearchResults([]); setNewComanda({ ...emptyComanda }); setComandaAppt({ ...emptyComandaAppt }); };
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
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nº de Atendimentos (Total)</label>
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Progresso: 0/{newComanda.sessionCount}</span>
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
                              value={newComanda.packageId} onChange={e => {
                                const pkgId = e.target.value;
                                const pkg = services.find(s => s.id === pkgId);
                                if (!pkg) { setNewComanda(p => ({...p, packageId: ""})); return; }
                                // Monta itens a partir dos serviços do pacote
                                const pkgItems = (pkg.packageServices || []).map((ps: any) => ({
                                  id: `pkg-${ps.serviceId || ps.service?.id}-${Date.now()}-${Math.random()}`,
                                  name: ps.service?.name || ps.name || "",
                                  price: Number(ps.service?.price ?? ps.price) || 0,
                                  quantity: ps.quantity || 1,
                                  sessions: ps.quantity || 1,
                                  serviceId: ps.serviceId || ps.service?.id || null,
                                  productId: null,
                                }));
                                setNewComanda(p => ({
                                  ...p,
                                  packageId: pkgId,
                                  items: pkgItems,
                                  discount: (pkg.discount || 0).toString(),
                                  discountType: (pkg.discountType || "value") as "value" | "percentage",
                                }));
                              }}>
                              <option value="">Selecione uma definição de pacote</option>
                              {services.filter(s => s.type === 'package').map(s => <option key={s.id} value={s.id}>{s.name} – R$ {Number(s.price).toFixed(2)}</option>)}
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

                        {/* Itens (PDV) */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Itens / PDV:</label>
                          <div className="grid grid-cols-[1fr_60px_80px_32px] gap-1 items-center px-1">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Descrição</span>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter text-center">Qtd</span>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">Preço</span>
                            <span/>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {newComanda.items.map(item => (
                              <div key={item.id} className="grid grid-cols-[1fr_60px_80px_32px] gap-2 items-center group animate-in fade-in slide-in-from-left-2 duration-200">
                                <div className="relative">
                                  <select className="w-full appearance-none text-[11px] p-2 pr-6 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-bold outline-none focus:border-amber-400 transition-all shadow-sm"
                                    value={item.productId ? `p-${item.productId}` : item.serviceId ? `s-${item.serviceId}` : ""} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (!val) return;
                                      const isProd = val.startsWith('p-');
                                      const id = val.substring(2);
                                      if (isProd) {
                                        const p = products.find(i => i.id === id);
                                        if (p) setNewComanda(prev => ({...prev, items: prev.items.map(i => i.id === item.id ? {...i, productId: p.id, serviceId: null, name: p.name, price: Number(p.salePrice)} : i)}));
                                      } else {
                                        const s = services.find(i => i.id === id);
                                        if (s) setNewComanda(prev => ({...prev, items: prev.items.map(i => i.id === item.id ? {...i, serviceId: s.id, productId: null, name: s.name, price: Number(s.price)} : i)}));
                                      }
                                    }}>
                                    <option value="">Selecione...</option>
                                    <optgroup label="Serviços">
                                      {services.map(s => <option key={s.id} value={`s-${s.id}`}>{s.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Produtos">
                                      {products.filter(p => p.isForSale).map(p => <option key={p.id} value={`p-${p.id}`}>{p.name} (Estoque: {p.stock})</option>)}
                                    </optgroup>
                                  </select>
                                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                                </div>
                                <input type="number" min={1} className="text-[11px] p-2 bg-white border border-zinc-200 rounded-xl text-center font-bold outline-none focus:border-amber-400 transition-all shadow-sm"
                                  value={item.quantity} onChange={e => { const val = parseInt(e.target.value)||1; setNewComanda(prev => ({...prev, items: prev.items.map(i => i.id === item.id ? {...i, quantity: val} : i)})); }} />
                                <input type="number" step="0.01" className="text-[11px] p-2 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-emerald-400 text-emerald-600 transition-all shadow-sm"
                                  value={item.price} onChange={e => { const val = parseFloat(e.target.value)||0; setNewComanda(prev => ({...prev, items: prev.items.map(i => i.id === item.id ? {...i, price: val} : i)})); }} />
                                <button onClick={() => setNewComanda(prev => ({...prev, items: prev.items.filter(i => i.id !== item.id)}))} className="flex items-center justify-center w-8 h-8 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setNewComanda(prev => ({...prev, items: [...prev.items, {id: `new-${Date.now()}`, name:"", price:0, quantity:1, serviceId: null, productId: null}]}))}
                            className="w-full py-3 border-2 border-dashed border-zinc-100 rounded-2xl text-[10px] font-black text-zinc-400 hover:border-amber-400 hover:bg-amber-50/30 hover:text-amber-500 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                            <Plus size={14}/> Adicionar Item à Comanda
                          </button>
                        </div>
                      </>
                    )}

                    {/* ── GERAR AGENDAMENTO ── */}
                    <div className="border border-zinc-100 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setComandaAppt(p => ({ ...p, generate: !p.generate }))}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 text-xs font-bold transition-all",
                          comandaAppt.generate ? "bg-amber-50 text-amber-700" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <CalendarIcon size={14} className={comandaAppt.generate ? "text-amber-500" : "text-zinc-400"} />
                          <span>Deseja gerar um agendamento?</span>
                        </div>
                        <div className={cn(
                          "w-9 h-5 rounded-full transition-all relative",
                          comandaAppt.generate ? "bg-amber-500" : "bg-zinc-200"
                        )}>
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                            comandaAppt.generate ? "left-4" : "left-0.5"
                          )} />
                        </div>
                      </button>

                      {comandaAppt.generate && (
                        <div className="px-4 pb-4 pt-3 space-y-4 bg-amber-50/30 border-t border-amber-100/60">
                          {/* Data + Hora */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Data</label>
                              <input
                                type="date"
                                className="w-full text-xs p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                value={comandaAppt.date}
                                onChange={e => setComandaAppt(p => ({ ...p, date: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Horário</label>
                              <input
                                type="time"
                                className="w-full text-xs p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-semibold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                value={comandaAppt.startTime}
                                onChange={e => setComandaAppt(p => ({ ...p, startTime: e.target.value }))}
                              />
                            </div>
                          </div>

                          {/* Repetição */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Repetição</label>
                            <div className="flex gap-2">
                              {([
                                { v: 'none', label: 'Sem repetição' },
                                { v: 'weekly', label: 'Semanal' },
                                { v: 'custom', label: 'Personalizada' },
                              ] as const).map(opt => (
                                <button
                                  key={opt.v}
                                  type="button"
                                  onClick={() => setComandaAppt(p => ({ ...p, recurrence: { ...p.recurrence, type: opt.v } }))}
                                  className={cn(
                                    "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border",
                                    comandaAppt.recurrence.type === opt.v
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Nº de repetições + intervalo (quando não é 'none') */}
                          {comandaAppt.recurrence.type !== 'none' && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nº de Sessões</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={52}
                                  className="w-full text-xs p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                  value={comandaAppt.recurrence.count}
                                  onChange={e => setComandaAppt(p => ({ ...p, recurrence: { ...p.recurrence, count: parseInt(e.target.value) || 1 } }))}
                                />
                              </div>
                              {comandaAppt.recurrence.type === 'custom' && (
                                <div className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Intervalo (dias)</label>
                                  <input
                                    type="number"
                                    min={1}
                                    className="w-full text-xs p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                    value={comandaAppt.recurrence.interval}
                                    onChange={e => setComandaAppt(p => ({ ...p, recurrence: { ...p.recurrence, interval: parseInt(e.target.value) || 7 } }))}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Resumo do agendamento */}
                          <div className="bg-white border border-amber-100 rounded-xl p-3 space-y-1">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">Resumo do Agendamento</p>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-400 font-medium">Cliente:</span>
                              <span className="font-bold text-zinc-700">{newComanda.clientName || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-400 font-medium">Profissional:</span>
                              <span className="font-bold text-zinc-700">{professionals.find(p => p.id === newComanda.professionalId)?.name || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-400 font-medium">Serviço/Pacote:</span>
                              <span className="font-bold text-zinc-700 truncate max-w-[140px]">
                                {newComanda.type === 'pacote'
                                  ? (services.find(s => s.id === newComanda.packageId)?.name || "—")
                                  : (newComanda.description || services.find(s => s.id === newComanda.items[0]?.serviceId)?.name || "—")
                                }
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-400 font-medium">Data / Hora:</span>
                              <span className="font-bold text-zinc-700">
                                {comandaAppt.date ? format(new Date(comandaAppt.date + "T12:00:00"), "dd/MM/yyyy") : "—"} às {comandaAppt.startTime}
                              </span>
                            </div>
                            {comandaAppt.recurrence.type !== 'none' && (
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-zinc-400 font-medium">Repetições:</span>
                                <span className="font-black text-amber-600">{comandaAppt.recurrence.count}x {comandaAppt.recurrence.type === 'weekly' ? '(semanal)' : `(a cada ${comandaAppt.recurrence.interval} dias)`}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

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

      <Modal isOpen={isProfessionalModalOpen} onClose={() => { setIsProfessionalModalOpen(false); setEditingProfessional(null); }} title={editingProfessional ? "Editar Profissional" : "Novo Profissional"} className="max-w-lg">
        {(() => {
          const inp = "w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none";
          const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
          const perms = newProfessional.permissions || emptyPermissions;
          const toggleAction = (mod: string, action: string) => setNewProfessional((p: any) => ({
            ...p, permissions: { ...p.permissions, [mod]: { ...p.permissions[mod], [action]: !p.permissions[mod]?.[action] } }
          }));
          const PERM_LIST = [
            { key: "dashboard", label: "Dashboard",       icon: "📊", groups: [] },
            { key: "agenda",    label: "Agenda",          icon: "📅", groups: [
              { label: "Criar", actions: ["criar"] },
              { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
              { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
            ]},
            { key: "comandas",  label: "Comandas",        icon: "🧾", groups: [
              { label: "Criar", actions: ["criar"] },
              { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
              { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
            ]},
            { key: "services",  label: "Serviços",        icon: "✂️",  groups: [] },
            { key: "clients",   label: "Clientes",        icon: "👤", groups: [
              { label: "Criar", actions: ["criar"] },
              { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
            ]},
            { key: "fluxo",     label: "Fluxo de Caixa", icon: "💰", groups: [] },
          ];
          const isModuleActive = (mod: string) => Object.values(perms[mod] || {}).some(Boolean);
          return (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {newProfessional.photo ? (
                    <img src={newProfessional.photo} className="w-20 h-20 rounded-2xl object-cover border border-zinc-200" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center text-amber-400 text-2xl font-black">
                      {newProfessional.name ? newProfessional.name.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}
                  <label className="absolute -bottom-2 -right-2 w-7 h-7 bg-amber-500 rounded-xl flex items-center justify-center cursor-pointer shadow-md hover:bg-amber-600 transition-colors">
                    <Camera size={13} className="text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { const r = new FileReader(); r.onload = ev => setNewProfessional((p: any) => ({ ...p, photo: ev.target?.result as string })); r.readAsDataURL(file); }
                    }} />
                  </label>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="space-y-1">
                    <label className={lbl}>Nome Completo *</label>
                    <input className={inp} placeholder="Ex: João Silva" value={newProfessional.name} onChange={e => setNewProfessional((p: any) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className={lbl}>Cargo / Especialidade</label>
                    <input className={inp} placeholder="Ex: Barbeiro, Manicure..." value={newProfessional.role} onChange={e => setNewProfessional((p: any) => ({ ...p, role: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={lbl}>Telefone / WhatsApp</label>
                  <input className={inp} placeholder="(11) 99999-9999" value={newProfessional.phone} onChange={e => {
                    const d = e.target.value.replace(/\D/g,"").slice(0,11);
                    const v = d.length <= 10 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3") : d.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3");
                    setNewProfessional((p: any) => ({ ...p, phone: v.replace(/-$/,"") }));
                  }} />
                </div>
                <div className="space-y-1">
                  <label className={lbl}>E-mail</label>
                  <input className={inp} type="email" placeholder="joao@email.com" value={newProfessional.email} onChange={e => setNewProfessional((p: any) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1">
                <label className={lbl}>Bio / Descrição</label>
                <textarea className={inp + " resize-none"} rows={2} placeholder="Especialidades, anos de experiência..." value={newProfessional.bio} onChange={e => setNewProfessional((p: any) => ({ ...p, bio: e.target.value }))} />
              </div>

              {/* Senha */}
              <div className="space-y-1">
                <label className={lbl}>{editingProfessional ? "Nova Senha (vazio = manter)" : "Senha de Acesso *"}</label>
                <div className="relative">
                  <input type={profPasswordVisible ? "text" : "password"} className={inp + " pr-10"} placeholder="Mínimo 4 caracteres" value={newProfessional.password} onChange={e => setNewProfessional((p: any) => ({ ...p, password: e.target.value }))} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700" onClick={() => setProfPasswordVisible(v => !v)}>
                    {profPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Perfil de permissão */}
              {permissionProfiles.length > 0 && (
                <div className="space-y-1">
                  <label className={lbl}>Aplicar Perfil de Permissão</label>
                  <select className={inp} defaultValue="" onChange={e => {
                    const profile = permissionProfiles.find(p => p.id === e.target.value);
                    if (profile) setNewProfessional((p: any) => ({ ...p, permissions: { ...profile.permissions } }));
                  }}>
                    <option value="">Selecionar perfil...</option>
                    {permissionProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              {/* Permissões granulares */}
              <div className="space-y-2">
                <label className={lbl}>Permissões de Acesso</label>
                <div className="space-y-2">
                  {PERM_LIST.map(({ key, label, icon, groups }) => {
                    const modPerms = perms[key] || {};
                    const active = isModuleActive(key);
                    return (
                      <div key={key} className={`rounded-2xl border transition-all overflow-hidden ${active ? 'border-zinc-200 bg-white shadow-sm' : 'border-zinc-100 bg-zinc-50'}`}>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm leading-none">{icon}</span>
                            <p className="text-xs font-black text-zinc-800">{label}</p>
                          </div>
                          <button type="button" onClick={() => toggleAction(key, "ver")}
                            className="relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 outline-none"
                            style={{ background: modPerms.ver ? currentTheme.hex : '#e4e4e7' }}
                          >
                            <span className="absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-all duration-200" style={{ left: modPerms.ver ? '1.25rem' : '0.125rem' }} />
                          </button>
                        </div>
                        {modPerms.ver && groups.length > 0 && (
                          <div className="border-t border-zinc-100 px-4 pb-3 pt-3 space-y-3">
                            {groups.map(group => (
                              <div key={group.label} className="space-y-1.5">
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{group.label}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {group.actions.map((action, ai) => {
                                    const chipLabel = group.labels ? group.labels[ai] : group.label;
                                    const on = !!modPerms[action];
                                    return (
                                      <button key={action} type="button" onClick={() => toggleAction(key, action)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer outline-none focus:outline-none"
                                        style={on
                                          ? { background: currentTheme.light, color: currentTheme.hex, borderColor: currentTheme.border }
                                          : { background: '#f4f4f5', color: '#71717a', borderColor: '#e4e4e7' }
                                        }
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? currentTheme.hex : '#d4d4d8' }} />
                                        {chipLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl border" style={{ background: currentTheme.light, borderColor: currentTheme.border }}>
                <p className="text-[10px] font-bold" style={{ color: currentTheme.hex }}>Acesso em <span className="font-black">/pro/login</span> ou pela tela de login com e-mail/nome e senha.</p>
              </div>
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold shadow-sm"
                onClick={handleCreateProfessional}
                disabled={!newProfessional.name || (!editingProfessional && !newProfessional.password)}
              >
                {editingProfessional ? "Salvar Alterações" : "Cadastrar Profissional"}
              </Button>
            </div>
          );
        })()}
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" className="max-w-sm">
        <div className="space-y-5">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 size={16} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-900">Excluir profissional</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tem certeza que deseja excluir <span className="font-bold text-zinc-800">{deleteConfirm?.name}</span>? Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl font-bold border-zinc-200 text-zinc-600 cursor-pointer" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button className="flex-1 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white cursor-pointer" onClick={confirmDelete}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Perfil de Permissão */}
      <Modal isOpen={isPermProfileModalOpen} onClose={() => setIsPermProfileModalOpen(false)} title={editingPermProfile ? "Editar Perfil" : "Novo Perfil de Permissão"} className="max-w-md">
        {(() => {
          const inp = "w-full text-xs p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none";
          const lbl = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";
          const PP_LIST = [
            { key: "dashboard", label: "Dashboard",       icon: "📊", groups: [] },
            { key: "agenda",    label: "Agenda",          icon: "📅", groups: [
              { label: "Criar",   actions: ["criar"] },
              { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
              { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
            ]},
            { key: "comandas",  label: "Comandas",        icon: "🧾", groups: [
              { label: "Criar",   actions: ["criar"] },
              { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
              { label: "Excluir", actions: ["excluir_proprio", "excluir_todos"], labels: ["Próprios", "Todos"] },
            ]},
            { key: "services",  label: "Serviços",        icon: "✂️",  groups: [] },
            { key: "clients",   label: "Clientes",        icon: "👤", groups: [
              { label: "Criar",   actions: ["criar"] },
              { label: "Editar",  actions: ["editar_proprio", "editar_todos"],  labels: ["Próprios", "Todos"] },
            ]},
            { key: "fluxo",     label: "Fluxo de Caixa", icon: "💰", groups: [] },
          ];
          const perms = newPermProfile.permissions || emptyPermissions;
          const toggleP = (mod: string, action: string) => setNewPermProfile((p: any) => ({
            ...p, permissions: { ...p.permissions, [mod]: { ...p.permissions[mod], [action]: !p.permissions[mod]?.[action] } }
          }));
          return (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className={lbl}>Nome do Perfil *</label>
                <input className={inp} placeholder="Ex: Barbeiro Completo, Recepcionista..." value={newPermProfile.name} onChange={e => setNewPermProfile((p: any) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className={lbl}>Permissões</label>
                <div className="space-y-2">
                  {PP_LIST.map(({ key, label, icon, groups }) => {
                    const modPerms = perms[key] || {};
                    const active = Object.values(modPerms).some(Boolean);
                    return (
                      <div key={key} className={`rounded-2xl border transition-all overflow-hidden ${active ? 'border-zinc-200 bg-white shadow-sm' : 'border-zinc-100 bg-zinc-50'}`}>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm leading-none">{icon}</span>
                            <p className="text-xs font-black text-zinc-800">{label}</p>
                          </div>
                          <button type="button" onClick={() => toggleP(key, "ver")}
                            className="relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 outline-none"
                            style={{ background: modPerms.ver ? currentTheme.hex : '#e4e4e7' }}
                          >
                            <span className="absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-all duration-200" style={{ left: modPerms.ver ? '1.25rem' : '0.125rem' }} />
                          </button>
                        </div>
                        {modPerms.ver && groups.length > 0 && (
                          <div className="border-t border-zinc-100 px-4 pb-3 pt-3 space-y-3">
                            {groups.map((group: any) => (
                              <div key={group.label} className="space-y-1.5">
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{group.label}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {group.actions.map((action: string, ai: number) => {
                                    const chipLabel = group.labels ? group.labels[ai] : group.label;
                                    const on = !!modPerms[action];
                                    return (
                                      <button key={action} type="button" onClick={() => toggleP(key, action)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer outline-none focus:outline-none"
                                        style={on
                                          ? { background: currentTheme.light, color: currentTheme.hex, borderColor: currentTheme.border }
                                          : { background: '#f4f4f5', color: '#71717a', borderColor: '#e4e4e7' }
                                        }
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? currentTheme.hex : '#d4d4d8' }} />
                                        {chipLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-bold shadow-sm cursor-pointer"
                onClick={() => {
                  if (!newPermProfile.name) return;
                  if (editingPermProfile) {
                    savePermProfiles(permissionProfiles.map((p: any) =>
                      p.id === editingPermProfile.id ? { ...p, ...newPermProfile } : p
                    ));
                  } else {
                    savePermProfiles([...permissionProfiles, { ...newPermProfile, id: Date.now().toString() }]);
                  }
                  setIsPermProfileModalOpen(false);
                }}
                disabled={!newPermProfile.name}
              >
                {editingPermProfile ? "Salvar Alterações" : "Criar Perfil"}
              </Button>
            </div>
          );
        })()}
      </Modal>

      {/* ── MODAL DE PRODUTO ─────────────────────────────────────── */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); setNewProduct(emptyProduct); }}
        title={editingProduct ? "Editar Produto" : "Novo Produto"}
        className="max-w-lg"
      >
        <div className="space-y-5">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome *</label>
            <input
              type="text"
              className="w-full text-xs p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
              placeholder="Ex: Shampoo Premium"
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descrição</label>
            <textarea
              className="w-full text-xs p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all resize-none"
              placeholder="Detalhes sobre o produto..."
              rows={2}
              value={newProduct.description}
              onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
            />
          </div>

          {/* Código / SKU */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Código / SKU</label>
            <input
              type="text"
              className="w-full text-xs p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
              placeholder="Ex: SHAM-001"
              value={newProduct.code}
              onChange={e => setNewProduct({ ...newProduct, code: e.target.value })}
            />
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Preço de Custo (R$)</label>
              <input
                type="number"
                className="w-full text-sm p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-black focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                placeholder="0.00"
                value={newProduct.costPrice}
                onChange={e => setNewProduct({ ...newProduct, costPrice: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Preço de Venda (R$)</label>
              <input
                type="number"
                className="w-full text-sm p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-black focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
                placeholder="0.00"
                value={newProduct.salePrice}
                onChange={e => setNewProduct({ ...newProduct, salePrice: e.target.value })}
              />
            </div>
          </div>

          {/* Estoque */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Estoque Atual</label>
              <input
                type="number"
                className="w-full text-sm p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-black focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all text-center"
                placeholder="0"
                value={newProduct.stock}
                onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Estoque Mínimo</label>
              <input
                type="number"
                className="w-full text-sm p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-black focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all text-center"
                placeholder="0"
                value={newProduct.minStock}
                onChange={e => setNewProduct({ ...newProduct, minStock: e.target.value })}
              />
            </div>
          </div>

          {/* Validade */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Validade (opcional)</label>
            <input
              type="date"
              className="w-full text-xs p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
              value={newProduct.validUntil}
              onChange={e => setNewProduct({ ...newProduct, validUntil: e.target.value })}
            />
          </div>

          {/* No PDV toggle */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Disponível no PDV</p>
              <p className="text-[10px] text-amber-600 font-medium mt-0.5">Aparece no ponto de venda para clientes</p>
            </div>
            <button
              type="button"
              onClick={() => setNewProduct({ ...newProduct, isForSale: !newProduct.isForSale })}
              className="relative w-12 h-6 rounded-full transition-colors shrink-0 outline-none"
              style={{ background: newProduct.isForSale ? '#f59e0b' : '#e4e4e7' }}
            >
              <span
                className="absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-all duration-200"
                style={{ left: newProduct.isForSale ? '1.5rem' : '0.25rem' }}
              />
            </button>
          </div>

          {/* Botão salvar */}
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-2xl py-3.5 font-black text-sm shadow-sm cursor-pointer transition-all"
            onClick={handleCreateProduct}
            disabled={!newProduct.name}
          >
            {editingProduct ? "Salvar Produto" : "Cadastrar Produto"}
          </Button>
        </div>
      </Modal>

      {/* ── MODAL EXCLUSÃO DE AGENDAMENTO COM REPETIÇÕES ─────────── */}
      <AnimatePresence>
        {apptDeleteModal && (() => {
          const { targetId, targetAppt, siblings, selectedIds } = apptDeleteModal;
          const allIds = [targetId, ...siblings.map((s: any) => s.id)];
          const toggleId = (id: string) => {
            setApptDeleteModal(prev => {
              if (!prev) return prev;
              const next = new Set(prev.selectedIds);
              if (id === targetId) return prev; // o próprio não pode desmarcar
              next.has(id) ? next.delete(id) : next.add(id);
              return { ...prev, selectedIds: next };
            });
          };
          const selectAll = () => setApptDeleteModal(prev => prev ? { ...prev, selectedIds: new Set(allIds) } : prev);
          const selectOnlyThis = () => setApptDeleteModal(prev => prev ? { ...prev, selectedIds: new Set([targetId]) } : prev);
          const allSelected = allIds.every(id => selectedIds.has(id));

          return (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                onClick={() => setApptDeleteModal(null)}
                className="fixed inset-0 z-[80] bg-black/40" />
              <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
                <motion.div
                  initial={{opacity:0, scale:0.96, y:8}} animate={{opacity:1, scale:1, y:0}}
                  exit={{opacity:0, scale:0.96, y:8}} transition={{duration:0.18}}
                  className="w-full max-w-md bg-white rounded-2xl shadow-2xl pointer-events-auto border border-zinc-200"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                        <Trash2 size={16} className="text-red-500" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-zinc-900">Excluir Agendamento</h2>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          Sessão {targetAppt.sessionNumber}/{targetAppt.totalSessions} da série
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setApptDeleteModal(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                      <X size={15}/>
                    </button>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4 space-y-4">
                    <p className="text-xs text-zinc-600">
                      Este agendamento faz parte de uma série de <span className="font-black text-zinc-900">{targetAppt.totalSessions} repetições</span>.
                      Selecione quais deseja excluir:
                    </p>

                    {/* Atalhos */}
                    <div className="flex gap-2">
                      <button onClick={selectOnlyThis}
                        className={cn("flex-1 py-2 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest",
                          !allSelected && selectedIds.size === 1
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-white text-zinc-500 border-zinc-200 hover:border-red-300 hover:text-red-500"
                        )}>
                        Só este
                      </button>
                      <button onClick={selectAll}
                        className={cn("flex-1 py-2 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest",
                          allSelected
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-white text-zinc-500 border-zinc-200 hover:border-red-300 hover:text-red-500"
                        )}>
                        Todos ({allIds.length})
                      </button>
                    </div>

                    {/* Lista de repetições */}
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {/* Este agendamento (sempre marcado) */}
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                        <div className="w-4 h-4 rounded-[4px] bg-red-500 border-red-500 flex items-center justify-center shrink-0">
                          <Check size={10} className="text-white"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-900">
                            {format(new Date(targetAppt.date), "EEE, dd MMM", { locale: ptBR })} · {targetAppt.startTime}h
                          </p>
                          <p className="text-[10px] text-red-600 font-bold">Este agendamento (sessão {targetAppt.sessionNumber})</p>
                        </div>
                        <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-md">
                          {targetAppt.sessionNumber}/{targetAppt.totalSessions}
                        </span>
                      </div>

                      {/* Irmãos */}
                      {siblings.map((sib: any) => {
                        const checked = selectedIds.has(sib.id);
                        return (
                          <button key={sib.id} onClick={() => toggleId(sib.id)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                              checked ? "bg-red-50 border-red-200" : "bg-white border-zinc-100 hover:border-zinc-200"
                            )}>
                            <div className={cn(
                              "w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all",
                              checked ? "bg-red-500 border-red-500" : "border-zinc-300"
                            )}>
                              {checked && <Check size={10} className="text-white"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-900">
                                {format(new Date(sib.date), "EEE, dd MMM", { locale: ptBR })} · {sib.startTime}h
                              </p>
                              <p className="text-[10px] text-zinc-400 font-medium">Sessão {sib.sessionNumber}</p>
                            </div>
                            <span className="text-[9px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-md shrink-0">
                              {sib.sessionNumber}/{sib.totalSessions}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex gap-3 px-5 pb-5">
                    <button onClick={() => setApptDeleteModal(null)}
                      className="flex-1 py-3 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-500 hover:bg-zinc-50 transition-all">
                      Cancelar
                    </button>
                    <button
                      onClick={() => confirmDeleteAppointments(Array.from(selectedIds))}
                      className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={13}/>
                      Excluir {selectedIds.size === 1 ? "1 agendamento" : `${selectedIds.size} agendamentos`}
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}