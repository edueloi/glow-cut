import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  Save,
  Target,
  Eye,
  Heart,
  Layout,
  Image as ImageIcon,
  Palette,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Phone,
  FileText,
  Hash,
  MapPin,
  Star,
  Upload,
  X,
  Camera,
  Images,
  Trash2,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input, Textarea } from "@/src/components/ui/Input";
import { PageWrapper, SectionTitle, FormRow } from "@/src/components/ui/PageWrapper";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { Switch } from "@/src/components/ui/Switch";
import { useToast } from "@/src/components/ui/Toast";
import { apiFetch } from "@/src/lib/api";
import { Badge } from "@/src/components/ui/Badge";
import { cn } from "@/src/lib/utils";
import { Loader2, CheckCircle2 } from "lucide-react";

// ── Mobile Preview Component ─────────────────────────────────────────────
function MobileSitePreview({ 
  data 
}: { 
  data: any;
}) {
  const themeColor = data.themeColor || "#c9a96e";
  const isDark = data.siteTemplate === "dark";
  const isBold = data.siteTemplate === "bold";
  
  return (
    <div className="relative mx-auto w-[280px] h-[580px] bg-zinc-950 rounded-[3rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden hidden 2xl:block sticky top-8 animate-in slide-in-from-right-4 duration-700">

      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-b-2xl z-40" />
      
      {/* Status Bar Mock */}
      <div className="absolute top-0 left-0 w-full h-6 bg-transparent flex items-center justify-between px-6 z-30 pointer-events-none">
        <span className={`text-[10px] font-bold ${isDark ? "text-white/40" : "text-black/40"}`}>9:41</span>
        <div className="flex gap-1">
          <div className={`w-3 h-1.5 rounded-[2px] ${isDark ? "bg-white/40" : "bg-black/40"}`} />
          <div className={`w-3 h-1.5 rounded-[2px] ${isDark ? "bg-white/40" : "bg-black/40"}`} />
          <div className={`w-5 h-1.5 rounded-[2px] ${isDark ? "bg-white/40" : "bg-black/40"}`} />
        </div>
      </div>

      <div className={`h-full w-full overflow-y-auto overflow-x-hidden pt-0 scrollbar-none transition-colors duration-500 ${isDark ? "bg-zinc-950 text-white" : "bg-white text-zinc-900"}`}>
        {/* Hero Section */}
        <div className={`relative h-44 w-full overflow-hidden ${isBold ? "flex flex-col items-center justify-center text-center px-4" : ""}`}>
          {!isBold && (
            <>
              {data.siteCoverUrl ? (
                <img src={data.siteCoverUrl} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
                  <ImageIcon className="text-zinc-300" size={24} />
                </div>
              )}
              <div className={`absolute inset-0 ${isDark ? "bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" : "bg-gradient-to-t from-black/80 via-black/20 to-transparent"}`} />
            </>
          )}

          {isBold && (
            <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at top right, ${themeColor}, transparent)` }} />
          )}
          
          <div className={`${isBold ? "relative z-10" : "absolute bottom-4 left-4 right-4 text-white"}`}>
            <div className={`w-12 h-12 rounded-xl border p-1.5 mb-2 overflow-hidden mx-auto ${isBold ? "bg-zinc-100 border-zinc-200" : "bg-white/10 backdrop-blur-md border-white/20"}`}>
              {data.logoUrl ? (
                <img src={data.logoUrl} className="w-full h-full object-contain" alt="Logo" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-[10px] font-black italic ${isBold ? "text-zinc-300" : "text-white/20"}`}>
                  LOGO
                </div>
              )}
            </div>
            <h1 className={`text-sm font-black leading-tight drop-shadow-md ${isBold ? "text-zinc-900" : "text-white"}`}>
              {data.title || "Seu Negócio"}
            </h1>
            <p className={`text-[9px] line-clamp-2 mt-0.5 font-medium leading-relaxed ${isBold ? "text-zinc-500" : "text-white/70"}`}>
              {data.welcomeMessage || "Sua frase de impacto aparecerá aqui."}
            </p>
          </div>
        </div>

        {/* Info Strip */}
        <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors ${isDark ? "bg-zinc-900/50 border-white/5" : "bg-zinc-50/50 border-zinc-100"}`}>
          <div className="flex gap-3">
             <div className="flex flex-col items-center">
                <span className={`text-[10px] font-black leading-none ${isDark ? "text-white" : "text-zinc-900"}`}>{data.experienceYears || "10+"}</span>
                <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">Anos</span>
             </div>
             <div className={`w-px h-6 ${isDark ? "bg-white/5" : "bg-zinc-200"}`} />
             <div className="flex flex-col items-center">
                <span className={`text-[10px] font-black leading-none ${isDark ? "text-white" : "text-zinc-900"}`}>4.9</span>
                <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-tighter">Estrelas</span>
             </div>
          </div>
          <button 
            className="px-3 py-1.5 rounded-lg text-[9px] font-black text-white shadow-lg shadow-zinc-950/10 transition-transform active:scale-95"
            style={{ backgroundColor: themeColor }}
          >
            AGENDAR
          </button>
        </div>

        {/* Features Row */}
        <div className="p-4 grid grid-cols-3 gap-2">
          {[
            { t: data.feature1Title || "Qualidade", d: "Feature 1" },
            { t: data.feature2Title || "Ambiente", d: "Feature 2" },
            { t: data.feature3Title || "Equipe", d: "Feature 3" }
          ].map((f, i) => (
            <div key={i} className={`flex flex-col items-center text-center p-2 rounded-xl border transition-colors ${isDark ? "bg-white/5 border-white/5" : "bg-zinc-50 border-zinc-100"}`}>
              <div className={`w-6 h-6 rounded-lg shadow-sm flex items-center justify-center mb-1.5 ${isDark ? "bg-zinc-800" : "bg-white"}`}>
                <CheckCircle size={10} style={{ color: themeColor }} />
              </div>
              <span className={`text-[8px] font-black leading-tight truncate w-full ${isDark ? "text-zinc-300" : "text-zinc-800"}`}>{f.t}</span>
            </div>
          ))}
        </div>

        {/* About Section */}
        <div className="p-4 space-y-3">
          <h2 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
            <div className="w-1 h-3 rounded-full" style={{ backgroundColor: themeColor }} />
            {data.aboutTitle || "Quem Somos"}
          </h2>
          <div className="flex gap-3 items-start">
            <div className={`w-20 h-24 rounded-xl overflow-hidden shrink-0 border transition-colors ${isDark ? "bg-zinc-800 border-white/5" : "bg-zinc-100 border-zinc-200"}`}>
              {data.coverUrl ? (
                <img src={data.coverUrl} className="w-full h-full object-cover" alt="About" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={14} className="text-zinc-300" />
                </div>
              )}
            </div>
            <p className={`text-[9px] leading-relaxed font-medium italic line-clamp-5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              "{data.description || "Adicione uma breve descrição sobre a sua história e seus diferenciais para seus clientes."}"
            </p>
          </div>
        </div>

        {/* Quick Services Mock */}
        {data.showServices && (
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className={`text-[11px] font-black uppercase tracking-widest ${isDark ? "text-white" : "text-zinc-900"}`}>Serviços</h2>
              <span className="text-[8px] font-bold text-zinc-400">Ver todos</span>
            </div>
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${isDark ? "bg-white/5 border-white/5" : "bg-white border-zinc-100"}`}>
                  <div className="flex gap-2.5 items-center">
                    <div className={`w-8 h-8 rounded-lg ${isDark ? "bg-zinc-800" : "bg-zinc-50 border border-zinc-100"}`} />
                    <div className="flex flex-col">
                      <div className={`h-2 w-16 rounded-full mb-1 ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`} />
                      <div className={`h-1.5 w-10 rounded-full ${isDark ? "bg-zinc-900" : "bg-zinc-50"}`} />
                    </div>
                  </div>
                  <div className={`h-3 w-8 rounded-lg ${isDark ? "bg-zinc-800" : "bg-zinc-50"}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location & Contact */}
        <div className={`p-4 mt-2 space-y-4 transition-colors ${isDark ? "bg-black" : "bg-zinc-950 text-white"}`}>
          <div className="space-y-1.5">
             <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-white/20" : "text-white/40"}`}>Endereço</p>
             <p className="text-[9px] font-medium leading-relaxed flex items-start gap-2">
                <MapPin size={10} style={{ color: themeColor }} className="mt-0.5 shrink-0" />
                {data.address || "Rua seu endereço, 123 - Cidade"}
             </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? "text-white/20" : "text-white/30"}`}>WhatsApp</p>
              <p className="text-[9px] font-bold">{data.phone || "(00) 00000-0000"}</p>
            </div>
            <div className="space-y-1">
              <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? "text-white/20" : "text-white/30"}`}>Instagram</p>
              <p className="text-[9px] font-bold truncate">@{data.instagram?.split('/').pop() || "seuinsta"}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-center pb-8">
            <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[7px] font-black text-white/40 tracking-[0.2em] uppercase">
               Agendelle Platform
            </div>
          </div>
        </div>

        {/* Float Accent Line */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-white/20 z-50" />
      </div>
    </div>
  );
}


