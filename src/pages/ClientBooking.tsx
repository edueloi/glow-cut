import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, User, Phone, Instagram, ArrowRight, CheckCircle2, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, isSameDay, startOfDay, startOfMonth, endOfMonth, endOfWeek, startOfWeek, isSameMonth, isBefore, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams } from "react-router-dom";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

export default function ClientBooking() {
  const { slug } = useParams();
  // Decode and format the slug to use as the studio name (example: "glowandcut" -> "Glowandcut Studio", "glow-cut" -> "Glow Cut Studio")
  const defaultTitle = slug ? slug.replace(/-/g, ' ') : "Glow & Cut";
  const studioName = defaultTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + " Studio";

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

  useEffect(() => {
    setTimeout(() => setStep("home"), 2000);
    fetch("/api/services").then(res => res.json()).then(setServices);
    fetch("/api/professionals").then(res => res.json()).then(setProfessionals);
  }, []);

  const handleSearchClient = async () => {
    if (phone.length < 10) return;
    setIsLoading(true);
    const res = await fetch(`/api/clients/search?phone=${phone}`);
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
    const res = await fetch(`/api/appointments/client?phone=${phone}`);
    const data = await res.json();
    setMyAppointments(data);
    setIsLoading(false);
  };

  const fetchAvailability = async (date: Date, serviceId: string, professionalId: string) => {
    setIsLoading(true);
    const res = await fetch(`/api/availability?date=${date.toISOString()}&serviceId=${serviceId}&professionalId=${professionalId}`);
    const data = await res.json();
    setAvailableSlots(data);
    setIsLoading(false);
  };

  const handleBooking = async () => {
    setIsLoading(true);
    // 1. Save/Update Client
    const clientRes = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...clientData, phone })
    });
    const client = await clientRes.json();

    // 2. Create Appointment
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  if (step === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950 z-[100]">
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl"
          >
            <span className="text-zinc-950 font-black text-3xl">{studioName.charAt(0)}</span>
          </motion.div>
          <h1 className="text-xl font-black tracking-tighter uppercase text-white">{studioName}</h1>
          <p className="text-xs text-zinc-500 mt-2 uppercase tracking-widest font-bold">Preparando agendamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Left Panel - Hidden on Mobile, Premium Hero on Desktop */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-zinc-950 relative overflow-hidden items-end p-12 lg:p-20">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80')" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-zinc-950 to-transparent" />
        
        <div className="relative z-10 w-full max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-black/50">
              <span className="text-zinc-950 font-black text-4xl">{studioName.charAt(0)}</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none mb-6">
              {studioName}
            </h1>
            <p className="text-lg lg:text-xl text-zinc-400 font-medium max-w-md leading-relaxed">
              Simplifique sua vida. Agende seu horário de forma rápida, sem necessidade de baixar apps ou fazer cadastros demorados.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Booking Flow */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col bg-white min-h-screen relative shadow-2xl z-10 md:overflow-y-auto scrollbar-hide">
        {/* Mobile Header - Visible only on mobile */}
        <div className="md:hidden bg-zinc-950 p-6 pt-10 text-white relative">
          <div className="absolute top-0 inset-x-0 h-40 bg-cover bg-center opacity-30 mix-blend-overlay" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80')" }} />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl">
              <span className="text-zinc-950 font-black text-2xl">{studioName.charAt(0)}</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">{studioName}</h2>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mt-1">Bem-vindo ao nosso agendamento</p>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 md:p-8 lg:p-12 w-full max-w-md mx-auto items-center flex flex-col justify-center min-h-[60vh] md:min-h-full">
          <div className="w-full">
            <AnimatePresence mode="wait">
              {step === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-8 hidden md:block">
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Comece por aqui</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-2">O que você gostaria de fazer hoje?</p>
                  </div>
                  
                  <Button className="w-full justify-between py-6 rounded-2xl text-base shadow-xl shadow-zinc-200/50 hover:-translate-y-1 transition-all bg-zinc-950 group" onClick={() => setStep("service")}>
                    Agendar Novo Horário 
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-between py-6 rounded-2xl text-base font-bold text-zinc-700 bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 transition-all group" onClick={() => setStep("consult")}>
                    Ver Meus Agendamentos 
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center group-hover:bg-zinc-300 transition-colors">
                      <Search size={16} />
                    </div>
                  </Button>
                  
                  <div className="pt-4">
                    <a href="https://instagram.com" target="_blank" rel="noreferrer" className="block">
                      <Button variant="ghost" className="w-full justify-center py-4 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100">
                        <Instagram size={16} className="mr-2" /> Visite nosso Instagram
                      </Button>
                    </a>
                  </div>
                </motion.div>
              )}

              {step === "consult" && (
                <motion.div key="consult" className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Seus Agendamentos</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Digite seu número para buscar</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Telefone (WhatsApp)</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        className="flex-1 text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-500 font-bold transition-all"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <Button onClick={handleConsultAppointments} disabled={isLoading} className="rounded-xl px-6 bg-zinc-900 shadow-md">
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      </Button>
                    </div>
                  </div>

                {myAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {myAppointments.map((app) => (
                      <div key={app.id} className="p-4 border border-zinc-200 rounded-2xl bg-white shadow-sm flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-zinc-900" />
                        <div className="flex justify-between items-start pl-2">
                          <div>
                            <p className="text-sm font-black text-zinc-900">{app.service.name}</p>
                            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                              {format(new Date(app.date), "dd 'de' MMMM", { locale: ptBR })} às {app.startTime}
                            </p>
                          </div>
                          <span className={cn(
                            "text-[9px] px-2 py-1 rounded-full uppercase font-black tracking-widest",
                            app.status === 'scheduled' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {app.status === 'scheduled' ? 'Agendado' : 'Concluído'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : phone.length >= 10 && !isLoading && (
                  <div className="p-6 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
                    <p className="text-xs font-bold text-zinc-500">Nenhum agendamento encontrado.</p>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button variant="ghost" className="w-full rounded-xl text-xs font-bold text-zinc-500" onClick={() => setStep("home")}>Voltar ao Início</Button>
                </div>
              </motion.div>
            )}

            {step === "service" && (
              <motion.div key="service" className="space-y-5">
                <div>
                  <h3 className="text-xl font-black text-zinc-900">Serviços</h3>
                  <p className="text-xs text-zinc-500 font-medium mt-1">O que você deseja fazer hoje?</p>
                </div>
                
                <div className="grid gap-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedService(s);
                        setStep("professional");
                      }}
                      className="group flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:shadow-md transition-all text-left"
                    >
                      <div>
                        <p className="text-sm font-black text-zinc-900">{s.name}</p>
                        <p className="text-[11px] text-zinc-500 font-medium mt-1 flex gap-2">
                          <span className="flex items-center gap-1"><Clock size={12}/>{s.duration} min</span>
                          <span>•</span>
                          <span className="font-bold text-emerald-600">R$ {parseFloat(s.price).toFixed(2).replace('.', ',')}</span>
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <ArrowRight size={14} />
                      </div>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" className="w-full rounded-xl text-xs font-bold text-zinc-500" onClick={() => setStep("home")}>Voltar</Button>
              </motion.div>
            )}

            {step === "professional" && (
              <motion.div key="professional" className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Profissional</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Quem irá te atender?</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-zinc-400">Serviço:</span>
                    <p className="text-xs font-black text-zinc-800">{selectedService?.name}</p>
                  </div>
                </div>
                
                <div className="grid gap-3">
                  <button
                    onClick={() => {
                      setSelectedProfessional(professionals[0]); // Sem preferência
                      setStep("date");
                      fetchAvailability(selectedDate, selectedService.id, professionals[0]?.id);
                    }}
                    className="group flex flex-col items-center justify-center p-6 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-zinc-400 hover:bg-zinc-100 transition-all text-center"
                  >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                      <User size={20} className="text-zinc-400" />
                    </div>
                    <p className="text-sm font-black text-zinc-900">Sem Preferência</p>
                    <p className="text-[10px] text-zinc-500 font-medium mt-1">Escolher o primeiro disponível</p>
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] font-bold tracking-widest text-zinc-300 uppercase">Ou escolha um</span></div>
                  </div>

                  {professionals.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProfessional(p);
                        setStep("date");
                        fetchAvailability(selectedDate, selectedService.id, p.id);
                      }}
                      className="group flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-sm shadow-inner font-black text-zinc-600">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900">{p.name}</p>
                          <p className="text-[11px] text-zinc-500 font-medium mt-0.5">{p.role}</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                        <ArrowRight size={14} />
                      </div>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" className="w-full rounded-xl text-xs font-bold text-zinc-500" onClick={() => setStep("service")}>Trocar Serviço</Button>
              </motion.div>
            )}

            {step === "date" && (
              <motion.div key="date" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-zinc-900">Data e Hora</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-1">Quando fica melhor?</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <div className="w-5 h-5 bg-zinc-100 rounded-full flex items-center justify-center text-[8px] font-bold">{selectedProfessional?.name.charAt(0)}</div>
                      <p className="text-[10px] font-bold text-zinc-700">{selectedProfessional?.name.split(' ')[0]}</p>
                    </div>
                  </div>
                </div>
                
                {/* Full Calendar */}
                <div className="bg-white p-4 md:p-5 rounded-3xl border border-zinc-200 shadow-sm">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <button 
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} 
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-500 transition-colors"
                      disabled={isBefore(endOfMonth(subMonths(currentMonth, 1)), startOfDay(new Date()))}
                    >
                      <ArrowRight size={14} className="rotate-180" />
                    </button>
                    <span className="font-black text-sm uppercase tracking-widest text-zinc-800">
                      {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                    </span>
                    <button 
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-500 transition-colors"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 mb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-center text-[10px] font-black text-zinc-400">{d}</div>
                    ))}
                  </div>

                  {(() => {
                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(monthStart);
                    const startDate = startOfWeek(monthStart);
                    const endDate = endOfWeek(monthEnd);
                    const rows = [];
                    let days = [];
                    let day = startDate;
                    const today = startOfDay(new Date());

                    while (day <= endDate) {
                      for (let i = 0; i < 7; i++) {
                        const cloneDay = day;
                        const isPastDay = isBefore(day, today);
                        const isActive = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, monthStart);

                        days.push(
                          <button
                            key={day.toISOString()}
                            disabled={isPastDay || !isCurrentMonth}
                            onClick={() => {
                              setSelectedDate(cloneDay);
                              setSelectedSlot(null);
                              fetchAvailability(cloneDay, selectedService.id, selectedProfessional.id);
                            }}
                            className={cn(
                              "h-10 w-full sm:h-12 md:h-12 mx-auto rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                              isActive ? "bg-zinc-900 text-white shadow-md shadow-black/20" : 
                              (isPastDay || !isCurrentMonth) ? "text-zinc-300 cursor-not-allowed opacity-50" : 
                              "bg-zinc-50 text-zinc-700 hover:bg-zinc-200 border border-zinc-100"
                            )}
                          >
                            {format(day, "d")}
                          </button>
                        );
                        day = addDays(day, 1);
                      }
                      rows.push(
                        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1" key={day.toISOString()}>
                          {days}
                        </div>
                      );
                      days = [];
                    }
                    return rows;
                  })()}
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 flex items-center justify-between">
                    <span>Horários Livres</span>
                    {isLoading && <Loader2 size={12} className="animate-spin text-zinc-400" />}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "py-3 text-xs font-black rounded-xl border-2 transition-all",
                            selectedSlot === slot 
                               ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                               : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"
                          )}
                        >
                          {slot}
                        </button>
                      ))
                    ) : (
                      <div className="col-span-3 py-10 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
                        <Clock size={24} className="mx-auto text-zinc-300 mb-2" />
                        <p className="text-xs font-bold text-zinc-500">Nenhum horário livre.</p>
                        <p className="text-[10px] text-zinc-400 mt-1">Tente escolher outro dia.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1 py-6 rounded-2xl border-zinc-200 font-bold" onClick={() => setStep("professional")}>Voltar</Button>
                  <Button 
                    className={cn(
                      "flex-1 py-6 rounded-2xl font-bold shadow-xl transition-all",
                      selectedSlot ? "bg-zinc-900 text-white shadow-black/20" : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    )}
                    disabled={!selectedSlot} 
                    onClick={() => {
                      setStep("confirm");
                      if (phone.length >= 10) handleSearchClient();
                    }}
                  >
                    Confirmar Hora
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div key="confirm" className="space-y-6">
                 <div>
                  <h3 className="text-xl font-black text-zinc-900">Quase lá!</h3>
                  <p className="text-xs text-zinc-500 font-medium mt-1">Preencha seus dados para finalizar.</p>
                </div>

                <div className="space-y-4 bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Telefone (WhatsApp)</label>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      className="w-full text-sm font-bold p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-500 outline-none transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={handleSearchClient}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Como devemos te chamar?</label>
                    <input
                      type="text"
                      placeholder="Seu nome completo"
                      className="w-full text-sm font-bold p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-500 outline-none transition-all"
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-5 bg-zinc-50 rounded-3xl border border-zinc-200 space-y-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resumo do Agendamento</p>
                  
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                    <div>
                      <p className="text-sm font-black text-zinc-900">{selectedService?.name}</p>
                      <p className="text-[10px] text-zinc-500 font-medium mt-1">com {selectedProfessional?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-zinc-900">R$ {parseFloat(selectedService?.price || 0).toFixed(2).replace('.', ',')}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{selectedService?.duration} min</p>
                    </div>
                  </div>

                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center text-zinc-500">
                        <CalendarIcon size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">
                          {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-[11px] font-medium text-emerald-600">
                          Horário confirmado: <strong>{selectedSlot}</strong>
                        </p>
                      </div>
                   </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 py-6 rounded-2xl border-zinc-200 font-bold" onClick={() => setStep("date")}>Voltar</Button>
                  <Button className="flex-[2] py-6 rounded-2xl bg-zinc-900 font-bold text-sm shadow-xl shadow-black/20" onClick={handleBooking} disabled={!clientData.name || !phone || isLoading}>
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Concluir Agendamento"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-12 space-y-6 flex flex-col items-center justify-center min-h-[50vh]"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full" />
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm border border-emerald-100 relative z-10">
                    <CheckCircle2 size={40} className="stroke-[2.5]" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-3xl font-black text-zinc-900 tracking-tight">Perfeito!</h3>
                  <p className="text-sm text-zinc-500 mt-2 max-w-xs mx-auto leading-relaxed">
                    Sua cadeira já está reservada, <strong className="text-zinc-800">{clientData.name.split(' ')[0]}</strong>. Te esperamos aqui no dia!
                  </p>
                </div>

                <div className="pt-6 w-full">
                  <Button className="w-full py-6 text-sm font-bold bg-zinc-900 shadow-xl shadow-black/10 rounded-2xl" onClick={() => setStep("home")}>Fazer Outro Agendamento</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>

        <div className="mt-auto py-6 flex flex-col items-center border-t border-zinc-100 bg-zinc-50/50">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">© 2026 {studioName}</p>
          <a href="/login" className="text-[10px] text-zinc-300 hover:text-zinc-500 font-medium mt-1">Área Restrita (Admin)</a>
        </div>
      </div>
    </div>
  );
}
