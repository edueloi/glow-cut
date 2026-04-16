import React, { useState, useMemo } from "react";
import {
  Plus, Check, TrendingUp, Trash2, Edit2, Search, BookOpen,
  Scissors, Package, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { Modal, ModalFooter } from "@/src/components/ui/Modal";
import { Input, Textarea, Select } from "@/src/components/ui/Input";
import { Badge } from "@/src/components/ui/Badge";
import {
  SERVICE_CATALOG, searchCatalog, type CatalogCategory,
} from "../../../modules/operacional/servicos/serviceCatalog";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ServiceModalProps {
  isServiceModalOpen: boolean;
  setIsServiceModalOpen: (v: boolean) => void;
  editingService: any;
  setEditingService: (v: any) => void;
  newService: any;
  setNewService: (v: any) => void;
  professionals: any[];
  products: any[];
  handleCreateService: () => void;
  handleAddServiceToPackage: (serviceId: string) => void;
  calcPackagePrice: (services: any[]) => string;
  services: any[];
}

// ─── Modal de Serviço Individual ─────────────────────────────────────────────

export function ServiceModal({
  isServiceModalOpen,
  setIsServiceModalOpen,
  editingService,
  setEditingService,
  newService,
  setNewService,
  professionals,
  products,
  handleCreateService,
  handleAddServiceToPackage,
  calcPackagePrice,
  services,
}: ServiceModalProps) {

  // Abas do modal de serviço individual
  const [activeTab, setActiveTab] = useState<"info" | "controle" | "profissionais">("info");
  // Catalog
  const [showCatalog, setShowCatalog]         = useState(!editingService && newService?.type === "service");
  const [catalogSearch, setCatalogSearch]     = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string | null>(null);
  const [catalogExpanded, setCatalogExpanded] = useState<string | null>(null);

  // Catálogo — resultados
  const catalogResults = useMemo(() => {
    if (catalogSearch.trim()) return searchCatalog(catalogSearch);
    return null;
  }, [catalogSearch]);

  const currentCatalogData: CatalogCategory[] = useMemo(() => {
    if (catalogCategory) return SERVICE_CATALOG.filter(c => c.category === catalogCategory);
    return SERVICE_CATALOG;
  }, [catalogCategory]);

  function applyCatalogService(svc: { name: string; duration: number; price: number }) {
    setNewService((prev: any) => ({
      ...prev,
      name: svc.name,
      price: svc.price.toString(),
      duration: svc.duration.toString(),
    }));
    setShowCatalog(false);
    setActiveTab("info");
  }

  const isNew = !editingService;
  const finalPrice = (() => {
    const p = parseFloat(newService.price) || 0;
    const d = parseFloat(newService.discount) || 0;
    return newService.discountType === "percentage" ? p * (1 - d / 100) : p - d;
  })();

  // Controladoria
  const productCost = (newService.productsConsumed || []).reduce(
    (acc: number, p: any) => acc + ((Number(p.costPrice) || 0) * (Number(p.quantity) || 1)), 0
  );
  const price = parseFloat(newService.price) || 0;
  const taxCost = price * ((newService.taxRate || 0) / 100);
  const commCost = newService.commissionType === "percentage"
    ? price * ((newService.commissionValue || 0) / 100)
    : Number(newService.commissionValue) || 0;
  const netProfit = price - productCost - taxCost - commCost;
  const margin = price > 0 ? (netProfit / price) * 100 : 0;

  const TABS = [
    { key: "info" as const, label: "Informações" },
    { key: "profissionais" as const, label: "Profissionais" },
    { key: "controle" as const, label: "Custos" },
  ];

  // ─── SERVICE MODAL ───────────────────────────────────────────────────────────

  return (
    <>
      {/* ── SERVIÇO INDIVIDUAL ── */}
      <Modal
        isOpen={isServiceModalOpen && newService.type === "service"}
        onClose={() => { setIsServiceModalOpen(false); setEditingService(null); setShowCatalog(false); }}
        title={editingService ? "Editar Serviço" : "Novo Serviço"}
        size="md"
        mobileStyle="bottom-sheet"
        footer={
          showCatalog ? (
            <ModalFooter>
              <Button variant="outline" size="sm" onClick={() => setShowCatalog(false)}>
                Criar do zero
              </Button>
            </ModalFooter>
          ) : (
            <ModalFooter>
              <Button variant="outline" size="sm" onClick={() => { setIsServiceModalOpen(false); setEditingService(null); }}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                iconLeft={editingService ? <Edit2 size={14} /> : <Plus size={14} />}
                onClick={handleCreateService}
                disabled={!newService.name || !newService.price}
              >
                {editingService ? "Salvar Alterações" : "Cadastrar Serviço"}
              </Button>
            </ModalFooter>
          )
        }
      >
        {/* ── CATALOG PICKER ── */}
        {showCatalog && isNew ? (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
              <BookOpen size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-800">Catálogo de Serviços</p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  Escolha um serviço do catálogo para preencher os dados automaticamente, ou crie do zero.
                </p>
              </div>
            </div>

            {/* Busca */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar no catálogo..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs font-bold bg-white border border-zinc-200 rounded-xl focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 outline-none transition-all"
              />
              {catalogSearch && (
                <button onClick={() => setCatalogSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Resultados de busca */}
            {catalogResults ? (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {catalogResults.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-6 font-medium">Nenhum serviço encontrado para "{catalogSearch}"</p>
                ) : (
                  catalogResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => applyCatalogService(r.service)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-zinc-100 bg-zinc-50 hover:bg-amber-50 hover:border-amber-200 transition-all text-left"
                    >
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{r.service.name}</p>
                        <p className="text-[10px] text-zinc-400">{r.icon} {r.category} · {r.service.duration} min</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs font-black text-zinc-700">
                          R$ {r.service.price.toFixed(0)}
                        </p>
                        <p className="text-[9px] text-zinc-400">sugerido</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              /* Categorias */
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
                {/* Filtro de categoria */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setCatalogCategory(null)}
                    className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black border whitespace-nowrap transition-all shrink-0",
                      !catalogCategory ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-zinc-200 text-zinc-500"
                    )}
                  >
                    Todos
                  </button>
                  {SERVICE_CATALOG.map(c => (
                    <button
                      key={c.category}
                      onClick={() => setCatalogCategory(c.category)}
                      className={cn("px-2.5 py-1 rounded-lg text-[10px] font-black border whitespace-nowrap transition-all shrink-0",
                        catalogCategory === c.category ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-zinc-200 text-zinc-500"
                      )}
                    >
                      {c.icon} {c.category}
                    </button>
                  ))}
                </div>

                {/* Acordeão de categorias */}
                {currentCatalogData.map(cat => (
                  <div key={cat.category} className="border border-zinc-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setCatalogExpanded(v => v === cat.category ? null : cat.category)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs font-black text-zinc-800">{cat.category}</span>
                        <span className="text-[10px] text-zinc-400 bg-zinc-200 px-1.5 py-0.5 rounded-full font-bold">
                          {cat.services.length}
                        </span>
                      </div>
                      {catalogExpanded === cat.category
                        ? <ChevronUp size={14} className="text-zinc-400" />
                        : <ChevronDown size={14} className="text-zinc-400" />
                      }
                    </button>
                    {catalogExpanded === cat.category && (
                      <div className="divide-y divide-zinc-50">
                        {cat.services.map(svc => (
                          <button
                            key={svc.name}
                            onClick={() => applyCatalogService(svc)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-amber-50 hover:border-l-2 hover:border-amber-400 transition-all text-left"
                          >
                            <div>
                              <p className="text-xs font-bold text-zinc-800">{svc.name}</p>
                              <p className="text-[10px] text-zinc-400">{svc.duration} min</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span className="text-xs font-black text-zinc-600">R$ {svc.price.toFixed(0)}</span>
                              <div className="w-5 h-5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                                <Plus size={10} className="text-amber-600" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── FORM DE SERVIÇO ── */
          <div className="space-y-0">
            {/* Botão catálogo (apenas criação) */}
            {isNew && (
              <button
                onClick={() => setShowCatalog(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all"
              >
                <BookOpen size={14} />
                Escolher do catálogo de serviços
              </button>
            )}

            {/* Abas */}
            <div className="flex border-b border-zinc-100 mb-5 gap-0 -mx-0">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all border-b-2",
                    activeTab === tab.key
                      ? "border-amber-500 text-amber-600"
                      : "border-transparent text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ABA: Informações */}
            {activeTab === "info" && (
              <div className="space-y-4">
                <Input
                  label="Nome do Serviço"
                  autoFocus
                  placeholder="Ex: Corte Degradê"
                  value={newService.name}
                  onChange={e => setNewService({ ...newService, name: e.target.value })}
                />

                <Textarea
                  label="Descrição (opcional)"
                  placeholder="O que este serviço inclui..."
                  rows={2}
                  value={newService.description}
                  onChange={e => setNewService({ ...newService, description: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Preço (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">R$</span>
                      <input
                        type="number" min="0" step="0.01"
                        className="w-full text-sm pl-8 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 transition-all"
                        placeholder="0,00"
                        value={newService.price}
                        onChange={e => setNewService({ ...newService, price: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Duração (min)</label>
                    <div className="relative">
                      <input
                        type="number" min="5" step="5"
                        className="w-full text-sm px-3 py-2.5 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 transition-all text-center"
                        placeholder="30"
                        value={newService.duration}
                        onChange={e => setNewService({ ...newService, duration: e.target.value })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 text-[10px] font-bold pointer-events-none">min</span>
                    </div>
                  </div>
                </div>

                {/* Desconto */}
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Preço Final</p>
                    <p className="text-lg font-black text-zinc-900 leading-tight">
                      R$ {finalPrice.toFixed(2)}
                    </p>
                    {parseFloat(newService.discount) > 0 && (
                      <p className="text-[9px] text-zinc-400 line-through">R$ {parseFloat(newService.price || "0").toFixed(2)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex rounded-lg overflow-hidden border border-zinc-200 h-7">
                      {(["value", "percentage"] as const).map(dt => (
                        <button
                          key={dt}
                          onClick={() => setNewService({ ...newService, discountType: dt })}
                          className={cn("px-2 text-[9px] font-black transition-all",
                            newService.discountType === dt ? "bg-zinc-800 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"
                          )}
                        >{dt === "value" ? "R$" : "%"}</button>
                      ))}
                    </div>
                    <input
                      type="number" min="0"
                      className="w-14 h-7 text-xs px-2 bg-white border border-zinc-200 rounded-lg text-center font-bold outline-none focus:border-amber-400 transition-all"
                      placeholder="0"
                      value={newService.discount}
                      onChange={e => setNewService({ ...newService, discount: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ABA: Profissionais */}
            {activeTab === "profissionais" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setNewService({ ...newService, professionalIds: [] })}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all",
                    (newService.professionalIds || []).length === 0
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    (newService.professionalIds || []).length === 0 ? "bg-emerald-500 border-emerald-500" : "border-zinc-300"
                  )}>
                    {(newService.professionalIds || []).length === 0 && <Check className="text-white" size={8} strokeWidth={4} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-800">Todos os Profissionais</p>
                    <p className="text-[9px] text-zinc-400">Qualquer membro da equipe pode realizar</p>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  {professionals.filter((p: any) => p.isActive !== false).map((p: any) => {
                    const isSelected = (newService.professionalIds || []).includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const ids: string[] = newService.professionalIds || [];
                          setNewService({
                            ...newService,
                            professionalIds: isSelected ? ids.filter((id: string) => id !== p.id) : [...ids, p.id],
                          });
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all",
                          isSelected ? "bg-amber-50 border-amber-200" : "bg-white border-zinc-200 hover:border-zinc-300"
                        )}
                      >
                        <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all",
                          isSelected ? "bg-amber-500 text-white" : "bg-zinc-100 border border-zinc-200"
                        )}>
                          {isSelected && <Check size={10} strokeWidth={4} />}
                        </div>
                        <div className="min-w-0">
                          <p className={cn("text-xs font-bold truncate", isSelected ? "text-amber-800" : "text-zinc-600")}>
                            {p.name.split(" ")[0]}
                          </p>
                          {p.role && <p className="text-[9px] text-zinc-400 truncate">{p.role}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {professionals.filter((p: any) => p.isActive !== false).length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-4 font-medium">Nenhum profissional cadastrado.</p>
                )}
              </div>
            )}

            {/* ABA: Custos (Controladoria) */}
            {activeTab === "controle" && (
              <div className="space-y-5">
                {/* Produtos consumidos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Produtos utilizados</p>
                    {productCost > 0 && (
                      <span className="text-[10px] font-bold text-zinc-500">
                        Custo: <strong className="text-red-500">R$ {productCost.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>

                  {(newService.productsConsumed || []).map((pc: any, idx: number) => (
                    <div key={idx} className="flex gap-2 items-center bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-700 truncate">{pc.name}</p>
                        <p className="text-[9px] text-zinc-400">Estoque: {pc.stock} · Custo: R$ {Number(pc.costPrice || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number" min="0.01" step="0.01"
                          className="w-16 py-1.5 px-2 text-xs text-center border border-zinc-200 bg-white rounded-lg outline-none focus:border-amber-400"
                          value={pc.quantity}
                          onChange={e => {
                            const prods = [...newService.productsConsumed];
                            prods[idx].quantity = parseFloat(e.target.value) || 0;
                            setNewService({ ...newService, productsConsumed: prods });
                          }}
                        />
                        <span className="text-[9px] text-zinc-400 font-bold">und</span>
                        <button
                          type="button"
                          onClick={() => setNewService({
                            ...newService,
                            productsConsumed: (newService.productsConsumed || []).filter((_: any, i: number) => i !== idx),
                          })}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <select
                    className="w-full text-xs p-2.5 bg-white border border-dashed border-zinc-300 hover:border-amber-400 rounded-xl text-zinc-500 font-bold outline-none appearance-none transition-all cursor-pointer"
                    onChange={e => {
                      const pId = e.target.value;
                      if (!pId) return;
                      const prod = products.find((p: any) => p.id === pId);
                      if (prod && !(newService.productsConsumed || []).find((x: any) => x.id === pId)) {
                        setNewService({
                          ...newService,
                          productsConsumed: [
                            ...(newService.productsConsumed || []),
                            { id: prod.id, name: prod.name, quantity: 1, costPrice: prod.costPrice, stock: prod.stock },
                          ],
                        });
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">+ Adicionar produto do estoque...</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Estoque: {p.stock}) — Custo: R$ {Number(p.costPrice || 0).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comissão + Taxas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Comissão Profissional</label>
                    <div className="flex bg-white border border-zinc-200 rounded-xl p-1 h-[42px]">
                      <input
                        type="number"
                        className="flex-1 w-full px-2 text-sm bg-transparent border-none outline-none font-bold"
                        placeholder="0"
                        value={newService.commissionValue}
                        onChange={e => setNewService({ ...newService, commissionValue: parseFloat(e.target.value) || 0 })}
                      />
                      <div className="flex bg-zinc-50 rounded-lg p-0.5 border border-zinc-100">
                        {(["percentage", "value"] as const).map(ct => (
                          <button
                            key={ct}
                            type="button"
                            onClick={() => setNewService({ ...newService, commissionType: ct })}
                            className={cn("px-2 text-[10px] font-black rounded-md transition-all h-full",
                              newService.commissionType === ct ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"
                            )}
                          >{ct === "percentage" ? "%" : "R$"}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Taxas / Impostos (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full text-sm px-3 h-[42px] bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
                        placeholder="0"
                        value={newService.taxRate}
                        onChange={e => setNewService({ ...newService, taxRate: parseFloat(e.target.value) || 0 })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-300">%</span>
                    </div>
                  </div>
                </div>

                {/* Simulador */}
                <div className="bg-zinc-900 rounded-2xl p-4 shadow-lg">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Simulador de Lucro</p>
                    <Badge color="success" size="sm">Ficha de Custo</Badge>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {[
                      { label: "Valor do Serviço", value: `R$ ${price.toFixed(2)}`, color: "text-white" },
                      { label: "Custo de Produtos", value: `− R$ ${productCost.toFixed(2)}`, color: "text-rose-400" },
                      { label: "Taxas / Operação", value: `− R$ ${taxCost.toFixed(2)}`, color: "text-rose-400" },
                      { label: "Comissão Prof.", value: `− R$ ${commCost.toFixed(2)}`, color: "text-rose-400" },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between text-[10px] font-bold">
                        <span className="text-zinc-500">{row.label}</span>
                        <span className={row.color}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Lucro Líquido</p>
                      <p className={cn("text-xl font-black mt-0.5", netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        R$ {netProfit.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Margem</p>
                      <p className={cn("text-sm font-black mt-0.5", netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── PACOTE ── */}
      <Modal
        isOpen={isServiceModalOpen && newService.type === "package"}
        onClose={() => { setIsServiceModalOpen(false); setEditingService(null); }}
        title={editingService ? "Editar Pacote" : "Novo Pacote"}
        size="md"
        mobileStyle="bottom-sheet"
        footer={
          <ModalFooter>
            <Button variant="outline" size="sm" onClick={() => { setIsServiceModalOpen(false); setEditingService(null); }}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={editingService ? <Edit2 size={14} /> : <Plus size={14} />}
              onClick={handleCreateService}
              disabled={!newService.name || newService.includedServices.length === 0}
            >
              {editingService ? "Salvar Alterações" : "Cadastrar Pacote"}
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome do Pacote"
              autoFocus
              placeholder="Ex: Combo Barba & Cabelo"
              value={newService.name}
              onChange={e => setNewService({ ...newService, name: e.target.value })}
            />
            <Input
              label="Descrição (opcional)"
              placeholder="Breve descrição..."
              value={newService.description}
              onChange={e => setNewService({ ...newService, description: e.target.value })}
            />
          </div>

          {/* Serviços do pacote */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Serviços incluídos</label>
            <div className="relative">
              <select
                className="w-full text-xs px-3 py-2.5 bg-white border border-dashed border-zinc-300 hover:border-amber-400 rounded-xl text-zinc-700 outline-none transition-all appearance-none cursor-pointer font-bold"
                onChange={e => handleAddServiceToPackage(e.target.value)}
                value=""
              >
                <option value="" disabled>+ Adicionar serviço ao pacote</option>
                {services.filter(s => s.type === "service").map(s => (
                  <option key={s.id} value={s.id}>{s.name} — R$ {parseFloat(s.price).toFixed(2)}</option>
                ))}
              </select>
              <Plus size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            <div className="rounded-xl border border-zinc-100 bg-zinc-50/40 min-h-[80px] overflow-hidden">
              {newService.includedServices.length === 0 ? (
                <div className="flex items-center justify-center h-[80px]">
                  <p className="text-[10px] text-zinc-300 font-medium">Nenhum serviço adicionado</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {newService.includedServices.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0 mr-2">
                        <p className="text-xs font-bold text-zinc-800 truncate">{s.name}</p>
                        <p className="text-[9px] text-zinc-400">R$ {((s.price || 0) * (s.quantity || 1)).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden h-6 bg-white">
                          <button
                            onClick={() => {
                              const val = Math.max(1, (s.quantity || 1) - 1);
                              setNewService((prev: any) => {
                                const ni = prev.includedServices.map((item: any) => item.id === s.id ? { ...item, quantity: val } : item);
                                return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                              });
                            }}
                            className="w-6 text-zinc-500 hover:bg-zinc-100 text-xs font-bold flex items-center justify-center"
                          >−</button>
                          <span className="w-6 text-center text-[10px] font-black text-zinc-800 border-x border-zinc-200">{s.quantity}</span>
                          <button
                            onClick={() => {
                              const val = (s.quantity || 1) + 1;
                              setNewService((prev: any) => {
                                const ni = prev.includedServices.map((item: any) => item.id === s.id ? { ...item, quantity: val } : item);
                                return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                              });
                            }}
                            className="w-6 text-zinc-500 hover:bg-zinc-100 text-xs font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                        <button
                          onClick={() => setNewService((prev: any) => {
                            const ni = prev.includedServices.filter((item: any) => item.id !== s.id);
                            return { ...prev, includedServices: ni, price: calcPackagePrice(ni) };
                          })}
                          className="w-6 h-6 flex items-center justify-center text-zinc-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Duração + Desconto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Duração (min)</label>
              <input
                type="number" min="5" step="5"
                className="w-full text-sm px-2 py-2.5 bg-white border border-zinc-200 rounded-xl font-bold outline-none focus:border-amber-400 transition-all text-center"
                placeholder="—"
                value={newService.duration}
                onChange={e => setNewService({ ...newService, duration: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Desconto</label>
              <div className="flex items-center gap-1">
                <div className="flex rounded-lg overflow-hidden border border-zinc-200 h-[38px] shrink-0">
                  {(["value", "percentage"] as const).map(dt => (
                    <button key={dt} onClick={() => setNewService({ ...newService, discountType: dt })}
                      className={cn("px-2 text-[9px] font-black transition-all h-full",
                        newService.discountType === dt ? "bg-zinc-800 text-white" : "bg-white text-zinc-400"
                      )}
                    >{dt === "value" ? "R$" : "%"}</button>
                  ))}
                </div>
                <input
                  type="number" min="0"
                  className="flex-1 min-w-0 h-[38px] text-sm px-2 bg-white border border-zinc-200 rounded-lg text-center font-bold outline-none focus:border-amber-400 transition-all"
                  placeholder="0"
                  value={newService.discount}
                  onChange={e => setNewService({ ...newService, discount: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Preço final */}
          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <div>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Total dos serviços</p>
              <p className="text-xs text-amber-400 line-through">R$ {parseFloat(newService.price || "0").toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Preço Final</p>
              <p className="text-xl font-black text-amber-700">
                R$ {finalPrice.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Profissionais */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Profissionais</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNewService({ ...newService, professionalIds: [] })}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                  (newService.professionalIds || []).length === 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}
              >
                {(newService.professionalIds || []).length === 0 && <Check size={10} strokeWidth={3} />}
                Todos
              </button>
              {professionals.filter((p: any) => p.isActive !== false).map((p: any) => {
                const isSelected = (newService.professionalIds || []).includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      const ids: string[] = newService.professionalIds || [];
                      setNewService({
                        ...newService,
                        professionalIds: isSelected ? ids.filter((id: string) => id !== p.id) : [...ids, p.id],
                      });
                    }}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                      isSelected ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                    )}
                  >
                    {isSelected && <Check size={10} strokeWidth={3} />}
                    {p.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
