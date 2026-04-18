import React, { useState, useEffect, useCallback } from "react";
import { Factory, Plus, Edit2, Trash2, Phone, Mail, Globe, FileText } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import {
  StatCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
  ContentCard, SectionTitle, EmptyState,
  Button, IconButton,
  Modal, ModalFooter,
  Input, Textarea, FormRow,
  Badge,
  GridTable, Column,
  useToast,
} from "@/src/components/ui";

interface Manufacturer {
  id: string; name: string; cnpj?: string; phone?: string; email?: string; website?: string; notes?: string; isActive: boolean | number;
}

const EMPTY_FORM = { name: "", cnpj: "", phone: "", email: "", website: "", notes: "" };

function ManufacturerModal({ isOpen, onClose, editingItem, onSaved }: {
  isOpen: boolean; onClose: () => void; editingItem: Manufacturer | null; onSaved: () => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setForm(editingItem
      ? { name: editingItem.name || "", cnpj: editingItem.cnpj || "", phone: editingItem.phone || "", email: editingItem.email || "", website: editingItem.website || "", notes: editingItem.notes || "" }
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
        await apiFetch(`/api/inventory/manufacturers/${editingItem.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast.success("Fabricante atualizado!");
      } else {
        await apiFetch("/api/inventory/manufacturers", { method: "POST", body: JSON.stringify(form) });
        toast.success("Fabricante cadastrado!");
      }
      onSaved(); onClose();
    } catch { toast.error("Erro ao salvar fabricante."); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingItem ? "Editar Fabricante" : "Novo Fabricante / Marca"} size="lg"
      footer={
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editingItem ? "Salvar" : "Cadastrar"}</Button>
        </ModalFooter>
      }
    >
      <div className="space-y-4">
        <Input label="Nome do fabricante / marca *" value={form.name} onChange={f("name")} placeholder="Ex: L'Oréal Professionnel" />
        <FormRow cols={2}>
          <Input label="CNPJ / Documento" value={form.cnpj} onChange={f("cnpj")} placeholder="00.000.000/0001-00" />
          <Input label="Telefone" value={form.phone} onChange={f("phone")} placeholder="(11) 9 9999-9999" iconLeft={<Phone size={14} />} />
        </FormRow>
        <FormRow cols={2}>
          <Input label="E-mail" value={form.email} onChange={f("email")} placeholder="contato@marca.com.br" iconLeft={<Mail size={14} />} />
          <Input label="Website" value={form.website} onChange={f("website")} placeholder="www.marca.com.br" iconLeft={<Globe size={14} />} />
        </FormRow>
        <Textarea label="Observações" value={form.notes} onChange={f("notes")} rows={3} placeholder="Informações adicionais..." />
      </div>
    </Modal>
  );
}

export function FabricantesView() {
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/inventory/manufacturers").then(r => r.json());
      setItems(Array.isArray(data) ? data : []);
    } catch { toast.error("Erro ao carregar fabricantes."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este fabricante?")) return;
    try {
      await apiFetch(`/api/inventory/manufacturers/${id}`, { method: "DELETE" });
      toast.success("Fabricante removido.");
      load();
    } catch { toast.error("Erro ao excluir."); }
  };

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (m: Manufacturer) => { setEditing(m); setModalOpen(true); };

  const filtered = items.filter(m => {
    const q = search.toLowerCase();
    return m.name?.toLowerCase().includes(q) || m.cnpj?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  const active = items.filter(m => m.isActive === true || m.isActive === 1);

  const columns: Column<Manufacturer>[] = [
    {
      header: "Fabricante / Marca",
      render: m => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
            <Factory size={15} className="text-purple-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-900 truncate">{m.name}</p>
            {m.cnpj && <p className="text-[10px] text-zinc-400 font-bold">{m.cnpj}</p>}
          </div>
        </div>
      ),
    },
    {
      header: "Contato", hideOnMobile: true,
      render: m => (
        <div className="space-y-0.5">
          {m.phone && <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-1"><Phone size={9} />{m.phone}</p>}
          {m.email && <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-1"><Mail size={9} />{m.email}</p>}
          {m.website && (
            <p className="text-[10px] font-bold text-blue-500 flex items-center gap-1">
              <Globe size={9} />
              <a href={m.website.startsWith("http") ? m.website : `https://${m.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-[180px]">{m.website}</a>
            </p>
          )}
          {!m.phone && !m.email && !m.website && <span className="text-zinc-300 text-xs">—</span>}
        </div>
      ),
    },
    { header: "Status", render: m => <Badge color={m.isActive ? "success" : "default"} dot>{m.isActive ? "Ativo" : "Inativo"}</Badge> },
    {
      header: "", className: "text-right",
      render: m => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <IconButton variant="ghost" size="sm" onClick={() => openEdit(m)}><Edit2 size={13} /></IconButton>
          <IconButton variant="ghost" size="sm" onClick={() => handleDelete(m.id)}><Trash2 size={13} /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <SectionTitle title="Fabricantes & Marcas" description="Cadastro de fabricantes e marcas dos produtos" icon={Factory}
        action={<Button iconLeft={<Plus size={14} />} onClick={openNew}>Nova Marca</Button>} divider />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
        <StatCard title="Total" value={items.length} icon={Factory} description="Marcas cadastradas" color="purple" />
        <StatCard title="Ativas" value={active.length} icon={Factory} color="success" description="Em uso" />
        <StatCard title="Com website" value={items.filter(m => !!m.website).length} icon={Globe} color="info" description="Presença digital" className="hidden sm:block" />
      </div>

      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar por nome, CNPJ..." />
          </FilterLineItem>
        </FilterLineSection>
        <FilterLineSection align="right">
          <Button variant="outline" size="sm" iconLeft={<FileText size={13} />}>Exportar</Button>
        </FilterLineSection>
      </FilterLine>

      <ContentCard padding="none">
        <GridTable
          data={filtered} columns={columns} keyExtractor={m => m.id} isLoading={loading}
          emptyMessage={
            <EmptyState icon={Factory} title="Nenhum fabricante cadastrado"
              description="Cadastre fabricantes e marcas para associar aos seus produtos."
              action={<Button iconLeft={<Plus size={14} />} onClick={openNew} size="sm">Cadastrar Fabricante</Button>}
              className="m-4" />
          }
          renderMobileItem={m => (
            <div className="flex items-start gap-3 -m-4 px-4 py-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                <Factory size={16} className="text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-zinc-900 truncate">{m.name}</p>
                  <Badge color={m.isActive ? "success" : "default"} dot size="sm">{m.isActive ? "Ativo" : "Inativo"}</Badge>
                </div>
                {m.cnpj && <p className="text-[10px] text-zinc-400 font-bold mt-0.5">{m.cnpj}</p>}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {m.phone && <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1"><Phone size={9} />{m.phone}</span>}
                  {m.email && <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1"><Mail size={9} />{m.email}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <IconButton variant="ghost" size="xs" onClick={() => openEdit(m)}><Edit2 size={12} /></IconButton>
                <IconButton variant="ghost" size="xs" onClick={() => handleDelete(m.id)}><Trash2 size={12} /></IconButton>
              </div>
            </div>
          )}
        />
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              {filtered.length} fabricante{filtered.length !== 1 ? "s" : ""}{search && ` · filtrado de ${items.length}`}
            </p>
          </div>
        )}
      </ContentCard>

      <ManufacturerModal isOpen={modalOpen} onClose={() => setModalOpen(false)} editingItem={editing} onSaved={load} />
    </>
  );
}
