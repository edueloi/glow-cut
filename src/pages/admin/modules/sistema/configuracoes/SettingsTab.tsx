import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarOff,
  Globe,
  Loader2,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";

import { apiFetch } from "@/src/lib/api";
import { cn } from "@/src/lib/utils";
import { Button, IconButton } from "@/src/components/ui/Button";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PanelCard } from "@/src/components/ui/PanelCard";
import { StatCard } from "@/src/components/ui/StatCard";
import { Switch } from "@/src/components/ui/Switch";
import { Input, Textarea, Select } from "@/src/components/ui/Input";
import { FormRow } from "@/src/components/ui/PageWrapper";
import { useToast } from "@/src/components/ui/Toast";
import { usePermissions } from "@/src/hooks/usePermissions";

import { useAuth } from "@/src/App";

type SectionId = "agenda" | "configuracoes";

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
  onOpenTab: (tab: any) => void;
  onOpenServicesSection: (section: any) => void;
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
}: SettingsTabProps) {
  const { show } = useToast();
  const { user: adminUser } = useAuth();
  const { can } = usePermissions();

  const sections = useMemo(() => {
    const s = [];
    if (can("config_agenda")) s.push({ id: "agenda", label: "Agenda", icon: CalendarDays });
    if (can("configuracoes")) s.push({ id: "configuracoes", label: "Configurações", icon: Settings });
    return s;
  }, [can]);

  const activeSection = useMemo<SectionId>(() => {
    const found = sections.find((item) => item.id === settingsOpenCard);
    return (found?.id || sections[0]?.id || "agenda") as SectionId;
  }, [sections, settingsOpenCard]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [agendaSettings, setAgendaSettings] = useState<AgendaSettingsData>(DEFAULT_AGENDA_SETTINGS);
  const [releases, setReleases] = useState<ScheduleRelease[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialScheduleDay[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [releaseForm, setReleaseForm] = useState({
    date: "", professionalId: "", startTime: "08:00", endTime: "09:00", description: "",
  });
  const [specialForm, setSpecialForm] = useState({
    date: "", professionalId: "", isClosed: true, startTime: "09:00", endTime: "18:00", description: "",
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
    return () => { mounted = false; };
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
      show("Configurações da agenda salvas.", "success");
    } catch {
      show("Não foi possível salvar as configurações.", "error");
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
      await apiFetch(`/api/settings/agenda/releases/${id}`, { method: "DELETE" });
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
      await apiFetch(`/api/settings/agenda/special-days/${id}`, { method: "DELETE" });
      setSpecialDays((prev) => prev.filter((item) => item.id !== id));
      show("Data especial removida.", "success");
    } catch {
      show("Não foi possível remover a data especial.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const professionalOptions = [
    { value: "", label: "Toda a agenda" },
    ...professionals.map(p => ({ value: p.id, label: p.name })),
  ];

  /* ── Agenda ─────────────────────────────────────────────────────────────── */
  const renderAgenda = () => (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <StatCard title="Autoatendimento" value={agendaSettings.enableSelfService ? "Ativo" : "Pausado"} icon={Globe} description="Agendamento online" />
        <StatCard title="Intervalo de slots" value={`${agendaSettings.slotIntervalMinutes} min`} icon={CalendarDays} description="Espaçamento na grade" />
        <StatCard title="Liberações" value={releases.length} icon={Search} description="Ajustes manuais" />
        <StatCard title="Próxima exceção" value={nextSpecial ? formatDateLabel(nextSpecial.date) : "Livre"} icon={CalendarOff} description={nextSpecial ? "Data especial cadastrada" : "Sem datas futuras"} />
      </div>

      {/* Regras gerais */}
      <PanelCard
        title="Regras da agenda"
        description="Intervalos, antecedência e comportamento do autoatendimento."
        icon={CalendarDays}
        action={
          <Button onClick={saveAgendaSettings} loading={isSaving} size="sm">
            Salvar
          </Button>
        }
        contentClassName="space-y-5"
      >
        <FormRow cols={3}>
          <Input
            label="Intervalo entre slots (min)"
            type="number"
            min={5}
            step={5}
            value={String(agendaSettings.slotIntervalMinutes)}
            onChange={e => setAgendaSettings(p => ({ ...p, slotIntervalMinutes: Number(e.target.value) || 0 }))}
          />
          <Input
            label="Antecedência mínima (min)"
            type="number"
            min={0}
            step={5}
            value={String(agendaSettings.minAdvanceMinutes)}
            onChange={e => setAgendaSettings(p => ({ ...p, minAdvanceMinutes: Number(e.target.value) || 0 }))}
          />
          <Input
            label="Limite futuro (dias)"
            type="number"
            min={1}
            step={1}
            value={String(agendaSettings.maxAdvanceDays)}
            onChange={e => setAgendaSettings(p => ({ ...p, maxAdvanceDays: Number(e.target.value) || 1 }))}
          />
        </FormRow>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleItem label="Autoatendimento" desc="Ativa o agendamento online do cliente." checked={agendaSettings.enableSelfService} onChange={v => setAgendaSettings(p => ({ ...p, enableSelfService: v }))} />
          <ToggleItem label="Agenda online" desc="Mantém o link público disponível." checked={agendaSettings.onlineBookingEnabled} onChange={v => setAgendaSettings(p => ({ ...p, onlineBookingEnabled: v }))} />
          <ToggleItem label="Agenda por cliente" desc="Consulta de agendamentos por telefone." checked={agendaSettings.enableClientAgendaView} onChange={v => setAgendaSettings(p => ({ ...p, enableClientAgendaView: v }))} />
          <ToggleItem label="Pesquisa pública" desc="Libera a tela pública de pesquisa." checked={agendaSettings.enableAppointmentSearch} onChange={v => setAgendaSettings(p => ({ ...p, enableAppointmentSearch: v }))} />
          <ToggleItem label="Confirmação automática" desc="Novo agendamento entra confirmado." checked={agendaSettings.autoConfirmAppointments} onChange={v => setAgendaSettings(p => ({ ...p, autoConfirmAppointments: v }))} />
          {!!adminUser?.wppEnabled && (
            <ToggleItem label="Lembretes WhatsApp" desc="Base pronta para lembretes e confirmações." checked={agendaSettings.enableWhatsAppReminders} onChange={v => setAgendaSettings(p => ({ ...p, enableWhatsAppReminders: v }))} />
          )}
          <ToggleItem label="Terminal profissional (PAT)" desc="Habilita a base do terminal profissional." checked={agendaSettings.enablePatTerminal} onChange={v => setAgendaSettings(p => ({ ...p, enablePatTerminal: v }))} />
          <ToggleItem label="Bloquear feriados nacionais" desc="Fecha a agenda nas datas nacionais do Brasil." checked={agendaSettings.blockNationalHolidays} onChange={v => setAgendaSettings(p => ({ ...p, blockNationalHolidays: v }))} />
        </div>

        <Textarea
          label="Observações operacionais"
          rows={3}
          value={agendaSettings.notes}
          onChange={e => setAgendaSettings(p => ({ ...p, notes: e.target.value }))}
          placeholder="Observações internas sobre o funcionamento da agenda..."
        />
      </PanelCard>

      {/* Liberações + Feriados */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* Liberações */}
        <PanelCard title="Liberações de horários" description="Abra janelas extras na agenda para encaixes pontuais." icon={Search} contentClassName="space-y-4">
          <FormRow cols={2}>
            <DatePicker
              value={releaseForm.date || null}
              onChange={v => setReleaseForm(p => ({ ...p, date: v || "" }))}
              placeholder="Selecionar data"
            />
            <Select
              value={releaseForm.professionalId}
              onChange={e => setReleaseForm(p => ({ ...p, professionalId: e.target.value }))}
              options={professionalOptions}
            />
          </FormRow>
          <FormRow cols={2}>
            <Input label="Início" type="time" value={releaseForm.startTime} onChange={e => setReleaseForm(p => ({ ...p, startTime: e.target.value }))} />
            <Input label="Fim" type="time" value={releaseForm.endTime} onChange={e => setReleaseForm(p => ({ ...p, endTime: e.target.value }))} />
          </FormRow>
          <Input
            label="Descrição"
            value={releaseForm.description}
            onChange={e => setReleaseForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Ex: Encaixe para cliente VIP"
          />
          <Button
            iconLeft={busyId === "release:create" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            onClick={createRelease}
            disabled={!releaseForm.date || busyId === "release:create"}
            size="sm"
          >
            Cadastrar liberação
          </Button>

          {releases.length === 0 ? (
            <EmptyState icon={Search} title="Nenhuma liberação cadastrada" description="Use para encaixes e aberturas pontuais." />
          ) : (
            <div className="space-y-2">
              {releases.map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900">{formatDateLabel(item.date)} · {item.startTime} às {item.endTime}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{item.professionalName ? `${item.professionalName}. ` : "Toda a agenda. "}{item.description || "Sem descrição."}</p>
                  </div>
                  <IconButton variant="ghost" size="sm" onClick={() => deleteRelease(item.id)}>
                    {busyId === `release:${item.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        {/* Feriados / Datas especiais */}
        <PanelCard title="Feriados e horários especiais" description="Fechamentos totais ou horários personalizados por data." icon={CalendarOff} contentClassName="space-y-4">
          <FormRow cols={2}>
            <DatePicker
              value={specialForm.date || null}
              onChange={v => setSpecialForm(p => ({ ...p, date: v || "" }))}
              placeholder="Selecionar data"
            />
            <Select
              value={specialForm.professionalId}
              onChange={e => setSpecialForm(p => ({ ...p, professionalId: e.target.value }))}
              options={professionalOptions}
            />
          </FormRow>

          <ToggleItem
            label="Fechar agenda nessa data"
            desc="Desative para definir um horário especial em vez de fechar."
            checked={specialForm.isClosed}
            onChange={v => setSpecialForm(p => ({ ...p, isClosed: v }))}
          />

          {!specialForm.isClosed && (
            <FormRow cols={2}>
              <Input label="Início" type="time" value={specialForm.startTime} onChange={e => setSpecialForm(p => ({ ...p, startTime: e.target.value }))} />
              <Input label="Fim" type="time" value={specialForm.endTime} onChange={e => setSpecialForm(p => ({ ...p, endTime: e.target.value }))} />
            </FormRow>
          )}

          <Input
            label="Descrição"
            value={specialForm.description}
            onChange={e => setSpecialForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Ex: Feriado municipal, Recesso de fim de ano..."
          />
          <Button
            iconLeft={busyId === "special:create" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            onClick={saveSpecialDay}
            disabled={!specialForm.date || busyId === "special:create"}
            size="sm"
            variant="danger"
          >
            Salvar data especial
          </Button>

          {specialDays.length === 0 ? (
            <EmptyState icon={CalendarOff} title="Nenhuma exceção cadastrada" description="Cadastre feriados e horários especiais." />
          ) : (
            <div className="space-y-2">
              {specialDays.map(item => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-zinc-900">{formatDateLabel(item.date)} · {item.isClosed ? "Agenda fechada" : `${item.startTime} às ${item.endTime}`}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">{item.professionalName ? `${item.professionalName}. ` : "Toda a agenda. "}{item.description || "Sem descrição."}</p>
                  </div>
                  <IconButton variant="ghost" size="sm" onClick={() => deleteSpecialDay(item.id)}>
                    {busyId === `special:${item.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );

  /* ── Configurações ──────────────────────────────────────────────────────── */
  const renderConfiguracoes = () => (
    <div className="space-y-6">
      <PanelCard title="Tema do painel" description="Personalização visual do sistema." icon={Settings}>
        <div className="flex flex-wrap gap-4">
          {themeColors.map(color => (
            <button key={color.value} type="button" onClick={() => handleThemeChange(color.value)} className="flex flex-col items-center gap-2">
              <div
                className={cn("h-10 w-10 rounded-full border-2 transition-transform", themeColor === color.value ? "border-zinc-900 scale-110" : "border-white")}
                style={{ background: color.hex }}
              />
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

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      {/* Sidebar + content */}
      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">

        {/* Sidebar */}
        <aside className="flex xl:flex-col gap-2 overflow-x-auto pb-1 xl:pb-0 -mx-4 px-4 xl:mx-0 xl:px-0">
          {sections.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSettingsOpenCard(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all whitespace-nowrap shrink-0 xl:w-full",
                activeSection === item.id
                  ? "border-amber-200 bg-amber-50"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              )}
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                activeSection === item.id ? "bg-amber-100 border-amber-200 text-amber-600" : "bg-white border-zinc-200 text-zinc-500"
              )}>
                <item.icon size={16} />
              </div>
              <span className={cn("text-sm font-black", activeSection === item.id ? "text-amber-700" : "text-zinc-700")}>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <div>
          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-zinc-200 bg-white">
              <div className="flex items-center gap-3 text-sm font-bold text-zinc-500">
                <Loader2 size={18} className="animate-spin" />
                Carregando...
              </div>
            </div>
          ) : activeSection === "agenda" ? (
            renderAgenda()
          ) : (
            renderConfiguracoes()
          )}
        </div>
      </div>
    </div>
  );
}
