import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, Clock, User, Phone, Instagram, ArrowRight, CheckCircle2, Search, Loader2, Scissors, MapPin, Download, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, isSameDay, startOfDay, startOfMonth, endOfMonth, endOfWeek, startOfWeek, isSameMonth, isBefore, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "react-router-dom";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

export default function ClientBooking() {
  const { slug } = useParams();
  const [studioName, setStudioName] = useState("Agendelle");
  const [studioAddress, setStudioAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");

  const [customColor, setCustomColor] = useState("#0a0a0a");
  const [customLogo, setCustomLogo] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const blockedDates = ["2026-04-16"];

  const [step, setStep] = useState<"loading" | "home" | "consult" | "service" | "professional" | "date" | "confirm" | "success">("loading");
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [clientData, setClientData] = useState({ name: "", age: "" });
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [calendarStatus, setCalendarStatus] = useState<Record<string, any>>({});

  const fetchCalendarStatus = async (month: Date, profId: string) => {
    if (!profId || !tenantId) return;
    try {
      const headers: Record<string, string> = { "x-tenant-id": tenantId };
      const res = await fetch(`/api/calendar-status?month=${month.toISOString()}&professionalId=${profId}`, { headers });
      const data = await res.json();
      setCalendarStatus(data);
    } catch {
      setCalendarStatus({});
    }
  };

  useEffect(() => {
    if (selectedProfessional && currentMonth) {
      fetchCalendarStatus(currentMonth, selectedProfessional.id);
    }
  }, [currentMonth, selectedProfessional, tenantId]);

  // PWA: capture beforeinstallprompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
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
        } catch { /* sem slug válido */ }
      }
      const headers: Record<string, string> = {};
      if (tid) headers["x-tenant-id"] = tid;
      fetch("/api/services", { headers }).then(r => r.json()).then(setServices);
      fetch("/api/professionals", { headers }).then(r => r.json()).then(setProfessionals);
      setTimeout(() => setStep("home"), 1800);
    };
    loadData();
  }, [slug]);

  const handleSearchClient = async () => {
    if (phone.length < 10) return;
    setIsLoading(true);
    const headers: Record<string, string> = {};
    if (tenantId) headers["x-tenant-id"] = tenantId;
    const res = await fetch(`/api/clients/search?phone=${phone}`, { headers });
    const data = await res.json();
    if (data) {
      setClientData({ name: data.name, age: data.age?.toString() || "" });
      setIsExistingClient(true);
    } else {
      setIsExistingClient(false);
    }
    setIsLoading(false);
  };

  const handleConsultAppointments = async () => {
    if (phone.length < 10) return;
    setIsLoading(true);
    const headers: Record<string, string> = {};
    if (tenantId) headers["x-tenant-id"] = tenantId;
    const res = await fetch(`/api/appointments/client?phone=${phone}`, { headers });
    const data = await res.json();
    setMyAppointments(data);
    setIsLoading(false);
  };

  const fetchAvailability = async (date: Date, serviceId: string, professionalId: string) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (tenantId) headers["x-tenant-id"] = tenantId;
      const res = await fetch(
        `/api/availability?date=${date.toISOString()}&serviceId=${serviceId}&professionalId=${professionalId}`,
        { headers }
      );
      const data = await res.json();
      setAvailableSlots(Array.isArray(data) ? data : []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBooking = async () => {
    setIsLoading(true);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (tenantId) headers["x-tenant-id"] = tenantId;
    const clientRes = await fetch("/api/clients", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...clientData, phone })
    });
    const client = await clientRes.json();
    await fetch("/api/appointments", {
      method: "POST",
      headers,
      body: JSON.stringify({
        date: selectedDate,
        startTime: selectedSlot,
        clientId: client.id,
        serviceId: selectedService.id,
        professionalId: selectedProfessional.id
      })
    });
    setIsLoading(false);
    setStep("success");
  };

  // Background hero image: use coverUrl from tenant, fallback to solid dark
  const heroStyle = coverUrl
    ? { backgroundImage: `url('${coverUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  // Loading screen
  if (step === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-[100]" style={{ backgroundColor: customColor || "#0a0a0a" }}>
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl overflow-hidden border border-white/10"
          >
            {customLogo ? (
              <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: customColor || "#0a0a0a" }}>
                <Scissors size={40} className="text-white" />
              </div>
            )}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-black tracking-tighter uppercase text-white"
          >
            {studioName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-white/50 mt-2 uppercase tracking-widest font-bold"
          >
            Preparando agendamento...
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 1.2, ease: "easeInOut" }}
            className="h-0.5 w-24 bg-white/30 rounded-full mt-6 origin-left"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">

      {/* ── LEFT PANEL (desktop only) ── */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-[55%] xl:w-[60%] relative overflow-hidden items-end p-12 lg:p-20"
        style={coverUrl ? heroStyle : { backgroundColor: customColor }}
      >
        {/* overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 pointer-events-none" />
        {!coverUrl && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-80 h-80 rounded-full border-2 border-white/20" />
            <div className="absolute bottom-40 right-20 w-60 h-60 rounded-full border border-white/10" />
          </div>
        )}

        <div className="relative z-10 w-full max-w-xl">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {/* Logo */}
            {customLogo && (
              <div className="w-20 h-20 bg-white rounded-[20px] flex items-center justify-center mb-8 shadow-2xl shadow-black/50 overflow-hidden border border-white/20">
                <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none mb-4">
              {studioName}
            </h1>
            <p className="text-base lg:text-lg text-white/60 font-medium max-w-md leading-relaxed">
              {welcomeMessage || "Agende seu horário de forma rápida, sem precisar baixar apps."}
            </p>
            {studioAddress && (
              <div className="mt-6 flex items-center gap-2 text-white/50 w-fit px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm bg-black/20">
                <MapPin size={14} className="text-white/70 shrink-0" />
                <span className="text-xs font-semibold">{studioAddress}</span>
              </div>
            )}

            {/* PWA Install Button (desktop) */}
            {showInstallBanner && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 max-w-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                  {customLogo ? (
                    <img src={customLogo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Scissors size={20} className="text-zinc-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Instalar App</p>
                  <p className="text-sm text-white font-black truncate">{studioName}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleInstall}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: customColor }}
                  >
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

      {/* ── RIGHT PANEL (booking form) ── */}
      <div className="w-full md:w-1/2 lg:w-[45%] xl:w-[40%] flex flex-col bg-white min-h-screen relative shadow-2xl z-10 md:overflow-y-auto">

        {/* ── MOBILE HEADER ── */}
        <div className="md:hidden relative overflow-hidden" style={coverUrl ? { ...heroStyle, minHeight: "220px" } : { backgroundColor: customColor, minHeight: "220px" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />

          {/* PWA Install banner (mobile top) */}
          {showInstallBanner && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/10"
            >
              <div className="w-9 h-9 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                {customLogo ? (
                  <img src={customLogo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Scissors size={16} className="text-zinc-800" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest leading-none">Instalar como app</p>
                <p className="text-sm text-white font-black truncate leading-tight">{studioName}</p>
              </div>
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: customColor }}
              >
                <Download size={12} />
                Instalar
              </button>
              <button onClick={() => setShowInstallBanner(false)} className="p-1.5 text-white/50 hover:text-white transition-colors shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          )}

          {/* Mobile logo + name */}
          <div className="relative z-10 flex flex-col items-center justify-end text-center pb-8 pt-16 px-6 min-h-[220px]">
            {customLogo ? (
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl overflow-hidden border border-white/20">
                <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border border-white/20 bg-white/10 backdrop-blur-sm">
                <Scissors size={28} className="text-white" />
              </div>
            )}
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{studioName}</h2>
            {welcomeMessage && (
              <p className="text-[11px] text-white/60 font-medium mt-1 max-w-xs">{welcomeMessage}</p>
            )}
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 p-5 md:p-8 lg:p-10 flex flex-col">
          <div className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">

              {/* ── HOME ── */}
              {step === "home" && (
                <motion.div key="home" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-3">
                  <div className="hidden md:block mb-8">
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Olá, bem-vindo!</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1.5">O que você gostaria de fazer hoje?</p>
                  </div>

                  <button
                    className="w-full flex items-center justify-between p-4 rounded-2xl text-white shadow-lg transition-all active:scale-[0.98] hover:opacity-90"
                    style={{ backgroundColor: customColor }}
                    onClick={() => setStep("service")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                        <CalendarIcon size={18} className="text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black leading-tight">Agendar Horário</p>
                        <p className="text-[10px] text-white/60 font-medium">Escolha serviço e data</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                      <ArrowRight size={16} />
                    </div>
                  </button>

                  <button
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200 transition-all active:scale-[0.98] hover:border-zinc-300 hover:bg-zinc-100"
                    onClick={() => setStep("consult")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-200/60 flex items-center justify-center">
                        <Search size={18} className="text-zinc-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-zinc-900 leading-tight">Meus Agendamentos</p>
                        <p className="text-[10px] text-zinc-500 font-medium">Consultar pelo telefone</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-zinc-200/60 flex items-center justify-center">
                      <ArrowRight size={16} className="text-zinc-400" />
                    </div>
                  </button>

                  {instagram && (
                    <a href={instagram} target="_blank" rel="noreferrer">
                      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all mt-1">
                        <Instagram size={14} />
                        Siga no Instagram
                      </button>
                    </a>
                  )}

                  {studioAddress && (
                    <div className="flex items-center justify-center gap-2 pt-1 text-zinc-400">
                      <MapPin size={12} />
                      <span className="text-[10px] font-medium">{studioAddress}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── CONSULT ── */}
              {step === "consult" && (
                <motion.div key="consult" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                  <div>
                    <button onClick={() => setStep("home")} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-700 text-xs font-bold mb-4 transition-colors">
                      <ArrowRight size={14} className="rotate-180" /> Voltar
                    </button>
                    <h3 className="text-xl font-black text-zinc-900">Meus Agendamentos</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Digite seu WhatsApp para buscar</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Telefone (WhatsApp)</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        className="flex-1 text-sm p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-zinc-400 font-bold transition-all h-12"
                        style={{ "--tw-ring-color": customColor + "33" } as React.CSSProperties}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <button
                        onClick={handleConsultAppointments}
                        disabled={isLoading}
                        className="rounded-xl w-12 h-12 flex items-center justify-center text-white shadow-md shrink-0 transition-opacity disabled:opacity-60"
                        style={{ backgroundColor: customColor }}
                      >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      </button>
                    </div>
                  </div>

                  {myAppointments.length > 0 ? (
                    <div className="space-y-2">
                      {myAppointments.map((app) => (
                        <div key={app.id} className="p-3 border border-zinc-200 rounded-2xl bg-white shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full rounded-full" style={{ backgroundColor: customColor }} />
                          <div className="flex justify-between items-start pl-3">
                            <div>
                              <p className="text-xs font-black text-zinc-900">{app.service.name}</p>
                              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">
                                {format(new Date(app.date), "dd 'de' MMMM", { locale: ptBR })} às {app.startTime}
                              </p>
                            </div>
                            <span className={cn(
                              "text-[8px] px-2 py-1 rounded-full uppercase font-black tracking-widest",
                              app.status === "scheduled" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {app.status === "scheduled" ? "Agendado" : "Concluído"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : phone.length >= 10 && !isLoading && (
                    <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
                      <CalendarIcon size={24} className="text-zinc-300 mx-auto mb-2" />
                      <p className="text-[11px] font-bold text-zinc-500">Nenhum agendamento encontrado.</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── SERVICE ── */}
              {step === "service" && (
                <motion.div key="service" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                  <div>
                    <button onClick={() => setStep("home")} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-700 text-xs font-bold mb-4 transition-colors">
                      <ArrowRight size={14} className="rotate-180" /> Voltar
                    </button>
                    <h3 className="text-xl font-black text-zinc-900">Serviços</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">O que você deseja fazer?</p>
                  </div>

                  <div className="grid gap-2">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedService(s); setStep("professional"); }}
                        className="group flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-sm transition-all text-left active:scale-[0.98]"
                      >
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{s.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium mt-0.5 flex gap-2 items-center">
                            <span className="flex items-center gap-1"><Clock size={10} />{s.duration} min</span>
                            <span className="text-zinc-300">•</span>
                            <span className="font-bold text-emerald-600">R$ {parseFloat(s.price).toFixed(2).replace(".", ",")}</span>
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:text-white transition-colors" style={{ "--hover-bg": customColor } as React.CSSProperties}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = customColor)}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
                        >
                          <ArrowRight size={15} />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── PROFESSIONAL ── */}
              {step === "professional" && (
                <motion.div key="professional" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
                  <div>
                    <button onClick={() => setStep("service")} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-700 text-xs font-bold mb-4 transition-colors">
                      <ArrowRight size={14} className="rotate-180" /> Voltar
                    </button>
                    <h3 className="text-xl font-black text-zinc-900">Profissional</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Quem irá te atender?</p>
                  </div>

                  {/* Chip do serviço */}
                  <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-fit">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: customColor }} />
                    <span className="text-[10px] font-bold text-zinc-700">{selectedService?.name}</span>
                  </div>

                  <div className="grid gap-2">
                    <button
                      onClick={() => { setSelectedProfessional(professionals[0]); setStep("date"); fetchAvailability(selectedDate, selectedService.id, professionals[0]?.id); }}
                      className="group flex items-center p-4 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-zinc-400 hover:bg-zinc-100 transition-all text-left active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mr-3 border border-zinc-100">
                        <User size={16} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Sem Preferência</p>
                        <p className="text-[10px] text-zinc-500 font-medium">Primeiro disponível</p>
                      </div>
                    </button>

                    {professionals.length > 0 && (
                      <div className="relative my-1">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100" /></div>
                        <div className="relative flex justify-center"><span className="bg-white px-3 text-[9px] font-bold tracking-widest text-zinc-300 uppercase">ou escolha um</span></div>
                      </div>
                    )}

                    {professionals.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProfessional(p); setStep("date"); fetchAvailability(selectedDate, selectedService.id, p.id); }}
                        className="group flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-sm transition-all text-left active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm"
                            style={{ backgroundColor: customColor }}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{p.name}</p>
                            <p className="text-[10px] text-zinc-500 font-medium">{p.role}</p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── DATE ── */}
              {step === "date" && (
                <motion.div key="date" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                  <div>
                    <button onClick={() => setStep("professional")} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-700 text-xs font-bold mb-4 transition-colors">
                      <ArrowRight size={14} className="rotate-180" /> Voltar
                    </button>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-zinc-900">Data e Hora</h3>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5">Quando fica melhor?</p>
                      </div>
                      <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: customColor }}>
                          {selectedProfessional?.name.charAt(0)}
                        </div>
                        <span className="text-[10px] font-bold text-zinc-700">{selectedProfessional?.name.split(" ")[0]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Calendar */}
                  <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-500 transition-all disabled:opacity-30"
                        disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), startOfDay(new Date()))}
                      >
                        <ArrowRight size={14} className="rotate-180" />
                      </button>
                      <span className="font-black text-xs uppercase tracking-widest text-zinc-800">
                        {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-500 transition-all"
                      >
                        <ArrowRight size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 mb-2">
                      {["D","S","T","Q","Q","S","S"].map((d, i) => (
                        <div key={i} className="text-center text-[9px] font-black text-zinc-400 uppercase">{d}</div>
                      ))}
                    </div>

                    {/* Legenda */}
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
                          if (dayOfWeek === 0 || isBlocked) dayStatus = "closed";
                          else {
                            const seed = day.getDate();
                            if (seed % 7 === 0) dayStatus = "full";
                            else if (seed % 5 === 0) dayStatus = "busy";
                          }
                          const isDisabled = isPastDay || !isCurrentMonth || dayStatus === "closed";

                          days.push(
                            <button
                              key={day.toISOString()}
                              disabled={isDisabled}
                              onClick={() => { setSelectedDate(cloneDay); setSelectedSlot(null); fetchAvailability(cloneDay, selectedService.id, selectedProfessional.id); }}
                              className={cn(
                                "h-9 w-full rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative overflow-hidden",
                                isActive ? "text-white shadow-md" :
                                (isPastDay || !isCurrentMonth) ? "text-zinc-300 cursor-not-allowed" :
                                dayStatus === "closed" ? "text-zinc-300 cursor-not-allowed" :
                                "bg-white text-zinc-800 hover:shadow-sm border border-zinc-200/50 active:scale-95"
                              )}
                              style={isActive ? { backgroundColor: customColor } : {}}
                            >
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
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "py-2.5 text-xs font-bold rounded-xl border-2 transition-all active:scale-95",
                            selectedSlot === slot
                              ? "text-white border-transparent shadow-md"
                              : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300"
                          )}
                          style={selectedSlot === slot ? { backgroundColor: customColor, borderColor: customColor } : {}}
                        >
                          {slot}
                        </button>
                      )) : (
                        <div className="col-span-4 py-6 text-center border-2 border-dashed border-zinc-100 rounded-xl bg-zinc-50">
                          <Clock size={20} className="text-zinc-300 mx-auto mb-1" />
                          <p className="text-xs font-bold text-zinc-500">{selectedDate.getDay() === 0 ? "Fechado aos domingos" : "Agenda cheia"}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={!selectedSlot}
                    onClick={() => { setStep("confirm"); if (phone.length >= 10) handleSearchClient(); }}
                    className={cn(
                      "w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]",
                      selectedSlot ? "text-white shadow-lg" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    )}
                    style={selectedSlot ? { backgroundColor: customColor } : {}}
                  >
                    Confirmar Horário {selectedSlot && `— ${selectedSlot}`}
                  </button>
                </motion.div>
              )}

              {/* ── CONFIRM ── */}
              {step === "confirm" && (
                <motion.div key="confirm" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-5">
                  <div>
                    <button onClick={() => setStep("date")} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-700 text-xs font-bold mb-4 transition-colors">
                      <ArrowRight size={14} className="rotate-180" /> Voltar
                    </button>
                    <h3 className="text-xl font-black text-zinc-900">Quase lá!</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Confirme seus dados para finalizar.</p>
                  </div>

                  {/* Resumo */}
                  <div className="p-4 rounded-2xl border-2" style={{ borderColor: customColor + "33", backgroundColor: customColor + "08" }}>
                    <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: customColor }}>Resumo do Agendamento</p>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-zinc-100">
                      <div>
                        <p className="text-sm font-black text-zinc-900">{selectedService?.name}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">com {selectedProfessional?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-zinc-900">R$ {parseFloat(selectedService?.price || 0).toFixed(2).replace(".", ",")}</p>
                        <p className="text-[10px] text-zinc-400">{selectedService?.duration} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: customColor + "20" }}>
                        <CalendarIcon size={16} style={{ color: customColor }} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900">{format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                        <p className="text-[11px] font-bold" style={{ color: customColor }}>às {selectedSlot}</p>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Telefone (WhatsApp)</label>
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        className="w-full text-sm font-bold p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-zinc-400 transition-all h-12"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={handleSearchClient}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                        Como devemos te chamar?
                        {isExistingClient && <span className="ml-2 text-emerald-500">✓ Bem-vindo de volta!</span>}
                      </label>
                      <input
                        type="text"
                        placeholder="Seu nome completo"
                        className="w-full text-sm font-bold p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:border-zinc-400 transition-all h-12"
                        value={clientData.name}
                        onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleBooking}
                    disabled={!clientData.name || !phone || isLoading}
                    className="w-full py-4 rounded-2xl text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: customColor }}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>
                      <CheckCircle2 size={18} /> Confirmar Agendamento
                    </>}
                  </button>
                </motion.div>
              )}

              {/* ── SUCCESS ── */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8 space-y-6 flex flex-col items-center"
                >
                  {/* Logo */}
                  <div className="w-24 h-24 rounded-3xl bg-white shadow-2xl overflow-hidden border border-zinc-100 flex items-center justify-center">
                    {customLogo ? (
                      <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: customColor }}>
                        <Scissors size={36} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Check */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-xl opacity-30" style={{ backgroundColor: customColor }} />
                    <div className="w-20 h-20 rounded-full flex items-center justify-center relative z-10 border-2"
                      style={{ backgroundColor: customColor + "15", borderColor: customColor + "30" }}>
                      <CheckCircle2 size={40} style={{ color: customColor }} className="stroke-[2]" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-3xl font-black text-zinc-900 tracking-tight">Confirmado!</h3>
                    <p className="text-sm text-zinc-500 mt-2 max-w-xs mx-auto leading-relaxed">
                      Sua cadeira está reservada, <strong className="text-zinc-800">{clientData.name.split(" ")[0]}</strong>. Te esperamos no dia!
                    </p>
                  </div>

                  {/* Detalhes */}
                  <div className="w-full p-4 rounded-2xl border" style={{ borderColor: customColor + "30", backgroundColor: customColor + "08" }}>
                    <div className="flex items-center gap-3 justify-center">
                      <CalendarIcon size={16} style={{ color: customColor }} />
                      <div className="text-left">
                        <p className="text-xs font-black text-zinc-900">{format(selectedDate, "dd/MM/yyyy")}</p>
                        <p className="text-[11px] font-bold" style={{ color: customColor }}>{selectedService?.name} às {selectedSlot}</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-3">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Olá! Agendei um horário para *${selectedService?.name}* em *${format(selectedDate, "dd/MM/yyyy")}* às *${selectedSlot}*. Meu nome é ${clientData.name} e telefone ${phone}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full"
                    >
                      <button className="w-full py-4 text-sm font-bold bg-[#25D366] hover:bg-[#1DA851] text-white rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]">
                        <Phone size={16} /> Avisar no WhatsApp
                      </button>
                    </a>

                    {showInstallBanner && (
                      <button
                        onClick={handleInstall}
                        className="w-full py-3 text-sm font-bold rounded-2xl border-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{ borderColor: customColor + "40", color: customColor }}
                      >
                        <Download size={16} /> Instalar o app do {studioName}
                      </button>
                    )}

                    <button
                      onClick={() => setStep("home")}
                      className="w-full py-3 text-xs font-bold text-zinc-400 hover:text-zinc-700 rounded-2xl hover:bg-zinc-50 transition-all"
                    >
                      Voltar ao Início
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="py-5 flex flex-col items-center border-t border-zinc-100 bg-white">
          <div className="flex items-center gap-2 mb-1">
            {customLogo && (
              <div className="w-5 h-5 rounded-md overflow-hidden border border-zinc-100">
                <img src={customLogo} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{studioName}</p>
          </div>
          <a href="/login" className="text-[9px] text-zinc-300 hover:text-zinc-500 font-medium transition-colors">Área Administrativa</a>
        </div>
      </div>
    </div>
  );
}
