import React, { useState, useEffect } from "react";
import {
  FileText, ShieldCheck, ShieldAlert, Loader2, UploadCloud, Receipt,
} from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { cn } from "@/src/lib/utils";
import {
  PageWrapper, SectionTitle, PanelCard,
  Button, Input, Select, Switch, Badge,
  useToast,
} from "@/src/components/ui";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface NfseConfig {
  enabled: boolean;
  razaoSocial: string | null;
  cnpj: string | null;
  inscricaoMunicipal: string | null;
  codigoMunicipio: string | null;
  codigoTributacaoNacional: string | null;
  regimeTributario: string;
  environment: string;
  serie: number;
  nextNumber: number;
  hasCertificate: boolean;
  certUploadedAt: string | null;
}

interface NfseInvoiceRow {
  id: string;
  numero: number;
  serie: number;
  status: string;
  valorServico: number;
  createdAt: string;
  comanda?: { client?: { name: string } | null } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: "success" | "warning" | "danger" | "default" }> = {
  pending: { label: "Pendente", color: "default" },
  processing: { label: "Processando", color: "warning" },
  authorized: { label: "Autorizada", color: "success" },
  rejected: { label: "Rejeitada", color: "danger" },
  error: { label: "Erro", color: "danger" },
  cancelled: { label: "Cancelada", color: "default" },
};

const DEFAULT_CONFIG: NfseConfig = {
  enabled: false,
  razaoSocial: "",
  cnpj: "",
  inscricaoMunicipal: "",
  codigoMunicipio: "",
  codigoTributacaoNacional: "",
  regimeTributario: "simples_nacional",
  environment: "homologacao",
  serie: 1,
  nextNumber: 1,
  hasCertificate: false,
  certUploadedAt: null,
};

// ─── Componente principal ────────────────────────────────────────────────────

