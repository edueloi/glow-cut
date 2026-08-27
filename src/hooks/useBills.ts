/**
 * useBills — Contas a Pagar/Receber (recorrentes, com vencimento/atraso/juros)
 *
 * Sistema paralelo ao useFinanceiro/CashEntry: aqui uma "conta" (Bill) pode ser
 * recorrente (fixa ou de valor variável por ciclo) e cada ocorrência tem vencimento,
 * status pago/pendente e juros calculados na hora quando atrasada.
 */

import { useState, useCallback } from "react";
import { apiFetch } from "@/src/lib/api";

export type BillDirection = "expense" | "income";

export interface BillCategory {
  id: string;
  tenantId: string;
  name: string;
  direction: BillDirection;
  color: string | null;
  isActive: boolean;
}

export interface Bill {
  id: string;
  tenantId: string;
  direction: BillDirection;
  description: string;
  categoryId: string | null;
  category?: BillCategory | null;
  amount: number;
  amountType: "fixed" | "variable";
  isRecurring: boolean;
  recurrenceUnit: "day" | "week" | "month" | "year" | null;
  recurrenceCount: number | null;
  dayOfMonth: number | null;
  interestRate: number | null;
  interestPeriod: "hour" | "day" | "month" | "year" | null;
  notes: string | null;
  isActive: boolean;
}

export interface BillOccurrenceView {
  id: string;
  billId: string;
  sequence: number;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  paidAt: string | null;
  paidAmount: number | null;
  bill: Bill;
  isOverdue: boolean;
  daysLate: number;
  interestAmount: number;
  totalWithInterest: number;
}

export interface BillsListData {
  current: BillOccurrenceView[];
  overdue: BillOccurrenceView[];
}

export interface NewBillPayload {
  direction: BillDirection;
  description: string;
  categoryId?: string | null;
  amount: number;
  amountType: "fixed" | "variable";
  dueDate: string;
  isRecurring: boolean;
  recurrenceUnit?: "day" | "week" | "month" | "year";
  recurrenceCount?: number | null;
  dayOfMonth?: number | null;
  interestRate?: number | null;
  interestPeriod?: "hour" | "day" | "month" | "year";
  notes?: string;
}

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

function useFetchState<T>(): [FetchState<T>, (data: T | null, error?: string | null) => void, (loading: boolean) => void] {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: false, error: null });
  const setData = useCallback((data: T | null, error: string | null = null) => setState({ data, loading: false, error }), []);
  const setLoading = useCallback((loading: boolean) => setState((prev) => ({ ...prev, loading })), []);
  return [state, setData, setLoading];
}

export function useBills() {
  const [categories, setCategoriesData, setCategoriesLoading] = useFetchState<BillCategory[]>();
  const [bills, setBillsData, setBillsLoading] = useFetchState<BillsListData>();

  const fetchCategories = useCallback(async (direction?: BillDirection) => {
    setCategoriesLoading(true);
    try {
      const params = new URLSearchParams();
      if (direction) params.set("direction", direction);
      const res = await apiFetch(`/api/finance/bill-categories?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setCategoriesData(await res.json());
    } catch (e: any) {
      setCategoriesData(null, e.message || "Erro ao carregar categorias");
    }
  }, [setCategoriesData, setCategoriesLoading]);

  const createCategory = useCallback(async (data: { name: string; direction: BillDirection; color?: string }) => {
    const res = await apiFetch("/api/finance/bill-categories", { method: "POST", body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/finance/bill-categories/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const fetchBills = useCallback(async (direction: BillDirection, month: string) => {
    setBillsLoading(true);
    try {
      const params = new URLSearchParams({ direction, month });
      const res = await apiFetch(`/api/finance/bills?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setBillsData(await res.json());
    } catch (e: any) {
      setBillsData(null, e.message || "Erro ao carregar contas");
    }
  }, [setBillsData, setBillsLoading]);

  const createBill = useCallback(async (data: NewBillPayload) => {
    const res = await apiFetch("/api/finance/bills", { method: "POST", body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const updateBill = useCallback(async (id: string, data: Partial<Bill>) => {
    const res = await apiFetch(`/api/finance/bills/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const deleteBill = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/finance/bills/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const markOccurrencePaid = useCallback(async (id: string, paidAmount: number, paidAt?: string) => {
    const res = await apiFetch(`/api/finance/bill-occurrences/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "paid", paidAmount, paidAt }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const unmarkOccurrencePaid = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/finance/bill-occurrences/${id}`, { method: "PATCH", body: JSON.stringify({ status: "pending" }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const updateOccurrenceAmount = useCallback(async (id: string, amount: number) => {
    const res = await apiFetch(`/api/finance/bill-occurrences/${id}`, { method: "PATCH", body: JSON.stringify({ amount }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const cancelOccurrence = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/finance/bill-occurrences/${id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  const deleteOccurrence = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/finance/bill-occurrences/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, []);

  return {
    categories, bills,
    fetchCategories, createCategory, deleteCategory,
    fetchBills, createBill, updateBill, deleteBill,
    markOccurrencePaid, unmarkOccurrencePaid, updateOccurrenceAmount, cancelOccurrence, deleteOccurrence,
  };
}
