import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Wifi,
  WifiOff,
  QrCode,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Plug,
  Settings,
  Bell,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  Info,
} from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { cn } from "@/src/lib/utils";

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface WppInstance {
  id: string;
  tenantId: string;
  instanceName: string;
  apiUrl: string;
  apiKey?: string;
  phone?: string;
  status: "disconnected" | "qr_pending" | "connected" | "not_configured";
  qrCode?: string;
  isActive: boolean;
}

interface WppTemplate {
  id: string;
  type: string;
  name: string;
  body: string;
  isActive: boolean;
  isDefault: boolean;
}

interface BotMenuItem {
  id: string;
  label: string;
  action: string;
}

interface WppBotConfig {
  id?: string;
  botEnabled: boolean;
  sendConfirmation: boolean;
  sendReminder24h: boolean;
  sendBirthday: boolean;
  sendCobranca: boolean;
  sendWelcome: boolean;
  menuEnabled: boolean;
  menuWelcomeMsg?: string;
  menuOptions: BotMenuItem[];
}

// ─── Variáveis disponíveis ──────────────────────────────────────────────────

const AVAILABLE_VARS = [
  { key: "{{nome_cliente}}", desc: "Nome do cliente" },
  { key: "{{saudacao}}", desc: "Bom dia / Boa tarde / Boa noite" },
  { key: "{{data_agendamento}}", desc: "Data do agendamento" },
  { key: "{{hora_agendamento}}", desc: "Horário do agendamento" },
  { key: "{{servico}}", desc: "Nome do serviço" },
  { key: "{{profissional}}", desc: "Nome do profissional" },
  { key: "{{nome_estabelecimento}}", desc: "Nome do estabelecimento" },
];

const TEMPLATE_LABELS: Record<string, string> = {
  confirmation: "Confirmação de Agendamento",
  reminder_24h: "Lembrete 24h Antes",
  birthday: "Parabéns de Aniversário",
  cobranca: "Cobrança / Pagamento Pendente",
  welcome: "Boas-vindas (Novo Cliente)",
};

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  confirmation: <CheckCircle2 size={15} className="text-green-500" />,
  reminder_24h: <Bell size={15} className="text-blue-500" />,
  birthday: <span className="text-sm">🎂</span>,
  cobranca: <AlertCircle size={15} className="text-orange-500" />,
  welcome: <MessageCircle size={15} className="text-purple-500" />,
};

// ─── Sub-componente: Card colapsável ────────────────────────────────────────

function SectionCard({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="text-zinc-600">{icon}</span>
          <span className="text-sm font-semibold text-zinc-800">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-zinc-100">{children}</div>}
    </div>
  );
}

// ─── Sub-componente: Toggle ─────────────────────────────────────────────────

