import React, { useMemo, useState } from "react";
import {
  Plus, Package, Edit2, Trash2, Clock,
  X, TrendingUp, Trophy, Hash, DollarSign, Layers,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "@/src/lib/api";

import {
  Button, IconButton,
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
  FilterLineSegmented, FilterLineViewToggle,
  ContentCard, SectionTitle, EmptyState,
  Badge,
  GridTable, Column,
  PageWrapper,
} from "@/src/components/ui";

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
  serviceId: string; serviceName: string;
  vezes: number; receita: number; ticketMedio: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ─── Ranking Pacotes ──────────────────────────────────────────────────────────

function RankingPacotesView({ packages }: { packages: any[] }) {
  const [ranking, setRanking] = React.useState<RankingItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    apiFetch("/api/comandas/ranking-servicos")
      .then(r => r.json())
      .then((data: any[]) => {
        const packageIds = new Set(packages.map(p => p.id));
        setRanking(
          (data || [])
            .filter(r => packageIds.has(r.serviceId))
            .map(r => ({
              serviceId: r.serviceId,
              serviceName: r.serviceName,
              vezes: Number(r.vezes || 0),
              receita: Number(r.receita || 0),
              ticketMedio: Number(r.ticketMedio || 0),
            }))
        );
      })
      .catch(() => setRanking([]))
      .finally(() => setLoading(false));
  }, [packages]);

  const totalVendas = ranking.reduce((s, r) => s + r.vezes, 0);
  const totalReceita = ranking.reduce((s, r) => s + r.receita, 0);

  return (
    <>
      <SectionTitle title="Ranking de Pacotes" description="Pacotes mais vendidos com base nas comandas pagas" icon={Trophy} divider />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard title="No Ranking" value={ranking.length} icon={Trophy} color="default" description="Com vendas" />
        <StatCard title="Total Vendas" value={totalVendas} icon={Hash} color="info" description="No histórico" />
        <StatCard title="Receita Total" value={fmt(totalReceita)} icon={TrendingUp} color="success" description="Gerada pelos pacotes" className="hidden sm:block" />
      </div>

      <ContentCard padding="none">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
        ) : ranking.length === 0 ? (
          <EmptyState icon={Trophy} title="Sem dados de ranking ainda"
            description="O ranking é calculado com base nos pacotes realizados em comandas fechadas."
            className="m-4" />
        ) : (
          <>
            {/* Pódio top 3 */}
            <div className="p-4 sm:p-5 border-b border-zinc-100">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Trophy size={11} className="text-amber-500" /> Pódio
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ranking.slice(0, 3).map((item, idx) => (
                  <div key={item.serviceId} className={cn(
                    "rounded-2xl p-4 border",
                    idx === 0 ? "bg-amber-50 border-amber-200" :
                    idx === 1 ? "bg-zinc-50 border-zinc-200" : "bg-orange-50/40 border-orange-100"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">#{idx + 1}</span>
                    </div>
                    <p className="text-sm font-black text-zinc-900 leading-tight mb-1">{item.serviceName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge color="default" size="sm">{item.vezes}x vendas</Badge>
                      <span className="text-xs font-black text-emerald-600">{fmt(item.receita)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabela completa */}
            <div className="hidden sm:grid grid-cols-[40px_32px_1fr_80px_100px_100px] gap-4 px-5 py-3 bg-zinc-50/80 border-b border-zinc-100">
              {["#", "", "Pacote", "Vendas", "Receita", "Ticket Médio"].map(h => (
                <span key={h} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-zinc-100">
              {ranking.map((item, idx) => (
                <div key={item.serviceId}>
                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[40px_32px_1fr_80px_100px_100px] gap-4 items-center px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                    <div className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black",
                      idx === 0 ? "bg-amber-100 text-amber-700" :
                      idx === 1 ? "bg-zinc-100 text-zinc-600" :
                      idx === 2 ? "bg-orange-100 text-orange-600" : "bg-zinc-50 text-zinc-400"
                    )}>{idx + 1}</div>
                    <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                      <Package size={14} className="text-zinc-400" />
                    </div>
                    <p className="text-sm font-black text-zinc-900 truncate">{item.serviceName}</p>
                    <p className="text-sm font-black text-zinc-700">{item.vezes}x</p>
                    <p className="text-sm font-black text-emerald-600">{fmt(item.receita)}</p>
                    <p className="text-sm font-black text-zinc-700">{fmt(item.ticketMedio)}</p>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden flex items-center gap-3 px-4 py-3.5">
                    <div className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0",
                      idx === 0 ? "bg-amber-100 text-amber-700" : idx === 1 ? "bg-zinc-100 text-zinc-600" : idx === 2 ? "bg-orange-100 text-orange-600" : "bg-zinc-50 text-zinc-400"
                    )}>{idx + 1}</div>
                    <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-zinc-400" />
                    </div>
                    <p className="text-sm font-black text-zinc-900 flex-1 truncate">{item.serviceName}</p>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-zinc-900">{item.vezes}x</p>
                      <p className="text-[10px] text-emerald-600 font-bold">{fmt(item.receita)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                {ranking.length} pacote{ranking.length !== 1 ? "s" : ""} no ranking
              </p>
            </div>
          </>
        )}
      </ContentCard>
    </>
  );
}

// ─── PackageCard (Grid) ───────────────────────────────────────────────────────

function PackageCard({ item, delay, onEdit, onDelete }: {
  item: any; delay: number; onEdit: () => void; onDelete: () => void;
}) {
  const finalPrice = (() => {
    const p = Number(item.price) || 0;
    const d = Number(item.discount) || 0;
    return item.discountType === "percentage" ? p * (1 - d / 100) : p - d;
  })();
  const hasDiscount = Number(item.discount) > 0;
  const serviceCount = item.packageServices?.length || 0;

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: "easeOut" }}
      className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all flex flex-col group relative overflow-hidden"
    >
      {/* Glow decorativo */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-violet-500/5 -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />

      {/* Header: ícone + preço */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-violet-100 transition-all duration-300 shrink-0">
          <Package size={22} className="text-violet-500" strokeWidth={1.5} />
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-zinc-900 leading-none">{fmt(finalPrice)}</p>
          {hasDiscount && <p className="text-[10px] text-zinc-400 line-through mt-0.5">{fmt(Number(item.price))}</p>}
          <div className="flex items-center justify-end gap-1 mt-1">
            <Clock size={10} className="text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-black">{item.duration} min</span>
          </div>
        </div>
      </div>

      {/* Nome + Descrição */}
      <div className="flex-1 mb-4 relative z-10">
        <h3 className="text-sm font-black text-zinc-900 group-hover:text-violet-600 transition-colors leading-tight mb-1">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-medium">{item.description}</p>
        )}
      </div>

      {/* Serviços incluídos */}
      {serviceCount > 0 && (
        <div className="mb-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100 relative z-10">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Inclui</p>
          <div className="flex flex-wrap gap-1">
            {item.packageServices.slice(0, 3).map((ps: any, i: number) => (
              <span key={i} className="text-[9px] font-bold bg-white text-zinc-600 px-2 py-0.5 rounded-lg border border-zinc-200">
                {ps.quantity}x {ps.service?.name || "—"}
              </span>
            ))}
            {serviceCount > 3 && (
              <span className="text-[9px] font-bold text-zinc-400 px-1.5 py-0.5">
                +{serviceCount - 3} mais
              </span>
            )}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-3 border-t border-zinc-100 relative z-10">
        <Button variant="outline" size="sm" iconLeft={<Edit2 size={11} />} onClick={onEdit} className="flex-1 justify-center">
          Editar
        </Button>
        <IconButton variant="ghost" size="sm" onClick={onDelete}
          className="text-zinc-400 hover:text-red-500 hover:bg-red-50 border border-zinc-200 hover:border-red-200">
          <Trash2 size={13} />
        </IconButton>
      </div>
    </motion.div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PackagesTab({
  services,
  activeSubModule,
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
  const totalServicos = onlyPackages.reduce((acc, p) => acc + (p.packageServices?.length || 0), 0);

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
      name: item.name, description: item.description || "",
      price: item.price.toString(), duration: item.duration.toString(),
      type: item.type, discount: (item.discount || 0).toString(),
      discountType: item.discountType || "value",
      includedServices: item.packageServices?.map((ps: any) => ({
        id: ps.serviceId, name: ps.service?.name || ps.serviceName || "", quantity: ps.quantity,
        price: Number(ps.service?.price ?? ps.servicePrice ?? 0),
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

  const sortOptions = [
    { value: "name",     label: "A–Z" },
    { value: "price",    label: "Maior preço" },
    { value: "duration", label: "Menor duração" },
  ] as { value: typeof sortBy; label: string }[];

  const listColumns: Column<any>[] = [
    {
      header: "Pacote",
      render: item => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <Package size={16} className="text-violet-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-900 truncate">{item.name}</p>
            {item.packageServices?.length > 0 && (
              <p className="text-[10px] text-zinc-400">
                {item.packageServices.length} serviço{item.packageServices.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Duração", hideOnMobile: true,
      render: item => (
        <span className="text-xs font-bold text-zinc-600 flex items-center gap-1.5">
          <Clock size={11} className="text-zinc-400" />{item.duration} min
        </span>
      ),
    },
    {
      header: "Preço",
      render: item => (
        <div>
          <span className="text-sm font-black text-zinc-900">{fmt(Number(item.price))}</span>
          {Number(item.discount) > 0 && (
            <p className="text-[9px] text-zinc-400 font-bold">
              desc: {item.discountType === "percentage" ? `${item.discount}%` : fmt(Number(item.discount))}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Serviços", hideOnMobile: true,
      render: item => (
        <Badge color="purple" size="sm">
          {item.packageServices?.length || 0} serviço{(item.packageServices?.length || 0) !== 1 ? "s" : ""}
        </Badge>
      ),
    },
    {
      header: "", className: "text-right", hideOnMobile: true,
      render: item => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <IconButton variant="ghost" size="sm" onClick={() => openEdit(item)}><Edit2 size={13} /></IconButton>
          <IconButton variant="ghost" size="sm" onClick={() => handleDeleteService(item.id)}
            className="hover:text-red-500 hover:bg-red-50"><Trash2 size={13} /></IconButton>
        </div>
      ),
    },
  ];

  // ─── Render Ranking ───────────────────────────────────────────────────────────

  if (activeSubModule === "ranking_pacotes") {
    return (
      <PageWrapper>
        <RankingPacotesView packages={onlyPackages} />
      </PageWrapper>
    );
  }

  // ─── Render Lista ─────────────────────────────────────────────────────────────

  return (
    <PageWrapper>
      <SectionTitle
        title="Pacotes"
        description="Crie pacotes combinando serviços para oferecer mais valor aos seus clientes"
        icon={Package}
        action={
          <Button iconLeft={<Plus size={14} />} onClick={openCreate}>
            <span className="hidden sm:inline">Criar Pacote</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        }
        divider
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard title="Total Pacotes" value={onlyPackages.length} icon={Package} color="purple" description="Cadastrados" />
        <StatCard title="Ticket Médio" value={fmt(ticketMedio)} icon={DollarSign} color="success" description="Média de preço" />
        <StatCard title="Duração Média" value={`${duracaoMedia} min`} icon={Clock} color="info" description="Tempo médio" />
        <StatCard title="Serviços Incluídos" value={totalServicos} icon={Layers} color="default" description="Total de itens" />
      </div>

      {/* Filtros */}
      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar pacote..." />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right" wrap={false}>
          <FilterLineSegmented
            value={sortBy}
            onChange={v => setSortBy(v as typeof sortBy)}
            options={sortOptions}
            size="sm"
          />
          <FilterLineViewToggle value={viewMode} onChange={setViewMode} gridValue="grid" listValue="list" />
        </FilterLineSection>
      </FilterLine>

      {/* Resultado do filtro ativo */}
      {search && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-zinc-500 font-bold">
            {filteredPackages.length} pacote{filteredPackages.length !== 1 ? "s" : ""} encontrado{filteredPackages.length !== 1 ? "s" : ""}
          </span>
          <button onClick={() => setSearch("")}
            className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 font-black">
            <X size={11} /> Limpar
          </button>
        </div>
      )}

      {/* Grid / Lista */}
      <AnimatePresence mode="wait">
        {filteredPackages.length === 0 ? (
          <ContentCard>
            <EmptyState icon={Package} title="Nenhum pacote encontrado"
              description={search
                ? "Tente ajustar a busca."
                : "Crie pacotes combinando serviços para oferecer mais valor aos seus clientes."
              }
              action={<Button iconLeft={<Plus size={14} />} onClick={openCreate} size="sm">Criar Pacote</Button>}
            />
          </ContentCard>
        ) : viewMode === "grid" ? (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredPackages.map((item, idx) => (
              <PackageCard key={item.id} item={item} delay={idx * 0.04}
                onEdit={() => openEdit(item)} onDelete={() => handleDeleteService(item.id)} />
            ))}
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ContentCard padding="none">
              <GridTable
                data={filteredPackages}
                columns={listColumns}
                keyExtractor={item => item.id}
                emptyMessage={<EmptyState icon={Package} title="Nenhum pacote" description="Tente ajustar os filtros." className="m-4" />}
                renderMobileItem={item => (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                        <Package size={14} className="text-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900">{item.name}</p>
                        <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Clock size={9} />{item.duration} min
                          {item.packageServices?.length > 0 && <> · {item.packageServices.length} serv.</>}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-zinc-900">{fmt(Number(item.price))}</span>
                  </div>
                )}
                renderMobileExpandedContent={item => (
                  <div className="flex gap-2 px-4 pb-3">
                    <Button variant="outline" size="sm" iconLeft={<Edit2 size={12} />} onClick={() => openEdit(item)} className="flex-1 justify-center">Editar</Button>
                    <Button variant="ghost" size="sm" iconLeft={<Trash2 size={12} />} onClick={() => handleDeleteService(item.id)} className="flex-1 justify-center text-red-500 hover:bg-red-50 border border-red-100">Excluir</Button>
                  </div>
                )}
                getMobileBorderClass={() => "border-violet-100"}
              />
              {filteredPackages.length > 0 && (
                <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {filteredPackages.length} pacote{filteredPackages.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </ContentCard>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
