import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, User, Phone, Instagram, ArrowRight, CheckCircle2, Search, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

export default function ClientBooking() {
  const [step, setStep] = useState<"loading" | "home" | "consult" | "service" | "professional" | "date" | "confirm" | "success">("loading");
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4"
        >
          <span className="text-zinc-950 font-bold text-2xl">G&C</span>
        </motion.div>
        <h1 className="text-lg font-bold tracking-tighter">GLOW & CUT</h1>
        <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">Carregando experiência...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-950 p-6 text-white text-center relative">
          <button 
            onClick={() => window.location.href = '/login'}
            className="absolute top-2 right-2 text-[8px] uppercase font-bold text-zinc-500 hover:text-white transition-colors border border-zinc-800 px-2 py-1 rounded"
          >
            Login Admin
          </button>
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-zinc-950 font-bold text-lg">G&C</span>
          </div>
          <h2 className="text-sm font-bold uppercase tracking-tight">Glow & Cut Studio</h2>
          <p className="text-[10px] text-zinc-400">Beleza e Estilo em cada detalhe</p>
        </div>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {step === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <Button className="w-full justify-between" onClick={() => setStep("service")}>
                  Agendar Novo Horário <ArrowRight size={14} />
                </Button>
                <Button variant="outline" className="w-full justify-between" onClick={() => setStep("consult")}>
                  Consultar Meus Agendamentos <Search size={14} />
                </Button>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="block">
                  <Button variant="secondary" className="w-full justify-between">
                    Nosso Instagram <Instagram size={14} />
                  </Button>
                </a>
              </motion.div>
            )}

            {step === "consult" && (
              <motion.div key="consult" className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Seu Telefone</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      className="flex-1 text-xs p-2 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <Button size="sm" onClick={handleConsultAppointments} disabled={isLoading}>
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Buscar"}
                    </Button>
                  </div>
                </div>

                {myAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {myAppointments.map((app) => (
                      <div key={app.id} className="p-3 border border-zinc-100 rounded-lg bg-zinc-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-zinc-900">{app.service.name}</p>
                            <p className="text-[10px] text-zinc-500">
                              {format(new Date(app.date), "dd 'de' MMMM", { locale: ptBR })} às {app.startTime}
                            </p>
                          </div>
                          <span className={cn(
                            "text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold",
                            app.status === 'scheduled' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                          )}>
                            {app.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : phone.length >= 10 && !isLoading && (
                  <p className="text-[10px] text-center text-zinc-400">Nenhum agendamento encontrado.</p>
                )}
                <Button variant="ghost" size="xs" onClick={() => setStep("home")}>Voltar</Button>
              </motion.div>
            )}

            {step === "service" && (
              <motion.div key="service" className="space-y-4">
                <h3 className="text-xs font-bold uppercase text-zinc-400">Selecione o Serviço</h3>
                <div className="grid gap-2">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedService(s);
                        setStep("professional");
                      }}
                      className="flex items-center justify-between p-3 border border-zinc-100 rounded-lg hover:border-zinc-300 transition-all text-left"
                    >
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{s.name}</p>
                        <p className="text-[10px] text-zinc-500">{s.duration} min • R$ {s.price}</p>
                      </div>
                      <ArrowRight size={14} className="text-zinc-300" />
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="xs" onClick={() => setStep("home")}>Cancelar</Button>
              </motion.div>
            )}

            {step === "professional" && (
              <motion.div key="professional" className="space-y-4">
                <h3 className="text-xs font-bold uppercase text-zinc-400">Escolha o Profissional</h3>
                <div className="grid gap-2">
                  {professionals.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProfessional(p);
                        setStep("date");
                        fetchAvailability(selectedDate, selectedService.id, p.id);
                      }}
                      className="flex items-center justify-between p-3 border border-zinc-100 rounded-lg hover:border-zinc-300 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-[10px] font-bold">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-900">{p.name}</p>
                          <p className="text-[10px] text-zinc-500">{p.role}</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-zinc-300" />
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="xs" onClick={() => setStep("service")}>Voltar</Button>
              </motion.div>
            )}

            {step === "date" && (
              <motion.div key="date" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-zinc-400">Escolha o Horário</h3>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] bg-zinc-100 px-2 py-0.5 rounded-full font-medium">{selectedService?.name}</span>
                    <span className="text-[8px] text-zinc-400 mt-1">com {selectedProfessional?.name}</span>
                  </div>
                </div>
                
                {/* Simple Horizontal Date Picker */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                    const d = addDays(new Date(), i);
                    const active = isSameDay(d, selectedDate);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedDate(d);
                          fetchAvailability(d, selectedService.id, selectedProfessional.id);
                        }}
                        className={cn(
                          "flex-shrink-0 w-12 py-2 rounded-lg border flex flex-col items-center transition-all",
                          active ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-100 text-zinc-500 hover:border-zinc-300"
                        )}
                      >
                        <span className="text-[8px] uppercase font-bold">{format(d, "EEE", { locale: ptBR })}</span>
                        <span className="text-xs font-bold">{format(d, "dd")}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          "py-2 text-[10px] font-bold rounded-md border transition-all",
                          selectedSlot === slot ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-100 text-zinc-600 hover:border-zinc-300"
                        )}
                      >
                        {slot}
                      </button>
                    ))
                  ) : (
                    <div className="col-span-4 py-8 text-center">
                      <p className="text-[10px] text-zinc-400">Nenhum horário disponível para este dia.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("professional")}>Voltar</Button>
                  <Button 
                    className="flex-1" 
                    disabled={!selectedSlot} 
                    onClick={() => {
                      setStep("confirm");
                      if (phone.length >= 10) handleSearchClient();
                    }}
                  >
                    Continuar
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div key="confirm" className="space-y-4">
                <h3 className="text-xs font-bold uppercase text-zinc-400">Seus Dados</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Telefone</label>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      className="w-full text-xs p-2 border border-zinc-200 rounded-md"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={handleSearchClient}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Nome Completo</label>
                    <input
                      type="text"
                      placeholder="Como podemos te chamar?"
                      className="w-full text-xs p-2 border border-zinc-200 rounded-md"
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Idade (Opcional)</label>
                    <input
                      type="number"
                      placeholder="Sua idade"
                      className="w-full text-xs p-2 border border-zinc-200 rounded-md"
                      value={clientData.age}
                      onChange={(e) => setClientData({ ...clientData, age: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100 space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Resumo</p>
                  <p className="text-xs font-bold text-zinc-900">{selectedService?.name}</p>
                  <p className="text-[10px] text-zinc-600 font-medium">Profissional: {selectedProfessional?.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedSlot}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("date")}>Voltar</Button>
                  <Button className="flex-1" onClick={handleBooking} disabled={!clientData.name || !phone || isLoading}>
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : "Confirmar Agendamento"}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">Agendamento Confirmado!</h3>
                  <p className="text-[10px] text-zinc-500 mt-1">Tudo certo, {clientData.name.split(' ')[0]}. Te esperamos lá!</p>
                </div>
                <Button className="w-full" onClick={() => setStep("home")}>Voltar ao Início</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-6 flex flex-col items-center gap-2">
        <p className="text-[10px] text-zinc-400">© 2026 Glow & Cut Studio</p>
        <Button variant="ghost" size="xs" className="text-zinc-300 hover:text-zinc-500" onClick={() => window.location.href = '/login'}>
          Área Administrativa
        </Button>
      </div>
    </div>
  );
}
