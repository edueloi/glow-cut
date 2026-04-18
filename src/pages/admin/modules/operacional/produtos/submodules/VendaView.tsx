import React, { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Plus, Package, DollarSign, TrendingUp, User, CreditCard, Banknote, QrCode, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiFetch } from "@/src/lib/api";
import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
  ContentCard, SectionTitle, EmptyState,
  Button, IconButton,
  Modal, ModalFooter,
  Input, Select,
  Badge,
  useToast,
} from "@/src/components/ui";

interface Product { id: string; name: string; salePrice: number; costPrice: number; stock: number; unit?: string; isForSale: boolean | number; }
interface SaleItem { productId: string; productName: string; qty: number; unitPrice: number; }
type PayMethod = "cash" | "pix" | "card" | "debit";

const PAY_LABELS: Record<PayMethod, { label: string; icon: React.ElementType }> = {
  cash:  { label: "Dinheiro", icon: Banknote },
  pix:   { label: "Pix",     icon: QrCode },
  card:  { label: "Crédito", icon: CreditCard },
  debit: { label: "Débito",  icon: CreditCard },
};

function formatBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function VendaModal({ isOpen, onClose, products, onSaved }: {
  isOpen: boolean; onClose: () => void; products: Product[]; onSaved: () => void;
}) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("pix");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) { setItems([]); setClientName(""); setPayMethod("pix"); setProductId(""); setQty("1"); }
  }, [isOpen]);

  const forSaleProducts = products.filter(p => p.isForSale === true || p.isForSale === 1);

  const addItem = () => {
    if (!productId) { toast.warning("Selecione um produto."); return; }
    const qtyNum = parseInt(qty) || 1;
    const product = forSaleProducts.find(p => p.id === productId);
    if (!product) return;
    if (product.stock < qtyNum) { toast.warning(`Estoque insuficiente. Disponível: ${product.stock}`); return; }
    setItems(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) return prev.map(i => i.productId === productId ? { ...i, qty: i.qty + qtyNum } : i);
      return [...prev, { productId, productName: product.name, qty: qtyNum, unitPrice: product.salePrice }];
    });
    setProductId(""); setQty("1");
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.productId !== id));
  const total = items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);

  const handleSell = async () => {
    if (items.length === 0) { toast.warning("Adicione pelo menos um produto."); return; }
    setSaving(true);
    try {
      for (const item of items) {
        await apiFetch("/api/inventory/sell", {
          method: "POST",
          body: JSON.stringify({ productId: item.productId, quantity: item.qty, clientName: clientName || undefined, paymentMethod: payMethod }),
        });
      }
      toast.success(`Venda de ${formatBRL(total)} registrada!`);
      onSaved(); onClose();
    } catch { toast.error("Erro ao registrar venda."); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Venda de Produto" size="lg"
      footer={
        <ModalFooter>
          <div className="flex-1">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total</p>
            <p className="text-xl font-black text-zinc-900">{formatBRL(total)}</p>
          </div>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSell} loading={saving} disabled={items.length === 0}>Finalizar Venda</Button>
        </ModalFooter>
      }
    >
      <div className="space-y-5">
        {/* Adicionar produto */}
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Adicionar produto</p>
          <Select
            value={productId}
            onChange={e => setProductId(e.target.value)}
            placeholder="Selecione um produto..."
            options={forSaleProducts.map(p => ({
              value: p.id,
              label: `${p.name} — ${formatBRL(p.salePrice)} (Estoque: ${p.stock})`,
              disabled: p.stock <= 0,
            }))}
          />
          <div className="flex gap-2">
            <Input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
              className="w-24 text-center" placeholder="Qtd" label="Quantidade" />
            <div className="flex items-end">
              <Button onClick={addItem} iconLeft={<Plus size={14} />}>Adicionar</Button>
            </div>
          </div>
        </div>

        {/* Itens */}
        {items.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Itens</p>
            {items.map(item => (
              <div key={item.productId} className="flex items-center gap-3 px-3 py-2.5 bg-white border border-zinc-200 rounded-xl">
                <Package size={14} className="text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-zinc-900 truncate">{item.productName}</p>
                  <p className="text-[10px] text-zinc-400 font-bold">{item.qty}x {formatBRL(item.unitPrice)}</p>
                </div>
                <p className="text-sm font-black text-zinc-900 shrink-0">{formatBRL(item.qty * item.unitPrice)}</p>
                <IconButton variant="ghost" size="xs" onClick={() => removeItem(item.productId)}><X size={12} /></IconButton>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Total</span>
              <span className="text-lg font-black text-zinc-900">{formatBRL(total)}</span>
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-2 text-zinc-300">
            <ShoppingBag size={28} />
            <p className="text-xs font-bold">Nenhum item adicionado</p>
          </div>
        )}

        {/* Cliente + Pagamento */}
        <div className="space-y-3">
          <Input label="Cliente (opcional)" value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="Nome do cliente" iconLeft={<User size={14} />} />

          <div className="space-y-1.5">
            <label className="ds-label">Forma de pagamento</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(PAY_LABELS) as PayMethod[]).map(method => {
                const cfg = PAY_LABELS[method];
                const Icon = cfg.icon;
                return (
                  <button key={method} type="button" onClick={() => setPayMethod(method)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                      payMethod === method
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300"
                    }`}>
                    <Icon size={14} />{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function VendaView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodData, movData] = await Promise.all([
        apiFetch("/api/products/").then(r => r.json()),
        apiFetch("/api/inventory/movements?limit=200").then(r => r.json()),
      ]);
      setProducts(Array.isArray(prodData) ? prodData : []);
      setMovements((Array.isArray(movData) ? movData : []).filter((m: any) => m.type === "venda"));
    } catch { toast.error("Erro ao carregar dados."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalVendido = movements.reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  const forSaleCount = products.filter(p => p.isForSale === true || p.isForSale === 1).length;
  const totalReceita = movements.reduce((acc: number, m: any) => {
    const prod = products.find(p => p.id === m.productId);
    return acc + (prod ? Math.abs(m.quantity) * prod.salePrice : 0);
  }, 0);

  const filteredMovements = movements.filter(m => {
    const q = search.toLowerCase();
    return m.productName?.toLowerCase().includes(q) || m.reason?.toLowerCase().includes(q);
  });

  return (
    <>
      <SectionTitle title="Vendas de Produtos" description="Registre e acompanhe as vendas avulsas de produtos" icon={ShoppingBag}
        action={<Button iconLeft={<Plus size={14} />} onClick={() => setModalOpen(true)}>Nova Venda</Button>} divider />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard title="Para venda" value={forSaleCount} icon={Package} description="Produtos disponíveis" />
        <StatCard title="Unidades vendidas" value={totalVendido} icon={TrendingUp} color="success" description="Total de itens" />
        <StatCard title="Receita estimada" value={formatBRL(totalReceita)} icon={DollarSign} color="info" description="Acumulado" className="hidden sm:block" />
      </div>

      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar venda por produto..." />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right">
          <Button iconLeft={<Plus size={14} />} onClick={() => setModalOpen(true)}>
            <span className="hidden sm:inline">Nova Venda</span><span className="sm:hidden">Vender</span>
          </Button>
        </FilterLineSection>
      </FilterLine>

      <ContentCard padding="none">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
        ) : filteredMovements.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Nenhuma venda registrada"
            description="Clique em Nova Venda para registrar a venda de um produto."
            action={<Button iconLeft={<Plus size={14} />} onClick={() => setModalOpen(true)} size="sm">Nova Venda</Button>}
            className="m-4" />
        ) : (
          <div className="divide-y divide-zinc-100">
            <div className="hidden sm:grid grid-cols-[1fr_80px_120px_100px_130px] gap-4 px-4 py-3 bg-zinc-50/80 border-b border-zinc-100">
              {["Produto", "Qtd", "Motivo", "Data/Hora", "Pagamento"].map(h => (
                <span key={h} className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{h}</span>
              ))}
            </div>

            {filteredMovements.map(m => {
              const prod  = products.find(p => p.id === m.productId);
              const total = prod ? Math.abs(m.quantity) * prod.salePrice : 0;
              return (
                <div key={m.id}>
                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[1fr_80px_120px_100px_130px] gap-4 items-center px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                        <ShoppingBag size={13} className="text-violet-500" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 truncate">{m.productName}</p>
                        <p className="text-[10px] text-zinc-400 font-bold">{formatBRL(total)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-zinc-700">{Math.abs(m.quantity)} <span className="text-[9px] text-zinc-400">{m.productUnit || "un"}</span></p>
                    <p className="text-[10px] font-bold text-zinc-500 truncate">{m.reason || "—"}</p>
                    <p className="text-[10px] font-bold text-zinc-400">{m.createdAt ? format(new Date(m.createdAt), "dd/MM/yy HH:mm", { locale: ptBR }) : "—"}</p>
                    <p className="text-[10px] font-bold text-zinc-500 capitalize">{m.reference || "—"}</p>
                  </div>

                  {/* Mobile */}
                  <div className="sm:hidden flex items-start gap-3 px-4 py-3.5">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                      <ShoppingBag size={16} className="text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-zinc-900 truncate">{m.productName}</p>
                        <p className="text-sm font-black text-zinc-900 shrink-0">{formatBRL(total)}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <Badge color="purple" size="sm">{Math.abs(m.quantity)} {m.productUnit || "un"}</Badge>
                        {m.reference && <span className="text-[10px] text-zinc-500 font-bold capitalize">{m.reference}</span>}
                        <span className="text-[10px] text-zinc-400 font-bold">{m.createdAt ? format(new Date(m.createdAt), "dd/MM HH:mm", { locale: ptBR }) : ""}</span>
                      </div>
                      {m.reason && <p className="text-[10px] text-zinc-400 font-bold mt-0.5 truncate">{m.reason}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredMovements.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{filteredMovements.length} venda{filteredMovements.length !== 1 ? "s" : ""}</p>
            <p className="text-xs font-black text-zinc-600">Receita: {formatBRL(totalReceita)}</p>
          </div>
        )}
      </ContentCard>

      <VendaModal isOpen={modalOpen} onClose={() => setModalOpen(false)} products={products} onSaved={load} />
    </>
  );
}
