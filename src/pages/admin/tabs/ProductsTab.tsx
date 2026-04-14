import React, { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Zap,
  Edit2,
  Trash2,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart2,
  ShoppingBag,
  Archive,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/src/lib/utils";
import { apiFetch } from "@/src/lib/api";
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
}

type TabKey = "all" | "low" | "sale" | "internal" | string;

function SectorBadge({ product, sectors }: { product: any; sectors: any[] }) {
  const sector = product.sector || sectors.find((s: any) => s.id === product.sectorId);
  if (!sector) return null;
  return (
    <span
      className="text-[8px] font-black px-1.5 py-0.5 rounded-md border"
      style={{
        backgroundColor: sector.color + "20",
        color: sector.color,
        borderColor: sector.color + "40",
      }}
    >
      {sector.name}
    </span>
  );
}

const CHART_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#f43f5e", "#8b5cf6", "#06b6d4"];

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  badge?: React.ReactNode;
}) {
  const colors: any = {
    amber: { border: "border-amber-100 hover:border-amber-200", bg: "bg-amber-50 text-amber-500 group-hover:bg-amber-100", text: "text-amber-600" },
    red: { border: "border-red-100 hover:border-red-200", bg: "bg-red-50 text-red-500 group-hover:bg-red-100", text: "text-red-600" },
    blue: { border: "border-blue-100 hover:border-blue-200", bg: "bg-blue-50 text-blue-500 group-hover:bg-blue-100", text: "text-blue-600" },
    emerald: { border: "border-emerald-100 hover:border-emerald-200", bg: "bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100", text: "text-emerald-600" },
    zinc: { border: "border-zinc-100 hover:border-zinc-200", bg: "bg-zinc-50 text-zinc-500 group-hover:bg-zinc-100", text: "text-zinc-900" },
  };
  const c = accent && colors[accent] ? colors[accent] : colors.zinc;

  return (
    <div className={cn("bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm flex flex-col justify-between group transition-all", c.border)}>
      <div className="flex justify-between items-start mb-2 sm:mb-4">
        <div className={cn("p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl transition-colors", c.bg)}>
          {icon}
        </div>
        {badge}
      </div>
      <div>
        <p className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
        <p className={cn("text-lg sm:text-2xl font-black tracking-tighter", c.text)}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-zinc-100 rounded-2xl shadow-xl px-4 py-3">
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

export function ProductsTab({
  products,
  sectors,
  setIsProductModalOpen,
  setEditingProduct,
  setNewProduct,
  fetchProducts,
  fetchSectors,
}: ProductsTabProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  // ─── Derived metrics ───────────────────────────────────────────────────────
  const lowStockItems = useMemo(() => products.filter((p) => p.stock <= p.minStock && p.stock > 0), [products]);
  const outOfStockItems = useMemo(() => products.filter((p) => p.stock <= 0), [products]);
  const forSaleItems = useMemo(() => products.filter((p) => p.isForSale), [products]);
  const internalItems = useMemo(() => products.filter((p) => !p.isForSale), [products]);

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
          status: p.stock <= 0 ? "out" : p.stock <= p.minStock ? "low" : "ok",
        })),
    [products]
  );

  const pieData = useMemo(
    () => [
      { name: "No PDV", value: forSaleItems.length },
      { name: "Uso Interno", value: internalItems.length },
    ],
    [forSaleItems, internalItems]
  );

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products;
    if (activeTab === "low") list = [...lowStockItems, ...outOfStockItems];
    else if (activeTab === "sale") list = forSaleItems;
    else if (activeTab === "internal") list = internalItems;
    else if (activeTab !== "all") {
      // Tab dinâmica = sectorId
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
    return list;
  }, [products, activeTab, search, lowStockItems, outOfStockItems, forSaleItems, internalItems]);

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

  const criticalCount = lowStockItems.length + outOfStockItems.length;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 h-full bg-zinc-50/30">

      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Produtos & Estoque</h2>
          <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
            Inventário, PDV e controle de estoque
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-5 py-2.5 bg-zinc-900 text-white rounded-2xl hover:bg-black transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-zinc-900/10 shrink-0"
        >
          <Plus size={14} /> Novo Produto
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <StatCard
          icon={<Package size={20} />}
          label="Total de Itens"
          value={products.length}
          sub={<span className="hidden sm:inline">{`${forSaleItems.length} no PDV · ${internalItems.length} internos`}</span>}
          accent="amber"
        />
        <StatCard
          icon={criticalCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          label={criticalCount > 0 ? "Crítico" : "Saudável"}
          value={criticalCount}
          sub={
            <span className="hidden sm:inline">
              {criticalCount > 0
                ? `${outOfStockItems.length} zerados · ${lowStockItems.length} baixos`
                : "Todos os itens OK"}
            </span>
          }
          accent={criticalCount > 0 ? "red" : "emerald"}
          badge={
            criticalCount > 0 ? (
              <span className="text-[8px] sm:text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-widest border border-red-200">
                !
              </span>
            ) : undefined
          }
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Em Estoque"
          value={`R$ ${totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={<span className="hidden sm:inline">preço de custo</span>}
          accent="blue"
        />
        <StatCard
          icon={potentialProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          label="Lucro Previsto"
          value={`R$ ${potentialProfit.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={<span className="hidden sm:inline">{`PDV: R$ ${totalSaleValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}</span>}
          accent={potentialProfit >= 0 ? "emerald" : "red"}
        />
      </div>

      {/* ── Charts row ── */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Bar chart – lowest stock */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-zinc-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-2 h-6 bg-amber-500 rounded-full" />
              <div>
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">
                  Nível de Estoque
                </h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  8 itens com menor quantidade
                </p>
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
                        entry.status === "out"
                          ? "#ef4444"
                          : entry.status === "low"
                          ? "#f59e0b"
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

          {/* Pie chart – PDV vs Internal (HIDDEN ON MOBILE) */}
          <div className="hidden lg:flex bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-2 h-6 bg-emerald-500 rounded-full" />
              <div>
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-tight">Distribuição</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">PDV vs Interno</p>
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
                    <Cell fill="#f59e0b" />
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
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-bold text-zinc-500">No PDV</span>
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
      )}

      {/* ── Table card ── */}
      <div className="bg-white rounded-[32px] border border-zinc-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Table header */}
        <div className="px-6 py-5 border-b border-zinc-50 bg-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-amber-500 rounded-full" />
              <div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Inventário & PDV</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                  {filtered.length} de {products.length} produtos
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou SKU..."
                className="text-xs font-bold bg-zinc-50 border border-zinc-200/60 rounded-2xl pl-10 pr-4 py-3.5 w-full outline-none focus:ring-4 focus:ring-amber-500/10 focus:bg-white focus:border-amber-300 transition-all"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1 no-scrollbar">
            {/* Abas fixas */}
            {[
              { key: "all", label: "Todos", icon: <Package size={14} />, count: products.length },
              { key: "low", label: "Est. Crítico", icon: <AlertTriangle size={14} />, count: criticalCount },
              { key: "sale", label: "No PDV", icon: <Zap size={14} />, count: forSaleItems.length },
              { key: "internal", label: "Uso Interno", icon: <Archive size={14} />, count: internalItems.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                  activeTab === tab.key
                    ? tab.key === "low" && criticalCount > 0
                      ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20"
                      : "bg-zinc-900 text-white border-zinc-900 shadow-md shadow-zinc-900/10"
                    : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
                )}
              >
                {tab.icon}
                {tab.label}
                <span className={cn("px-1.5 py-0.5 rounded-md text-[9px]", activeTab === tab.key ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500")}>
                  {tab.count}
                </span>
              </button>
            ))}

            {/* Abas dinâmicas de setor */}
            {sectors.map((s: any) => {
              const cnt = products.filter(p => p.sectorId === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                    activeTab === s.id
                      ? "text-white border-transparent shadow-md"
                      : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"
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
        </div>

        {/* Table */}
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-zinc-50/70 sticky top-0 z-10">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Código / SKU</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Estoque</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Preços (R$)</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Margem</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((p: any) => {
                const stockStatus = p.stock <= 0 ? "out" : p.stock <= p.minStock ? "low" : "ok";
                const margin = p.costPrice > 0 ? (((Number(p.salePrice) - Number(p.costPrice)) / Number(p.costPrice)) * 100).toFixed(0) : null;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/80 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300 font-black text-lg group-hover:bg-zinc-100">
                          {p.photo ? <img src={p.photo} className="w-full h-full rounded-2xl object-cover" /> : p.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-zinc-800 tracking-tight truncate max-w-[140px]">{p.name}</p>
                            <SectorBadge product={p} sectors={sectors} />
                          </div>
                          <p className="text-[10px] text-zinc-400 font-bold truncate max-w-[160px] mt-0.5">{p.description || "Sem descrição"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-2.5 py-1.5 bg-zinc-100 text-zinc-500 text-[10px] font-black rounded-xl tracking-widest uppercase border border-zinc-200/50">{p.code || "S/ SKU"}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline gap-1">
                          <span className={cn("text-base font-black tracking-tighter", stockStatus === "out" ? "text-red-500" : stockStatus === "low" ? "text-amber-500" : "text-zinc-900")}>{p.stock}</span>
                          <span className="text-[10px] font-bold text-zinc-400">{p.unit || "un"}</span>
                        </div>
                        <div className="w-20 h-1 bg-zinc-100 rounded-full"><div className={cn("h-full rounded-full transition-all", stockStatus === "out" ? "bg-red-500 w-full" : stockStatus === "low" ? "bg-amber-500 w-1/2" : "bg-emerald-500 w-full")} /></div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Custo: R$ {Number(p.costPrice).toFixed(2)}</p>
                      <p className="text-[13px] font-black text-emerald-600 leading-none tracking-tighter">Venda: R$ {Number(p.salePrice).toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-5">
                      {margin !== null ? <span className={cn("text-sm font-black tracking-tighter", Number(margin) >= 30 ? "text-emerald-600" : "text-amber-500")}>{margin}%</span> : "—"}
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", p.isForSale ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-zinc-100 text-zinc-400 border-zinc-200")}>{p.isForSale ? "No PDV" : "Interno"}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-amber-500 transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">Nenhum produto encontrado</div>
          ) : (
            filtered.map((p: any) => {
              const stockStatus = p.stock <= 0 ? "out" : p.stock <= p.minStock ? "low" : "ok";
              const margin = p.costPrice > 0 ? (((Number(p.salePrice) - Number(p.costPrice)) / Number(p.costPrice)) * 100).toFixed(0) : null;
              return (
                <div key={p.id} className="p-4 bg-white active:bg-zinc-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300 font-black text-xl shrink-0">
                      {p.photo ? <img src={p.photo} className="w-full h-full rounded-2xl object-cover" /> : p.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-[13px] font-black text-zinc-900 truncate tracking-tight">{p.name}</h4>
                        <SectorBadge product={p} sectors={sectors} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">{p.code || "Sem SKU"}</span>
                        <span className={cn("px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border", p.isForSale ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-zinc-50 text-zinc-400 border-zinc-200")}>{p.isForSale ? "PDV" : "Uso Interno"}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-100">
                          <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Estoque</p>
                          <div className="flex items-baseline gap-1">
                            <span className={cn("text-sm font-black tracking-tighter", stockStatus === "out" ? "text-red-500" : stockStatus === "low" ? "text-amber-500" : "text-zinc-900")}>{p.stock}</span>
                            <span className="text-[9px] font-bold text-zinc-400">{p.unit || "un"}</span>
                          </div>
                        </div>
                        <div className="bg-emerald-50/50 rounded-xl p-2 border border-emerald-100/50">
                          <p className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Venda</p>
                          <p className="text-sm font-black text-emerald-600 tracking-tighter leading-none">R$ {Number(p.salePrice).toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Custo</span>
                            <span className="text-[10px] font-bold text-zinc-600">R$ {Number(p.costPrice).toFixed(2)}</span>
                          </div>
                          <div className="w-px h-5 bg-zinc-100" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Margem</span>
                            <span className={cn("text-[10px] font-black", Number(margin) >= 30 ? "text-emerald-500" : "text-amber-500")}>{margin}%</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="p-2 bg-zinc-100 text-zinc-500 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all"><Edit2 size={13}/></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 bg-zinc-100 text-zinc-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><Trash2 size={13}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-zinc-50 bg-zinc-50/30 flex items-center justify-between">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {filtered.length} produto{filtered.length !== 1 ? "s" : ""} exibido{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  {filtered.filter((p) => p.stock > p.minStock).length} OK
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  {filtered.filter((p) => p.stock <= p.minStock && p.stock > 0).length} Baixo
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  {filtered.filter((p) => p.stock <= 0).length} Zerado
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
