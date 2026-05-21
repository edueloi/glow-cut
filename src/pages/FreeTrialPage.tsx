import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, Check, CheckCircle, Lock,
  User, Phone, Mail, Building2, Shield, Zap,
  Calendar, MessageCircle, BarChart3, Users,
  Wallet, Bell, Star, Crown, Sparkles,
  IdCard, Eye, EyeOff, RefreshCw, XCircle,
  Gift, Clock, Scissors, ChevronRight,
} from "lucide-react";
import { Button, Badge, useToast } from "@/src/components/ui";
import { apiFetch } from "@/src/lib/api";
import logoImg from "../images/system/logo-favicon.png";
import { motion, AnimatePresence } from "motion/react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskCpf(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

function slugify(v: string) {
  return v.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPasswordStrength(pwd: string) {
  const rules = [
    { label: "Mínimo 8 caracteres", ok: pwd.length >= 8 },
    { label: "Uma letra minúscula", ok: /[a-z]/.test(pwd) },
    { label: "Um caractere especial", ok: /[^a-zA-Z0-9]/.test(pwd) },
  ];
  return { ok: rules.every(r => r.ok), rules };
}

// ─── Componentes internos ─────────────────────────────────────────────────────

function InputField({
  icon,
  label,
  required,
  ...props
}: { icon: React.ReactNode; label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">{icon}</span>
        <input
          className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 h-12 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all placeholder:text-zinc-300"
          {...props}
        />
      </div>
    </div>
  );
}

// ─── Stats animados ───────────────────────────────────────────────────────────

const stats = [
  { value: "500+", label: "Estúdios ativos" },
  { value: "98%", label: "Satisfação" },
  { value: "90%", label: "Menos faltas" },
  { value: "30d", label: "Grátis agora" },
];

// ─── Benefícios ───────────────────────────────────────────────────────────────

const benefits = [
  { icon: <Calendar size={18} className="text-amber-500" />, title: "Agenda Online 24h", desc: "Clientes agendam pelo seu link exclusivo a qualquer hora." },
  { icon: <MessageCircle size={18} className="text-emerald-500" />, title: "WhatsApp Bot", desc: "Lembretes automáticos. Até 90% menos faltas no seu estúdio." },
  { icon: <BarChart3 size={18} className="text-blue-500" />, title: "Relatórios", desc: "Veja em tempo real quanto você ganhou hoje." },
  { icon: <Users size={18} className="text-purple-500" />, title: "Gestão de Equipe", desc: "Cada profissional com agenda e comissões automáticas." },
  { icon: <Wallet size={18} className="text-rose-500" />, title: "Financeiro", desc: "Fluxo de caixa, contas a receber e balanço mensal." },
  { icon: <Bell size={18} className="text-indigo-500" />, title: "Notificações Push", desc: "App instalável no celular. Sem App Store, sem Play Store." },
];

// ─── Curiosidades que animam ──────────────────────────────────────────────────

const curiosidades = [
  "Estúdios que usam o Agendelle faturam até 35% mais por mês.",
  "Clientes agendam sozinhos às 2h da manhã — sem te incomodar.",
  "Com o bot do WhatsApp, você para de ficar preso no celular.",
  "Comissões calculadas na hora. Zero briga, zero calculadora.",
  "O app Agendelle pesa menos de 1MB e abre em 1 segundo.",
  "Mais de 500 estúdios já transformaram seus negócios com o Agendelle.",
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function FreeTrialPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0); // 0=intro, 1=dados, 2=salão, 3=acesso, 4=sucesso
  const [loading, setLoading] = useState(false);
  const [curiosidadeIdx, setCuriosidadeIdx] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tenantName, setTenantName] = useState("");

  const [form, setForm] = useState({
    ownerName: "",
    ownerCpf: "",
    ownerPhone: "",
    name: "",
    slug: "",
    ownerEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });

  // Rotação de curiosidades
  React.useEffect(() => {
    const t = setInterval(() => setCuriosidadeIdx(i => (i + 1) % curiosidades.length), 4000);
    return () => clearInterval(t);
  }, []);

  const checkSlug = useCallback((slug: string) => {
    if (!slug) { setSlugStatus("idle"); return; }
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    setSlugStatus("checking");
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/auth/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data.available) { setSlugStatus("available"); setSlugSuggestions([]); }
        else { setSlugStatus("taken"); setSlugSuggestions(data.suggestions || []); }
      } catch { setSlugStatus("idle"); }
    }, 500);
  }, []);

  const handleNameChange = (v: string) => {
    const auto = slugify(v);
    setForm(f => ({ ...f, name: v, slug: auto }));
    checkSlug(auto);
  };

  const handleSlugChange = (v: string) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-/, "");
    setForm(f => ({ ...f, slug: clean }));
    checkSlug(clean);
  };

  const goNext = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const step1Next = () => {
    if (!form.ownerName.trim()) { toast.warning("Informe seu nome completo."); return; }
    if (!form.ownerPhone || form.ownerPhone.replace(/\D/g, "").length < 10) { toast.warning("Informe um telefone válido."); return; }
    goNext(2);
  };

  const step2Next = () => {
    if (!form.name.trim()) { toast.warning("Informe o nome do seu salão."); return; }
    if (!form.slug) { toast.warning("Informe o endereço da agenda."); return; }
    if (slugStatus === "taken") { toast.warning("Este endereço já está em uso."); return; }
    if (slugStatus === "checking") { toast.warning("Aguarde a verificação."); return; }
    goNext(3);
  };

  const handleSubmit = async () => {
    if (!form.ownerEmail) { toast.warning("Informe seu e-mail de acesso."); return; }
    const { ok: pwdOk } = getPasswordStrength(form.adminPassword);
    if (!pwdOk) { toast.warning("A senha não atende aos requisitos."); return; }
    if (form.adminPassword !== form.confirmPassword) { toast.warning("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register-free-trial", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          ownerPhone: form.ownerPhone,
          ownerCpf: form.ownerCpf || undefined,
          adminPassword: form.adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar conta.");
      setTenantName(form.name);
      goNext(4);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── INTRO (step 0) ────────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <div className="min-h-screen bg-white font-sans overflow-x-hidden">

        {/* NAV */}
        <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-100">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="Agendelle" className="h-8 w-8 object-contain" />
              <span className="text-xl font-black text-zinc-900 tracking-tighter">Agendelle</span>
            </div>
            <Button
              size="sm"
              onClick={() => goNext(1)}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-5 h-9 text-[10px] font-black uppercase tracking-widest shadow-md shadow-amber-200"
            >
              Começar Grátis
            </Button>
          </div>
        </nav>

        {/* HERO */}
        <section className="relative overflow-hidden pt-16 pb-20 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-violet-50/30 -z-10" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-400/8 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Badge de convite */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-amber-500 text-white py-2 px-5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/30"
            >
              <Gift size={13} /> Você foi convidado(a) · Acesso Premium Grátis
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tighter leading-[1.05]"
            >
              Seu estúdio merece<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">
                o melhor sistema.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="text-base md:text-lg text-zinc-500 max-w-xl mx-auto leading-relaxed font-medium"
            >
              Você recebeu um convite especial para experimentar o Agendelle Premium <strong className="text-zinc-700">completamente grátis por 30 dias</strong> — sem cartão, sem burocracia.
            </motion.p>

            {/* Curiosidade rotativa */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="relative h-10 overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={curiosidadeIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <p className="text-[11px] md:text-xs font-bold text-amber-600 flex items-center gap-2">
                    <Sparkles size={12} className="shrink-0" />
                    {curiosidades[curiosidadeIdx]}
                  </p>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
            >
              <Button
                onClick={() => goNext(1)}
                className="w-full sm:w-auto h-14 px-10 text-base bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-xl shadow-amber-500/30 font-black group transition-all hover:scale-105 active:scale-95"
              >
                Criar minha conta grátis
                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>

            {/* Trust chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-3 md:gap-6 pt-2"
            >
              {[
                { icon: <CheckCircle size={12} className="text-emerald-500" />, t: "30 dias grátis" },
                { icon: <CheckCircle size={12} className="text-emerald-500" />, t: "Sem cartão" },
                { icon: <CheckCircle size={12} className="text-emerald-500" />, t: "Plano Premium incluso" },
                { icon: <CheckCircle size={12} className="text-emerald-500" />, t: "Cancele quando quiser" },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {c.icon} {c.t}
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* STATS */}
        <section className="py-12 px-4 bg-zinc-900">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-black text-amber-400 tracking-tighter">{s.value}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* PREMIUM CARD */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <Badge color="warning" className="mb-3 text-[10px]">O QUE VOCÊ RECEBE</Badge>
              <h2 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight">Acesso Premium completo</h2>
              <p className="text-zinc-500 text-sm font-medium mt-2">Tudo desbloqueado, por 30 dias, sem pagar nada.</p>
            </div>

            <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl p-7 md:p-10 text-white shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/15 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-[60px] pointer-events-none" />

              {/* Badge do plano */}
              <div className="relative z-10 flex items-center justify-between mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg">
                    <Crown size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-black leading-none">Plano Premium</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">30 dias grátis para você</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-xl px-3 py-2">
                  <Clock size={14} className="text-amber-400" />
                  <span className="text-amber-300 font-black text-sm">30 dias grátis</span>
                </div>
              </div>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {benefits.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 p-3.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      {b.icon}
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{b.title}</p>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5 leading-relaxed">{b.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="relative z-10 mt-8">
                <Button
                  onClick={() => goNext(1)}
                  className="w-full h-13 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm shadow-lg shadow-amber-900/30 group"
                >
                  Quero meu acesso grátis agora
                  <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="py-16 px-4 bg-zinc-50">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">Como funciona?</h2>
              <p className="text-zinc-500 text-sm font-medium mt-2">Em menos de 3 minutos você já estará usando.</p>
            </div>
            <div className="space-y-4">
              {[
                { n: "1", icon: <User size={18} className="text-amber-500" />, title: "Preencha seus dados", desc: "Nome, telefone — só o essencial. Sem complicação." },
                { n: "2", icon: <Building2 size={18} className="text-amber-500" />, title: "Configure seu estúdio", desc: "Nome do salão e seu link exclusivo para agendamento." },
                { n: "3", icon: <Mail size={18} className="text-amber-500" />, title: "Crie seu acesso", desc: "E-mail e senha para entrar no sistema." },
                { n: "4", icon: <Scissors size={18} className="text-emerald-500" />, title: "Comece a usar!", desc: "Acesso imediato ao Agendelle Premium, por 30 dias grátis." },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0 font-black text-sm">
                    {s.n}
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-zinc-900">{s.title}</p>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">{s.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-xl mx-auto text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-200">
              <Zap size={28} className="text-white" />
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-zinc-900 tracking-tight">
              Pronto para transformar<br />seu estúdio?
            </h2>
            <p className="text-zinc-500 text-sm font-medium">
              Seu convite garante acesso Premium por 30 dias, completamente grátis. Não perca.
            </p>
            <Button
              onClick={() => goNext(1)}
              className="h-14 px-10 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-base shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95"
            >
              Criar conta grátis <ArrowRight size={18} className="ml-2 inline" />
            </Button>
            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              <Lock size={11} /> Dados protegidos com criptografia
            </div>
          </div>
        </section>

        <footer className="py-8 bg-zinc-950 border-t border-zinc-900 px-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="Agendelle" className="h-6 w-6 opacity-30 grayscale" />
              <span className="font-black text-zinc-600 tracking-tighter text-sm">Agendelle</span>
            </div>
            <p className="text-[10px] text-zinc-600 font-medium text-center">© 2026 Agendelle — Plataforma de Gestão para Estúdios de Beleza.</p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              <Shield size={11} /> Ambiente Seguro
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ── SUCESSO (step 4) ──────────────────────────────────────────────────────

  if (step === 4) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 py-12 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full max-w-md text-center space-y-6"
        >
          {/* Ícone de sucesso */}
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={48} className="text-emerald-500" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Conta criada!</h1>
            <p className="text-zinc-500 text-sm font-medium mt-2 leading-relaxed">
              O estúdio <span className="font-black text-zinc-800">"{tenantName}"</span> já está ativo com acesso Premium por 30 dias.
            </p>
          </div>

          {/* Detalhes */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm text-left space-y-3">
            {[
              { icon: <Crown size={14} className="text-amber-500" />, text: "Plano Premium ativo agora" },
              { icon: <Clock size={14} className="text-blue-500" />, text: "30 dias de acesso completo grátis" },
              { icon: <CheckCircle size={14} className="text-emerald-500" />, text: "Sem cobrança neste período" },
              { icon: <Zap size={14} className="text-violet-500" />, text: "Todas as funcionalidades desbloqueadas" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-bold text-zinc-700">
                <div className="w-7 h-7 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                {item.text}
              </div>
            ))}
          </div>

          <Button
            onClick={() => navigate("/login")}
            className="w-full h-13 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black text-sm shadow-lg"
          >
            Acessar o sistema agora <ArrowRight size={16} className="ml-2 inline" />
          </Button>

          <p className="text-[10px] text-zinc-400 font-medium">
            Use seu e-mail e senha que você acabou de criar para entrar.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── FORMULÁRIO (steps 1-3) ────────────────────────────────────────────────

  const stepConfig = [
    { label: "Você", n: 1 },
    { label: "Salão", n: 2 },
    { label: "Acesso", n: 3 },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => goNext(step > 1 ? step - 1 : 0)}>
            <ArrowLeft size={16} className="text-zinc-400" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Voltar</span>
          </div>
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Agendelle" className="h-7 w-7 object-contain" />
            <span className="font-black text-zinc-900 tracking-tighter">Agendelle</span>
          </div>
          <div className="w-16" /> {/* spacer */}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Stepper + badge */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-0">
            {stepConfig.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${step >= s.n ? "bg-amber-500 text-white shadow-md shadow-amber-300/50" : "bg-zinc-200 text-zinc-400"}`}>
                    {step > s.n ? <Check size={13} /> : s.n}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${step >= s.n ? "text-zinc-700" : "text-zinc-400"}`}>{s.label}</span>
                </div>
                {i < stepConfig.length - 1 && (
                  <div className={`h-0.5 w-14 mx-2 mb-4 rounded-full transition-all ${step > s.n ? "bg-amber-400" : "bg-zinc-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Banner Premium */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-200/60 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
              <Crown size={15} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-zinc-900">Plano Premium · 30 dias grátis</p>
              <p className="text-[9px] text-amber-600 font-bold uppercase tracking-wide">Sem cartão · Sem cobrança · Acesso imediato</p>
            </div>
          </div>
        </div>

        {/* ── STEP 1 ── */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Quem é você?</h1>
                <p className="text-zinc-500 text-sm font-medium">Seus dados pessoais para criar a conta.</p>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
                <InputField
                  icon={<User size={15} />}
                  label="Nome Completo"
                  required
                  placeholder="Nome e Sobrenome"
                  value={form.ownerName}
                  onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                />
                <InputField
                  icon={<Phone size={15} />}
                  label="Telefone / WhatsApp"
                  required
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  value={form.ownerPhone}
                  onChange={e => setForm(f => ({ ...f, ownerPhone: maskPhone(e.target.value) }))}
                />
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-1">
                    CPF <span className="text-zinc-300 font-medium normal-case">(opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><IdCard size={15} /></span>
                    <input
                      className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 h-12 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all placeholder:text-zinc-300"
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      value={form.ownerCpf}
                      onChange={e => setForm(f => ({ ...f, ownerCpf: maskCpf(e.target.value) }))}
                    />
                  </div>
                </div>

                <Button onClick={step1Next} fullWidth className="h-12 font-black bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl shadow-md" iconRight={<ArrowRight size={16} />}>
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Seu salão</h1>
                <p className="text-zinc-500 text-sm font-medium">Nome e o link exclusivo da sua agenda.</p>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
                <InputField
                  icon={<Building2 size={15} />}
                  label="Nome do Salão / Estúdio"
                  required
                  placeholder="Ex: Studio Elegance"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                />

                {/* Slug */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-1">
                    Endereço da agenda <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-0">
                    <div className="bg-zinc-100 border border-zinc-200 sm:border-r-0 rounded-xl sm:rounded-r-none px-3 h-12 flex items-center text-zinc-500 text-[11px] font-black shrink-0 whitespace-nowrap">
                      agendelle.com.br/
                    </div>
                    <div className="relative flex-1">
                      <input
                        className={`w-full bg-white border h-12 rounded-xl sm:rounded-l-none px-4 text-sm font-black text-zinc-900 focus:outline-none focus:ring-2 transition-all placeholder:text-zinc-300
                          ${slugStatus === "available" ? "border-emerald-400 focus:ring-emerald-400/30" :
                            slugStatus === "taken" ? "border-red-400 focus:ring-red-400/30" :
                            "border-zinc-200 focus:ring-amber-400/30 focus:border-amber-400"}`}
                        placeholder="seu-salao"
                        value={form.slug}
                        onChange={e => handleSlugChange(e.target.value)}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugStatus === "checking" && <RefreshCw size={13} className="text-zinc-400 animate-spin" />}
                        {slugStatus === "available" && <CheckCircle size={13} className="text-emerald-500" />}
                        {slugStatus === "taken" && <XCircle size={13} className="text-red-400" />}
                      </div>
                    </div>
                  </div>
                  {slugStatus === "available" && (
                    <p className="text-[10px] text-emerald-600 font-bold ml-1 mt-1.5 flex items-center gap-1"><CheckCircle size={9} /> Disponível!</p>
                  )}
                  {slugStatus === "taken" && (
                    <div className="mt-2">
                      <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1"><XCircle size={9} /> Já está em uso. Sugestões:</p>
                      {slugSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 ml-1 mt-1.5">
                          {slugSuggestions.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => { setForm(f => ({ ...f, slug: s })); setSlugStatus("available"); setSlugSuggestions([]); }}
                              className="text-[10px] font-black px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {slugStatus === "idle" && (
                    <p className="text-[10px] text-zinc-400 ml-1 mt-1.5 font-bold flex items-center gap-1">
                      <Star size={9} className="text-amber-400" /> Seus clientes agendam por este link
                    </p>
                  )}
                </div>

                <Button onClick={step2Next} fullWidth className="h-12 font-black bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl shadow-md" iconRight={<ArrowRight size={16} />}>
                  Continuar
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="text-center space-y-1.5">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Quase lá! 🎉</h1>
                <p className="text-zinc-500 text-sm font-medium">Crie seu e-mail e senha para acessar o sistema.</p>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
                {/* Email */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-1">
                    E-mail de Acesso <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                      type="email"
                      inputMode="email"
                      className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 h-12 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all placeholder:text-zinc-300"
                      placeholder="seu@email.com"
                      value={form.ownerEmail}
                      onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-1">
                    Senha <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                      type={showPass ? "text" : "password"}
                      className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-11 h-12 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all placeholder:text-zinc-300"
                      placeholder="••••••••"
                      value={form.adminPassword}
                      onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.adminPassword.length > 0 && (() => {
                    const { rules } = getPasswordStrength(form.adminPassword);
                    return (
                      <div className="mt-2 grid grid-cols-1 gap-1">
                        {rules.map((r, i) => (
                          <div key={i} className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors ${r.ok ? "text-emerald-600" : "text-zinc-400"}`}>
                            {r.ok ? <CheckCircle size={9} /> : <div className="w-2 h-2 rounded-full border border-zinc-300" />}
                            {r.label}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Confirmar senha */}
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5 ml-1">
                    Confirmar Senha <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Shield size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      className={`w-full bg-white border rounded-xl pl-10 pr-11 h-12 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 transition-all placeholder:text-zinc-300
                        ${form.confirmPassword && form.confirmPassword !== form.adminPassword ? "border-red-400 focus:ring-red-400/30" :
                          form.confirmPassword && form.confirmPassword === form.adminPassword ? "border-emerald-400 focus:ring-emerald-400/30" :
                          "border-zinc-200 focus:ring-amber-400/30 focus:border-amber-400"}`}
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowConfirmPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                      {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.confirmPassword !== form.adminPassword && (
                    <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">As senhas não coincidem</p>
                  )}
                  {form.confirmPassword && form.confirmPassword === form.adminPassword && (
                    <p className="text-[10px] text-emerald-600 font-bold ml-1 mt-1 flex items-center gap-1"><CheckCircle size={9} /> Senhas iguais</p>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  loading={loading}
                  fullWidth
                  className="h-12 font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 text-sm"
                >
                  Criar conta e começar grátis
                </Button>

                <p className="text-center text-[10px] text-zinc-400 leading-relaxed">
                  Ao criar a conta você concorda com os{" "}
                  <a href="#" className="underline text-zinc-600">Termos de Uso</a> e a{" "}
                  <a href="#" className="underline text-zinc-600">Política de Privacidade</a>.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust footer */}
        <div className="flex items-center justify-center gap-6 text-zinc-300 pb-4">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest">
            <Shield size={11} /> Ambiente Seguro
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest">
            <Lock size={11} /> Dados Criptografados
          </div>
        </div>
      </div>
    </div>
  );
}
