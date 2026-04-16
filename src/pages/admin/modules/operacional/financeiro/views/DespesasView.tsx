import React, { useEffect, useState, useMemo } from "react";
import { TrendingDown, Plus, Trash2, BarChart3 } from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineDateRange, FilterLineSearch, Badge, Button, Modal,
  ModalFooter, Input, Select, useToast, EmptyState, ConfirmModal,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import {
  useFinanceiro, formatCurrency, formatDate,
  getFirstDayOfMonth, getTodayStr,
  type Despesa,
} from "@/src/hooks/useFinanceiro";

const CATEGORIAS = [
  "Aluguel", "Energia", "Água", "Internet", "Telefone", "Fornecedores",
  "Salários", "Material", "Manutenção", "Marketing", "Impostos", "Outros",
];

export function DespesasView() {
  const { despesas, fetchDespesas, createLancamento, deleteLancamento } = useFinanceiro();
  const toast = useToast();

  const [from, setFrom]   = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]       = useState<string | null>(getTodayStr());
  const [search, setSearch] = useState("");

  const [showModal, setShowModal]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Despesa | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    date: getTodayStr(),
  });

  useEffect(() => {
    fetchDespesas(from, to);
  }, [from, to, fetchDespesas]);

  const lista: Despesa[] = useMemo(() => {
    const q = search.toLowerCase();
    return (despesas.data?.despesas ?? []).filter(d =>
      !q || d.description?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q)
    );
  }, [despesas.data, search]);

  const total = lista.reduce((s, d) => s + d.amount, 0);

  // Top categorias
  const porCategoria = useMemo(() => {
    const acc: Record<string, number> = {};
    lista.forEach(d => { const c = d.category || "Outros"; acc[c] = (acc[c] || 0) + d.amount; });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [lista]);

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount))) { toast.error("Informe um valor válido."); return; }
    setSaving(true);
    try {
      await createLancamento({
        type: "expense",
        category: form.category || undefined,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        date: form.date || undefined,
      });
      toast.success("Despesa lançada!");
      setShowModal(false);
      setForm({ category: "", description: "", amount: "", date: getTodayStr() });
      fetchDespesas(from, to);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar despesa.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLancamento(deleteTarget.id);
      toast.success("Despesa removida.");
      setDeleteTarget(null);
      fetchDespesas(from, to);
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Despesa>[] = [
    {
      header: "Data",
      render: row => <span className="text-xs font-bold text-zinc-500">{formatDate(row.date)}</span>,
    },
    {
      header: "Categoria",
      render: row => (
        <Badge color="warning" size="sm">{row.category || "Outros"}</Badge>
      ),
    },
    {
      header: "Descrição",
      render: row => (
        <span className="text-xs text-zinc-700 truncate max-w-[200px] block">{row.description || "—"}</span>
      ),
    },
    {
      header: "Valor",
      render: row => (
        <span className="text-sm font-black text-red-600">− {formatCurrency(row.amount)}</span>
      ),
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
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Total Despesas" value={formatCurrency(total)} icon={TrendingDown} color="danger" description={`${lista.length} lançamento${lista.length !== 1 ? "s" : ""}`} delay={0} />
        <StatCard
          title="Maior Categoria"
          value={porCategoria[0]?.[0] || "—"}
          icon={BarChart3}
          color="warning"
          description={porCategoria[0] ? formatCurrency(porCategoria[0][1]) : "Sem dados"}
          delay={0.05}
        />
        <StatCard
          title="Média por Lançamento"
          value={lista.length ? formatCurrency(total / lista.length) : "R$ 0,00"}
          icon={TrendingDown}
          color="default"
          description="Valor médio das despesas"
          delay={0.1}
        />
      </div>

      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar despesa..." />
          </FilterLineItem>
          <FilterLineItem>
            <FilterLineDateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} fromLabel="De" toLabel="Até" />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right">
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowModal(true)}>
            <span className="hidden sm:inline">Nova Despesa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </FilterLineSection>
      </FilterLine>

      <GridTable<Despesa>
        data={lista}
        columns={columns}
        keyExtractor={r => r.id}
        isLoading={despesas.loading}
        emptyMessage={
          <EmptyState
            title="Nenhuma despesa encontrada"
            description="Lance despesas para ter controle total dos seus custos."
            icon={TrendingDown}
            action={
              <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowModal(true)}>
                Nova Despesa
              </Button>
            }
          />
        }
        renderMobileItem={row => (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-0.5">
              <Badge color="warning" size="sm">{row.category || "Outros"}</Badge>
              <span className="text-xs text-zinc-700 mt-0.5">{row.description || "Sem descrição"}</span>
              <span className="text-[10px] text-zinc-400">{formatDate(row.date)}</span>
            </div>
            <span className="text-sm font-black text-red-600">− {formatCurrency(row.amount)}</span>
          </div>
        )}
        getMobileBorderClass={() => "border-red-200"}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nova Despesa"
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
          <Select
            label="Categoria"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={CATEGORIAS.map(c => ({ value: c, label: c }))}
            placeholder="Selecione uma categoria"
          />
          <Input
            label="Descrição"
            placeholder="Descreva a despesa..."
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
        title="Excluir despesa?"
        message={`Deseja excluir a despesa de ${deleteTarget ? formatCurrency(deleteTarget.amount) : ""}?`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
