import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Building2, User, Lock, Mail, Phone, Globe, CheckCircle, 
  ArrowRight, ArrowLeft, Crown, Shield, MessageCircle, 
  CreditCard, Star, Zap, Clock, TrendingUp, Users, 
  Smartphone, Bell, Calendar, Wallet, AlertCircle, 
  XCircle, ChevronDown, ChevronUp, BarChart3, Package, Layers
} from "lucide-react";
import { Button, Input, ContentCard, Badge, useToast } from "@/src/components/ui";
import { apiFetch } from "@/src/lib/api";

import logoImg from "../images/system/logo-favicon.png";
import mockupImg from "../images/system/agendelle_mockup_dashboard.png";

export default function RegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const plansRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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
      setStep(2);
    } else {
      setStep(1);
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
    else if (step === 2 && !selectedPlan) setStep(1);
    else if (step === 2 && selectedPlan) setStep(0);
    else setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
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

  const faqs = [
    { q: "Preciso de cartão de crédito para testar?", a: "Não! Você pode criar sua conta e usar todos os recursos por 30 dias sem cadastrar nenhum cartão." },
    { q: "O sistema funciona no celular?", a: "Sim! O Agendelle é totalmente responsivo e funciona perfeitamente em qualquer smartphone, tablet ou computador." },
    { q: "Como meus clientes agendam?", a: "Você terá um link exclusivo (ex: agendelle.com.br/seu-estudio) que pode colocar na bio do Instagram ou enviar pelo WhatsApp." },
    { q: "Posso cancelar a qualquer momento?", a: "Com certeza. Não temos fidelidade. Se não estiver satisfeito, pode cancelar sua assinatura sem multas." },
    { q: "O sistema envia mensagens automáticas?", a: "Sim, o Agendelle envia lembretes automáticos de agendamento para reduzir as faltas dos seus clientes." },
  ];

  if (step === 0) {
    return (
      <div className="min-h-screen bg-white font-sans overflow-x-hidden selection:bg-amber-500 selection:text-white">
        {/* Navbar */}
        <nav className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-zinc-100">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src={logoImg} alt="Agendelle" className="h-8 w-8 md:h-10 md:w-10 object-contain" />
              <span className="text-xl md:text-2xl font-black text-zinc-900 tracking-tighter">Agendelle</span>
            </div>
            <div className="flex items-center gap-3 md:gap-8">
              <a href="#beneficios" className="hidden lg:block text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Funcionalidades</a>
              <Button onClick={scrollToPlans} size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-4 md:px-6 text-[10px] md:text-sm font-black uppercase tracking-widest">
                VER PLANOS
              </Button>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <header className="pt-28 md:pt-40 pb-16 md:pb-32 px-6 relative overflow-hidden bg-gradient-to-b from-zinc-50 to-white">
          <div className="absolute top-20 right-[-10%] w-[60%] md:w-[40%] h-[40%] bg-amber-400/10 rounded-full blur-[80px] md:blur-[120px] -z-10 animate-pulse" />
          <div className="absolute bottom-20 left-[-10%] w-[50%] md:w-[30%] h-[30%] bg-indigo-500/10 rounded-full blur-[70px] md:blur-[100px] -z-10 animate-pulse" />
          
          <div className="max-w-6xl mx-auto text-center space-y-6 md:space-y-10">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 py-2 px-4 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest shadow-sm">
              <Star size={14} className="fill-amber-500" /> A ESCOLHA Nº 1 DOS MELHORES ESTÚDIOS
            </div>
            <h1 className="text-4xl md:text-8xl font-black text-zinc-900 tracking-tighter leading-[1.05] md:leading-[0.9] max-w-5xl mx-auto">
              Transforme sua paixão em um <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 italic">
                Império Lucrativo.
              </span>
            </h1>
            <p className="text-base md:text-2xl text-zinc-500 max-w-3xl mx-auto leading-relaxed font-medium px-2">
              A única plataforma que une Agendamento 24h, Gestão Financeira Real e Automação de WhatsApp em uma interface que seus clientes vão amar.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Button onClick={() => handleStartSelection()} size="lg" className="w-full sm:w-auto h-16 md:h-20 px-10 md:px-14 text-lg md:text-2xl bg-zinc-900 hover:bg-zinc-800 text-white rounded-[2rem] shadow-2xl group transition-all hover:scale-105">
                Testar Grátis Agora <ArrowRight className="ml-3 group-hover:translate-x-2 transition-transform" />
              </Button>
              <div className="flex flex-col items-center sm:items-start px-4">
                <div className="flex -space-x-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 border-4 border-white shadow-sm overflow-hidden">
                       <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] md:text-[12px] font-bold text-zinc-400 mt-3 uppercase tracking-widest">+1.500 profissionais ativos hoje</p>
              </div>
            </div>

            {/* Mockup do Sistema */}
            <div className="mt-16 md:mt-24 relative max-w-5xl mx-auto group">
               <div className="absolute -inset-4 md:-inset-10 bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
               <div className="relative bg-zinc-900 rounded-[2rem] md:rounded-[3.5rem] p-2 md:p-4 shadow-[0_0_80px_rgba(0,0,0,0.15)] overflow-hidden">
                  <img src={mockupImg} alt="Agendelle Dashboard" className="w-full rounded-[1.5rem] md:rounded-[2.8rem] shadow-2xl" />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/40 to-transparent pointer-events-none" />
               </div>
            </div>
          </div>
        </header>

        {/* SECTION: COMPARATIVO */}
        <section className="py-24 px-6 bg-white overflow-hidden">
           <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                 <div className="space-y-8">
                    <Badge color="primary" className="py-1 px-3">O FIM DO CAOS</Badge>
                    <h2 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tight leading-[1.1]">
                      Você ainda usa <br />
                      <span className="text-zinc-400 line-through decoration-amber-500 decoration-4">Agenda de Papel?</span>
                    </h2>
                    <p className="text-lg text-zinc-500 font-medium">A desorganização é o inimigo nº 1 do seu faturamento. Veja o que você está perdendo:</p>
                    
                    <div className="space-y-4 pt-4">
                       {[
                         { t: "Furos na Agenda", d: "Clientes esquecem e você fica com horário vago e sem lucro.", icon: <XCircle className="text-red-500" /> },
                         { t: "Escravidão do WhatsApp", d: "Você gasta 4h por dia respondendo clientes em vez de estar atendendo.", icon: <XCircle className="text-red-500" /> },
                         { t: "Furo no Caixa", d: "No final do mês, você não sabe para onde foi o dinheiro.", icon: <XCircle className="text-red-500" /> },
                       ].map((item, i) => (
                         <div key={i} className="flex gap-4 p-4 bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="mt-1">{item.icon}</div>
                            <div>
                               <p className="font-black text-zinc-900 text-sm md:text-base">{item.t}</p>
                               <p className="text-xs md:text-sm text-zinc-500 mt-0.5">{item.d}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-zinc-900 rounded-[3rem] p-8 md:p-12 text-white relative shadow-2xl group">
                    <div className="absolute top-0 right-0 p-8">
                       <Crown className="text-amber-500" size={48} />
                    </div>
                    <h3 className="text-3xl md:text-4xl font-black mb-8">A Era Agendelle</h3>
                    <div className="space-y-6">
                       {[
                         { t: "Agendamento Automático", d: "Seu link trabalha 24h por você. O cliente agenda sozinho.", icon: <CheckCircle className="text-emerald-500" /> },
                         { t: "Lembretes Inteligentes", d: "WhatsApp avisa o cliente. Faltas reduzidas em até 90%.", icon: <CheckCircle className="text-emerald-500" /> },
                         { t: "Controle Total", d: "Gráficos de lucro, comissões de equipe e estoque na palma da mão.", icon: <CheckCircle className="text-emerald-500" /> },
                       ].map((item, i) => (
                         <div key={i} className="flex gap-4 p-5 bg-white/5 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                            <div className="mt-1">{item.icon}</div>
                            <div>
                               <p className="font-black text-white text-base md:text-lg">{item.t}</p>
                               <p className="text-xs md:text-sm text-zinc-400 mt-1">{item.d}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                    <Button onClick={() => handleStartSelection()} className="w-full mt-10 h-16 md:h-20 bg-white text-zinc-900 hover:bg-amber-500 hover:text-white rounded-3xl font-black text-sm md:text-lg transition-all shadow-xl group">
                       SIM, QUERO O AGENDELLE AGORA <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform" />
                    </Button>
                 </div>
              </div>
           </div>
        </section>

        {/* SECTION: FUNCIONALIDADES DETALHADAS */}
        <section id="beneficios" className="py-24 px-6 bg-zinc-50">
           <div className="max-w-6xl mx-auto text-center mb-16">
              <Badge color="primary" className="mb-4">O PODER DO SISTEMA</Badge>
              <h2 className="text-3xl md:text-6xl font-black text-zinc-900 tracking-tight">O que faz o Agendelle ser Top?</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <MessageCircle className="text-emerald-500" />, title: "WhatsApp Bot", desc: "Confirmações, lembretes e mensagens de pós-venda 100% automáticas." },
                { icon: <BarChart3 className="text-blue-500" />, title: "Relatórios de Elite", desc: "Saiba quais serviços dão mais lucro e quem são seus melhores clientes." },
                { icon: <Layers className="text-purple-500" />, title: "Comandas Digitais", desc: "Abra atendimentos, adicione produtos e receba pagamentos com facilidade." },
                { icon: <Package className="text-amber-500" />, title: "Controle de Estoque", desc: "Nunca mais fique sem aquele produto essencial. Alertas de reposição automáticos." },
                { icon: <Users className="text-indigo-500" />, title: "Cálculo de Comissão", desc: "Esqueça a calculadora. O sistema faz o rateio exato para seus profissionais." },
                { icon: <Smartphone className="text-rose-500" />, title: "PWA Instalação", desc: "Instale o sistema no seu celular como se fosse um app da Apple Store." },
                { icon: <Shield className="text-zinc-600" />, title: "Segurança AWS", desc: "Seus dados em servidores globais com backup diário automático." },
                { icon: <Zap className="text-amber-500" />, title: "Velocidade Real", desc: "Carregamento instantâneo. Sem travamentos, mesmo com milhares de dados." },
              ].map((f, i) => (
                <div key={i} className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group">
                   <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                      {React.cloneElement(f.icon as any, { size: 28 })}
                   </div>
                   <h4 className="text-lg font-black text-zinc-900 mb-2">{f.title}</h4>
                   <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-medium">{f.desc}</p>
                </div>
              ))}
           </div>
        </section>

        {/* SECTION: FAQ */}
        <section className="py-24 px-6 bg-white">
           <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tight">Dúvidas Frequentes</h2>
                 <p className="text-zinc-500 mt-4">Tudo o que você precisa saber para começar.</p>
              </div>

              <div className="space-y-4">
                 {faqs.map((f, i) => (
                   <div key={i} className="border border-zinc-100 rounded-[1.5rem] overflow-hidden transition-all shadow-sm hover:border-amber-200">
                      <button 
                        onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                        className="w-full flex items-center justify-between p-6 text-left hover:bg-zinc-50 transition-colors"
                      >
                         <span className="font-black text-zinc-900 md:text-lg">{f.q}</span>
                         {activeFaq === i ? <ChevronUp size={20} className="text-amber-500" /> : <ChevronDown size={20} className="text-zinc-400" />}
                      </button>
                      {activeFaq === i && (
                        <div className="px-6 pb-6 text-zinc-500 text-sm md:text-base leading-relaxed animate-in slide-in-from-top-2 duration-300">
                           {f.a}
                        </div>
                      )}
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* SECTION: PLANOS */}
        <section ref={plansRef} className="py-24 px-4 md:px-6 bg-zinc-950 text-white relative overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px] -z-0" />
          <div className="max-w-6xl mx-auto text-center relative z-10">
             <div className="mb-16">
                <Badge color="primary" className="mb-4 bg-white/10 text-white border-white/20">PREÇOS SEM PEGADINHAS</Badge>
                <h2 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">Escolha seu Plano e <br />Comece Agora.</h2>
                <p className="mt-6 text-zinc-400 text-lg md:text-xl">O investimento que se paga com apenas um cliente extra na semana.</p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {plans.map((p) => (
                  <div key={p.id} className={`relative p-8 md:p-10 rounded-[3rem] border-2 text-left flex flex-col h-full transition-all duration-500 ${p.name === "Pro" ? 'border-amber-500 bg-white text-zinc-900 shadow-[0_0_60px_rgba(245,158,11,0.2)] md:scale-105 z-20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                    {p.name === "Pro" && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] md:text-[12px] font-black uppercase tracking-widest px-6 py-2 rounded-full shadow-lg">RECOMENDADO</div>
                    )}
                    <div className="mb-8">
                      <h3 className={`text-2xl md:text-3xl font-black ${p.name === "Pro" ? 'text-zinc-900' : 'text-white'}`}>{p.name}</h3>
                      <p className={`${p.name === "Pro" ? 'text-zinc-500' : 'text-zinc-400'} text-xs mt-2 font-bold uppercase tracking-widest`}>Acesso Completo</p>
                    </div>
                    <div className="mb-10">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-4xl md:text-5xl font-black ${p.name === "Pro" ? 'text-zinc-900' : 'text-white'}`}>R$ {Number(p.price).toFixed(2)}</span>
                        <span className={`${p.name === "Pro" ? 'text-zinc-400' : 'text-zinc-500'} text-sm font-bold`}>/mês</span>
                      </div>
                      <div className={`inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-xl text-[10px] md:text-[12px] font-black uppercase tracking-widest ${p.name === "Pro" ? 'bg-amber-100 text-amber-700' : 'bg-white/10 text-white'}`}>
                        <Zap size={14} /> PRIMEIROS 30 DIAS GRÁTIS
                      </div>
                    </div>
                    <ul className="space-y-5 mb-12 flex-1">
                       {JSON.parse(p.features || "[]").map((f: string, i: number) => (
                        <li key={i} className={`flex items-start gap-3 text-sm md:text-base font-bold ${p.name === "Pro" ? 'text-zinc-700' : 'text-zinc-300'}`}>
                          <CheckCircle size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handleStartSelection(p.id)} 
                      className={`w-full h-16 md:h-20 rounded-[2rem] font-black shadow-2xl transition-all ${p.name === "Pro" ? 'bg-zinc-900 hover:bg-zinc-800 text-white' : 'bg-white text-zinc-900 hover:bg-amber-500 hover:text-white'}`}
                    >
                      ESCOLHER {p.name.toUpperCase()}
                    </Button>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-16 bg-zinc-50 border-t border-zinc-100 px-6">
           <div className="max-w-6xl mx-auto text-center space-y-10">
              <div className="flex items-center justify-center gap-3">
                 <img src={logoImg} alt="Agendelle" className="h-10 w-10 opacity-50 grayscale" />
                 <span className="text-2xl font-black text-zinc-300 tracking-tighter">Agendelle</span>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
                 {[
                   { icon: <Shield size={18} />, t: "Ambiente 100% Seguro" },
                   { icon: <Lock size={18} />, t: "Criptografia de Ponta" },
                   { icon: <Star size={18} />, t: "Avaliado 4.9/5 estrelas" },
                 ].map((item, i) => (
                   <div key={i} className="flex items-center gap-3 text-zinc-400">
                      {item.icon}
                      <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em]">{item.t}</span>
                   </div>
                 ))}
              </div>
              <div className="pt-10 border-t border-zinc-200 text-zinc-400 text-[10px] md:text-[12px] font-medium leading-relaxed">
                 © 2026 Agendelle Tecnologias para Estúdios de Beleza Ltda. <br className="hidden md:block" />
                 Feito com paixão para profissionais que querem dominar o mercado.
              </div>
           </div>
        </footer>
      </div>
    );
  }

  // --- FLUXO DE CADASTRO ---
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-8 md:py-16 px-4 font-sans">
      <div className="w-full max-w-4xl flex items-center justify-between mb-12">
        <div className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-70" onClick={() => setStep(0)}>
          <img src={logoImg} alt="Agendelle" className="h-8 w-8 object-contain" />
          <span className="font-black text-zinc-900 text-xl tracking-tighter">Agendelle</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${step >= 1 ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/30' : 'bg-zinc-200 text-zinc-500'}`}>1</div>
            <span className={`text-xs font-black uppercase tracking-widest ${step >= 1 ? 'text-zinc-900' : 'text-zinc-400'}`}>Plano</span>
          </div>
          <div className="w-12 h-1 bg-zinc-200 rounded-full" />
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${step >= 2 ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/30' : 'bg-zinc-200 text-zinc-500'}`}>2</div>
            <span className={`text-xs font-black uppercase tracking-widest ${step >= 2 ? 'text-zinc-900' : 'text-zinc-400'}`}>Estúdio</span>
          </div>
          <div className="w-12 h-1 bg-zinc-200 rounded-full" />
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${step >= 3 ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/30' : 'bg-zinc-200 text-zinc-500'}`}>3</div>
            <span className={`text-xs font-black uppercase tracking-widest ${step >= 3 ? 'text-zinc-900' : 'text-zinc-400'}`}>Acesso</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} iconLeft={<ArrowLeft size={16} />} className="text-zinc-500 font-black text-xs uppercase tracking-widest hover:bg-zinc-100 rounded-xl">
          VOLTAR
        </Button>
      </div>

      <div className="w-full max-w-4xl">
        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4">
              <Badge color="primary" className="py-1 px-4">SELEÇÃO DE PLANO</Badge>
              <h1 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tighter">Qual seu objetivo hoje?</h1>
              <p className="text-zinc-500 text-lg md:text-xl font-medium">Selecione o plano ideal para escalar seu estúdio.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative p-8 rounded-[2.5rem] border-2 cursor-pointer transition-all duration-500 ${
                    selectedPlan === p.id 
                      ? "border-amber-500 bg-white shadow-2xl ring-8 ring-amber-500/5" 
                      : "border-transparent bg-white shadow-sm hover:border-zinc-200"
                  }`}
                >
                  {p.name === "Pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                      O MELHOR CUSTO-BENEFÍCIO
                    </div>
                  )}
                  <div className="space-y-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${selectedPlan === p.id ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                      <Zap size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-zinc-900">{p.name}</h3>
                      <div className="flex items-baseline gap-1 mt-2">
                        <span className="text-2xl md:text-3xl font-black text-zinc-900">R$ {Number(p.price).toFixed(2)}</span>
                        <span className="text-zinc-400 text-xs font-bold uppercase">/mês</span>
                      </div>
                    </div>
                    <ul className="space-y-4 pt-4 border-t border-zinc-100">
                      {JSON.parse(p.features || "[]").slice(0, 6).map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 font-bold leading-tight">
                          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5 w-4 h-4 md:w-[18px] md:h-[18px]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-8">
              <Button size="lg" onClick={handleNext} iconRight={<ArrowRight size={20} />} className="w-full sm:w-auto h-16 md:h-20 px-14 rounded-[2rem] text-lg md:text-xl font-black shadow-2xl shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white">
                CONTINUAR PARA DADOS DO ESTÚDIO
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center space-y-4">
              <Badge color="primary" className="py-1 px-4">CONFIGURAÇÃO DO ESTÚDIO</Badge>
              <h1 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tighter">Fale sobre seu negócio.</h1>
              <p className="text-zinc-500 text-lg md:text-xl font-medium">Como seus clientes verão sua marca online?</p>
            </div>

            <ContentCard padding="lg" className="shadow-[0_0_80px_rgba(0,0,0,0.05)] border-none rounded-[3rem] p-10">
              <div className="space-y-8">
                  <Input
                    label="Nome da sua Marca / Barbearia"
                    placeholder="Ex: Studio Elegance VIP"
                    iconLeft={<Building2 size={20} />}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="h-14 font-bold"
                    required
                  />

                <div className="space-y-3">
                  <label className="text-[10px] md:text-[12px] font-black text-zinc-500 uppercase tracking-widest ml-1">Endereço Exclusivo da sua Agenda</label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
                    <div className="bg-zinc-100 border border-zinc-200 sm:border-r-0 rounded-2xl sm:rounded-r-none px-6 flex items-center text-zinc-500 text-xs md:text-sm font-black h-14">
                      agendelle.com.br/
                    </div>
                    <input
                      className="flex-1 bg-white border border-zinc-200 rounded-2xl sm:rounded-l-none px-6 h-14 text-sm md:text-lg font-black text-zinc-900 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all placeholder:text-zinc-300"
                      placeholder="seu-estudio"
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    />
                  </div>
                  <p className="text-[10px] md:text-[11px] text-zinc-400 ml-1 font-bold italic leading-tight flex items-center gap-1">
                    <Star size={12} className="text-amber-500" /> Seus clientes agendarão através deste link.
                  </p>
                </div>

                <div className="pt-6 flex flex-col-reverse sm:flex-row gap-4">
                  <Button variant="ghost" onClick={handleBack} className="font-black h-14 md:h-16 text-zinc-400 hover:text-zinc-900 text-sm tracking-widest rounded-2xl">VOLTAR</Button>
                  <Button onClick={handleNext} fullWidth className="h-14 md:h-16 font-black bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl shadow-xl" iconRight={<ArrowRight size={20} />}>CONTINUAR</Button>
                </div>
              </div>
            </ContentCard>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="text-center space-y-4">
              <Badge color="primary" className="py-1 px-4">DADOS DO PROPRIETÁRIO</Badge>
              <h1 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tighter">Último Passo!</h1>
              <p className="text-zinc-500 text-lg md:text-xl font-medium">Quem terá o controle total do império?</p>
            </div>

            <ContentCard padding="lg" className="shadow-[0_0_80px_rgba(0,0,0,0.05)] border-none rounded-[3rem] p-10">
              <div className="space-y-6 md:space-y-8">
                <Input
                  label="Seu Nome Completo"
                  placeholder="Nome e Sobrenome"
                  iconLeft={<User size={20} />}
                  value={form.ownerName}
                  onChange={e => setForm({ ...form, ownerName: e.target.value })}
                  className="h-14 font-bold"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="E-mail de Acesso"
                    type="email"
                    placeholder="seu@email.com"
                    iconLeft={<Mail size={20} />}
                    value={form.ownerEmail}
                    onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                    className="h-14 font-bold"
                    required
                  />
                  <Input
                    label="WhatsApp do Gestor"
                    placeholder="(00) 00000-0000"
                    iconLeft={<Phone size={20} />}
                    value={form.ownerPhone}
                    onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
                    className="h-14 font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Senha de Acesso"
                    type="password"
                    placeholder="••••••••"
                    iconLeft={<Lock size={20} />}
                    value={form.adminPassword}
                    onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                    className="h-14 font-bold"
                    required
                  />
                  <Input
                    label="Confirmar Senha"
                    type="password"
                    placeholder="••••••••"
                    iconLeft={<Shield size={20} />}
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    className="h-14 font-bold"
                    required
                  />
                </div>

                <div className="pt-6 flex flex-col-reverse sm:flex-row gap-4">
                  <Button variant="ghost" onClick={handleBack} disabled={loading} className="font-black h-14 md:h-16 text-zinc-400 hover:text-zinc-900 text-sm tracking-widest rounded-2xl">VOLTAR</Button>
                  <Button onClick={handleSubmit} loading={loading} fullWidth className="h-14 md:h-16 font-black bg-emerald-500 hover:bg-emerald-600 shadow-2xl shadow-emerald-500/20 text-white rounded-2xl text-lg">FINALIZAR E CRIAR MEU ESTÚDIO</Button>
                </div>

                <p className="text-center text-[10px] md:text-[11px] text-zinc-400 leading-relaxed font-bold">
                  Ao clicar em Finalizar, você declara que leu e aceita nossos <br />
                  <a href="#" className="underline text-zinc-900">Termos de Uso</a> e <a href="#" className="underline text-zinc-900">Política de Privacidade</a>.
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

