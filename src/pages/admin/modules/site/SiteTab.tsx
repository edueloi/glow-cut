import React, { useState, useEffect } from "react";
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
  FileText
} from "lucide-react";
import { motion } from "motion/react";
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
    feature3Description: ""
  });

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
            feature3Description: data.feature3Description || ""
          });
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
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/tenant/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
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
                />
                <Input
                  label="Link do Site (Slug)"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="ex: barber-premium"
                  addonLeft="agendelle.com/"
                />
              </FormRow>

              <Input
                label="Frase de Destaque"
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                placeholder="Ex: O melhor corte da cidade está aqui."
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
                label="Título da Seção (ex: Nossa História)"
                value={formData.aboutTitle}
                onChange={(e) => setFormData({ ...formData, aboutTitle: e.target.value })}
                placeholder="Nossa História"
              />
              <Textarea
                label="Conteúdo da História"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                placeholder="Conte a trajetória do seu negócio..."
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
                  />
                  <Input
                    label="Descrição Curta"
                    value={formData.feature1Description}
                    onChange={(e) => setFormData({ ...formData, feature1Description: e.target.value })}
                    placeholder="Ex: Excelência em cada detalhe."
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
                  />
                  <Input
                    label="Descrição Curta"
                    value={formData.feature2Description}
                    onChange={(e) => setFormData({ ...formData, feature2Description: e.target.value })}
                    placeholder="Ex: Profissionais qualificados."
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
                  />
                  <Input
                    label="Descrição Curta"
                    value={formData.feature3Description}
                    onChange={(e) => setFormData({ ...formData, feature3Description: e.target.value })}
                    placeholder="Ex: Seu bem-estar em primeiro lugar."
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
              />
              <Textarea
                label="Visão"
                value={formData.vision}
                onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                placeholder="Onde você quer chegar nos próximos anos?"
                rows={2}
              />
              <Textarea
                label="Valores"
                value={formData.values}
                onChange={(e) => setFormData({ ...formData, values: e.target.value })}
                placeholder="Quais princípios guiam o seu atendimento?"
                rows={2}
              />
            </div>
          </PanelCard>
        </div>

        <div className="space-y-6">
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
              />
              <Input
                label="Telefone de Contato"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
              <Input
                label="Endereço Exibido"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua Exemplo, 123..."
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
