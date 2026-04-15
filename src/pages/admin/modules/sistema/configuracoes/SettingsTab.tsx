import React, { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  CalendarOff,
  FileText,
  Globe,
  Loader2,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  Scissors,
  Search,
  Settings,
  Store,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";

import { apiFetch } from "@/src/lib/api";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { StatCard } from "@/src/components/ui/StatCard";
import { Switch } from "@/src/components/ui/Switch";
import { useToast } from "@/src/components/ui/Toast";
import type { AdminTabId } from "@/src/pages/admin/config/navigation";

type SectionId =
  | "agenda"
  | "estabelecimento"
  | "financeiro"
  | "relatorios"
  | "marketing"
  | "configuracoes";

type ServicesSection = "services" | "packages";

interface AgendaSettingsData {
  onlineBookingEnabled: boolean;
  enablePatTerminal: boolean;
  enableSelfService: boolean;
  enableClientAgendaView: boolean;
  enableAppointmentSearch: boolean;
  enableWhatsAppReminders: boolean;
  autoConfirmAppointments: boolean;
  allowClientCancellation: boolean;
  allowClientReschedule: boolean;
  blockNationalHolidays: boolean;
  slotIntervalMinutes: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  notes: string;
}

interface ScheduleRelease {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  professionalId?: string | null;
  professionalName?: string | null;
}

interface SpecialScheduleDay {
  id: string;
  date: string;
  isClosed: boolean;
  startTime: string;
  endTime: string;
  description: string;
  professionalId?: string | null;
  professionalName?: string | null;
}

interface SettingsTabProps {
  currentTheme: any;
  themeColors: any[];
  themeColor: string;
  handleThemeChange: (val: string) => void;
  settingsOpenCard: string | null;
  setSettingsOpenCard: (val: string | null) => void;
  professionals: Array<{ id: string; name: string }>;
  onOpenTab: (tab: AdminTabId) => void;
  onOpenServicesSection: (section: ServicesSection) => void;
}

const DEFAULT_AGENDA_SETTINGS: AgendaSettingsData = {
  onlineBookingEnabled: true,
  enablePatTerminal: false,
  enableSelfService: true,
  enableClientAgendaView: true,
  enableAppointmentSearch: true,
  enableWhatsAppReminders: true,
  autoConfirmAppointments: false,
  allowClientCancellation: true,
  allowClientReschedule: true,
  blockNationalHolidays: false,
  slotIntervalMinutes: 30,
  minAdvanceMinutes: 30,
  maxAdvanceDays: 60,
  notes: "",
};

function sortByDate<T extends { date: string; startTime?: string }>(items: T[]) {
  return [...items].sort((a, b) => `${a.date}-${a.startTime || ""}`.localeCompare(`${b.date}-${b.startTime || ""}`));
}

function formatDateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function Shortcut({
  title,
  desc,
  onClick,
  disabled,
}: {
  title: string;
  desc: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-3xl border p-4 text-left transition-all",
        disabled
          ? "border-zinc-200 bg-zinc-50 text-zinc-400"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
      )}
    >
      <p className="text-sm font-black text-zinc-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
    </button>
  );
}

function ToggleItem({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div>
        <p className="text-sm font-black text-zinc-900">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1 shrink-0" />
    </div>
  );
}

