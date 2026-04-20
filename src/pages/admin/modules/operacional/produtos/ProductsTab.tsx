import React, { useState, useMemo } from "react";
import {
  Package,
  Plus,
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
  Layers,
  X,
  ArrowUpDown,
  Truck,
  Factory,
  ClipboardList,
  CornerDownRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineSegmented,
  ContentCard, SectionTitle, StatGrid,
  EmptyState,
  Button, IconButton,
  Badge,
  GridTable, Column,
} from "@/src/components/ui";

import {
  FornecedoresView,
  FabricantesView,
  MovimentacaoView,
  PosicaoEstoqueView,
  InventarioView,
  VendaView,
  RankingView,
  SaidaAutoView,
} from "./submodules";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStockStatus(p: any): "out" | "low" | "ok" {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.minStock) return "low";
  return "ok";
}

function getMargin(p: any): number | null {
  if (Number(p.costPrice) <= 0) return null;
  return ((Number(p.salePrice) - Number(p.costPrice)) / Number(p.costPrice)) * 100;
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Sector Badge ─────────────────────────────────────────────────────────────
function SectorBadge({ product, sectors }: { product: any; sectors: any[] }) {
  const sector = product.sector || sectors.find((s: any) => s.id === product.sectorId);
  if (!sector) return null;
  return (
    <span
      className="text-[8px] font-black px-1.5 py-0.5 rounded-md border shrink-0"
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

// ─── Chart Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
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
};

// ─── Product Card (mobile) ────────────────────────────────────────────────────
function ProductCard({
  product, sectors, onEdit, onDelete,
}: { product: any; sectors: any[]; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const status = getStockStatus(product);
  const margin = getMargin(product);

  const cfg = {
    out: { label: "Sem Estoque", color: "text-red-500", bg: "bg-red-50", border: "border-red-200", bar: "bg-red-500", accent: "from-red-500 to-rose-500" },
    low: { label: "Baixo",      color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-500", accent: "from-amber-500 to-orange-500" },
    ok:  { label: "OK",         color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200", bar: "bg-emerald-500", accent: "from-emerald-500 to-teal-500" },
  }[status];

  return (
    <div className="space-y-0 -m-4">
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-zinc-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("relative w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 overflow-hidden border", cfg.bg, cfg.border)}>
          {product.photo
            ? <img src={product.photo} className="w-full h-full object-cover" alt="" />
            : <span className={cfg.color}>{product.name?.charAt(0)?.toUpperCase()}</span>
          }
          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white", cfg.bar)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-zinc-900 truncate leading-tight">{product.name}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-0.5">
              <Package size={9} className="opacity-50" />
              {product.stock} {product.unit || "un"}
            </span>
            <SectorBadge product={product} sectors={sectors} />
            <Badge color={product.isForSale ? "purple" : "default"} size="sm">
              {product.isForSale ? "Revenda" : "Interno"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-base font-black text-zinc-900">{formatBRL(Number(product.salePrice))}</p>
            {margin !== null && (
              <p className={cn("text-[9px] font-black", margin >= 30 ? "text-emerald-500" : margin >= 0 ? "text-amber-500" : "text-red-500")}>
                {margin >= 0 ? "+" : ""}{margin.toFixed(0)}%
              </p>
            )}
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-zinc-300" />
          </motion.div>
        </div>
      </div>

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
              <div className="grid grid-cols-3 gap-2">
                <div className={cn("rounded-xl p-2.5 border", cfg.bg, cfg.border)}>
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Estoque</p>
                  <p className={cn("text-lg font-black tracking-tight mt-0.5", cfg.color)}>{product.stock}</p>
                  <p className="text-[8px] text-zinc-400 font-bold">Mín: {product.minStock}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-2.5 border border-zinc-100">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Custo</p>
                  <p className="text-sm font-black text-zinc-700 tracking-tight mt-0.5">{formatBRL(Number(product.costPrice))}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-2.5 border border-emerald-100/50">
                  <p className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">Margem</p>
                  <p className={cn("text-sm font-black tracking-tight mt-0.5", margin !== null && margin >= 30 ? "text-emerald-600" : "text-amber-500")}>
                    {margin !== null ? `${margin.toFixed(0)}%` : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-bold text-zinc-400">Nível de estoque</span>
                  <span className={cn("font-black", cfg.color)}>{cfg.label}</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: product.minStock > 0 ? `${Math.min(100, (product.stock / (product.minStock * 3)) * 100)}%` : product.stock > 0 ? "100%" : "4%" }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={cn("h-full rounded-full bg-gradient-to-r", cfg.accent)}
                  />
                </div>
              </div>

              {(product.description || product.code) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {product.code && (
                    <span className="text-[9px] font-black text-zinc-500 bg-zinc-100 px-2 py-1 rounded-lg tracking-widest uppercase border border-zinc-200/50">
                      SKU: {product.code}
                    </span>
                  )}
                  {product.description && (
                    <span className="text-[10px] text-zinc-400 font-bold line-clamp-1">{product.description}</span>
                  )}
                </div>
              )}

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

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
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

  // ─── Metrics ──────────────────────────────────────────────────────────────
  const lowStockItems  = useMemo(() => products.filter(p => p.stock <= p.minStock && p.stock > 0), [products]);
  const outOfStockItems = useMemo(() => products.filter(p => p.stock <= 0), [products]);
  const forSaleItems   = useMemo(() => products.filter(p => p.isForSale), [products]);
  const internalItems  = useMemo(() => products.filter(p => !p.isForSale), [products]);
  const criticalCount  = lowStockItems.length + outOfStockItems.length;

  const totalStockValue = useMemo(() => products.reduce((acc, p) => acc + Number(p.costPrice) * p.stock, 0), [products]);
  const totalSaleValue  = useMemo(() => products.reduce((acc, p) => acc + Number(p.salePrice) * p.stock, 0), [products]);
  const potentialProfit = totalSaleValue - totalStockValue;

  // ─── Chart data ────────────────────────────────────────────────────────────
  const stockChartData = useMemo(
    () => [...products].sort((a, b) => a.stock - b.stock).slice(0, 8).map(p => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
      stock: p.stock, min: p.minStock, status: getStockStatus(p),
    })),
    [products]
  );

  const pieData = useMemo(() => [
    { name: "Revenda", value: forSaleItems.length },
    { name: "Uso Interno", value: internalItems.length },
  ], [forSaleItems, internalItems]);

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products;
    if (activeTab === "low")      list = [...lowStockItems, ...outOfStockItems];
    else if (activeTab === "sale")     list = forSaleItems;
    else if (activeTab === "internal") list = internalItems;
    else if (activeTab !== "all")      list = products.filter(p => p.sectorId === activeTab);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")   cmp = (a.name || "").localeCompare(b.name || "");
      if (sortKey === "stock")  cmp = a.stock - b.stock;
      if (sortKey === "price")  cmp = Number(a.salePrice) - Number(b.salePrice);
      if (sortKey === "margin") cmp = (getMargin(a) || 0) - (getMargin(b) || 0);
      return sortAsc ? cmp : -cmp;
    });
  }, [products, activeTab, search, lowStockItems, outOfStockItems, forSaleItems, internalItems, sortKey, sortAsc]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este produto?")) return;
    await apiFetch(`/api/products/${id}`, { method: "DELETE" });
    fetchProducts();
  };

  const openNew = () => {
    setEditingProduct(null);
    setNewProduct({ name: "", description: "", photo: "", brand: "", costPrice: "", salePrice: "", stock: "0", minStock: "0", validUntil: "", code: "", isForSale: true, showOnSite: false, sectorId: "", metadata: {} });
    fetchSectors();
    setIsProductModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    
    let parsedMetadata = {};
    if (typeof p.metadata === "string" && p.metadata.trim().startsWith("{")) {
      try { parsedMetadata = JSON.parse(p.metadata); } catch(e) {}
    } else if (typeof p.metadata === "object" && p.metadata !== null) {
      parsedMetadata = p.metadata;
    }

    setNewProduct({
      ...p,
      brand: p.brand || "",
      costPrice: p.costPrice.toString(),
      salePrice: p.salePrice.toString(),
      stock: p.stock.toString(),
      minStock: p.minStock.toString(),
      validUntil: p.validUntil ? format(new Date(p.validUntil), "yyyy-MM-dd") : "",
      sectorId: p.sectorId || "",
      isForSale: p.isForSale === 1 || p.isForSale === true,
      showOnSite: p.showOnSite === 1 || p.showOnSite === true,
      metadata: parsedMetadata
    });
    fetchSectors();
    setIsProductModalOpen(true);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  // ─── Table columns ────────────────────────────────────────────────────────
  const productColumns: Column<any>[] = useMemo(() => [
    {
      header: "Produto",
      render: (p: any) => (
        <div className="flex items-center gap-3.5">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 overflow-hidden border transition-transform duration-200 group-hover:scale-105",
            getStockStatus(p) === "out" ? "bg-red-50 border-red-200" : getStockStatus(p) === "low" ? "bg-amber-50 border-amber-200" : "bg-zinc-50 border-zinc-200"
          )}>
            {p.photo ? <img src={p.photo} className="w-full h-full object-cover" alt="" /> : (
              <span className={cn("text-lg", getStockStatus(p) === "out" ? "text-red-400" : getStockStatus(p) === "low" ? "text-amber-400" : "text-zinc-300")}>
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
      ),
    },
    {
      header: "SKU",
      hideOnMobile: true,
      render: (p: any) => (
        <span className="px-2.5 py-1.5 bg-zinc-50 text-zinc-500 text-[10px] font-black rounded-lg tracking-widest uppercase border border-zinc-100">
          {p.code || "—"}
        </span>
      ),
    },
    {
      header: "Estoque",
      render: (p: any) => {
        const s = getStockStatus(p);
        const pct = p.minStock > 0 ? Math.min(100, (p.stock / (p.minStock * 3)) * 100) : p.stock > 0 ? 100 : 5;
        return (
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-1">
              <span className={cn("text-base font-black tracking-tighter", s === "out" ? "text-red-500" : s === "low" ? "text-amber-500" : "text-zinc-900")}>{p.stock}</span>
              <span className="text-[10px] font-bold text-zinc-400">{p.unit || "un"}</span>
            </div>
            <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-300", s === "out" ? "bg-red-500" : s === "low" ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      header: "Preços",
      hideOnMobile: true,
      render: (p: any) => (
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold text-zinc-400">Custo: <span className="text-zinc-500">{formatBRL(Number(p.costPrice))}</span></p>
          <p className="text-sm font-black text-zinc-900 tracking-tight">{formatBRL(Number(p.salePrice))}</p>
        </div>
      ),
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
            <span className={cn("text-sm font-black tracking-tighter", m >= 30 ? "text-emerald-600" : m >= 0 ? "text-amber-500" : "text-red-500")}>{m.toFixed(0)}%</span>
          </div>
        );
      },
    },
    {
      header: "Tipo",
      hideOnMobile: true,
      render: (p: any) => (
        <Badge color={p.isForSale ? "purple" : "default"}>
          {p.isForSale ? "Revenda" : "Interno"}
        </Badge>
      ),
    },
    {
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      hideOnMobile: true,
      render: (p: any) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <IconButton variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit2 size={13} /></IconButton>
          <IconButton variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 size={13} /></IconButton>
        </div>
      ),
    },
  ], [sectors]);

  // ─── Sub-module navigation (mobile horizontal scroll) ─────────────────────
  const subModuleItems = [
    { key: "produtos",      label: "Produtos",     icon: Package },
    { key: "fornecedores",  label: "Fornecedores", icon: Truck },
    { key: "fabricantes",   label: "Fabricantes",  icon: Factory },
    { key: "venda",         label: "Venda",        icon: ShoppingBag },
    { key: "movimentacao",  label: "Movimentação", icon: ArrowUpDown },
    { key: "posicao",       label: "Posição",      icon: Layers },
    { key: "inventario",    label: "Inventário",   icon: ClipboardList },
    { key: "saida_auto",    label: "Saída Auto",   icon: CornerDownRight },
    { key: "ranking",       label: "Ranking",      icon: TrendingUp },
  ];

  /* ── Render Submodule ─────────────────────────────────────────────────────── */
  const renderSubModule = () => {
    switch (activeSubModule) {
      case "fornecedores": return <FornecedoresView />;
      case "fabricantes":  return <FabricantesView />;
      case "movimentacao": return <MovimentacaoView />;
      case "posicao":      return <PosicaoEstoqueView />;
      case "inventario":   return <InventarioView />;
      case "venda":        return <VendaView />;
      case "ranking":      return <RankingView />;
      case "saida_auto":   return <SaidaAutoView />;
      default:             return null;
    }
  };

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-4 sm:space-y-5 relative pb-20 sm:pb-0">

      {/* ── Mobile sub-module pills ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:hidden">
        {subModuleItems.map((sub) => {
          const Icon = sub.icon;
          return (
            <button
              key={sub.key}
              onClick={() => setActiveSubModule(sub.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0",
                activeSubModule === sub.key
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
              )}
            >
              <Icon size={11} />
              {sub.label}
            </button>
          );
        })}
      </div>

      {activeSubModule !== "produtos" ? (
        /* ── Sub-module view ── */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
          {renderSubModule()}
        </div>
      ) : (
        /* ── Products main view ── */
        <>
          {/* SectionTitle — mobile only */}
          <div className="sm:hidden">
            <SectionTitle
              title="Produtos & Estoque"
              description="Gerencie seus produtos"
              icon={Package}
              action={
                criticalCount > 0
                  ? <Badge color="danger" dot>{criticalCount} alertas</Badge>
                  : <Badge color="success" dot>Tudo OK</Badge>
              }
            />
          </div>

          {/* ── KPI Grid ── */}
          <StatGrid cols={4}>
            <StatCard
              title="Cadastros"
              value={products.length}
              icon={Package}
              description={`${forSaleItems.length} revenda · ${internalItems.length} interno`}
              delay={0}
            />
            <StatCard
              title={criticalCount > 0 ? "Atenção" : "Saúde do Estoque"}
              value={criticalCount > 0 ? criticalCount : "✓"}
              icon={criticalCount > 0 ? AlertTriangle : CheckCircle}
              color={criticalCount > 0 ? "danger" : "success"}
              description={criticalCount > 0
                ? `${outOfStockItems.length} zerado · ${lowStockItems.length} baixo`
                : "Todos os produtos OK"}
              delay={0.05}
            />
            <StatCard
              title="Valor em Estoque"
              value={formatBRL(totalStockValue)}
              icon={DollarSign}
              color="info"
              description="Pelo preço de custo"
              delay={0.1}
            />
            <StatCard
              title="Lucro Potencial"
              value={formatBRL(potentialProfit)}
              icon={potentialProfit >= 0 ? TrendingUp : TrendingDown}
              color={potentialProfit >= 0 ? "success" : "danger"}
              description={`Receita: ${formatBRL(totalSaleValue)}`}
              delay={0.15}
            />
          </StatGrid>

          {/* ── Charts (desktop, collapsible) ── */}
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-1">
                      {/* Bar chart */}
                      <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-100 shadow-sm p-6">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-1.5 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
                          <div>
                            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Nível de Estoque</h3>
                            <p className="text-[10px] text-zinc-400 font-bold">8 produtos com menor quantidade</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={stockChartData} barCategoryGap="30%">
                            <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: "#a1a1aa" }} axisLine={false} tickLine={false} width={28} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)", radius: 8 }} />
                            <Bar dataKey="stock" name="Estoque" radius={[6, 6, 0, 0]}>
                              {stockChartData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.status === "out" ? "#ef4444" : entry.status === "low" ? "#f59e0b" : "#10b981"} />
                              ))}
                            </Bar>
                            <Bar dataKey="min" name="Mínimo" radius={[6, 6, 0, 0]} fill="#e4e4e7" />
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="flex items-center gap-4 mt-3">
                          {[{ color: "#10b981", label: "OK" }, { color: "#f59e0b", label: "Baixo" }, { color: "#ef4444", label: "Zerado" }, { color: "#e4e4e7", label: "Mínimo" }].map(l => (
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
                              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                                <Cell fill="#8b5cf6" />
                                <Cell fill="#e4e4e7" />
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                              <Legend iconType="circle" iconSize={8} formatter={(value) => (
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{value}</span>
                              )} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-violet-500" /><span className="text-[10px] font-bold text-zinc-500">Revenda</span></div>
                            <span className="text-xs font-black text-zinc-700">{forSaleItems.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-200" /><span className="text-[10px] font-bold text-zinc-500">Uso Interno</span></div>
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

          {/* ── Main product table ── */}
          <ContentCard padding="none">
            {/* Filters */}
            <div className="p-3 sm:p-4 space-y-3 border-b border-zinc-100">
              {/* Category tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-1 px-1">
                {[
                  { key: "all",      label: "Todos",   count: products.length },
                  { key: "low",      label: "Crítico", count: criticalCount },
                  { key: "sale",     label: "Revenda", count: forSaleItems.length },
                  { key: "internal", label: "Interno", count: internalItems.length },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap shrink-0",
                      activeTab === tab.key
                        ? tab.key === "low" && criticalCount > 0
                          ? "bg-gradient-to-r from-red-500 to-rose-500 text-white border-transparent shadow-md shadow-red-500/20"
                          : "bg-zinc-900 text-white border-zinc-900 shadow-md shadow-zinc-900/10"
                        : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                    )}
                  >
                    {tab.label}
                    <span className={cn("px-1.5 py-0.5 rounded-md text-[9px]", activeTab === tab.key ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500")}>
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
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                        activeTab === s.id ? "text-white border-transparent shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                      )}
                      style={activeTab === s.id ? { backgroundColor: s.color, borderColor: s.color } : {}}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeTab === s.id ? "white" : s.color }} />
                      {s.name}
                      <span className={cn("px-1.5 py-0.5 rounded-md text-[9px]", activeTab === s.id ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500")}>
                        {cnt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search + Sort + New */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FilterLineSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por nome, SKU ou descrição..."
                    className="h-9"
                  />
                </div>

                {/* Sort dropdown */}
                <button
                  onClick={() => {
                    const keys: SortKey[] = ["name", "stock", "price", "margin"];
                    const idx = keys.indexOf(sortKey);
                    if (!sortAsc) { setSortKey(keys[(idx + 1) % keys.length]); setSortAsc(true); }
                    else setSortAsc(false);
                  }}
                  className="hidden sm:flex items-center gap-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:border-zinc-300 transition-all shrink-0 h-9"
                >
                  <ArrowUpDown size={12} />
                  <span className="hidden xl:inline">{sortKey === "name" ? "Nome" : sortKey === "stock" ? "Estoque" : sortKey === "price" ? "Preço" : "Margem"}</span>
                  <span className="text-[8px]">{sortAsc ? "↑" : "↓"}</span>
                </button>

                <Button iconLeft={<Plus size={14} />} onClick={openNew} size="sm" className="hidden sm:flex shrink-0">
                  Novo Produto
                </Button>
              </div>
            </div>

            {/* Table */}
            <GridTable
              data={filtered}
              columns={productColumns}
              keyExtractor={(p) => p.id}
              emptyMessage={
                <EmptyState
                  icon={Package}
                  title="Nenhum produto encontrado"
                  description={search ? "Tente um termo diferente." : "Cadastre seu primeiro produto."}
                  action={!search ? <Button iconLeft={<Plus size={14} />} onClick={openNew} size="sm">Novo Produto</Button> : undefined}
                  className="m-4"
                />
              }
              renderMobileItem={(p) => (
                <ProductCard product={p} sectors={sectors} onEdit={() => openEdit(p)} onDelete={() => handleDelete(p.id)} />
              )}
            />

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="px-4 sm:px-5 py-3 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between flex-wrap gap-2">
                <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-3 sm:gap-4">
                  {[
                    { color: "bg-emerald-500", label: "OK",   count: filtered.filter(p => p.stock > p.minStock).length },
                    { color: "bg-amber-500",   label: "Baixo",count: filtered.filter(p => p.stock <= p.minStock && p.stock > 0).length },
                    { color: "bg-red-500",     label: "Zero", count: filtered.filter(p => p.stock <= 0).length },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", s.color)} />
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{s.count} {s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ContentCard>
        </>
      )}

      {/* ── FAB Mobile ── */}
      {activeSubModule === "produtos" && (
        <button
          onClick={openNew}
          className="sm:hidden fixed bottom-24 right-4 z-50 w-14 h-14 bg-gradient-to-br from-zinc-900 to-zinc-700 text-white rounded-2xl shadow-xl shadow-zinc-900/30 flex items-center justify-center transition-all active:scale-90"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
