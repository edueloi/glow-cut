import React, { useState, useEffect } from "react";
import {
  MessageCircle, Wifi, WifiOff, QrCode, RefreshCw,
  FileText, Bell, AlertCircle, CheckCircle2, Loader2,
  Send, Settings,
} from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { cn } from "@/src/lib/utils";
import {
  PageWrapper, SectionTitle, PanelCard,
  Button, Input, Switch, Badge,
  Modal, ModalFooter, useToast,
  TokenTextarea,
} from "@/src/components/ui";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface WppInstance {
  id: string;
  tenantId: string;
  instanceName: string;
  phone?: string;
  status: "disconnected" | "qr_pending" | "connected" | "not_configured";
  qrCode?: string;
  isActive: boolean;
  wppAllowed?: boolean;
  canConnectOwnBot?: boolean;
  canUseSystemBot?: boolean;
}

interface WppTemplate {
  id: string;
  type: string;
  name: string;
  body: string;
  isActive: boolean;
  isDefault: boolean;
}

interface WppBotConfig {
  id?: string;
  botEnabled: boolean;
  sendConfirmation: boolean;
  sendReminder24h: boolean;
  sendBirthday: boolean;
  sendCobranca: boolean;
  sendWelcome: boolean;
}

// ─── Constantes ─────────────────────────────────────────────────────────────

const AVAILABLE_VARS = [
  { key: "{{nome_cliente}}", desc: "Nome do cliente" },
  { key: "{{saudacao}}", desc: "Bom dia / Boa tarde / Boa noite conforme horário" },
  { key: "{{data_agendamento}}", desc: "Data do agendamento (ex: 25/04/2026)" },
  { key: "{{hora_agendamento}}", desc: "Horário do agendamento (ex: 14:30)" },
  { key: "{{servico}}", desc: "Nome do serviço agendado" },
  { key: "{{profissional}}", desc: "Nome do profissional responsável" },
  { key: "{{nome_estabelecimento}}", desc: "Nome do salão/barbearia" },
  { key: "{{telefone_estabelecimento}}", desc: "Telefone/WhatsApp do estabelecimento" },
  { key: "{{endereco_estabelecimento}}", desc: "Endereço do estabelecimento" },
  { key: "{{link_agendamento}}", desc: "Link da agenda online do estabelecimento" },
  { key: "{{valor_servico}}", desc: "Valor do serviço (ex: R$ 50,00)" },
  { key: "{{data_nascimento_cliente}}", desc: "Data de aniversário do cliente" },
  { key: "{{observacoes}}", desc: "Observações do agendamento" },
];

const TEMPLATE_LABELS: Record<string, string> = {
  confirmation: "Confirmação de Agendamento",
  reminder_24h: "Lembrete 24h Antes",
  birthday: "Parabéns de Aniversário",
  cobranca: "Cobrança / Pagamento Pendente",
  welcome: "Boas-vindas (Novo Cliente)",
};

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  confirmation: <CheckCircle2 size={15} className="text-emerald-500" />,
  reminder_24h: <Bell size={15} className="text-blue-500" />,
  birthday: <span className="text-sm">🎂</span>,
  cobranca: <AlertCircle size={15} className="text-orange-500" />,
  welcome: <MessageCircle size={15} className="text-purple-500" />,
};

// ─── Componente principal ────────────────────────────────────────────────────