export function SettingsTab({
  currentTheme,
  themeColors,
  themeColor,
  handleThemeChange,
  settingsOpenCard,
  setSettingsOpenCard,
  professionals,
  onOpenTab,
  onOpenServicesSection,
}: SettingsTabProps) {
  const { show } = useToast();
  const sections = [
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "estabelecimento", label: "Meu Estabelecimento", icon: Store },
    { id: "financeiro", label: "Financeiro", icon: Banknote },
    { id: "relatorios", label: "Relatórios", icon: FileText },
    { id: "marketing", label: "Marketing", icon: Megaphone },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ] as const;

  const activeSection = useMemo<SectionId>(() => {
    return (sections.find((item) => item.id === settingsOpenCard)?.id || "agenda") as SectionId;
  }, [sections, settingsOpenCard]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [agendaSettings, setAgendaSettings] = useState<AgendaSettingsData>(DEFAULT_AGENDA_SETTINGS);
  const [releases, setReleases] = useState<ScheduleRelease[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialScheduleDay[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    date: "",
    professionalId: "",
    startTime: "08:00",
    endTime: "09:00",
    description: "",
  });
  const [specialForm, setSpecialForm] = useState({
    date: "",
    professionalId: "",
    isClosed: true,
    startTime: "09:00",
    endTime: "18:00",
    description: "",
  });

  useEffect(() => {
    if (!settingsOpenCard) setSettingsOpenCard("agenda");
  }, [settingsOpenCard, setSettingsOpenCard]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await apiFetch("/api/settings/agenda");
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!mounted) return;
        setAgendaSettings({ ...DEFAULT_AGENDA_SETTINGS, ...(data.settings || {}) });
        setReleases(sortByDate(Array.isArray(data.releases) ? data.releases : []));
        setSpecialDays(sortByDate(Array.isArray(data.specialDays) ? data.specialDays : []));
      } catch {
        if (mounted) show("Não foi possível carregar as configurações da agenda.", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [show]);

  const nextSpecial = specialDays.find((item) => item.date >= new Date().toISOString().slice(0, 10)) || null;

  const saveAgendaSettings = async () => {
    setIsSaving(true);
    try {
      const response = await apiFetch("/api/settings/agenda", {
        method: "PUT",
        body: JSON.stringify(agendaSettings),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAgendaSettings({ ...DEFAULT_AGENDA_SETTINGS, ...data });
      show("Configurações da agenda salvas com sucesso.", "success");
    } catch {
      show("Não foi possível salvar as configurações da agenda.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const createRelease = async () => {
    setBusyId("release:create");
    try {
      const response = await apiFetch("/api/settings/agenda/releases", {
        method: "POST",
        body: JSON.stringify({ ...releaseForm, professionalId: releaseForm.professionalId || null }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setReleases((prev) => sortByDate([...prev, data]));
      setReleaseForm({ date: "", professionalId: "", startTime: "08:00", endTime: "09:00", description: "" });
      show("Liberação cadastrada.", "success");
    } catch {
      show("Não foi possível cadastrar a liberação.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const deleteRelease = async (id: string) => {
    setBusyId(`release:${id}`);
    try {
      const response = await apiFetch(`/api/settings/agenda/releases/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setReleases((prev) => prev.filter((item) => item.id !== id));
      show("Liberação removida.", "success");
    } catch {
      show("Não foi possível remover a liberação.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const saveSpecialDay = async () => {
    setBusyId("special:create");
    try {
      const response = await apiFetch("/api/settings/agenda/special-days", {
        method: "POST",
        body: JSON.stringify({ ...specialForm, professionalId: specialForm.professionalId || null }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setSpecialDays((prev) => sortByDate([...prev.filter((item) => item.id !== data.id), data]));
      setSpecialForm({ date: "", professionalId: "", isClosed: true, startTime: "09:00", endTime: "18:00", description: "" });
      show("Data especial salva.", "success");
    } catch {
      show("Não foi possível salvar a data especial.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const deleteSpecialDay = async (id: string) => {
    setBusyId(`special:${id}`);
    try {
      const response = await apiFetch(`/api/settings/agenda/special-days/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setSpecialDays((prev) => prev.filter((item) => item.id !== id));
      show("Data especial removida.", "success");
    } catch {
      show("Não foi possível remover a data especial.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const openServices = (section: ServicesSection) => {
    onOpenServicesSection(section);
    onOpenTab("services");
  };

  const renderAgenda = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Autoatendimento" value={agendaSettings.enableSelfService ? "Ativo" : "Pausado"} icon={Globe} description="Agenda online do cliente" />
        <StatCard title="Intervalo" value={`${agendaSettings.slotIntervalMinutes} min`} icon={CalendarDays} description="Espaçamento entre slots" />
        <StatCard title="Liberações" value={releases.length} icon={Search} description="Ajustes manuais cadastrados" />
        <StatCard title="Próxima exceção" value={nextSpecial ? formatDateLabel(nextSpecial.date) : "Livre"} icon={CalendarOff} description={nextSpecial ? "Data especial cadastrada" : "Sem datas futuras"} />
      </div>

      <PanelCard
        title="Minha agenda"
        description="Regras principais do autoatendimento e da agenda pública."
        icon={CalendarDays}
        action={
          <Button type="button" onClick={saveAgendaSettings} disabled={isSaving} className="h-11 rounded-2xl bg-amber-500 px-5 text-white hover:bg-amber-600">
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        }
        contentClassName="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <input type="number" min={5} step={5} value={agendaSettings.slotIntervalMinutes} onChange={(e) => setAgendaSettings((prev) => ({ ...prev, slotIntervalMinutes: Number(e.target.value) || 0 }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none focus:border-amber-400" />
          <input type="number" min={0} step={5} value={agendaSettings.minAdvanceMinutes} onChange={(e) => setAgendaSettings((prev) => ({ ...prev, minAdvanceMinutes: Number(e.target.value) || 0 }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none focus:border-amber-400" />
          <input type="number" min={1} step={1} value={agendaSettings.maxAdvanceDays} onChange={(e) => setAgendaSettings((prev) => ({ ...prev, maxAdvanceDays: Number(e.target.value) || 1 }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none focus:border-amber-400" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ToggleItem label="Autoatendimento" desc="Ativa o agendamento online do cliente." checked={agendaSettings.enableSelfService} onChange={(value) => setAgendaSettings((prev) => ({ ...prev, enableSelfService: value }))} />
          <ToggleItem label="Agenda online" desc="Mantém o link público disponível." checked={agendaSettings.onlineBookingEnabled} onChange={(value) => setAgendaSettings((prev) => ({ ...prev, onlineBookingEnabled: value }))} />
          <ToggleItem label="Agenda por cliente" desc="Mantém a consulta por telefone disponível." checked={agendaSettings.enableClientAgendaView} onChange={(value) => setAgendaSettings((prev) => ({ ...prev, enableClientAgendaView: value }))} />
          <ToggleItem label="Consultar agendamentos" desc="Libera a tela pública de pesquisa." checked={agendaSettings.enableAppointmentSearch} onChange={(value) => setAgendaSettings((prev) => ({ ...prev, enableAppointmentSearch: value }))} />
          <ToggleItem label="Confirmação automática" desc="Novo agendamento entra confirmado." checked={agendaSettings.autoConfirmAppointments} onChange={(value) => setAgendaSettings((prev) => ({ ...prev, autoConfirmAppointments: value }))} />
          <ToggleItem label="WhatsApp preparado" desc="Base pronta para lembretes e confirmações." checked={agendaSettings.enableWhatsAppReminders} onChange={(value) => setAgendaSettings((prev) => ({ ...prev, enableWhatsAppReminders: value }))} />
          <ToggleItem label="PAT profissional" desc="Habilita a base do terminal profissional." checked={agendaSettings.enablePatTerminal} onChange={(value) => setAgendaSettings((prev) => ({ ...prev, enablePatTerminal: value }))} />
          <ToggleItem label="Bloquear feriados nacionais" desc="Fecha a agenda nas datas nacionais do Brasil." checked={agendaSettings.blockNationalHolidays} onChange={(value) => setAgendaSettings((prev) => ({ ...prev, blockNationalHolidays: value }))} />
        </div>

        <textarea
          rows={4}
          value={agendaSettings.notes}
          onChange={(e) => setAgendaSettings((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Observações operacionais da agenda..."
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
        />

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
          A grade semanal principal continua na aba <button type="button" onClick={() => onOpenTab("horarios")} className="font-black text-amber-600">Horários</button>.
        </div>
      </PanelCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="Liberações de horários" description="Abra janelas extras na agenda." icon={Search} contentClassName="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <DatePicker value={releaseForm.date || null} onChange={(value) => setReleaseForm((prev) => ({ ...prev, date: value || "" }))} placeholder="Selecionar data" />
            <select value={releaseForm.professionalId} onChange={(e) => setReleaseForm((prev) => ({ ...prev, professionalId: e.target.value }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none">
              <option value="">Toda a agenda</option>
              {professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input type="time" value={releaseForm.startTime} onChange={(e) => setReleaseForm((prev) => ({ ...prev, startTime: e.target.value }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none" />
            <input type="time" value={releaseForm.endTime} onChange={(e) => setReleaseForm((prev) => ({ ...prev, endTime: e.target.value }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none" />
          </div>
          <input type="text" value={releaseForm.description} onChange={(e) => setReleaseForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Descrição da liberação" className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none" />
          <Button type="button" onClick={createRelease} disabled={!releaseForm.date || busyId === "release:create"} className="h-11 rounded-2xl bg-zinc-900 px-5 text-white">
            {busyId === "release:create" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Criar
          </Button>
          {releases.length === 0 ? <EmptyState icon={Search} title="Nenhuma liberação cadastrada" description="Use para encaixes e aberturas pontuais." /> : (
            <div className="space-y-3">
              {releases.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900">{formatDateLabel(item.date)} · {item.startTime} às {item.endTime}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{item.professionalName ? `${item.professionalName}. ` : "Toda a agenda. "}{item.description || "Sem descrição."}</p>
                  </div>
                  <button type="button" onClick={() => deleteRelease(item.id)} className="rounded-2xl p-2 text-zinc-300 hover:bg-red-50 hover:text-red-500">
                    {busyId === `release:${item.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard title="Feriados e horários especiais" description="Fechamentos totais ou horários personalizados." icon={CalendarOff} contentClassName="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <DatePicker value={specialForm.date || null} onChange={(value) => setSpecialForm((prev) => ({ ...prev, date: value || "" }))} placeholder="Selecionar data" />
            <select value={specialForm.professionalId} onChange={(e) => setSpecialForm((prev) => ({ ...prev, professionalId: e.target.value }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none">
              <option value="">Toda a agenda</option>
              {professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <ToggleItem label="Fechar agenda nessa data" desc="Quando desligado, usa o horário especial abaixo." checked={specialForm.isClosed} onChange={(value) => setSpecialForm((prev) => ({ ...prev, isClosed: value }))} />
          {!specialForm.isClosed && (
            <div className="grid gap-3 md:grid-cols-2">
              <input type="time" value={specialForm.startTime} onChange={(e) => setSpecialForm((prev) => ({ ...prev, startTime: e.target.value }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none" />
              <input type="time" value={specialForm.endTime} onChange={(e) => setSpecialForm((prev) => ({ ...prev, endTime: e.target.value }))} className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold outline-none" />
            </div>
          )}
          <input type="text" value={specialForm.description} onChange={(e) => setSpecialForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Descrição da data especial" className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none" />
          <Button type="button" onClick={saveSpecialDay} disabled={!specialForm.date || busyId === "special:create"} className="h-11 rounded-2xl bg-rose-500 px-5 text-white hover:bg-rose-600">
            {busyId === "special:create" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Salvar
          </Button>
          {specialDays.length === 0 ? <EmptyState icon={CalendarOff} title="Nenhuma exceção cadastrada" description="Cadastre feriados e horários especiais." /> : (
            <div className="space-y-3">
              {specialDays.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900">{formatDateLabel(item.date)} · {item.isClosed ? "Agenda fechada" : `${item.startTime} às ${item.endTime}`}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{item.professionalName ? `${item.professionalName}. ` : "Toda a agenda. "}{item.description || "Sem descrição."}</p>
                  </div>
                  <button type="button" onClick={() => deleteSpecialDay(item.id)} className="rounded-2xl p-2 text-zinc-300 hover:bg-red-50 hover:text-red-500">
                    {busyId === `special:${item.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );

  const renderShortcuts = () => {
    if (activeSection === "estabelecimento") {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Shortcut title="Clientes" desc="Cadastro e gestão de clientes." onClick={() => onOpenTab("clients")} />
          <Shortcut title="Profissionais" desc="Equipe e permissões." onClick={() => onOpenTab("professionals")} />
          <Shortcut title="Produtos" desc="Estoque e cadastro comercial." onClick={() => onOpenTab("products")} />
          <Shortcut title="Serviços" desc="Tabela e duração dos serviços." onClick={() => openServices("services")} />
          <Shortcut title="Pacotes" desc="Combos e sessões vendidas em bloco." onClick={() => openServices("packages")} />
          <Shortcut title="Importação" desc="Estrutura reservada para entrada de base externa." disabled />
        </div>
      );
    }

    if (activeSection === "financeiro") {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Shortcut title="Controle de entrada e saída" desc="Acesse o fluxo financeiro." onClick={() => onOpenTab("fluxo")} />
          <Shortcut title="Caixa e comandas" desc="Recebimento e fechamento operacional." onClick={() => onOpenTab("comandas")} />
          <Shortcut title="Pagamento de profissionais" desc="Base reservada para evolução futura." disabled />
        </div>
      );
    }

    if (activeSection === "relatorios") {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Shortcut title="Dashboard" desc="Volte ao painel principal." onClick={() => onOpenTab("dash")} />
          <Shortcut title="Relatórios principais" desc="Estrutura reservada para análises futuras." disabled />
          <Shortcut title="Pesquisa e rankings" desc="Espaço preparado para evolução." disabled />
        </div>
      );
    }

    if (activeSection === "marketing") {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Shortcut title="WhatsApp" desc="Bot, templates e automações." onClick={() => onOpenTab("wpp")} />
          <Shortcut title="Minha agenda online" desc="Branding e link público." onClick={() => onOpenTab("minha-agenda")} />
          <Shortcut title="Campanhas" desc="Espaço reservado para ações promocionais." disabled />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <PanelCard title="Tema do painel" description="Personalização visual do sistema." icon={Settings}>
          <div className="flex flex-wrap gap-3">
            {themeColors.map((color) => (
              <button key={color.value} type="button" onClick={() => handleThemeChange(color.value)} className="flex flex-col items-center gap-2">
                <div className={cn("h-10 w-10 rounded-full border-2", themeColor === color.value ? "border-zinc-900 scale-110" : "border-white")} style={{ background: color.hex }} />
                <span className={cn("text-[10px] font-black uppercase", themeColor === color.value ? "text-zinc-900" : "text-zinc-400")}>{color.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <button className="rounded-xl px-4 py-2 text-xs font-bold text-white" style={{ background: currentTheme.hex }}>Botão principal</button>
            <button className="rounded-xl border px-4 py-2 text-xs font-bold" style={{ background: currentTheme.light, color: currentTheme.hex, borderColor: currentTheme.border }}>Secundário</button>
          </div>
        </PanelCard>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-500">Central do Sistema</p>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">Configurações mais completas da agenda</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          A agenda agora tem base de banco, backend multi-tenant e central própria para regras, liberações e horários especiais.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSettingsOpenCard(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-3xl border p-4 text-left transition-all",
                activeSection === item.id ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600">
                <item.icon size={18} />
              </div>
              <span className="text-sm font-black text-zinc-900">{item.label}</span>
            </button>
          ))}
        </aside>

        <div>
          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-zinc-200 bg-white">
              <div className="flex items-center gap-3 text-sm font-bold text-zinc-500">
                <Loader2 size={18} className="animate-spin" />
                Carregando central...
              </div>
            </div>
          ) : activeSection === "agenda" ? (
            renderAgenda()
          ) : (
            renderShortcuts()
          )}
        </div>
      </div>
    </div>
  );
}
