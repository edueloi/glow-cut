import React, { useState, useEffect, useCallback } from "react";
import { Truck, Plus, Edit2, Trash2, Phone, Mail, MapPin, User, FileText } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
  ContentCard, SectionTitle, EmptyState,
  Button, IconButton,
  Modal, ModalFooter,
  Input,
  Badge,
  GridTable, Column,
  useToast,
} from "@/src/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  contact?: string;
  address?: string;
  notes?: string;
  isActive: boolean | number;
}

const EMPTY_FORM = { name: "", cnpj: "", phone: "", email: "", contact: "", address: "", notes: "" };

// ─── Modal ────────────────────────────────────────────────────────────────────
function SupplierModal({ isOpen, onClose, editingItem, onSaved }: {
  isOpen: boolean; onClose: () => void; editingItem: Supplier | null; onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setForm(editingItem
      ? { name: editingItem.name || "", cnpj: editingItem.cnpj || "", phone: editingItem.phone || "", email: editingItem.email || "", contact: editingItem.contact || "", address: editingItem.address || "", notes: editingItem.notes || "" }
      : EMPTY_FORM
    );
  }, [editingItem, isOpen]);

  const f = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.warning("Nome é obrigatório."); return; }
    setSaving(true);
    try {
      if (editingItem) {
        await apiFetch(`/api/inventory/suppliers/${editingItem.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast.success("Fornecedor atualizado!");
      } else {
        await apiFetch("/api/inventory/suppliers", { method: "POST", body: JSON.stringify(form) });
        toast.success("Fornecedor cadastrado!");
      }
      onSaved(); onClose();
    } catch { toast.error("Erro ao salvar fornecedor."); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? "Editar Fornecedor" : "Novo Fornecedor"} size="lg"
      footer={
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editingItem ? "Salvar alterações" : "Cadastrar"}</Button>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-1">
        <Input label="Nome do fornecedor *" value={form.name} onChange={f("name")} placeholder="Ex: Distribuidora Alfa" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="CNPJ / Documento" value={form.cnpj} onChange={f("cnpj")} placeholder="00.000.000/0001-00" />
          <Input label="Telefone" value={form.phone} onChange={f("phone")} placeholder="(11) 9 9999-9999" iconLeft={<Phone size={14} />} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="E-mail" value={form.email} onChange={f("email")} placeholder="contato@fornecedor.com.br" iconLeft={<Mail size={14} />} />
          <Input label="Contato / Responsável" value={form.contact} onChange={f("contact")} placeholder="Nome do contato" iconLeft={<User size={14} />} />
        </div>
        <Input label="Endereço" value={form.address} onChange={f("address")} placeholder="Rua, número, cidade" iconLeft={<MapPin size={14} />} />
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observações</label>
          <textarea value={form.notes} onChange={f("notes")} rows={3} placeholder="Informações adicionais..."
            className="w-full px-3 py-2.5 text-sm font-bold text-zinc-800 placeholder:text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 resize-none transition-all" />
        </div>
      </div>
    </Modal>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export function FornecedoresView() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/inventory/suppliers").then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } catch { toast.error("Erro ao carregar fornecedores."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este fornecedor?")) return;
    try {
      await apiFetch(`/api/inventory/suppliers/${id}`, { method: "DELETE" });
      toast.success("Fornecedor removido.");
      load();
    } catch { toast.error("Erro ao excluir."); }
  };

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setModalOpen(true); };

  const filtered = items.filter(s => {
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.cnpj?.toLowerCase().includes(q) || s.contact?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  const active = items.filter(s => s.isActive === true || s.isActive === 1);
  const withEmail = items.filter(s => !!s.email);

  const columns: Column<Supplier>[] = [
    {
      header: "Fornecedor",
      render: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Truck size={15} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-900 truncate">{s.name}</p>
            {s.cnpj && <p className="text-[10px] text-zinc-400 font-bold truncate">{s.cnpj}</p>}
          </div>
        </div>
      ),
    },
    {
      header: "Contato",
      hideOnMobile: true,
      render: (s) => (
        <div className="space-y-0.5">
          {s.contact && <p className="text-xs font-bold text-zinc-700 flex items-center gap-1"><User size={10} className="text-zinc-400" />{s.contact}</p>}
          {s.phone && <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><Phone size={9} />{s.phone}</p>}
          {s.email && <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><Mail size={9} />{s.email}</p>}
          {!s.contact && !s.phone && !s.email && <span className="text-zinc-300 text-xs">—</span>}
        </div>
      ),
    },
    {
      header: "Endereço",
      hideOnMobile: true,
      render: (s) => (
        <p className="text-xs font-bold text-zinc-500 flex items-center gap-1 max-w-[200px] truncate">
          {s.address ? <><MapPin size={10} className="shrink-0 text-zinc-400" />{s.address}</> : <span className="text-zinc-300">—</span>}
        </p>
      ),
    },
    { header: "Status", render: (s) => <Badge color={s.isActive ? "success" : "default"} dot>{s.isActive ? "Ativo" : "Inativo"}</Badge> },
    {
      header: "", className: "text-right",
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <IconButton variant="ghost" size="sm" onClick={() => openEdit(s)}><Edit2 size={13} /></IconButton>
          <IconButton variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 size={13} /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <SectionTitle title="Fornecedores" description="Gerencie seus fornecedores e contatos comerciais" icon={Truck}
        action={<Button iconLeft={<Plus size={14} />} onClick={openNew}>Novo Fornecedor</Button>} divider />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard title="Total" value={items.length} icon={Truck} description="Fornecedores cadastrados" />
        <StatCard title="Ativos" value={active.length} icon={Truck} color="success" description="Em operação" />
        <StatCard title="Com e-mail" value={withEmail.length} icon={Mail} color="info" description="Com contato digital" className="hidden sm:block" />
      </div>

      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar por nome, CNPJ, contato..." />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right">
          <Button variant="outline" size="sm" iconLeft={<FileText size={13} />}>Exportar</Button>
        </FilterLineSection>
      </FilterLine>

      <ContentCard padding="none">
        <GridTable
          data={filtered} columns={columns} keyExtractor={s => s.id} isLoading={loading}
          emptyMessage={
            <EmptyState icon={Truck} title="Nenhum fornecedor cadastrado"
              description="Cadastre seu primeiro fornecedor para gerenciar compras e reposições."
              action={<Button iconLeft={<Plus size={14} />} onClick={openNew} size="sm">Cadastrar Fornecedor</Button>}
              className="m-4" />
          }
          renderMobileItem={s => (
            <div className="flex items-start gap-3 -m-4 px-4 py-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <Truck size={16} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-zinc-900 truncate">{s.name}</p>
                  <Badge color={s.isActive ? "success" : "default"} dot size="sm">{s.isActive ? "Ativo" : "Inativo"}</Badge>
                </div>
                {s.cnpj && <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{s.cnpj}</p>}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {s.phone && <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1"><Phone size={9} />{s.phone}</span>}
                  {s.email && <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1"><Mail size={9} />{s.email}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton variant="ghost" size="xs" onClick={() => openEdit(s)}><Edit2 size={12} /></IconButton>
                <IconButton variant="ghost" size="xs" onClick={() => handleDelete(s.id)}><Trash2 size={12} /></IconButton>
              </div>
            </div>
          )}
        />
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {filtered.length} fornecedor{filtered.length !== 1 ? "es" : ""}{search && ` · filtrado de ${items.length}`}
            </p>
          </div>
        )}
      </ContentCard>

      <SupplierModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editingItem={editing} onSaved={load} />
    </>
  );
}
