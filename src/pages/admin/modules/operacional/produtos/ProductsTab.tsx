import React, { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Archive,
  ChevronDown,
  BarChart3,
  ShoppingBag,
  Box,
  Layers,
  X,
  ArrowUpDown,
  Users,
  Truck,
  Factory,
  ClipboardList,
  FileText,
  CornerDownRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { GridTable, Column } from "@/src/components/ui/GridTable";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface ProductsTabProps {
  products: any[];
  sectors: any[];
  setIsProductModalOpen: (b: boolean) => void;
  setEditingProduct: (p: any) => void;
  setNewProduct: (p: any) => void;
  fetchProducts: () => void;
  fetchSectors: () => void;
  activeSubModule: string;
  setActiveSubModule: (key: string) => void;
}

type TabKey = "all" | "low" | "sale" | "internal" | string;
type SortKey = "name" | "stock" | "price" | "margin";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function getStockStatus(p: any) {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.minStock) return "low";
  return "ok";
}

function getMargin(p: any) {
  if (Number(p.costPrice) <= 0) return null;
  return (((Number(p.salePrice) - Number(p.costPrice)) / Number(p.costPrice)) * 100);
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ── Sector Badge ─────────────────────────────────────────────────────────── */

function SectorBadge({ product, sectors }: { product: any; sectors: any[] }) {
  const sector = product.sector || sectors.find((s: any) => s.id === product.sectorId);
  if (!sector) return null;
  return (
    <span
      className="text-[8px] font-black px-1.5 py-0.5 rounded-md border"
      style={{
        backgroundColor: sector.color + "18",
        color: sector.color,
        borderColor: sector.color + "30",
      }}
    >
      {sector.name}
    </span>
  );
}

/* ── Chart tooltip ────────────────────────────────────────────────────────── */

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-zinc-100 rounded-2xl shadow-2xl px-4 py-3">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-black" style={{ color: p.color }}>
            {p.name}: <span className="text-zinc-700">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ── Animated KPI Card ────────────────────────────────────────────────────── */

function KpiCard({ label, value, sub, icon, gradient, delay = 0 }: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/60 bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 group"
    >
      {/* Gradient accent line at top */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", gradient)} />

      <div className="p-3 sm:p-5 pt-4 sm:pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
              {label}
            </p>
            <p className="text-xl sm:text-3xl font-black text-zinc-900 tracking-tight mt-1 sm:mt-2 truncate">
              {value}
            </p>
          </div>
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0",
            gradient
          )}>
            <div className="text-white">{icon}</div>
          </div>
        </div>
        <p className="text-[9px] sm:text-[10px] text-zinc-400 font-bold mt-1 sm:mt-2 truncate">{sub}</p>
      </div>
    </motion.div>
  );
}

/* ── Product Card (mobile) ────────────────────────────────────────────────── */