function Toggle({ value, onChange, label, desc }: { value: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        {desc && <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>}
      </div>
      <button onClick={() => onChange(!value)} className="ml-4 shrink-0">
        {value
          ? <ToggleRight size={28} className="text-green-500" />
          : <ToggleLeft size={28} className="text-zinc-300" />}
      </button>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export function WppTab() {
  const [instance, setInstance] = useState<WppInstance | null>(null);
  const [instanceForm, setInstanceForm] = useState({ instanceName: "", apiUrl: "", apiKey: "" });
  const [instanceLoading, setInstanceLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const [templates, setTemplates] = useState<WppTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<WppTemplate | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  const [botConfig, setBotConfig] = useState<WppBotConfig>({
    botEnabled: false,
    sendConfirmation: true,
    sendReminder24h: true,
    sendBirthday: true,
    sendCobranca: false,
    sendWelcome: true,
    menuEnabled: false,
    menuWelcomeMsg: "",
    menuOptions: [],
  });
  const [botSaving, setBotSaving] = useState(false);

  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  // ── Carregar dados iniciais ─────────────────────────────────────────────

  useEffect(() => {
    loadInstance();
    loadTemplates();
    loadBotConfig();
  }, []);

  async function loadInstance() {
    setInstanceLoading(true);
    try {
      const res = await apiFetch("/api/wpp/instance");
      const data = await res.json();
      if (data) {
        setInstance(data);
        setInstanceForm({ instanceName: data.instanceName, apiUrl: data.apiUrl, apiKey: data.apiKey || "" });
      }
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
      if (data) {
        setBotConfig({ ...data, menuOptions: typeof data.menuOptions === "string" ? JSON.parse(data.menuOptions || "[]") : (data.menuOptions || []) });
      }
    } catch {}
  }

  // ── Salvar instância ────────────────────────────────────────────────────

  async function handleSaveInstance() {
    if (!instanceForm.instanceName || !instanceForm.apiUrl) {
      showToast("Preencha o nome da instância e a URL da API.", "error");
      return;
    }
    setInstanceLoading(true);
    try {
      const res = await apiFetch("/api/wpp/instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(instanceForm),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Erro ao salvar.", "error"); return; }
      setInstance(data);
      showToast("Instância salva com sucesso!");
    } catch { showToast("Erro ao salvar instância.", "error"); }
    setInstanceLoading(false);
  }

  // ── Conectar (buscar QR) ────────────────────────────────────────────────

  async function handleConnect() {
    setConnectLoading(true);
    try {
      const res = await apiFetch("/api/wpp/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Erro ao conectar.", "error"); return; }
      setInstance(data);
      if (data.status === "connected") showToast("WhatsApp conectado!");
      else showToast("Escaneie o QR code com seu WhatsApp.");
    } catch { showToast("Erro ao conectar.", "error"); }
    setConnectLoading(false);
  }

  // ── Checar status ───────────────────────────────────────────────────────

  async function handleCheckStatus() {
    setStatusLoading(true);
    try {
      const res = await apiFetch("/api/wpp/status");
      const data = await res.json();
      setInstance(prev => prev ? { ...prev, status: data.status, phone: data.phone || prev.phone } : prev);
      if (data.status === "connected") showToast("WhatsApp está conectado!");
      else showToast("WhatsApp desconectado.", "error");
    } catch { showToast("Erro ao verificar status.", "error"); }
    setStatusLoading(false);
  }

  // ── Desconectar ─────────────────────────────────────────────────────────

  async function handleDisconnect() {
    if (!confirm("Deseja desconectar o WhatsApp?")) return;
    try {
      await apiFetch("/api/wpp/disconnect", { method: "POST" });
      setInstance(prev => prev ? { ...prev, status: "disconnected", isActive: false, qrCode: undefined } : prev);
      showToast("WhatsApp desconectado.");
    } catch { showToast("Erro ao desconectar.", "error"); }
  }

  // ── Salvar template ─────────────────────────────────────────────────────

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
      if (!res.ok) { showToast(data.error || "Erro ao salvar.", "error"); return; }
      setTemplates(ts => ts.map(t => t.type === editingTemplate.type ? data : t));
      setEditingTemplate(null);
      showToast("Template salvo!");
    } catch { showToast("Erro ao salvar template.", "error"); }
    setTemplateSaving(false);
  }

  function insertVar(v: string) {
    if (!editingTemplate) return;
    setEditingTemplate(t => t ? { ...t, body: t.body + v } : t);
  }

  // ── Salvar bot config ───────────────────────────────────────────────────

  async function handleSaveBotConfig() {
    setBotSaving(true);
    try {
      const res = await apiFetch("/api/wpp/bot-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...botConfig, menuOptions: botConfig.menuOptions }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Erro ao salvar.", "error"); return; }
      showToast("Configurações do bot salvas!");
    } catch { showToast("Erro ao salvar.", "error"); }
    setBotSaving(false);
  }

  function addMenuItem() {
    setBotConfig(c => ({ ...c, menuOptions: [...c.menuOptions, { id: Date.now().toString(), label: "", action: "human" }] }));
  }

  function removeMenuItem(id: string) {
    setBotConfig(c => ({ ...c, menuOptions: c.menuOptions.filter(m => m.id !== id) }));
  }

  function updateMenuItem(id: string, field: keyof BotMenuItem, value: string) {
    setBotConfig(c => ({ ...c, menuOptions: c.menuOptions.map(m => m.id === id ? { ...m, [field]: value } : m) }));
  }

  // ── Teste de envio ──────────────────────────────────────────────────────

  async function handleSendTest() {
    if (!testPhone || !testMsg) { setTestResult({ ok: false, msg: "Preencha o telefone e a mensagem." }); return; }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await apiFetch("/api/wpp/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMsg }),
      });
      const data = await res.json();
      if (res.ok) setTestResult({ ok: true, msg: "Mensagem enviada com sucesso!" });
      else setTestResult({ ok: false, msg: data.error || "Erro ao enviar." });
    } catch { setTestResult({ ok: false, msg: "Erro de conexão." }); }
    setTestLoading(false);
  }

  // ─── Status badge ───────────────────────────────────────────────────────

  const statusInfo = {
    connected: { label: "Conectado", color: "bg-green-100 text-green-700", icon: <Wifi size={13} /> },
    qr_pending: { label: "Aguardando QR", color: "bg-yellow-100 text-yellow-700", icon: <QrCode size={13} /> },
    disconnected: { label: "Desconectado", color: "bg-red-100 text-red-700", icon: <WifiOff size={13} /> },
    not_configured: { label: "Não configurado", color: "bg-zinc-100 text-zinc-500", icon: <Settings size={13} /> },
  };

  const currentStatus = instance?.status || "not_configured";
  const badge = statusInfo[currentStatus as keyof typeof statusInfo] || statusInfo.not_configured;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2 transition-all",
          toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header status */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <MessageCircle size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-800">WhatsApp Business</p>
            <p className="text-xs text-zinc-500">Notificações e bot automático</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold", badge.color)}>
          {badge.icon}
          {badge.label}
          {instance?.phone && <span className="ml-1 opacity-70">· {instance.phone}</span>}
        </div>
      </div>

      {/* Conexão */}
      <SectionCard title="Conexão com Evolution API" icon={<Plug size={17} />} defaultOpen={!instance?.isActive}>
        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>Requer o <strong>Evolution API</strong> self-hosted. Configure a URL da sua instância e a API Key abaixo.</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">Nome da Instância *</label>
              <input
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="ex: glowcut-studio"
                value={instanceForm.instanceName}
                onChange={e => setInstanceForm(f => ({ ...f, instanceName: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">URL da Evolution API *</label>
              <input
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="ex: https://api.seudominio.com.br"
                value={instanceForm.apiUrl}
                onChange={e => setInstanceForm(f => ({ ...f, apiUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">API Key (opcional)</label>
              <input
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="Chave de autenticação da API"
                value={instanceForm.apiKey}
                onChange={e => setInstanceForm(f => ({ ...f, apiKey: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleSaveInstance}
              disabled={instanceLoading}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {instanceLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar Configuração
            </button>

            {instance && (
              <>
                <button
                  onClick={handleConnect}
                  disabled={connectLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {connectLoading ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
                  Gerar QR Code
                </button>
                <button
                  onClick={handleCheckStatus}
                  disabled={statusLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {statusLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Verificar Status
                </button>
                {instance.isActive && (
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors"
                  >
                    <WifiOff size={13} />
                    Desconectar
                  </button>
                )}
              </>
            )}
          </div>

          {/* QR Code */}
          {instance?.qrCode && instance.status === "qr_pending" && (
            <div className="flex flex-col items-center gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <p className="text-xs font-semibold text-zinc-600">Escaneie com o WhatsApp do seu celular:</p>
              <img
                src={instance.qrCode.startsWith("data:") ? instance.qrCode : `data:image/png;base64,${instance.qrCode}`}
                alt="QR Code WhatsApp"
                className="w-52 h-52 rounded-lg"
              />
              <button onClick={handleCheckStatus} className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline">
                <RefreshCw size={12} /> Já escaneei — verificar conexão
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Notificações automáticas */}
      <SectionCard title="Notificações Automáticas" icon={<Bell size={17} />} defaultOpen>
        <div className="pt-4 space-y-1">
          <Toggle
            value={botConfig.botEnabled}
            onChange={v => setBotConfig(c => ({ ...c, botEnabled: v }))}
            label="Ativar bot WhatsApp"
            desc="Liga/desliga todas as notificações automáticas"
          />
          <Toggle
            value={botConfig.sendConfirmation}
            onChange={v => setBotConfig(c => ({ ...c, sendConfirmation: v }))}
            label="Confirmação de agendamento"
            desc="Enviado quando você confirma um agendamento no painel"
          />
          <Toggle
            value={botConfig.sendReminder24h}
            onChange={v => setBotConfig(c => ({ ...c, sendReminder24h: v }))}
            label="Lembrete 24h antes"
            desc="Lembrete automático no dia anterior ao atendimento"
          />
          <Toggle
            value={botConfig.sendBirthday}
            onChange={v => setBotConfig(c => ({ ...c, sendBirthday: v }))}
            label="Parabéns de aniversário"
            desc="Mensagem automática no aniversário do cliente"
          />
          <Toggle
            value={botConfig.sendCobranca}
            onChange={v => setBotConfig(c => ({ ...c, sendCobranca: v }))}
            label="Cobrança / pagamento pendente"
            desc="Notificação manual de pagamento em aberto"
          />
          <Toggle
            value={botConfig.sendWelcome}
            onChange={v => setBotConfig(c => ({ ...c, sendWelcome: v }))}
            label="Boas-vindas (novo cliente)"
            desc="Enviado ao cadastrar um novo cliente"
          />
          <div className="pt-3">
            <button
              onClick={handleSaveBotConfig}
              disabled={botSaving}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {botSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Salvar Configurações
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Templates de mensagens */}
      <SectionCard title="Templates de Mensagens" icon={<FileText size={17} />} defaultOpen={false}>
        <div className="pt-4 space-y-3">
          {/* Variáveis disponíveis */}
          <div className="bg-zinc-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-zinc-600 mb-2">Variáveis disponíveis:</p>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_VARS.map(v => (
                <span key={v.key} className="text-[11px] bg-white border border-zinc-200 rounded-lg px-2 py-1 font-mono text-zinc-700" title={v.desc}>
                  {v.key}
                </span>
              ))}
            </div>
          </div>

          {/* Lista de templates */}
          {templates.length === 0 && (
            <p className="text-xs text-zinc-400 py-2">Nenhum template encontrado. Os templates padrão serão criados ao salvar a instância.</p>
          )}

          {templates.map(tpl => (
            <div key={tpl.type} className="border border-zinc-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-white">
                <div className="flex items-center gap-2">
                  {TEMPLATE_ICONS[tpl.type] || <FileText size={14} className="text-zinc-400" />}
                  <span className="text-sm font-semibold text-zinc-800">{TEMPLATE_LABELS[tpl.type] || tpl.name}</span>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold",
                    tpl.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500")}>
                    {tpl.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <button
                  onClick={() => setEditingTemplate(editingTemplate?.type === tpl.type ? null : { ...tpl })}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {editingTemplate?.type === tpl.type ? "Fechar" : "Editar"}
                </button>
              </div>

              {editingTemplate?.type === tpl.type && (
                <div className="px-4 pb-4 border-t border-zinc-100 space-y-3 bg-zinc-50">
                  <div className="pt-3">
                    <label className="text-xs font-semibold text-zinc-600 mb-1 block">Nome do template</label>
                    <input
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
                      value={editingTemplate.name}
                      onChange={e => setEditingTemplate(t => t ? { ...t, name: e.target.value } : t)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-600">Mensagem</label>
                      <span className="text-[10px] text-zinc-400">Use *texto* para negrito no WhatsApp</span>
                    </div>
                    <textarea
                      rows={6}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-none font-mono"
                      value={editingTemplate.body}
                      onChange={e => setEditingTemplate(t => t ? { ...t, body: e.target.value } : t)}
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {AVAILABLE_VARS.map(v => (
                        <button
                          key={v.key}
                          onClick={() => insertVar(v.key)}
                          className="text-[10px] bg-white border border-zinc-200 rounded-lg px-2 py-1 font-mono text-blue-600 hover:bg-blue-50 transition-colors"
                          title={v.desc}
                        >
                          + {v.key}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.isActive}
                        onChange={e => setEditingTemplate(t => t ? { ...t, isActive: e.target.checked } : t)}
                        className="rounded"
                      />
                      <span className="text-xs font-medium text-zinc-700">Template ativo</span>
                    </label>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={templateSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                      {templateSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      Salvar Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Menu interativo do bot */}
      <SectionCard title="Menu Interativo do Bot" icon={<MessageCircle size={17} />} defaultOpen={false}>
        <div className="pt-4 space-y-4">
          <Toggle
            value={botConfig.menuEnabled}
            onChange={v => setBotConfig(c => ({ ...c, menuEnabled: v }))}
            label="Ativar menu interativo"
            desc="Quando o cliente enviar qualquer mensagem, o bot responde com o menu de opções"
          />

          {botConfig.menuEnabled && (
            <>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Mensagem de boas-vindas do menu</label>
                <textarea
                  rows={3}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 resize-none"
                  placeholder="Olá! 👋 Bem-vindo ao nosso studio. Como posso te ajudar?"
                  value={botConfig.menuWelcomeMsg || ""}
                  onChange={e => setBotConfig(c => ({ ...c, menuWelcomeMsg: e.target.value }))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-600">Opções do menu</label>
                  <button onClick={addMenuItem} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
                    <Plus size={13} /> Adicionar opção
                  </button>
                </div>
                <div className="space-y-2">
                  {botConfig.menuOptions.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400 w-5 text-right">{idx + 1}.</span>
                      <input
                        className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                        placeholder="ex: 📅 Fazer um agendamento"
                        value={item.label}
                        onChange={e => updateMenuItem(item.id, "label", e.target.value)}
                      />
                      <select
                        className="border border-zinc-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                        value={item.action}
                        onChange={e => updateMenuItem(item.id, "action", e.target.value)}
                      >
                        <option value="booking">Agendamento</option>
                        <option value="check">Consultar agenda</option>
                        <option value="cancel">Cancelar</option>
                        <option value="human">Falar com atendente</option>
                        <option value="info">Informações</option>
                      </select>
                      <button onClick={() => removeMenuItem(item.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleSaveBotConfig}
            disabled={botSaving}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {botSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Salvar Menu
          </button>
        </div>
      </SectionCard>

      {/* Teste de envio */}
      {instance?.isActive && (
        <SectionCard title="Testar Envio" icon={<Send size={17} />} defaultOpen={false}>
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Telefone (com DDD)</label>
                <input
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  placeholder="ex: 11999990000"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Mensagem de teste</label>
                <input
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  placeholder="Olá! Teste do bot Glow & Cut."
                  value={testMsg}
                  onChange={e => setTestMsg(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleSendTest}
              disabled={testLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {testLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              Enviar Mensagem de Teste
            </button>
            {testResult && (
              <div className={cn("flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2",
                testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
                {testResult.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {testResult.msg}
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
