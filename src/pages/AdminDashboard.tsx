import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/src/App";
import { 
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
  Check,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
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
import { Button, IconButton } from "@/src/components/ui/Button";
import { Modal, ModalFooter } from "@/src/components/ui/Modal";
import { Input, Textarea, Select } from "@/src/components/ui/Input";
import { StatCard } from "@/src/components/ui/StatCard";
import { NavItem } from "@/src/pages/admin/components/NavItem";
import {
  ADMIN_DEFAULT_TAB,
  ADMIN_NAV_SECTIONS,
  ADMIN_SLUG_TO_TAB,
  ADMIN_TAB_SLUGS,
  ADMIN_TAB_TITLES,
  type AdminTabId,
} from "@/src/pages/admin/config/navigation";
import {
  DashboardTab,
  ComandasTab,
  FluxoTab,
  ProfessionalsTab,
  HorariosTab,
  SettingsTab,
  ClientsTab,
  ServicesTab,
  AgendaTab,
  MinhaAgendaTab,
  AdminProfileTab,
  WppTab,
  ProductsTab,
} from "@/src/pages/admin/modules";
import { AdminDashboardShell } from "@/src/pages/admin/dashboard/components/AdminDashboardShell";
import { AdminTabContent } from "@/src/pages/admin/dashboard/components/AdminTabContent";
import { AdminScheduleAuxModals } from "@/src/pages/admin/dashboard/components/AdminScheduleAuxModals";
import { AdminScheduleActionModals } from "@/src/pages/admin/dashboard/components/AdminScheduleActionModals";
import {
  ServiceModal,
  DeleteConfirmModal,
  ClientModal,
  ProfessionalModal,
  PermProfileModal,
  ProductModal,
} from "@/src/pages/admin/dashboard/components/modals";
import { PaymentModal } from "@/src/components/ui/PaymentModal";
import { Combobox, ComboboxOption } from "@/src/components/ui/Combobox";
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
export default function AdminDashboard() {
  const { user: adminUser, logout } = useAuth();
  const [tenantName, setTenantName] = useState<string>(adminUser?.tenantName || "Studio Admin");
  const [tenantSlug, setTenantSlug] = useState<string>(adminUser?.tenantSlug || "");
  const location = useLocation();

  // Sub-aba de profissionais
  const [profSubTab, setProfSubTab] = useState<"lista" | "permissoes">(() => {
    return location.pathname.includes('permissoes') ? 'permissoes' : 'lista';
  });

  const handleProfSubTab = (sub: "lista" | "permissoes") => {
    setProfSubTab(sub);
    window.history.pushState(null, '', sub === 'permissoes' ? '/admin/profissionais/permissoes' : '/admin/profissionais');
  };

  const [activeTab, setActiveTab] = useState<AdminTabId>(() => {
    const parts = location.pathname.replace('/admin/', '').split('/');
    const slug = parts[0];
    // Se URL é /admin/profissionais/permissoes, seta tab professionals
    if (parts[0] === 'profissionais') return 'professionals';
    return ADMIN_SLUG_TO_TAB[slug || ""] || ADMIN_DEFAULT_TAB;
  });

  // Sempre que a aba mudar, atualizar a URL (sem recarregar a página)
  const handleTabChange = (tab: AdminTabId) => {
    setIsSidebarOpen(false);
    setActiveTab(tab);
    if (tab === 'professionals') {
      setProfSubTab('lista');
      window.history.pushState(null, '', '/admin/profissionais');
    } else if (tab === 'agenda') {
      setActiveSubModule('minha_agenda');
      window.history.pushState(null, '', '/admin/agenda/minha_agenda');
    } else if (tab === 'services') {
      setActiveSubModule('todos_servicos');
      window.history.pushState(null, '', '/admin/servicos/todos_servicos');
    } else if (tab === 'packages') {
      setActiveSubModule('todos_pacotes');
      window.history.pushState(null, '', '/admin/pacotes/todos_pacotes');
    } else if (tab === 'products') {
      setActiveSubModule('produtos');
      window.history.pushState(null, '', '/admin/produtos');
    } else if (tab === 'financeiro') {
      setActiveSubModule('controle');
      window.history.pushState(null, '', '/admin/financeiro/controle');
    } else {
      const slug = ADMIN_TAB_SLUGS[tab] || ADMIN_TAB_SLUGS[ADMIN_DEFAULT_TAB];
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
      if (tab === 'comandas') {
        apiFetch("/api/products").then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []));
        apiFetch("/api/services").then(r => r.json()).then(d => setServices(Array.isArray(d) ? d : []));
      }
      if (tab === 'fluxo') fetchSectors();
    }
    if (tab === 'professionals') {
      apiFetch("/api/professionals").then(res => res.json()).then(d => setProfessionals(Array.isArray(d) ? d : []));
    }
    if (tab === 'products') {
      fetchProducts();
      fetchSectors();
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

  const handleMarkRealizado = async (appt: any) => {
    await apiFetch(`/api/appointments/${appt.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "realizado" })
    });
    fetchAppointments();
    setIsViewAppointmentModalOpen(false);
    // Se não tiver comanda vinculada, abre o modal de importar/criar comanda
    if (!appt.comandaId) {
      setLinkComandaAppt(appt);
      setIsLinkComandaModalOpen(true);
    }
  };

  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<{ id: string; date: string; name: string }[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [localWorkingHours, setLocalWorkingHours] = useState<any[]>([]);
  const [settingsOpenCard, setSettingsOpenCard] = useState<string | null>('agenda');
  const [blockNationalHolidays, setBlockNationalHolidays] = useState(false);

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
    sectorId: '' as string,
    unit: 'un',
    metadata: {} as Record<string, any>
  };
  const [newProduct, setNewProduct] = useState(emptyProduct);

  const fetchProducts = async () => {
    const res = await apiFetch("/api/products");
    if (res.ok) setProducts(await res.json());
  };

  const fetchSectors = async () => {
    const res = await apiFetch("/api/sectors");
    if (res.ok) setSectors(await res.json());
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
    setShowNewSectorForm(false);
    setNewSectorName("");
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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingComanda, setPayingComanda] = useState<any>(null);
  // Trocar profissional em agendamento existente
  const [isChangeProfModalOpen, setIsChangeProfModalOpen] = useState(false);
  const [changeProfAppt, setChangeProfAppt] = useState<any>(null);
  const [changeProfId, setChangeProfId] = useState("");
  // Vincular/criar comanda a partir de agendamento
  const [isLinkComandaModalOpen, setIsLinkComandaModalOpen] = useState(false);
  const [linkComandaAppt, setLinkComandaAppt] = useState<any>(null);
  // Criar setor inline no modal de produto
  const [newSectorName, setNewSectorName] = useState("");
  const [newSectorColor, setNewSectorColor] = useState("#6b7280");
  const [showNewSectorForm, setShowNewSectorForm] = useState(false);
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
  const emptyProfessional = {
    name: "",
    nickname: "",
    role: "",
    cpf: "",
    gender: "male",
    birthDate: "",
    phone: "",
    email: "",
    instagram: "",
    bio: "",
    photo: "",
    password: "",
    permissions: emptyPermissions,
    accessLevel: "no-access", // "no-access", "full", "custom"
    patAccess: false,
    canAddServicePhotos: false,
    workingHours: [
      { day: "segunda-feira", active: true, start: "09:00", end: "20:00", lunchStart: "", lunchEnd: "", breakStart: "", breakEnd: "" },
      { day: "terca-feira", active: true, start: "09:00", end: "20:00", lunchStart: "", lunchEnd: "", breakStart: "", breakEnd: "" },
      { day: "quarta-feira", active: true, start: "09:00", end: "20:00", lunchStart: "", lunchEnd: "", breakStart: "", breakEnd: "" },
      { day: "quinta-feira", active: true, start: "09:00", end: "20:00", lunchStart: "", lunchEnd: "", breakStart: "", breakEnd: "" },
      { day: "sexta-feira", active: true, start: "09:00", end: "20:00", lunchStart: "", lunchEnd: "", breakStart: "", breakEnd: "" },
      { day: "sabado", active: true, start: "09:00", end: "20:00", lunchStart: "", lunchEnd: "", breakStart: "", breakEnd: "" },
      { day: "domingo", active: false, start: "", end: "", lunchStart: "", lunchEnd: "", breakStart: "", breakEnd: "" },
    ],
    services: [], // Array of service IDs or objects with commission details
  };
  const [newProfessional, setNewProfessional] = useState<any>({ ...emptyProfessional });
  const [profPasswordVisible, setProfPasswordVisible] = useState(false);

  // Perfis de permissão (salvos em localStorage por tenant)
  const permProfilesKey = `${adminUser?.tenantId}:permissionProfiles`;
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

  // Travar orientação no app instalado (PWA)
  useEffect(() => {
    const lockOrientation = async () => {
      // @ts-ignore - navigator.standalone para iOS
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      
      if (isStandalone && screen.orientation && (screen.orientation as any).lock) {
        try {
          await (screen.orientation as any).lock('portrait-primary');
          console.log("✅ Orientação travada em Retrato");
        } catch (err) {
          console.warn("⚠️ Não foi possível travar orientação:", err);
        }
      }
    };

    lockOrientation();
  }, []);

  // Tooltip hover state for agenda
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isProfileMenuOpen]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSubModule, setActiveSubModule] = useState(() => {
    const parts = location.pathname.replace(/^\/admin\//, "").split("/");
    if ((parts[0] === "produtos" || parts[0] === "financeiro" || parts[0] === "agenda" || parts[0] === "servicos" || parts[0] === "pacotes") && parts[1]) {
      return parts[1];
    }
    if (parts[0] === "financeiro") return "controle";
    if (parts[0] === "agenda") return "minha_agenda";
    if (parts[0] === "servicos") return "todos_servicos";
    if (parts[0] === "pacotes") return "todos_pacotes";
    return "produtos";
  });

  const handleSubModuleChange = (subModule: string) => {
    setActiveSubModule(subModule);
    if (activeTab === "products") {
      window.history.pushState(null, "", subModule === "produtos" ? "/admin/produtos" : `/admin/produtos/${subModule}`);
    } else if (activeTab === "financeiro") {
      window.history.pushState(null, "", `/admin/financeiro/${subModule}`);
    } else if (activeTab === "agenda") {
      window.history.pushState(null, "", `/admin/agenda/${subModule}`);
    } else if (activeTab === "services") {
      window.history.pushState(null, "", `/admin/servicos/${subModule}`);
    } else if (activeTab === "packages") {
      window.history.pushState(null, "", `/admin/pacotes/${subModule}`);
    }
  };
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

  const fetchProfessionals = React.useCallback(() => {
    apiFetch("/api/professionals").then(res => res.json()).then(profs => {
      const profsArr = Array.isArray(profs) ? profs : [];
      setProfessionals(profsArr);
    });
  }, []);

  // Carrega dados estáticos uma única vez
  useEffect(() => {
    apiFetch("/api/services").then(res => res.json()).then(d => setServices(Array.isArray(d) ? d : []));
    fetchProfessionals();
    apiFetch("/api/settings/working-hours").then(res => res.json()).then(setWorkingHours);
    apiFetch("/api/settings/agenda").then(res => res.json()).then(d => { if (d?.blockNationalHolidays !== undefined) setBlockNationalHolidays(!!d.blockNationalHolidays); });
    apiFetch("/api/comandas").then(res => res.json()).then(d => setComandas(Array.isArray(d) ? d : []));
    apiFetch("/api/clients").then(res => res.json()).then(d => setClients(Array.isArray(d) ? d : []));
  }, [fetchProfessionals]);

  const fetchAppointments = React.useCallback(() => {
    // Busca do início da primeira semana do mês até o fim da última semana do mês
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    
    let url = `/api/appointments?start=${start.toISOString()}&end=${end.toISOString()}`;
    if (selectedProfessional && selectedProfessional !== "all") {
      url += `&professionalId=${selectedProfessional}`;
    }
    
    apiFetch(url)
      .then(res => res.ok ? res.json() : [])
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Erro ao buscar agendamentos:", err);
        setAppointments([]);
      });
  }, [currentMonth, selectedProfessional]);

  // Recarrega agendamentos quando mês, profissional ou aba muda
  useEffect(() => {
    if (activeTab === 'agenda' || activeTab === 'dash') {
      fetchAppointments();
    }
  }, [fetchAppointments, activeTab]);

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

  const handleCreateBlockAppointment = async (data: { date: Date; startTime: string; endTime: string; professionalId: string }) => {
    const startMinutes = parseInt(data.startTime.split(":")[0]) * 60 + parseInt(data.startTime.split(":")[1]);
    const endMinutes = parseInt(data.endTime.split(":")[0]) * 60 + parseInt(data.endTime.split(":")[1]);
    await apiFetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: endMinutes - startMinutes,
        professionalId: data.professionalId,
        type: "bloqueio",
        status: "confirmed",
      }),
    });
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
    professionalIds: [] as string[],
    productsConsumed: [] as { id: string, name: string, quantity: number, costPrice?: number, stock?: number }[],
    commissionValue: 0,
    commissionType: "percentage" as "percentage" | "value",
    taxRate: 0
  });

  // Comanda detail view
  const [selectedComanda, setSelectedComanda] = useState<any>(null);
  const [isComandaDetailOpen, setIsComandaDetailOpen] = useState(false);

  // User preferences — chaveadas por userId para isolar preferências por usuário
  const userPrefsKey = `prefs:${adminUser?.id || 'default'}`;
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
    setNewService({ name: "", description: "", price: "", duration: "", type: "service", discount: "0", discountType: "value", includedServices: [], professionalIds: [], productsConsumed: [], commissionValue: 0, commissionType: "percentage", taxRate: 0 });
    apiFetch("/api/services").then(res => res.json()).then(d => setServices(Array.isArray(d) ? d : []));
  };

  const handleDeleteService = (id: string) => {
    const service = services.find((s: any) => s.id === id);
    setDeleteConfirm({ type: "service", id, name: service?.name || "este serviço" });
  };

  const handlePayComanda = (comanda: any) => {
    setPayingComanda(comanda);
    setIsPaymentModalOpen(true);
  };

  const handleDeleteComanda = async (id: string) => {
    if (!confirm("Excluir esta comanda? Essa ação não pode ser desfeita.")) return;
    await apiFetch(`/api/comandas/${id}`, { method: "DELETE" });
    apiFetch("/api/comandas").then(r => r.json()).then(d => setComandas(Array.isArray(d) ? d : []));
  };

  const fetchComandas = () => {
    apiFetch("/api/comandas").then(r => r.json()).then(d => setComandas(Array.isArray(d) ? d : []));
  };

  const handleConfirmPayment = async (paymentMethod: string, paymentDetails: any) => {
    if (!payingComanda) return;
    await apiFetch(`/api/comandas/${payingComanda.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid", paymentMethod, paymentDetails })
    });
    apiFetch("/api/comandas").then(res => res.json()).then(d => setComandas(Array.isArray(d) ? d : []));
    setPayingComanda(null);
  };

  // Trocar profissional de agendamento existente
  const handleChangeProfessional = async () => {
    if (!changeProfAppt || !changeProfId) return;
    await apiFetch(`/api/appointments/${changeProfAppt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professionalId: changeProfId })
    });
    setIsChangeProfModalOpen(false);
    setChangeProfAppt(null);
    setChangeProfId("");
    fetchAppointments();
  };

  // Vincular agendamento a comanda existente ou criar nova
  const handleLinkComanda = async (selectedComandaId: string | null) => {
    if (!linkComandaAppt) return;
    if (selectedComandaId) {
      // Vincula a uma comanda existente
      await apiFetch(`/api/appointments/${linkComandaAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comandaId: selectedComandaId })
      });
    } else {
      // Cria nova comanda e vincula
      const clientId = linkComandaAppt.clientId;
      const professionalId = linkComandaAppt.professionalId;
      const price = linkComandaAppt.service?.price || 0;
      const resp = await apiFetch("/api/comandas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          professionalId,
          description: linkComandaAppt.service?.name || "Atendimento",
          total: price,
          items: [{ name: linkComandaAppt.service?.name || "Atendimento", price, quantity: 1 }]
        })
      });
      const newComanda = await resp.json();
      await apiFetch(`/api/appointments/${linkComandaAppt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comandaId: newComanda.id })
      });
    }
    setIsLinkComandaModalOpen(false);
    setLinkComandaAppt(null);
    fetchAppointments();
    apiFetch("/api/comandas").then(r => r.json()).then(d => setComandas(Array.isArray(d) ? d : []));
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
      nickname: newProfessional.nickname,
      role: newProfessional.role,
      cpf: newProfessional.cpf,
      gender: newProfessional.gender,
      birthDate: newProfessional.birthDate,
      phone: newProfessional.phone,
      email: newProfessional.email,
      instagram: newProfessional.instagram,
      bio: newProfessional.bio,
      photo: newProfessional.photo,
      permissions: mergedPerms,
      accessLevel: newProfessional.accessLevel,
      patAccess: newProfessional.patAccess,
      canAddServicePhotos: newProfessional.canAddServicePhotos,
      workingHours: newProfessional.workingHours,
      services: newProfessional.services,
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
    <>
      <AdminDashboardShell
        activeTab={activeTab}
        activeSubModule={activeSubModule}
        adminUser={adminUser}
        handleTabChange={handleTabChange}
        isNotificationsOpen={isNotificationsOpen}
        isProfileMenuOpen={isProfileMenuOpen}
        isSidebarOpen={isSidebarOpen}
        onLogout={logout}
        onSubModuleChange={handleSubModuleChange}
        profileMenuRef={profileMenuRef}
        setIsNotificationsOpen={setIsNotificationsOpen}
        setIsProfileMenuOpen={setIsProfileMenuOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setSidebarCollapsed={setSidebarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        slotHover={slotHover}
      >
        <AdminTabContent
          activeTab={activeTab}
          activeSubModule={activeSubModule}
          setActiveSubModule={handleSubModuleChange}
          appointments={appointments}
          calculateAge={calculateAge}
          clients={clients}
          clientView={clientView}
          comandas={comandas}
          currentMonth={currentMonth}
          currentTheme={currentTheme}
          daysInMonth={daysInMonth}
          emptyPermProfile={emptyPermProfile}
          emptyProfessional={emptyProfessional}
          fetchComandas={fetchComandas}
          fetchProducts={fetchProducts}
          fetchProfessionals={fetchProfessionals}
          fetchSectors={fetchSectors}
          handleDeleteClient={handleDeleteClient}
          handleDeleteComanda={handleDeleteComanda}
          handleDeleteProfessional={handleDeleteProfessional}
          handleDeleteService={handleDeleteService}
          handleEditClient={handleEditClient}
          handlePayComanda={handlePayComanda}
          handleProfSubTab={handleProfSubTab}
          handleTabChange={handleTabChange}
          handleThemeChange={handleThemeChange}
          holidays={holidays}
          hoveredAppointment={hoveredAppointment}
          isComandaDetailOpen={isComandaDetailOpen}
          localWorkingHours={localWorkingHours}
          newHoliday={newHoliday}
          permissionProfiles={permissionProfiles}
          products={products}
          profSubTab={profSubTab}
          professionals={professionals}
          savePermProfiles={savePermProfiles}
          sectors={sectors}
          selectedComanda={selectedComanda}
          selectedProfessional={selectedProfessional}
          serviceSubTab={serviceSubTab}
          serviceView={serviceView}
          services={services}
          setClientView={setClientView}
          setCurrentMonth={setCurrentMonth}
          setEditingPermProfile={setEditingPermProfile}
          setEditingProduct={setEditingProduct}
          setEditingProfessional={setEditingProfessional}
          setEditingService={setEditingService}
          setHolidays={setHolidays}
          setHoveredAppointment={setHoveredAppointment}
          setIsAppointmentModalOpen={setIsAppointmentModalOpen}
          setIsClientModalOpen={setIsClientModalOpen}
          setIsComandaDetailOpen={setIsComandaDetailOpen}
          setIsComandaModalOpen={setIsComandaModalOpen}
          setIsPermProfileModalOpen={setIsPermProfileModalOpen}
          setIsProductModalOpen={setIsProductModalOpen}
          setIsProfessionalModalOpen={setIsProfessionalModalOpen}
          setIsServiceModalOpen={setIsServiceModalOpen}
          setIsViewAppointmentModalOpen={setIsViewAppointmentModalOpen}
          setLocalWorkingHours={setLocalWorkingHours}
          setNewAppointment={setNewAppointment}
          setNewHoliday={setNewHoliday}
          setNewPermProfile={setNewPermProfile}
          setNewProduct={setNewProduct}
          setNewProfessional={setNewProfessional}
          setNewService={setNewService}
          setSelectedAppointment={setSelectedAppointment}
          setSelectedComanda={setSelectedComanda}
          setSelectedProfessional={setSelectedProfessional}
          setServiceSubTab={setServiceSubTab}
          setServiceView={setServiceView}
          setSettingsOpenCard={setSettingsOpenCard}
          setSlotHover={setSlotHover}
          setTenantName={setTenantName}
          setTenantSlug={setTenantSlug}
          settingsOpenCard={settingsOpenCard}
          tenantName={tenantName}
          tenantSlug={tenantSlug}
          themeColor={themeColor}
          themeColors={themeColors}
          view={view}
          workingHours={workingHours}
          setWorkingHours={setWorkingHours}
          setView={setView}
          handleUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          handleDeleteAppointment={handleDeleteAppointment}
          handleCreateBlockAppointment={handleCreateBlockAppointment}
          fetchAppointments={fetchAppointments}
          blockNationalHolidays={blockNationalHolidays}
        />
      </AdminDashboardShell>

      {/* Modals */}
      <AdminScheduleAuxModals
        customRepeat={customRepeat}
        handleDeleteAppointment={handleDeleteAppointment}
        handleMarkRealizado={handleMarkRealizado}
        handleTabChange={handleTabChange}
        handleUpdateAppointmentStatus={handleUpdateAppointmentStatus}
        isCustomRepeatModalOpen={isCustomRepeatModalOpen}
        isRepeatModalOpen={isRepeatModalOpen}
        isViewAppointmentModalOpen={isViewAppointmentModalOpen}
        repeatLabel={repeatLabel}
        selectedAppointment={selectedAppointment}
        setChangeProfAppt={setChangeProfAppt}
        setChangeProfId={setChangeProfId}
        setCustomRepeat={setCustomRepeat}
        setIsAppointmentModalOpen={setIsAppointmentModalOpen}
        setIsChangeProfModalOpen={setIsChangeProfModalOpen}
        setIsCustomRepeatModalOpen={setIsCustomRepeatModalOpen}
        setIsLinkComandaModalOpen={setIsLinkComandaModalOpen}
        setIsRepeatModalOpen={setIsRepeatModalOpen}
        setIsViewAppointmentModalOpen={setIsViewAppointmentModalOpen}
        setLinkComandaAppt={setLinkComandaAppt}
        setNewAppointment={setNewAppointment}
        setRepeatLabel={setRepeatLabel}
      />

      <AdminScheduleActionModals
        apptDeleteModal={apptDeleteModal}
        changeProfAppt={changeProfAppt}
        changeProfId={changeProfId}
        comandas={comandas}
        confirmDeleteAppointments={confirmDeleteAppointments}
        handleChangeProfessional={handleChangeProfessional}
        handleConfirmPayment={handleConfirmPayment}
        handleLinkComanda={handleLinkComanda}
        isChangeProfModalOpen={isChangeProfModalOpen}
        isLinkComandaModalOpen={isLinkComandaModalOpen}
        isPaymentModalOpen={isPaymentModalOpen}
        linkComandaAppt={linkComandaAppt}
        payingComanda={payingComanda}
        professionals={professionals}
        setApptDeleteModal={setApptDeleteModal}
        setChangeProfId={setChangeProfId}
        setIsChangeProfModalOpen={setIsChangeProfModalOpen}
        setIsLinkComandaModalOpen={setIsLinkComandaModalOpen}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
      />

      {/* ── MODAIS EXTRAÍDOS ══════════════════════════════════════ */}

      <ServiceModal
        isServiceModalOpen={isServiceModalOpen}
        setIsServiceModalOpen={setIsServiceModalOpen}
        editingService={editingService}
        setEditingService={setEditingService}
        newService={newService}
        setNewService={setNewService}
        professionals={professionals}
        products={products}
        handleCreateService={handleCreateService}
        handleAddServiceToPackage={handleAddServiceToPackage}
        calcPackagePrice={calcPackagePrice}
        services={services}
      />

      {/* ═══ MODAL AGENDAMENTO ═══════════════════════════════════ */}
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
          <Modal
            isOpen={isAppointmentModalOpen}
            onClose={closeAppt}
            title={
              <div>
                <div className="text-sm sm:text-base font-black text-zinc-900">Novo Agendamento</div>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 capitalize font-normal">
                  {format(newAppointment.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            }
            size="xl"
            footer={
              <ModalFooter align="between">
                <Button variant="ghost" onClick={closeAppt}>Descartar</Button>
                <Button
                  variant={newAppointment.type === 'bloqueio' ? 'danger' : newAppointment.type === 'pessoal' ? 'secondary' : 'primary'}
                  onClick={handleCreateAppointment}
                  disabled={!newAppointment.professionalId || (newAppointment.type === 'atendimento' && (!newAppointment.clientName || (!newAppointment.comandaId && newAppointment.serviceIds.length === 0 && !newAppointment.serviceId && !newAppointment.packageId)))}
                  iconLeft={<CheckCircle size={14}/>}
                >
                  {newAppointment.type === 'bloqueio' ? 'Bloquear Horário' :
                   newAppointment.type === 'pessoal' ? 'Salvar Compromisso' :
                   'Confirmar Agendamento'}
                </Button>
              </ModalFooter>
            }
          >
            <div className="space-y-4">
              {/* Tipo de agendamento */}
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

              {newAppointment.type === 'atendimento' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-amber-500" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Identificação</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cliente</label>
                      <div className="relative">
                        <Input
                          type="text"
                          iconLeft={<Users size={13}/>}
                          iconRight={newAppointment.clientId
                            ? <button className="text-zinc-300 hover:text-red-400 transition-colors pointer-events-auto" onClick={() => { setNewAppointment((prev: any) => ({...prev, clientId:"", clientName:"", clientPhone:""})); setClientComandaStatus(null); }}><X size={13}/></button>
                            : <ChevronDown size={13}/>
                          }
                          placeholder="Pesquisar ou adicionar cliente..."
                          value={newAppointment.clientName}
                          onChange={e => handleSearchClientByName(e.target.value)}
                          onBlur={() => setTimeout(() => setClientSearchResults([]), 200)}
                        />
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
                        <Select
                          value={newAppointment.comandaId || ""}
                          onChange={(e) => {
                            const cid = e.target.value;
                            const selectedCom = comandas.find((c: any) => c.id === cid);
                            let autoIds: string[] = [];
                            if (selectedCom) {
                              if (selectedCom.type === 'pacote' && selectedCom.packageId) {
                                autoIds = [selectedCom.packageId];
                              } else if (Array.isArray(selectedCom.items) && selectedCom.items.length > 0) {
                                autoIds = selectedCom.items
                                  .map((i: any) => i.serviceId)
                                  .filter(Boolean)
                                  .filter((id: string, idx: number, arr: string[]) => arr.indexOf(id) === idx);
                              } else if (selectedCom.description) {
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
                        </Select>
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
                    <Select
                      label="Status"
                      value={newAppointment.status}
                      onChange={e => setNewAppointment((p: any) => ({...p, status: e.target.value as any}))}
                    >
                      {statusOpts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </Select>
                    <div className={cn("inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest",
                      statusOpts.find(s => s.value === newAppointment.status)?.color)}>
                      {statusOpts.find(s => s.value === newAppointment.status)?.label}
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-emerald-500" />
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Horário e Repetição</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Input
                        label="Data"
                        type="date"
                        value={format(newAppointment.date, "yyyy-MM-dd")}
                        onChange={e => setNewAppointment((p: any) => ({...p, date: new Date(e.target.value+'T12:00:00')}))}
                      />
                      <Input
                        label="Hora"
                        type="time"
                        value={newAppointment.startTime}
                        onChange={e => setNewAppointment((p: any) => ({...p, startTime: e.target.value}))}
                      />
                      <div className="col-span-2 sm:col-span-1">
                        <Input
                          label="Duração (min)"
                          type="number"
                          min={5}
                          step={5}
                          className="text-center"
                          value={newAppointment.duration}
                          onChange={e => setNewAppointment((p: any) => ({...p, duration: parseInt(e.target.value)||60}))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                      <Clock size={14} className="text-zinc-400 shrink-0"/>
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Término Previsto</p>
                        <p className="text-base font-black text-amber-600">{endTime}h</p>
                      </div>
                    </div>
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
                    <Input
                      label="Data"
                      type="date"
                      value={format(newAppointment.date, "yyyy-MM-dd")}
                      onChange={e => setNewAppointment((p: any) => ({...p, date: new Date(e.target.value+'T12:00:00')}))}
                    />
                    <Input
                      label="Hora"
                      type="time"
                      value={newAppointment.startTime}
                      onChange={e => setNewAppointment((p: any) => ({...p, startTime: e.target.value}))}
                    />
                    <div className="col-span-2 sm:col-span-1">
                      <Input
                        label="Duração (min)"
                        type="number"
                        className="text-center"
                        value={newAppointment.duration}
                        onChange={e => setNewAppointment((p: any) => ({...p, duration: parseInt(e.target.value)||60}))}
                      />
                    </div>
                  </div>
                  <Select
                    label="Profissional"
                    value={newAppointment.professionalId}
                    onChange={e => setNewAppointment((p: any) => ({...p, professionalId: e.target.value}))}
                    placeholder="Selecionar..."
                  >
                    {professionals.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </div>
              )}

              {newAppointment.type === 'atendimento' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-violet-400" />
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observações</p>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Adicione detalhes sobre o atendimento, avisos importantes..."
                    value={newAppointment.notes}
                    onChange={e => setNewAppointment((p: any) => ({...p, notes: e.target.value}))}
                  />
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* ═══ MODAL NOVA COMANDA ═══════════════════════════════ */}
      {isComandaModalOpen && (() => {
        const closeComanda = () => { setIsComandaModalOpen(false); setComandaClientSearchResults([]); setNewComanda({ ...emptyComanda }); setComandaAppt({ ...emptyComandaAppt }); };
        const subtotal = newComanda.type === 'normal'
          ? (parseFloat(newComanda.value || "0") * parseInt(newComanda.sessionCount || "1"))
          : newComanda.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const d = parseFloat(newComanda.discount) || 0;
        const total = newComanda.discountType === 'percentage' ? subtotal * (1 - d / 100) : subtotal - d;
        return (
          <Modal
            isOpen={isComandaModalOpen}
            onClose={closeComanda}
            title="Criando Comanda"
            size="lg"
            footer={
              <ModalFooter align="between">
                <Button variant="outline" onClick={closeComanda}>Fechar</Button>
                <Button
                  variant="primary"
                  onClick={handleCreateComanda}
                  disabled={!newComanda.clientId && !newComanda.clientPhone}
                  iconLeft={<Plus size={15}/>}
                >
                  Criar
                </Button>
              </ModalFooter>
            }
          >
            <div className="space-y-5">
              {/* Tipo */}
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
                  <Input
                    label="Descrição"
                    type="text"
                    placeholder="Ex: Sessão de Corte, Coloração, etc"
                    value={newComanda.description}
                    onChange={e => setNewComanda(p => ({...p, description: e.target.value}))}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cliente</label>
                      <div className="relative">
                        <Input
                          type="text"
                          iconLeft={<Search size={12}/>}
                          placeholder="Selecione um cliente..."
                          value={newComanda.clientName}
                          onChange={e => handleSearchClientForComanda(e.target.value)}
                          onBlur={() => setTimeout(() => setComandaClientSearchResults([]), 180)}
                        />
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
                        {newComanda.clientId && <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-1 ml-1"><CheckCircle size={9}/> {newComanda.clientName}</p>}
                      </div>
                    </div>
                    <Input
                      label="Data"
                      type="date"
                      value={newComanda.date}
                      onChange={e => setNewComanda(p => ({...p, date: e.target.value}))}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Valor Uni. (R$)"
                      type="number"
                      min="0"
                      step="0.01"
                      iconLeft={<span className="text-xs font-bold">R$</span>}
                      placeholder="0,00"
                      value={newComanda.value}
                      onChange={e => setNewComanda(p => ({...p, value: e.target.value}))}
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nº de Atendimentos</label>
                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Progresso: 0/{newComanda.sessionCount}</span>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={newComanda.sessionCount}
                        onChange={e => setNewComanda(p => ({...p, sessionCount: e.target.value}))}
                      />
                    </div>
                  </div>
                  <Select
                    label="Profissional"
                    value={newComanda.professionalId}
                    onChange={e => setNewComanda(p => ({...p, professionalId: e.target.value}))}
                  >
                    <option value="">{professionals[0]?.name || "Selecionar..."}</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </>
              ) : (
                <>
                  <Select
                    label="Pacote"
                    value={newComanda.packageId}
                    onChange={e => {
                      const pkgId = e.target.value;
                      const pkg = services.find(s => s.id === pkgId);
                      if (!pkg) { setNewComanda(p => ({...p, packageId: ""})); return; }
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
                    }}
                    placeholder="Selecione uma definição de pacote"
                  >
                    {services.filter(s => s.type === 'package').map(s => <option key={s.id} value={s.id}>{s.name} – R$ {Number(s.price).toFixed(2)}</option>)}
                  </Select>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cliente</label>
                    <div className="relative">
                      <Input
                        type="text"
                        iconLeft={<Search size={12}/>}
                        placeholder="Selecione um cliente..."
                        value={newComanda.clientName}
                        onChange={e => handleSearchClientForComanda(e.target.value)}
                        onBlur={() => setTimeout(() => setComandaClientSearchResults([]), 180)}
                      />
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
                  <Select
                    label="Profissional"
                    value={newComanda.professionalId}
                    onChange={e => setNewComanda(p => ({...p, professionalId: e.target.value}))}
                  >
                    <option value="">{professionals[0]?.name || "Selecionar..."}</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
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

              {/* Gerar agendamento */}
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
                  <div className={cn("w-9 h-5 rounded-full transition-all relative", comandaAppt.generate ? "bg-amber-500" : "bg-zinc-200")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", comandaAppt.generate ? "left-4" : "left-0.5")} />
                  </div>
                </button>
                {comandaAppt.generate && (
                  <div className="px-4 pb-4 pt-3 space-y-4 bg-amber-50/30 border-t border-amber-100/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Data" type="date" value={comandaAppt.date} onChange={e => setComandaAppt(p => ({ ...p, date: e.target.value }))} />
                      <Input label="Horário" type="time" value={comandaAppt.startTime} onChange={e => setComandaAppt(p => ({ ...p, startTime: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Repetição</label>
                      <div className="flex gap-2">
                        {([
                          { v: 'none', label: 'Sem repetição' },
                          { v: 'weekly', label: 'Semanal' },
                          { v: 'custom', label: 'Personalizada' },
                        ] as const).map(opt => (
                          <button key={opt.v} type="button"
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
                    {comandaAppt.recurrence.type !== 'none' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          label="Nº de Sessões"
                          type="number"
                          min="1"
                          max="52"
                          value={comandaAppt.recurrence.count}
                          onChange={e => setComandaAppt(p => ({ ...p, recurrence: { ...p.recurrence, count: parseInt(e.target.value) || 1 } }))}
                        />
                        {comandaAppt.recurrence.type === 'custom' && (
                          <Input
                            label="Intervalo (dias)"
                            type="number"
                            min="1"
                            value={comandaAppt.recurrence.interval}
                            onChange={e => setComandaAppt(p => ({ ...p, recurrence: { ...p.recurrence, interval: parseInt(e.target.value) || 7 } }))}
                          />
                        )}
                      </div>
                    )}
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

              {/* Totais */}
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
          </Modal>
        );
      })()}

      <ProfessionalModal
        isProfessionalModalOpen={isProfessionalModalOpen}
        setIsProfessionalModalOpen={setIsProfessionalModalOpen}
        editingProfessional={editingProfessional}
        setEditingProfessional={setEditingProfessional}
        newProfessional={newProfessional}
        setNewProfessional={setNewProfessional}
        profPasswordVisible={profPasswordVisible}
        setProfPasswordVisible={setProfPasswordVisible}
        permissionProfiles={permissionProfiles}
        emptyPermissions={emptyPermissions}
        currentTheme={currentTheme}
        handleCreateProfessional={handleCreateProfessional}
        emptyProfessional={emptyProfessional}
        services={services}
      />

      <ClientModal
        isClientModalOpen={isClientModalOpen}
        setIsClientModalOpen={setIsClientModalOpen}
        editingClient={editingClient}
        setEditingClient={setEditingClient}
        newClient={newClient}
        setNewClient={setNewClient}
        handleCreateClient={handleCreateClient}
        emptyClient={emptyClient}
      />

      <DeleteConfirmModal
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        confirmDelete={confirmDelete}
      />

      <PermProfileModal
        isPermProfileModalOpen={isPermProfileModalOpen}
        setIsPermProfileModalOpen={setIsPermProfileModalOpen}
        editingPermProfile={editingPermProfile}
        newPermProfile={newPermProfile}
        setNewPermProfile={setNewPermProfile}
        permissionProfiles={permissionProfiles}
        savePermProfiles={savePermProfiles}
        emptyPermissions={emptyPermissions}
        currentTheme={currentTheme}
      />

      <ProductModal
        isProductModalOpen={isProductModalOpen}
        setIsProductModalOpen={setIsProductModalOpen}
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        newProduct={newProduct}
        setNewProduct={setNewProduct}
        emptyProduct={emptyProduct}
        handleCreateProduct={handleCreateProduct}
        sectors={sectors}
        fetchSectors={fetchSectors}
        showNewSectorForm={showNewSectorForm}
        setShowNewSectorForm={setShowNewSectorForm}
        newSectorName={newSectorName}
        setNewSectorName={setNewSectorName}
        newSectorColor={newSectorColor}
        setNewSectorColor={setNewSectorColor}
      />


    </>
  );
}
