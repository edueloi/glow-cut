import React, { useEffect, useMemo, useState } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingDown, TrendingUp, Plus, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, Repeat, X, Pencil,
} from "lucide-react";
import {
  StatCard, Badge, Button, Modal, ModalFooter, Input, Select,
  Switch, useToast, EmptyState, ConfirmModal,
} from "@/src/components/ui";
import { cn } from "@/src/lib/utils";
import { formatCurrency, getTodayStr } from "@/src/hooks/useFinanceiro";
import {
  useBills, type BillDirection, type BillOccurrenceView, type NewBillPayload,
} from "@/src/hooks/useBills";

const EMPTY_FORM: NewBillPayload & { newCategoryName: string } = {
  direction: "expense",
  description: "",
  categoryId: "",
  amount: 0,
  amountType: "fixed",
  dueDate: getTodayStr(),
  isRecurring: false,
  recurrenceUnit: "month",
  recurrenceCount: null,
  dayOfMonth: null,
  interestRate: null,
  interestPeriod: "month",
  notes: "",
  newCategoryName: "",
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function DespesasView() {
  const toast = useToast();
  const {
    categories, bills,
    fetchCategories, createCategory,
    fetchBills, createBill, deleteBill,
    markOccurrencePaid, unmarkOccurrencePaid, cancelOccurrence, deleteOccurrence,
  } = useBills();

  const [direction, setDirection] = useState<BillDirection>("expense");
  const [monthCursor, setMonthCursor] = useState(new Date());

  const [showNewModal, setShowNewModal] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [payTarget, setPayTarget] = useState<BillOccurrenceView | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(getTodayStr());
  const [paying, setPaying] = useState(false);

  const [deleteBillTarget, setDeleteBillTarget] = useState<BillOccurrenceView | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = () => {
    fetchCategories(direction);
    fetchBills(direction, monthKey(monthCursor));
  };

  useEffect(() => { reload(); }, [direction, monthCursor]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = bills.data?.current ?? [];
  const overdue = bills.data?.overdue ?? [];

  const totals = useMemo(() => {
    const pending = current.filter((o) => o.status === "pending").reduce((s, o) => s + o.amount, 0);
    const paid = current.filter((o) => o.status === "paid").reduce((s, o) => s + (o.paidAmount ?? o.amount), 0);
    const late = overdue.reduce((s, o) => s + o.totalWithInterest, 0);
    return { pending, paid, late };
  }, [current, overdue]);

  const isExpense = direction === "expense";
  const dirLabel = isExpense ? "Pagar" : "Receber";
  const dirColor = isExpense ? "danger" : "success";

  // ─── Nova conta ────────────────────────────────────────────────────────────

  const openNewModal = () => {
    setForm({ ...EMPTY_FORM, direction, dueDate: getTodayStr() });
    setShowNewCategory(false);
    setShowNewModal(true);
  };

  const handleCreateCategory = async () => {
    if (!form.newCategoryName.trim()) return;
    try {
      const cat = await createCategory({ name: form.newCategoryName.trim(), direction });
      await fetchCategories(direction);
      setForm((f) => ({ ...f, categoryId: cat.id, newCategoryName: "" }));
      setShowNewCategory(false);
      toast.success("Categoria criada!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar categoria.");
    }
  };

  const handleSaveBill = async () => {
    if (!form.description.trim()) { toast.warning("Informe uma descrição."); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.warning("Informe um valor válido."); return; }
    if (!form.dueDate) { toast.warning("Informe a data de vencimento."); return; }
    setSaving(true);
    try {
      await createBill({
        direction,
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        amount: Number(form.amount),
        amountType: form.amountType,
        dueDate: form.dueDate,
        isRecurring: form.isRecurring,
        recurrenceUnit: form.isRecurring ? form.recurrenceUnit : undefined,
        recurrenceCount: form.isRecurring && form.recurrenceCount ? Number(form.recurrenceCount) : null,
        dayOfMonth: form.isRecurring && form.recurrenceUnit === "month" && form.dayOfMonth ? Number(form.dayOfMonth) : null,
        interestRate: form.interestRate ? Number(form.interestRate) : null,
        interestPeriod: form.interestRate ? form.interestPeriod : undefined,
        notes: form.notes || undefined,
      });
      toast.success(isExpense ? "Conta a pagar criada!" : "Conta a receber criada!");
      setShowNewModal(false);
      reload();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar conta.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Marcar como paga ──────────────────────────────────────────────────────

  const openPayModal = (occ: BillOccurrenceView) => {
    setPayTarget(occ);
    setPayAmount(String(occ.totalWithInterest || occ.amount));
    setPayDate(getTodayStr());
  };

  const handleConfirmPay = async () => {
    if (!payTarget) return;
    setPaying(true);
    try {
      await markOccurrencePaid(payTarget.id, Number(payAmount) || payTarget.amount, payDate);
      toast.success(isExpense ? "Conta paga!" : "Recebimento confirmado!");
      setPayTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e.message || "Erro ao confirmar pagamento.");
    } finally {
      setPaying(false);
    }
  };

  const handleUnmark = async (occ: BillOccurrenceView) => {
    try {
      await unmarkOccurrencePaid(occ.id);
      toast.success("Marcação desfeita.");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Erro.");
    }
  };

  const handleCancelOccurrence = async (occ: BillOccurrenceView) => {
    try {
      await cancelOccurrence(occ.id);
      toast.success("Ocorrência cancelada.");
      reload();
    } catch (e: any) {
      toast.error(e.message || "Erro.");
    }
  };

  const handleDeleteOccurrence = async () => {
    if (!deleteBillTarget) return;
    setDeleting(true);
    try {
      await deleteOccurrence(deleteBillTarget.id);
      toast.success("Removida.");
      setDeleteBillTarget(null);
      reload();
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const Row = ({ occ, late }: { occ: BillOccurrenceView; late: boolean }) => (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between",
        late ? "border-red-200 bg-red-50/40" : occ.status === "paid" ? "border-emerald-100 bg-emerald-50/30" : "border-zinc-100 bg-white"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          late ? "bg-red-100 text-red-600" : occ.status === "paid" ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-500"
        )}>
          {late ? <AlertTriangle size={18} /> : occ.status === "paid" ? <CheckCircle2 size={18} /> : <Clock size={18} />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-zinc-900">{occ.bill.description}</p>
            {occ.bill.isRecurring && (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                <Repeat size={10} /> {occ.sequence}{occ.bill.recurrenceCount ? `/${occ.bill.recurrenceCount}` : ""}
              </span>
            )}
            {occ.bill.category?.name && <Badge color="default" size="sm">{occ.bill.category.name}</Badge>}
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Vence {format(new Date(occ.dueDate), "dd/MM/yyyy")}
            {late && ` · ${occ.daysLate} dia${occ.daysLate === 1 ? "" : "s"} em atraso`}
            {occ.status === "paid" && occ.paidAt && ` · Pago em ${format(new Date(occ.paidAt), "dd/MM/yyyy")}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
        <div className="text-right">
          <p className={cn("text-sm font-black", late ? "text-red-600" : occ.status === "paid" ? "text-emerald-600" : "text-zinc-900")}>
            {formatCurrency(occ.status === "paid" ? (occ.paidAmount ?? occ.amount) : occ.totalWithInterest)}
          </p>
          {late && occ.interestAmount > 0 && (
            <p className="text-[9px] font-bold text-red-400">+{formatCurrency(occ.interestAmount)} juros</p>
          )}
        </div>
        {occ.status === "paid" ? (
          <button onClick={() => handleUnmark(occ)} className="rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-100">
            Desfazer
          </button>
        ) : (
          <>
            <Button size="sm" variant={isExpense ? "danger" : "success"} onClick={() => openPayModal(occ)}>
              {isExpense ? "Pagar" : "Receber"}
            </Button>
            <button onClick={() => handleCancelOccurrence(occ)} title="Cancelar esta ocorrência" className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500">
              <X size={14} />
            </button>
            <button onClick={() => setDeleteBillTarget(occ)} title="Excluir" className="rounded-lg p-2 text-zinc-300 hover:bg-red-50 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 pb-20 sm:space-y-6">
      {/* Toggle Pagar/Receber + Nova conta */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-2xl bg-zinc-100 p-1">
          <button
            onClick={() => setDirection("expense")}
            className={cn("flex-1 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all sm:flex-none", direction === "expense" ? "bg-white text-red-600 shadow-sm" : "text-zinc-400")}
          >
            A Pagar
          </button>
          <button
            onClick={() => setDirection("income")}
            className={cn("flex-1 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all sm:flex-none", direction === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-zinc-400")}
          >
            A Receber
          </button>
        </div>
        <Button variant="primary" size="sm" fullWidth className="sm:w-auto" iconLeft={<Plus size={14} />} onClick={openNewModal}>
          Nova Conta {isExpense ? "a Pagar" : "a Receber"}
        </Button>
      </div>

      {/* Navegador de mês */}
      <div className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-100 bg-white p-2.5 sm:justify-start">
        <button onClick={() => setMonthCursor((d) => subMonths(d, 1))} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
          <ChevronLeft size={16} />
        </button>
        <p className="w-40 text-center text-sm font-black capitalize text-zinc-900">
          {format(monthCursor, "MMMM yyyy", { locale: ptBR })}
        </p>
        <button onClick={() => setMonthCursor((d) => addMonths(d, 1))} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setMonthCursor(new Date())} className="ml-1 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50">
          Hoje
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
        <StatCard title={`Pendente no mês`} value={formatCurrency(totals.pending)} icon={isExpense ? TrendingDown : TrendingUp} color="warning" description={`${current.filter(o => o.status === "pending").length} conta(s)`} delay={0} />
        <StatCard title="Em atraso" value={formatCurrency(totals.late)} icon={AlertTriangle} color="danger" description={`${overdue.length} conta(s)`} delay={0.05} />
        <StatCard title={isExpense ? "Pago no mês" : "Recebido no mês"} value={formatCurrency(totals.paid)} icon={CheckCircle2} color="success" description={`${current.filter(o => o.status === "paid").length} conta(s)`} delay={0.1} />
      </div>

      {/* Em atraso */}
      {overdue.length > 0 && (
        <div className="space-y-2.5">
          <p className="ml-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500">
            <AlertTriangle size={12} /> Em atraso (de meses anteriores)
          </p>
          {overdue.map((occ) => <Row key={occ.id} occ={occ} late />)}
        </div>
      )}

      {/* Mês corrente */}
      <div className="space-y-2.5">
        <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">Este mês</p>
        {bills.loading ? (
          <div className="py-16 text-center text-xs font-bold text-zinc-300">Carregando...</div>
        ) : current.length === 0 ? (
          <EmptyState
            title={`Nenhuma conta ${dirLabel.toLowerCase()} este mês`}
            description="Crie contas avulsas ou recorrentes pra organizar seu financeiro."
            icon={isExpense ? TrendingDown : TrendingUp}
            action={<Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={openNewModal}>Nova Conta</Button>}
          />
        ) : (
          current.map((occ) => <Row key={occ.id} occ={occ} late={occ.isOverdue} />)
        )}
      </div>

      {/* Modal: Nova conta */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title={`Nova Conta a ${dirLabel}`}
        size="sm"
        mobileStyle="bottom-sheet"
        footer={
          <ModalFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewModal(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSaveBill}>Salvar</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <Input label="Descrição" placeholder={isExpense ? "Ex: Aluguel, Energia..." : "Ex: Mensalidade cliente X..."} value={form.description} onChange={(e: any) => setForm((f) => ({ ...f, description: e.target.value }))} />

          <div>
            <Select
              label="Categoria"
              value={form.categoryId || ""}
              onChange={(e: any) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              options={(categories.data || []).map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Selecione uma categoria"
            />
            {!showNewCategory ? (
              <button onClick={() => setShowNewCategory(true)} className="mt-1.5 text-[10px] font-bold text-amber-600 hover:text-amber-700">+ Criar nova categoria</button>
            ) : (
              <div className="mt-2 flex gap-2">
                <Input placeholder="Nome da categoria" value={form.newCategoryName} onChange={(e: any) => setForm((f) => ({ ...f, newCategoryName: e.target.value }))} wrapperClassName="flex-1" />
                <Button size="sm" variant="outline" onClick={handleCreateCategory}>Criar</Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$)" type="number" step="0.01" min="0" placeholder="0,00" value={form.amount || ""} onChange={(e: any) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <Input label="Vencimento" type="date" value={form.dueDate} onChange={(e: any) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3.5 py-3">
            <div>
              <p className="text-xs font-bold text-zinc-800">Valor variável</p>
              <p className="text-[10px] text-zinc-400">O valor muda a cada vencimento (ex: água, luz)</p>
            </div>
            <Switch checked={form.amountType === "variable"} onCheckedChange={(v) => setForm((f) => ({ ...f, amountType: v ? "variable" : "fixed" }))} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3.5 py-3">
            <div>
              <p className="text-xs font-bold text-zinc-800">Conta recorrente</p>
              <p className="text-[10px] text-zinc-400">Se repete automaticamente</p>
            </div>
            <Switch checked={form.isRecurring} onCheckedChange={(v) => setForm((f) => ({ ...f, isRecurring: v }))} />
          </div>

          {form.isRecurring && (
            <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/40 p-3.5">
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Repete a cada"
                  value={form.recurrenceUnit || "month"}
                  onChange={(e: any) => setForm((f) => ({ ...f, recurrenceUnit: e.target.value }))}
                  options={[{ value: "day", label: "Dia" }, { value: "week", label: "Semana" }, { value: "month", label: "Mês" }, { value: "year", label: "Ano" }]}
                />
                <Input label="Quantas vezes" type="number" min="0" placeholder="Sem fim" value={form.recurrenceCount ?? ""} onChange={(e: any) => setForm((f) => ({ ...f, recurrenceCount: e.target.value }))} hint="Vazio = sem fim" />
              </div>
              {form.recurrenceUnit === "month" && (
                <Input label="Dia do vencimento (opcional)" type="number" min="1" max="31" placeholder="Mesmo dia do primeiro vencimento" value={form.dayOfMonth ?? ""} onChange={(e: any) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))} />
              )}
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, interestRate: f.interestRate === null ? 0 : null }))}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600"
            >
              {form.interestRate === null ? "+ Configurar juros por atraso" : "− Remover juros por atraso"}
            </button>
            {form.interestRate !== null && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Input label="Taxa (%)" type="number" step="0.01" min="0" placeholder="0,00" value={form.interestRate ?? ""} onChange={(e: any) => setForm((f) => ({ ...f, interestRate: e.target.value }))} />
                <Select
                  label="Por"
                  value={form.interestPeriod || "month"}
                  onChange={(e: any) => setForm((f) => ({ ...f, interestPeriod: e.target.value }))}
                  options={[{ value: "hour", label: "Hora" }, { value: "day", label: "Dia" }, { value: "month", label: "Mês" }, { value: "year", label: "Ano" }]}
                />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal: marcar como paga */}
      <Modal
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={isExpense ? "Confirmar Pagamento" : "Confirmar Recebimento"}
        size="xs"
        mobileStyle="bottom-sheet"
        footer={
          <ModalFooter>
            <Button variant="outline" size="sm" onClick={() => setPayTarget(null)}>Cancelar</Button>
            <Button variant={isExpense ? "danger" : "success"} size="sm" loading={paying} onClick={handleConfirmPay}>Confirmar</Button>
          </ModalFooter>
        }
      >
        {payTarget && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-zinc-800">{payTarget.bill.description}</p>
            {payTarget.isOverdue && payTarget.interestAmount > 0 && (
              <p className="text-[11px] font-bold text-red-500">Inclui {formatCurrency(payTarget.interestAmount)} de juros por atraso.</p>
            )}
            <Input label="Valor pago" type="number" step="0.01" min="0" value={payAmount} onChange={(e: any) => setPayAmount(e.target.value)} />
            <Input label="Data" type="date" value={payDate} onChange={(e: any) => setPayDate(e.target.value)} />
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteBillTarget}
        onClose={() => setDeleteBillTarget(null)}
        onConfirm={handleDeleteOccurrence}
        title="Excluir esta ocorrência?"
        message={`Isso remove só esta parcela (${deleteBillTarget ? format(new Date(deleteBillTarget.dueDate), "dd/MM/yyyy") : ""}), não a série inteira.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

