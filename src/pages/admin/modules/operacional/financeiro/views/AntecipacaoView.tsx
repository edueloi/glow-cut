import React, { useEffect, useState, useMemo } from "react";
import { FastForward, Plus, Trash2, Clock } from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineDateRange, FilterLineSearch, Badge, Button, Modal,
  ModalFooter, Input, Select, useToast, EmptyState, ConfirmModal,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import {
  useFinanceiro, formatCurrency, formatDate, getFirstDayOfMonth, getTodayStr,
  type CashEntry,
} from "@/src/hooks/useFinanceiro";

// Antecipação = entrada com categoria "Antecipação"
export function AntecipacaoView() {
  const { controle, fetchControle, createLancamento, deleteLancamento } = useFinanceiro();
  const toast = useToast();

  const [from, setFrom]   = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]       = useState<string | null>(getTodayStr());
  const [search, setSearch] = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CashEntry | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    date: getTodayStr(),
  });

  useEffect(() => {
    fetchControle(from, to, "income");
  }, [from, to, fetchControle]);

  const lista: CashEntry[] = useMemo(() => {
    const q = search.toLowerCase();
    return (controle.data || [])
      .filter(e => e.category?.toLowerCase() === "antecipação" || e.category?.toLowerCase() === "antecipacao")
      .filter(e => !q || e.description?.toLowerCase().includes(q));
  }, [controle.data, search]);

  const total = lista.reduce((s, e) => s + e.amount, 0);

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount))) { toast.error("Informe um valor válido."); return; }
    setSaving(true);
    try {
      await createLancamento({
        type: "income",
        category: "Antecipação",
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        date: form.date || undefined,
      });
      toast.success("Antecipação lançada!");
      setShowModal(false);
      setForm({ description: "", amount: "", date: getTodayStr() });
      fetchControle(from, to, "income");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar antecipação.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLancamento(deleteTarget.id);
      toast.success("Antecipação removida.");
      setDeleteTarget(null);
      fetchControle(from, to, "income");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<CashEntry>[] = [
    { header: "Data", render: row => <span className="text-xs font-bold text-zinc-500">{formatDate(row.date)}</span> },
    {
      header: "Descrição",
      render: row => <span className="text-xs text-zinc-700 truncate max-w-[200px] block">{row.description || "—"}</span>,
    },
    {
      header: "Valor",
      render: row => <span className="text-sm font-black text-amber-600">{formatCurrency(row.amount)}</span>,
    },
    {
      header: "",
      render: row => (
        <button
          onClick={e => { e.stopPropagation(); setDeleteTarget(row); }}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      ),
      hideOnMobile: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
        <StatCard title="Total Antecipado" value={formatCurrency(total)} icon={FastForward} color="default" description={`${lista.length} lançamento${lista.length !== 1 ? "s" : ""}`} delay={0} />
        <StatCard title="Média por Antecipação" value={lista.length ? formatCurrency(total / lista.length) : "R$ 0,00"} icon={Clock} color="info" description="Valor médio" delay={0.05} />
      </div>

      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar antecipação..." />
          </FilterLineItem>
          <FilterLineItem>
            <FilterLineDateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} fromLabel="De" toLabel="Até" />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right">
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowModal(true)}>
            <span className="hidden sm:inline">Nova Antecipação</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </FilterLineSection>
      </FilterLine>

      <GridTable<CashEntry>
        data={lista}
        columns={columns}
        keyExtractor={r => r.id}
        isLoading={controle.loading}
        emptyMessage={
          <EmptyState
            title="Nenhuma antecipação encontrada"
            description="Lance antecipações de pagamentos futuros aqui."
            icon={FastForward}
            action={
              <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowModal(true)}>
                Nova Antecipação
              </Button>
            }
          />
        }
        renderMobileItem={row => (
          <div className="flex items-center justify-between w-full">
            <div>
              <span className="text-xs font-bold text-zinc-700">{row.description || "Antecipação"}</span>
              <p className="text-[10px] text-zinc-400">{formatDate(row.date)}</p>
            </div>
            <span className="text-sm font-black text-amber-600">{formatCurrency(row.amount)}</span>
          </div>
        )}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nova Antecipação"
        size="sm"
        mobileStyle="bottom-sheet"
        footer={
          <ModalFooter>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>Salvar</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />
          <Input
            label="Descrição"
            placeholder="Ex: Antecipação de cartão - Cielo"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Data"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir antecipação?"
        message={`Deseja excluir a antecipação de ${deleteTarget ? formatCurrency(deleteTarget.amount) : ""}?`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
