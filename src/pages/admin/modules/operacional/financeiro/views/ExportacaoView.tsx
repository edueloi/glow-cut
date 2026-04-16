import React, { useState } from "react";
import { Download, FileText, FileSpreadsheet, Receipt, CheckCircle2, AlertCircle } from "lucide-react";
import {
  FilterLine, FilterLineSection, FilterLineItem, FilterLineDateRange,
  Button, StatCard, useToast,
} from "@/src/components/ui";
import { getFirstDayOfMonth, getTodayStr, formatCurrency } from "@/src/hooks/useFinanceiro";
import { apiFetch } from "@/src/lib/api";

type ExportTipo = "todos" | "entradas" | "saidas" | "comandas";
type ExportStatus = "idle" | "loading" | "success" | "error";

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function rowsToCSV(headers: string[], rows: string[][]): string {
  return [headers, ...rows]
    .map(r => r.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(";"))
    .join("\n");
}

export function ExportacaoView() {
  const [from, setFrom] = useState<string | null>(getFirstDayOfMonth());
  const [to, setTo]     = useState<string | null>(getTodayStr());
  const toast = useToast();

  const [statuses, setStatuses] = useState<Record<ExportTipo, ExportStatus>>({
    todos: "idle", entradas: "idle", saidas: "idle", comandas: "idle",
  });

  const setStatus = (tipo: ExportTipo, status: ExportStatus) =>
    setStatuses(s => ({ ...s, [tipo]: status }));

  const exportLancamentos = async (tipo: ExportTipo) => {
    setStatus(tipo, "loading");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to)   params.set("to", to);
      if (tipo === "entradas") params.set("type", "income");
      if (tipo === "saidas")   params.set("type", "expense");

      const res = await apiFetch(`/api/finance/cash-entries?${params}`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data: any[] = await res.json();

      if (!data.length) {
        toast.error("Nenhum lançamento encontrado no período.");
        setStatus(tipo, "idle");
        return;
      }

      const headers = ["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)"];
      const rows = data.map(r => [
        new Date(r.date).toLocaleDateString("pt-BR"),
        r.type === "income" ? "Entrada" : "Saída",
        r.category || "Sem categoria",
        r.description || "",
        Number(r.amount).toFixed(2).replace(".", ","),
      ]);

      // Linha de totais
      const totalEntradas = data.filter(r => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
      const totalSaidas   = data.filter(r => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
      rows.push([], ["TOTAIS", "", "", "Entradas:", totalEntradas.toFixed(2).replace(".", ",")]);
      rows.push(["", "", "", "Saídas:", totalSaidas.toFixed(2).replace(".", ",")]);
      rows.push(["", "", "", "Saldo:", (totalEntradas - totalSaidas).toFixed(2).replace(".", ",")]);

      const label = tipo === "entradas" ? "entradas" : tipo === "saidas" ? "saidas" : "lancamentos";
      downloadCSV(rowsToCSV(headers, rows), `${label}_${from || "inicio"}_${to || "hoje"}.csv`);
      setStatus(tipo, "success");
      toast.success(`${data.length} registro${data.length > 1 ? "s" : ""} exportado${data.length > 1 ? "s" : ""}.`);
      setTimeout(() => setStatus(tipo, "idle"), 3000);
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar.");
      setStatus(tipo, "error");
      setTimeout(() => setStatus(tipo, "idle"), 3000);
    }
  };

  const exportComandas = async () => {
    setStatus("comandas", "loading");
    try {
      const params = new URLSearchParams({ status: "closed" });
      if (from) params.set("from", from);
      if (to)   params.set("to", to);

      const res = await apiFetch(`/api/comandas?${params}`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const data: any[] = await res.json();

      if (!data.length) {
        toast.error("Nenhuma comanda encontrada no período.");
        setStatus("comandas", "idle");
        return;
      }

      const headers = ["Data", "Cliente", "Profissional", "Serviços", "Forma Pagamento", "Desconto (R$)", "Total (R$)"];
      const rows = data.map(r => {
        const servicos = (r.items || []).map((i: any) => i.serviceName || i.service?.name || "").filter(Boolean).join(", ");
        const discountVal = r.discountType === "percentage"
          ? (Number(r.total) * Number(r.discount) / 100)
          : Number(r.discount);
        return [
          new Date(r.createdAt).toLocaleDateString("pt-BR"),
          r.clientName || r.client?.name || "Sem cadastro",
          r.professionalName || r.professional?.name || "—",
          servicos || "—",
          r.paymentMethod || "—",
          discountVal.toFixed(2).replace(".", ","),
          Number(r.total).toFixed(2).replace(".", ","),
        ];
      });

      // Totais
      const totalGeral = data.reduce((s, r) => s + Number(r.total), 0);
      rows.push([], ["TOTAL", "", "", "", "", "", totalGeral.toFixed(2).replace(".", ",")]);

      downloadCSV(rowsToCSV(headers, rows), `comandas_${from || "inicio"}_${to || "hoje"}.csv`);
      setStatus("comandas", "success");
      toast.success(`${data.length} comanda${data.length > 1 ? "s" : ""} exportada${data.length > 1 ? "s" : ""}.`);
      setTimeout(() => setStatus("comandas", "idle"), 3000);
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar comandas.");
      setStatus("comandas", "error");
      setTimeout(() => setStatus("comandas", "idle"), 3000);
    }
  };

  const opcoes: {
    tipo: ExportTipo;
    label: string;
    desc: string;
    icon: React.ElementType;
    iconBg: string;
    action: () => void;
  }[] = [
    {
      tipo: "todos",
      label: "Todos os Lançamentos",
      desc: "Entradas e saídas manuais do período",
      icon: FileSpreadsheet,
      iconBg: "text-zinc-600 bg-zinc-50 border-zinc-200",
      action: () => exportLancamentos("todos"),
    },
    {
      tipo: "entradas",
      label: "Apenas Entradas",
      desc: "Somente lançamentos de receita manual",
      icon: FileText,
      iconBg: "text-emerald-600 bg-emerald-50 border-emerald-200",
      action: () => exportLancamentos("entradas"),
    },
    {
      tipo: "saidas",
      label: "Apenas Saídas",
      desc: "Somente lançamentos de despesa",
      icon: FileText,
      iconBg: "text-red-600 bg-red-50 border-red-200",
      action: () => exportLancamentos("saidas"),
    },
    {
      tipo: "comandas",
      label: "Comandas Fechadas",
      desc: "Atendimentos concluídos no período",
      icon: Receipt,
      iconBg: "text-blue-600 bg-blue-50 border-blue-200",
      action: exportComandas,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <FilterLine>
        <FilterLineSection grow>
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
      </FilterLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {opcoes.map(item => {
          const status = statuses[item.tipo];
          const isLoading = status === "loading";
          const isSuccess = status === "success";
          const isError   = status === "error";

          return (
            <div
              key={item.tipo}
              className={[
                "bg-white rounded-2xl border p-5 shadow-sm transition-all",
                isSuccess ? "border-emerald-200 shadow-emerald-50" :
                isError   ? "border-red-200 shadow-red-50" :
                "border-zinc-200 hover:shadow-md",
              ].join(" ")}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                  {isSuccess
                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                    : isError
                    ? <AlertCircle size={18} className="text-red-500" />
                    : <item.icon size={18} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-900 mb-0.5">{item.label}</p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">{item.desc}</p>
                  <Button
                    variant={isSuccess ? "outline" : "outline"}
                    size="sm"
                    iconLeft={
                      isSuccess ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                      <Download size={14} />
                    }
                    fullWidth
                    loading={isLoading}
                    onClick={item.action}
                    disabled={isLoading}
                  >
                    {isSuccess ? "Exportado!" : isError ? "Tentar novamente" : "Exportar CSV"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Formato do arquivo</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Arquivos exportados em <strong>CSV com separador ponto-e-vírgula</strong> (compatível com Excel e Google Sheets).
          Encoding <strong>UTF-8 com BOM</strong> para caracteres especiais. Inclui linha de totais ao final.
        </p>
      </div>
    </div>
  );
}
