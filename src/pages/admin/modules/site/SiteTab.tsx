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
  Camera
} from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Input, Textarea } from "@/src/components/ui/Input";
import { PageWrapper, SectionTitle, FormRow } from "@/src/components/ui/PageWrapper";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { Switch } from "@/src/components/ui/Switch";
import { useToast } from "@/src/components/ui/Toast";
import { apiFetch } from "@/src/lib/api";

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
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
      const res = await apiFetch("/api/admin/tenant/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
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

  const handleImageUpload = async (
    file: File,
    field: "logoUrl" | "siteCoverUrl",
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
      </div>
    </PageWrapper>
  );
}
