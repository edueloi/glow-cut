import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, User, Phone, Instagram, ArrowRight, CheckCircle2, Search, Loader2, Scissors, MapPin, Download, X, ChevronRight, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, isSameDay, startOfDay, startOfMonth, endOfMonth, endOfWeek, startOfWeek, isSameMonth, isBefore, addMonths, subMonths, addMinutes, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { Button, Input, Badge, Divider } from "@/src/components/ui";

type Step = "loading" | "home" | "consult" | "choose-mode" | "by-professional" | "by-service" | "pick-professional" | "pick-service" | "date" | "confirm" | "success";

interface PublicAgendaSettings {
  onlineBookingEnabled: boolean;
  enableSelfService: boolean;
  enableAppointmentSearch: boolean;
  enableClientAgendaView: boolean;
  allowClientRecurrence: boolean;
  autoConfirmAppointments: boolean;
  selfServiceShowProfessional: boolean;
  selfServiceShowPrices: boolean;
  selfServiceRequireLogin: boolean;
  selfServiceWelcomeMessage: string;
  allowClientCancellation: boolean;
  allowClientReschedule: boolean;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  slotIntervalMinutes: number;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return String(value).slice(0, 10);
}

const DEFAULT_PUBLIC_AGENDA_SETTINGS: PublicAgendaSettings = {
  onlineBookingEnabled: true,
  enableSelfService: true,
  enableAppointmentSearch: true,
  enableClientAgendaView: true,
  allowClientRecurrence: false,
  autoConfirmAppointments: false,
  selfServiceShowProfessional: true,
  selfServiceShowPrices: true,
  selfServiceRequireLogin: false,
  selfServiceWelcomeMessage: "",
  allowClientCancellation: true,
  allowClientReschedule: false,
  minAdvanceMinutes: 30,
  maxAdvanceDays: 60,
  slotIntervalMinutes: 30,
};

