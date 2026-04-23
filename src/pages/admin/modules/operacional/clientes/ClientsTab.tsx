import React, { useState, useMemo } from "react";
import {
  Users, Plus, Edit2, Trash2, Cake, Phone, Mail, MapPin,
  History, Calendar, ShoppingBag, X, Clock, User,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { parseBirthDateParts, calculateAge } from "@/src/lib/masks";
import {
  PageWrapper, SectionTitle, StatCard, ContentCard,
  FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch,
  FilterLineViewToggle, FilterLineSegmented,
  Button, IconButton,
  Badge,
  Modal,
  GridTable, Column,
  EmptyState,
  usePagination, Pagination,
} from "@/src/components/ui";
import { motion } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  city?: string;
  state?: string;
  gender?: string;
  cpf?: string;
  notes?: string;
  appointments?: any[];
  comandas?: any[];
  createdAt?: string;
}

interface ClientsTabProps {
  clientView: "grid" | "list";
  setClientView: (val: "grid" | "list") => void;
  clients: Client[];
  setIsClientModalOpen: (b?: boolean) => void;
  calculateAge?: (birthDate: string) => number | null;
  handleEditClient: (c: Client) => void;
  handleDeleteClient: (id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isBirthday(birthDate?: string): boolean {
  if (!birthDate) return false;
  const parts = parseBirthDateParts(birthDate);
  if (!parts) return false;
  const today = new Date();
  return parts.day === today.getDate() && parts.month === today.getMonth() + 1;
}

function getBirthDateDisplay(birthDate?: string): string | null {
  if (!birthDate) return null;
  const parts = parseBirthDateParts(birthDate);
  if (!parts) return birthDate;
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
}

function formatDate(d?: string): string {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yy HH:mm", { locale: ptBR }); } catch { return "—"; }
}

// ─── History Modal ────────────────────────────────────────────────────────────

function HistoryModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [tab, setTab] = useState<"comandas" | "agenda">("comandas");
  if (!client) return null;

  const appts    = client.appointments || [];
  const comandas = client.comandas     || [];

  const tabOpts = [
    { value: "comandas", label: "Comandas",     icon: <ShoppingBag size={12} /> },
    { value: "agenda",   label: "Agendamentos", icon: <Calendar size={12} />    },
  ] as { value: "comandas" | "agenda"; label: string; icon: React.ReactNode }[];

  const age   = client.birthDate ? calculateAge(client.birthDate) : null;
  const bday  = isBirthday(client.birthDate);
  const bdayDisplay = getBirthDateDisplay(client.birthDate);

  return (
    <Modal
      isOpen={!!client}
      onClose={onClose}
      title={`Histórico — ${client.name}`}
      size="lg"
    >
      <div className="space-y-4 p-1">
        {/* Client summary */}
        <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl font-black shrink-0">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black text-zinc-900">{client.name}</p>
              {bday && <Badge color="danger" size="sm"><Cake size={9} className="inline mr-0.5" />Aniversário hoje!</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {client.phone && <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1"><Phone size={9} />{client.phone}</span>}
              {client.email && <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1"><Mail size={9} />{client.email}</span>}
              {bdayDisplay && (
                <span className={cn("text-[10px] font-bold flex items-center gap-1", bday ? "text-pink-500" : "text-zinc-400")}>
                  <Cake size={9} />{bdayDisplay}{age !== null ? ` · ${age} anos` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3 shrink-0 text-center">
            <div>
              <p className="text-lg font-black text-amber-600">{comandas.length}</p>
              <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Comandas</p>
            </div>
            <div className="w-px h-8 bg-zinc-200" />
            <div>
              <p className="text-lg font-black text-zinc-700">{appts.length}</p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Agend.</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineSegmented value={tab} onChange={v => setTab(v as "comandas" | "agenda")} options={tabOpts} />
          </FilterLineSection>
        </FilterLine>

        {/* Content */}
        <ContentCard padding="none">
          {tab === "comandas" && (
            comandas.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Nenhuma comanda" description="Cliente sem comandas registradas." className="m-4" />
            ) : (
              <div className="divide-y divide-zinc-100">
                {comandas.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      c.status === "paid" ? "bg-emerald-50 border border-emerald-100" :
                      c.status === "open" ? "bg-amber-50 border border-amber-100" :
                      "bg-zinc-50 border border-zinc-100",
                    )}>
                      <ShoppingBag size={13} className={
                        c.status === "paid" ? "text-emerald-500" :
                        c.status === "open" ? "text-amber-500" : "text-zinc-400"
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-zinc-900 truncate">Comanda #{c.id?.slice(-6).toUpperCase()}</p>
                      <p className="text-[10px] text-zinc-400 font-bold">{formatDate(c.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {c.total != null && (
                        <p className="text-sm font-black text-zinc-900">
                          {Number(c.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      )}
                      <Badge
                        color={c.status === "paid" ? "success" : c.status === "open" ? "warning" : "default"}
                        size="sm"
                      >
                        {c.status === "paid" ? "Paga" : c.status === "open" ? "Aberta" : c.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === "agenda" && (
            appts.length === 0 ? (
              <EmptyState icon={Calendar} title="Nenhum agendamento" description="Cliente sem agendamentos registrados." className="m-4" />
            ) : (
              <div className="divide-y divide-zinc-100">
                {appts.slice().sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      a.status === "done"       ? "bg-emerald-50 border border-emerald-100" :
                      a.status === "scheduled"  ? "bg-blue-50 border border-blue-100" :
                      a.status === "cancelled"  ? "bg-red-50 border border-red-100" :
                      "bg-zinc-50 border border-zinc-100",
                    )}>
                      <Calendar size={13} className={
                        a.status === "done"      ? "text-emerald-500" :
                        a.status === "scheduled" ? "text-blue-500" :
                        a.status === "cancelled" ? "text-red-400" : "text-zinc-400"
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-zinc-900 truncate">
                        {a.service?.name || "Serviço não especificado"}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-bold">
                        {a.date ? format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                        {a.startTime ? ` · ${a.startTime}` : ""}
                      </p>
                    </div>
                    <Badge
                      color={
                        a.status === "done"      ? "success" :
                        a.status === "scheduled" ? "info" :
                        a.status === "cancelled" ? "danger" : "default"
                      }
                      size="sm"
                    >
                      {a.status === "done"      ? "Concluído" :
                       a.status === "scheduled" ? "Agendado" :
                       a.status === "cancelled" ? "Cancelado" : a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )
          )}
        </ContentCard>

        {/* Notes */}
        {client.notes && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Observações</p>
            <p className="text-xs text-zinc-700 font-bold">{client.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────

function ClientCard({ client, onEdit, onDelete, onHistory }: {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
}) {
  const age      = client.birthDate ? calculateAge(client.birthDate) : null;
  const bday     = isBirthday(client.birthDate);
  const bdayDisp = getBirthDateDisplay(client.birthDate);
  const comandas = client.comandas?.length ?? 0;

  return (
    <div className={cn(
      "bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all group",
      bday ? "border-pink-200 ring-1 ring-pink-100" : "border-zinc-200 hover:border-amber-300",
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center text-lg font-black shrink-0",
          bday ? "bg-pink-50 border border-pink-100 text-pink-500" : "bg-amber-50 border border-amber-100 text-amber-600",
        )}>
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-zinc-900 truncate">{client.name}</p>
          {client.phone && (
            <p className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 mt-0.5">
              <Phone size={9} />{client.phone}
            </p>
          )}
        </div>
        {/* Actions */}
        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton size="xs" variant="ghost" onClick={onHistory} title="Histórico"><History size={12} /></IconButton>
          <IconButton size="xs" variant="ghost" onClick={onEdit}    title="Editar">   <Edit2   size={12} /></IconButton>
          <IconButton size="xs" variant="ghost" onClick={onDelete}  title="Excluir">  <Trash2  size={12} /></IconButton>
        </div>
      </div>

      {/* Birthday row */}
      {bdayDisp && (
        <div className={cn(
          "flex items-center gap-1.5 mt-3 px-2.5 py-1.5 rounded-xl",
          bday ? "bg-pink-50 border border-pink-100" : "bg-zinc-50 border border-zinc-100",
        )}>
          <Cake size={11} className={bday ? "text-pink-400" : "text-zinc-300"} />
          <span className={cn("text-[10px] font-black", bday ? "text-pink-500" : "text-zinc-500")}>
            {bday ? "Aniversário hoje! " : ""}{bdayDisp}{age !== null ? ` · ${age} anos` : ""}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Comandas</p>
          <p className="text-base font-black text-amber-600 mt-0.5">{comandas}</p>
        </div>
        <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Email</p>
          <p className="text-[10px] font-bold text-zinc-600 mt-0.5 truncate">{client.email || "—"}</p>
        </div>
      </div>

      {/* City */}
      {client.city && (
        <p className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 mt-2.5 truncate">
          <MapPin size={9} />{client.city}{client.state ? `, ${client.state}` : ""}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientsTab({
  clientView,
  setClientView,
  clients,
  setIsClientModalOpen,
  handleEditClient,
  handleDeleteClient,
}: ClientsTabProps) {
  const [search, setSearch]         = useState("");
  const [filterBday, setFilterBday] = useState(false);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = clients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.cpf?.toLowerCase().includes(q)
      );
    }
    if (filterBday) list = list.filter(c => isBirthday(c.birthDate));
    return list;
  }, [clients, search, filterBday]);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const { page, pageSize, paginatedData, setPage, setPageSize, totalPages } =
    usePagination(filtered, 15);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalComandas  = clients.reduce((s, c) => s + (c.comandas?.length  ?? 0), 0);
  const totalAppts     = clients.reduce((s, c) => s + (c.appointments?.length ?? 0), 0);
  const todayBdays     = clients.filter(c => isBirthday(c.birthDate)).length;

  // ── Columns for list view ───────────────────────────────────────────────────
  const columns: Column<Client>[] = [
    {
      header: "Cliente",
      render: (c) => {
        const bday = isBirthday(c.birthDate);
        return (
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
              bday ? "bg-pink-50 border border-pink-100 text-pink-500" : "bg-amber-50 border border-amber-100 text-amber-600",
            )}>
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-zinc-900 truncate">{c.name}</p>
              {c.city && (
                <p className="text-[10px] text-zinc-400 font-bold flex items-center gap-1 truncate">
                  <MapPin size={9} />{c.city}{c.state ? `, ${c.state}` : ""}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: "Contato",
      hideOnMobile: true,
      render: (c) => (
        <div className="space-y-0.5">
          {c.phone && <p className="text-xs font-bold text-zinc-700 flex items-center gap-1"><Phone size={10} className="text-zinc-400" />{c.phone}</p>}
          {c.email && <p className="text-[10px] font-bold text-zinc-400 flex items-center gap-1"><Mail size={9} />{c.email}</p>}
          {!c.phone && !c.email && <span className="text-zinc-300 text-xs">—</span>}
        </div>
      ),
    },
    {
      header: "Aniversário",
      hideOnMobile: true,
      render: (c) => {
        const age  = c.birthDate ? calculateAge(c.birthDate) : null;
        const bday = isBirthday(c.birthDate);
        const disp = getBirthDateDisplay(c.birthDate);
        if (!disp) return <span className="text-zinc-300">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <Cake size={12} className={bday ? "text-pink-400" : "text-zinc-300"} />
            <div>
              <p className={cn("text-xs font-black", bday ? "text-pink-500" : "text-zinc-700")}>{disp}</p>
              {age !== null && <p className="text-[10px] text-zinc-400 font-bold">{age} anos</p>}
            </div>
            {bday && <Badge color="danger" size="sm">Hoje!</Badge>}
          </div>
        );
      },
    },
    {
      header: "Comandas",
      hideOnMobile: true,
      render: (c) => (
        <Badge color={c.comandas?.length ? "warning" : "default"} size="sm">
          {c.comandas?.length ?? 0}
        </Badge>
      ),
    },
    {
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <IconButton size="sm" variant="ghost" onClick={() => setHistoryClient(c)} title="Histórico"><History size={13} /></IconButton>
          <IconButton size="sm" variant="ghost" onClick={() => handleEditClient(c)}><Edit2 size={13} /></IconButton>
          <IconButton size="sm" variant="ghost" onClick={() => handleDeleteClient(c.id)}><Trash2 size={13} /></IconButton>
        </div>
      ),
    },
  ];

  // ── Filter options for birthday ─────────────────────────────────────────────
  const filterOptions = [
    { value: "all",   label: "Todos" },
    { value: "bday",  label: `Aniversariantes ${todayBdays > 0 ? `(${todayBdays})` : ""}` },
  ] as { value: string; label: string }[];

  return (
    <PageWrapper>
      <SectionTitle
        title="Gestão de Clientes"
        description="Cadastro, histórico e aniversariantes"
        icon={Users}
        action={<Button iconLeft={<Plus size={14} />} onClick={() => setIsClientModalOpen(true)}>Novo Cliente</Button>}
        divider
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <StatCard title="Total"      value={clients.length}  icon={Users}       description="Clientes cadastrados" />
        <StatCard title="Comandas"   value={totalComandas}   icon={ShoppingBag} color="warning"  description="Total de comandas" />
        <StatCard title="Agendamentos" value={totalAppts}    icon={Calendar}    color="info"     description="Total de agendamentos" className="hidden sm:block" />
        <StatCard
          title="Aniversariantes"
          value={todayBdays}
          icon={Cake}
          color={todayBdays > 0 ? "danger" : "default"}
          description="Hoje"
          className="hidden sm:block"
        />
      </div>

      {/* Toolbar */}
      <FilterLine className="mb-4">
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar por nome, telefone, e-mail..." />
          </FilterLineItem>
          {todayBdays > 0 && (
            <FilterLineItem>
              <FilterLineSegmented
                value={filterBday ? "bday" : "all"}
                onChange={v => setFilterBday(v === "bday")}
                options={filterOptions}
                size="sm"
              />
            </FilterLineItem>
          )}
        </FilterLineSection>
        <FilterLineSection align="right" wrap={false}>
          <FilterLineViewToggle
            value={clientView}
            onChange={setClientView}
            gridValue="grid"
            listValue="list"
          />
          <Button iconLeft={<Plus size={14} />} onClick={() => setIsClientModalOpen(true)}>
            <span className="hidden sm:inline">Novo Cliente</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </FilterLineSection>
      </FilterLine>

      {/* Grid View */}
      {clientView === "grid" && (
        <>
          {filtered.length === 0 ? (
            <ContentCard>
              <EmptyState
                icon={Users}
                title="Nenhum cliente encontrado"
                description={search ? "Tente ajustar o filtro de busca." : "Clique em Novo Cliente para começar."}
                action={!search ? <Button iconLeft={<Plus size={14} />} onClick={() => setIsClientModalOpen(true)} size="sm">Novo Cliente</Button> : undefined}
              />
            </ContentCard>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedData.map((client, idx) => (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <ClientCard
                      client={client}
                      onEdit={() => handleEditClient(client)}
                      onDelete={() => handleDeleteClient(client.id)}
                      onHistory={() => setHistoryClient(client)}
                    />
                  </motion.div>
                ))}
              </div>
              {/* Pagination for grid */}
              {filtered.length > pageSize && (
                <div className="mt-4">
                  <ContentCard padding="none">
                    <Pagination
                      total={filtered.length}
                      page={page}
                      pageSize={pageSize}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
                  </ContentCard>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* List View */}
      {clientView === "list" && (
        <ContentCard padding="none">
          <GridTable
            data={paginatedData}
            columns={columns}
            keyExtractor={c => c.id}
            noDesktopCard
            emptyMessage={
              <EmptyState
                icon={Users}
                title="Nenhum cliente encontrado"
                description={search ? "Tente ajustar o filtro." : "Cadastre seu primeiro cliente."}
                action={!search ? <Button iconLeft={<Plus size={14} />} onClick={() => setIsClientModalOpen(true)} size="sm">Novo Cliente</Button> : undefined}
                className="m-4"
              />
            }
            renderMobileAvatar={c => (
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0",
                isBirthday(c.birthDate)
                  ? "bg-pink-50 border border-pink-100 text-pink-500"
                  : "bg-amber-50 border border-amber-100 text-amber-600",
              )}>
                {c.name.charAt(0).toUpperCase()}
              </div>
            )}
            renderMobileItem={c => {
              const age  = c.birthDate ? calculateAge(c.birthDate) : null;
              const bday = isBirthday(c.birthDate);
              const disp = getBirthDateDisplay(c.birthDate);
              return (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-black text-zinc-900 truncate">{c.name}</p>
                      {bday && <Badge color="danger" size="sm"><Cake size={8} className="inline" /> Hoje!</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {c.phone && <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1"><Phone size={9} />{c.phone}</span>}
                      {disp && <span className={cn("text-[10px] font-bold flex items-center gap-1", bday ? "text-pink-500" : "text-zinc-400")}><Cake size={9} />{disp}{age !== null ? ` · ${age}a` : ""}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-black text-amber-600">{c.comandas?.length ?? 0}</p>
                      <p className="text-[8px] font-bold text-amber-400 uppercase tracking-wide leading-none">cmd</p>
                    </div>
                  </div>
                </div>
              );
            }}
            renderMobileExpandedContent={c => (
              <div className="px-4 pb-4 pt-3 space-y-3">
                <div className="space-y-1.5">
                  {c.email && <p className="text-xs text-zinc-600 flex items-center gap-2"><Mail size={12} className="text-zinc-400 shrink-0" /><span className="truncate">{c.email}</span></p>}
                  {c.city  && <p className="text-xs text-zinc-600 flex items-center gap-2"><MapPin size={12} className="text-zinc-400 shrink-0" />{c.city}{c.state ? `, ${c.state}` : ""}</p>}
                  {c.notes && <p className="text-xs text-zinc-500 font-bold">{c.notes}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-3 text-center">
                    <p className="text-lg font-black text-amber-600">{c.comandas?.length ?? 0}</p>
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Comandas</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-3 text-center">
                    <p className="text-lg font-black text-zinc-700">{c.appointments?.length ?? 0}</p>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Agend.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" iconLeft={<History size={12} />} onClick={() => setHistoryClient(c)} className="flex-1">Histórico</Button>
                  <Button variant="outline" size="sm" iconLeft={<Edit2 size={12} />}   onClick={() => handleEditClient(c)}  className="flex-1">Editar</Button>
                  <IconButton variant="ghost" size="sm" onClick={() => handleDeleteClient(c.id)}><Trash2 size={13} /></IconButton>
                </div>
              </div>
            )}
            pagination={{
              total: filtered.length,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
          />
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}{search && ` · filtrado de ${clients.length}`}
              </p>
            </div>
          )}
        </ContentCard>
      )}

      {/* History Modal */}
      <HistoryModal client={historyClient} onClose={() => setHistoryClient(null)} />
    </PageWrapper>
  );
}
