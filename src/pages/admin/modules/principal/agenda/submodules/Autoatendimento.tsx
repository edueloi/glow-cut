import React, { useState, useEffect } from "react";
import {
  MonitorSmartphone, RefreshCw, Info, CheckCircle, Clock,
  Globe, EyeOff, Eye, Shield, MessageSquare, ExternalLink, Copy,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Switch } from "@/src/components/ui/Switch";
import { useToast } from "@/src/components/ui/Toast";
import { useAuth } from "@/src/App";

// ─────────────────────────────────────────────────────────────────────────────
// Autoatendimento — Portal de agendamento self-service para clientes
// ─────────────────────────────────────────────────────────────────────────────

interface AutoatendimentoProps {
  professionals: any[];
  services: any[];
  onRefresh: () => void;
  onGoToMinhaAgenda?: () => void;
}

interface SelfServiceSettings {
  enableSelfService: boolean;
  selfServiceRequireLogin: boolean;
  selfServiceShowProfessional: boolean;
  allowClientCancellation: boolean;
  allowClientReschedule: boolean;
  allowClientRecurrence: boolean;
  maxAdvanceDays: number;
  minAdvanceMinutes: number;
  selfServiceWelcomeMessage: string;
  selfServiceShowPrices: boolean;
}

const DEFAULT_SETTINGS: SelfServiceSettings = {
  enableSelfService: true,
  selfServiceRequireLogin: false,
  selfServiceShowProfessional: true,
  allowClientCancellation: true,
  allowClientReschedule: false,
  allowClientRecurrence: false,
  maxAdvanceDays: 60,
  minAdvanceMinutes: 30,
  selfServiceWelcomeMessage: "",
  selfServiceShowPrices: true,
};

const DAYS_OPTIONS = [7, 14, 21, 30, 60, 90];
const HOURS_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1h" },
  { value: 120, label: "2h" },
  { value: 240, label: "4h" },
  { value: 480, label: "8h" },
  { value: 720, label: "12h" },
  { value: 1440, label: "24h" },
  { value: 2880, label: "48h" },
];

