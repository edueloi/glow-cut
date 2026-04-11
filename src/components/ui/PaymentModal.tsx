import React, { useState, useEffect } from "react";
import { X, DollarSign, CreditCard, Smartphone, CheckCircle, Plus, Trash2, Split } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface PaymentEntry {
  method: "cash" | "card" | "pix";
  amount: string;
  installments?: number; // apenas para cartão
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  comanda: any;
  onConfirm: (paymentMethod: string, paymentDetails: any) => Promise<void>;
}

const METHOD_CONFIG = {
  cash: {
    label: "Dinheiro",
    icon: DollarSign,
    color: "emerald",
    bg: "bg-emerald-50 border-emerald-200",
    activeBg: "bg-emerald-500",
    text: "text-emerald-700",
    activeText: "text-white",
  },
  card: {
    label: "Cartão",
    icon: CreditCard,
    color: "blue",
    bg: "bg-blue-50 border-blue-200",
    activeBg: "bg-blue-500",
    text: "text-blue-700",
    activeText: "text-white",
  },
  pix: {
    label: "Pix",
    icon: Smartphone,
    color: "violet",
    bg: "bg-violet-50 border-violet-200",
    activeBg: "bg-violet-500",
    text: "text-violet-700",
    activeText: "text-white",
  },
};