export function NotaFiscalTab() {
  const toast = useToast();

  const [config, setConfig] = useState<NfseConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [invoices, setInvoices] = useState<NfseInvoiceRow[]>([]);

  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [certUploading, setCertUploading] = useState(false);

  useEffect(() => {
    loadConfig();
    loadInvoices();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/nfse/config");
      const data = await res.json();
      if (data) setConfig((c) => ({ ...c, ...data }));
    } catch { /* mantém defaults */ }
    setLoading(false);
  }

  async function loadInvoices() {
    try {
      const res = await apiFetch("/api/nfse");
      const data = await res.json();
      if (Array.isArray(data)) setInvoices(data);
    } catch { /* lista fica vazia */ }
  }

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    try {
      const res = await apiFetch("/api/nfse/config/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao atualizar."); return; }
      setConfig((c) => ({ ...c, enabled: data.enabled }));
      toast.success(enabled ? "Emissão de NFS-e ativada." : "Emissão de NFS-e desativada.");
    } catch { toast.error("Erro ao atualizar configuração."); }
    setToggling(false);
  }

  async function handleSaveConfig() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/nfse/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razaoSocial: config.razaoSocial,
          cnpj: config.cnpj,
          inscricaoMunicipal: config.inscricaoMunicipal,
          codigoMunicipio: config.codigoMunicipio,
          codigoTributacaoNacional: config.codigoTributacaoNacional,
          regimeTributario: config.regimeTributario,
          environment: config.environment,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao salvar."); return; }
      setConfig((c) => ({ ...c, ...data }));
      toast.success("Dados fiscais salvos!");
    } catch { toast.error("Erro ao salvar dados fiscais."); }
    setSaving(false);
  }

  async function handleUploadCertificate() {
    if (!certFile || !certPassword) { toast.error("Selecione o arquivo .pfx e informe a senha."); return; }
    setCertUploading(true);
    try {
      const base64 = await fileToBase64(certFile);
      const res = await apiFetch("/api/nfse/config/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: base64, password: certPassword }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao enviar certificado."); return; }
      setConfig((c) => ({ ...c, hasCertificate: true, certUploadedAt: data.certUploadedAt }));
      setCertFile(null);
      setCertPassword("");
      toast.success("Certificado enviado com sucesso!");
    } catch { toast.error("Erro ao processar certificado."); }
    setCertUploading(false);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
          <p className="text-sm font-semibold text-zinc-400">Carregando configurações...</p>
        </div>
      </PageWrapper>
    );
  }

  const isProduction = config.environment === "producao";

  return (
    <PageWrapper>
      <div className="space-y-4 sm:space-y-5">

        {/* Header da página */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm sm:p-6 lg:rounded-3xl",
          config.enabled ? "border-emerald-200" : "border-zinc-200"
        )}>
          <div className={cn("absolute inset-y-0 left-0 w-1", config.enabled ? "bg-emerald-500" : "bg-zinc-300")} />
          <SectionTitle
            title="Nota Fiscal de Serviço (NFS-e)"
            description="Emissão de nota fiscal eletrônica direto com o Sistema Nacional NFS-e do governo."
            icon={Receipt}
            action={config.enabled ? <Badge color="success">Ativada</Badge> : <Badge color="default">Desativada</Badge>}
          />
        </div>

        {/* Card: Ativação */}
        <PanelCard
          icon={config.enabled ? ShieldCheck : ShieldAlert}
          iconWrapClassName={config.enabled ? "bg-emerald-50 border-emerald-100" : "bg-zinc-50 border-zinc-100"}
          iconClassName={config.enabled ? "text-emerald-600" : "text-zinc-400"}
          title="Ativar emissão de NFS-e"
          description="Enquanto desativado, nenhuma nota fiscal pode ser emitida — mesmo pela API."
          action={
            <Switch checked={config.enabled} onCheckedChange={handleToggle} disabled={toggling} />
          }
        >
          {!config.hasCertificate && (
            <p className="text-xs text-amber-600 font-semibold">
              Configure os dados fiscais e envie o certificado digital A1 abaixo antes de ativar.
            </p>
          )}
        </PanelCard>

        {/* Card: Dados fiscais */}
        <PanelCard
          icon={FileText}
          iconWrapClassName="bg-blue-50 border-blue-100"
          iconClassName="text-blue-600"
          title="Dados fiscais do salão"
          description="Usados na emissão de todas as notas fiscais deste estabelecimento."
          action={
            <Button size="sm" onClick={handleSaveConfig} loading={saving} className="h-10 w-full rounded-xl bg-zinc-950 text-white hover:bg-black sm:w-auto">
              Salvar Dados Fiscais
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Razão social"
              placeholder="Ex: Salão Beleza & Estilo LTDA"
              value={config.razaoSocial || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig((c) => ({ ...c, razaoSocial: e.target.value }))}
            />
            <Input
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              value={config.cnpj || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig((c) => ({ ...c, cnpj: e.target.value }))}
            />
            <Input
              label="Inscrição municipal (opcional)"
              placeholder="Ex: 123456"
              value={config.inscricaoMunicipal || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig((c) => ({ ...c, inscricaoMunicipal: e.target.value }))}
            />
            <Input
              label="Código do município (IBGE)"
              placeholder="Ex: 3550308 (São Paulo)"
              value={config.codigoMunicipio || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig((c) => ({ ...c, codigoMunicipio: e.target.value }))}
            />
            <Input
              label="Código de tributação (LC 116/03)"
              placeholder="Ex: 060501"
              value={config.codigoTributacaoNacional || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig((c) => ({ ...c, codigoTributacaoNacional: e.target.value }))}
            />
            <Select
              label="Regime tributário"
              value={config.regimeTributario}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConfig((c) => ({ ...c, regimeTributario: e.target.value }))}
            >
              <option value="simples_nacional">Simples Nacional (ME/EPP)</option>
              <option value="normal">Não optante do Simples Nacional</option>
            </Select>
          </div>

          <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-800">Ambiente de emissão</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Homologação não tem valor fiscal — use para testar antes de emitir de verdade.
                </p>
              </div>
              <Select
                value={config.environment}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConfig((c) => ({ ...c, environment: e.target.value }))}
                className="shrink-0 w-44"
              >
                <option value="homologacao">Homologação</option>
                <option value="producao">Produção</option>
              </Select>
            </div>
            {isProduction && (
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-amber-700">
                ⚠ Notas emitidas em produção têm valor fiscal real.
              </p>
            )}
          </div>
        </PanelCard>

        {/* Card: Certificado digital */}
        <PanelCard
          icon={UploadCloud}
          iconWrapClassName="bg-amber-50 border-amber-100"
          iconClassName="text-amber-600"
          title="Certificado digital A1"
          description="Necessário para assinar e transmitir as notas fiscais ao governo."
          action={
            config.hasCertificate ? (
              <Badge color="success">
                Certificado enviado{config.certUploadedAt ? ` em ${new Date(config.certUploadedAt).toLocaleDateString("pt-BR")}` : ""}
              </Badge>
            ) : (
              <Badge color="default">Nenhum certificado</Badge>
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
            <div>
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">
                Arquivo do certificado (.pfx)
              </label>
              <input
                type="file"
                accept=".pfx,.p12"
                onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-zinc-600 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-xs file:font-black file:uppercase file:text-white hover:file:bg-zinc-800"
              />
            </div>
            <Input
              label="Senha do certificado"
              type="password"
              placeholder="Senha do .pfx"
              value={certPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCertPassword(e.target.value)}
            />
            <Button
              onClick={handleUploadCertificate}
              loading={certUploading}
              disabled={!certFile || !certPassword}
              className="h-10 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
            >
              Enviar certificado
            </Button>
          </div>
        </PanelCard>

        {/* Card: Notas emitidas */}
        <PanelCard
          icon={Receipt}
          iconWrapClassName="bg-zinc-50 border-zinc-100"
          iconClassName="text-zinc-600"
          title="Notas fiscais emitidas"
          description="Últimas notas emitidas por este salão."
        >
          {invoices.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">Nenhuma nota fiscal emitida ainda.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const status = STATUS_LABELS[inv.status] || STATUS_LABELS.pending;
                return (
                  <div key={inv.id} className="flex flex-col gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between sm:p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-800">
                        Nº {inv.numero} / Série {inv.serie} — {inv.comanda?.client?.name || "Cliente não identificado"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(inv.createdAt).toLocaleDateString("pt-BR")} · R$ {inv.valorServico.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <Badge color={status.color} size="sm">{status.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>
      </div>
    </PageWrapper>
  );
}
