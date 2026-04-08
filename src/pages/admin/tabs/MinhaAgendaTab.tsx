import React from "react";
import { Globe, Copy, ExternalLink, Image as ImageIcon, Link as LinkIcon, X, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { cn } from "@/src/lib/utils";

import { useToast } from "@/src/components/ui/Toast";

interface MinhaAgendaTabProps {
  studioName?: string;
  tenantSlug?: string;
  themeColor?: string;
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

export function MinhaAgendaTab({ studioName: propStudioName = "Studio", tenantSlug = "", themeColor = "#f59e0b" }: MinhaAgendaTabProps) {
  const { show } = useToast();

  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [localColor, setLocalColor] = React.useState<string>("#09090b");
  const [localAddress, setLocalAddress] = React.useState<string>("");
  const [localInstagram, setLocalInstagram] = React.useState<string>("");
  const [localTitle, setLocalTitle] = React.useState<string>("");
  const [localDesc, setLocalDesc] = React.useState<string>("");
  const [localWelcome, setLocalWelcome] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [studioName, setStudioName] = React.useState(propStudioName);

  const adminUser = (() => { try { return JSON.parse(localStorage.getItem("adminUser") || "{}"); } catch { return {}; } })();
  const headers = { "Content-Type": "application/json", "x-tenant-id": adminUser.tenantId || "" };

  React.useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch("/api/admin/tenant", { headers });
        if (res.ok) {
          const t = await res.json();
          setLogoPreview(t.logoUrl || null);
          setCoverPreview(t.coverUrl || null);
          setLocalColor(t.themeColor || "#09090b");
          setLocalAddress(t.address || "");
          setLocalInstagram(t.instagram || "");
          setLocalTitle(t.name || "");
          setStudioName(t.name || propStudioName);
          setLocalWelcome(t.welcomeMessage || "");
          setLocalDesc(t.description || "");
        }
      } catch (e) {
        console.error("Erro ao carregar branding:", e);
      }
    };
    fetchBranding();
  }, [adminUser.tenantId]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/tenant/branding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          themeColor: localColor,
          logoUrl: logoPreview,
          coverUrl: coverPreview,
          address: localAddress,
          instagram: localInstagram ? `https://instagram.com/${localInstagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "").replace(/\/$/, "")}` : "",
          welcomeMessage: localWelcome,
          description: localDesc,
          title: localTitle
        }),
      });

      if (res.ok) {
        show("Configurações da agenda salvas com sucesso!", "success");
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
    fetch("/api/professionals", { headers })
      .then(r => r.ok ? r.json() : [])
      .then(d => setHasProfessionals(Array.isArray(d) && d.length > 0));
  }, [adminUser.tenantId]);

  const handleCreateAdminAsProfessional = async () => {
    setIsCreatingProfessional(true);
    try {
      const res = await fetch("/api/professionals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: adminUser.name || studioName,
          role: "Proprietário",
          password: "prof123",
          isActive: true,
        }),
      });
      if (res.ok) {
        setHasProfessionals(true);
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
            const res = await fetch("/api/admin/upload", {
              method: "POST",
              headers,
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
  const slug = tenantSlug || studioName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  // URL dinâmica baseada no ambiente atual (localhost ou produção)
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'glow-cut.com.br';
  const link = `${currentHost}/agendar/${slug}`;

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
    <div className="space-y-6 lg:space-y-8 pb-10 flex flex-col">
      {/* Intro */}
      <div className="bg-white rounded-[32px] border border-zinc-200 p-6 md:p-8 shadow-sm">
        <h3 className="text-xl font-black text-zinc-900 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
            <Globe size={24} />
          </div>
          Minha Agenda Online
        </h3>
        <p className="text-sm text-zinc-500 mt-4 leading-relaxed max-w-2xl">
          Esta é a página pública do seu estúdio. Seus clientes acessarão este link para agendar horários diretamente com você, <strong className="text-zinc-900">sem precisar fazer login</strong>. 
          O link e os textos são gerados automaticamente.
        </p>
      </div>

      {/* Link de Compartilhamento */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 p-6 md:p-8 rounded-[32px] border border-emerald-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-1.5">Link de Agendamento Ativo</p>
          </div>
          <p className="text-lg md:text-2xl font-black text-zinc-900 break-all md:break-normal">{link}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0 relative z-10 w-full lg:w-auto">
          <button 
            onClick={handleCopyLink}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 h-10 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-50 hover:border-emerald-300 shadow-sm transition-all active:scale-95"
          >
            <Copy size={16} /> Copiar Link
          </button>
          <button 
            onClick={handleOpenLink}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 h-10 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <ExternalLink size={16} /> Abrir Agenda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Informações de SEO */}
        <div className="bg-white rounded-[32px] border border-zinc-200 p-6 md:p-8 shadow-sm space-y-6 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-6 rounded-full bg-emerald-400" />
            <h4 className="text-base font-black text-zinc-800">Presença no Google e SEO</h4>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">URL Personalizada (Slug)</label>
            <div className="flex bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
              <span className="hidden sm:inline-block px-4 py-4 text-xs font-bold text-zinc-400 border-r border-zinc-200 bg-zinc-100/50 whitespace-nowrap">
                {currentHost}/agendar/
              </span>
              <input 
                type="text" 
                defaultValue={slug} 
                className="w-full text-sm p-4 bg-transparent text-zinc-900 font-black outline-none placeholder:font-medium"
                placeholder="nome-do-estudio"
              />
            </div>
            <p className="text-[10px] text-zinc-400 ml-1">Ex: O nome do estúdio sem espaços ou acentos.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Título da Página</label>
            <input 
              type="text" 
              value={localTitle} 
              onChange={e => setLocalTitle(e.target.value)} 
              placeholder={`${studioName} | Agende seu horário`} 
              className="w-full text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all" 
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                 Endereço do Estabelecimento
                 <MapPin size={14} className="text-zinc-400" />
              </label>
              <input 
                type="text" 
                value={localAddress} 
                onChange={(e) => setLocalAddress(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                className="w-full text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all placeholder:font-medium" 
              />
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Descrição Breve (Redes Sociais)</label>
              <textarea 
                rows={4} 
                value={localDesc} 
                onChange={e => setLocalDesc(e.target.value)} 
                placeholder={`Agende seu horário no ${studioName}. Profissionais qualificados e atendimento exclusivo.`} 
                className="w-full flex-1 text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all resize-none placeholder:font-medium" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center justify-between">
                 Instagram
                 <LinkIcon size={14} className="text-zinc-400" />
              </label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
                <span className="text-sm text-zinc-400 font-bold pl-4 pr-1 whitespace-nowrap select-none">instagram.com/</span>
                <input
                  type="text"
                  value={localInstagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "").replace(/\/$/, "")}
                  onChange={(e) => setLocalInstagram(e.target.value.trim())}
                  placeholder="seu-estudio"
                  className="flex-1 text-sm py-4 pr-4 bg-transparent text-zinc-900 font-bold outline-none placeholder:font-medium placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Aparência do Template */}
        <div className="bg-white rounded-[32px] border border-zinc-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-6 rounded-full bg-indigo-400" />
            <h4 className="text-base font-black text-zinc-800">Aparência e Design</h4>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Mensagem de Boas-Vindas</label>
            <input 
              type="text" 
              value={localWelcome} 
              onChange={e => setLocalWelcome(e.target.value)} 
              placeholder="Bem-vindo ao nosso agendamento online!" 
              className="w-full text-sm p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-zinc-900 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all placeholder:font-medium" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Logo do Estúdio</label>
              <div 
                className={cn(
                  "group relative flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed transition-all",
                  logoPreview ? "border-zinc-200 bg-white" : "border-zinc-200 bg-zinc-50 hover:border-emerald-400 hover:bg-white shadow-inner"
                )}
                onClick={() => !logoPreview && document.getElementById('logo-upload')?.click()}
              >
                <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                
                {isUploadingLogo ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-emerald-500 mb-2" />
                    <p className="text-[10px] font-bold text-zinc-400">Enviando...</p>
                  </div>
                ) : logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-4" />
                    <button 
                      onClick={removeLogo}
                      className="absolute top-3 right-3 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-xl hover:bg-rose-500 transition-all z-20"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md py-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <p className="text-[10px] font-black text-white uppercase tracking-widest">Trocar Logo</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-zinc-100 transition-transform group-hover:scale-110 group-hover:rotate-3">
                      <ImageIcon size={20} className="text-zinc-400" />
                    </div>
                    <p className="text-[11px] font-bold text-zinc-600">Enviar Logo</p>
                    <p className="text-[9px] mt-1 text-zinc-400 font-medium tracking-tight">Preferencialmente 512x512px</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Imagem de Capa (Banner)</label>
              <div 
                className={cn(
                  "group relative flex h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed transition-all",
                  coverPreview ? "border-zinc-200 bg-white" : "border-zinc-200 bg-zinc-50 hover:border-emerald-400 hover:bg-white shadow-inner"
                )}
                onClick={() => !coverPreview && document.getElementById('cover-upload')?.click()}
              >
                <input type="file" id="cover-upload" className="hidden" accept="image/*" onChange={handleCoverUpload} />
                
                {isUploadingCover ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-emerald-500 mb-2" />
                    <p className="text-[10px] font-bold text-zinc-400">Enviando...</p>
                  </div>
                ) : coverPreview ? (
                  <>
                    <img src={coverPreview} alt="Capa" className="w-full h-full object-cover" />
                    <button 
                      onClick={removeCover}
                      className="absolute top-3 right-3 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-xl hover:bg-rose-500 transition-all z-20"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md py-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <p className="text-[10px] font-black text-white uppercase tracking-widest">Trocar Capa</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-zinc-100 transition-transform group-hover:scale-110 group-hover:-rotate-3">
                      <ImageIcon size={20} className="text-zinc-400" />
                    </div>
                    <p className="text-[11px] font-bold text-zinc-600">Enviar Banner</p>
                    <p className="text-[9px] mt-1 text-zinc-400 font-medium tracking-tight">Horizontal (ex: 1200x400px)</p>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4 pt-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Cor Principal do Sistema</label>
            <div className="flex flex-col gap-4 bg-zinc-50 p-5 rounded-[24px] border border-zinc-200 group/colors">
               <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                 {PRESET_COLORS.map((color) => (
                   <button
                     key={color}
                     onClick={() => setLocalColor(color)}
                     className={cn(
                       "w-full aspect-square rounded-xl border-2 transition-all hover:scale-110 active:scale-90",
                       localColor === color ? "border-white ring-2 ring-zinc-900 shadow-lg scale-110" : "border-transparent opacity-80 hover:opacity-100"
                     )}
                     style={{ backgroundColor: color }}
                   />
                 ))}
               </div>
               
               <div className="flex items-center gap-4 pt-4 border-t border-zinc-200">
                 <div className="relative group/input">
                    <input 
                      type="color" 
                      value={localColor} 
                      onChange={(e) => setLocalColor(e.target.value)}
                      className="w-12 h-12 rounded-2xl cursor-pointer border-2 border-white shadow-sm active:scale-95 transition-transform" 
                    />
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 opacity-60">Código Hexadecimal</p>
                    <input 
                      type="text" 
                      value={localColor}
                      onChange={(e) => setLocalColor(e.target.value)}
                      className="w-full bg-transparent text-lg font-black text-zinc-800 outline-none uppercase tracking-tight" 
                    />
                 </div>
                 <div className="hidden xs:flex flex-col items-end">
                    <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mb-1.5">Prévia</span>
                    <div className="w-16 h-6 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: localColor }} />
                 </div>
               </div>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-[20px] shadow-lg shadow-zinc-900/10">
               <div>
                  <p className="text-white text-xs font-black">Acesso Simplificado</p>
                  <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Sem exigência de login para clientes</p>
               </div>
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-3 py-1.5 rounded-xl border border-emerald-400/20">Ativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card: Admin como profissional */}
      {hasProfessionals === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <span className="text-lg">👤</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-amber-900">Você é o único profissional?</p>
            <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
              Nenhum profissional cadastrado. Clique abaixo para se cadastrar como profissional e liberar o agendamento online com seus horários.
            </p>
            <button
              onClick={handleCreateAdminAsProfessional}
              disabled={isCreatingProfessional}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all"
            >
              {isCreatingProfessional
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Criando...</>
                : <>+ Me cadastrar como profissional</>}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-start gap-4 pt-4">
        <Button
          onClick={handleSave}
          disabled={isLoading || isUploadingLogo || isUploadingCover}
          className="w-full sm:w-auto bg-zinc-950 hover:bg-black text-white px-8 rounded-xl h-10 font-bold shadow-xl shadow-zinc-900/20 text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
