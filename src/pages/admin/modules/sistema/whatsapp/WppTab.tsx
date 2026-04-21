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
import { Button } from "@/src/components/ui/Button";

// ─── Tipos ─────────────────────────────────────────────────────────────────

interface WppInstance {
  id: string;
  tenantId: string;
  instanceName: string;
  phone?: string;
  status: "disconnected" | "qr_pending" | "connected" | "not_configured";
  qrCode?: string;
  isActive: boolean;
  wppAllowed?: boolean;
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
  const [instanceLoading, setInstanceLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [qrPolling, setQrPolling] = useState(false);

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

  // Polling de QR Code / Status
  useEffect(() => {
    let timer: any;
    if (qrPolling || (instance?.status === "qr_pending")) {
      timer = setInterval(async () => {
        try {
          const res = await apiFetch("/api/wpp/status");
          const data = await res.json();
          setInstance(prev => prev ? { ...prev, status: data.status, phone: data.phone, qrCode: data.qrCode } : prev);
          if (data.status === "connected") {
            setQrPolling(false);
            showToast("WhatsApp conectado com sucesso! 🎉");
          }
        } catch {}
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [qrPolling, instance?.status]);

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
      if (data) {
        setBotConfig({ ...data, menuOptions: typeof data.menuOptions === "string" ? JSON.parse(data.menuOptions || "[]") : (data.menuOptions || []) });
      }
    } catch {}
  }

  // ── Conectar (Baileys Direto) ────────────────────────────────────────────

  async function handleConnect() {
    setConnectLoading(true);
    try {
      // Primeiro garante que a instância existe no BD
      if (!instance?.id || instance?.status === "not_configured") {
        await apiFetch("/api/wpp/instance", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instanceName: "Meu Bot" }) 
        });
      }

      const res = await apiFetch("/api/wpp/connect", { method: "POST" });
      const data = await res.json();
      
      if (!res.ok) { 
        showToast(data.error || "Erro ao conectar.", "error"); 
      } else {
        setInstance(prev => prev ? { ...prev, ...data } : data);
        setQrPolling(true);
        showToast("Gerando QR Code...");
      }
    } catch { 
      showToast("Erro ao iniciar conexão.", "error"); 
    }
    setConnectLoading(false);
  }

  async function handleCheckStatus() {
    setStatusLoading(true);
    try {
      const res = await apiFetch("/api/wpp/status");
      const data = await res.json();
      setInstance(prev => prev ? { ...prev, ...data } : prev);
      if (data.status === "connected") showToast("WhatsApp está conectado!");
      else showToast("Ainda não conectado.", "error");
    } catch { showToast("Erro ao verificar.", "error"); }
    setStatusLoading(false);
  }

