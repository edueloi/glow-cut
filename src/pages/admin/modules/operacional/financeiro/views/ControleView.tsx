import React, { useEffect, useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, ArrowUpDown, Plus, Trash2,
  ArrowUpRight, ArrowDownLeft, Filter,
} from "lucide-react";
import {
  StatCard, GridTable, FilterLine, FilterLineSection, FilterLineItem,
  FilterLineSearch, FilterLineDateRange, FilterLineSegmented,
  Badge, Button, Modal, ModalFooter, Input, Select, useToast,
  EmptyState, ConfirmModal,
} from "@/src/components/ui";
import type { Column } from "@/src/components/ui/GridTable";
import {
  useFinanceiro, formatCurrency, formatDate, getFirstDayOfMonth, getTodayStr,
  type CashEntry,
} from "@/src/hooks/useFinanceiro";

const CATEGORIAS_ENTRADA = [
  "Serviços", "Produtos", "Comissões", "Adiantamentos", "Gorjetas", "Outros"
];
const CATEGORIAS_SAIDA = [
  "Aluguel", "Energia", "Água", "Internet", "Fornecedores", "Salários",
  "Material", "Manutenção", "Marketing", "Impostos", "Outros",
];

export function ControleView() {
  const { controle, fetchControle, createLancamento, deleteLancamento } = useFinanceiro();
  const toast = useToast();

  const [from, setFrom]   = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]       = useState<string | null>(getTodayStr());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CashEntry | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const [form, setForm] = useState({
    type: "income" as "income" | "expense",
    category: "",
    description: "",
    amount: "",
    date: getTodayStr(),
  });

  useEffect(() => {
    fetchControle(from, to, typeFilter === "all" ? null : typeFilter);
  }, [from, to, typeFilter, fetchControle]);

  const entries: CashEntry[] = controle.data || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter(e =>
      !q ||
      e.description?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const totalEntradas = useMemo(() =>
    filtered.filter(e => e.type === "income").reduce((s, e) => s + e.amount, 0),
    [filtered]
  );
  const totalSaidas = useMemo(() =>
    filtered.filter(e => e.type === "expense").reduce((s, e) => s + e.amount, 0),
    [filtered]
  );
  const saldo = totalEntradas - totalSaidas;

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      toast.error("Informe um valor válido.");
      return;
    }
    setSaving(true);
    try {
      await createLancamento({
        type: form.type,
        category: form.category || undefined,
        description: form.description || undefined,
        amount: parseFloat(form.amount),
        date: form.date || undefined,
      });
      toast.success("Lançamento criado com sucesso!");
      setShowModal(false);
      setForm({ type: "income", category: "", description: "", amount: "", date: getTodayStr() });
      fetchControle(from, to, typeFilter === "all" ? null : typeFilter);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar lançamento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLancamento(deleteTarget.id);
      toast.success("Lançamento removido.");
      setDeleteTarget(null);
      fetchControle(from, to, typeFilter === "all" ? null : typeFilter);
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<CashEntry>[] = [
    {
      header: "Data",
      render: row => (
        <span className="text-xs font-bold text-zinc-700">{formatDate(row.date)}</span>
      ),
    },
    {
      header: "Tipo",
      render: row => (
        <Badge
          color={row.type === "income" ? "success" : "danger"}
          dot
          size="sm"
        >
          {row.type === "income" ? "Entrada" : "Saída"}
        </Badge>
      ),
    },
    {
      header: "Categoria",
      render: row => (
        <span className="text-xs text-zinc-500 font-medium">{row.category || "—"}</span>
      ),
      hideOnMobile: true,
    },
    {
      header: "Descrição",
      render: row => (
        <span className="text-xs text-zinc-700 font-medium truncate max-w-[200px] block">
          {row.description || "—"}
        </span>
      ),
    },
    {
      header: "Valor",
      render: row => (
        <span className={`text-sm font-black ${row.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
          {row.type === "income" ? "+" : "−"}{formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "",
      render: row => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      ),
      hideOnMobile: true,
    },
  ];

  const categorias = form.type === "income" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Entradas"
          value={formatCurrency(totalEntradas)}
          icon={ArrowUpRight}
          color="success"
          description={`${filtered.filter(e => e.type === "income").length} lançamentos`}
          delay={0}
        />
        <StatCard
          title="Saídas"
          value={formatCurrency(totalSaidas)}
          icon={ArrowDownLeft}
          color="danger"
          description={`${filtered.filter(e => e.type === "expense").length} lançamentos`}
          delay={0.05}
        />
        <StatCard
          title="Saldo"
          value={formatCurrency(saldo)}
          icon={ArrowUpDown}
          color={saldo >= 0 ? "success" : "danger"}
          description="Resultado do período"
          delay={0.1}
        />
      </div>

      {/* Filtros */}
      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch
              value={search}
              onChange={setSearch}
              placeholder="Buscar por descrição ou categoria..."
            />
          </FilterLineItem>
          <FilterLineItem>
            <FilterLineDateRange
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
              fromLabel="De"
              toLabel="Até"
            />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right">
          <FilterLineSegmented
            value={typeFilter}
            onChange={v => setTypeFilter(String(v))}
            options={[
              { value: "all", label: "Todos" },
              { value: "income", label: "Entradas" },
              { value: "expense", label: "Saídas" },
            ]}
          />
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus size={14} />}
            onClick={() => setShowModal(true)}
          >
            <span className="hidden sm:inline">Novo Lançamento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </FilterLineSection>
      </FilterLine>

      {/* Tabela */}
      <GridTable<CashEntry>
        data={filtered}
        columns={columns}
        keyExtractor={r => r.id}
        isLoading={controle.loading}
        emptyMessage={
          <EmptyState
            title="Nenhum lançamento encontrado"
            description="Ajuste os filtros ou crie um novo lançamento de entrada ou saída."
            icon={ArrowUpDown}
            action={
              <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowModal(true)}>
                Novo Lançamento
              </Button>
            }
          />
        }
        renderMobileItem={row => (
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <Badge color={row.type === "income" ? "success" : "danger"} size="sm" dot>
                  {row.type === "income" ? "Entrada" : "Saída"}
                </Badge>
                {row.category && (
                  <span className="text-[10px] text-zinc-400 font-medium">{row.category}</span>
                )}
              </div>
              <span className="text-xs font-medium text-zinc-600 truncate max-w-[180px]">
                {row.description || "Sem descrição"}
              </span>
              <span className="text-[10px] text-zinc-400">{formatDate(row.date)}</span>
            </div>
            <span className={`text-sm font-black ${row.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
              {row.type === "income" ? "+" : "−"}{formatCurrency(row.amount)}
            </span>
          </div>
        )}
        getMobileBorderClass={row => row.type === "income" ? "border-emerald-200" : "border-red-200"}
      />

      {/* Modal: Novo Lançamento */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Lançamento"
        size="sm"
        mobileStyle="bottom-sheet"
        footer={
          <ModalFooter>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
              Salvar Lançamento
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setForm(f => ({ ...f, type: "income", category: "" }))}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                form.type === "income"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
              }`}
            >
              <TrendingUp size={14} className="inline mr-1.5" />
              Entrada
            </button>
            <button
              onClick={() => setForm(f => ({ ...f, type: "expense", category: "" }))}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                form.type === "expense"
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
              }`}
            >
              <TrendingDown size={14} className="inline mr-1.5" />
              Saída
            </button>
          </div>

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
            options={categorias.map(c => ({ value: c, label: c }))}
            placeholder="Selecione uma categoria"
          />

          <Input
            label="Descrição"
            placeholder="Descreva o lançamento..."
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

      {/* Modal: Confirmar exclusão */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir lançamento?"
        message={`Deseja excluir o lançamento de ${deleteTarget ? formatCurrency(deleteTarget.amount) : ""}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
