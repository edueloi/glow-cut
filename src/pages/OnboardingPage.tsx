import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Scissors, 
  ArrowRight, 
  CheckCircle2, 
  Store,
  Layout,
  Wind,
  Flower2,
  Droplets
} from "lucide-react";
import { Button, Input, ContentCard, useToast } from "@/src/components/ui";
import { apiFetch } from "@/src/lib/api";
import { useAuth } from "@/src/App";

// ── CUSTOM ICONS ─────────────────────────────────────────────────────────────
const HairDryerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M14 5H7a4 4 0 1 0 0 8h7V5z" />
    <path d="M14 5h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4V5z" />
    <path d="M10 13v6" />
  </svg>
);

const NailPolishIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="9" y="3" width="6" height="5" rx="1" />
    <rect x="7" y="8" width="10" height="12" rx="3" />
    <path d="M12 12v3" />
  </svg>
);

const LotusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M12 22s-4-3-4-8 4-6 4-6 4 1 4 6-4 8-4 8z" />
    <path d="M12 22c-4 0-8-2-8-6s6-7 8-7 8 3 8 7-4 6-8 6z" />
  </svg>
);

const SEGMENTS = [
  { id: "barbearia", name: "Barbearia", icon: <Scissors className="w-6 h-6" />, desc: "Foco em cortes masculinos, barba e estilo." },
  { id: "salao", name: "Salão de Beleza", icon: <HairDryerIcon />, desc: "Cabelo, maquiagem e tratamentos femininos." },
  { id: "nail", name: "Esmalteria / Nail", icon: <NailPolishIcon />, desc: "Manicure, pedicure e alongamentos." },
  { id: "outros", name: "Estética / Outros", icon: <LotusIcon />, desc: "Clínicas de estética, sobrancelhas e spa." },
];

