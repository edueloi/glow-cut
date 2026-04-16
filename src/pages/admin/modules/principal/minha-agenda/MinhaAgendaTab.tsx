import React from "react";
import { Globe, Copy, ExternalLink, Image as ImageIcon, Link as LinkIcon, X, MapPin, CheckCircle2, Loader2, Sparkles, Layout, MonitorSmartphone } from "lucide-react";
import { Button, PanelCard, Input, Textarea, Badge, SectionTitle, FormRow, Divider, PageWrapper } from "@/src/components/ui";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { useToast } from "@/src/components/ui";

interface MinhaAgendaTabProps {
  studioName: string;
  tenantSlug: string;
  onUpdateName?: (name: string) => void;
  onUpdateSlug?: (slug: string) => void;
  onRefreshProfessionals?: () => void;
}

const PRESET_COLORS = [
  "#09090b", // Zinc/Black
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#3b82f6", // Blue
  "#0ea5e9", // Sky
  "#10b981", // Emerald
  "#84cc16", // Lime
  "#eb5e28", // Orange
  "#f59e0b", // Amber
  "#dc2626", // Red
  "#ec4899", // Pink
  "#78350f", // Brown
];

// ── Mobile Preview Component ─────────────────────────────────────────────
function MobileBookingPreview({ 
  studioName, 
  logo, 
  cover, 
  color, 
  welcomeMessage 
}: { 
  studioName: string; 
  logo: string | null; 
  cover: string | null; 
  color: string; 
  welcomeMessage: string;
}) {
  return (
    <div className="relative mx-auto w-[280px] h-[580px] bg-zinc-950 rounded-[3rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden hidden xl:block sticky top-8">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-900 rounded-b-2xl z-20" />
      
      <div className="h-full w-full bg-white overflow-y-auto overflow-x-hidden pt-6">
        {/* Cover */}
        <div className="relative h-24 w-full bg-zinc-100 overflow-hidden">
          {cover ? (
            <img src={cover} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
              <ImageIcon className="text-zinc-300" size={24} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Logo & Info */}
        <div className="px-4 -mt-8 relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center p-2 border border-zinc-100">
            {logo ? (
              <img src={logo} className="w-full h-full object-contain" alt="Logo" />
            ) : (
              <div className="w-full h-full bg-zinc-50 rounded-lg flex items-center justify-center text-xs font-bold text-zinc-300">
                L
              </div>
            )}
          </div>
          <h3 className="mt-3 text-sm font-black text-zinc-900 text-center">{studioName}</h3>
          <p className="text-[10px] text-zinc-400 text-center px-4 leading-normal mt-1 italic">
             "{welcomeMessage || "Desejamos as boas-vindas ao nosso agendamento online."}"
          </p>
        </div>

        {/* Mock Content */}
        <div className="p-4 mt-4 space-y-4">
          <div className="h-2 w-20 bg-zinc-100 rounded-full" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-xl bg-zinc-50 border border-zinc-100 p-2 flex flex-col justify-end gap-1">
                <div className="h-1.5 w-10 bg-zinc-200 rounded-full" />
                <div className="h-1 w-6 bg-zinc-100 rounded-full" />
              </div>
            ))}
          </div>
          <div className="h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
            <div className="h-1.5 w-24 bg-white/20 rounded-full" />
          </div>
        </div>

        {/* Theme Accent */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}

