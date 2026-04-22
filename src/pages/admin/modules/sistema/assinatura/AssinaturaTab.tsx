import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/App";
import { cn } from "@/src/lib/utils";
import { 
  CreditCard, Check, Zap, Star, Shield, 
  Crown, ArrowRight, Clock, Banknote, 
  ChevronRight, AlertTriangle, HelpCircle,
  Gem, Rocket, Sparkles, Building2,
  Loader2
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { PageWrapper, SectionTitle } from "@/src/components/ui/PageWrapper";
import { Badge } from "@/src/components/ui/Badge";
import { motion, AnimatePresence } from "motion/react";
import { format, parseISO, differenceInDays } from "date-fns";
import { apiFetch } from "@/src/lib/api";


export function AssinaturaTab() {
  const { user: adminUser } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchPlans = async () => {
      try {
        console.log("Fetching plans from /api/admin/all-plans...");
        const res = await apiFetch("/api/admin/all-plans");

        console.log("Response status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("Plans data received:", data);
          setPlans(data);
        } else {
          const errorData = await res.json().catch(() => ({}));
          console.error("Failed to fetch plans:", errorData);
        }
      } catch (err) {
        console.error("Erro ao carregar planos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);


  const isTrial = adminUser?.planName?.toLowerCase().includes("trial") || adminUser?.planName?.toLowerCase().includes("teste");
  const expiresAt = adminUser?.tenantExpiresAt;
  const daysLeft = expiresAt ? differenceInDays(parseISO(expiresAt), new Date()) : 0;
  const isUrgent = expiresAt && daysLeft < 7;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-amber-500" size={40} />
        <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Carregando Planos...</p>
      </div>
    );
  }

  return (
    <PageWrapper className="pb-32">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">

        {/* ── CARD PLANO ATUAL ── */}
        <div className="relative">
           <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-blue-500/10 blur-xl opacity-50 rounded-[40px]" />
           <div className="relative bg-white rounded-[40px] border border-zinc-200 p-6 md:p-10 shadow-2xl overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center text-white shadow-xl shadow-zinc-900/20">
                       <Crown size={32} />
                    </div>
                    <div>
                       <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Plano {adminUser?.planName || "Personalizado"}</h3>
                          <Badge color="success" className="px-3 py-1 font-black uppercase text-[10px]">Ativo</Badge>
                       </div>
                       <p className="text-zinc-400 font-bold text-xs mt-1 uppercase tracking-widest">
                          {isTrial ? "Você está no período de teste" : "Assinatura Profissional Ativa"}
                       </p>
                    </div>
                 </div>

                 <div className="w-full md:w-px h-px md:h-16 bg-zinc-100 hidden md:block" />

                 <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                       <Clock size={16} className={cn(isUrgent ? "text-rose-500" : "text-zinc-400")} />
                       <span className="text-sm font-black text-zinc-900">
                          {expiresAt ? `${daysLeft} dias restantes` : "Acesso Vitalício"}
                       </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                       {expiresAt ? `Expira em ${format(parseISO(expiresAt), "dd/MM/yyyy")}` : "Renovação automática desativada"}
                    </p>
                 </div>

                 <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">
                    Minhas Faturas
                 </Button>
              </div>

              {isUrgent && (
                <div className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 animate-pulse">
                   <AlertTriangle size={20} />
                   <p className="text-[10px] font-black uppercase tracking-widest">Sua assinatura expira em breve. Renove agora para evitar a interrupção do serviço.</p>
                </div>
              )}
           </div>
        </div>

        {/* ── GRID DE PLANOS DINÂMICOS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {plans.map((plan, idx) => {
             const isPopular = idx === 1; 
             const planPrice = plan.price;
             let features: string[] = [];
             try {
                features = typeof plan.features === "string" ? JSON.parse(plan.features) : (Array.isArray(plan.features) ? plan.features : []);
             } catch (e) {
                features = ["Gestão de Agenda", "Clientes ilimitados", "Relatórios Financeiros"];
             }

             // Add dynamic features to the list for display
             const displayFeatures = [...features];
             if (plan.systemBotEnabled) displayFeatures.unshift("Bot Agendelle (Notificações)");
             if (plan.qrCodeBotEnabled) displayFeatures.unshift("Bot Próprio (Conectar WhatsApp)");
             if (plan.siteEnabled) displayFeatures.unshift("Site / Vitrine Digital");
             if (plan.agendaExternaEnabled) displayFeatures.unshift("Link de Agendamento Online");
             
              const isCurrentPlan = adminUser?.planName?.toLowerCase() === plan.name.toLowerCase();
              
              return (
                <motion.div 
                  key={plan.id}
                  whileHover={{ y: -5 }}
                  className={cn(
                    "bg-white rounded-[40px] border p-8 relative flex flex-col transition-all",
                    isCurrentPlan ? "border-amber-500 shadow-2xl shadow-amber-200/40 scale-[1.02] z-10" : 
                    isPopular ? "border-zinc-300 shadow-xl" : "border-zinc-200 shadow-xl hover:border-zinc-300"
                  )}
                >
                  {isCurrentPlan ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg flex items-center gap-2">
                      <Star size={12} className="fill-white" /> Seu Plano Atual
                    </div>
                  ) : isPopular ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg">
                      Mais Procurado
                    </div>
                  ) : null}

                  <div className="mb-8">
                     <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
                       isCurrentPlan ? "bg-amber-500 text-white" : isPopular ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900"
                     )}>
                        {idx === 0 ? <Rocket size={24} /> : (idx === 1 ? <Zap size={24} /> : <Crown size={24} />)}
                     </div>
                     <h4 className="text-xl font-black text-zinc-900">{plan.name}</h4>
                     <p className="text-[11px] text-zinc-400 font-bold mt-2 leading-relaxed uppercase tracking-widest">
                       {plan.maxProfessionals === 999 ? "Profissionais Ilimitados" : `Até ${plan.maxProfessionals} Profissionais`}
                     </p>
                  </div>

                  <div className="mb-10">
                     <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-zinc-400">R$</span>
                        <span className="text-5xl font-black text-zinc-900 tracking-tighter">
                          {Math.floor(planPrice)}
                        </span>
                        <span className="text-sm font-bold text-zinc-400">/mês</span>
                     </div>
                  </div>

                  <div className="space-y-4 mb-10 flex-1">
                     {displayFeatures.map((feature, i) => (
                       <div key={i} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                             <Check size={12} className="text-white" />
                          </div>
                          <span className="text-xs font-bold text-zinc-600">{feature}</span>
                       </div>
                     ))}
                  </div>

                  <Button 
                    variant={isCurrentPlan ? "primary" : isPopular ? "outline" : "secondary"}
                    className={cn(
                       "h-14 w-full rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl",
                       isCurrentPlan && "opacity-50 pointer-events-none"
                    )}
                  >
                    {isCurrentPlan ? "Plano Ativo" : "Selecionar Plano"}
                  </Button>
               </motion.div>
             );
           })}
        </div>

        {/* ── PACOTES ADICIONAIS & SEGURANÇA ── */}
        <div className="flex flex-col gap-8">
           {/* Item Dinâmico: Profissional Adicional */}
           {plans.find(p => p.name.toLowerCase() === adminUser?.planName?.toLowerCase())?.priceExtraProfessional > 0 && (
             <div className="bg-amber-50/50 rounded-[40px] border border-amber-200 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all w-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                   <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-xl shadow-amber-200">
                      <Building2 size={28} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-zinc-900 tracking-tight">Profissionais Adicionais</h3>
                      <p className="text-[11px] text-zinc-500 font-bold uppercase mt-1 tracking-widest">Aumente o limite da sua equipe sob demanda</p>
                   </div>
                </div>
                <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                   <div className="text-center md:text-right flex-1 md:flex-none">
                     <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Valor por profissional</p>
                     <span className="text-2xl font-black text-zinc-900">
                        R$ {plans.find(p => p.name.toLowerCase() === adminUser?.planName?.toLowerCase())?.priceExtraProfessional.toFixed(2)}
                     </span>
                     <span className="text-xs font-bold text-zinc-400">/mês</span>
                   </div>
                   <Button variant="primary" className="h-14 px-8 rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl">
                      Adicionar
                   </Button>
                </div>
             </div>
           )}

           {/* ── SECURITY BANNER ── */}
           <div className="bg-zinc-900 rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden w-full flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/10 blur-[120px] rounded-full pointer-events-none" />
              
              <div className="relative z-10 flex items-start md:items-center gap-6 md:gap-8 max-w-3xl">
                 <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shrink-0">
                    <Shield size={32} className="text-amber-500" />
                 </div>
                 <div>
                   <h3 className="text-2xl md:text-3xl font-black tracking-tight leading-tight mb-3">Transações 100% Seguras</h3>
                   <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                      Suas informações de pagamento são processadas com criptografia militar de ponta a ponta via Stripe®.
                      Faturamento automatizado e relatórios transparentes para o seu negócio.
                   </p>
                 </div>
              </div>
              
              <div className="relative z-10 flex flex-wrap gap-6 items-center opacity-50 grayscale invert md:justify-end">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-8" alt="Stripe" />
                 <div className="w-px h-8 bg-white/20" />
                 <CreditCard size={28} />
                 <Lock size={28} />
              </div>
           </div>
        </div>

        {/* ── FOOTER FAQ ── */}
        <div className="text-center pt-10">
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">
              <HelpCircle size={14} /> Precisa de Ajuda?
           </div>
           <p className="text-sm text-zinc-400 font-bold">Fale com nosso suporte para planos personalizados ou dúvidas comerciais.</p>
        </div>

      </div>
    </PageWrapper>
  );
}

function Lock({ size, className }: { size?: number, className?: string }) {
  return <Shield size={size} className={className} />;
}

