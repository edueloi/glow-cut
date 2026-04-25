import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2, User, Lock, Mail, Phone, CheckCircle,
  ArrowRight, ArrowLeft, Crown, Shield, MessageCircle,
  CreditCard, Star, Zap, Clock, TrendingUp, Users,
  Smartphone, Bell, Calendar, Wallet, AlertCircle,
  XCircle, ChevronDown, ChevronUp, BarChart3, Package,
  Layers, Rocket, Download, Wifi, Battery, Check,
  Play, Quote
} from "lucide-react";
import { Button, Input, ContentCard, Badge, useToast } from "@/src/components/ui";
import { apiFetch } from "@/src/lib/api";

import logoImg from "../images/system/logo-favicon.png";
import mockupImg from "../images/system/agendelle_mockup_dashboard.png";
const appMockupImg = "/mockup-app-agendelle.png";

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
    plansRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const openCheckout = async (plan: any) => {
    try {
      const r = await fetch("/api/auth/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, ref: salesPersonId }),
      });
      const data = await r.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }
    } catch {}
    if (salesPersonId) {
      window.open(`https://agendelle.com.br/assinar?ref=${salesPersonId}`, "_blank", "noopener,noreferrer");
    } else if (plan.stripePaymentLink) {
      window.open(plan.stripePaymentLink, "_blank", "noopener,noreferrer");
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
        body: JSON.stringify({ ...form, planId: selectedPlan, salesPersonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao realizar cadastro.");
      setStep(4);
      toast.success("Seu estúdio foi criado com sucesso. Redirecionando...");
      setTimeout(() => navigate("/login"), 3000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    { q: "Como funciona o período gratuito?", a: "Os primeiros 30 dias são 100% gratuitos, sem precisar de cartão para começar. Você só é cobrado após esse período, se quiser continuar. Cancele antes sem custo nenhum." },
    { q: "Funciona no celular? Tem app?", a: "Sim! O Agendelle é um App PWA — você instala direto pelo navegador, sem precisar de App Store ou Play Store. Funciona como app nativo no iPhone e Android, ocupa pouquíssimo espaço e funciona offline." },
    { q: "Como meus clientes agendam?", a: "Você recebe um link exclusivo (ex: agendelle.com.br/seu-estudio) que pode colocar na bio do Instagram, enviar pelo WhatsApp ou compartilhar onde quiser. Seus clientes agendam sozinhos, 24h por dia." },
    { q: "Posso cancelar a qualquer momento?", a: "Com certeza. Sem fidelidade, sem multa. Se não estiver satisfeito, cancela direto pelo painel em menos de 1 minuto." },
    { q: "O sistema envia mensagens automáticas?", a: "Sim! A partir do Plano Pro, o Agendelle envia lembretes automáticos via WhatsApp antes de cada atendimento, reduzindo faltas em até 90%." },
    { q: "E se eu tiver mais de um profissional?", a: "Perfeito para equipes! Cada profissional tem sua própria agenda, comissões calculadas automaticamente e acesso controlado pelo gestor." },
  ];

  // ── LANDING PAGE (step 0) ──
  if (step === 0) {
    return (
      <div className="min-h-screen bg-white font-sans overflow-x-hidden selection:bg-amber-500 selection:text-white">

        {/* NAVBAR */}
        <nav className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur-xl z-50 border-b border-zinc-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-18 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src={logoImg} alt="Agendelle" className="h-8 w-8 md:h-9 md:w-9 object-contain" />
              <span className="text-xl font-black text-zinc-900 tracking-tighter">Agendelle</span>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <a href="#beneficios" className="hidden md:block text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">Funcionalidades</a>
              <a href="#pwa" className="hidden md:block text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">App</a>
              <Button onClick={scrollToPlans} size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-4 md:px-6 text-[10px] md:text-xs font-black uppercase tracking-widest h-9 md:h-10">
                Ver Planos
              </Button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <header className="pt-20 md:pt-32 pb-10 md:pb-24 px-4 md:px-6 relative overflow-hidden bg-gradient-to-b from-zinc-50 to-white">
          <div className="absolute top-0 right-0 w-[60%] h-[70%] bg-amber-400/8 rounded-full blur-[120px] -z-10" />
          <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-indigo-500/8 rounded-full blur-[100px] -z-10" />

          <div className="max-w-5xl mx-auto text-center space-y-5 md:space-y-8">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 py-1.5 px-4 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest">
              <Star size={11} className="fill-amber-500" /> Mais de 500 estúdios já usam o Agendelle
            </div>

            <h1 className="text-4xl md:text-7xl font-black text-zinc-900 tracking-tighter leading-[1.05] max-w-4xl mx-auto">
              Seu estúdio lotado.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">
                Você no controle.
              </span>
            </h1>

            <p className="text-base md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed font-medium px-2">
              Agendamento online 24h, lembretes automáticos no WhatsApp, gestão financeira completa e <strong className="text-zinc-700">app instalável no celular</strong> — tudo em um só lugar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={scrollToPlans}
                size="lg"
                className="w-full sm:w-auto h-14 md:h-16 px-8 md:px-12 text-base md:text-lg bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-xl shadow-amber-500/30 font-black group transition-all hover:scale-105 active:scale-95"
              >
                Começar 30 dias grátis <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
              <button
                onClick={scrollToPlans}
                className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5"
              >
                <Play size={14} className="fill-zinc-400" /> Ver planos e preços
              </button>
            </div>

            {/* Trust bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 pt-4 text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest">
              {[
                { icon: <CheckCircle size={13} className="text-emerald-500" />, t: "30 dias grátis" },
                { icon: <CheckCircle size={13} className="text-emerald-500" />, t: "Sem cartão para começar" },
                { icon: <CheckCircle size={13} className="text-emerald-500" />, t: "Cancele quando quiser" },
                { icon: <CheckCircle size={13} className="text-emerald-500" />, t: "Suporte incluso" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">{item.icon} {item.t}</div>
              ))}
            </div>

            {/* Mockup */}
            <div className="mt-8 md:mt-16 relative max-w-5xl mx-auto px-2 md:px-0">
              <div className="absolute -inset-4 bg-gradient-to-tr from-amber-500/10 to-indigo-500/10 rounded-[2.5rem] blur-3xl opacity-60" />
              <div className="relative bg-zinc-900 rounded-[1.5rem] md:rounded-[2.5rem] p-2 md:p-3 shadow-2xl overflow-hidden">
                <img src={mockupImg} alt="Agendelle Dashboard" className="w-full rounded-[1rem] md:rounded-[2rem] shadow-xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/10 to-transparent pointer-events-none rounded-[1.5rem] md:rounded-[2.5rem]" />
              </div>
            </div>
          </div>
        </header>

        {/* SECTION: DOR vs SOLUÇÃO */}
        <section className="py-14 md:py-20 px-4 md:px-6 bg-white">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-5">
              <Badge color="danger" className="text-[10px] px-3 py-1">O FIM DO CAOS</Badge>
              <h2 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight leading-tight">
                Você ainda perde dinheiro<br />
                <span className="text-zinc-400 line-through decoration-red-400 decoration-[3px]">por falta de organização?</span>
              </h2>

              <div className="space-y-3">
                {[
                  { t: "Furos na agenda todo mês", d: "Clientes esquecem e você fica com horário vago — prejuízo puro." },
                  { t: "4h por dia no WhatsApp", d: "Confirmando, desmarcando, respondendo. É tempo que você não tem." },
                  { t: "Sem saber onde está o lucro", d: "No fim do mês você trabalhou muito e o dinheiro some." },
                  { t: "Comissões feitas na calculadora", d: "Erro humano, briga entre profissionais, desgaste diário." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-3.5 md:p-4 bg-red-50/60 rounded-xl border border-red-100">
                    <XCircle className="text-red-400 w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-black text-zinc-800 text-xs md:text-sm">{item.t}</p>
                      <p className="text-[10px] md:text-xs text-zinc-500 mt-0.5">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl md:rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full" />
              <div className="relative z-10">
                <Crown className="text-amber-500 mb-4" size={32} />
                <h3 className="text-xl md:text-3xl font-black mb-6 leading-tight">Com o Agendelle, isso vira passado</h3>
                <div className="space-y-4">
                  {[
                    { t: "Agenda lotada automaticamente", d: "Clientes agendam sozinhos pelo link, 24h por dia, inclusive de madrugada." },
                    { t: "Zero faltas com WhatsApp Bot", d: "Lembretes automáticos antes de cada atendimento. Até 90% menos faltas." },
                    { t: "Financeiro no seu bolso", d: "Relatórios em tempo real. Você sabe exatamente quanto ganhou hoje." },
                    { t: "Comissões automáticas", d: "O sistema divide tudo exato. Sem briga, sem calculadora, sem erro." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 p-3.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                      <CheckCircle className="text-emerald-400 w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-black text-white text-xs md:text-sm">{item.t}</p>
                        <p className="text-[10px] md:text-xs text-zinc-400 mt-0.5">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={scrollToPlans}
                  className="w-full mt-7 h-12 md:h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs md:text-sm uppercase tracking-widest shadow-lg"
                >
                  Quero o Agendelle agora <ArrowRight className="ml-2 inline" size={16} />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: FUNCIONALIDADES */}
        <section id="beneficios" className="py-14 md:py-20 px-4 md:px-6 bg-zinc-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <Badge color="primary" className="mb-3 text-[10px]">TUDO QUE VOCÊ PRECISA</Badge>
              <h2 className="text-2xl md:text-5xl font-black text-zinc-900 tracking-tight">Uma plataforma. Resultado completo.</h2>
              <p className="text-zinc-500 text-sm md:text-base mt-3 font-medium">Tudo que um estúdio profissional precisa para crescer, em um só lugar.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
              {[
                { icon: <Calendar className="text-amber-500" />, title: "Agenda Online 24h", desc: "Clientes agendam pelo seu link exclusivo a qualquer hora, sem te incomodar." },
                { icon: <MessageCircle className="text-emerald-500" />, title: "WhatsApp Bot", desc: "Confirmações e lembretes automáticos. Reduza faltas em até 90%. (Pro+)", badge: "PRO" },
                { icon: <BarChart3 className="text-blue-500" />, title: "Relatórios", desc: "Saiba quais serviços mais lucram, melhores clientes e receita em tempo real." },
                { icon: <Layers className="text-purple-500" />, title: "Comandas Digitais", desc: "Abra atendimentos, adicione produtos e feche o caixa com um toque." },
                { icon: <Users className="text-indigo-500" />, title: "Gestão de Equipe", desc: "Cada profissional com sua agenda. Comissões calculadas automaticamente." },
                { icon: <Wallet className="text-rose-500" />, title: "Financeiro Real", desc: "Fluxo de caixa, contas a receber e balanço mensal. Sem planilhas." },
                { icon: <Package className="text-orange-500" />, title: "Estoque", desc: "Alertas automáticos quando o produto está acabando. Zero desperdício." },
                { icon: <Shield className="text-zinc-500" />, title: "Segurança Total", desc: "Servidores AWS globais, criptografia ponta a ponta e backup diário." },
              ].map((f, i) => (
                <div key={i} className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-zinc-100 shadow-sm hover:shadow-lg transition-all group">
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="w-9 h-9 md:w-11 md:h-11 bg-zinc-50 rounded-lg md:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      {React.cloneElement(f.icon as any, { size: 18 })}
                    </div>
                    {f.badge && <span className="text-[7px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">{f.badge}</span>}
                  </div>
                  <h4 className="text-xs md:text-sm font-black text-zinc-900 mb-1">{f.title}</h4>
                  <p className="text-[9px] md:text-[11px] text-zinc-500 leading-relaxed font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: APP PWA — destaque */}
        <section id="pwa" className="py-14 md:py-20 px-4 md:px-6 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl md:rounded-3xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Texto */}
                <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-5 w-fit">
                    <Smartphone size={12} /> App PWA exclusivo
                  </div>
                  <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight mb-4">
                    Um app de verdade.<br />
                    <span className="text-amber-400">Sem App Store.</span><br />
                    Sem ocupar memória.
                  </h2>
                  <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-6">
                    O Agendelle usa tecnologia PWA — você instala direto pelo navegador do celular, em 5 segundos, em qualquer iPhone ou Android. Funciona como app nativo, aparece na tela inicial e abre rápido como qualquer outro app.
                  </p>

                  <div className="space-y-3 mb-8">
                    {[
                      { icon: <Download size={14} className="text-amber-400" />, t: "Instale sem App Store ou Play Store" },
                      { icon: <Battery size={14} className="text-emerald-400" />, t: "Ocupa menos de 1MB no celular" },
                      { icon: <Wifi size={14} className="text-blue-400" />, t: "Funciona offline — sem internet" },
                      { icon: <Bell size={14} className="text-purple-400" />, t: "Notificações push como app nativo" },
                      { icon: <Smartphone size={14} className="text-rose-400" />, t: "Compatível com iPhone e Android" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm font-bold text-zinc-300">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">{item.icon}</div>
                        {item.t}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={scrollToPlans}
                    className="w-full sm:w-auto h-12 md:h-14 px-8 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs md:text-sm uppercase tracking-widest"
                  >
                    Quero esse app <ArrowRight className="ml-2 inline" size={16} />
                  </Button>
                </div>

                {/* Visual */}
                <div className="relative hidden lg:flex items-center justify-center p-8">
                  <div className="absolute inset-0 bg-amber-500/10 blur-[80px]" />
                  <div className="relative z-10 w-full max-w-[400px] group">
                    <img 
                      src={appMockupImg} 
                      alt="App Agendelle" 
                      className="w-full drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-5 py-2 border border-white/20 whitespace-nowrap">
                      <CheckCircle size={14} className="text-emerald-400" />
                      <span className="text-white text-xs font-bold">Instalado na tela inicial</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: DEPOIMENTOS */}
        <section className="py-14 md:py-20 px-4 md:px-6 bg-zinc-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <Badge color="success" className="mb-3 text-[10px]">QUEM JÁ USA</Badge>
              <h2 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight">Estúdios que transformaram o negócio</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {[
                { name: "Camila Rodrigues", role: "Proprietária • Studio Camila", text: "Em 2 semanas minha agenda estava lotada. Os clientes adoram o link e eu parei de ficar presa no WhatsApp o dia todo. Mudou minha vida.", stars: 5 },
                { name: "Rafael Mendes", role: "Barbeiro • RM Barbearia", text: "Minha equipe tem 4 profissionais e o sistema cuida das comissões automático. Antes eu passava horas calculando. Agora é zero trabalho.", stars: 5 },
                { name: "Juliana Costa", role: "Manicure • Studio JC", text: "Instalei o app no celular em 5 segundos. Nem sabia que existia isso — é igual um app normal, mas não ocupa nada. Incrível!", stars: 5 },
              ].map((d, i) => (
                <div key={i} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 flex flex-col gap-4">
                  <Quote size={20} className="text-amber-400" />
                  <p className="text-sm text-zinc-600 leading-relaxed font-medium flex-1">"{d.text}"</p>
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: d.stars }).map((_, i) => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900">{d.name}</p>
                    <p className="text-[10px] text-zinc-400 font-bold">{d.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: FAQ */}
        <section className="py-14 md:py-20 px-4 md:px-6 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight">Dúvidas Frequentes</h2>
              <p className="text-sm text-zinc-500 mt-2 font-medium">Tudo o que você precisa saber antes de começar.</p>
            </div>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-zinc-50 transition-colors"
                  >
                    <span className="font-black text-zinc-900 text-sm md:text-base pr-4">{f.q}</span>
                    {activeFaq === i
                      ? <ChevronUp size={16} className="text-amber-500 shrink-0" />
                      : <ChevronDown size={16} className="text-zinc-400 shrink-0" />}
                  </button>
                  {activeFaq === i && (
                    <div className="px-4 pb-4 md:px-5 md:pb-5 text-zinc-500 text-xs md:text-sm leading-relaxed">
                      {f.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION: PLANOS */}
        <section ref={plansRef} className="py-14 md:py-20 px-4 md:px-6 bg-zinc-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <Badge color="primary" className="mb-3 text-[9px]">PREÇOS SEM PEGADINHAS</Badge>
              <h2 className="text-3xl md:text-5xl font-black text-zinc-900 tracking-tight">
                Comece hoje.<br className="md:hidden" /> Pague só depois.
              </h2>
              <p className="mt-3 text-zinc-500 text-sm md:text-base font-medium">
                30 dias grátis em todos os planos. Sem cartão para começar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
              {plans.map((p, idx) => {
                const isPopular = p.name === "Pro";
                let features: string[] = [];
                try { features = JSON.parse(p.features || "[]"); } catch {}
                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col rounded-2xl border-2 p-6 md:p-8 transition-all duration-300 bg-white ${
                      isPopular
                        ? "border-amber-500 shadow-xl shadow-amber-100"
                        : "border-zinc-200 shadow-sm hover:border-zinc-300 hover:shadow-md"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                        Mais escolhido
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPopular ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                        {idx === 0 ? <Zap size={18} /> : idx === 1 ? <Crown size={18} /> : <Rocket size={18} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-zinc-900 leading-none">{p.name}</h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Acesso completo</p>
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-xs font-black text-zinc-400">R$</span>
                        <span className="text-4xl font-black text-zinc-900 tracking-tighter">{Math.floor(p.price)}</span>
                        <span className="text-[10px] font-bold text-zinc-400 ml-0.5">/mês</span>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${isPopular ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        <Check size={10} /> 30 dias grátis
                      </div>
                    </div>

                    <ul className="space-y-2.5 mb-7 flex-1">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] md:text-xs font-bold text-zinc-600">
                          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5 w-3.5 h-3.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => openCheckout(p)}
                      className={`w-full h-11 md:h-12 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        isPopular
                          ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200"
                          : "bg-zinc-900 hover:bg-zinc-800 text-white"
                      }`}
                    >
                      Começar com {p.name} <ArrowRight size={14} className="ml-1 inline" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-zinc-400 font-medium mt-6">
              Sem fidelidade · Cancele quando quiser · Pagamento 100% seguro via Stripe
            </p>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-14 md:py-20 px-4 md:px-6 bg-zinc-900 text-white">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Seu concorrente já está<br />
              <span className="text-amber-400">usando o Agendelle.</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base font-medium">
              Cada dia sem o sistema é um dia de clientes perdidos, horários vazios e dinheiro saindo pelo ralo. Comece agora, grátis.
            </p>
            <Button
              onClick={scrollToPlans}
              className="h-14 md:h-16 px-10 md:px-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-base md:text-lg shadow-xl shadow-amber-500/30 transition-all hover:scale-105"
            >
              Começar 30 dias grátis <ArrowRight className="ml-2 inline" size={20} />
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 pt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {["Sem cartão", "Sem fidelidade", "Suporte incluso", "App no celular"].map((t, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Check size={11} className="text-emerald-500" /> {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-10 bg-zinc-950 border-t border-zinc-800 px-4 md:px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="Agendelle" className="h-7 w-7 opacity-40 grayscale" />
              <span className="font-black text-zinc-500 tracking-tighter">Agendelle</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-medium text-center">
              © 2026 Agendelle — Plataforma de Gestão para Estúdios de Beleza.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <Shield size={12} /> Ambiente Seguro · Stripe
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ── FLUXO DE CADASTRO (steps 1-4) ──
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-8 md:py-16 px-4 font-sans">
      <div className="w-full max-w-4xl flex items-center justify-between mb-10">
        <div className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-70" onClick={() => setStep(0)}>
          <img src={logoImg} alt="Agendelle" className="h-8 w-8 object-contain" />
          <span className="font-black text-zinc-900 text-xl tracking-tighter">Agendelle</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {[{ n: 1, l: "Plano" }, { n: 2, l: "Estúdio" }, { n: 3, l: "Acesso" }].map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <div className="w-10 h-0.5 bg-zinc-200 rounded-full" />}
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${step >= s.n ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-zinc-200 text-zinc-500'}`}>{s.n}</div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${step >= s.n ? 'text-zinc-900' : 'text-zinc-400'}`}>{s.l}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} iconLeft={<ArrowLeft size={14} />} className="text-zinc-500 font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 rounded-xl">
          Voltar
        </Button>
      </div>

      <div className="w-full max-w-4xl">

        {/* STEP 1: Escolha do plano → vai direto ao Stripe */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="text-center space-y-3">
              <Badge color="primary" className="py-1 px-4">ESCOLHA SEU PLANO</Badge>
              <h1 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tighter">Qual plano é pra você?</h1>
              <p className="text-zinc-500 text-sm md:text-base font-medium">Selecione e vá direto para o pagamento. 30 dias grátis em todos os planos.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {plans.map((p, idx) => {
                const isPopular = p.name === "Pro";
                let features: string[] = [];
                try { features = JSON.parse(p.features || "[]"); } catch {}
                return (
                  <div
                    key={p.id}
                    className={`relative flex flex-col p-6 md:p-7 rounded-2xl border-2 bg-white transition-all duration-300 ${
                      isPopular ? "border-amber-500 shadow-xl shadow-amber-100" : "border-zinc-200 shadow-sm hover:border-zinc-300 hover:shadow-md"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                        Mais escolhido
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPopular ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                        {idx === 0 ? <Zap size={16} /> : idx === 1 ? <Crown size={16} /> : <Rocket size={16} />}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-zinc-900 leading-none">{p.name}</h3>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Acesso completo</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[10px] font-black text-zinc-400">R$</span>
                        <span className="text-3xl font-black text-zinc-900 tracking-tighter">{Math.floor(p.price)}</span>
                        <span className="text-[10px] font-bold text-zinc-400 ml-0.5">/mês</span>
                      </div>
                      <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md text-[9px] font-black uppercase ${isPopular ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        <Check size={9} /> 30 dias grátis
                      </div>
                    </div>
                    <ul className="space-y-2 mb-5 flex-1">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-[10px] md:text-[11px] font-bold text-zinc-600">
                          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5 w-3 h-3" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => openCheckout(p)}
                      className={`w-full h-10 rounded-xl font-black text-[10px] uppercase tracking-widest ${
                        isPopular ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md" : "bg-zinc-900 hover:bg-zinc-800 text-white"
                      }`}
                    >
                      Escolher {p.name} <ArrowRight size={12} className="ml-1 inline" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-[11px] text-zinc-400 font-medium">
              Sem fidelidade · Cancele quando quiser · Pagamento seguro via Stripe
            </p>
          </div>
        )}

        {/* STEP 2: Dados do estúdio */}
        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-6 duration-500">
            <div className="text-center space-y-3">
              <Badge color="primary" className="py-1 px-4">SEU ESTÚDIO</Badge>
              <h1 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tighter">Como seus clientes vão te encontrar?</h1>
              <p className="text-zinc-500 text-sm md:text-base font-medium">Defina o nome e o endereço exclusivo da sua agenda online.</p>
            </div>
            <ContentCard padding="lg" className="shadow-sm border border-zinc-200 rounded-2xl p-6 md:p-8">
              <div className="space-y-6">
                <Input
                  label="Nome da sua Marca / Estúdio"
                  placeholder="Ex: Studio Elegance VIP"
                  iconLeft={<Building2 size={18} />}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="h-12 font-bold"
                  required
                />
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Endereço da sua agenda online</label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0">
                    <div className="bg-zinc-100 border border-zinc-200 sm:border-r-0 rounded-xl sm:rounded-r-none px-4 flex items-center text-zinc-500 text-xs font-black h-12 shrink-0">
                      agendelle.com.br/
                    </div>
                    <input
                      className="flex-1 bg-white border border-zinc-200 rounded-xl sm:rounded-l-none px-4 h-12 text-sm font-black text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all placeholder:text-zinc-300"
                      placeholder="seu-estudio"
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 ml-1 font-bold flex items-center gap-1">
                    <Star size={10} className="text-amber-500" /> Seus clientes agendam por este link
                  </p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button variant="ghost" onClick={handleBack} className="font-black h-12 text-zinc-400 hover:text-zinc-900 text-xs tracking-widest rounded-xl">Voltar</Button>
                  <Button onClick={handleNext} fullWidth className="h-12 font-black bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl shadow-md" iconRight={<ArrowRight size={18} />}>Continuar</Button>
                </div>
              </div>
            </ContentCard>
          </div>
        )}

        {/* STEP 3: Dados do proprietário */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-6 duration-500">
            <div className="text-center space-y-3">
              <Badge color="primary" className="py-1 px-4">DADOS DO PROPRIETÁRIO</Badge>
              <h1 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tighter">Último passo!</h1>
              <p className="text-zinc-500 text-sm md:text-base font-medium">Quem vai ter o controle total do estúdio?</p>
            </div>
            <ContentCard padding="lg" className="shadow-sm border border-zinc-200 rounded-2xl p-6 md:p-8">
              <div className="space-y-5">
                <Input
                  label="Seu Nome Completo"
                  placeholder="Nome e Sobrenome"
                  iconLeft={<User size={18} />}
                  value={form.ownerName}
                  onChange={e => setForm({ ...form, ownerName: e.target.value })}
                  className="h-12 font-bold"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="E-mail de Acesso"
                    type="email"
                    placeholder="seu@email.com"
                    iconLeft={<Mail size={18} />}
                    value={form.ownerEmail}
                    onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                    className="h-12 font-bold"
                    required
                  />
                  <Input
                    label="WhatsApp"
                    placeholder="(00) 00000-0000"
                    iconLeft={<Phone size={18} />}
                    value={form.ownerPhone}
                    onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
                    className="h-12 font-bold"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Senha de Acesso"
                    type="password"
                    placeholder="••••••••"
                    iconLeft={<Lock size={18} />}
                    value={form.adminPassword}
                    onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                    className="h-12 font-bold"
                    required
                  />
                  <Input
                    label="Confirmar Senha"
                    type="password"
                    placeholder="••••••••"
                    iconLeft={<Shield size={18} />}
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    className="h-12 font-bold"
                    required
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Button variant="ghost" onClick={handleBack} disabled={loading} className="font-black h-12 text-zinc-400 hover:text-zinc-900 text-xs tracking-widest rounded-xl">Voltar</Button>
                  <Button onClick={handleSubmit} loading={loading} fullWidth className="h-12 font-black bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 text-white rounded-xl text-sm">
                    Criar meu estúdio agora
                  </Button>
                </div>
                <p className="text-center text-[10px] text-zinc-400 leading-relaxed">
                  Ao continuar você aceita os <a href="#" className="underline text-zinc-700">Termos de Uso</a> e a <a href="#" className="underline text-zinc-700">Política de Privacidade</a>.
                </p>
              </div>
            </ContentCard>
          </div>
        )}

        {/* STEP 4: Sucesso */}
        {step === 4 && (
          <div className="max-w-lg mx-auto text-center space-y-6 py-12 animate-in zoom-in duration-700">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mx-auto">
              <CheckCircle size={48} />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Tudo pronto!</h1>
              <p className="text-zinc-500 text-base leading-relaxed">
                Seu estúdio <span className="font-bold text-zinc-800">"{form.name}"</span> foi criado com sucesso.
              </p>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3 text-left">
                <Star className="text-amber-500 shrink-0" size={18} />
                <p className="text-xs text-amber-800 font-medium">
                  Você tem <span className="font-bold">30 dias de acesso gratuito</span> para configurar e começar a receber agendamentos.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-zinc-400">
              <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-400 rounded-full animate-spin" />
              <span className="text-sm font-medium">Redirecionando para o login...</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center gap-6 text-zinc-400">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
          <Shield size={12} /> Ambiente Seguro
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest">
          <Lock size={12} /> Dados Criptografados
        </div>
      </div>
    </div>
  );
}
