import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Building2, User, Lock, Mail, Phone, Globe, CheckCircle, 
  ArrowRight, ArrowLeft, Crown, Shield, MessageCircle, 
  CreditCard, Star, Zap, Clock, TrendingUp, Users, 
  Smartphone, Bell, Calendar, Wallet, AlertCircle
} from "lucide-react";
import { Button, Input, ContentCard, Badge, useToast } from "@/src/components/ui";
import { apiFetch } from "@/src/lib/api";

import logoImg from "../images/system/logo-favicon.png";

export default function RegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const plansRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0); // Step 0 is the Landing Page content
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const salesPersonId = searchParams.get("ref");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    adminPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    apiFetch("/api/auth/plans")
      .then(r => r.json())
      .then(data => {
        setPlans(data);
        if (data.length > 0) setSelectedPlan(data[0].id);
      });
  }, []);

  const scrollToPlans = () => {
    if (plansRef.current) {
      plansRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleStartSelection = (planId?: string) => {
    if (planId) {
      setSelectedPlan(planId);
      setStep(2); // Vai direto para os dados do estúdio
    } else {
      setStep(1); // Vai para escolha de plano se clicou no botão genérico
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    if (step === 1 && !selectedPlan) {
      toast.warning("Você precisa escolher um plano para continuar.");
      return;
    }
    if (step === 2) {
      if (!form.name || !form.slug) {
        toast.warning("Por favor, preencha o nome e o endereço do seu estúdio.");
        return;
      }
    }
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (step === 1) setStep(0);
    else if (step === 2 && !selectedPlan) setStep(1); // Se não tinha plano antes, volta pro 1
    else if (step === 2 && selectedPlan) setStep(0); // Se escolheu na landing, volta pra landing
    else setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    // ... (mesmo código de antes)
    if (!form.ownerName || !form.ownerEmail || !form.adminPassword) {
      toast.warning("Por favor, preencha todos os dados do proprietário.");
      return;
    }
    if (form.adminPassword !== form.confirmPassword) {
      toast.warning("A confirmação de senha deve ser igual à senha escolhida.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register-tenant", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          planId: selectedPlan,
          salesPersonId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao realizar cadastro.");

      setStep(4);
      toast.success("Seu estúdio foi criado com sucesso. Redirecionando...");
      
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- COMPONENTES DA LANDING PAGE (STEP 0) ---

  if (step === 0) {
    return (
      <div className="min-h-screen bg-white font-sans overflow-x-hidden">
        {/* Navbar Flutuante */}
        <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-zinc-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src={logoImg} alt="Agendelle" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
              <span className="text-xl md:text-2xl font-black text-zinc-900 tracking-tighter">Agendelle</span>
            </div>
            <div className="flex items-center gap-4 md:gap-8">
              <a href="#beneficios" className="hidden sm:block text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Benefícios</a>
              <Button onClick={scrollToPlans} size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-4 md:px-6 text-xs md:text-sm">
                Ver Planos
              </Button>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <header className="pt-32 md:pt-48 pb-16 md:pb-24 px-6 relative overflow-hidden">
          <div className="absolute top-20 right-[-10%] w-[60%] md:w-[40%] h-[40%] bg-amber-400/10 rounded-full blur-[80px] md:blur-[120px] -z-10" />
          <div className="absolute bottom-20 left-[-10%] w-[50%] md:w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-[70px] md:blur-[100px] -z-10" />
          
          <div className="max-w-5xl mx-auto text-center space-y-6 md:space-y-8">
            <Badge color="primary" className="py-1.5 px-3 md:py-2 md:px-4 text-[9px] md:text-xs font-black uppercase tracking-widest animate-bounce">
              🔥 A Solução Definitiva para o seu Negócio
            </Badge>
            <h1 className="text-4xl md:text-7xl font-black text-zinc-900 tracking-tighter leading-[1.1] md:leading-[0.95]">
              Sua agenda não é <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600 italic">
                apenas um horário.
              </span>
            </h1>
            <p className="text-base md:text-2xl text-zinc-500 max-w-3xl mx-auto leading-relaxed font-medium px-2">
              Pare de perder dinheiro com esquecimentos e desorganização. 
              Recupere seu tempo e fature mais com agendamentos 100% automatizados.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 md:pt-6">
              <Button onClick={() => handleStartSelection()} size="lg" className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-10 text-lg md:text-xl bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-2xl shadow-amber-500/30 group">
                Começar Teste Grátis <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex flex-col items-center sm:items-start px-4">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-zinc-200 border-2 border-white" />
                  ))}
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center text-[9px] md:text-[10px] font-bold text-amber-600">+99</div>
                </div>
                <p className="text-[9px] md:text-[11px] font-bold text-zinc-400 mt-2 uppercase tracking-wider">Junte-se a centenas de profissionais</p>
              </div>
            </div>
          </div>
        </header>

        {/* SECTION: A DOR / O PREJUÍZO */}
        <section id="dor" className="py-16 md:py-24 bg-zinc-950 text-white px-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
            <div className="space-y-6">
              <div className="w-12 md:w-16 h-1 bg-amber-500" />
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Quanto custa um <br />
                <span className="text-zinc-500">cliente que não aparece?</span>
              </h2>
              <p className="text-base md:text-lg text-zinc-400 leading-relaxed">
                Cada "furo" na sua agenda e cada mensagem que você esquece de responder é <span className="text-red-400 font-bold underline decoration-red-400/30">dinheiro saindo pelo ralo.</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 pt-4 md:pt-6">
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-3 hover:bg-white/10 transition-colors group">
                  <AlertCircle className="text-red-400 group-hover:scale-110 transition-transform" size={28} md:size={32} />
                  <p className="text-sm font-bold">Agenda Vazia</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">Sem um link de agendamento 24h, você perde clientes enquanto dorme.</p>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-3 hover:bg-white/10 transition-colors group">
                  <Clock className="text-amber-400 group-hover:scale-110 transition-transform" size={28} md:size={32} />
                  <p className="text-sm font-bold">Tempo Perdido</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">Pare de gastar horas no WhatsApp. Deixe o robô trabalhar por você.</p>
                </div>
              </div>
            </div>
            <div className="relative mt-8 lg:mt-0">
              <div className="aspect-square md:aspect-auto md:min-h-[400px] bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 flex flex-col justify-center relative overflow-hidden group shadow-2xl">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl" />
                 <TrendingUp className="text-amber-500 mb-6" size={48} md:size={64} />
                 <h3 className="text-2xl md:text-3xl font-black mb-4 leading-tight">Recupere o controle <br />do seu negócio.</h3>
                 <p className="text-zinc-400 mb-8 text-sm md:text-base leading-relaxed">O Agendelle não é apenas uma agenda, é o seu gerente comercial que nunca dorme e nunca esquece de cobrar.</p>
                 <Button onClick={() => handleStartSelection()} className="w-full bg-white text-zinc-900 hover:bg-zinc-100 rounded-2xl h-14 font-black shadow-lg">QUERO PROFISSIONALIZAR MEU ESTÚDIO</Button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: BENEFÍCIOS */}
        <section id="beneficios" className="py-16 md:py-24 px-6 bg-zinc-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-12 md:mb-20">
              <h2 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tight">Tudo em um só lugar.</h2>
              <p className="text-zinc-500 text-base md:text-xl">O sistema mais completo, rápido e bonito do mercado.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[
                { icon: <Calendar className="text-indigo-500" />, title: "Agendamento 24h", desc: "Seu cliente agenda o horário sozinho, sem você precisar falar nada." },
                { icon: <Bell className="text-amber-500" />, title: "Lembretes Automáticos", desc: "Reduza faltas em até 80% com notificações no WhatsApp para seus clientes." },
                { icon: <Smartphone className="text-emerald-500" />, title: "Site Personalizado", desc: "Ganhe um site exclusivo do seu estúdio para passar credibilidade total." },
                { icon: <Users className="text-blue-500" />, title: "Gestão de Equipe", desc: "Controle as agendas e comissões de todos os seus profissionais em tempo real." },
                { icon: <Wallet className="text-purple-500" />, title: "Financeiro Inteligente", desc: "Saiba exatamente quanto você lucrou no dia, na semana e no mês." },
                { icon: <Shield className="text-rose-500" />, title: "Segurança de Dados", desc: "Seus dados e de seus clientes protegidos com criptografia bancária." },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-zinc-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-5 md:mb-6 shadow-inner">
                    {React.cloneElement(item.icon as any, { size: 24 })}
                  </div>
                  <h4 className="text-lg md:text-xl font-black text-zinc-900 mb-2 md:mb-3">{item.title}</h4>
                  <p className="text-zinc-500 text-xs md:text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: PLANOS (TRIGGER) */}
        <section ref={plansRef} className="py-16 md:py-24 px-4 md:px-6 bg-white relative">
          <div className="max-w-6xl mx-auto text-center">
             <div className="mb-12 md:mb-16">
                <Badge color="primary" className="mb-4">PREÇOS TRANSPARENTES</Badge>
                <h2 className="text-3xl md:text-6xl font-black text-zinc-900 tracking-tight leading-tight">Invista no crescimento <br className="hidden md:block" /> do seu estúdio.</h2>
                <p className="mt-4 text-zinc-500 text-base md:text-lg">Teste grátis por 30 dias. Cancele quando quiser.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
                {plans.map((p) => (
                  <div key={p.id} className={`relative p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 text-left flex flex-col h-full transition-all duration-500 ${p.name === "Pro" ? 'border-amber-500 shadow-2xl md:scale-105 z-10 bg-white' : 'border-zinc-100 bg-zinc-50/50'}`}>
                    {p.name === "Pro" && (
                      <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-1.5 rounded-full shadow-lg">RECOMENDADO</div>
                    )}
                    <div className="mb-6 md:mb-8">
                      <h3 className="text-xl md:text-2xl font-black text-zinc-900">{p.name}</h3>
                      <p className="text-zinc-500 text-[10px] md:text-xs mt-1 font-medium italic">Ideal para {p.name === "Start" ? 'quem está começando' : 'quem quer escalar'}.</p>
                    </div>
                    <div className="mb-6 md:mb-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl md:text-4xl font-black text-zinc-900">R$ {Number(p.price).toFixed(2)}</span>
                        <span className="text-zinc-400 text-xs md:text-sm font-medium">/mês</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[9px] md:text-[10px] font-black mt-3 px-2 py-1 rounded-md uppercase tracking-wide">
                        <Zap size={10} /> 30 dias grátis
                      </div>
                    </div>
                    <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10 flex-1">
                       {JSON.parse(p.features || "[]").map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-zinc-700 font-medium leading-snug">
                          <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handleStartSelection(p.id)} 
                      className={`w-full h-14 rounded-2xl font-black shadow-xl transition-all ${p.name === "Pro" ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' : 'bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-50 shadow-zinc-200/20'}`}
                    >
                      Escolher {p.name}
                    </Button>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-12 bg-zinc-50 border-t border-zinc-100 text-center px-6">
           <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-8 text-zinc-400">
                 <div className="flex items-center gap-2">
                    <Shield size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Ambiente Seguro</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Lock size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Dados Criptografados</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Suporte 24/7</span>
                 </div>
              </div>
              <p className="text-xs text-zinc-500 mb-1 font-bold">© 2026 Agendelle. Todos os direitos reservados.</p>
              <p className="text-[10px] text-zinc-400">Desenvolvido com ❤️ para profissionais de beleza.</p>
           </div>
        </footer>
      </div>
    );
  }

  // --- COMPONENTES DO FLUXO DE CADASTRO (STEP 1, 2, 3, 4) ---

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-8 md:py-12 px-4 font-sans">
      {/* Header do Flow */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8 md:mb-12">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(0)}>
          <img src={logoImg} alt="Agendelle" className="h-8 w-8 object-contain" />
          <span className="font-black text-zinc-900 text-lg md:text-xl tracking-tighter">Agendelle</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 1 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-zinc-200 text-zinc-500'}`}>1</div>
            <span className={`text-xs font-bold ${step >= 1 ? 'text-zinc-900' : 'text-zinc-400'}`}>Plano</span>
          </div>
          <div className="w-8 h-px bg-zinc-200" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 2 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-zinc-200 text-zinc-500'}`}>2</div>
            <span className={`text-xs font-bold ${step >= 2 ? 'text-zinc-900' : 'text-zinc-400'}`}>Estúdio</span>
          </div>
          <div className="w-8 h-px bg-zinc-200" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= 3 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-zinc-200 text-zinc-500'}`}>3</div>
            <span className={`text-xs font-bold ${step >= 3 ? 'text-zinc-900' : 'text-zinc-400'}`}>Acesso</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} iconLeft={<ArrowLeft size={14} />} className="text-zinc-500 font-bold">
          <span className="">Voltar</span>
        </Button>
      </div>

      <div className="w-full max-w-4xl">
        {step === 1 && (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
              <h1 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight leading-tight">Escolha seu plano</h1>
              <p className="text-zinc-500 text-sm md:text-lg">Selecione a melhor opção para você.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 cursor-pointer transition-all duration-300 ${
                    selectedPlan === p.id 
                      ? "border-amber-500 bg-white shadow-2xl shadow-amber-500/10 ring-4 ring-amber-500/5" 
                      : "border-transparent bg-white shadow-sm hover:border-zinc-200"
                  }`}
                >
                  {p.name === "Pro" && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                      Destaque
                    </div>
                  )}
                  <div className="space-y-3 md:space-y-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${selectedPlan === p.id ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                      <Zap size={20} md:size={24} />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-black text-zinc-900">{p.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl md:text-2xl font-black text-zinc-900">R$ {Number(p.price).toFixed(2)}</span>
                        <span className="text-zinc-400 text-[10px] md:text-xs font-medium">/mês</span>
                      </div>
                    </div>
                    <ul className="space-y-2 pt-2 md:pt-4">
                      {JSON.parse(p.features || "[]").slice(0, 5).map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] md:text-xs text-zinc-600 font-medium leading-snug">
                          <CheckCircle size={12} md:size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-6 md:pt-8">
              <Button size="lg" onClick={handleNext} iconRight={<ArrowRight size={18} />} className="w-full sm:w-auto px-10 md:px-12 h-14 rounded-2xl text-base md:text-lg shadow-xl shadow-amber-500/20">
                Continuar para dados do estúdio
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
              <Badge color="primary" className="mb-2">Passo 2 de 3</Badge>
              <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">Sobre o seu estúdio</h1>
              <p className="text-zinc-500 text-sm md:text-base">Configurações básicas da sua empresa.</p>
            </div>

            <ContentCard padding="lg" className="shadow-2xl shadow-zinc-200/50 border-none rounded-[1.5rem] md:rounded-[2rem]">
              <div className="space-y-6">
                  <Input
                    label="Nome do Estúdio / Barbearia"
                    placeholder="Ex: Studio Elegance"
                    iconLeft={<Building2 size={16} />}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />

                <div className="space-y-2">
                  <label className="text-[10px] md:text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">Endereço da sua Agenda (Link)</label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
                    <div className="bg-zinc-100 border border-zinc-200 sm:border-r-0 rounded-xl sm:rounded-r-none px-4 flex items-center text-zinc-500 text-xs md:text-sm font-medium h-12">
                      agendelle.com.br/
                    </div>
                    <input
                      className="flex-1 bg-white border border-zinc-200 rounded-xl sm:rounded-l-none px-4 h-12 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      placeholder="seu-estudio"
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    />
                  </div>
                  <p className="text-[9px] md:text-[10px] text-zinc-400 ml-1 italic leading-tight">Este será o link para os seus clientes agendarem.</p>
                </div>

                <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3">
                  <Button variant="ghost" onClick={handleBack} className="font-bold h-12">Voltar</Button>
                  <Button onClick={handleNext} fullWidth className="h-12 font-black" iconRight={<ArrowRight size={16} />}>Continuar</Button>
                </div>
              </div>
            </ContentCard>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
              <Badge color="primary" className="mb-2">Passo 3 de 3</Badge>
              <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight leading-tight">Dados do Proprietário</h1>
              <p className="text-zinc-500 text-sm md:text-base">Credenciais de acesso ao seu painel.</p>
            </div>

            <ContentCard padding="lg" className="shadow-2xl shadow-zinc-200/50 border-none rounded-[1.5rem] md:rounded-[2rem]">
              <div className="space-y-5 md:space-y-6">
                <Input
                  label="Seu Nome Completo"
                  placeholder="Nome e Sobrenome"
                  iconLeft={<User size={16} />}
                  value={form.ownerName}
                  onChange={e => setForm({ ...form, ownerName: e.target.value })}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="E-mail de Acesso"
                    type="email"
                    placeholder="seu@email.com"
                    iconLeft={<Mail size={16} />}
                    value={form.ownerEmail}
                    onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                    required
                  />
                  <Input
                    label="WhatsApp"
                    placeholder="(00) 00000-0000"
                    iconLeft={<Phone size={16} />}
                    value={form.ownerPhone}
                    onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Senha de Acesso"
                    type="password"
                    placeholder="••••••••"
                    iconLeft={<Lock size={16} />}
                    value={form.adminPassword}
                    onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                    required
                  />
                  <Input
                    label="Confirme a Senha"
                    type="password"
                    placeholder="••••••••"
                    iconLeft={<Shield size={16} />}
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3">
                  <Button variant="ghost" onClick={handleBack} disabled={loading} className="font-bold h-12">Voltar</Button>
                  <Button onClick={handleSubmit} loading={loading} fullWidth className="h-12 font-black bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20">Finalizar e Criar Estúdio</Button>
                </div>

                <p className="text-center text-[9px] md:text-[10px] text-zinc-400 leading-relaxed">
                  Ao clicar em Finalizar, você concorda com nossos <a href="#" className="underline font-bold">Termos de Uso</a> e <a href="#" className="underline font-bold">Política de Privacidade</a>.
                </p>
              </div>
            </ContentCard>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-lg mx-auto text-center space-y-8 py-12 animate-in zoom-in duration-700">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
              <CheckCircle size={64} />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Tudo pronto!</h1>
              <p className="text-zinc-500 text-lg leading-relaxed">
                Bem-vindo à Agendelle. Seu estúdio <span className="font-bold text-zinc-800">"{form.name}"</span> foi criado com sucesso.
              </p>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 text-left">
                <Star className="text-amber-500 shrink-0" size={20} />
                <p className="text-xs text-amber-800 font-medium">
                  Você tem <span className="font-bold">30 dias de acesso gratuito</span> para configurar seu estúdio e começar a receber agendamentos.
                </p>
              </div>
            </div>
            <div className="pt-8">
              <div className="flex items-center justify-center gap-2 text-zinc-400">
                <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-400 rounded-full animate-spin" />
                <span className="text-sm font-medium">Redirecionando para o login...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-12 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-zinc-400">
            <Shield size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Ambiente Seguro</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Lock size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Dados Criptografados</span>
          </div>
        </div>
        <p className="text-[10px] text-zinc-400">© 2026 Agendelle — Plataforma de Gestão para Estúdios de Beleza.</p>
      </div>
    </div>
  );
}