  async function handleDisconnect() {
    if (!confirm("Deseja desconectar o WhatsApp? Isso parará os envios automáticos.")) return;
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
      if (!res.ok) { setTestResult({ ok: false, msg: data.error || "Erro ao enviar." }); }
      else { setTestResult({ ok: true, msg: "Mensagem enviada com sucesso!" }); }
    } catch { setTestResult({ ok: false, msg: "Erro de conexão." }); }
    setTestLoading(false);
  }

  if (instanceLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
        <p className="text-sm font-semibold text-zinc-400">Carregando configurações...</p>
      </div>
    );
  }

  // Badge de status da conexão
  const badge = (() => {
    const s = instance?.status;
    if (s === "connected")     return { color: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <Wifi size={14} />, label: "Conectado" };
    if (s === "qr_pending")    return { color: "bg-amber-50 text-amber-700 border border-amber-200", icon: <QrCode size={14} />, label: "Aguardando QR" };
    if (s === "disconnected")  return { color: "bg-zinc-100 text-zinc-500 border border-zinc-200", icon: <WifiOff size={14} />, label: "Desconectado" };
    return { color: "bg-zinc-100 text-zinc-400 border border-zinc-200", icon: <WifiOff size={14} />, label: "Não configurado" };
  })();

  // TRAVA DO SUPER ADMIN
  if (instance && instance.wppAllowed === false) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-12 text-center space-y-6 shadow-sm">
          <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle size={48} className="text-zinc-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-zinc-900">Módulo WhatsApp Bloqueado</h2>
            <p className="text-zinc-500 leading-relaxed max-w-md mx-auto">
              O recurso de notificações automáticas via WhatsApp não está liberado para o seu plano atual ou foi desativado pelo administrador.
            </p>
          </div>
          <div className="pt-6 border-t border-zinc-100">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Fale com o suporte para liberar este recurso</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-[100] px-5 py-3.5 rounded-2xl text-sm font-black shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300",
          toast.type === "success" ? "bg-zinc-900 text-white" : "bg-rose-600 text-white"
        )}>
          {toast.type === "success" ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Hero / Header Status */}
      <div className="bg-white border border-zinc-200 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 flex items-center justify-center shadow-inner">
            <MessageCircle size={32} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">WhatsApp Business</h1>
            <p className="text-sm text-zinc-500">Notificações automáticas e lembretes inteligentes</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm", badge.color)}>
          {badge.icon}
          {badge.label}
          {instance?.phone && <span className="ml-2 py-0.5 px-2 bg-black/5 rounded-lg opacity-70">+{instance.phone}</span>}
        </div>
      </div>

      {/* Conexão Direta (Baileys) */}
      <div className="bg-white border border-zinc-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <div className="flex items-center gap-3">
            <QrCode size={18} className="text-zinc-400" />
            <h3 className="text-xs font-black text-zinc-800 uppercase tracking-[0.2em]">Conexão do Dispositivo</h3>
          </div>
          {instance?.status === "connected" && (
            <button onClick={handleDisconnect} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">
              Desconectar WhatsApp
            </button>
          )}
        </div>
        
        <div className="p-10">
          {instance?.status === "connected" ? (
            <div className="flex flex-col md:flex-row items-center gap-10 py-4">
              <div className="w-28 h-28 bg-emerald-50 rounded-[2rem] flex items-center justify-center shrink-0 shadow-inner">
                <Wifi size={48} className="text-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-3 text-center md:text-left">
                <h4 className="text-2xl font-black text-zinc-900">Seu WhatsApp está pronto! 🚀</h4>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-md">
                  Todas as notificações de agendamentos, lembretes e aniversários serão enviadas pelo número <strong>+{instance.phone}</strong>.
                </p>
                <div className="pt-3 flex flex-wrap justify-center md:justify-start gap-4">
                  <button onClick={handleCheckStatus} disabled={statusLoading} className="text-xs font-black text-zinc-400 flex items-center gap-2 hover:text-zinc-900 transition-colors uppercase tracking-widest">
                    <RefreshCw size={12} className={cn(statusLoading && "animate-spin")} /> Verificar conexão
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-12 items-center">
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-3xl font-black text-zinc-900 leading-[1.1] tracking-tighter">Conecte seu WhatsApp em segundos</h4>
                  <p className="text-base text-zinc-500 leading-relaxed">
                    Envie mensagens profissionais automáticas para seus clientes. É seguro, rápido e você usa o seu próprio número de celular.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    "Abra o WhatsApp no seu celular",
                    "Toque em Aparelhos Conectados",
                    "Aponte a câmera para o código ao lado"
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <span className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                        {i+1}
                      </span>
                      <span className="text-sm text-zinc-600 font-bold">{step}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-6">
                  <Button 
                    onClick={handleConnect} 
                    disabled={connectLoading}
                    className="h-14 px-10 rounded-2xl bg-zinc-900 text-white font-black shadow-2xl hover:bg-zinc-800 hover:translate-y-[-2px] active:translate-y-0 transition-all text-sm uppercase tracking-widest"
                  >
                    {connectLoading ? <Loader2 className="animate-spin mr-2" size={18} /> : <QrCode className="mr-2" size={18} />}
                    {instance?.qrCode ? "Gerar Novo QR Code" : "Começar Conexão Agora"}
                  </Button>
                </div>
              </div>

              <div className="shrink-0">
                {instance?.qrCode ? (
                  <div className="p-6 bg-white border-[6px] border-zinc-50 rounded-[3rem] shadow-2xl relative group">
                    <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <RefreshCw className="text-zinc-400" />
                    </div>
                    <img 
                      src={instance.qrCode.startsWith("data:") ? instance.qrCode : `data:image/png;base64,${instance.qrCode}`} 
                      alt="QR Code" 
                      className="w-64 h-64 object-contain rounded-2xl"
                    />
                    <div className="mt-6 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-full">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Aguardando leitura</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-72 h-72 bg-zinc-50 border-4 border-dashed border-zinc-200 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-zinc-300">
                    <QrCode size={56} className="opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 text-center px-10 leading-relaxed">
                      O QR Code para conexão<br/>aparecerá aqui
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notificações automáticas */}
      <SectionCard title="Configurações de Disparo" icon={<Settings size={17} />} defaultOpen>
        <div className="pt-4 space-y-1">
          <Toggle
            value={botConfig.botEnabled}
            onChange={v => setBotConfig(c => ({ ...c, botEnabled: v }))}
            label="Ativar Automações de WhatsApp"
            desc="Se desligado, nenhuma mensagem automática será enviada"
          />
          <Toggle
            value={botConfig.sendConfirmation}
            onChange={v => setBotConfig(c => ({ ...c, sendConfirmation: v }))}
            label="Confirmação de Agendamento"
            desc="Enviado quando você confirma um agendamento no painel"
          />
          <Toggle
            value={botConfig.sendReminder24h}
            onChange={v => setBotConfig(c => ({ ...c, sendReminder24h: v }))}
            label="Lembrete 24h Antes"
            desc="Lembrete automático no dia anterior ao atendimento"
          />
          <Toggle
            value={botConfig.sendBirthday}
            onChange={v => setBotConfig(c => ({ ...c, sendBirthday: v }))}
            label="Parabéns de Aniversário"
            desc="Mensagem automática no aniversário do cliente"
          />
          <Toggle
            value={botConfig.sendWelcome}
            onChange={v => setBotConfig(c => ({ ...c, sendWelcome: v }))}
            label="Boas-vindas (Novo Cliente)"
            desc="Enviado ao cadastrar um novo cliente"
          />
          
          <div className="pt-8 flex justify-end border-t border-zinc-50 mt-6">
             <Button 
                onClick={handleSaveBotConfig} 
                disabled={botSaving}
                className="bg-zinc-900 text-white font-black rounded-2xl px-8"
              >
               {botSaving && <Loader2 size={16} className="animate-spin mr-2" />}
               Salvar Configurações
             </Button>
          </div>
        </div>
      </SectionCard>

      {/* Templates de mensagens */}
      <SectionCard title="Templates de Mensagens" icon={<FileText size={17} />} defaultOpen={false}>
        <div className="pt-4 space-y-4">
          <div className="bg-zinc-900 rounded-3xl p-5 shadow-inner">
            <p className="text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Variáveis inteligentes:</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARS.map(v => (
                <button 
                  key={v.key}
                  onClick={() => insertVar(v.key)}
                  className="text-[11px] bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 font-mono text-zinc-300 hover:bg-white/10 transition-colors"
                  title={v.desc}
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {templates.map(tpl => (
              <div key={tpl.type} className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-6 py-4 bg-zinc-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      {TEMPLATE_ICONS[tpl.type] || <FileText size={14} className="text-zinc-400" />}
                    </div>
                    <span className="text-sm font-black text-zinc-800">{TEMPLATE_LABELS[tpl.type] || tpl.name}</span>
                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider",
                      tpl.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500")}>
                      {tpl.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <button
                    onClick={() => setEditingTemplate(editingTemplate?.type === tpl.type ? null : { ...tpl })}
                    className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors"
                  >
                    {editingTemplate?.type === tpl.type ? "Fechar" : "Editar"}
                  </button>
                </div>

                {editingTemplate?.type === tpl.type && (
                  <div className="px-6 pb-6 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Mensagem do Bot</label>
                      <textarea
                        rows={6}
                        className="w-full border border-zinc-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all resize-none font-medium leading-relaxed"
                        value={editingTemplate.body}
                        onChange={e => setEditingTemplate(t => t ? { ...t, body: e.target.value } : t)}
                        placeholder="Escreva sua mensagem aqui..."
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all", editingTemplate.isActive ? "bg-zinc-900 border-zinc-900" : "border-zinc-200")}>
                          {editingTemplate.isActive && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={editingTemplate.isActive}
                          onChange={e => setEditingTemplate(t => t ? { ...t, isActive: e.target.checked } : t)}
                        />
                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest group-hover:text-zinc-900">Template Ativo</span>
                      </label>
                      <Button onClick={handleSaveTemplate} loading={templateSaving} size="sm">
                        Salvar Template
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Teste de envio */}
      {instance?.status === "connected" && (
        <SectionCard title="Testar Envio" icon={<Send size={17} />} defaultOpen={false}>
          <div className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Telefone de Teste</label>
                <input
                  className="w-full border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all font-bold"
                  placeholder="ex: 11999990000"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Sua Mensagem</label>
                <input
                  className="w-full border border-zinc-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all font-bold"
                  placeholder="Olá! Teste de conexão."
                  value={testMsg}
                  onChange={e => setTestMsg(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 pt-2">
              <Button onClick={handleSendTest} loading={testLoading} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black">
                <Send size={16} className="mr-2" /> Enviar Teste Agora
              </Button>
              {testResult && (
                <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2",
                  testResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600")}>
                  {testResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