export function MinhaAgendaTab({ 
  studioName: propStudioName = "Studio", 
  tenantSlug: propTenantSlug = "", 
  onUpdateName, 
  onUpdateSlug, 
  onRefreshProfessionals 
}: MinhaAgendaTabProps) {
  const { show } = useToast();

  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [localColor, setLocalColor] = React.useState<string>("#09090b");
  const [localAddress, setLocalAddress] = React.useState<string>("");
  const [localInstagram, setLocalInstagram] = React.useState<string>("");
  const [localTitle, setLocalTitle] = React.useState<string>("");
  const [localSlug, setLocalSlug] = React.useState<string>(propTenantSlug);
  const [localDesc, setLocalDesc] = React.useState<string>("");
  const [localWelcome, setLocalWelcome] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [studioName, setStudioName] = React.useState(propStudioName);

  React.useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await apiFetch("/api/admin/tenant");
        if (res.ok) {
          const t = await res.json();
          setLogoPreview(t.logoUrl || null);
          setCoverPreview(t.coverUrl || null);
          setLocalColor(t.themeColor || "#09090b");
          setLocalAddress(t.address || "");
          setLocalInstagram(t.instagram || "");
          setLocalTitle(t.name || "");
          setStudioName(t.name || propStudioName);
          setLocalSlug(t.slug || propTenantSlug);
          setLocalWelcome(t.welcomeMessage || "");
          setLocalDesc(t.description || "");
        }
      } catch (e) {
        console.error("Erro ao carregar branding:", e);
      }
    };
    fetchBranding();
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/admin/tenant/branding", {
        method: "POST",
        body: JSON.stringify({
          themeColor: localColor,
          logoUrl: logoPreview,
          coverUrl: coverPreview,
          address: localAddress,
          instagram: localInstagram ? `https://instagram.com/${localInstagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "").replace(/\/$/, "")}` : "",
          welcomeMessage: localWelcome,
          description: localDesc,
          title: localTitle,
          slug: localSlug
        }),
      });

      if (res.ok) {
        show("Configurações da agenda salvas com sucesso!", "success");
        if (onUpdateName) onUpdateName(localTitle);
        if (onUpdateSlug) onUpdateSlug(localSlug);
        setStudioName(localTitle);
      } else {
        show("Erro ao salvar configurações.", "error");
      }
    } catch {
      show("Erro de conexão.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const [isUploadingCover, setIsUploadingCover] = React.useState(false);
  const [hasProfessionals, setHasProfessionals] = React.useState<boolean | null>(null);
  const [isCreatingProfessional, setIsCreatingProfessional] = React.useState(false);

  React.useEffect(() => {
    apiFetch("/api/professionals")
      .then(r => r.ok ? r.json() : [])
      .then(d => setHasProfessionals(Array.isArray(d) && d.length > 0));
  }, []);

  const handleCreateAdminAsProfessional = async () => {
    setIsCreatingProfessional(true);
    try {
      const res = await apiFetch("/api/professionals", {
        method: "POST",
        body: JSON.stringify({
          name: studioName,
          role: "Proprietário",
          password: "prof123",
          isActive: true,
        }),
      });
      if (res.ok) {
        setHasProfessionals(true);
        if (onRefreshProfessionals) onRefreshProfessionals();
        show("Profissional criado! Configure os horários na aba Horários.", "success");
      } else {
        show("Erro ao criar profissional.", "error");
      }
    } catch {
      show("Erro de conexão.", "error");
    } finally {
      setIsCreatingProfessional(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            const res = await apiFetch("/api/admin/upload", {
              method: "POST",
              body: JSON.stringify({ data: base64, mimeType: file.type }),
            });
            if (res.ok) {
              const { url } = await res.json();
              resolve(url);
            } else {
              show("Erro ao fazer upload da imagem.", "error");
              resolve(null);
            }
          } catch {
            show("Erro de conexão no upload.", "error");
            resolve(null);
          }
        };
        reader.readAsDataURL(file);
      });
    } catch (e) {
      return null;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingLogo(true);
      // Mostra preview local imediato
      const localUrl = URL.createObjectURL(file);
      setLogoPreview(localUrl);
      
      const url = await uploadImage(file);
      if (url) {
        setLogoPreview(url);
      } else {
        setLogoPreview(null); // Reset if failed
      }
      setIsUploadingLogo(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingCover(true);
      // Mostra preview local imediato
      const localUrl = URL.createObjectURL(file);
      setCoverPreview(localUrl);
      
      const url = await uploadImage(file);
      if (url) {
        setCoverPreview(url);
      } else {
        setCoverPreview(null); // Reset if failed
      }
      setIsUploadingCover(false);
    }
  };

  const removeLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoPreview(null);
    const input = document.getElementById('logo-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const removeCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCoverPreview(null);
    const input = document.getElementById('cover-upload') as HTMLInputElement;
    if (input) input.value = '';
  };
  const activeSlug = localSlug || "seu-estudio";
  
  // URL dinâmica baseada no ambiente atual (localhost ou produção)
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'glow-cut.com.br';
  const link = `${currentHost}/agendar/${activeSlug}`;

  const handleCopyLink = () => {
    const protocol = window.location.protocol;
    navigator.clipboard.writeText(`${protocol}//${link}`);
    show("Link copiado para a área de transferência!", "success");
  };

  const handleOpenLink = () => {
    const protocol = window.location.protocol;
    window.open(`${protocol}//${link}`, '_blank');
  };

  return (
    <PageWrapper mobileBottomPad>
      <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700">
        <SectionTitle 
          title="Minha Agenda Online" 
          description="Sua vitrine digital. Configure como os clientes visualizam seu estúdio e realizam agendamentos." 
          icon={MonitorSmartphone} 
        />

        {/* Hero Section: Link de Agendamento */}
        <div className="relative overflow-hidden rounded-[32px] bg-zinc-950 p-6 md:p-10 shadow-2xl">
          {/* Animated Background Elements */}
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <Badge color="success" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black tracking-widest px-3 py-1 uppercase text-[10px]">
                  Link Público Ativo
                </Badge>
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight break-all">
                {link}
              </h2>
              <p className="text-sm text-zinc-400 mt-4 max-w-xl leading-relaxed">
                Este é o endereço que você deve colocar na sua bio do Instagram, WhatsApp Business e Google Maps. 
                Os clientes agendam em menos de 1 minuto sem precisar de aplicativo.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full lg:w-auto">
              <Button 
                onClick={handleCopyLink}
                variant="outline"
                className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 h-12 px-8 rounded-2xl shadow-sm"
                iconLeft={<Copy size={18} />}
              >
                Copiar Link
              </Button>
              <Button 
                onClick={handleOpenLink}
                className="bg-white text-zinc-950 hover:bg-zinc-100 h-12 px-8 rounded-2xl shadow-lg border-transparent font-black"
                iconLeft={<ExternalLink size={18} />}
              >
                Ver Página
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_auto] gap-6 lg:gap-8">
          {/* Coluna 1: SEO e Links */}
          <div className="space-y-6 lg:space-y-8">
            <PanelCard
              title="SEO e Links"
              description="Configure como sua página aparece nas redes sociais e motores de busca."
              icon={Globe}
              iconWrapClassName="bg-amber-50 border-amber-100 shadow-sm"
              iconClassName="text-amber-500"
            >
              <div className="space-y-6 pt-2">
                <Input
                  label="URL Personalizada (Slug)"
                  addonLeft={`${currentHost}/agendar/`}
                  value={localSlug}
                  onChange={(e: any) => setLocalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="nome-do-seu-estudio"
                  hint="Use um nome curto e fácil de lembrar."
                />

                <FormRow cols={2}>
                  <Input
                    label="Título da Página"
                    value={localTitle}
                    onChange={(e: any) => setLocalTitle(e.target.value)}
                    placeholder={`${studioName} | Agendamento Online`}
                    hint="Aparece no topo do navegador."
                  />
                  <Input
                    label="Instagram"
                    addonLeft="@"
                    value={localInstagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "").replace(/\/$/, "")}
                    onChange={(e: any) => setLocalInstagram(e.target.value.trim())}
                    placeholder="seu.estudio"
                  />
                </FormRow>

                <Input
                  label="Endereço Comercial"
                  value={localAddress}
                  onChange={(e: any) => setLocalAddress(e.target.value)}
                  placeholder="Ex: Rua Tal, 123 - Centro"
                  iconLeft={<MapPin size={16} />}
                />

                <Textarea
                  label="Descrição Curta (Meta Tags)"
                  rows={3}
                  value={localDesc}
                  onChange={(e: any) => setLocalDesc(e.target.value)}
                  placeholder="Breve resumo sobre seus serviços."
                  hint="Esta descrição aparece quando você compartilha o link."
                />
              </div>
            </PanelCard>

            {hasProfessionals === false && (
              <div className="group relative overflow-hidden bg-white border-2 border-dashed border-amber-200 rounded-[28px] p-8 flex flex-col items-center text-center transition-all hover:border-amber-400 hover:bg-amber-50/30">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4 text-2xl shadow-inner">
                  ⚠️
                </div>
                <h4 className="text-lg font-black text-zinc-900">Configuração Pendente</h4>
                <p className="text-sm text-zinc-500 mt-2 max-w-sm">
                  Você ainda não tem profissionais cadastrados. A agenda não aparecerá para os clientes até que você ative o seu perfil.
                </p>
                <Button
                  onClick={handleCreateAdminAsProfessional}
                  disabled={isCreatingProfessional}
                  className="mt-6 bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 h-11 px-8 rounded-xl font-bold"
                >
                  {isCreatingProfessional ? <Loader2 className="animate-spin" /> : "Ativar meu Perfil agora"}
                </Button>
              </div>
            )}
          </div>

          {/* Coluna 2: Design e Branding */}
          <div className="space-y-6 lg:space-y-8">
            <PanelCard
              title="Branding e Estilo"
              description="Personalize as cores e imagens para combinar com a identidade do seu estúdio."
              icon={Layout}
              iconWrapClassName="bg-indigo-50 border-indigo-100 shadow-sm"
              iconClassName="text-indigo-500"
            >
              <div className="space-y-8 pt-2">
                <Input
                  label="Mensagem de Boas-Vindas"
                  value={localWelcome}
                  onChange={(e: any) => setLocalWelcome(e.target.value)}
                  placeholder="O que o cliente lê ao abrir a página"
                  iconLeft={<Sparkles size={16} className="text-amber-500" />}
                />

                <FormRow cols={2}>
                  <div className="space-y-3">
                    <label className="ds-label">Logo Oficial</label>
                    <div 
                      className={cn(
                        "group relative flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed transition-all duration-300",
                        logoPreview ? "border-zinc-200 bg-white" : "border-zinc-200 bg-zinc-50 hover:border-emerald-400 hover:bg-white"
                      )}
                      onClick={() => !logoPreview && document.getElementById('logo-upload')?.click()}
                    >
                      <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      
                      {isUploadingLogo ? (
                        <div className="flex flex-col items-center">
                          <Loader2 size={24} className="animate-spin text-emerald-500 mb-2" />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Enviando</span>
                        </div>
                      ) : logoPreview ? (
                        <>
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-6" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Trocar Logotipo</span>
                            <button onClick={removeLogo} className="w-8 h-8 rounded-full bg-white/20 hover:bg-rose-500 text-white flex items-center justify-center transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <ImageIcon size={32} className="text-zinc-300" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Upload Logo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="ds-label">Banner de Capa</label>
                    <div 
                      className={cn(
                        "group relative flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed transition-all duration-300",
                        coverPreview ? "border-zinc-200 bg-white" : "border-zinc-200 bg-zinc-50 hover:border-blue-400 hover:bg-white"
                      )}
                      onClick={() => !coverPreview && document.getElementById('cover-upload')?.click()}
                    >
                      <input type="file" id="cover-upload" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                      
                      {isUploadingCover ? (
                        <div className="flex flex-col items-center">
                          <Loader2 size={24} className="animate-spin text-blue-500 mb-2" />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Enviando</span>
                        </div>
                      ) : coverPreview ? (
                        <>
                          <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Trocar Banner</span>
                            <button onClick={removeCover} className="w-8 h-8 rounded-full bg-white/20 hover:bg-rose-500 text-white flex items-center justify-center transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <ImageIcon size={32} className="text-zinc-300" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Upload Banner</span>
                        </div>
                      )}
                    </div>
                  </div>
                </FormRow>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="ds-label mb-0">Cor Predominante</label>
                    <Badge color="success" className="text-[9px] uppercase tracking-[0.1em] py-0.5 font-black">Design Ativo</Badge>
                  </div>
                  
                  <div className="bg-zinc-50 border border-zinc-200 rounded-[24px] p-5 space-y-5">
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-2.5">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setLocalColor(color)}
                          className={cn(
                            "w-full aspect-square rounded-full border-4 transition-all duration-300 hover:scale-125 z-0 hover:z-10",
                            localColor === color ? "border-white ring-2 ring-zinc-950 shadow-md scale-110" : "border-transparent opacity-80 hover:opacity-100"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-4 pt-4 border-t border-zinc-200/60">
                      <div className="relative group/picker cursor-pointer shrink-0">
                        <input 
                          type="color" 
                          value={localColor} 
                          onChange={(e) => setLocalColor(e.target.value)}
                          className="w-12 h-12 rounded-2xl cursor-pointer border-4 border-white shadow-md ring-1 ring-zinc-200 transition-transform active:scale-95 translate-y-2" 
                        />
                      </div>
                      <div className="flex-1">
                        <Input 
                          label="Customizar Hex"
                          value={localColor.toUpperCase()}
                          onChange={(e: any) => setLocalColor(e.target.value)}
                          className="font-mono text-sm tracking-widest focus:ring-0 bg-transparent"
                          addonLeft="#"
                          wrapperClassName="gap-0.5"
                        />
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1 translate-y-1">
                         <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">Status</span>
                         <Badge color="success" className="text-[9px] py-1 font-black">Ativo</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </PanelCard>
          </div>

          {/* Coluna 3: Preview (Mobile) */}
          <MobileBookingPreview 
            studioName={localTitle || studioName}
            logo={logoPreview}
            cover={coverPreview}
            color={localColor}
            welcomeMessage={localWelcome}
          />
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-4 lg:bottom-8 left-0 right-0 z-[100] mt-10">
          <div className="bg-white/80 backdrop-blur-2xl border border-zinc-200 p-4 md:p-5 rounded-[28px] shadow-2xl shadow-zinc-950/10 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="hidden lg:block ml-2">
                <p className="text-xs font-black text-zinc-800 uppercase tracking-widest">Configurações Públicas</p>
                <p className="text-[10px] text-zinc-500 mt-1 font-medium">As alterações serão exibidas instantaneamente para seus clientes.</p>
             </div>
             <Button
                onClick={handleSave}
                disabled={isLoading || isUploadingLogo || isUploadingCover}
                className={cn(
                  "w-full sm:w-[280px] h-12 md:h-14 rounded-2xl text-base font-black shadow-xl transition-all active:scale-95 group",
                  isLoading ? "bg-zinc-800" : "bg-zinc-950 hover:bg-black"
                )}
                iconLeft={isLoading ? <Loader2 size={20} className="animate-spin text-zinc-400" /> : <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />}
              >
                {isLoading ? "Salvando..." : "Publicar Alterações"}
              </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