const COLORS = [
  { id: "gold",    value: "#c9a96e", name: "Dourado Agendelle" },
  { id: "amber",   value: "#f59e0b", name: "Âmbar Vibrante" },
  { id: "orange",  value: "#f97316", name: "Laranja Energético" },
  { id: "crimson", value: "#e11d48", name: "Carmesim" },
  { id: "rose",    value: "#fb7185", name: "Rosa Elegante" },
  { id: "fuchsia", value: "#d946ef", name: "Fúcsia Moderno" },
  { id: "purple",  value: "#7c3aed", name: "Roxo" },
  { id: "indigo",  value: "#4f46e5", name: "Índigo Real" },
  { id: "blue",    value: "#2563eb", name: "Azul Oceano" },
  { id: "sky",     value: "#0ea5e9", name: "Céu Limpo" },
  { id: "teal",    value: "#0d9488", name: "Teal Sofisticado" },
  { id: "emerald", value: "#10b981", name: "Verde Esmeralda" },
  { id: "lime",    value: "#84cc16", name: "Lima Fresh" },
  { id: "slate",   value: "#334155", name: "Cinza Slate" },
  { id: "zinc",    value: "#09090b", name: "Preto Absoluto" },
];

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    segment: user?.segment || "",
    themeColor: user?.themeColor || "#c9a96e",
    name: user?.tenantName || "",
  });

  // Se já completou o onboarding básico, redireciona
  useEffect(() => {
    if (user && user.onboardingStep >= 3) {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  const updateProgress = async (nextStep: number, extraData = {}) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/onboarding/update", {
        method: "POST",
        body: JSON.stringify({ 
          onboardingStep: nextStep,
          ...formData,
          ...extraData
        })
      });
      
      if (!res.ok) throw new Error("Erro ao salvar");
      
      await refreshUser();
      setStep(nextStep);
    } catch (err) {
      toast.error("Não foi possível salvar seu progresso.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    // Marca como concluído (passo 3+)
    await updateProgress(3);
    toast.success("Configurações iniciais salvas com sucesso.");
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md sm:max-w-3xl relative z-10">
        
        {/* Logo Top */}
        <div className="flex justify-center mb-10">
           <div className="w-14 h-14 bg-amber-500 rounded-[20px] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-amber-500/20 animate-in fade-in zoom-in duration-700">
             A
           </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-12 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                step >= i ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30" : "bg-zinc-200 text-zinc-400"
              }`}>
                {step > i ? <CheckCircle2 size={20} /> : <span className="font-bold">{i}</span>}
              </div>
              {i < 3 && (
                <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-700 ${
                  step > i ? "bg-amber-500" : "bg-zinc-200"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome & Segment */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">Seja muito bem-vindo!</h1>
              <p className="text-zinc-500 text-base sm:text-lg">Para começar, qual o segmento do seu negócio?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFormData({ ...formData, segment: s.id })}
                  className={`flex items-start gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 text-left transition-all group ${
                    formData.segment === s.id 
                      ? "border-amber-500 bg-amber-50/50 shadow-xl shadow-amber-500/10" 
                      : "border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-md"
                  }`}
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors ${
                    formData.segment === s.id ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
                  }`}>
                    {s.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900">{s.name}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed mt-1">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <Button 
                size="lg" 
                disabled={!formData.segment || loading}
                loading={loading}
                onClick={() => updateProgress(2)}
                iconRight={<ArrowRight size={18} />}
                className="px-8 sm:px-12 h-12 sm:h-14 rounded-2xl text-base sm:text-lg shadow-xl shadow-amber-500/20"
              >
                Próximo Passo
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Branding */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">Identidade do Estúdio</h1>
              <p className="text-zinc-500 text-base sm:text-lg">Como sua marca deve aparecer para seus clientes?</p>
            </div>

            <ContentCard padding="lg" className="shadow-2xl shadow-zinc-200/50 rounded-[40px]">
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                  <Input 
                    placeholder="Ex: Barber Shop Imperial"
                    iconLeft={<Store size={18} />}
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="h-12 sm:h-14 text-base sm:text-lg font-bold rounded-2xl"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Cor do Painel & Site</label>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {COLORS.map((c) => (
                      <button
                        key={c.id}
                        title={c.name}
                        onClick={() => setFormData({ ...formData, themeColor: c.value })}
                        className={`w-14 h-14 rounded-2xl transition-all relative flex items-center justify-center border-2 ${
                          formData.themeColor === c.value 
                            ? "scale-110 shadow-lg border-white ring-2 ring-amber-500/20" 
                            : "border-transparent hover:scale-105 opacity-80"
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {formData.themeColor === c.value && (
                          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-white">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </button>
                    ))}

                    {/* Custom Color Picker */}
                    <div className="relative group">
                      <input
                        type="color"
                        value={formData.themeColor}
                        onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                        className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-zinc-200 bg-white p-1 transition-all hover:border-amber-500 hover:shadow-md"
                      />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        Outra Cor
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                  <Button variant="ghost" className="h-12 sm:h-14 rounded-2xl text-zinc-400" onClick={() => setStep(1)} fullWidth>Voltar</Button>
                  <Button 
                    size="lg" 
                    loading={loading}
                    onClick={handleFinish}
                    className="h-12 sm:h-14 rounded-2xl text-sm sm:text-lg shadow-xl shadow-amber-500/20"
                    fullWidth
                  >
                    Finalizar Configuração
                  </Button>
                </div>
              </div>
            </ContentCard>

            <div className="bg-amber-50 border border-amber-100 p-5 sm:p-6 rounded-[32px] flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Layout size={24} />
              </div>
              <p className="text-sm text-amber-900 font-medium leading-relaxed text-center sm:text-left">
                <strong>Dica:</strong> Você poderá alterar essas informações e adicionar sua logo a qualquer momento no painel de configurações.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Footer Branding */}
      <div className="mt-12 mb-4 w-full flex justify-center opacity-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
            A
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-900">Agendelle</span>
        </div>
      </div>
    </div>
  );
}
