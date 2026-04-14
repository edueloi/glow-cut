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
  return (
    <div
      className={cn(
        "bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between group transition-all",
        accent ? `border-${accent}-100 hover:border-${accent}-200` : "border-zinc-100 hover:border-zinc-200"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className={cn(
            "p-2.5 rounded-2xl transition-colors",
            accent ? `bg-${accent}-50 text-${accent}-500 group-hover:bg-${accent}-100` : "bg-zinc-50 text-zinc-500 group-hover:bg-zinc-100"
          )}
        >
          {icon}
        </div>
        {badge}
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
        <p className={cn("text-2xl font-black tracking-tighter", accent ? `text-${accent}-600` : "text-zinc-900")}>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <StatCard
          icon={<Package size={22} />}
          label="Total de Itens"
          value={products.length}
          sub={`${forSaleItems.length} no PDV · ${internalItems.length} internos`}
          accent="amber"
        />
        <StatCard
          icon={criticalCount > 0 ? <AlertTriangle size={22} /> : <CheckCircle size={22} />}
          label={criticalCount > 0 ? "Estoque Crítico" : "Estoque Saudável"}
          value={criticalCount}
          sub={
            criticalCount > 0
              ? `${outOfStockItems.length} zerados · ${lowStockItems.length} baixos`
              : "Todos os itens OK"
          }
          accent={criticalCount > 0 ? "red" : "emerald"}
          badge={
            criticalCount > 0 ? (
              <span className="text-[9px] font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full uppercase tracking-widest border border-red-200">
                Atenção
              </span>
            ) : undefined
          }
        />
        <StatCard
          icon={<DollarSign size={22} />}
          label="Valor em Estoque"
          value={`R$ ${totalStockValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub="preço de custo total"
          accent="blue"
        />
        <StatCard
          icon={potentialProfit >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          label="Lucro Potencial"
          value={`R$ ${potentialProfit.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub={`PDV: R$ ${totalSaleValue.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
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

          {/* Pie chart – PDV vs Internal */}
          <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 flex flex-col">
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
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="bg-zinc-50/70 sticky top-0 z-10">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                  Produto
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                  Código / SKU
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                  Estoque
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                  Preços (R$)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                  Margem
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                  Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 rounded-3xl bg-zinc-50 flex items-center justify-center text-zinc-200 mb-4 border-2 border-dashed border-zinc-100">
                        {search ? <Search size={36} /> : <Package size={36} />}
                      </div>
                      <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">
                        {search ? "Nenhum resultado encontrado" : "Nenhum produto aqui"}
                      </p>
                      {!search && products.length === 0 && (
                        <button
                          onClick={openNew}
                          className="mt-4 text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline"
                        >
                          + Adicionar primeiro produto
                        </button>
                      )}
                      {search && (
                        <button
                          onClick={() => setSearch("")}
                          className="mt-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:underline"
                        >
                          Limpar busca
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => {
                  const stockStatus = p.stock <= 0 ? "out" : p.stock <= p.minStock ? "low" : "ok";
                  const margin =
                    p.costPrice > 0
                      ? (((Number(p.salePrice) - Number(p.costPrice)) / Number(p.costPrice)) * 100).toFixed(0)
                      : null;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/80 transition-all group">
                      {/* Product */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3.5">
                          <div className="relative shrink-0">
                            {p.photo ? (
                              <img
                                src={p.photo}
                                className="w-12 h-12 rounded-2xl object-cover border border-zinc-100 shadow-sm"
                                alt={p.name}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-300 font-black text-lg group-hover:bg-zinc-100 transition-colors">
                                {p.name?.charAt(0)?.toUpperCase()}
                              </div>
                            )}
                            {stockStatus === "out" && (
                              <div className="absolute inset-0 bg-red-500/10 rounded-2xl flex items-center justify-center">
                                <XCircle size={14} className="text-red-500" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-black text-zinc-800 tracking-tight truncate max-w-[140px]">
                                {p.name}
                              </p>
                              <SectorBadge product={p} sectors={sectors} />
                            </div>
                            <p className="text-[10px] text-zinc-400 font-bold truncate max-w-[160px] mt-0.5">
                              {p.description || "Sem descrição"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-1.5 bg-zinc-100 text-zinc-500 text-[10px] font-black rounded-xl tracking-widest uppercase border border-zinc-200/50">
                          {p.code || "S/ SKU"}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-baseline gap-1">
                            <span
                              className={cn(
                                "text-base font-black tracking-tighter",
                                stockStatus === "out"
                                  ? "text-red-500"
                                  : stockStatus === "low"
                                  ? "text-amber-500"
                                  : "text-zinc-900"
                              )}
                            >
                              {p.stock - (p.reservedStock || 0)}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400">{p.unit || "un"} livre</span>
                            {p.reservedStock > 0 && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 ml-1">
                                {p.reservedStock} res.
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-zinc-300 ml-1">/ tot {p.stock}</span>
                          </div>
                          <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-700",
                                stockStatus === "out"
                                  ? "bg-red-500 w-full"
                                  : stockStatus === "low"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              )}
                              style={{
                                width: `${Math.min(100, (p.stock / (p.minStock * 4 || 10)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Prices */}
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest w-10">
                              Custo
                            </span>
                            <span className="text-[10px] font-bold text-zinc-500">
                              R$ {Number(p.costPrice).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest w-10">
                              Venda
                            </span>
                            <span className="text-sm font-black text-emerald-600 tracking-tighter">
                              R$ {Number(p.salePrice).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Margin */}
                      <td className="px-6 py-5">
                        {margin !== null ? (
                          <div className="flex flex-col gap-1">
                            <span
                              className={cn(
                                "text-sm font-black tracking-tighter",
                                Number(margin) >= 30
                                  ? "text-emerald-600"
                                  : Number(margin) >= 10
                                  ? "text-amber-500"
                                  : "text-red-500"
                              )}
                            >
                              {margin}%
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                              margem
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-300">—</span>
                        )}
                      </td>

                      {/* Sale status */}
                      <td className="px-6 py-5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all shadow-sm",
                            p.isForSale
                              ? "bg-amber-50 text-amber-600 border-amber-100"
                              : "bg-zinc-100 text-zinc-400 border-zinc-200"
                          )}
                        >
                          {p.isForSale ? (
                            <>
                              <Zap size={9} fill="currentColor" /> No PDV
                            </>
                          ) : (
                            <>
                              <Archive size={9} /> Interno
                            </>
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-amber-500 hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/10 transition-all active:scale-90"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-200 hover:shadow-lg hover:shadow-red-500/10 transition-all active:scale-90"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
