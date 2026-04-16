import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  Plus, Package, Edit2, Trash2, Clock, LayoutGrid, List,
  X, ChevronDown, TrendingUp, Trophy, Hash,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { GridTable } from "@/src/components/ui/GridTable";
import { StatCard } from "@/src/components/ui/StatCard";
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch } from "@/src/components/ui/FilterLine";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "@/src/lib/api";

import { ADMIN_NAV_SECTIONS } from "../../../config/navigation";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PackagesTabProps {
  services: any[];
  activeSubModule: string;
  setActiveSubModule: (val: string) => void;
  setEditingService: (s: any) => void;
  setNewService: (s: any) => void;
  setIsServiceModalOpen: (b: boolean) => void;
  handleDeleteService: (id: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (val: "grid" | "list") => void;
}

interface RankingItem {
  serviceId: string;
  serviceName: string;
  vezes: number;
  receita: number;
  ticketMedio: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ─── Ranking Pacotes ──────────────────────────────────────────────────────────

function RankingPacotesView({ packages }: { packages: any[] }) {
  // Ranking calculado localmente a partir dos dados de comandas
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!packages.length) return;
    setLoading(true);
    apiFetch("/api/comandas/ranking-servicos")
      .then(r => r.json())
      .then((data: any[]) => {
        const packageIds = new Set(packages.map(p => p.id));
        const filtered = (data || [])
          .filter(r => packageIds.has(r.serviceId))
          .map(r => ({
            serviceId: r.serviceId,
            serviceName: r.serviceName,
            vezes: Number(r.vezes || 0),
            receita: Number(r.receita || 0),
            ticketMedio: Number(r.ticketMedio || 0),
          }));
        setRanking(filtered);
      })
      .catch(() => setRanking([]))
      .finally(() => setLoading(false));
  }, [packages]);

  const totalAtendimentos = ranking.reduce((s, r) => s + r.vezes, 0);
  const totalReceita = ranking.reduce((s, r) => s + r.receita, 0);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard title="Pacotes no Ranking" value={ranking.length} icon={Trophy} color="default" delay={0} description="Com atendimentos" />
        <StatCard title="Total Vendas" value={totalAtendimentos} icon={Hash} color="info" delay={0.05} description="No histórico" />
        <StatCard title="Receita Total" value={formatCurrency(totalReceita)} icon={TrendingUp} color="success" delay={0.1} description="Gerada pelos pacotes" />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-xs font-bold">Carregando ranking...</p>
          </div>
        </div>
      ) : ranking.length === 0 ? (
        <EmptyState
          title="Sem dados de ranking ainda"
          description="O ranking é calculado com base nos pacotes realizados em comandas fechadas."
          icon={Trophy}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {ranking.length >= 1 && (
            <div className="p-4 sm:p-5 border-b border-zinc-100">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Top pacotes</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {ranking.slice(0, 3).map((item, idx) => (
                  <div
                    key={item.serviceId}
                    className={cn(
                      "flex-1 min-w-[140px] rounded-2xl p-4 border",
                      idx === 0 ? "bg-amber-50 border-amber-200" :
                      idx === 1 ? "bg-zinc-50 border-zinc-200" :
                                  "bg-orange-50/40 border-orange-100"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">#{idx + 1}</span>
                    </div>
                    <p className="text-xs font-black text-zinc-900 leading-tight mb-2">{item.serviceName}</p>
                    <p className="text-sm font-black text-zinc-900">{item.vezes}x</p>
                    <p className="text-[10px] text-zinc-400 font-bold">{formatCurrency(item.receita)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="divide-y divide-zinc-50">
            {ranking.map((item, idx) => (
              <div key={item.serviceId} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-zinc-50/50 transition-colors">
                <div className={cn(
                  "w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0",
                  idx === 0 ? "bg-amber-100 text-amber-700" :
                  idx === 1 ? "bg-zinc-100 text-zinc-600" :
                  idx === 2 ? "bg-orange-100 text-orange-600" :
                              "bg-zinc-50 text-zinc-400"
                )}>
                  {idx + 1}
                </div>
                <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                  <Package size={14} className="text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-zinc-900 truncate">{item.serviceName}</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Vendas</p>
                    <p className="text-sm font-black text-zinc-900">{item.vezes}x</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Receita</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(item.receita)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest hidden sm:block">Ticket</p>
                    <p className="text-xs font-black text-zinc-700">{formatCurrency(item.ticketMedio)}</p>
                    <p className="text-[10px] text-zinc-400 sm:hidden">{item.vezes}x · {formatCurrency(item.receita)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PackagesTab({
  services,
  activeSubModule,
  setActiveSubModule,
  setEditingService,
  setNewService,
  setIsServiceModalOpen,
  handleDeleteService,
  viewMode,
  setViewMode,
}: PackagesTabProps) {
  const safeServices = Array.isArray(services) ? services : [];
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "duration">("name");

  useEffect(() => {
    if (!activeSubModule) setActiveSubModule("todos_pacotes");
  }, [activeSubModule, setActiveSubModule]);

  const navItem = ADMIN_NAV_SECTIONS.flatMap(s => s.items).find((i: any) => i.tab === "packages");
  const subItems = navItem?.subItems || [];
  const scrollRef = useRef<HTMLDivElement>(null);


  const onlyPackages = useMemo(() => safeServices.filter(s => s.type === "package"), [safeServices]);

  const filteredPackages = useMemo(() => {
    let list = onlyPackages;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "price")    return Number(b.price) - Number(a.price);
      if (sortBy === "duration") return Number(a.duration) - Number(b.duration);
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [onlyPackages, search, sortBy]);

  const ticketMedio = onlyPackages.length
    ? onlyPackages.reduce((a, s) => a + (Number(s.price) || 0), 0) / onlyPackages.length : 0;
  const duracaoMedia = onlyPackages.length
    ? Math.round(onlyPackages.reduce((a, s) => a + (Number(s.duration) || 0), 0) / onlyPackages.length) : 0;

  function openCreate() {
    setEditingService(null);
    setNewService({
      name: "", description: "", price: "", duration: "", type: "package",
      discount: "0", discountType: "value", includedServices: [],
      professionalIds: [], productsConsumed: [],
      commissionValue: 0, commissionType: "percentage", taxRate: 0,
    });
    setIsServiceModalOpen(true);
  }

  function openEdit(item: any) {
    setEditingService(item);
    setNewService({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      duration: item.duration.toString(),
      type: item.type,
      discount: (item.discount || 0).toString(),
      discountType: item.discountType || "value",
      includedServices: item.packageServices?.map((ps: any) => ({
        id: ps.serviceId, name: ps.service.name, quantity: ps.quantity,
      })) || [],
      professionalIds: item.professionalIds
        ? (typeof item.professionalIds === "string" ? JSON.parse(item.professionalIds) : item.professionalIds)
        : [],
      productsConsumed: item.serviceProducts?.map((sp: any) => ({
        id: sp.product.id, name: sp.product.name, quantity: sp.quantity,
        costPrice: sp.product.costPrice, stock: sp.product.stock,
      })) || [],
      commissionValue: item.commissionValue || 0,
      commissionType: item.commissionType || "percentage",
      taxRate: item.taxRate || 0,
    });
    setIsServiceModalOpen(true);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 pb-20 sm:pb-0">


      <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5">
        <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5">

          {/* Ranking */}
          {activeSubModule === "ranking_pacotes" && (
            <RankingPacotesView packages={onlyPackages} />
          )}

          {/* Lista de Pacotes */}
          {activeSubModule === "todos_pacotes" && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard title="Total Pacotes" value={onlyPackages.length} icon={Package} color="default" delay={0} description="Ativos" />
                <StatCard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={TrendingUp} color="success" delay={0.05} description="Média de preço" />
                <StatCard title="Duração Média" value={`${duracaoMedia} min`} icon={Clock} color="info" delay={0.1} description="Tempo médio" />
              </div>

              {/* Filtros */}
              <FilterLine>
                <FilterLineSection grow>
                  <FilterLineItem grow>
                    <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar pacote..." />
                  </FilterLineItem>
                  <FilterLineItem>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="appearance-none pl-3 pr-7 py-2 text-xs font-bold border border-zinc-200 rounded-xl bg-white text-zinc-700 outline-none focus:border-amber-400 transition-all cursor-pointer"
                      >
                        <option value="name">A–Z</option>
                        <option value="price">Maior preço</option>
                        <option value="duration">Menor duração</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                  </FilterLineItem>
                </FilterLineSection>

                <FilterLineSection align="right">
                  <div className="flex p-1 bg-zinc-100 rounded-xl shadow-inner shrink-0">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn("p-2 rounded-lg transition-all", viewMode === "grid" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn("p-2 rounded-lg transition-all", viewMode === "list" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
                    >
                      <List size={16} />
                    </button>
                  </div>
                  <Button onClick={openCreate} variant="primary" size="sm" iconLeft={<Plus size={14} />}>
                    <span className="hidden sm:inline">Criar Pacote</span>
                    <span className="sm:hidden">Novo</span>
                  </Button>
                </FilterLineSection>
              </FilterLine>

              {search && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
                  <span>{filteredPackages.length} pacote{filteredPackages.length !== 1 ? "s" : ""} encontrado{filteredPackages.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => setSearch("")} className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-bold">
                    <X size={12} /> Limpar
                  </button>
                </div>
              )}

              {/* Grid / Lista */}
              <AnimatePresence mode="wait">
                {filteredPackages.length === 0 ? (
                  <EmptyState
                    title="Nenhum pacote encontrado"
                    description={search
                      ? "Tente ajustar a busca."
                      : "Crie pacotes combinando serviços para oferecer mais valor aos seus clientes."
                    }
                    icon={Package}
                    action={
                      <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={openCreate}>
                        Criar Pacote
                      </Button>
                    }
                  />
                ) : viewMode === "grid" ? (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {filteredPackages.map((item, idx) => (
                      <PackageCard
                        key={item.id}
                        item={item}
                        delay={idx * 0.04}
                        onEdit={() => openEdit(item)}
                        onDelete={() => handleDeleteService(item.id)}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <GridTable
                      data={filteredPackages}
                      keyExtractor={item => item.id}
                      columns={[
                        {
                          header: "Pacote",
                          render: (item: any) => (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200 shrink-0">
                                <Package size={16} className="text-zinc-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-zinc-900 truncate">{item.name}</p>
                                {item.packageServices?.length > 0 && (
                                  <p className="text-[10px] text-zinc-400 truncate">
                                    {item.packageServices.length} serviço{item.packageServices.length !== 1 ? "s" : ""}
                                  </p>
                                )}
                              </div>
                            </div>
                          ),
                        },
                        {
                          header: "Duração",
                          hideOnMobile: true,
                          render: (item: any) => (
                            <span className="text-xs font-bold text-zinc-600 flex items-center gap-1">
                              <Clock size={11} className="text-zinc-400" /> {item.duration} min
                            </span>
                          ),
                        },
                        {
                          header: "Preço",
                          render: (item: any) => (
                            <span className="text-sm font-black text-zinc-900">{formatCurrency(Number(item.price))}</span>
                          ),
                        },
                        {
                          header: "Ações",
                          headerClassName: "text-right",
                          className: "text-right",
                          hideOnMobile: true,
                          render: (item: any) => (
                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openEdit(item)} className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-200">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteService(item.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ),
                        },
                      ]}
                      renderMobileItem={(item: any) => (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200 shrink-0">
                              <Package size={14} className="text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-zinc-900">{item.name}</p>
                              <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <Clock size={9} />{item.duration} min
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-black text-zinc-900">{formatCurrency(Number(item.price))}</span>
                        </div>
                      )}
                      renderMobileExpandedContent={(item: any) => (
                        <div className="flex gap-2 px-4 pb-3">
                          <button onClick={() => openEdit(item)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all">
                            <Edit2 size={12} /> Editar
                          </button>
                          <button onClick={() => handleDeleteService(item.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black border border-red-100 text-red-500 hover:bg-red-50/50 transition-all">
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      )}
                      getMobileBorderClass={() => "border-zinc-100"}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PackageCard (Grid) ───────────────────────────────────────────────────────

function PackageCard({ item, delay, onEdit, onDelete }: {
  item: any; delay: number; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: "easeOut" }}
      className="bg-white rounded-[24px] border border-zinc-200 p-5 shadow-sm hover:shadow-lg hover:border-zinc-300 transition-all flex flex-col group relative overflow-hidden"
    >
      {/* Ícone + Preço */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-50 transition-all duration-300 shrink-0">
          <Package size={22} className="text-zinc-400 group-hover:text-amber-500 transition-colors" strokeWidth={1.5} />
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-zinc-900">{formatCurrency(Number(item.price))}</p>
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <Clock size={10} className="text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-black">{item.duration} min</span>
          </div>
        </div>
      </div>

      {/* Nome + Descrição */}
      <div className="flex-1 mb-4">
        <h3 className="text-sm font-black text-zinc-900 group-hover:text-amber-600 transition-colors leading-tight mb-1.5">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-medium">
            {item.description}
          </p>
        )}
      </div>

      {/* Serviços incluídos */}
      {item.packageServices?.length > 0 && (
        <div className="mb-4 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Inclui</p>
          <div className="flex flex-wrap gap-1">
            {item.packageServices.slice(0, 4).map((ps: any, i: number) => (
              <span key={i} className="text-[9px] font-bold bg-white text-zinc-600 px-2 py-0.5 rounded-lg border border-zinc-200">
                {ps.quantity}x {ps.service?.name || "—"}
              </span>
            ))}
            {item.packageServices.length > 4 && (
              <span className="text-[9px] font-bold text-zinc-400 px-2 py-0.5">
                +{item.packageServices.length - 4} mais
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-3 border-t border-zinc-50">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 transition-all active:scale-95"
        >
          <Edit2 size={11} /> Editar
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black border border-red-50 text-red-400 hover:bg-red-50/50 hover:border-red-100 transition-all active:scale-95"
        >
          <Trash2 size={11} /> Excluir
        </button>
      </div>
    </motion.div>
  );
}
