import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, User, Phone, Instagram, ArrowRight, CheckCircle2, Search, Loader2, Scissors, MapPin, Download, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, isSameDay, startOfDay, startOfMonth, endOfMonth, endOfWeek, startOfWeek, isSameMonth, isBefore, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "react-router-dom";
import { cn } from "@/src/lib/utils";

type Step = "loading" | "home" | "consult" | "choose-mode" | "by-professional" | "by-service" | "pick-professional" | "pick-service" | "date" | "confirm" | "success";

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
    const res = await fetch(`/api/clients/search?phone=${digits}`, { headers });
    const data = await res.json();
    if (data && data.id) {
      setClientData({ name: data.name || "", age: data.age?.toString() || "", birthDate: data.birthDate?.slice(0, 10) || "" });
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
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<Record<string, any>>({});

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

  // Se só tem 1 profissional (ou nenhum), pula a seleção
  const onlyOneProfessional = professionals.length <= 1;
  const getDefaultProfessional = () => professionals.length === 1 ? professionals[0] : null;

  // Ao clicar "Agendar" na home: se só 1 prof → vai direto para serviços
  const handleStartBooking = () => {
    if (onlyOneProfessional) {
      setSelectedProfessional(getDefaultProfessional());
      setStep("by-service");
    } else {
      setStep("choose-mode");
    }
  };

  // Após escolher serviço (no by-service): se só 1 prof → vai direto para data
  const handleServiceSelected = (s: any) => {
    setSelectedService(s);
    if (onlyOneProfessional) {
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
      const res = await fetch(`/api/calendar-status?month=${month.toISOString()}&professionalId=${profId}`, { headers });
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
          }
        } catch {}
      }
      const headers: Record<string, string> = {};
      if (tid) headers["x-tenant-id"] = tid;
      fetch("/api/services", { headers }).then(r => r.ok ? r.json() : []).then(d => setServices(Array.isArray(d) ? d.filter((s: any) => s.type === "service") : []));
      fetch("/api/professionals", { headers }).then(r => r.ok ? r.json() : []).then(d => setProfessionals(Array.isArray(d) ? d.filter((p: any) => p.isActive !== false) : []));
      setTimeout(() => setStep("home"), 1600);
    };
    loadData();
  }, [slug]);

  const handleSearchClient = async () => triggerClientSearch(phone);

  const handleConsultAppointments = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    setIsLoading(true);
    const headers: Record<string, string> = {};
    if (tenantId) headers["x-tenant-id"] = tenantId;
    const res = await fetch(`/api/appointments/client?phone=${digits}`, { headers });
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

  const handleBooking = async () => {
    setIsLoading(true);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tenantId) headers["x-tenant-id"] = tenantId;

    // Garante profissional resolvido — usa o único se só tiver 1
    const profId = selectedProfessional?.id || (professionals.length === 1 ? professionals[0].id : null);

    const clientRes = await fetch("/api/clients", { method: "POST", headers, body: JSON.stringify({ ...clientData, phone, birthDate: clientData.birthDate || undefined }) });
    const client = await clientRes.json();
    const apptRes = await fetch("/api/appointments", {
      method: "POST", headers,
      body: JSON.stringify({ date: selectedDate, startTime: selectedSlot, clientId: client.id, serviceId: selectedService?.id, professionalId: profId })
    });
    if (!apptRes.ok) {
      const err = await apptRes.json().catch(() => ({}));
      console.error("Erro ao criar agendamento:", err);
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
  const SelectionChip = ({ label, sub }: { label: string; sub?: string }) => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 w-fit">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: customColor }} />
      <div>
        <p className="text-[10px] font-black text-zinc-700 leading-tight">{label}</p>
        {sub && <p className="text-[9px] text-zinc-400 font-medium">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">

      {/* ── LEFT PANEL (desktop) ── */}
      <div
        className="hidden md:flex md:w-[52%] lg:w-[55%] xl:w-[58%] relative overflow-hidden items-end p-12 lg:p-16 xl:p-20 sticky top-0 h-screen"
        style={coverUrl ? heroStyle : { backgroundColor: customColor }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 pointer-events-none" />
        {!coverUrl && (
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-16 left-16 w-96 h-96 rounded-full border-2 border-white" />
            <div className="absolute bottom-32 right-10 w-64 h-64 rounded-full border border-white" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white" />
          </div>
        )}
        <div className="relative z-10 w-full max-w-lg">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
            {customLogo && (
              <div className="w-20 h-20 bg-white rounded-[22px] flex items-center justify-center mb-8 shadow-2xl shadow-black/40 overflow-hidden">
                <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-[0.9] mb-5">{studioName}</h1>
            <p className="text-base text-white/60 font-medium max-w-sm leading-relaxed">
              {welcomeMessage || "Agende seu horário de forma rápida e sem precisar baixar apps."}
            </p>
            {studioAddress && (
              <div className="mt-6 inline-flex items-center gap-2 text-white/50 px-4 py-2.5 rounded-full border border-white/10 backdrop-blur-sm bg-black/20">
                <MapPin size={13} className="text-white/60 shrink-0" />
                <span className="text-xs font-semibold">{studioAddress}</span>
              </div>
            )}
            {showInstallBanner && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 max-w-xs">
                <div className="w-11 h-11 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                  {customLogo ? <img src={customLogo} alt="" className="w-full h-full object-cover" /> : <Scissors size={20} className="text-zinc-800" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-white/50 font-bold uppercase tracking-widest">Instalar App</p>
                  <p className="text-sm text-white font-black truncate">{studioName}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={handleInstall} className="px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: customColor }}>
                    <Download size={14} />
                  </button>
                  <button onClick={() => setShowInstallBanner(false)} className="px-2 py-2 rounded-xl bg-white/10 text-white/50 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="w-full md:w-[48%] lg:w-[45%] xl:w-[42%] flex flex-col bg-white min-h-screen md:overflow-y-auto relative">

        {/* Mobile header — sticky */}
        <div className="md:hidden sticky top-0 z-30 relative overflow-hidden" style={coverUrl ? { ...heroStyle, minHeight: "160px" } : { backgroundColor: customColor, minHeight: "160px" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/85" />
          {showInstallBanner && (
            <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3 bg-black/60 backdrop-blur-md border-b border-white/10">
              <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex items-center justify-center shrink-0">
                {customLogo ? <img src={customLogo} alt="" className="w-full h-full object-cover" /> : <Scissors size={14} className="text-zinc-800" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest leading-none">Instalar como app</p>
                <p className="text-xs text-white font-black truncate leading-tight">{studioName}</p>
              </div>
              <button onClick={handleInstall} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white shrink-0" style={{ backgroundColor: customColor }}>
                <Download size={11} /> Instalar
              </button>
              <button onClick={() => setShowInstallBanner(false)} className="p-1 text-white/50 hover:text-white transition-colors shrink-0"><X size={15} /></button>
            </motion.div>
          )}
          <div className="relative z-10 flex flex-col items-center justify-end text-center pb-5 pt-10 px-6 min-h-[160px]">
            {customLogo ? (
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-3 shadow-xl overflow-hidden border-2 border-white/20">
                <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 bg-white/10 backdrop-blur-sm border-2 border-white/20">
                <Scissors size={24} className="text-white" />
              </div>
            )}
            <h2 className="text-lg font-black text-white tracking-tight leading-tight">{studioName}</h2>
            {studioAddress && (
              <p className="text-[10px] text-white/50 font-medium mt-1 flex items-center gap-1">
                <MapPin size={9} /> {studioAddress}
              </p>
            )}
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

                  <button
                    className="w-full flex items-center justify-between p-4 rounded-2xl text-white transition-all active:scale-[0.98] hover:opacity-90 shadow-lg"
                    style={{ backgroundColor: customColor }}
                    onClick={handleStartBooking}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                        <CalendarIcon size={18} className="text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black leading-tight">Agendar Horário</p>
                        <p className="text-[10px] text-white/60 font-medium mt-0.5">Escolha o serviço e a data</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/70" />
                  </button>

                  <button
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200 transition-all active:scale-[0.98] hover:bg-zinc-100 hover:border-zinc-300"
                    onClick={() => setStep("consult")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-200/60 flex items-center justify-center shrink-0">
                        <Search size={17} className="text-zinc-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-zinc-800 leading-tight">Meus Agendamentos</p>
                        <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Consultar pelo telefone</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-300" />
                  </button>

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
                    <h3 className="text-xl font-black text-zinc-900">Meus Agendamentos</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Digite seu WhatsApp para buscar</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">Telefone (WhatsApp)</label>
                    <div className="flex gap-2">
                      <input type="tel" placeholder="(00) 00000-0000"
                        className="flex-1 text-sm p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 font-bold transition-all h-12"
                        value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
                      <button onClick={handleConsultAppointments} disabled={isLoading}
                        className="rounded-xl w-12 h-12 flex items-center justify-center text-white shadow shrink-0 transition-opacity disabled:opacity-60"
                        style={{ backgroundColor: customColor }}>
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      </button>
                    </div>
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
                    <h3 className="text-xl font-black text-zinc-900">Agendar Horário</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Como prefere começar?</p>
                  </div>

                  <button
                    onClick={() => setStep("by-professional")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all active:scale-[0.98] text-left"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: customColor }}>
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-zinc-900">Por Profissional</p>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Escolha quem vai te atender primeiro</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                  </button>

                  <button
                    onClick={() => setStep("by-service")}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all active:scale-[0.98] text-left"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-zinc-100">
                      <Scissors size={20} className="text-zinc-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-zinc-900">Por Serviço</p>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Escolha o serviço e veja quem faz</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                  </button>
                </motion.div>
              )}

              {/* ── BY PROFESSIONAL (lista de profissionais) ── */}
              {step === "by-professional" && (
                <motion.div key="by-professional" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                  <BackBtn to="choose-mode" />
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Profissionais</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Com quem deseja ser atendido?</p>
                  </div>
                  <div className="space-y-2">
                    {professionals.map((p) => {
                      const svcCount = servicesForProfessional(p.id).length;
                      return (
                        <button key={p.id}
                          onClick={() => { setSelectedProfessional(p); setStep("pick-service"); }}
                          className="w-full flex items-center gap-3.5 p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-sm transition-all active:scale-[0.98] text-left">
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-base shadow-sm"
                            style={{ backgroundColor: customColor }}>
                            {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
                            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                              {p.role}{svcCount > 0 ? ` · ${svcCount} serviço${svcCount !== 1 ? "s" : ""}` : ""}
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── PICK SERVICE (depois de escolher profissional) ── */}
              {step === "pick-service" && (
                <motion.div key="pick-service" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                  <BackBtn to="by-professional" />
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Serviços</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">O que você deseja fazer?</p>
                  </div>
                  {selectedProfessional && (
                    <SelectionChip label={selectedProfessional.name} sub={selectedProfessional.role} />
                  )}
                  <div className="space-y-2">
                    {servicesForProfessional(selectedProfessional?.id || "").map((s) => (
                      <button key={s.id}
                        onClick={() => { setSelectedService(s); setStep("date"); fetchAvailability(selectedDate, s.id, selectedProfessional.id); }}
                        className="w-full flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-sm transition-all active:scale-[0.98] text-left">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-sm font-black text-zinc-900 truncate">{s.name}</p>
                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1"><Clock size={9} />{s.duration} min</span>
                            <span className="text-zinc-200">·</span>
                            <span className="font-bold text-emerald-600">R$ {parseFloat(s.price).toFixed(2).replace(".", ",")}</span>
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-300 shrink-0" />
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
                <motion.div key="by-service" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                  <BackBtn to="choose-mode" />
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Serviços</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">O que você deseja fazer?</p>
                  </div>
                  <div className="space-y-2">
                    {services.map((s) => (
                      <button key={s.id}
                        onClick={() => handleServiceSelected(s)}
                        className="w-full flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-sm transition-all active:scale-[0.98] text-left">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-sm font-black text-zinc-900 truncate">{s.name}</p>
                          <p className="text-[10px] text-zinc-400 font-medium mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1"><Clock size={9} />{s.duration} min</span>
                            <span className="text-zinc-200">·</span>
                            <span className="font-bold text-emerald-600">R$ {parseFloat(s.price).toFixed(2).replace(".", ",")}</span>
                          </p>
                          {!onlyOneProfessional && (() => {
                            const profs = professionalsForService(s.id);
                            return profs.length > 0 ? (
                              <p className="text-[9px] text-zinc-300 font-medium mt-1">{profs.length} profissional{profs.length !== 1 ? "is" : ""}</p>
                            ) : null;
                          })()}
                        </div>
                        <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── PICK PROFESSIONAL (depois de escolher serviço) ── */}
              {step === "pick-professional" && (
                <motion.div key="pick-professional" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                  <BackBtn to="by-service" />
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Profissional</h3>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Quem vai te atender?</p>
                  </div>
                  {selectedService && <SelectionChip label={selectedService.name} sub={`${selectedService.duration} min · R$ ${parseFloat(selectedService.price).toFixed(2).replace(".", ",")}`} />}
                  <div className="space-y-2">
                    {/* Sem preferência */}
                    <button
                      onClick={() => {
                        const first = professionalsForService(selectedService.id)[0] || professionals[0];
                        setSelectedProfessional(first);
                        setStep("date");
                        fetchAvailability(selectedDate, selectedService.id, first?.id);
                      }}
                      className="w-full flex items-center gap-3.5 p-4 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-zinc-300 hover:bg-zinc-100 transition-all active:scale-[0.98] text-left">
                      <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm border border-zinc-100 shrink-0">
                        <User size={16} className="text-zinc-400" />
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
                        className="w-full flex items-center gap-3.5 p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-sm transition-all active:scale-[0.98] text-left">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-base shadow-sm"
                          style={{ backgroundColor: customColor }}>
                          {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">{p.role}</p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-300 shrink-0" />
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
                          const isDisabled = isPastDay || !isCurrentMonth || dayStatus === "closed";
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
                  <div className="space-y-3">
                    {/* Telefone sempre visível */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">WhatsApp</label>
                      <div className="relative">
                        <input
                          type="tel"
                          placeholder="(00) 00000-0000"
                          className="w-full text-sm font-bold p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-zinc-400 transition-all h-12 pr-10"
                          value={phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          onBlur={handleSearchClient}
                        />
                        {isLoading && (
                          <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        )}
                        {phoneSearched && !isLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isExistingClient
                              ? <CheckCircle2 size={16} className="text-emerald-500" />
                              : <div className="w-4 h-4 rounded-full bg-zinc-200" />}
                          </div>
                        )}
                      </div>
                      {isExistingClient && (
                        <p className="text-[10px] text-emerald-600 font-bold ml-0.5 flex items-center gap-1">
                          ✓ Bem-vindo de volta, {clientData.name.split(" ")[0]}!
                        </p>
                      )}
                    </div>

                    {/* Nome e aniversário — aparecem após busca */}
                    <AnimatePresence>
                      {phoneSearched && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 overflow-hidden"
                        >
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">
                              {isExistingClient ? "Nome" : "Seu nome completo"}
                            </label>
                            <input
                              type="text"
                              placeholder="Como devemos te chamar?"
                              className="w-full text-sm font-bold p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-zinc-400 transition-all h-12"
                              value={clientData.name}
                              onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                              readOnly={isExistingClient}
                            />
                          </div>

                          {!isExistingClient && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-0.5">
                                Data de Aniversário <span className="text-zinc-300 normal-case font-medium">(opcional)</span>
                              </label>
                              <input
                                type="date"
                                className="w-full text-sm font-bold p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-zinc-400 transition-all h-12"
                                value={clientData.birthDate}
                                onChange={(e) => setClientData({ ...clientData, birthDate: e.target.value })}
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={handleBooking}
                    disabled={!clientData.name || phone.replace(/\D/g,"").length < 10 || isLoading}
                    className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: customColor }}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Confirmar Agendamento</>}
                  </button>
                </motion.div>
              )}

              {/* ── SUCCESS ── */}
              {step === "success" && (
                <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8 space-y-6 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-3xl bg-white shadow-xl overflow-hidden border border-zinc-100 flex items-center justify-center">
                    {customLogo ? <img src={customLogo} alt="Logo" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: customColor }}>
                        <Scissors size={32} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl opacity-25" style={{ backgroundColor: customColor }} />
                    <div className="w-20 h-20 rounded-full flex items-center justify-center relative z-10 border-2"
                      style={{ backgroundColor: customColor + "15", borderColor: customColor + "30" }}>
                      <CheckCircle2 size={38} style={{ color: customColor }} className="stroke-[2]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-zinc-900 tracking-tight">Confirmado!</h3>
                    <p className="text-sm text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
                      Sua cadeira está reservada, <strong className="text-zinc-800">{clientData.name.split(" ")[0]}</strong>. Te esperamos no dia!
                    </p>
                  </div>
                  <div className="w-full p-4 rounded-2xl border" style={{ borderColor: customColor + "30", backgroundColor: customColor + "08" }}>
                    <div className="flex items-center gap-3 justify-center">
                      <CalendarIcon size={15} style={{ color: customColor }} />
                      <div className="text-left">
                        <p className="text-xs font-black text-zinc-900">{format(selectedDate, "dd/MM/yyyy")}</p>
                        <p className="text-[11px] font-bold" style={{ color: customColor }}>{selectedService?.name} às {selectedSlot}</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full space-y-3">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Olá! Agendei um horário para *${selectedService?.name}* em *${format(selectedDate, "dd/MM/yyyy")}* às *${selectedSlot}*. Meu nome é ${clientData.name} e telefone ${phone}.`)}`}
                      target="_blank" rel="noreferrer" className="block w-full">
                      <button className="w-full py-4 text-sm font-bold bg-[#25D366] hover:bg-[#1DA851] text-white rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]">
                        <Phone size={16} /> Avisar no WhatsApp
                      </button>
                    </a>
                    {showInstallBanner && (
                      <button onClick={handleInstall}
                        className="w-full py-3 text-sm font-bold rounded-2xl border-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{ borderColor: customColor + "40", color: customColor }}>
                        <Download size={16} /> Instalar o app do {studioName}
                      </button>
                    )}
                    <button onClick={() => setStep("home")}
                      className="w-full py-3 text-xs font-bold text-zinc-400 hover:text-zinc-700 rounded-2xl hover:bg-zinc-50 transition-all">
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
    </div>
  );
}