function ProductCard({
  product,
  sectors,
  onEdit,
  onDelete,
}: {
  product: any;
  sectors: any[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = getStockStatus(product);
  const margin = getMargin(product);

  const statusConfig = {
    out: { label: "Sem Estoque", color: "text-red-500", bg: "bg-red-50", border: "border-red-200", barColor: "bg-red-500", accent: "from-red-500 to-rose-500" },
    low: { label: "Estoque Baixo", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", barColor: "bg-amber-500", accent: "from-amber-500 to-orange-500" },
    ok:  { label: "OK", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", barColor: "bg-emerald-500", accent: "from-emerald-500 to-teal-500" },
  }[status];

  return (
    <div className="space-y-0 -m-4">
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-zinc-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Product avatar */}
        <div className={cn(
          "relative w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 overflow-hidden border",
          statusConfig.bg, statusConfig.border
        )}>
          {product.photo ? (
            <img src={product.photo} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className={statusConfig.color}>{product.name?.charAt(0)?.toUpperCase()}</span>
          )}
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
            statusConfig.barColor
          )} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-zinc-900 truncate leading-tight">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-0.5">
              <Box size={9} className="opacity-50" />
              {product.stock} {product.unit || "un"}
            </span>
            <SectorBadge product={product} sectors={sectors} />
            <span className={cn(
              "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest",
              product.isForSale ? "bg-violet-50 text-violet-500 border border-violet-100" : "bg-zinc-100 text-zinc-400"
            )}>
              {product.isForSale ? "Revenda" : "Interno"}
            </span>
          </div>
        </div>

        {/* Right side: price + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-base font-black text-zinc-900">
              {formatBRL(Number(product.salePrice))}
            </p>
            {margin !== null && (
              <p className={cn(
                "text-[9px] font-black",
                margin >= 30 ? "text-emerald-500" : margin >= 0 ? "text-amber-500" : "text-red-500"
              )}>
                {margin >= 0 ? "+" : ""}{margin.toFixed(0)}%
              </p>
            )}
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-zinc-300" />
          </motion.div>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 pt-3">
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className={cn("rounded-xl p-2.5 border", statusConfig.bg, statusConfig.border)}>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Estoque</p>
                  <p className={cn("text-lg font-black tracking-tight mt-0.5", statusConfig.color)}>
                    {product.stock}
                  </p>
                  <p className="text-[8px] text-zinc-400 font-bold">Mín: {product.minStock}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Custo</p>
                  <p className="text-sm font-black text-zinc-700 tracking-tight mt-0.5">
                    {formatBRL(Number(product.costPrice))}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-2.5 border border-emerald-100/50">
                  <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">Margem</p>
                  <p className={cn(
                    "text-sm font-black tracking-tight mt-0.5",
                    margin !== null && margin >= 30 ? "text-emerald-600" : "text-amber-500"
                  )}>
                    {margin !== null ? `${margin.toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Stock health bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-bold text-zinc-400">Nível de estoque</span>
                  <span className={cn("font-black", statusConfig.color)}>{statusConfig.label}</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: product.minStock > 0
                        ? `${Math.min(100, (product.stock / (product.minStock * 3)) * 100)}%`
                        : product.stock > 0 ? "100%" : "4%"
                    }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={cn("h-full rounded-full bg-gradient-to-r", statusConfig.accent)}
                  />
                </div>
              </div>

              {/* SKU & Description */}
              {(product.description || product.code) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {product.code && (
                    <span className="text-[9px] font-black text-zinc-500 bg-zinc-100 px-2 py-1 rounded-lg tracking-widest uppercase border border-zinc-200/50">
                      SKU: {product.code}
                    </span>
                  )}
                  {product.description && (
                    <span className="text-[10px] text-zinc-400 font-bold line-clamp-1">
                      {product.description}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  <Edit2 size={12} /> Editar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="flex items-center justify-center py-3 px-4 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-xl transition-all active:scale-[0.98]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ── SubModule View (Mock/Placeholder) ────────────────────────────────────── */

function SubModuleView({ activeSubModule }: { activeSubModule: string }) {
  const config = useMemo(() => {
    switch (activeSubModule) {
      case "fornecedores":
        return {
          title: "Fornecedores", icon: Truck,
          kpis: [{ label: "Total", value: "14", sub: "Fornecedores ativos", color: "bg-gradient-to-br from-blue-500 to-indigo-600" }, { label: "Em Atraso", value: "0", sub: "Entregas pontuais", color: "bg-gradient-to-br from-emerald-500 to-teal-600" }, { label: "Pedidos", value: "5", sub: "Em andamento", color: "bg-gradient-to-br from-amber-500 to-orange-600" }],
          tableCols: ["Fornecedor", "CNPJ/Documento", "Contato", "Última Compra", "Status"]
        };
      case "fabricantes":
        return {
          title: "Fabricantes & Marcas", icon: Factory,
          kpis: [{ label: "Marcas", value: "28", sub: "Cadastradas", color: "bg-gradient-to-br from-purple-500 to-pink-600" }, { label: "Categorias", value: "12", sub: "Diversificação", color: "bg-gradient-to-br from-blue-500 to-cyan-500" }, { label: "Parceiros", value: "4", sub: "Homologados", color: "bg-gradient-to-br from-amber-500 to-orange-500" }],
          tableCols: ["Marca/Fabricante", "Origem", "Representante", "Produtos Ativos", "Avaliação"]
        };
      case "venda":
        return {
          title: "Vendas de Produtos", icon: ShoppingBag,
          kpis: [{ label: "Ticket Médio", value: "R$ 145", sub: "+12% vs mês anterior", color: "bg-gradient-to-br from-emerald-500 to-green-600" }, { label: "Itens/Venda", value: "3.2", sub: "Média por pedido", color: "bg-gradient-to-br from-sky-500 to-blue-600" }, { label: "Margem Média", value: "48%", sub: "Rentabilidade total", color: "bg-gradient-to-br from-violet-500 to-purple-600" }],
          tableCols: ["Data/Hora", "Produto", "Cliente", "Qtd", "Valor Total", "Forma Pagto"]
        };
      case "movimentacao":
        return {
          title: "Movimentação de Estoque", icon: ArrowUpDown,
          kpis: [{ label: "Entradas", value: "1.240", sub: "Unidades este mês", color: "bg-gradient-to-br from-emerald-500 to-teal-500" }, { label: "Saídas", value: "890", sub: "Vendas + interno", color: "bg-gradient-to-br from-rose-500 to-red-600" }, { label: "Ajustes", value: "12", sub: "Perdas/Quebras", color: "bg-gradient-to-br from-amber-500 to-orange-600" }],
          tableCols: ["Data", "Tipo", "Produto", "Qtd", "Motivo", "Responsável"]
        };
      case "posicao":
        return {
          title: "Posição de Estoque", icon: Layers,
          kpis: [{ label: "Almoxarifado", value: "65%", sub: "Capacidade ocupada", color: "bg-gradient-to-br from-blue-500 to-indigo-600" }, { label: "Recepção", value: "15%", sub: "Vitrine", color: "bg-gradient-to-br from-pink-500 to-rose-500" }, { label: "Salões", value: "20%", sub: "Giro rápido", color: "bg-gradient-to-br from-amber-500 to-orange-500" }],
          tableCols: ["Local", "Nº Itens", "Valor Atual", "Responsável", "Status"]
        };
      case "inventario":
        return {
          title: "Inventário (Contagem)", icon: ClipboardList,
          kpis: [{ label: "Último", value: "12/03", sub: "Inventário geral", color: "bg-gradient-to-br from-zinc-700 to-zinc-900" }, { label: "Discrepância", value: "1.2%", sub: "Margem aceitável", color: "bg-gradient-to-br from-emerald-500 to-teal-500" }, { label: "Próximo", value: "30 Dias", sub: "Contagem rotativa", color: "bg-gradient-to-br from-sky-500 to-blue-600" }],
          tableCols: ["Data Ref", "Tipo", "Produtos", "Ajustes", "Responsável", "Status"]
        };
      case "saida_auto":
        return {
          title: "Saída Automatizada", icon: CornerDownRight,
          kpis: [{ label: "Gatilhos", value: "14", sub: "Regras ativas", color: "bg-gradient-to-br from-violet-500 to-purple-600" }, { label: "Economia", value: "12h", sub: "Tempo poupado/mês", color: "bg-gradient-to-br from-emerald-500 to-teal-500" }, { label: "Erros", value: "0", sub: "Falhas de dedução", color: "bg-gradient-to-br from-zinc-400 to-zinc-500" }],
          tableCols: ["Regra", "Condição", "Ação", "Última Execução", "Status"]
        };
      case "ranking":
        return {
          title: "Ranking (Curva ABC)", icon: TrendingUp,
          kpis: [{ label: "Curva A", value: "20%", sub: "80% da receita", color: "bg-gradient-to-br from-emerald-500 to-teal-500" }, { label: "Hot", value: "15", sub: "Giro Rápido", color: "bg-gradient-to-br from-rose-500 to-red-500" }, { label: "Morto", value: "3", sub: "Analisar", color: "bg-gradient-to-br from-amber-500 to-orange-500" }],
          tableCols: ["Posição", "Produto", "Qtd Vendida", "Receita Gerada", "Margem", "Classificação"]
        };
      default:
        return null;
    }
  }, [activeSubModule]);

  if (!config) return null;
  const Icon = config.icon || Box;

  return (
    <div className="space-y-4 sm:space-y-6 mt-4 sm:mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Icon className="text-amber-500" size={24} />
            {config.title}
          </h2>
          <p className="text-xs font-bold text-zinc-400 mt-1">
            Gestão integrada para o módulo de {config.title.toLowerCase()}.
          </p>
        </div>
        <button className="flex px-4 py-2.5 bg-gradient-to-r from-zinc-900 to-black hover:from-black hover:to-zinc-900 text-white rounded-xl font-bold text-xs shadow-sm items-center gap-1.5 transition-all shadow-zinc-900/10 active:scale-95">
          <Plus size={14} /> <span className="hidden sm:inline">Cadastrar Novo</span><span className="sm:hidden">Novo</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {config.kpis.map((kpi, i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl border border-zinc-100 bg-white p-3 sm:p-5 shadow-sm group hover:shadow-md transition-all">
            <div className={cn("absolute top-0 left-0 right-0 h-1", kpi.color)} />
            <p className="text-[8px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate">{kpi.label}</p>
            <p className="text-xl sm:text-3xl font-black text-zinc-900 mt-0.5 sm:mt-1 tracking-tight truncate">{kpi.value}</p>
            <p className="text-[8px] sm:text-[9px] font-bold text-zinc-400 mt-0.5 truncate">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl sm:rounded-[24px] border border-zinc-200 shadow-sm overflow-hidden flex flex-col min-h-[350px]">
        <div className="p-3 sm:p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder={`Buscar em ${config.title.toLowerCase()}...`}
              className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs font-bold bg-white border border-zinc-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 outline-none transition-all shadow-sm"
            />
          </div>
          <button className="hidden sm:flex p-2.5 bg-white border border-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-600 transition-colors shadow-sm ms-2">
            <FileText size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr>
                {config.tableCols.map((c, i) => (
                  <th key={i} className="py-3.5 px-4 text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/80">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={config.tableCols.length} className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-[20px] bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4 shadow-inner">
                      <Icon size={28} className="text-zinc-300" />
                    </div>
                    <p className="text-sm font-black text-zinc-600 tracking-tight">Nenhum registro ativo</p>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1 max-w-[200px] leading-relaxed">
                      Quando você começar a cadastrar {config.title.toLowerCase()}, eles aparecerão aqui.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                          */
/* ══════════════════════════════════════════════════════════════════════════ */

export function ProductsTab({
  products,
  sectors,
  setIsProductModalOpen,
  setEditingProduct,
  setNewProduct,
  fetchProducts,
  fetchSectors,
  activeSubModule,
  setActiveSubModule,
}: ProductsTabProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [showCharts, setShowCharts] = useState(true);

  // ─── Derived metrics ───────────────────────────────────────────────────────
  const lowStockItems = useMemo(() => products.filter((p) => p.stock <= p.minStock && p.stock > 0), [products]);
  const outOfStockItems = useMemo(() => products.filter((p) => p.stock <= 0), [products]);
  const forSaleItems = useMemo(() => products.filter((p) => p.isForSale), [products]);
  const internalItems = useMemo(() => products.filter((p) => !p.isForSale), [products]);
  const criticalCount = lowStockItems.length + outOfStockItems.length;

  const totalStockValue = useMemo(
    () => products.reduce((acc, p) => acc + Number(p.costPrice) * p.stock, 0),
    [products]
  );
  const totalSaleValue = useMemo(
    () => products.reduce((acc, p) => acc + Number(p.salePrice) * p.stock, 0),
    [products]
  );
  const potentialProfit = totalSaleValue - totalStockValue;

  // ─── Chart data ────────────────────────────────────────────────────────────
  const stockChartData = useMemo(
    () =>
      [...products]
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 8)
        .map((p) => ({
          name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
          stock: p.stock,
          min: p.minStock,
          status: getStockStatus(p),
        })),
    [products]
  );

  const pieData = useMemo(
    () => [
      { name: "Revenda", value: forSaleItems.length },
      { name: "Uso Interno", value: internalItems.length },
    ],
    [forSaleItems, internalItems]
  );

  // ─── Filtered & sorted list ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products;
    if (activeTab === "low") list = [...lowStockItems, ...outOfStockItems];
    else if (activeTab === "sale") list = forSaleItems;
    else if (activeTab === "internal") list = internalItems;
    else if (activeTab !== "all") {
      list = products.filter(p => p.sectorId === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = (a.name || "").localeCompare(b.name || ""); break;
        case "stock": cmp = a.stock - b.stock; break;
        case "price": cmp = Number(a.salePrice) - Number(b.salePrice); break;
        case "margin": cmp = (getMargin(a) || 0) - (getMargin(b) || 0); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [products, activeTab, search, lowStockItems, outOfStockItems, forSaleItems, internalItems, sortKey, sortAsc]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleDeleteProduct = async (id: string) => {
    if (confirm("Deseja realmente excluir este produto?")) {
      await apiFetch(`/api/products/${id}`, { method: "DELETE" });
      fetchProducts();
    }
  };

  const openNew = () => {
    setEditingProduct(null);
    setNewProduct({
      name: "",
      description: "",
      photo: "",
      costPrice: "",
      salePrice: "",
      stock: "0",
      minStock: "0",
      validUntil: "",
      code: "",
      isForSale: true,
      sectorId: "",
      metadata: {},
    });
    fetchSectors();
    setIsProductModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setNewProduct({
      ...p,
      costPrice: p.costPrice.toString(),
      salePrice: p.salePrice.toString(),
      stock: p.stock.toString(),
      minStock: p.minStock.toString(),
      validUntil: p.validUntil ? format(new Date(p.validUntil), "yyyy-MM-dd") : "",
      sectorId: p.sectorId || '',
      metadata: {},
    });
    fetchSectors();
    setIsProductModalOpen(true);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  // ─── Columns ───────────────────────────────────────────────────────────────
  const productColumns: Column<any>[] = useMemo(() => [
    {
      header: "Produto",
      render: (p: any) => (
        <div className="flex items-center gap-3.5">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 overflow-hidden border transition-transform duration-200 group-hover:scale-105",
            getStockStatus(p) === "out" ? "bg-red-50 border-red-200"
              : getStockStatus(p) === "low" ? "bg-amber-50 border-amber-200"
              : "bg-zinc-50 border-zinc-200"
          )}>
            {p.photo ? <img src={p.photo} className="w-full h-full object-cover" alt="" /> : (
              <span className={cn(
                "text-lg",
                getStockStatus(p) === "out" ? "text-red-400" : getStockStatus(p) === "low" ? "text-amber-400" : "text-zinc-300"
              )}>
                {p.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-zinc-800 tracking-tight truncate max-w-[180px]">{p.name}</p>
              <SectorBadge product={p} sectors={sectors} />
            </div>
            <p className="text-[10px] text-zinc-400 font-bold truncate max-w-[180px] mt-0.5">{p.description || "—"}</p>
          </div>
        </div>
      )
    },
    {
      header: "SKU",
      hideOnMobile: true,
      render: (p: any) => (
        <span className="px-2.5 py-1.5 bg-zinc-50 text-zinc-500 text-[10px] font-black rounded-lg tracking-widest uppercase border border-zinc-100">
          {p.code || "—"}
        </span>
      )
    },
    {
      header: "Estoque",
      render: (p: any) => {
        const s = getStockStatus(p);
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-base font-black tracking-tighter",
                s === "out" ? "text-red-500" : s === "low" ? "text-amber-500" : "text-zinc-900"
              )}>{p.stock}</span>
              <span className="text-[10px] font-bold text-zinc-400">{p.unit || "un"}</span>
            </div>
            <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className={cn(
                "h-full rounded-full transition-all duration-300",
                s === "out" ? "bg-red-500" : s === "low" ? "bg-amber-500" : "bg-emerald-500"
              )} style={{
                width: p.minStock > 0
                  ? `${Math.min(100, (p.stock / (p.minStock * 3)) * 100)}%`
                  : p.stock > 0 ? "100%" : "5%"
              }} />
            </div>
          </div>
        );
      }
    },
    {
      header: "Preços",
      hideOnMobile: true,
      render: (p: any) => (
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold text-zinc-400 flex items-center gap-1">
            Custo: <span className="text-zinc-500">{formatBRL(Number(p.costPrice))}</span>
          </p>
          <p className="text-sm font-black text-zinc-900 tracking-tight">
            {formatBRL(Number(p.salePrice))}
          </p>
        </div>
      )
    },
    {
      header: "Margem",
      hideOnMobile: true,
      render: (p: any) => {
        const m = getMargin(p);
        if (m === null) return <span className="text-zinc-300">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            {m >= 0 ? <TrendingUp size={12} className={m >= 30 ? "text-emerald-500" : "text-amber-500"} /> : <TrendingDown size={12} className="text-red-500" />}
            <span className={cn(
              "text-sm font-black tracking-tighter",
              m >= 30 ? "text-emerald-600" : m >= 0 ? "text-amber-500" : "text-red-500"
            )}>{m.toFixed(0)}%</span>
          </div>
        );
      }
    },
    {
      header: "Tipo",
      hideOnMobile: true,
      render: (p: any) => (
        <span className={cn(
          "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
          p.isForSale
            ? "bg-violet-50 text-violet-500 border-violet-100"
            : "bg-zinc-50 text-zinc-400 border-zinc-200"
        )}>
          {p.isForSale ? "Revenda" : "Interno"}
        </span>
      )
    },
    {
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      hideOnMobile: true,
      render: (p: any) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEdit(p)}
            className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-amber-500 hover:border-amber-200 hover:bg-amber-50 transition-all active:scale-95"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => handleDeleteProduct(p.id)}
            className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )
    }
  ], [sectors]);


  /* ══════════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                                   */
  /* ══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-4 sm:space-y-6 relative pb-20 sm:pb-0">

      {/* ── Page Header (mobile) ── */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Inventário</p>
            <h2 className="text-xl font-black text-zinc-900 tracking-tight mt-0.5">
              Produtos & Estoque
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-black px-2.5 py-1.5 rounded-xl border",
              criticalCount > 0
                ? "bg-red-50 text-red-500 border-red-200"
                : "bg-emerald-50 text-emerald-500 border-emerald-200"
            )}>
              {criticalCount > 0 ? `${criticalCount} alertas` : "Tudo OK"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sub-module Navigation (mobile only) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 sm:mb-2 -mx-4 px-4 sm:hidden">
        {[
          { key: "produtos", label: "Produtos" },
          { key: "fornecedores", label: "Fornecedores" },
          { key: "fabricantes", label: "Fabricantes" },
          { key: "venda", label: "Venda" },
          { key: "movimentacao", label: "Movimentação" },
          { key: "posicao", label: "Posição" },
          { key: "inventario", label: "Inventário" },
          { key: "saida_auto", label: "Saída Auto" },
          { key: "ranking", label: "Ranking" },
        ].map((sub) => (
          <button
            key={sub.key}
            onClick={() => setActiveSubModule(sub.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0",
              activeSubModule === sub.key
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
            )}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {activeSubModule === "produtos" ? (
        <>
          {/* ── KPI Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <KpiCard
          label="Cadastros"
          value={products.length}
          sub={`${forSaleItems.length} revenda · ${internalItems.length} interno`}
          icon={<Package size={20} />}
          gradient="bg-gradient-to-r from-amber-500 to-orange-500"
          delay={0}
        />
        <KpiCard
          label={criticalCount > 0 ? "Atenção" : "Saúde"}
          value={criticalCount > 0 ? criticalCount : "✓"}
          sub={criticalCount > 0
            ? `${outOfStockItems.length} zerado${outOfStockItems.length !== 1 ? "s" : ""} · ${lowStockItems.length} baixo${lowStockItems.length !== 1 ? "s" : ""}`
            : "Todos os produtos OK"}
          icon={criticalCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          gradient={criticalCount > 0 ? "bg-gradient-to-r from-red-500 to-rose-500" : "bg-gradient-to-r from-emerald-500 to-teal-500"}
          delay={0.05}
        />
        <KpiCard
          label="Valor em Estoque"
          value={formatBRL(totalStockValue)}
          sub="pelo preço de custo"
          icon={<DollarSign size={20} />}
          gradient="bg-gradient-to-r from-blue-500 to-indigo-500"
          delay={0.1}
        />
        <KpiCard
          label="Lucro Potencial"
          value={formatBRL(potentialProfit)}
          sub={`Receita: ${formatBRL(totalSaleValue)}`}
          icon={potentialProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          gradient={potentialProfit >= 0 ? "bg-gradient-to-r from-emerald-500 to-green-500" : "bg-gradient-to-r from-red-500 to-rose-500"}
          delay={0.15}
        />
      </div>


      {/* ── Charts (desktop only, collapsible) ── */}
      {products.length > 0 && (
        <div className="hidden sm:block">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 hover:text-zinc-600 transition-colors"
          >
            <BarChart3 size={12} />
            {showCharts ? "Ocultar gráficos" : "Mostrar gráficos"}
            <motion.div animate={{ rotate: showCharts ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={12} />
            </motion.div>
          </button>

          <AnimatePresence>
            {showCharts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Bar chart */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-1.5 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                      <div>
                        <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">
                          Nível de Estoque
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-bold">8 itens com menor quantidade</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stockChartData} barCategoryGap="30%">
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 9, fontWeight: 700, fill: "#a1a1aa" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fontWeight: 700, fill: "#a1a1aa" }}
                          axisLine={false}
                          tickLine={false}
                          width={28}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)", radius: 8 }} />
                        <Bar dataKey="stock" name="Estoque" radius={[6, 6, 0, 0]}>
                          {stockChartData.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.status === "out" ? "#ef4444"
                                  : entry.status === "low" ? "#f59e0b"
                                  : "#10b981"
                              }
                            />
                          ))}
                        </Bar>
                        <Bar dataKey="min" name="Mínimo" radius={[6, 6, 0, 0]} fill="#e4e4e7" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-3">
                      {[
                        { color: "#10b981", label: "OK" },
                        { color: "#f59e0b", label: "Baixo" },
                        { color: "#ef4444", label: "Zerado" },
                        { color: "#e4e4e7", label: "Mínimo" },
                      ].map((l) => (
                        <div key={l.label} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pie chart */}
                  <div className="hidden lg:flex bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 flex-col">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-1.5 h-6 bg-gradient-to-b from-violet-400 to-purple-500 rounded-full" />
                      <div>
                        <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Distribuição</h3>
                        <p className="text-[10px] text-zinc-400 font-bold">Revenda vs Interno</p>
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={170}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            <Cell fill="#8b5cf6" />
                            <Cell fill="#e4e4e7" />
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => (
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500" />
                          <span className="text-[10px] font-bold text-zinc-500">Revenda</span>
                        </div>
                        <span className="text-xs font-black text-zinc-700">{forSaleItems.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-zinc-200" />
                          <span className="text-[10px] font-bold text-zinc-500">Uso Interno</span>
                        </div>
                        <span className="text-xs font-black text-zinc-700">{internalItems.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}


      {/* ── Main Content Card ── */}
      <div className="bg-white rounded-2xl sm:rounded-[32px] border border-zinc-200 shadow-sm overflow-hidden">

        {/* ── Filters header ── */}
        <div className="p-3 sm:p-5 space-y-3">
          {/* Category tabs with horizontal scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {[
              { key: "all", label: "Todos", icon: <Layers size={12} />, count: products.length },
              { key: "low", label: "Crítico", icon: <AlertTriangle size={12} />, count: criticalCount },
              { key: "sale", label: "Revenda", icon: <ShoppingBag size={12} />, count: forSaleItems.length },
              { key: "internal", label: "Interno", icon: <Archive size={12} />, count: internalItems.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap shrink-0",
                  activeTab === tab.key
                    ? tab.key === "low" && criticalCount > 0
                      ? "bg-gradient-to-r from-red-500 to-rose-500 text-white border-transparent shadow-md shadow-red-500/20"
                      : "bg-zinc-900 text-white border-zinc-900 shadow-md shadow-zinc-900/10"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                {tab.icon}
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.label.slice(0, 4)}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[9px]",
                  activeTab === tab.key ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}

            {/* Sector tabs */}
            {sectors.map((s: any) => {
              const cnt = products.filter(p => p.sectorId === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                    activeTab === s.id
                      ? "text-white border-transparent shadow-md"
                      : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                  style={activeTab === s.id ? { backgroundColor: s.color, borderColor: s.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTab === s.id ? "white" : s.color }} />
                  {s.name}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-md text-[9px]",
                    activeTab === s.id ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                  )}>
                    {cnt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + Sort + New */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, SKU ou descrição..."
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 font-bold transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Sort button */}
            <button
              onClick={() => {
                const keys: SortKey[] = ["name", "stock", "price", "margin"];
                const idx = keys.indexOf(sortKey);
                if (!sortAsc) { setSortKey(keys[(idx + 1) % keys.length]); setSortAsc(true); }
                else setSortAsc(false);
              }}
              className="hidden sm:flex items-center gap-1 px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:border-zinc-300 transition-all shrink-0"
              title={`Ordenar por ${sortKey} ${sortAsc ? "↑" : "↓"}`}
            >
              <ArrowUpDown size={12} />
              <span className="hidden xl:inline">
                {sortKey === "name" ? "Nome" : sortKey === "stock" ? "Estoque" : sortKey === "price" ? "Preço" : "Margem"}
              </span>
              <span className="text-[8px]">{sortAsc ? "↑" : "↓"}</span>
            </button>

            {/* New product (desktop) */}
            <button
              onClick={openNew}
              className="hidden sm:flex px-4 py-2.5 bg-gradient-to-r from-zinc-900 to-zinc-800 hover:from-black hover:to-zinc-900 text-white rounded-xl font-bold text-xs shadow-sm items-center gap-1.5 transition-all shrink-0 active:scale-[0.97]"
            >
              <Plus size={14} /> Novo Produto
            </button>
          </div>
        </div>

        {/* ── Table / Card list ── */}
        <div className="border-t border-zinc-100">
          <GridTable
            data={filtered}
            columns={productColumns}
            keyExtractor={(p) => p.id}
            emptyMessage={
              <div className="py-16 flex flex-col items-center justify-center text-zinc-400">
                <div className="w-16 h-16 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4">
                  <Package size={28} className="opacity-30" />
                </div>
                <p className="text-sm font-black text-zinc-400">Nenhum produto encontrado</p>
                <p className="text-[10px] text-zinc-300 font-bold mt-1">
                  {search ? "Tente um termo diferente" : "Cadastre seu primeiro produto"}
                </p>
              </div>
            }
            renderMobileItem={(p) => (
              <ProductCard
                product={p}
                sectors={sectors}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDeleteProduct(p.id)}
              />
            )}
          />
        </div>

        {/* ── Table footer ── */}
        {filtered.length > 0 && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
            <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              {[
                { color: "bg-emerald-500", label: "OK", count: filtered.filter(p => p.stock > p.minStock).length },
                { color: "bg-amber-500", label: "Baixo", count: filtered.filter(p => p.stock <= p.minStock && p.stock > 0).length },
                { color: "bg-red-500", label: "Zero", count: filtered.filter(p => p.stock <= 0).length },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", s.color)} />
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    {s.count} {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
        </>
      ) : (
        <SubModuleView activeSubModule={activeSubModule} />
      )}

      {/* ── FAB Mobile — Novo Produto ── */}
      {activeSubModule === "produtos" && (
        <button
          onClick={openNew}
          className="sm:hidden fixed bottom-24 right-4 z-50 w-14 h-14 bg-gradient-to-br from-zinc-900 to-zinc-700 text-white rounded-2xl shadow-xl shadow-zinc-900/30 flex items-center justify-center transition-all active:scale-90 hover:shadow-2xl"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