export function SiteTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cep, setCep] = useState("");

  // Validação de slug
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSlugRef = useRef(""); // slug original carregado do banco

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    welcomeMessage: "",
    description: "",
    mission: "",
    vision: "",
    values: "",
    themeColor: "#c9a96e",
    instagram: "",
    address: "",
    phone: "",
    showProducts: true,
    showServices: true,
    showTeam: true,
    aboutTitle: "",
    feature1Title: "",
    feature1Description: "",
    feature2Title: "",
    feature2Description: "",
    feature3Title: "",
    feature3Description: "",
    experienceYears: "10+",
    logoUrl: "",
    siteCoverUrl: "",
    coverUrl: "",
    siteTemplate: "classic",
    galleryImages: [] as string[],
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const aboutInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch("/api/admin/tenant");
        if (res.ok) {
          const data = await res.json();
          setFormData({
            title: data.name || "",
            slug: data.slug || "",
            welcomeMessage: data.welcomeMessage || "",
            description: data.description || "",
            mission: data.mission || "",
            vision: data.vision || "",
            values: data.values || "",
            themeColor: data.themeColor || "#c9a96e",
            instagram: data.instagram || "",
            address: data.address || "",
            phone: data.phone || "",
            showProducts: data.showProducts !== false,
            showServices: data.showServices !== false,
            showTeam: data.showTeam !== false,
            aboutTitle: data.aboutTitle || "",
            feature1Title: data.feature1Title || "",
            feature1Description: data.feature1Description || "",
            feature2Title: data.feature2Title || "",
            feature2Description: data.feature2Description || "",
            feature3Title: data.feature3Title || "",
            feature3Description: data.feature3Description || "",
            experienceYears: data.experienceYears || "10+",
            logoUrl: data.logoUrl || "",
            siteCoverUrl: data.siteCoverUrl || "",
            coverUrl: data.coverUrl || "",
            siteTemplate: data.siteTemplate || "classic",
            galleryImages: (() => { try { return JSON.parse(data.galleryImages || "[]"); } catch { return []; } })(),
          });
          initialSlugRef.current = data.slug || "";
        }
      } catch (err) {
        console.error("Erro ao carregar dados do site:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (slugStatus === "taken") {
      toast.error("Corrija o link do site antes de salvar.");
      return;
    }
    if (slugStatus === "checking") {
      toast.error("Aguarde a verificação do link antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        galleryImages: JSON.stringify(formData.galleryImages),
      };
      const res = await apiFetch("/api/admin/tenant/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        initialSlugRef.current = formData.slug;
        setSlugStatus("idle");
        toast.success("Configurações do site salvas com sucesso!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao salvar configurações.");
      }
    } catch (err) {
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  const handleGalleryUpload = async (files: FileList) => {
    setUploadingGallery(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const base64 = ev.target?.result as string;
            const res = await apiFetch("/api/admin/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data: base64, mimeType: file.type }),
            });
            if (res.ok) { const { url } = await res.json(); newUrls.push(url); }
          } catch { /* skip */ }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    if (newUrls.length) {
      setFormData(prev => ({ ...prev, galleryImages: [...(prev.galleryImages as string[]), ...newUrls] }));
      toast.success(`${newUrls.length} foto(s) adicionada(s) à galeria!`);
    }
    setUploadingGallery(false);
  };

  const handleImageUpload = async (
    file: File,
    field: "logoUrl" | "siteCoverUrl" | "coverUrl",
    setUploading: (v: boolean) => void
  ) => {
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const mimeType = file.type;
        try {
          const res = await apiFetch("/api/admin/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: base64, mimeType }),
          });
          if (res.ok) {
            const { url } = await res.json();
            setFormData(prev => ({ ...prev, [field]: url }));
            toast.success("Imagem enviada com sucesso!");
          } else {
            toast.error("Erro ao enviar imagem.");
          }
        } catch {
          toast.error("Erro ao enviar imagem.");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const handleSlugChange = (raw: string) => {
    // Limpa para só letras minúsculas, números e hifens
    const slug = raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
    setFormData(prev => ({ ...prev, slug }));

    // Se voltou ao slug original não precisa checar
    if (slug === initialSlugRef.current) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }

    if (slug.length < 2) {
      setSlugStatus("taken");
      setSlugMessage("Mínimo de 2 caracteres.");
      return;
    }

    setSlugStatus("checking");
    setSlugMessage("");

    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/admin/check-slug/${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (data.available) {
          setSlugStatus("available");
          setSlugMessage("Link disponível!");
        } else {
          setSlugStatus("taken");
          setSlugMessage(data.message || "Este link já está em uso.");
        }
      } catch {
        setSlugStatus("idle");
      }
    }, 600);
  };

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 8);
    setCep(val);
    
    if (val.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${val}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}/${data.uf}`;
          setFormData({ ...formData, address: fullAddress });
          toast.success("Endereço preenchido! Agora basta adicionar o número.");
        } else {
          toast.error("CEP não encontrado.");
        }
      } catch (err) {
        toast.error("Erro ao buscar CEP.");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-6">
      <SectionTitle
        title="Configurar Meu Site"
        description="Personalize como o mundo vê o seu negócio na sua página exclusiva."
        icon={Globe}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={<ExternalLink size={14} />}
              onClick={() => window.open(`/${formData.slug}`, "_blank")}
            >
              Visualizar Site
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              iconLeft={<Save size={14} />}
              onClick={handleSave}
            >
              Salvar Alterações
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-[1fr_1fr_auto] gap-6 lg:gap-8 pb-32">
        <div className="lg:col-span-2 space-y-6">


          <PanelCard
            title="Identidade & Boas-vindas"
            description="Informações principais e primeira impressão do seu site."
            icon={Globe}
          >
            <div className="space-y-6">
              <FormRow>
                <Input
                  label="Título do Site"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do seu negócio"
                  maxLength={60}
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="ds-label">Link do Site (Slug)</label>
                    <span className="text-[10px] font-bold tabular-nums text-zinc-400">
                      {formData.slug.length}/50
                    </span>
                  </div>
                  <div className={`group relative flex items-stretch overflow-hidden transition-all duration-200 rounded-[10px] shadow-sm border bg-zinc-50
                    ${slugStatus === "taken"     ? "border-red-400 ring-2 ring-red-500/10 bg-red-50/30" :
                      slugStatus === "available"  ? "border-emerald-400 ring-2 ring-emerald-500/10" :
                      "border-zinc-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/10 focus-within:bg-white"}`}
                  >
                    <div className="flex items-center justify-center bg-zinc-100 px-3.5 border-r border-zinc-200 text-xs font-black text-zinc-500 whitespace-nowrap select-none shrink-0">
                      agendelle.com/
                    </div>
                    <input
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="ex: barber-premium"
                      maxLength={50}
                      className="w-full bg-transparent px-3 py-2.5 outline-none text-sm text-zinc-800 placeholder:text-zinc-400 font-bold tracking-tight"
                    />
                    <div className="flex items-center pr-3 shrink-0">
                      {slugStatus === "checking" && (
                        <div className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
                      )}
                      {slugStatus === "available" && (
                        <CheckCircle size={14} className="text-emerald-500" />
                      )}
                      {slugStatus === "taken" && (
                        <AlertCircle size={14} className="text-red-500" />
                      )}
                    </div>
                  </div>
                  {slugStatus === "taken" && (
                    <p className="text-[11px] font-semibold text-red-500">{slugMessage}</p>
                  )}
                  {slugStatus === "available" && (
                    <p className="text-[11px] font-semibold text-emerald-600">{slugMessage}</p>
                  )}
                </div>
              </FormRow>

              <Input
                label="Frase de Destaque"
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                placeholder="Ex: O melhor corte da cidade está aqui."
                maxLength={100}
              />
            </div>
          </PanelCard>

          <PanelCard
            title="Seção 'Sobre Nós' & História"
            description="Personalize o título e o conteúdo da seção Quem Somos."
            icon={FileText}
            iconWrapClassName="bg-amber-50 border-amber-100"
            iconClassName="text-amber-600"
          >
            <div className="space-y-6">
              <Input
                label="Tempo de Experiência (Selo)"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                placeholder="Ex: 10+"
                hint="Aparece no selo ao lado da imagem 'Sobre Nós'."
                iconLeft={<Star size={16} />}
                maxLength={10}
              />
              <Input
                label="Título da Seção (ex: Nossa História)"
                value={formData.aboutTitle}
                onChange={(e) => setFormData({ ...formData, aboutTitle: e.target.value })}
                placeholder="Nossa História"
                maxLength={60}
              />
              <Textarea
                label="Conteúdo da História"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                placeholder="Conte a trajetória do seu negócio..."
                maxLength={800}
              />

              <div className="pt-4 border-t border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Foto da Seção (Opcional)</p>
                <div className="flex items-center gap-4">
                  <div 
                    className="relative w-32 h-40 rounded-2xl border-2 border-dashed border-zinc-200 overflow-hidden bg-zinc-50 flex items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors"
                    onClick={() => aboutInputRef.current?.click()}
                  >
                    {formData.coverUrl ? (
                      <>
                        <img src={formData.coverUrl} alt="Sobre nós" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera size={20} className="text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-zinc-400 text-center px-2">
                        <ImageIcon size={20} />
                        <span className="text-[9px] font-bold uppercase tracking-tight">Upload Foto</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Esta foto aparece ao lado do texto "Quem Somos". Recomendamos uma foto sua ou da sua equipe em formato vertical.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => aboutInputRef.current?.click()}
                      >
                        {formData.coverUrl ? "Trocar Foto" : "Escolher Foto"}
                      </Button>
                      {formData.coverUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, coverUrl: "" }))}
                          className="text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={aboutInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, "coverUrl", (v) => setSaving(v)); // reutiliza o estado de saving ou cria um novo se preferir
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="Diferenciais & Qualidades"
            description="Destaque 3 pontos fortes do seu negócio com ícones."
            icon={CheckCircle}
            iconWrapClassName="bg-emerald-50 border-emerald-100"
            iconClassName="text-emerald-600"
          >
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Diferencial 1</p>
                <FormRow>
                  <Input
                    label="Título"
                    value={formData.feature1Title}
                    onChange={(e) => setFormData({ ...formData, feature1Title: e.target.value })}
                    placeholder="Ex: Qualidade"
                    maxLength={40}
                  />
                  <Input
                    label="Descrição Curta"
                    value={formData.feature1Description}
                    onChange={(e) => setFormData({ ...formData, feature1Description: e.target.value })}
                    placeholder="Ex: Excelência em cada detalhe."
                    maxLength={100}
                  />
                </FormRow>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Diferencial 2</p>
                <FormRow>
                  <Input
                    label="Título"
                    value={formData.feature2Title}
                    onChange={(e) => setFormData({ ...formData, feature2Title: e.target.value })}
                    placeholder="Ex: Equipe"
                    maxLength={40}
                  />
                  <Input
                    label="Descrição Curta"
                    value={formData.feature2Description}
                    onChange={(e) => setFormData({ ...formData, feature2Description: e.target.value })}
                    placeholder="Ex: Profissionais qualificados."
                    maxLength={100}
                  />
                </FormRow>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Diferencial 3</p>
                <FormRow>
                  <Input
                    label="Título"
                    value={formData.feature3Title}
                    onChange={(e) => setFormData({ ...formData, feature3Title: e.target.value })}
                    placeholder="Ex: Cuidado"
                    maxLength={40}
                  />
                  <Input
                    label="Descrição Curta"
                    value={formData.feature3Description}
                    onChange={(e) => setFormData({ ...formData, feature3Description: e.target.value })}
                    placeholder="Ex: Seu bem-estar em primeiro lugar."
                    maxLength={100}
                  />
                </FormRow>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="Cultura Organizacional"
            description="Missão, Visão e Valores que guiam o seu negócio."
            icon={Target}
          >
            <div className="space-y-6">
              <Textarea
                label="Missão"
                value={formData.mission}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                placeholder="Qual o propósito fundamental do seu negócio?"
                rows={2}
                maxLength={200}
              />
              <Textarea
                label="Visão"
                value={formData.vision}
                onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                placeholder="Onde você quer chegar nos próximos anos?"
                rows={2}
                maxLength={200}
              />
              <Textarea
                label="Valores"
                value={formData.values}
                onChange={(e) => setFormData({ ...formData, values: e.target.value })}
                placeholder="Quais princípios guiam o seu atendimento?"
                rows={2}
                maxLength={200}
              />
            </div>
          </PanelCard>
        </div>

        <div className="space-y-6">
          {/* ── Imagens do Site ───────────────────────────────────────────── */}
          <PanelCard
            title="Imagens do Site"
            description="Logo e foto de capa que aparecem no seu site público."
            icon={ImageIcon}
            iconWrapClassName="bg-purple-50 border-purple-100"
            iconClassName="text-purple-600"
          >
            <div className="space-y-5">
              {/* Logo */}
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Logo</p>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden bg-zinc-50 shrink-0">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Camera size={20} className="text-zinc-300" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center justify-center gap-2 w-full py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50"
                    >
                      {uploadingLogo ? (
                        <div className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                      ) : (
                        <Upload size={13} />
                      )}
                      {uploadingLogo ? "Enviando..." : "Trocar Logo"}
                    </button>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logoUrl: "" }))}
                        className="flex items-center justify-center gap-1 w-full py-1.5 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors"
                      >
                        <X size={11} /> Remover
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, "logoUrl", setUploadingLogo);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Foto de Capa do Site */}
              <div className="pt-4 border-t border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Foto de Capa do Site</p>
                <p className="text-[10px] text-zinc-400 mb-2">Exclusiva do site externo — diferente da foto da agenda online.</p>
                <div
                  className="relative w-full h-32 rounded-xl border-2 border-dashed border-zinc-200 overflow-hidden bg-zinc-50 flex items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors mb-2"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {formData.siteCoverUrl ? (
                    <>
                      <img src={formData.siteCoverUrl} alt="Capa do site" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={24} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-400">
                      <ImageIcon size={24} />
                      <span className="text-xs font-medium">Clique para enviar a foto de capa</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50"
                  >
                    {uploadingCover ? (
                      <div className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    {uploadingCover ? "Enviando..." : "Trocar Capa"}
                  </button>
                  {formData.siteCoverUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, siteCoverUrl: "" }))}
                      className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                    >
                      <X size={11} /> Remover
                    </button>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, "siteCoverUrl", setUploadingCover);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </PanelCard>

          {/* ── Modelo do Site ───────────────────────────────────────────── */}
          <PanelCard
            title="Modelo do Site"
            description="Escolha o visual que melhor combina com o seu negócio."
            icon={LayoutTemplate}
            iconWrapClassName="bg-violet-50 border-violet-100"
            iconClassName="text-violet-600"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "classic",
                  name: "Classic Premium",
                  desc: "Minimalista e atemporal. Fundo claro, foco na elegância e clareza.",
                  preview: (color: string) => (
                    <div className="w-full h-20 rounded-xl overflow-hidden flex flex-col shadow-inner bg-zinc-100">
                      <div className="h-10 w-full" style={{ background: `linear-gradient(135deg, ${color} 0%, #0f0f0f 100%)` }} />
                      <div className="flex-1 bg-white flex items-center gap-1 px-2">
                        <div className="w-8 h-2 rounded-full bg-zinc-200" />
                        <div className="w-12 h-2 rounded-full bg-zinc-100" />
                      </div>
                    </div>
                  ),
                },
                {
                  id: "dark",
                  name: "Luxury Noir",
                  desc: "Imersivo e sofisticado. Glassmorphism e detalhes vibrantes no escuro.",
                  preview: (color: string) => (
                    <div className="w-full h-20 rounded-xl overflow-hidden flex flex-col bg-zinc-950 shadow-inner">
                      <div className="h-10 w-full flex items-end px-2 pb-1.5" style={{ background: `linear-gradient(135deg, #18181b 0%, ${color}77 100%)` }}>
                        <div className="w-16 h-1.5 rounded-full bg-white/30" />
                      </div>
                      <div className="flex-1 flex items-center gap-1 px-2">
                        <div className="w-8 h-1.5 rounded-full bg-white/10" />
                        <div className="w-12 h-1.5 rounded-full bg-white/5" />
                      </div>
                    </div>
                  ),
                },
                {
                  id: "bold",
                  name: "Modern Organic",
                  desc: "Arrojado e Zen. Tipografia forte, formas orgânicas e muito espaçamento.",
                  preview: (color: string) => (
                    <div className="w-full h-20 rounded-xl overflow-hidden bg-white flex flex-col items-center justify-center gap-1.5 relative border border-zinc-100">
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
                      <div className="w-14 h-4 rounded-full bg-zinc-900 mb-1" />
                      <div className="flex gap-1">
                        <div className="w-4 h-4 rounded-full bg-zinc-100" />
                        <div className="w-4 h-4 rounded-full bg-zinc-100" />
                        <div className="w-4 h-4 rounded-full bg-zinc-100" />
                      </div>
                      <div className="w-16 h-1.5 rounded-full bg-zinc-200 mt-1" />
                    </div>
                  ),
                },
              ].map(tpl => {
                const active = formData.siteTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, siteTemplate: tpl.id }))}
                    className={cn(
                      "flex flex-col gap-2 p-3 rounded-2xl border-2 transition-all text-left group",
                      active ? "border-zinc-900 bg-zinc-50 shadow-lg" : "border-zinc-100 bg-white hover:border-zinc-200"
                    )}
                  >
                    <div className="transition-transform group-hover:scale-[1.02] duration-300">
                      {tpl.preview(formData.themeColor)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-zinc-900 uppercase tracking-tighter">{tpl.name}</p>
                        {active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      </div>
                      <p className="text-[9px] text-zinc-500 mt-0.5 leading-tight">{tpl.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </PanelCard>

          {/* ── Galeria de Fotos ─────────────────────────────────────────── */}
          <PanelCard
            title="Galeria de Fotos"
            description="Fotos do seu espaço e trabalhos. Aparecem em destaque no site."
            icon={Images}
            iconWrapClassName="bg-emerald-50 border-emerald-100"
            iconClassName="text-emerald-600"
          >
            <div className="space-y-4">
              {/* Grid de fotos */}
              {(formData.galleryImages as string[]).length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(formData.galleryImages as string[]).map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-zinc-100">
                      <img src={url} alt={`Galeria ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, galleryImages: (prev.galleryImages as string[]).filter((_, i) => i !== idx) }))}
                          className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Upload */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingGallery}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-zinc-200 text-xs font-bold text-zinc-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-50"
              >
                {uploadingGallery ? (
                  <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                {uploadingGallery ? "Enviando fotos..." : "Adicionar fotos à galeria"}
              </button>
              <p className="text-[10px] text-zinc-400 text-center">Selecione várias fotos de uma vez. Máximo recomendado: 12 fotos.</p>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  if (e.target.files?.length) handleGalleryUpload(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </PanelCard>

          {/* ── Estilo & Cores ─────────────────────────────────────────────── */}
          <PanelCard
            title="Estilo & Cores"
            icon={Palette}
            iconWrapClassName="bg-rose-50 border-rose-100"
            iconClassName="text-rose-600"
          >
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                Cor Principal do Site
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.themeColor}
                  onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                  className="w-11 h-11 rounded-xl border-none cursor-pointer shadow-sm"
                />
                <Input
                  value={formData.themeColor}
                  onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                  placeholder="#HEX"
                  wrapperClassName="flex-1"
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                Esta cor será usada nos botões e detalhes visuais da sua página.
              </p>
            </div>
          </PanelCard>

          <PanelCard
            title="Links e Contato"
            icon={Phone}
            iconWrapClassName="bg-indigo-50 border-indigo-100"
            iconClassName="text-indigo-600"
          >
            <div className="space-y-4">
              <Input
                label="Instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="https://instagram.com/..."
                maxLength={100}
              />
              <Input
                label="Telefone de Contato"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                maxLength={20}
              />
              <Input
                label="CEP"
                value={cep}
                onChange={handleCEPChange}
                placeholder="00000-000"
                iconLeft={<Hash size={16} />}
                wrapperClassName="max-w-[200px]"
              />
              <Input
                label="Endereço Exibido"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua Exemplo, 123..."
                iconLeft={<MapPin size={16} />}
                maxLength={150}
              />
            </div>
          </PanelCard>

          <PanelCard
            title="Exibição de Seções"
            description="Escolha quais seções você deseja mostrar no seu site."
            icon={Layout}
            iconWrapClassName="bg-amber-50 border-amber-100"
            iconClassName="text-amber-600"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-zinc-800">Mostrar Serviços</p>
                  <p className="text-[10px] text-zinc-500">Exibir a lista de serviços e preços.</p>
                </div>
                <Switch
                  checked={formData.showServices}
                  onCheckedChange={(val) => setFormData({ ...formData, showServices: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-zinc-800">Mostrar Equipe</p>
                  <p className="text-[10px] text-zinc-500">Exibir os profissionais do estúdio.</p>
                </div>
                <Switch
                  checked={formData.showTeam}
                  onCheckedChange={(val) => setFormData({ ...formData, showTeam: val })}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 border border-zinc-100">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-zinc-800">Mostrar Produtos (Loja)</p>
                  <p className="text-[10px] text-zinc-500">Exibir vitrine de produtos do PDV.</p>
                </div>
                <Switch
                  checked={formData.showProducts}
                  onCheckedChange={(val) => setFormData({ ...formData, showProducts: val })}
                />
              </div>
            </div>
          </PanelCard>

          <div className="rounded-3xl bg-zinc-900 p-6 text-white shadow-xl">
            <h4 className="flex items-center gap-2 text-sm font-black mb-2">
              <AlertCircle size={16} className="text-amber-400" />
              Dica de SEO
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
              Use palavras-chave no campo "Sobre Nós" (ex: barbearia, corte, design) para melhorar seu ranking no Google.
            </p>
          </div>
        </div>

        {/* Coluna 3: Preview High Fidelity */}
        <div className="hidden 2xl:block">
          <MobileSitePreview data={formData} />
        </div>
      </div>

      {/* Action Bar Flutuante — Refined Responsiveness */}
      <div className="sticky bottom-4 lg:bottom-8 left-0 right-0 z-[100] mt-10">
        <div className="bg-white/80 backdrop-blur-2xl border border-zinc-200 p-3 md:p-5 rounded-[24px] md:rounded-[28px] shadow-2xl shadow-zinc-950/10 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="hidden lg:block ml-2">
              <p className="text-xs font-black text-zinc-800 uppercase tracking-widest">Configurações do Site</p>
              <p className="text-[10px] text-zinc-500 mt-1 font-medium">As alterações serão aplicadas instantaneamente na sua vitrine digital.</p>
           </div>
           
           <div className="flex items-center justify-between w-full lg:hidden px-1">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-zinc-800 uppercase">Site Admin</span>
                 <span className="text-[9px] text-zinc-500">Toque para salvar</span>
              </div>
              <Badge color="success" className="text-[8px] py-0.5">Online</Badge>
           </div>

           <Button
              onClick={handleSave}
              disabled={saving || uploadingLogo || uploadingCover}
              className={cn(
                "w-full sm:w-[240px] md:w-[280px] h-11 md:h-14 rounded-2xl text-sm md:text-base font-black shadow-xl transition-all active:scale-95 group",
                saving ? "bg-zinc-800" : "bg-zinc-950 hover:bg-black"
              )}
              iconLeft={saving ? <Loader2 size={18} className="animate-spin text-zinc-400" /> : <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />}
            >
              {saving ? "Salvando..." : "Publicar Alterações"}
            </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
