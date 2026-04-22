import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, User, Lock, Mail, Phone, Globe, CheckCircle, ArrowRight, ArrowLeft, Crown, Shield, MessageCircle, CreditCard, Star } from "lucide-react";
import { Button, Input, ContentCard, SectionTitle, FormRow, Badge, useToast } from "@/src/components/ui";
import { apiFetch } from "@/src/lib/api";

import logoImg from "../images/system/imagem-agendele.png";

export default function RegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
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

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 px-4 font-sans">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-12">
        <img src={logoImg} alt="Agendelle" className="h-8 md:h-10 object-contain" />
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} iconLeft={<ArrowLeft size={14} />}>
          <span className="hidden sm:inline">Voltar ao site</span>
        </Button>
      </div>

      <div className="w-full max-w-4xl">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">Escolha o seu plano</h1>
              <p className="text-zinc-500 text-lg">Comece hoje com 30 dias de teste grátis. Sem compromisso.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                    selectedPlan === p.id 
                      ? "border-amber-500 bg-white shadow-2xl shadow-amber-500/10 ring-4 ring-amber-500/5" 
                      : "border-transparent bg-white shadow-sm hover:border-zinc-200"
                  }`}
                >
                  {p.name === "Pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                      Mais Popular
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedPlan === p.id ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-zinc-900">{p.name}</h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-zinc-900">R$ {Number(p.price).toFixed(2)}</span>
                        <span className="text-zinc-400 text-xs font-medium">/mês</span>
                      </div>
                    </div>
                    <ul className="space-y-2.5 pt-4">
                      {JSON.parse(p.features || "[]").slice(0, 5).map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-600 font-medium">
                          <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-8">
              <Button size="lg" onClick={handleNext} iconRight={<ArrowRight size={18} />} className="px-12 h-14 rounded-2xl text-lg shadow-xl shadow-amber-500/20">
                Continuar para dados do estúdio
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
              <Badge color="primary" className="mb-2">Passo 2 de 3</Badge>
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Sobre o seu estúdio</h1>
              <p className="text-zinc-500">Como os seus clientes vão encontrar você?</p>
            </div>

            <ContentCard padding="lg" className="shadow-2xl shadow-zinc-200/50">
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
                  <label className="text-[11px] font-black text-zinc-500 uppercase tracking-widest ml-1">Endereço da sua Agenda (Slug)</label>
                  <div className="flex items-stretch">
                    <div className="bg-zinc-100 border border-r-0 border-zinc-200 rounded-l-xl px-4 flex items-center text-zinc-500 text-sm font-medium">
                      agendelle.com.br/
                    </div>
                    <input
                      className="flex-1 bg-white border border-zinc-200 rounded-r-xl px-4 h-12 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      placeholder="seu-estudio"
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 ml-1 italic">Este será o link que você enviará para os seus clientes agendarem.</p>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button variant="ghost" onClick={() => setStep(1)} fullWidth>Voltar</Button>
                  <Button onClick={handleNext} fullWidth iconRight={<ArrowRight size={16} />}>Continuar</Button>
                </div>
              </div>
            </ContentCard>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
              <Badge color="primary" className="mb-2">Passo 3 de 3</Badge>
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Dados do Proprietário</h1>
              <p className="text-zinc-500">Essas serão as suas credenciais de acesso ao sistema.</p>
            </div>

            <ContentCard padding="lg" className="shadow-2xl shadow-zinc-200/50">
              <div className="space-y-6">
                <Input
                  label="Seu Nome Completo"
                  placeholder="Nome e Sobrenome"
                  iconLeft={<User size={16} />}
                  value={form.ownerName}
                  onChange={e => setForm({ ...form, ownerName: e.target.value })}
                  required
                />

                <FormRow>
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
                    label="Telefone / WhatsApp"
                    placeholder="(00) 00000-0000"
                    iconLeft={<Phone size={16} />}
                    value={form.ownerPhone}
                    onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
                  />
                </FormRow>

                <FormRow>
                  <Input
                    label="Escolha uma Senha"
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
                </FormRow>

                <div className="pt-4 flex gap-4">
                  <Button variant="ghost" onClick={() => setStep(2)} disabled={loading} fullWidth>Voltar</Button>
                  <Button onClick={handleSubmit} loading={loading} fullWidth className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20">Finalizar Cadastro</Button>
                </div>

                <p className="text-center text-[10px] text-zinc-400">
                  Ao clicar em Finalizar, você concorda com nossos <a href="#" className="underline">Termos de Uso</a> e <a href="#" className="underline">Política de Privacidade</a>.
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
