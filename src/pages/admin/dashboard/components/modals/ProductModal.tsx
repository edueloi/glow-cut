import React, { useMemo } from "react";
import { Package, Tag, DollarSign, Boxes, Eye } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import {
  Button, Modal, ModalFooter,
  Input, Textarea, Select,
  Switch, FormRow, Divider,
} from "@/src/components/ui";

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-zinc-400" />
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}

interface ProductModalProps {
  isProductModalOpen: boolean;
  setIsProductModalOpen: (v: boolean) => void;
  editingProduct: any;
  setEditingProduct: (v: any) => void;
  newProduct: any;
  setNewProduct: (v: any) => void;
  emptyProduct: any;
  handleCreateProduct: () => void;
  sectors: any[];
  fetchSectors: () => void;
  showNewSectorForm: boolean;
  setShowNewSectorForm: (v: boolean | ((v: boolean) => boolean)) => void;
  newSectorName: string;
  setNewSectorName: (v: string) => void;
  newSectorColor: string;
  setNewSectorColor: (v: string) => void;
}

export function ProductModal({
  isProductModalOpen,
  setIsProductModalOpen,
  editingProduct,
  setEditingProduct,
  newProduct,
  setNewProduct,
  emptyProduct,
  handleCreateProduct,
  sectors,
  fetchSectors,
  showNewSectorForm,
  setShowNewSectorForm,
  newSectorName,
  setNewSectorName,
  newSectorColor,
  setNewSectorColor,
}: ProductModalProps) {

  const margin = useMemo(() => {
    const cost = Number(newProduct.costPrice);
    const sale = Number(newProduct.salePrice);
    if (!cost || !sale || cost <= 0) return null;
    return (((sale - cost) / cost) * 100).toFixed(1);
  }, [newProduct.costPrice, newProduct.salePrice]);

  const handleClose = () => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
    setNewProduct(emptyProduct);
    setShowNewSectorForm(false);
    setNewSectorName("");
  };

  return (
    <Modal
      isOpen={isProductModalOpen}
      onClose={handleClose}
      title={editingProduct ? "Editar Produto" : "Novo Produto"}
      size="lg"
    >
      <div className="space-y-6">

        {/* ── Informações Básicas ── */}
        <SectionHeader icon={Package} label="Informações Básicas" />

        <Textarea
          label="Nome do Produto *"
          placeholder="Ex: Shampoo Premium 500ml"
          value={newProduct.name}
          onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
          wrapperClassName="resize-none"
        />

        <Textarea
          label="Descrição"
          placeholder="Detalhes ou observações adicionais sobre o produto..."
          value={newProduct.description || ""}
          onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
        />

        <FormRow cols={2}>
          <Input
            label="Código / SKU"
            placeholder="Ex: SHAM-001"
            value={newProduct.code || ""}
            onChange={e => setNewProduct({ ...newProduct, code: e.target.value.toUpperCase() })}
            iconLeft={<Tag size={15} />}
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="ds-label">Setor / Categoria</label>
              <button
                type="button"
                onClick={() => setShowNewSectorForm(v => !v)}
                className="text-[11px] font-black text-amber-600 hover:text-amber-700 transition-colors"
              >
                {showNewSectorForm ? "Cancelar" : "+ Novo"}
              </button>
            </div>

            {showNewSectorForm ? (
              <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={newSectorColor}
                    onChange={e => setNewSectorColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-zinc-200 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Nome do setor..."
                    value={newSectorName}
                    onChange={e => setNewSectorName(e.target.value)}
                    className="flex-1 min-w-0 text-sm px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:border-amber-400 font-bold"
                  />
                </div>
                <Button
                  size="sm"
                  fullWidth
                  onClick={async () => {
                    if (!newSectorName.trim()) return;
                    const res = await apiFetch("/api/sectors", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: newSectorName.trim(), color: newSectorColor }),
                    });
                    if (res.ok) {
                      const created = await res.json();
                      fetchSectors();
                      setNewProduct({ ...newProduct, sectorId: created.id });
                      setNewSectorName("");
                      setNewSectorColor("#6b7280");
                      setShowNewSectorForm(false);
                    }
                  }}
                >
                  Salvar Setor
                </Button>
              </div>
            ) : (
              <Select
                value={newProduct.sectorId || ""}
                onChange={e => setNewProduct({ ...newProduct, sectorId: e.target.value })}
                placeholder="Selecione ou clique em + Novo"
                options={sectors.map(s => ({ value: s.id, label: s.name }))}
              />
            )}
          </div>
        </FormRow>

        <Divider />

        {/* ── Precificação ── */}
        <SectionHeader icon={DollarSign} label="Precificação" />

        <FormRow cols={newProduct.isForSale ? 2 : 1}>
          <Input
            label="Preço de Custo (R$)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={newProduct.costPrice}
            onChange={e => setNewProduct({ ...newProduct, costPrice: e.target.value })}
          />
          {newProduct.isForSale && (
            <Input
              label={
                margin !== null
                  ? `Preço de Venda — Margem: ${margin}%`
                  : "Preço de Venda (R$)"
              }
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={newProduct.salePrice}
              onChange={e => setNewProduct({ ...newProduct, salePrice: e.target.value })}
            />
          )}
        </FormRow>

        <Divider />

        {/* ── Estoque & Medidas ── */}
        <SectionHeader icon={Boxes} label="Estoque & Medidas" />

        <FormRow cols={2}>
          <Input
            label="Qtd. Atual"
            type="number"
            placeholder="0"
            value={newProduct.stock}
            onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
          />
          <Input
            label="Qtd. Mínima (Alerta)"
            type="number"
            placeholder="0"
            value={newProduct.minStock}
            onChange={e => setNewProduct({ ...newProduct, minStock: e.target.value })}
          />
          <Select
            label="Como você armazena?"
            value={newProduct.unit || "un"}
            onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
            options={[
              { value: "un", label: "Unidade (un)" },
              { value: "cx", label: "Caixa (cx)" },
              { value: "frasco", label: "Frasco" },
              { value: "pacote", label: "Pacote" },
              { value: "ml", label: "Mililitro (ml)" },
              { value: "L",  label: "Litro (L)" },
              { value: "g",  label: "Grama (g)" },
              { value: "kg", label: "Kilo (kg)" },
            ]}
          />
          <Input
            label="Validade"
            type="date"
            value={newProduct.validUntil || ""}
            onChange={e => setNewProduct({ ...newProduct, validUntil: e.target.value })}
          />
        </FormRow>

        <FormRow cols={2}>
          <Input
            label="Capacidade / Rendimento"
            type="number"
            placeholder="Ex: 500"
            value={newProduct.metadata?.capacity || ""}
            onChange={e => setNewProduct({ ...newProduct, metadata: { ...newProduct.metadata, capacity: e.target.value } })}
          />
          <Select
            label="Unidade do Rendimento"
            value={newProduct.metadata?.capacityUnit || "ml"}
            onChange={e => setNewProduct({ ...newProduct, metadata: { ...newProduct.metadata, capacityUnit: e.target.value } })}
            options={[
              { value: "ml", label: "Mililitro (ml)" },
              { value: "L",  label: "Litro (L)" },
              { value: "g",  label: "Grama (g)" },
              { value: "kg", label: "Kilo (kg)" },
              { value: "cm", label: "Centímetro (cm)" },
              { value: "m",  label: "Metro (m)" },
              { value: "un", label: "Unidades" },
              { value: "aplicacoes", label: "Aplicações" },
            ]}
          />
        </FormRow>

        <Divider />

        {/* ── Revenda ── */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${newProduct.isForSale ? "bg-amber-100 text-amber-600" : "bg-zinc-200 text-zinc-400"}`}>
              <Eye size={17} />
            </div>
            <div>
              <p className="text-sm font-black text-zinc-900">Produto de Revenda (PDV)</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5">Disponível para venda direta ao cliente</p>
            </div>
          </div>
          <Switch
            checked={newProduct.isForSale}
            onCheckedChange={v => setNewProduct({ ...newProduct, isForSale: v })}
          />
        </div>

      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={handleCreateProduct}
          disabled={
            !newProduct.name || 
            !newProduct.costPrice || 
            (newProduct.isForSale && !newProduct.salePrice)
          }
        >
          {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