export default function ClientBooking() {
  const { slug } = useParams();
  const [studioName, setStudioName] = useState("Agendelle");
  const [studioAddress, setStudioAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [customColor, setCustomColor] = useState("#0a0a0a");
  const [customLogo, setCustomLogo] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  const blockedDates: string[] = [];

  const [step, setStep] = useState<Step>("loading");
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [clientData, setClientData] = useState({ name: "", age: "", birthDate: "" });
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [phoneSearched, setPhoneSearched] = useState(false);
  
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [recurrenceConflicts, setRecurrenceConflicts] = useState<any[]>([]);
  const [datesToBook, setDatesToBook] = useState<string[]>([]);
  const [showConflictsModal, setShowConflictsModal] = useState(false);

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    return v;
  };

  const handlePhoneChange = (v: string) => {
    const formatted = formatPhone(v);
    setPhone(formatted);
    setPhoneSearched(false);
    // Auto-busca ao completar 11 dígitos
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 11) {
      setTimeout(() => triggerClientSearch(formatted), 100);
    }
  };

  const triggerClientSearch = async (phoneVal: string) => {
    const digits = phoneVal.replace(/\D/g, "");
    if (digits.length < 10) return;
    setIsLoading(true);
    const headers: Record<string, string> = {};
    if (tenantId) headers["x-tenant-id"] = tenantId;
    const res = await fetch(`/api/public/clients/search?phone=${digits}`, { headers });
    const data = await res.json();
    if (data && data.id) {
      setClientData({ name: data.name || "", age: data.age?.toString() || "", birthDate: toDateInputValue(data.birthDate) });
      setIsExistingClient(true);
    } else {
      setClientData({ name: "", age: "", birthDate: "" });
      setIsExistingClient(false);
    }
    setPhoneSearched(true);
    setIsLoading(false);
  };
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<Record<string, any>>({});
  const [studioPhone, setStudioPhone] = useState<string>("");
  const [publicAgendaSettings, setPublicAgendaSettings] = useState<PublicAgendaSettings>(DEFAULT_PUBLIC_AGENDA_SETTINGS);

  const canBookOnline = publicAgendaSettings.onlineBookingEnabled && publicAgendaSettings.enableSelfService;
  const canConsultAppointments = publicAgendaSettings.enableAppointmentSearch && publicAgendaSettings.enableClientAgendaView;

  // Filtered lists based on selection
  const servicesForProfessional = (profId: string) =>
    services.filter(s => {
      try { return JSON.parse(s.professionalIds || "[]").includes(profId); } catch { return true; }
    });

  const professionalsForService = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return professionals;
    try {
      const ids: string[] = JSON.parse(svc.professionalIds || "[]");
      if (ids.length === 0) return professionals;
      return professionals.filter(p => ids.includes(p.id));
    } catch { return professionals; }
  };

  // Se só tem 1 profissional (ou nenhum), ou se a config esconde profissional, pula a seleção
  const showProfessionalChoice = publicAgendaSettings.selfServiceShowProfessional;
  const onlyOneProfessional = professionals.length <= 1;
  const skipProfessionalStep = onlyOneProfessional || !showProfessionalChoice;
  const getDefaultProfessional = () => professionals.length === 1 ? professionals[0] : (professionals.length > 0 ? professionals[0] : null);

  // Ao clicar "Agendar" na home: se só 1 prof ou escondido → vai direto para serviços
  const handleStartBooking = () => {
    if (!canBookOnline) return;
    if (skipProfessionalStep) {
      setSelectedProfessional(getDefaultProfessional());
      setStep("by-service");
    } else {
      setStep("choose-mode");
    }
  };

  // Após escolher serviço (no by-service): se só 1 prof ou escondido → vai direto para data
  const handleServiceSelected = (s: any) => {
    setSelectedService(s);
    if (skipProfessionalStep) {
      const prof = getDefaultProfessional();
      setSelectedProfessional(prof);
      setStep("date");
      fetchAvailability(selectedDate, s.id, prof?.id || "");
    } else {
      setStep("pick-professional");
    }
  };

  const fetchCalendarStatus = async (month: Date, profId: string | null | undefined) => {
    if (!tenantId) return;
    if (!profId) { setCalendarStatus({}); return; }
    try {
      const headers: Record<string, string> = { "x-tenant-id": tenantId };
      const res = await fetch(`/api/public/calendar-status?month=${month.toISOString()}&professionalId=${profId}`, { headers });
      const data = await res.json();
      setCalendarStatus(data);
    } catch { setCalendarStatus({}); }
  };

  useEffect(() => {
    const profId = selectedProfessional?.id || (professionals.length === 1 ? professionals[0].id : null);
    fetchCalendarStatus(currentMonth, profId);
  }, [currentMonth, selectedProfessional, tenantId, professionals]);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallBanner(true); };
    window.addEventListener("beforeinstallprompt", handler);
    // iOS: mostra banner de instruções se não estiver em standalone
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = ("standalone" in navigator) && (navigator as any).standalone;
    if (isIos && !isStandalone) {
      const dismissed = sessionStorage.getItem("ios-banner-dismissed");
      if (!dismissed) setTimeout(() => setShowIosBanner(true), 2000);
    }
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShowInstallBanner(false);
    setDeferredPrompt(null);
  };

  useEffect(() => {
    const loadData = async () => {
      let tid: string | null = null;
      if (slug) {
        try {
          const r = await fetch(`/api/tenant-by-slug/${slug}`);
          if (r.ok) {
            const t = await r.json();
            tid = t.id;
            setTenantId(t.id);
            setStudioName(t.name);
            setStudioAddress(t.address || "");
            setCustomLogo(t.logoUrl || "");
            setCoverUrl(t.coverUrl || "");
            setCustomColor(t.themeColor || "#0a0a0a");
            setInstagram(t.instagram || "");
            setWelcomeMessage(t.welcomeMessage || "");
            setStudioPhone(t.phone || "");
            setPublicAgendaSettings({
              ...DEFAULT_PUBLIC_AGENDA_SETTINGS,
              ...(t.agendaSettings || {}),
            });
          }
        } catch {}
      }
      const headers: Record<string, string> = {};
      if (tid) headers["x-tenant-id"] = tid;
      const servicesReq = fetch("/api/public/services", { headers }).then(r => r.ok ? r.json() : []).then(d => setServices(Array.isArray(d) ? d.filter((s: any) => s.type === "service") : []));
      const profsReq = fetch("/api/public/professionals", { headers }).then(r => r.ok ? r.json() : []).then(d => {
        const profs = Array.isArray(d) ? d.filter((p: any) => p.isActive !== false) : [];
        setProfessionals(profs);
        return profs;
      });

      Promise.all([servicesReq, profsReq]).then(([_, activeProfs]) => {
        // Handle profId from query params
        const params = new URLSearchParams(window.location.search);
        const urlProfId = params.get("profId");
        
        if (urlProfId && activeProfs) {
          const prof = (activeProfs as any[]).find((p: any) => p.id === urlProfId);
          if (prof) {
            setSelectedProfessional(prof);
            setTimeout(() => setStep("pick-service"), 1600);
            return;
          }
        }
        
        setTimeout(() => setStep("home"), 1600);
      });
    };
    loadData();
  }, [slug]);

  const handleSearchClient = async () => triggerClientSearch(phone);

  const handleConsultAppointments = async () => {
    if (!canConsultAppointments) return;
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setIsLoading(true);
    const headers: Record<string, string> = {};
    if (tenantId) headers["x-tenant-id"] = tenantId;
    const res = await fetch(`/api/public/appointments/client?phone=${digits}`, { headers });
    const data = await res.json();
    setMyAppointments(Array.isArray(data) ? data : []);
    setIsLoading(false);
  };

  const fetchAvailability = async (date: Date, serviceId: string, professionalId: string) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (tenantId) headers["x-tenant-id"] = tenantId;
      const res = await fetch(`/api/availability?date=${date.toISOString()}&serviceId=${serviceId}&professionalId=${professionalId}`, { headers });
      const data = await res.json();
      setAvailableSlots(Array.isArray(data) ? data : []);
    } catch { setAvailableSlots([]); }
    finally { setIsLoading(false); }
  };

  const handleBooking = async (skipConflicts: boolean = false) => {
    if (!canBookOnline) return;
    setBookingError("");
    setIsLoading(true);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tenantId) headers["x-tenant-id"] = tenantId;

    // Garante profissional resolvido — usa o único se só tiver 1
    const profId = selectedProfessional?.id || (professionals.length === 1 ? professionals[0].id : null);

    // Calcula datas
    let finalDates = datesToBook;
    if (finalDates.length === 0 && repeatWeeks > 1) {
      finalDates = Array.from({ length: repeatWeeks }).map((_, i) => format(addDays(selectedDate, i * 7), "yyyy-MM-dd"));
    }

    if (!skipConflicts && repeatWeeks > 1) {
      try {
        const confRes = await fetch("/api/appointments/check-recurrence", {
          method: "POST", headers,
          body: JSON.stringify({ 
            dates: finalDates, 
            professionalId: profId, 
            startTime: selectedSlot, 
            serviceId: selectedService?.id,
            endTime: format(addMinutes(parse(selectedSlot!, "HH:mm", new Date()), selectedService?.duration || 60), "HH:mm") 
          })
        });
        if (confRes.ok) {
          const confData = await confRes.json();
          if (confData.conflicts && confData.conflicts.length > 0) {
            setRecurrenceConflicts(confData.conflicts);
            setShowConflictsModal(true);
            setIsLoading(false);
            return; // Espera o usuário decidir no modal
          }
        }
      } catch (e) {
        // Ignora erro e tenta agendar
      }
    }

    const clientRes = await fetch("/api/public/clients", { method: "POST", headers, body: JSON.stringify({ ...clientData, phone, birthDate: clientData.birthDate || undefined }) });
    const client = await clientRes.json().catch(() => ({}));
    if (!clientRes.ok || !client?.id) {
      setBookingError(client?.error || "NÃ£o foi possÃ­vel validar seus dados.");
      setIsLoading(false);
      return;
    }

    // CriaÃ§Ã£o em batch ou repetiÃ§Ã£o (vamos mandar no formato repeat)
    const payload = {
      date: selectedDate, 
      startTime: selectedSlot, 
      clientId: client.id, 
      serviceId: selectedService?.id, 
      professionalId: profId,
      repeat: repeatWeeks > 1 ? "weekly" : undefined,
      repeatCount: repeatWeeks > 1 ? repeatWeeks : undefined,
      skipDates: recurrenceConflicts.map(c => c.date)
    };

    const apptRes = await fetch("/api/public/appointments", {
      method: "POST", headers,
      body: JSON.stringify(payload)
    });
    if (!apptRes.ok) {
      const err = await apptRes.json().catch(() => ({}));
      setBookingError(err?.error || "NÃ£o foi possÃ­vel concluir o agendamento.");
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
    setStep("success");
  };

  const heroStyle = coverUrl ? { backgroundImage: `url('${coverUrl}')`, backgroundSize: "cover", backgroundPosition: "center" } : {};

  // ── LOADING ──
  if (step === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-[100]" style={{ backgroundColor: customColor || "#0a0a0a" }}>
        <div className="flex flex-col items-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl overflow-hidden border border-white/10">
            {customLogo ? <img src={customLogo} alt="Logo" className="w-full h-full object-cover" /> : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: customColor }}>
                <Scissors size={40} className="text-white" />
              </div>
            )}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-xl font-black tracking-tighter uppercase text-white">{studioName}</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="text-xs text-white/50 mt-2 uppercase tracking-widest font-bold">Preparando agendamento...</motion.p>
          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6, duration: 1.2, ease: "easeInOut" }}
            className="h-0.5 w-24 bg-white/30 rounded-full mt-6 origin-left" />
        </div>
      </div>
    );
  }

  const BackBtn = ({ to, label = "Voltar" }: { to: Step; label?: string }) => (
    <button onClick={() => setStep(to)} className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-700 text-xs font-bold mb-5 transition-colors group">
      <ArrowRight size={13} className="rotate-180 group-hover:-translate-x-0.5 transition-transform" /> {label}
    </button>
  );

  // Chip resumo seleção
  const SelectionChip = ({ label, sub, icon: Icon }: { label: string; sub?: string; icon?: any }) => (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-zinc-200 bg-white shadow-sm w-fit animate-in fade-in slide-in-from-left-2 duration-500">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: customColor + "15" }}>
        {Icon ? <Icon size={14} style={{ color: customColor }} /> : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: customColor }} />}
      </div>
      <div>
        <p className="text-[11px] font-black text-zinc-800 leading-none mb-0.5">{label}</p>
        {sub && <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">

      {/* ── PAINEL ESQUERDO (Desktop) ── */}
      <div
        className="hidden md:flex md:w-[50%] lg:w-[55%] relative overflow-hidden items-center justify-center p-12 lg:p-20 sticky top-0 h-screen"
        style={coverUrl ? heroStyle : { backgroundColor: customColor }}
      >
        {/* Camadas de Overlay para profundidade */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
        
        {/* Elementos Gráficos Animais de Background */}
        {!coverUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border-[1px] border-white/30 animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-[1px] border-white/10" />
            <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl" />
          </div>
        )}

        <div className="relative z-10 w-full max-w-xl text-center md:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {customLogo && (
              <div className="inline-block relative mb-10 group">
                <div className="absolute -inset-4 bg-white/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-2xl border border-white/20 overflow-hidden">
                  <img src={customLogo} alt={studioName} className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            
            <h1 className="text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-6 drop-shadow-2xl">
              {studioName}
            </h1>
            
            <div className="h-1 w-20 bg-white/30 rounded-full mb-8 hidden md:block" />

            <p className="text-lg lg:text-xl text-white/70 font-medium max-w-md leading-relaxed mb-10">
              {welcomeMessage || "Sua melhor experiência em autocuidado começa aqui. Agende sem complicação."}
            </p>

            <div className="flex flex-col gap-4">
              {studioAddress && (
                <div className="inline-flex items-center gap-3 text-white/80 px-5 py-3 rounded-2xl border border-white/10 backdrop-blur-md bg-white/5 w-fit hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <MapPin size={16} />
                  </div>
                  <span className="text-sm font-bold tracking-tight">{studioAddress}</span>
                </div>
              )}
              
              {instagram && (
                <a href={instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 text-white/80 px-5 py-3 rounded-2xl border border-white/10 backdrop-blur-md bg-white/5 w-fit hover:bg-white/10 transition-colors group">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:text-pink-400 transition-colors">
                    <Instagram size={16} />
                  </div>
                  <span className="text-sm font-bold tracking-tight">Siga no Instagram</span>
                </a>
              )}
            </div>

            {showInstallBanner && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }}
                className="mt-16 relative group cursor-default"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-white/20 to-transparent rounded-[24px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                <div className="relative flex items-center gap-4 bg-black/30 backdrop-blur-xl border border-white/10 rounded-[22px] p-5 max-w-sm">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-lg">
                    {customLogo ? <img src={customLogo} alt="" className="w-10 h-10 object-contain" /> : <Scissors size={24} className="text-zinc-800" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-0.5">App Agendelle</p>
                    <p className="text-sm text-white font-black truncate">Instale para acesso rápido</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleInstall}
                      size="sm"
                      className="bg-white text-zinc-950 hover:bg-zinc-100 h-10 w-10 p-0 rounded-xl"
                    >
                      <Download size={16} />
                    </Button>
                    <button onClick={() => setShowInstallBanner(false)} className="h-10 w-10 rounded-xl bg-white/5 text-white/40 hover:text-white transition-colors flex items-center justify-center">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full md:w-[48%] lg:w-[45%] xl:w-[42%] flex flex-col bg-white min-h-screen md:overflow-y-auto relative">

        {/* Mobile header — immersive */}
        <div className="md:hidden relative min-h-[180px] flex items-end px-6 pb-6 overflow-hidden" style={coverUrl ? heroStyle : { backgroundColor: customColor }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/40 to-black/90 z-[1]" />
          
          <div className="relative z-10 w-full flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {customLogo ? (
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden border-2 border-white/20 shrink-0">
                <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/10 backdrop-blur-md border-2 border-white/20 shrink-0">
                <Scissors size={28} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1.5">{studioName}</h2>
              {studioAddress && (
                <p className="text-[10px] text-white/60 font-medium flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin size={10} /> {studioAddress}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 px-5 py-7 md:px-8 md:py-10 lg:px-10 flex flex-col">
          <div className="w-full max-w-sm mx-auto flex-1 flex flex-col">
            <AnimatePresence mode="wait">

              {/* ── HOME ── */}
              {step === "home" && (
                <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3 flex-1 flex flex-col justify-center">
                  <div className="hidden md:block mb-7">
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Olá, bem-vindo!</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">O que você gostaria de fazer hoje?</p>
                  </div>
                  <div className="md:hidden mb-5">
                    <h3 className="text-xl font-black text-zinc-900 tracking-tight">O que deseja fazer?</h3>
                  </div>

                  {publicAgendaSettings.selfServiceWelcomeMessage && (
                    <div className="mb-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-100 text-[13px] leading-relaxed text-zinc-600 font-medium whitespace-pre-wrap">
                      {publicAgendaSettings.selfServiceWelcomeMessage}
                    </div>
                  )}

                  <button
                    disabled={!canBookOnline}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98]",
                      canBookOnline
                        ? "text-white hover:opacity-90 shadow-lg"
                        : "bg-zinc-100 text-zinc-400 shadow-none cursor-not-allowed"
                    )}
                    style={canBookOnline ? { backgroundColor: customColor } : {}}
                    onClick={handleStartBooking}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          canBookOnline ? "bg-white/15" : "bg-zinc-200/70"
                        )}
                      >
                        <CalendarIcon size={18} className={canBookOnline ? "text-white" : "text-zinc-400"} />
                      </div>
                      <div className="text-left">
                        <p className={cn("text-sm font-black leading-tight", canBookOnline ? "text-white" : "text-zinc-700")}>
                          Agendar Horário
                        </p>
                        <p className={cn("text-[10px] font-medium mt-0.5", canBookOnline ? "text-white/60" : "text-zinc-400")}>
                          {canBookOnline ? "Escolha o serviço e a data" : "Agendamento online indisponível no momento"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className={canBookOnline ? "text-white/70" : "text-zinc-300"} />
                  </button>

                  <button
                    disabled={!canConsultAppointments}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                      canConsultAppointments
                        ? "bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300"
                        : "bg-zinc-50/80 border-zinc-200 text-zinc-400 cursor-not-allowed"
                    )}
                    onClick={() => canConsultAppointments && setStep("consult")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-200/60 flex items-center justify-center shrink-0">
                        <Search size={17} className={canConsultAppointments ? "text-zinc-500" : "text-zinc-300"} />
                      </div>
                      <div className="text-left">
                        <p className={cn("text-sm font-black leading-tight", canConsultAppointments ? "text-zinc-800" : "text-zinc-500")}>
                          Meus Agendamentos
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                          {canConsultAppointments ? "Consultar pelo telefone" : "Consulta pública desativada"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-300" />
                  </button>

                  {(!canBookOnline || !canConsultAppointments) && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-[11px] font-bold text-amber-700">
                        Algumas opções foram desativadas nas configurações da agenda deste estabelecimento.
                      </p>
                    </div>
                  )}

                  {instagram && (
                    <a href={instagram} target="_blank" rel="noreferrer" className="block">
                      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-all">
                        <Instagram size={13} /> Siga no Instagram
                      </button>
                    </a>
                  )}
                  {studioAddress && (
                    <div className="flex items-center justify-center gap-1.5 text-zinc-300 pt-1">
                      <MapPin size={11} />
                      <span className="text-[10px] font-medium">{studioAddress}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── CONSULT ── */}
              {step === "consult" && (
                <motion.div key="consult" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                  <BackBtn to="home" />
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Meus Agendamentos</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Digite seu WhatsApp para buscar seus horários.</p>
                  </div>
                  
                  <div className="space-y-4">
                    <Input
                      label="WhatsApp"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e: any) => setPhone(formatPhone(e.target.value))}
                      iconLeft={<Phone size={16} />}
                      addonRight={
                        <button 
                          onClick={handleConsultAppointments} 
                          disabled={isLoading || phone.length < 10}
                          className="px-4 h-full flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
                          style={{ backgroundColor: customColor }}
                        >
                          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        </button>
                      }
                    />
                  </div>
                  {myAppointments.length > 0 ? (
                    <div className="space-y-2">
                      {myAppointments.map((app) => (
                        <div key={app.id} className="p-3.5 border border-zinc-200 rounded-2xl bg-white shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: customColor }} />
                          <div className="flex justify-between items-start pl-3">
                            <div>
                              <p className="text-xs font-black text-zinc-900">{app.service?.name}</p>
                              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                {format(new Date(app.date), "dd 'de' MMMM", { locale: ptBR })} às {app.startTime}
                              </p>
                            </div>
                            <span className={cn("text-[8px] px-2 py-1 rounded-full uppercase font-black tracking-widest",
                              app.status === "scheduled" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                              {app.status === "scheduled" ? "Agendado" : "Concluído"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : phone.length >= 10 && !isLoading && (
                    <div className="p-6 text-center border-2 border-dashed border-zinc-100 rounded-2xl bg-zinc-50">
                      <CalendarIcon size={22} className="text-zinc-300 mx-auto mb-2" />
                      <p className="text-[11px] font-bold text-zinc-400">Nenhum agendamento encontrado.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── CHOOSE MODE ── */}
              {step === "choose-mode" && (
                <motion.div key="choose-mode" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4 flex-1 flex flex-col justify-center">
                  <BackBtn to="home" />
                  <div className="mb-2">
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Agendar</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Como prefere começar?</p>
                  </div>

                  <button
                    onClick={() => setStep("by-professional")}
                    className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-md transition-all active:scale-[0.98] text-left group"
                  >
                    <div className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-sm" style={{ backgroundColor: customColor }}>
                      <User size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-zinc-900">Por Profissional</p>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">Escolha quem vai te atender primeiro</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: customColor + "15" }}>
                      <ChevronRight size={15} style={{ color: customColor }} />
                    </div>
                  </button>

                  <button
                    onClick={() => setStep("by-service")}
                    className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-md transition-all active:scale-[0.98] text-left group"
                  >
                    <div className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 bg-zinc-100">
                      <Scissors size={22} className="text-zinc-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-zinc-900">Por Serviço</p>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">Escolha o serviço e veja quem faz</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100">
                      <ChevronRight size={15} className="text-zinc-400" />
                    </div>
                  </button>
                </motion.div>
              )}

              {/* ── BY PROFESSIONAL (lista de profissionais) ── */}
              {step === "by-professional" && (
                <motion.div key="by-professional" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                  <BackBtn to="choose-mode" />
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Profissionais</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Com quem deseja ser atendido?</p>
                  </div>
                  <div className="space-y-3">
                    {professionals.map((p) => {
                      const svcCount = servicesForProfessional(p.id).length;
                      return (
                        <button key={p.id}
                          onClick={() => { setSelectedProfessional(p); setStep("pick-service"); }}
                          className="w-full flex items-center gap-4 p-4 bg-white border-2 border-zinc-100 rounded-2xl hover:border-zinc-200 hover:shadow-md transition-all active:scale-[0.98] text-left group">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-xl shadow-sm"
                            style={{ backgroundColor: customColor }}>
                            {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
                            {p.role && <p className="text-[11px] font-bold mt-0.5" style={{ color: customColor }}>{p.role}</p>}
                            {svcCount > 0 && <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{svcCount} serviço{svcCount !== 1 ? "s" : ""} disponível{svcCount !== 1 ? "is" : ""}</p>}
                          </div>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:translate-x-0.5" style={{ backgroundColor: customColor + "15" }}>
                            <ChevronRight size={15} style={{ color: customColor }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── PICK SERVICE (depois de escolher profissional) ── */}
              {step === "pick-service" && (
                <motion.div key="pick-service" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                  <BackBtn to="by-professional" />
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Serviços</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">O que você deseja fazer?</p>
                  </div>
                  {selectedProfessional && (
                    <SelectionChip label={selectedProfessional.name} sub={selectedProfessional.role} />
                  )}
                  <div className="space-y-2.5">
                    {servicesForProfessional(selectedProfessional?.id || "").map((s) => (
                      <button key={s.id}
                        onClick={() => { setSelectedService(s); setStep("date"); fetchAvailability(selectedDate, s.id, selectedProfessional.id); }}
                        className="w-full flex items-center gap-4 p-4 bg-white border-2 border-zinc-100 rounded-2xl hover:border-zinc-200 hover:shadow-md transition-all active:scale-[0.98] text-left group">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: customColor + "15" }}>
                          <Scissors size={16} style={{ color: customColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-zinc-900 truncate">{s.name}</p>
                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 flex items-center gap-1.5">
                            <Clock size={9} />{s.duration} min
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {publicAgendaSettings.selfServiceShowPrices && <p className="text-sm font-black" style={{ color: customColor }}>R$ {parseFloat(s.price).toFixed(2).replace(".", ",")}</p>}
                        </div>
                      </button>
                    ))}
                    {servicesForProfessional(selectedProfessional?.id || "").length === 0 && (
                      <div className="p-6 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
                        <p className="text-xs font-bold text-zinc-400">Nenhum serviço disponível para este profissional.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── BY SERVICE (lista de serviços) ── */}
              {step === "by-service" && (
                <motion.div key="by-service" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                  <BackBtn to="choose-mode" />
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Serviços</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">O que você deseja fazer?</p>
                  </div>
                  <div className="space-y-2.5">
                    {services.map((s) => {
                      const profs = professionalsForService(s.id);
                      return (
                        <button key={s.id}
                          onClick={() => handleServiceSelected(s)}
                          className="w-full flex items-center gap-4 p-4 bg-white border-2 border-zinc-100 rounded-2xl hover:border-zinc-200 hover:shadow-md transition-all active:scale-[0.98] text-left group">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: customColor + "15" }}>
                            <Scissors size={16} style={{ color: customColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-900 truncate">{s.name}</p>
                            <p className="text-[10px] text-zinc-400 font-medium mt-0.5 flex items-center gap-1.5">
                              <Clock size={9} />{s.duration} min
                              {!onlyOneProfessional && profs.length > 0 && (
                                <><span className="text-zinc-200">·</span>{profs.length} prof.</>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {publicAgendaSettings.selfServiceShowPrices && <p className="text-sm font-black" style={{ color: customColor }}>R$ {parseFloat(s.price).toFixed(2).replace(".", ",")}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── PICK PROFESSIONAL (depois de escolher serviço) ── */}
              {step === "pick-professional" && (
                <motion.div key="pick-professional" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                  <BackBtn to="by-service" />
                  <div>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Profissional</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Quem vai te atender?</p>
                  </div>
                  {selectedService && <SelectionChip label={selectedService.name} sub={`${selectedService.duration} min${publicAgendaSettings.selfServiceShowPrices ? ` · R$ ${parseFloat(selectedService.price).toFixed(2).replace(".", ",")}` : ""}`} />}
                  <div className="space-y-3">
                    {/* Sem preferência */}
                    <button
                      onClick={() => {
                        const first = professionalsForService(selectedService.id)[0] || professionals[0];
                        setSelectedProfessional(first);
                        setStep("date");
                        fetchAvailability(selectedDate, selectedService.id, first?.id);
                      }}
                      className="w-full flex items-center gap-4 p-4 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-zinc-300 hover:bg-zinc-100 transition-all active:scale-[0.98] text-left">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-zinc-100 shrink-0">
                        <User size={18} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-700">Sem Preferência</p>
                        <p className="text-[10px] text-zinc-400 font-medium">Primeiro disponível</p>
                      </div>
                    </button>

                    {professionalsForService(selectedService?.id || "").length > 1 && (
                      <div className="relative my-1">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100" /></div>
                        <div className="relative flex justify-center"><span className="bg-white px-3 text-[9px] font-bold tracking-widest text-zinc-300 uppercase">ou escolha</span></div>
                      </div>
                    )}

                    {professionalsForService(selectedService?.id || "").map((p) => (
                      <button key={p.id}
                        onClick={() => { setSelectedProfessional(p); setStep("date"); fetchAvailability(selectedDate, selectedService.id, p.id); }}
                        className="w-full flex items-center gap-4 p-4 bg-white border-2 border-zinc-100 rounded-2xl hover:border-zinc-200 hover:shadow-md transition-all active:scale-[0.98] text-left group">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-xl shadow-sm"
                          style={{ backgroundColor: customColor }}>
                          {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
                          <p className="text-[11px] font-bold mt-0.5" style={{ color: customColor }}>{p.role}</p>
                        </div>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:translate-x-0.5" style={{ backgroundColor: customColor + "15" }}>
                          <ChevronRight size={15} style={{ color: customColor }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── DATE ── */}
              {step === "date" && (
                <motion.div key="date" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                  <BackBtn to={selectedService && selectedProfessional ? "pick-professional" : "pick-service"} />
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-zinc-900">Data e Hora</h3>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">Quando fica melhor?</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center text-[10px] font-black text-white shrink-0"
                        style={{ backgroundColor: customColor }}>
                        {selectedProfessional?.photo
                          ? <img src={selectedProfessional.photo} alt="" className="w-full h-full object-cover" />
                          : selectedProfessional?.name.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-600">{selectedProfessional?.name.split(" ")[0]}</span>
                    </div>
                  </div>

                  {/* Chips seleção */}
                  <div className="flex flex-wrap gap-2">
                    {selectedService && <SelectionChip label={selectedService.name} sub={`${selectedService.duration} min`} />}
                  </div>

                  {/* Calendar */}
                  <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), startOfDay(new Date()))}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-500 transition-all disabled:opacity-30">
                        <ArrowRight size={14} className="rotate-180" />
                      </button>
                      <span className="font-black text-xs uppercase tracking-widest text-zinc-700">
                        {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                      </span>
                      <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-500 transition-all">
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 mb-2">
                      {["D","S","T","Q","Q","S","S"].map((d, i) => (
                        <div key={i} className="text-center text-[9px] font-black text-zinc-400 uppercase">{d}</div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {[["bg-emerald-400","Livre"],["bg-amber-400","Corrido"],["bg-zinc-400","Lotado"],["bg-rose-400","Fechado"]].map(([color, label]) => (
                        <div key={label} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
                        </div>
                      ))}
                    </div>
                    {(() => {
                      const monthStart = startOfMonth(currentMonth);
                      const monthEnd = endOfMonth(monthStart);
                      const startDate = startOfWeek(monthStart);
                      const endDate = endOfWeek(monthEnd);
                      const rows: React.ReactNode[] = [];
                      let days: React.ReactNode[] = [];
                      let day = startDate;
                      const today = startOfDay(new Date());
                      while (day <= endDate) {
                        for (let i = 0; i < 7; i++) {
                          const cloneDay = day;
                          const isPastDay = isBefore(day, today);
                          const isActive = isSameDay(day, selectedDate);
                          const isCurrentMonth = isSameMonth(day, monthStart);
                          const dayOfWeek = day.getDay();
                          const dateString = format(day, "yyyy-MM-dd");
                          const isBlocked = blockedDates.includes(dateString);
                          let dayStatus: "closed" | "full" | "busy" | "available" = "available";
                          if (isBlocked) dayStatus = "closed";
                          else if (calendarStatus[dateString]) dayStatus = calendarStatus[dateString] as any;
                          else if (dayOfWeek === 0) dayStatus = "closed";
                          
                          const maxAdvanceDate = addDays(today, publicAgendaSettings.maxAdvanceDays);
                          const isBeyondMaxAdvance = isBefore(maxAdvanceDate, day);
                          const isDisabled = isPastDay || !isCurrentMonth || dayStatus === "closed" || isBeyondMaxAdvance;
                          
                          days.push(
                            <button key={day.toISOString()} disabled={isDisabled}
                              onClick={() => { setSelectedDate(cloneDay); setSelectedSlot(null); fetchAvailability(cloneDay, selectedService.id, selectedProfessional.id); }}
                              className={cn("h-9 w-full rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative overflow-hidden",
                                isActive ? "text-white shadow-md" :
                                (isPastDay || !isCurrentMonth || dayStatus === "closed") ? "text-zinc-300 cursor-not-allowed" :
                                "bg-white text-zinc-800 hover:shadow-sm border border-zinc-200/50 active:scale-95")}
                              style={isActive ? { backgroundColor: customColor } : {}}>
                              <span className="relative z-10">{format(day, "d")}</span>
                              {!isPastDay && isCurrentMonth && (
                                <div className="absolute bottom-1 flex gap-0.5">
                                  {dayStatus === "closed" && <div className="w-1 h-1 rounded-full bg-rose-400" />}
                                  {dayStatus === "full" && <div className="w-1 h-1 rounded-full bg-zinc-400" />}
                                  {dayStatus === "busy" && <div className="w-1 h-1 rounded-full bg-amber-400" />}
                                  {dayStatus === "available" && !isActive && <div className="w-1 h-1 rounded-full bg-emerald-400" />}
                                </div>
                              )}
                            </button>
                          );
                          day = addDays(day, 1);
                        }
                        rows.push(<div key={day.toISOString()} className="grid grid-cols-7 gap-1 mb-1">{days}</div>);
                        days = [];
                      }
                      return rows;
                    })()}
                  </div>

                  {/* Time slots */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 flex items-center justify-between">
                      <span>Horários disponíveis</span>
                      {isLoading && <Loader2 size={12} className="animate-spin" />}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.length > 0 ? availableSlots.map((slot) => (
                        <button key={slot} onClick={() => setSelectedSlot(slot)}
                          className={cn("py-2.5 text-xs font-bold rounded-xl border-2 transition-all active:scale-95",
                            selectedSlot === slot ? "text-white border-transparent shadow-md" : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300")}
                          style={selectedSlot === slot ? { backgroundColor: customColor, borderColor: customColor } : {}}>
                          {slot}
                        </button>
                      )) : (
                        <div className="col-span-4 py-6 text-center border-2 border-dashed border-zinc-100 rounded-xl bg-zinc-50">
                          <Clock size={20} className="text-zinc-300 mx-auto mb-1" />
                          <p className="text-xs font-bold text-zinc-400">{selectedDate.getDay() === 0 ? "Fechado aos domingos" : !isLoading ? "Agenda cheia" : "Carregando..."}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button disabled={!selectedSlot}
                    onClick={() => { setStep("confirm"); if (phone.length >= 10) handleSearchClient(); }}
                    className={cn("w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]",
                      selectedSlot ? "text-white shadow-lg" : "bg-zinc-100 text-zinc-400 cursor-not-allowed")}
                    style={selectedSlot ? { backgroundColor: customColor } : {}}>
                    Confirmar Horário {selectedSlot && `— ${selectedSlot}`}
                  </button>
                </motion.div>
              )}

              {/* ── CONFIRM ── */}
              {step === "confirm" && (
                <motion.div key="confirm" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5">
                  <BackBtn to="date" />
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Quase lá!</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">Confirme seus dados para finalizar.</p>
                  </div>

                  {/* Resumo */}
                  <div className="p-4 rounded-2xl border-2" style={{ borderColor: customColor + "33", backgroundColor: customColor + "08" }}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: customColor }}>Resumo do Agendamento</p>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-100">
                      <div>
                        <p className="text-sm font-black text-zinc-900">{selectedService?.name}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">com {selectedProfessional?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-zinc-900">R$ {parseFloat(selectedService?.price || 0).toFixed(2).replace(".", ",")}</p>
                        <p className="text-[10px] text-zinc-400">{selectedService?.duration} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: customColor + "20" }}>
                        <CalendarIcon size={16} style={{ color: customColor }} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900">{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        <p className="text-[11px] font-bold" style={{ color: customColor }}>às {selectedSlot}</p>
                      </div>
                    </div>
                  </div>

                    {/* Dados do cliente */}
                    <div className="space-y-5">
                      <Input
                        label="WhatsApp"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={(e: any) => handlePhoneChange(e.target.value)}
                        onBlur={handleSearchClient}
                        iconLeft={<Phone size={16} />}
                        iconRight={
                          isLoading ? <Loader2 size={16} className="animate-spin text-zinc-400" /> :
                          (phoneSearched && isExistingClient) ? <CheckCircle2 size={18} className="text-emerald-500" /> : null
                        }
                        hint={isExistingClient ? `Olá de volta, ${clientData.name.split(" ")[0]}!` : undefined}
                      />

                      <AnimatePresence>
                        {phoneSearched && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-5"
                          >
                            {(!isExistingClient && publicAgendaSettings.selfServiceRequireLogin) ? (
                              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-bold text-rose-600">
                                Este estúdio exige cadastro prévio para agendamento online. Por favor, entre em contato via WhatsApp.
                              </div>
                            ) : (
                              <>
                                <Input
                                  label={isExistingClient ? "Confirmar Nome" : "Seu nome completo"}
                                  value={clientData.name}
                                  onChange={(e: any) => setClientData({ ...clientData, name: e.target.value })}
                                  readOnly={isExistingClient}
                                  placeholder="Como devemos te chamar?"
                                  iconLeft={<User size={16} />}
                                />

                                {!isExistingClient && (
                                  <Input
                                    label="Data de Aniversário"
                                    type="date"
                                    value={clientData.birthDate}
                                    onChange={(e: any) => setClientData({ ...clientData, birthDate: e.target.value })}
                                    hint="Opcional. Adoraríamos te dar um parabéns!"
                                    iconLeft={<CalendarIcon size={16} />}
                                  />
                                )}
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {publicAgendaSettings.allowClientRecurrence && (
                      <div className="pt-4 border-t border-zinc-100">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                          Repetir agendamento (opcional)
                        </label>
                        <select
                          value={repeatWeeks}
                          onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                          className="w-full text-sm p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-800 font-medium focus:ring-2 outline-none transition-all"
                        >
                          <option value={1}>Não repetir (apenas este dia)</option>
                          <option value={2}>Repetir por 2 semanas seguidas</option>
                          <option value={4}>Repetir por 4 semanas seguidas (1 mês)</option>
                          <option value={8}>Repetir por 8 semanas seguidas (2 meses)</option>
                        </select>
                        {repeatWeeks > 1 && (
                          <p className="text-[10px] text-amber-600 font-medium mt-2 bg-amber-50 p-2 rounded-xl border border-amber-100">
                            Atenção: Ao confirmar, serão gerados {repeatWeeks} agendamentos. Avisaremos caso haja conflito com feriados ou agenda do profissional nas próximas semanas.
                          </p>
                        )}
                      </div>
                    )}

                  {bookingError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
                      {bookingError}
                    </div>
                  )}

                  <Button
                    onClick={() => handleBooking()}
                    disabled={!clientData.name || phone.replace(/\D/g,"").length < 10 || isLoading || (!isExistingClient && publicAgendaSettings.selfServiceRequireLogin)}
                    className="w-full h-14 rounded-2xl text-white font-black text-base shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                    style={{ backgroundColor: customColor }}
                    iconLeft={isLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  >
                    {isLoading ? "Confirmando..." : "Confirmar Agendamento"}
                  </Button>
                </motion.div>
              )}

              {/* ── SUCCESS ── */}
              {step === "success" && (
                <motion.div key="success"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center py-2 space-y-6"
                >
                  {/* Ícone animado */}
                  <div className="relative mt-2">
                    <div className="absolute inset-0 rounded-full blur-[32px] opacity-30 animate-pulse" style={{ backgroundColor: customColor }} />
                    <div className="w-20 h-20 rounded-full flex items-center justify-center relative z-10 shadow-2xl"
                      style={{ backgroundColor: customColor }}>
                      <CheckCircle2 size={40} className="text-white stroke-[2]" />
                    </div>
                  </div>

                   <div className="text-center space-y-1.5">
                    <h3 className="text-3xl font-black text-zinc-950 tracking-tight">
                      {publicAgendaSettings.autoConfirmAppointments ? "Reservado!" : "Solicitado!"}
                    </h3>
                    <p className="text-sm text-zinc-400 font-medium max-w-[260px] mx-auto leading-relaxed">
                      {publicAgendaSettings.autoConfirmAppointments 
                        ? `Agendamento confirmado em ` 
                        : `Aguardando confirmação em `}
                      <span className="text-zinc-700 font-bold">{studioName}</span>
                    </p>
                  </div>

                  {/* Card resumo */}
                  <div className="w-full rounded-3xl overflow-hidden border-2 border-zinc-100 shadow-sm">
                    {/* Header colorido */}
                    <div className="px-5 py-4 text-white" style={{ backgroundColor: customColor }}>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                        {repeatWeeks > 1 ? `Agendamento Recorrente (${repeatWeeks}x)` : "Seu agendamento"}
                      </p>
                      <p className="text-lg font-black leading-tight">{selectedService?.name}</p>
                      <p className="text-sm font-bold opacity-80 mt-0.5">
                        {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} • {selectedSlot}
                      </p>
                      {repeatWeeks > 1 && (
                        <div className="mt-2 pt-2 border-t border-white/20 text-[10px] font-bold opacity-90 flex items-center gap-1.5">
                          <RefreshCw size={10} className="animate-spin-slow" />
                          Repetindo semanalmente pelas próximas {repeatWeeks - 1} semanas
                        </div>
                      )}
                    </div>
                    {/* Corpo branco */}
                    <div className="bg-white px-5 py-4 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm"
                        style={{ backgroundColor: customColor }}>
                        {selectedProfessional?.photo
                          ? <img src={selectedProfessional.photo} alt="" className="w-full h-full object-cover" />
                          : selectedProfessional?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900">{selectedProfessional?.name}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{selectedProfessional?.role}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-sm font-black" style={{ color: customColor }}>
                          R$ {parseFloat(selectedService?.price || "0").toFixed(2).replace(".", ",")}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-medium">{selectedService?.duration} min</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <Button
                      onClick={() => {
                        let msg = `Olá! Acabei de solicitar um agendamento no ${studioName}:\n\n` +
                                  `✂️ *Serviço:* ${selectedService?.name}\n` +
                                  `📅 *Data:* ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}\n` +
                                  `⏰ *Horário:* ${selectedSlot}`;
                        
                        if (repeatWeeks > 1) {
                          msg += `\n🔄 *Recorrência:* Repetir por ${repeatWeeks} semanas`;
                        }
                        
                        const targetPhone = selectedProfessional?.phone || studioPhone;
                        const url = targetPhone 
                          ? `https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
                          : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                        
                        window.open(url, "_blank");
                      }}
                      className="w-full h-13 rounded-2xl bg-[#25D366] hover:bg-[#1DA851] text-white font-black text-sm shadow-lg border-transparent"
                      iconLeft={<Phone size={18} />}
                    >
                      Avisar no WhatsApp
                    </Button>

                    <button
                      onClick={() => setStep("home")}
                      className="w-full py-2.5 text-[11px] font-black text-zinc-400 hover:text-zinc-700 uppercase tracking-[0.2em] transition-colors"
                    >
                      Voltar ao Início
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* iOS Install Banner */}
        <AnimatePresence>
          {showIosBanner && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="fixed bottom-4 left-4 right-4 z-50 bg-zinc-950 rounded-2xl p-4 shadow-2xl border border-zinc-800"
            >
              <button
                onClick={() => { setShowIosBanner(false); sessionStorage.setItem("ios-banner-dismissed", "1"); }}
                className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                  {customLogo ? <img src={customLogo} alt="" className="w-full h-full object-cover" /> : <Scissors size={20} className="text-zinc-800" />}
                </div>
                <div>
                  <p className="text-white font-black text-sm">{studioName}</p>
                  <p className="text-zinc-400 text-[10px] font-medium">Adicionar à tela inicial</p>
                </div>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Toque em <span className="text-white font-bold inline-flex items-center gap-0.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Compartilhar
                </span> e depois <span className="text-white font-bold">"Adicionar à Tela de Início"</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="py-5 flex flex-col items-center border-t border-zinc-100 bg-white">
          <div className="flex items-center gap-2 mb-1">
            {customLogo && <div className="w-5 h-5 rounded-md overflow-hidden border border-zinc-100"><img src={customLogo} alt="" className="w-full h-full object-cover" /></div>}
            <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">{studioName}</p>
          </div>
          <a href="/login" className="text-[9px] text-zinc-300 hover:text-zinc-500 font-medium transition-colors">Área Administrativa</a>
        </div>
      </div>
      
      {/* Conflicts Modal */}
      <AnimatePresence>
        {showConflictsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                <CalendarIcon size={20} className="text-amber-600" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Datas Indisponíveis</h3>
              <p className="text-xs text-zinc-500 font-medium mb-4 leading-relaxed">
                Algumas datas da sua recorrência caíram em feriados ou horários já ocupados. Deseja <strong>pular essas semanas</strong> e agendar apenas as datas livres?
              </p>
              
              <div className="max-h-[200px] overflow-y-auto space-y-2 mb-6">
                {recurrenceConflicts.map((c, i) => (
                  <div key={i} className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-zinc-800">{format(parse(c.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy")}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">{c.message}</p>
                    </div>
                    <span className="text-[9px] bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold uppercase">Pular</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="primary" fullWidth onClick={() => { setShowConflictsModal(false); handleBooking(true); }} className="h-12 shadow-md">
                  Pular conflitos e Agendar
                </Button>
                <Button variant="ghost" fullWidth onClick={() => { setShowConflictsModal(false); setRecurrenceConflicts([]); setIsLoading(false); }} className="h-12 text-zinc-500 hover:bg-zinc-100">
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
