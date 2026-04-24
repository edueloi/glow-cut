import React, { useState, useEffect } from "react";
import { useAuth } from "@/src/App";
import { cn } from "@/src/lib/utils";
import { 
  CreditCard, Check, Zap, Star, Shield, 
  Crown, ArrowRight, Clock, Banknote, 
  ChevronRight, AlertTriangle, HelpCircle,
  Gem, Rocket, Sparkles, Building2,
  Loader2, Lock
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
        const res = await apiFetch("/api/admin/all-plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
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
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="animate-spin text-amber-500" size={32} />
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Carregando Planos...</p>
      </div>
    );
  }

  return (
    <PageWrapper className="pb-16 pt-2">
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">

        {/* ── CARD PLANO ATUAL ── */}
        <div className="relative">
           <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/5 via-violet-500/5 to-blue-500/5 blur-xl opacity-30 rounded-[32px]" />
           <div className="relative bg-white rounded-[32px] border border-zinc-200 p-6 md:px-8 md:py-6 shadow-xl overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-900/10">
                       <Crown size={24} />
                    </div>
                    <div>
                       <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-zinc-900 tracking-tight">Plano {adminUser?.planName || "Personalizado"}</h3>
                          <Badge color="success" className="px-2 py-0.5 font-black uppercase text-[9px]">Ativo</Badge>
                       </div>
                       <p className="text-zinc-400 font-bold text-[10px] mt-0.5 uppercase tracking-widest">
                          {isTrial ? "Período de teste" : "Assinatura Ativa"}
                       </p>
                    </div>
                 </div>

                 <div className="w-full md:w-px h-px md:h-10 bg-zinc-100 hidden md:block" />

                 <div className="flex items-center gap-4">
                    <div className="text-right">
                       <div className="flex items-center justify-end gap-1.5">
                          <Clock size={14} className={cn(isUrgent ? "text-rose-500" : "text-zinc-400")} />
                          <span className="text-xs font-black text-zinc-900">
                             {expiresAt ? `${daysLeft} dias restantes` : "Acesso Vitalício"}
                          </span>
                       </div>
                       <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                          {expiresAt ? `Expira em ${format(parseISO(expiresAt), "dd/MM/yyyy")}` : "Sem renovação"}
                       </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest border">
                       Faturas
                    </Button>
                 </div>
              </div>

              {isUrgent && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600">
                   <AlertTriangle size={16} />
                   <p className="text-[9px] font-black uppercase tracking-widest">Sua assinatura expira em breve. Renove agora para evitar interrupções.</p>
                </div>
              )}
           </div>
        </div>

        {/* ── GRID DE PLANOS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
           {plans.map((plan, idx) => {
             const isPopular = idx === 1; 
             const planPrice = plan.price;
             let features: string[] = [];
             try {
                features = typeof plan.features === "string" ? JSON.parse(plan.features) : (Array.isArray(plan.features) ? plan.features : []);
             } catch (e) {
                features = ["Gestão de Agenda", "Clientes ilimitados", "Financeiro"];
             }

             const displayFeatures = [...features];
             if (plan.systemBotEnabled) displayFeatures.unshift("Bot Notificações");
             if (plan.qrCodeBotEnabled) displayFeatures.unshift("Bot Próprio (WhatsApp)");
             if (plan.siteEnabled) displayFeatures.unshift("Site / Vitrine Digital");
             
              const isCurrentPlan = adminUser?.planName?.toLowerCase() === plan.name.toLowerCase();
             const checkoutUrl = plan.stripePaymentLink
               ? `${plan.stripePaymentLink}?prefilled_email=${encodeURIComponent(adminUser?.email || "")}`
               : null;

              return (
                <motion.div 
                  key={plan.id}
                  whileHover={{ y: -3 }}
                  className={cn(
                    "bg-white rounded-[32px] border p-6 relative flex flex-col transition-all",
                    isCurrentPlan ? "border-amber-500 shadow-xl shadow-amber-100/50" : 
                    isPopular ? "border-zinc-300 shadow-md" : "border-zinc-200 shadow-md hover:border-zinc-300"
                  )}
                >
                  {isCurrentPlan ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                      Seu Plano
                    </div>
                  ) : isPopular ? (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                      Popular
                    </div>
                  ) : null}

                  <div className="mb-6 flex items-center gap-4">
                     <div className={cn(
                       "w-10 h-10 rounded-xl flex items-center justify-center shadow-md",
                       isCurrentPlan ? "bg-amber-500 text-white" : isPopular ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900"
                     )}>
                        {idx === 0 ? <Rocket size={18} /> : (idx === 1 ? <Zap size={18} /> : <Crown size={18} />)}
                     </div>
                     <div>
                        <h4 className="text-base font-black text-zinc-900 leading-none">{plan.name}</h4>
                        <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-tighter">
                          {plan.maxProfessionals === 999 ? "Equipe Ilimitada" : `Até ${plan.maxProfessionals} Prof.`}
                        </p>
                     </div>
                  </div>

                  <div className="mb-6">
                     <div className="flex items-baseline gap-0.5">
                        <span className="text-xs font-black text-zinc-400">R$</span>
                        <span className="text-3xl font-black text-zinc-900 tracking-tighter">
                          {Math.floor(planPrice)}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400">/mês</span>
                     </div>
                  </div>

                  <div className="space-y-2.5 mb-8 flex-1">
                     {displayFeatures.slice(0, 7).map((feature, i) => (
                       <div key={i} className="flex items-center gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                             <Check size={10} className="text-white" />
                          </div>
                          <span className="text-[11px] font-bold text-zinc-600 truncate">{feature}</span>
                       </div>
                     ))}
                  </div>

                  {isCurrentPlan ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-11 w-full rounded-xl font-black uppercase text-[9px] tracking-widest shadow-md opacity-50 pointer-events-none"
                    >
                      Ativo
                    </Button>
                  ) : checkoutUrl ? (
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center justify-center h-11 w-full rounded-xl font-black uppercase text-[9px] tracking-widest shadow-md transition-opacity hover:opacity-90",
                        isPopular
                          ? "bg-white border border-zinc-300 text-zinc-900"
                          : "bg-zinc-100 text-zinc-900"
                      )}
                    >
                      Selecionar
                    </a>
                  ) : (
                    <Button
                      variant={isPopular ? "outline" : "secondary"}
                      size="sm"
                      disabled
                      className="h-11 w-full rounded-xl font-black uppercase text-[9px] tracking-widest shadow-md opacity-40 cursor-not-allowed"
                      title="Em breve"
                    >
                      Em breve
                    </Button>
                  )}
                </motion.div>
              );
            })}
        </div>

        {/* ── PACOTES ADICIONAIS ── */}
        <div className="flex flex-col gap-5">
           {plans.find(p => p.name.toLowerCase() === adminUser?.planName?.toLowerCase())?.priceExtraProfessional > 0 && (
             <div className="bg-amber-50/40 rounded-[32px] border border-amber-200/50 p-5 md:px-8 md:py-5 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10">
                   <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200/50">
                      <Building2 size={24} />
                   </div>
                   <div>
                      <h3 className="text-base font-black text-zinc-900 tracking-tight">Equipe sob demanda</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5 tracking-tight">Adicione mais profissionais ao seu limite atual</p>
                   </div>
                </div>
                <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                   <div className="text-right flex-1 md:flex-none">
                      <span className="text-xl font-black text-zinc-900">
                         R$ {plans.find(p => p.name.toLowerCase() === adminUser?.planName?.toLowerCase())?.priceExtraProfessional.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 ml-1">/mês cada</span>
                   </div>
                   <Button variant="primary" size="sm" className="h-11 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest">
                      Adicionar
                   </Button>
                </div>
             </div>
           )}

           {/* ── SECURITY BANNER ── */}
           <div className="bg-zinc-900 rounded-[32px] p-6 md:px-10 md:py-8 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-6">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shrink-0">
                    <Shield size={24} className="text-amber-500" />
                 </div>
                 <div>
                   <h3 className="text-lg font-black tracking-tight leading-none mb-1">Pagamento Seguro</h3>
                   <p className="text-zinc-400 text-[11px] leading-relaxed font-medium max-w-xl">
                      Criptografia ponta a ponta via Stripe®. Relatórios transparentes e cancelamento a qualquer momento.
                   </p>
                 </div>
              </div>
              
              <div className="relative z-10 flex gap-5 items-center opacity-40 grayscale invert shrink-0">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-5" alt="Stripe" />
                 <CreditCard size={20} />
                 <Lock size={20} />
              </div>
           </div>
        </div>

        {/* ── FOOTER FAQ ── */}
        <div className="text-center pt-4">
           <p className="text-[11px] text-zinc-400 font-bold flex items-center justify-center gap-2">
              <HelpCircle size={14} className="text-zinc-300" /> 
              Precisa de ajuda? Fale com nosso suporte comercial.
           </p>
        </div>

      </div>
    </PageWrapper>
  );
}


