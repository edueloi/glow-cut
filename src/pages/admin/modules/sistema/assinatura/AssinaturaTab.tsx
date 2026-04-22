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

const PACKAGES = [
  { id: "sms_pack", name: "Pacote 500 WhatsApp", price: 49.90, icon: Sparkles, detail: "Disparos de notificações" },
  { id: "custom_domain", name: "Domínio Próprio (.com.br)", price: 69.00, icon: Gem, detail: "Renovação anual" },
];

export function AssinaturaTab() {
  const { user: adminUser } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

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
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <SectionTitle 
            title="Assinatura & Planos" 
            description="Gerencie sua conta e descubra novos recursos para o seu negócio." 
            icon={CreditCard}
          />
          
          <div className="flex bg-zinc-100 p-1 rounded-2xl w-fit self-start lg:self-center">
             <button 
               onClick={() => setBillingCycle("monthly")}
               className={cn(
                 "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                 billingCycle === "monthly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
               )}
             >
               Mensal
             </button>
             <button 
               onClick={() => setBillingCycle("yearly")}
               className={cn(
                 "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                 billingCycle === "yearly" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
               )}
             >
               Anual
               <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">-20%</span>
             </button>
          </div>
        </div>

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
             const planPrice = billingCycle === "yearly" ? (plan.price * 0.8) : plan.price;
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
             
             return (
               <motion.div 
                 key={plan.id}
                 whileHover={{ y: -5 }}
                 className={cn(
                   "bg-white rounded-[40px] border p-8 relative flex flex-col transition-all",
                   isPopular ? "border-amber-500 shadow-2xl shadow-amber-200/40" : "border-zinc-200 shadow-xl hover:border-zinc-300"
                 )}
               >
                  {isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-lg">
                      Mais Procurado
                    </div>
                  )}

                  <div className="mb-8">
                     <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
                       isPopular ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-900"
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
                     {billingCycle === "yearly" && (
                       <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-2">
                          Economia de R$ {(plan.price * 0.2 * 12).toFixed(0)} no ano
                       </p>
                     )}
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
                    variant={isPopular ? "primary" : "secondary"}
                    className={cn(
                       "h-14 w-full rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl",
                       adminUser?.planName?.toLowerCase() === plan.name.toLowerCase() && "opacity-50 pointer-events-none"
                    )}
                  >
                    {adminUser?.planName?.toLowerCase() === plan.name.toLowerCase() ? "Plano Atual" : "Selecionar Plano"}
                  </Button>
               </motion.div>
             );
           })}
        </div>

        {/* ── PACOTES ADICIONAIS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
           <div className="space-y-6">
              <div className="px-2">
                 <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Serviços & Upgrades</h3>
                 <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-widest">Potencialize seu estúdio com recursos extras.</p>
              </div>
              <div className="space-y-3">
                 {/* Item Dinâmico: Profissional Adicional */}
                 {plans.find(p => p.name.toLowerCase() === adminUser?.planName?.toLowerCase())?.priceExtraProfessional > 0 && (
                   <div className="bg-white rounded-[28px] border border-amber-100 p-5 flex items-center justify-between hover:border-amber-300 hover:shadow-xl transition-all group bg-amber-50/10">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                            <Building2 size={18} />
                         </div>
                         <div>
                            <p className="text-xs font-black text-zinc-900">Profissional Adicional</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase">Aumente o limite da sua equipe</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className="text-sm font-black text-zinc-900">
                            R$ {plans.find(p => p.name.toLowerCase() === adminUser?.planName?.toLowerCase())?.priceExtraProfessional.toFixed(2)}
                         </span>
                         <button className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white hover:bg-amber-600 transition-all border border-transparent">
                            <ArrowRight size={18} />
                         </button>
                      </div>
                   </div>
                 )}

                 {PACKAGES.map((pkg) => (
                   <div key={pkg.id} className="bg-white rounded-[28px] border border-zinc-100 p-5 flex items-center justify-between hover:border-zinc-300 hover:shadow-xl transition-all group">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all">
                            <pkg.icon size={18} />
                         </div>
                         <div>
                            <p className="text-xs font-black text-zinc-900">{pkg.name}</p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase">{pkg.detail}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className="text-sm font-black text-zinc-900">R$ {pkg.price.toFixed(2)}</span>
                         <button className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all border border-transparent">
                            <ArrowRight size={18} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>


           <div className="bg-zinc-900 rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
              <div className="relative z-10 space-y-6">
                 <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 border border-white/10">
                    <Shield size={28} className="text-amber-500" />
                 </div>
                 <h3 className="text-3xl font-black tracking-tight leading-tight">Transações 100% Seguras</h3>
                 <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                    Suas informações de pagamento são processadas com criptografia de ponta a ponta via Stripe®.
                    Gerencie faturas e cartões com total transparência.
                 </p>
                 <div className="pt-6 flex flex-wrap gap-4 items-center opacity-40 grayscale invert">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" className="h-6" alt="Stripe" />
                    <div className="w-px h-6 bg-white/20 mx-2" />
                    <CreditCard size={24} />
                    <Lock size={24} />
                 </div>
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

