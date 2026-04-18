import React, { useState, useEffect } from "react";
import {
  Tablet, Wifi, WifiOff, QrCode, RefreshCw, Info, CheckCircle,
  Clock, ExternalLink, Copy, Share2,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { Switch } from "@/src/components/ui/Switch";
import { useToast } from "@/src/components/ui/Toast";

// ─────────────────────────────────────────────────────────────────────────────
// PAT — Terminal de Atendimento Profissional
// ─────────────────────────────────────────────────────────────────────────────

interface PATProps {
  professionals: any[];
  appointments: any[];
  onRefresh: () => void;
}

interface PATSettings {
  enablePatTerminal: boolean;
  patShowClientName: boolean;
  patShowService: boolean;
  patShowTime: boolean;
  patAutoAdvance: boolean;
  patAutoAdvanceMinutes: number;
}

const DEFAULT_SETTINGS: PATSettings = {
  enablePatTerminal: false,
  patShowClientName: true,
  patShowService: true,
  patShowTime: true,
  patAutoAdvance: false,
  patAutoAdvanceMinutes: 5,
};

export function PAT({ professionals, appointments, onRefresh }: PATProps) {
  const toast = useToast();
  const [settings, setSettings] = useState<PATSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProf, setSelectedProf] = useState<string>(professionals[0]?.id ?? "");

  // Garante que selectedProf é populado quando professionals carrega depois do mount
  useEffect(() => {
    if (!selectedProf && professionals.length > 0) {
      setSelectedProf(professionals[0].id);
    }
  }, [professionals]);

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
        toast.success("Configurações do PAT salvas.");
      } else {
        toast.error("Erro ao salvar configurações.");
      }
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof PATSettings>(key: K, val: PATSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  // Fila de hoje do profissional selecionado
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const queue = appointments
    .filter((a) => {
      const d = new Date(a.date);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return (
        ds === todayStr &&
        a.type !== "bloqueio" &&
        (a.professionalId === selectedProf || a.professional?.id === selectedProf) &&
        ["scheduled", "confirmed"].includes(a.status)
      );
    })
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

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
            <Tablet size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">Terminal de Atendimento (PAT)</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Configure o painel de fila visível para profissionais em dispositivos dedicados.</p>
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
          O <strong>PAT (Terminal de Atendimento Profissional)</strong> é uma tela simplificada
          que pode ser aberta em um tablet ou TV para mostrar a fila de atendimento do dia ao profissional,
          sem expor o painel administrativo completo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-5">

        {/* Configurações */}
        <div className="space-y-4">

          {/* Master toggle */}
          <div className={cn(
            "bg-white border rounded-2xl p-5 shadow-sm transition-all",
            settings.enablePatTerminal ? "border-emerald-200" : "border-zinc-200"
          )}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  settings.enablePatTerminal ? "bg-emerald-50 border-emerald-200" : "bg-zinc-100 border-zinc-200"
                )}>
                  {settings.enablePatTerminal
                    ? <Wifi size={18} className="text-emerald-600" />
                    : <WifiOff size={18} className="text-zinc-400" />}
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900">Ativar Terminal PAT</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {settings.enablePatTerminal ? "Terminal ativo e acessível" : "Terminal desativado"}
                  </p>
                </div>
              </div>
              <Switch checked={settings.enablePatTerminal} onCheckedChange={(v) => set("enablePatTerminal", v)} />
            </div>
          </div>

          {/* Opções de exibição */}
          <div className={cn(
            "bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 transition-all",
            !settings.enablePatTerminal && "opacity-50 pointer-events-none"
          )}>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">O que exibir no terminal</p>
            {(
              [
                { key: "patShowClientName" as const, label: "Nome do cliente", desc: "Mostra o nome do cliente na fila" },
                { key: "patShowService" as const, label: "Serviço agendado", desc: "Mostra o serviço na fila" },
                { key: "patShowTime" as const, label: "Horário do atendimento", desc: "Mostra hora início e fim" },
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

            <div className="pt-3 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-zinc-800">Avançar automaticamente</p>
                  <p className="text-xs text-zinc-400">Remove o primeiro da fila após o tempo configurado</p>
                </div>
                <Switch checked={settings.patAutoAdvance} onCheckedChange={(v) => set("patAutoAdvance", v)} />
              </div>
              {settings.patAutoAdvance && (
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-zinc-500 shrink-0">Minutos após horário:</label>
                  <select
                    value={settings.patAutoAdvanceMinutes}
                    onChange={(e) => set("patAutoAdvanceMinutes", Number(e.target.value))}
                    className="ds-input h-9 w-24"
                  >
                    {[2, 5, 10, 15, 20, 30].map((m) => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <Button variant="primary" size="md" loading={saving} onClick={handleSave} iconLeft={<CheckCircle size={15} />}>
            Salvar Configurações
          </Button>
        </div>

        {/* Preview da fila */}
        <div className="space-y-4">
          {professionals.length > 0 && (
            <div>
              <label className="ds-label">Profissional</label>
              <select
                value={selectedProf}
                onChange={(e) => setSelectedProf(e.target.value)}
                className="ds-input"
              >
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className={cn(
            "bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800",
            !settings.enablePatTerminal && "opacity-40"
          )}>
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tablet size={16} className="text-amber-400" />
                <p className="text-sm font-black text-white">Fila de Hoje</p>
              </div>
              <Badge color="success" size="sm" dot>{queue.length} na fila</Badge>
            </div>

            <div className="p-4 space-y-2 min-h-[200px]">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <CheckCircle size={24} className="text-zinc-600 mb-2" />
                  <p className="text-xs font-bold text-zinc-500">Fila vazia hoje</p>
                </div>
              ) : (
                queue.map((appt, i) => (
                  <motion.div
                    key={appt.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-3",
                      i === 0 ? "bg-amber-500/20 border border-amber-500/30" : "bg-zinc-800 border border-zinc-700"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black",
                      i === 0 ? "bg-amber-500 text-white" : "bg-zinc-700 text-zinc-300"
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      {settings.patShowClientName && (
                        <p className={cn("text-sm font-black truncate", i === 0 ? "text-amber-300" : "text-zinc-200")}>
                          {appt.client?.name ?? "Cliente"}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-0.5">
                        {settings.patShowService && appt.service?.name && (
                          <p className="text-[10px] text-zinc-400 truncate">{appt.service.name}</p>
                        )}
                        {settings.patShowTime && (
                          <p className="text-[10px] text-zinc-500 shrink-0 flex items-center gap-1">
                            <Clock size={9} />{appt.startTime}
                          </p>
                        )}
                      </div>
                    </div>
                    {i === 0 && <Badge color="warning" size="sm">Próximo</Badge>}
                  </motion.div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 text-center">
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">
                Terminal PAT · Agendelle
              </p>
            </div>
          </div>

          {selectedProf && (
            <div className={cn("space-y-2", !settings.enablePatTerminal && "opacity-60")}>
              {!settings.enablePatTerminal && (
                <p className="text-[11px] text-amber-600 font-bold text-center py-1">
                  Ative o Terminal PAT acima para liberar o acesso.
                </p>
              )}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <QrCode size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 mb-1.5">
                    Acesse a fila de espera em um tablet ou celular:
                  </p>
                  <code className="block text-[11px] font-black text-zinc-700 bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 truncate">
                    {window.location.origin}/pat/{selectedProf}
                  </code>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/pat/${selectedProf}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs transition-all"
                >
                  <ExternalLink size={13} /> Abrir terminal
                </button>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/pat/${selectedProf}`;
                    navigator.clipboard.writeText(url).then(() => toast.success("Link copiado!"));
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-xs transition-all"
                >
                  <Copy size={13} /> Copiar
                </button>
                {typeof navigator.share !== "undefined" && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/pat/${selectedProf}`;
                      navigator.share({ title: "Fila de espera", url }).catch(() => {});
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs transition-all"
                  >
                    <Share2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