export function PaymentModal({ isOpen, onClose, comanda, onConfirm }: PaymentModalProps) {
  const [mode, setMode] = useState<"single" | "mixed">("single");
  const [singleMethod, setSingleMethod] = useState<"cash" | "card" | "pix">("cash");
  const [singleInstallments, setSingleInstallments] = useState(1);
  const [entries, setEntries] = useState<PaymentEntry[]>([
    { method: "cash", amount: "" },
    { method: "pix", amount: "" },
  ]);
  const [loading, setLoading] = useState(false);

  const total = comanda ? Number(comanda.total) : 0;

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setMode("single");
      setSingleMethod("cash");
      setSingleInstallments(1);
      setEntries([
        { method: "cash", amount: "" },
        { method: "pix", amount: "" },
      ]);
    }
  }, [isOpen]);

  const mixedTotal = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const mixedRemaining = total - mixedTotal;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (mode === "single") {
        const details = {
          mode: "single",
          method: singleMethod,
          amount: total,
          installments: singleMethod === "card" ? singleInstallments : 1,
        };
        await onConfirm(singleMethod, details);
      } else {
        // Pagamento misto
        const validEntries = entries.filter(e => parseFloat(e.amount) > 0);
        if (validEntries.length === 0) return;
        const methods = [...new Set(validEntries.map(e => e.method))];
        const methodLabel = methods.length === 1 ? methods[0] : "mixed";
        const details = {
          mode: "mixed",
          entries: validEntries.map(e => ({
            method: e.method,
            amount: parseFloat(e.amount) || 0,
            installments: e.method === "card" ? (e.installments || 1) : 1,
          })),
        };
        await onConfirm(methodLabel, details);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (idx: number, field: keyof PaymentEntry, value: any) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const addEntry = () => {
    setEntries(prev => [...prev, { method: "cash", amount: "" }]);
  };

  const removeEntry = (idx: number) => {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  };

  if (!isOpen || !comanda) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[28px] shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-zinc-900 tracking-tight">Finalizar Pagamento</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              {comanda.client?.name} • Comanda #{comanda.id?.slice(-6).toUpperCase()}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 text-zinc-400 rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Total */}
          <div className="bg-zinc-50 rounded-2xl p-4 text-center border border-zinc-100">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total a Pagar</p>
            <p className="text-3xl font-black text-zinc-900 tracking-tighter">
              R$ {total.toFixed(2)}
            </p>
          </div>

          {/* Modo: único ou misto */}
          <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
            <button
              onClick={() => setMode("single")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                mode === "single" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <CheckCircle size={12} /> Pagamento Único
            </button>
            <button
              onClick={() => setMode("mixed")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                mode === "mixed" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              <Split size={12} /> Pagamento Misto
            </button>
          </div>

          {/* ── Modo Único ── */}
          {mode === "single" && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Forma de Pagamento</p>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "card", "pix"] as const).map(m => {
                  const cfg = METHOD_CONFIG[m];
                  const Icon = cfg.icon;
                  const active = singleMethod === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setSingleMethod(m)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                        active ? `${cfg.activeBg} border-transparent shadow-lg` : `${cfg.bg} hover:opacity-90`
                      )}
                    >
                      <Icon size={22} className={active ? cfg.activeText : cfg.text} />
                      <span className={cn("text-[10px] font-black uppercase tracking-wider", active ? "text-white" : cfg.text)}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Parcelamento (apenas cartão) */}
              {singleMethod === "card" && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Parcelamento</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button
                        key={n}
                        onClick={() => setSingleInstallments(n)}
                        className={cn(
                          "py-2.5 rounded-xl border text-xs font-black transition-all",
                          singleInstallments === n
                            ? "bg-blue-500 text-white border-transparent shadow-sm"
                            : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100"
                        )}
                      >
                        {n === 1 ? "À vista" : `${n}x`}
                        {n > 1 && (
                          <span className="block text-[8px] font-bold opacity-80">
                            R$ {(total / n).toFixed(2)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Modo Misto ── */}
          {mode === "mixed" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Divisão do Pagamento</p>
                <button
                  onClick={addEntry}
                  className="flex items-center gap-1 text-[10px] font-black text-amber-600 hover:text-amber-700"
                >
                  <Plus size={12} /> Adicionar
                </button>
              </div>

              {entries.map((entry, idx) => {
                const Icon = METHOD_CONFIG[entry.method].icon;
                return (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                    {/* Método */}
                    <select
                      value={entry.method}
                      onChange={e => updateEntry(idx, "method", e.target.value as any)}
                      className="text-xs font-bold bg-white border border-zinc-200 rounded-xl px-2 py-2 outline-none text-zinc-700 cursor-pointer"
                    >
                      <option value="cash">💵 Dinheiro</option>
                      <option value="card">💳 Cartão</option>
                      <option value="pix">📲 Pix</option>
                    </select>

                    {/* Valor */}
                    <div className="flex-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.amount}
                        onChange={e => updateEntry(idx, "amount", e.target.value)}
                        placeholder="R$ 0,00"
                        className="w-full text-sm font-bold px-3 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:border-amber-400 text-zinc-900"
                      />
                      {/* Parcelamento se cartão */}
                      {entry.method === "card" && (
                        <select
                          value={entry.installments || 1}
                          onChange={e => updateEntry(idx, "installments", parseInt(e.target.value))}
                          className="mt-1.5 w-full text-xs font-bold bg-white border border-zinc-200 rounded-xl px-2 py-1.5 outline-none text-blue-600 cursor-pointer"
                        >
                          {[1,2,3,4,5,6].map(n => (
                            <option key={n} value={n}>
                              {n === 1 ? "À vista" : `${n}x de R$ ${((parseFloat(entry.amount) || 0) / n).toFixed(2)}`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Remover */}
                    {entries.length > 2 && (
                      <button onClick={() => removeEntry(idx)} className="p-1.5 hover:bg-red-50 text-zinc-300 hover:text-red-400 rounded-lg transition-all mt-0.5">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Saldo restante */}
              <div className={cn(
                "flex items-center justify-between p-3 rounded-xl text-xs font-black border",
                Math.abs(mixedRemaining) < 0.01
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : mixedRemaining > 0
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-red-50 border-red-200 text-red-700"
              )}>
                <span>{Math.abs(mixedRemaining) < 0.01 ? "✅ Valores conferem!" : mixedRemaining > 0 ? "⚠️ Faltam" : "⚠️ Excesso"}</span>
                {Math.abs(mixedRemaining) >= 0.01 && (
                  <span>R$ {Math.abs(mixedRemaining).toFixed(2)}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || (mode === "mixed" && Math.abs(mixedRemaining) > 0.01)}
            className={cn(
              "flex-2 flex-grow-[2] py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg",
              loading || (mode === "mixed" && Math.abs(mixedRemaining) > 0.01)
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 active:scale-95"
            )}
          >
            <CheckCircle size={14} />
            {loading ? "Processando..." : "Confirmar Pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