export function Autoatendimento({ professionals, services, onRefresh, onGoToMinhaAgenda }: AutoatendimentoProps) {
  const toast = useToast();
  const { user } = useAuth();
  const tenantSlug = user?.tenantSlug || "";
  const portalUrl = tenantSlug ? `/agendar/${tenantSlug}` : null;
  const portalFullUrl = tenantSlug ? `${window.location.origin}/agendar/${tenantSlug}` : null;

  const [settings, setSettings] = useState<SelfServiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/api/settings/agenda");
        if (res.ok) {
          const d = await res.json();
          const s = d.settings ?? d;
          setSettings((prev) => ({ ...prev, ...s }));
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Configurações de autoatendimento salvas.");
      } else {
        toast.error("Erro ao salvar configurações.");
      }
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof SelfServiceSettings>(key: K, val: SelfServiceSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse pb-20 sm:pb-6">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-zinc-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 sm:pb-6 relative">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
            <MonitorSmartphone size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">Autoatendimento Online</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Configure o portal público para clientes agendarem seus próprios horários.</p>
          </div>
        </div>
        <button onClick={onRefresh} className="self-start sm:self-auto p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-all" title="Atualizar">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-200">
        <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          O <strong>portal de autoatendimento</strong> é uma página pública onde seus clientes podem
          visualizar os serviços disponíveis e agendar horários sem precisar ligar ou enviar mensagem.
          Os agendamentos aparecem automaticamente na sua agenda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-5">

        {/* Configurações */}
        <div className="space-y-4">

          {/* Master toggle */}
          <div className={cn(
            "bg-white border rounded-2xl p-5 shadow-sm transition-all",
            settings.enableSelfService ? "border-emerald-200" : "border-zinc-200"
          )}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  settings.enableSelfService ? "bg-emerald-50 border-emerald-200" : "bg-zinc-100 border-zinc-200"
                )}>
                  {settings.enableSelfService
                    ? <Globe size={18} className="text-emerald-600" />
                    : <EyeOff size={18} className="text-zinc-400" />}
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900">Ativar Portal de Agendamento</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {settings.enableSelfService
                      ? "Portal público ativo — clientes podem agendar"
                      : "Portal desativado — agendamentos apenas pelo admin"}
                  </p>
                </div>
              </div>
              <Switch checked={settings.enableSelfService} onCheckedChange={(v) => set("enableSelfService", v)} />
            </div>
          </div>

          <div className={cn("space-y-4 transition-all", !settings.enableSelfService && "opacity-50 pointer-events-none")}>

            {/* Acesso */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Shield size={11} /> Acesso e Segurança
              </p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-zinc-800">Exigir cadastro / login</p>
                  <p className="text-xs text-zinc-400">Cliente precisa se cadastrar antes de agendar</p>
                </div>
                <Switch checked={settings.selfServiceRequireLogin} onCheckedChange={(v) => set("selfServiceRequireLogin", v)} />
              </div>
            </div>

            {/* Regras */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={11} /> Regras de Agendamento
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Antecedência mínima</label>
                  <select
                    value={settings.minAdvanceMinutes}
                    onChange={(e) => set("minAdvanceMinutes", Number(e.target.value))}
                    className="ds-input"
                  >
                    {HOURS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} antes</option>)}
                  </select>
                </div>
                <div>
                  <label className="ds-label">Limite futuro</label>
                  <select
                    value={settings.maxAdvanceDays}
                    onChange={(e) => set("maxAdvanceDays", Number(e.target.value))}
                    className="ds-input"
                  >
                    {DAYS_OPTIONS.map((d) => <option key={d} value={d}>{d} dias</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-zinc-800">Permitir cancelamento</p>
                  <p className="text-xs text-zinc-400">Cliente pode cancelar pelo portal</p>
                </div>
                <Switch checked={settings.allowClientCancellation} onCheckedChange={(v) => set("allowClientCancellation", v)} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-zinc-800">Permitir reagendamento</p>
                  <p className="text-xs text-zinc-400">Cliente pode remarcar pelo portal</p>
                </div>
                <Switch checked={settings.allowClientReschedule} onCheckedChange={(v) => set("allowClientReschedule", v)} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-zinc-800">Permitir recorrência</p>
                  <p className="text-xs text-zinc-400">Cliente pode agendar o mesmo horário para as próximas semanas</p>
                </div>
                {/* @ts-ignore */}
                <Switch checked={settings.allowClientRecurrence || false} onCheckedChange={(v) => set("allowClientRecurrence", v)} />
              </div>
            </div>

            {/* Exibição */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Eye size={11} /> O que exibir
              </p>
              {(
                [
                  { key: "selfServiceShowProfessional" as const, label: "Escolha de profissional", desc: "Cliente pode selecionar o profissional desejado" },
                  { key: "selfServiceShowPrices" as const, label: "Preços dos serviços", desc: "Exibe o valor de cada serviço" },
                ]
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-zinc-800">{label}</p>
                    <p className="text-xs text-zinc-400">{desc}</p>
                  </div>
                  <Switch checked={settings[key]} onCheckedChange={(v) => set(key, v)} />
                </div>
              ))}
            </div>

            {/* Mensagem */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                <MessageSquare size={11} /> Mensagem de boas-vindas
              </p>
              <textarea
                value={settings.selfServiceWelcomeMessage}
                onChange={(e) => set("selfServiceWelcomeMessage", e.target.value)}
                placeholder="Ex: Bem-vindo ao Agendelle! Selecione o serviço e escolha o horário que preferir."
                rows={3}
                className="ds-input resize-none min-h-[80px]"
              />
            </div>
          </div>

          <Button variant="primary" size="md" loading={saving} onClick={handleSave} iconLeft={<CheckCircle size={15} />}>
            Salvar Configurações
          </Button>
        </div>

        {/* Painel lateral: portal + link para Minha Agenda */}
        <div className="space-y-3">

          {/* Status do portal */}
          <div className={cn(
            "rounded-2xl border p-4 space-y-3 shadow-sm",
            settings.enableSelfService ? "bg-white border-zinc-200" : "bg-zinc-50 border-zinc-100"
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                settings.enableSelfService ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"
              )} />
              <p className="text-xs font-black text-zinc-700">
                {settings.enableSelfService ? "Portal ativo" : "Portal desativado"}
              </p>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {settings.enableSelfService
                ? "Seus clientes podem agendar online pelo link público."
                : "O portal está desativado. Ative a chave acima para liberar o agendamento online."}
            </p>
            {settings.enableSelfService && portalUrl && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  fullWidth
                  iconLeft={<Copy size={13} />}
                  onClick={() => {
                    navigator.clipboard.writeText(portalFullUrl!);
                    toast.success("Link copiado!");
                  }}
                >
                  Copiar link
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  fullWidth
                  iconLeft={<ExternalLink size={13} />}
                  onClick={() => window.open(portalUrl, "_blank")}
                >
                  Abrir
                </Button>
              </div>
            )}
          </div>

          {/* Card: visual do portal → Minha Agenda Online */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-4 space-y-3">
            <div>
              <p className="text-xs font-black text-zinc-800">Visual do portal</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Logo, cores, nome e endereço são configurados em <strong>Minha Agenda Online</strong>.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              fullWidth
              iconLeft={<Globe size={13} />}
              iconRight={<ExternalLink size={12} />}
              onClick={() => onGoToMinhaAgenda?.()}
            >
              Ir para Minha Agenda Online
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
