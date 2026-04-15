import React, { useState, useEffect } from "react";
import {
  Plus, Unlock, Lock, Clock, Trash2,
  RefreshCw, Info,
} from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { Badge } from "@/src/components/ui/Badge";
import { Button } from "@/src/components/ui/Button";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { useToast } from "@/src/components/ui/Toast";

// ─────────────────────────────────────────────────────────────────────────────
// Liberações de Horários na Agenda
// ─────────────────────────────────────────────────────────────────────────────

interface LiberacoesHorariosProps {
  appointments: any[];
  professionals: any[];
  workingHours: any[];
  onNewBlockAppointment: (data: { date: Date; startTime: string; endTime: string; professionalId: string }) => void;
  onDeleteAppointment: (id: string) => void;
  onRefresh: () => void;
}

interface Release {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  professionalId?: string;
}

const HOURS_LIST = Array.from({ length: 32 }, (_, i) => {
  const total = (i + 12) * 30; // 06:00 → 21:30
  const h = Math.floor(total / 60).toString().padStart(2, "0");
  const m = (total % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
});

export function LiberacoesHorarios({
  appointments,
  professionals,
  workingHours,
  onNewBlockAppointment,
  onDeleteAppointment,
  onRefresh,
}: LiberacoesHorariosProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"bloqueios" | "releases">("bloqueios");

  // ── Bloqueios ──────────────────────────────────────────────────────────────
  const bloqueios = appointments
    .filter((a) => a.type === "bloqueio" && !isBefore(new Date(a.date), startOfDay(new Date())))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ── Novo bloqueio form ─────────────────────────────────────────────────────
  const [newBlock, setNewBlock] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "12:00",
    endTime: "13:00",
    professionalId: professionals[0]?.id ?? "",
    notes: "",
  });
  const [savingBlock, setSavingBlock] = useState(false);

  const handleCreateBlock = async () => {
    if (!newBlock.date || !newBlock.startTime || !newBlock.endTime) {
      toast.warning("Preencha data, hora início e hora fim.");
      return;
    }
    setSavingBlock(true);
    try {
      const [y, m, d] = newBlock.date.split("-").map(Number);
      onNewBlockAppointment({
        date: new Date(y, m - 1, d),
        startTime: newBlock.startTime,
        endTime: newBlock.endTime,
        professionalId: newBlock.professionalId,
      });
      toast.success("Bloqueio criado com sucesso.");
      setNewBlock((prev) => ({ ...prev, notes: "" }));
    } finally {
      setSavingBlock(false);
    }
  };

  // ── Liberações especiais ───────────────────────────────────────────────────
  const [releases, setReleases] = useState<Release[]>([]);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [newRelease, setNewRelease] = useState({
    date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "13:00",
    notes: "",
    professionalId: professionals[0]?.id ?? "",
  });
  const [savingRelease, setSavingRelease] = useState(false);

  const fetchReleases = async () => {
    setLoadingReleases(true);
    try {
      const res = await apiFetch("/api/settings/agenda");
      if (res.ok) {
        const d = await res.json();
        setReleases(Array.isArray(d.releases) ? d.releases : []);
      }
    } catch {}
    setLoadingReleases(false);
  };

  useEffect(() => { fetchReleases(); }, []);

  const handleSaveRelease = async () => {
    if (!newRelease.date || !newRelease.startTime || !newRelease.endTime) {
      toast.warning("Preencha todos os campos.");
      return;
    }
    setSavingRelease(true);
    try {
      const res = await apiFetch("/api/settings/agenda/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRelease),
      });
      if (res.ok) {
        toast.success("Liberação salva com sucesso.");
        fetchReleases();
        setNewRelease((prev) => ({ ...prev, notes: "" }));
      } else {
        toast.error("Erro ao salvar liberação.");
      }
    } finally {
      setSavingRelease(false);
    }
  };

  const handleDeleteRelease = async (id: string) => {
    await apiFetch(`/api/settings/agenda/releases/${id}`, { method: "DELETE" });
    toast.success("Liberação removida.");
    fetchReleases();
  };

  return (
    <div className="space-y-5 pb-20 sm:pb-6 relative">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
            <Unlock size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-zinc-900">Liberações de Horários</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Gerencie bloqueios e liberações extras na agenda.</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="self-start sm:self-auto p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-all"
          title="Atualizar"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
        <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Bloqueios</strong> impedem que clientes agendem naquele horário.{" "}
          <strong>Liberações</strong> permitem atendimento fora do horário padrão da semana.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-full sm:w-auto self-start">
        {(["bloqueios", "releases"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-black transition-all uppercase tracking-wider",
              activeTab === tab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {tab === "bloqueios" ? "Bloqueios" : "Liberações Extras"}
          </button>
        ))}
      </div>

      {/* ── Bloqueios ── */}
      {activeTab === "bloqueios" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-5">
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Bloqueios Ativos ({bloqueios.length})</p>
            {bloqueios.length === 0 ? (
              <div className="py-14 border-2 border-dashed border-zinc-200 rounded-2xl text-center">
                <Lock size={24} className="text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-400">Nenhum bloqueio ativo</p>
                <p className="text-[10px] text-zinc-400 mt-1">Crie um bloqueio para impedir agendamentos em um horário específico.</p>
              </div>
            ) : (
              bloqueios.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 bg-white border border-red-200 bg-red-50/30 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 border border-red-200">
                    <Lock size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-800">
                      {format(new Date(b.date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <Clock size={10} />
                      {b.startTime} – {b.endTime}
                      {b.professional?.name && (
                        <span className="text-zinc-400">· {b.professional.name}</span>
                      )}
                    </p>
                    {b.notes && <p className="text-[10px] text-zinc-400 mt-0.5">{b.notes}</p>}
                  </div>
                  <button
                    onClick={() => onDeleteAppointment(b.id)}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                    title="Remover bloqueio"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm h-fit">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Novo Bloqueio</p>
            <div className="space-y-3">
              <div>
                <label className="ds-label">Data</label>
                <DatePicker value={newBlock.date} onChange={(v) => setNewBlock((p) => ({ ...p, date: v ?? p.date }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Início</label>
                  <select value={newBlock.startTime} onChange={(e) => setNewBlock((p) => ({ ...p, startTime: e.target.value }))} className="ds-input">
                    {HOURS_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ds-label">Fim</label>
                  <select value={newBlock.endTime} onChange={(e) => setNewBlock((p) => ({ ...p, endTime: e.target.value }))} className="ds-input">
                    {HOURS_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              {professionals.length > 1 && (
                <div>
                  <label className="ds-label">Profissional</label>
                  <select value={newBlock.professionalId} onChange={(e) => setNewBlock((p) => ({ ...p, professionalId: e.target.value }))} className="ds-input">
                    {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <Button variant="danger" size="md" fullWidth loading={savingBlock} onClick={handleCreateBlock} iconLeft={<Lock size={14} />}>
                Criar Bloqueio
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Liberações ── */}
      {activeTab === "releases" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-5">
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Liberações Extras ({releases.length})</p>
            {loadingReleases ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse bg-white border border-zinc-200 rounded-2xl p-4 h-16" />
                ))}
              </div>
            ) : releases.length === 0 ? (
              <div className="py-14 border-2 border-dashed border-zinc-200 rounded-2xl text-center">
                <Unlock size={24} className="text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-400">Nenhuma liberação extra configurada</p>
              </div>
            ) : (
              releases.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 bg-white border border-emerald-200 bg-emerald-50/20 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 border border-emerald-200">
                    <Unlock size={16} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-800">
                      {format(new Date(r.date), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <Clock size={10} /> {r.startTime} – {r.endTime}
                    </p>
                    {r.notes && <p className="text-[10px] text-zinc-400 mt-0.5">{r.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteRelease(r.id)}
                    className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm h-fit">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Nova Liberação Extra</p>
            <div className="space-y-3">
              <div>
                <label className="ds-label">Data</label>
                <DatePicker value={newRelease.date} onChange={(v) => setNewRelease((p) => ({ ...p, date: v ?? p.date }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">Início</label>
                  <select value={newRelease.startTime} onChange={(e) => setNewRelease((p) => ({ ...p, startTime: e.target.value }))} className="ds-input">
                    {HOURS_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ds-label">Fim</label>
                  <select value={newRelease.endTime} onChange={(e) => setNewRelease((p) => ({ ...p, endTime: e.target.value }))} className="ds-input">
                    {HOURS_LIST.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="ds-label">Observações (opcional)</label>
                <input
                  value={newRelease.notes}
                  onChange={(e) => setNewRelease((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Ex: Atendimento especial sábado à tarde"
                  className="ds-input"
                />
              </div>
              <Button variant="success" size="md" fullWidth loading={savingRelease} onClick={handleSaveRelease} iconLeft={<Unlock size={14} />}>
                Salvar Liberação
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