export function WppTab() {
  const toast = useToast();

  const [instance, setInstance] = useState<WppInstance | null>(null);
  const [instanceLoading, setInstanceLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [qrPolling, setQrPolling] = useState(false);

  const [templates, setTemplates] = useState<WppTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<WppTemplate | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [botConfig, setBotConfig] = useState<WppBotConfig>({
    botEnabled: false,
    sendConfirmation: true,
    sendReminder24h: true,
    sendBirthday: true,
    sendCobranca: false,
    sendWelcome: true,
  });
  const [botSaving, setBotSaving] = useState(false);

  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // ── Polling QR ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadInstance();
    loadTemplates();
    loadBotConfig();
  }, []);

  useEffect(() => {
    let timer: any;
    if (qrPolling || instance?.status === "qr_pending") {
      timer = setInterval(async () => {
        try {
          const res = await apiFetch("/api/wpp/status");
          const data = await res.json();
          setInstance(prev => prev ? { ...prev, status: data.status, phone: data.phone, qrCode: data.qrCode } : prev);
          if (data.status === "connected") {
            setQrPolling(false);
            toast.success("WhatsApp conectado com sucesso!");
          }
        } catch {}
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [qrPolling, instance?.status]);

  // ── Funções ─────────────────────────────────────────────────────────────────

  async function loadInstance() {
    setInstanceLoading(true);
    try {
      const res = await apiFetch("/api/wpp/instance");
      const data = await res.json();
      if (data) setInstance(data);
    } catch {}
    setInstanceLoading(false);
  }

  async function loadTemplates() {
    try {
      const res = await apiFetch("/api/wpp/templates");
      const data = await res.json();
      if (Array.isArray(data)) setTemplates(data);
    } catch {}
  }

  async function loadBotConfig() {
    try {
      const res = await apiFetch("/api/wpp/bot-config");
      const data = await res.json();
      if (data) setBotConfig(data);
    } catch {}
  }

  async function handleConnect() {
    setConnectLoading(true);
    try {
      if (!instance?.id || instance?.status === "not_configured") {
        await apiFetch("/api/wpp/instance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instanceName: "Meu Bot" }),
        });
      }
      const res = await apiFetch("/api/wpp/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao conectar.");
      } else {
        setInstance(prev => prev ? { ...prev, ...data } : data);
        setQrPolling(true);
        toast.success("Gerando QR Code...");
      }
    } catch {
      toast.error("Erro ao iniciar conexão.");
    }
    setConnectLoading(false);
  }

  async function handleCheckStatus() {
    setStatusLoading(true);
    try {
      const res = await apiFetch("/api/wpp/status");
      const data = await res.json();
      setInstance(prev => prev ? { ...prev, ...data } : prev);
      if (data.status === "connected") toast.success("WhatsApp está conectado!");
      else toast.error("Ainda não conectado.");
    } catch { toast.error("Erro ao verificar."); }
    setStatusLoading(false);
  }

  async function handleDisconnect() {
    if (!confirm("Deseja desconectar o WhatsApp?")) return;
    try {
      await apiFetch("/api/wpp/disconnect", { method: "POST" });
      setInstance(prev => prev ? { ...prev, status: "disconnected", isActive: false, qrCode: undefined } : prev);
      toast.success("WhatsApp desconectado.");
    } catch { toast.error("Erro ao desconectar."); }
  }

  async function handleSaveTemplate() {
    if (!editingTemplate) return;
    setTemplateSaving(true);
    try {
      const res = await apiFetch(`/api/wpp/templates/${editingTemplate.type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editingTemplate.body, name: editingTemplate.name, isActive: editingTemplate.isActive }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao salvar."); return; }
      setTemplates(ts => ts.map(t => t.type === editingTemplate.type ? data : t));
      setShowTemplateModal(false);
      setEditingTemplate(null);
      toast.success("Template salvo!");
    } catch { toast.error("Erro ao salvar template."); }
    setTemplateSaving(false);
  }

  async function handleSaveBotConfig() {
    setBotSaving(true);
    try {
      const res = await apiFetch("/api/wpp/bot-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botConfig),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao salvar."); return; }
      toast.success("Configurações do bot salvas!");
    } catch { toast.error("Erro ao salvar."); }
    setBotSaving(false);
  }

  async function handleSendTest() {
    if (!testPhone || !testMsg) { toast.error("Preencha o telefone e a mensagem."); return; }
    setTestLoading(true);
    try {
      const res = await apiFetch("/api/wpp/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMsg }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Erro ao enviar.");
      else { toast.success("Mensagem enviada com sucesso!"); setShowTestModal(false); }
    } catch { toast.error("Erro de conexão."); }
    setTestLoading(false);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (instanceLoading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Carregando configurações...</p>
        </div>
      </PageWrapper>
    );
  }

  // ── Bloqueado ───────────────────────────────────────────────────────────────

  if (instance && instance.wppAllowed === false) {
    return (
      <PageWrapper>
        <div className="max-w-lg mx-auto mt-10">
          <PanelCard
            icon={MessageCircle}
            iconWrapClassName="bg-zinc-50 border-zinc-100"
            iconClassName="text-zinc-400"
            title="Módulo WhatsApp Bloqueado"
            description="O recurso de notificações automáticas via WhatsApp não está liberado para o seu plano atual ou foi desativado pelo administrador."
          >
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest text-center py-2">
              Fale com o suporte para liberar este recurso
            </p>
          </PanelCard>
        </div>
      </PageWrapper>
    );
  }

  // ── Status badge ────────────────────────────────────────────────────────────

  const isConnected = instance?.status === "connected";
  const isQrPending = instance?.status === "qr_pending";

  const statusBadge = isConnected
    ? <Badge color="success">Conectado {instance?.phone ? `· +${instance.phone}` : ""}</Badge>
    : isQrPending
    ? <Badge color="warning">Aguardando QR</Badge>
    : <Badge color="default">Desconectado</Badge>;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageWrapper>
      <div className="space-y-4 sm:space-y-5">

        {/* Header da página */}
        <SectionTitle
          title="WhatsApp Business"
          description="Notificações automáticas e lembretes inteligentes para seus clientes."
          icon={MessageCircle}
          action={statusBadge}
        />

        {/* Aviso de Bot do Sistema */}
        {!isConnected && instance?.canUseSystemBot && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
              <MessageCircle size={20} className="text-blue-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-900">Bot Agendelle Ativo</h4>
              <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                Você não tem um WhatsApp conectado, então o sistema enviará notificações através do <strong>Bot Agendelle</strong> por padrão.
              </p>
            </div>
          </div>
        )}

        {/* Card: Conexão */}
        {instance?.canConnectOwnBot && (
          <PanelCard
            icon={QrCode}
            iconWrapClassName="bg-zinc-50 border-zinc-100"
            iconClassName="text-zinc-600"
            title="Conectar seu Próprio WhatsApp"
            description="Use seu próprio número para enviar mensagens aos seus clientes."
            action={
              isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="text-[11px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                >
                  Desconectar
                </button>
              ) : undefined
            }
          >
            {isConnected ? (
              /* ── Conectado ── */
              <div className="flex flex-col sm:flex-row items-center gap-5 py-2">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Wifi size={32} className="text-emerald-500 animate-pulse" />
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h4 className="text-lg font-black text-zinc-900">Seu WhatsApp está conectado! 🚀</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Notificações serão enviadas pelo seu número <strong>+{instance?.phone}</strong>.
                  </p>
                  <button
                    onClick={handleCheckStatus}
                    disabled={statusLoading}
                    className="text-xs font-black text-zinc-400 flex items-center gap-2 hover:text-zinc-900 transition-colors uppercase tracking-widest mx-auto sm:mx-0"
                  >
                    <RefreshCw size={12} className={cn(statusLoading && "animate-spin")} />
                    Verificar conexão
                  </button>
                </div>
              </div>
            ) : (
              /* ── Desconectado / QR ── */
              <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1 space-y-6 w-full">
                  <div className="space-y-2">
                    <h4 className="text-xl sm:text-2xl font-black text-zinc-900 leading-tight">
                      Conecte seu WhatsApp em segundos
                    </h4>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Envie mensagens profissionais automáticas. É seguro, rápido e usa o seu próprio número.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {["Abra o WhatsApp no seu celular", "Toque em Aparelhos Conectados", "Aponte a câmera para o código ao lado"].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-xs font-black shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-zinc-600 font-semibold">{step}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleConnect}
                    disabled={connectLoading}
                    loading={connectLoading}
                    className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-widest"
                  >
                    <QrCode size={16} className="mr-2" />
                    {instance?.qrCode ? "Gerar Novo QR Code" : "Começar Conexão Agora"}
                  </Button>
                </div>

                {/* QR Code */}
                <div className="shrink-0 flex justify-center">
                  {instance?.qrCode ? (
                    <div className="p-4 bg-white border-4 border-zinc-100 rounded-3xl shadow-lg">
                      <img
                        src={instance.qrCode.startsWith("data:") ? instance.qrCode : `data:image/png;base64,${instance.qrCode}`}
                        alt="QR Code"
                        className="w-44 h-44 sm:w-56 sm:h-56 object-contain rounded-xl"
                      />
                      <div className="mt-3 flex justify-center">
                        <Badge color="warning">Aguardando leitura</Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="w-44 h-44 sm:w-56 sm:h-56 bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-zinc-300">
                      <QrCode size={40} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center px-6 leading-relaxed">
                        QR Code aparecerá aqui
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </PanelCard>
        )}

        {/* Card: Configurações de Disparo */}
        <PanelCard
          icon={Settings}
          iconWrapClassName="bg-amber-50 border-amber-100"
          iconClassName="text-amber-600"
          title="Configurações de Disparo"
          description="Escolha quais mensagens automáticas serão enviadas."
          action={
            <Button size="sm" onClick={handleSaveBotConfig} loading={botSaving}>
              Salvar Configurações
            </Button>
          }
        >
          <div className="divide-y divide-zinc-100">
            {([
              { key: "botEnabled", label: "Ativar Automações", desc: "Se desligado, nenhuma mensagem será enviada" },
              { key: "sendConfirmation", label: "Confirmação de Agendamento", desc: "Enviado ao confirmar um agendamento no painel" },
              { key: "sendReminder24h", label: "Lembrete 24h Antes", desc: "Lembrete automático no dia anterior ao atendimento" },
              { key: "sendBirthday", label: "Parabéns de Aniversário", desc: "Mensagem no aniversário do cliente" },
              { key: "sendWelcome", label: "Boas-vindas (Novo Cliente)", desc: "Enviado ao cadastrar um novo cliente" },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-800">{label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
                </div>
                <Switch
                  checked={botConfig[key]}
                  onCheckedChange={v => setBotConfig(c => ({ ...c, [key]: v }))}
                />
              </div>
            ))}
          </div>
        </PanelCard>

        {/* Card: Templates */}
        <PanelCard
          icon={FileText}
          iconWrapClassName="bg-blue-50 border-blue-100"
          iconClassName="text-blue-600"
          title="Templates de Mensagens"
          description="Personalize as mensagens enviadas automaticamente."
        >
          <div className="space-y-2">
            {templates.map(tpl => (
              <div key={tpl.type} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                    {TEMPLATE_ICONS[tpl.type] || <FileText size={14} className="text-zinc-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-800 truncate">{TEMPLATE_LABELS[tpl.type] || tpl.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{tpl.body.slice(0, 60)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge color={tpl.isActive ? "success" : "default"} size="sm">
                    {tpl.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => { setEditingTemplate({ ...tpl }); setShowTemplateModal(true); }}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>

        {/* Card: Teste de Envio — só quando conectado */}
        {isConnected && (
          <PanelCard
            icon={Send}
            iconWrapClassName="bg-emerald-50 border-emerald-100"
            iconClassName="text-emerald-600"
            title="Testar Envio"
            description="Envie uma mensagem de teste para verificar a conexão."
            action={
              <Button size="sm" onClick={() => setShowTestModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Send size={14} className="mr-1.5" /> Enviar Teste
              </Button>
            }
          >
            <p className="text-sm text-zinc-400">
              Clique em <strong className="text-zinc-700">Enviar Teste</strong> para abrir o formulário e testar o envio de mensagem pelo WhatsApp conectado.
            </p>
          </PanelCard>
        )}
      </div>

      {/* Modal: Editar Template */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
        title={editingTemplate ? (TEMPLATE_LABELS[editingTemplate.type] || editingTemplate.name) : ""}
        size="md"
        mobileStyle="bottom-sheet"
        footer={
          <ModalFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}>
              Cancelar
            </Button>
            <Button size="sm" loading={templateSaving} onClick={handleSaveTemplate}>
              Salvar Template
            </Button>
          </ModalFooter>
        }
      >
        {editingTemplate && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">
                Mensagem do Bot
              </label>
              <TokenTextarea
                value={editingTemplate.body}
                onChange={body => setEditingTemplate(t => t ? { ...t, body } : t)}
                placeholder="Escreva a mensagem aqui..."
                rows={7}
                availableVars={AVAILABLE_VARS}
              />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-zinc-100">
              <span className="text-sm font-semibold text-zinc-700">Template ativo</span>
              <Switch
                checked={editingTemplate.isActive}
                onCheckedChange={v => setEditingTemplate(t => t ? { ...t, isActive: v } : t)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Teste de Envio */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Testar Envio de Mensagem"
        size="sm"
        mobileStyle="bottom-sheet"
        footer={
          <ModalFooter>
            <Button variant="outline" size="sm" onClick={() => setShowTestModal(false)}>Cancelar</Button>
            <Button
              size="sm"
              loading={testLoading}
              onClick={handleSendTest}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send size={14} className="mr-1.5" /> Enviar Agora
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <Input
            label="Telefone de Teste"
            placeholder="ex: 11999990000"
            value={testPhone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestPhone(e.target.value)}
          />
          <Input
            label="Mensagem"
            placeholder="Olá! Teste de conexão."
            value={testMsg}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestMsg(e.target.value)}
          />
        </div>
      </Modal>
    </PageWrapper>
  );
}
