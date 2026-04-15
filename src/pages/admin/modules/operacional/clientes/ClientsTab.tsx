import React from "react";
import {
  LayoutGrid, List, Search, Plus, Cake,
  MapPin as MapPinIcon, Edit2, Trash2, Users, Filter, Clock,
  Phone, Mail,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button, IconButton } from "@/src/components/ui/Button";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { motion } from "motion/react";
import { GridTable } from "@/src/components/ui/GridTable";

interface ClientsTabProps {
  clientView: 'grid' | 'list';
  setClientView: (val: 'grid' | 'list') => void;
  clients: any[];
  setIsClientModalOpen: (b: boolean) => void;
  calculateAge: (birthDate: string) => number | null;
  handleEditClient: (c: any) => void;
  handleDeleteClient: (id: string) => void;
}

function isBirthday(birthDate: string) {
  const parts = birthDate.split("/");
  return (
    parts.length === 3 &&
    parseInt(parts[0]) === new Date().getDate() &&
    parseInt(parts[1]) === new Date().getMonth() + 1
  );
}

export function ClientsTab({
  clientView,
  setClientView,
  clients,
  setIsClientModalOpen,
  calculateAge,
  handleEditClient,
  handleDeleteClient,
}: ClientsTabProps) {
  return (
    <div className="space-y-6">
      {/* ── Header toolbar ── */}
      <div className="flex items-center justify-between">
        <div className="flex p-1 bg-zinc-100 rounded-xl w-fit">
          <button
            onClick={() => setClientView('grid')}
            className={cn("p-2 rounded-lg transition-all", clientView === 'grid' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setClientView('list')}
            className={cn("p-2 rounded-lg transition-all", clientView === 'list' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
          >
            <List size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Buscar clientes..."
                className="pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all w-64"
              />
            </div>
            <Button variant="outline" size="md" iconLeft={<Filter size={14} />}>
              Filtros
            </Button>
          </div>
          <Button
            onClick={() => setIsClientModalOpen(true)}
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
            className="shadow-sm"
          >
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* ── Grid view (desktop cards) ── */}
      {clientView === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clients.map((client, idx) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-zinc-900 truncate">{client.name}</h4>
                  <p className="text-xs text-zinc-500 mt-0.5 font-medium">{client.phone}</p>
                  {client.birthDate && (() => {
                    const age = calculateAge(client.birthDate);
                    const bday = isBirthday(client.birthDate);
                    return (
                      <p className={cn("text-[10px] mt-0.5 font-bold flex items-center gap-1", bday ? "text-pink-500" : "text-zinc-400")}>
                        <Cake size={9} />
                        {bday ? "Aniversário hoje! " : ""}{age !== null ? `${age} anos` : client.birthDate}
                      </p>
                    );
                  })()}
                </div>
                <div className="flex gap-1 shrink-0">
                  <IconButton size="xs" variant="ghost" onClick={() => alert('Histórico: Funcionalidade em breve!')} title="Ver Histórico">
                    <Clock size={13} />
                  </IconButton>
                  <IconButton size="xs" variant="ghost" onClick={() => handleEditClient(client)}>
                    <Edit2 size={13} />
                  </IconButton>
                  <IconButton size="xs" variant="danger" onClick={() => handleDeleteClient(client.id)}>
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Agendamentos</p>
                  <p className="text-lg font-black text-zinc-900 mt-1">{client.appointments?.length || 0}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Comandas</p>
                  <p className="text-lg font-black text-amber-600 mt-1">{client.comandas?.length || 0}</p>
                </div>
              </div>

              {(client.email || client.city) && (
                <div className="mt-3 space-y-1">
                  {client.email && <p className="text-[10px] text-zinc-400 font-medium truncate">{client.email}</p>}
                  {client.city && (
                    <p className="text-[10px] text-zinc-400 font-medium truncate flex items-center gap-1">
                      <MapPinIcon size={9} />{client.city}{client.state ? `, ${client.state}` : ""}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
          {clients.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={Users}
                title="Nenhum cliente cadastrado."
                description="Clique no botão acima para começar."
              />
            </div>
          )}
        </div>
      ) : (
        /* ── List view: GridTable (desktop tabela + mobile cards expandíveis) ── */
        <GridTable
            data={clients}
            keyExtractor={(c) => c.id}
            emptyMessage={
              <div className="py-12 text-center">
                <Users size={32} className="mx-auto mb-3 text-zinc-200" />
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nenhum cliente cadastrado.</p>
              </div>
            }
            /* ── Mobile: avatar lateral ── */
            renderMobileAvatar={(c) => (
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-sm font-black text-amber-600 shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
            )}
            /* ── Mobile: cabeçalho do card ── */
            renderMobileItem={(c) => {
              const age = c.birthDate ? calculateAge(c.birthDate) : null;
              const bday = c.birthDate ? isBirthday(c.birthDate) : false;
              return (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-black text-zinc-900 truncate">{c.name}</p>
                      {bday && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-pink-100 text-pink-600 uppercase tracking-widest shrink-0 flex items-center gap-0.5">
                          <Cake size={8} /> Aniversário!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                        <Phone size={9} /> {c.phone || "—"}
                      </span>
                      {age !== null && (
                        <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                          <Cake size={9} /> {age} anos
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Contadores */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-black text-zinc-700">{c.appointments?.length || 0}</p>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide leading-none">agenda</p>
                    </div>
                    <div className="w-px h-6 bg-zinc-100" />
                    <div className="text-center">
                      <p className="text-sm font-black text-amber-600">{c.comandas?.length || 0}</p>
                      <p className="text-[8px] font-bold text-amber-400 uppercase tracking-wide leading-none">comanda</p>
                    </div>
                  </div>
                </div>
              );
            }}
            /* ── Mobile: conteúdo expandível ── */
            renderMobileExpandedContent={(c) => (
              <div className="px-4 pb-4 pt-3 space-y-3">
                {/* Detalhes de contato */}
                <div className="space-y-1.5">
                  {c.email && (
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <Mail size={12} className="text-zinc-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.city && (
                    <div className="flex items-center gap-2 text-xs text-zinc-600">
                      <MapPinIcon size={12} className="text-zinc-400 shrink-0" />
                      <span>{c.city}{c.state ? `, ${c.state}` : ""}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-3">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Agendamentos</p>
                    <p className="text-lg font-black text-zinc-900 mt-0.5">{c.appointments?.length || 0}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Comandas</p>
                    <p className="text-lg font-black text-amber-600 mt-0.5">{c.comandas?.length || 0}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); alert('Histórico: Funcionalidade em breve!'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    <Clock size={12} /> Histórico
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditClient(c); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClient(c.id); }}
                    className="flex items-center justify-center py-2.5 px-3 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-xl transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
            /* ── Desktop: colunas da tabela ── */
            columns={[
              {
                header: "Cliente",
                render: (c) => {
                  const age = c.birthDate ? calculateAge(c.birthDate) : null;
                  const bday = c.birthDate ? isBirthday(c.birthDate) : false;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-bold text-amber-600 shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-zinc-900 block">{c.name}</span>
                        {age !== null && (
                          <span className={cn("text-[10px] font-medium flex items-center gap-1", bday ? "text-pink-500" : "text-zinc-400")}>
                            <Cake size={9} />{bday ? "Aniversário hoje! " : ""}{age} anos
                          </span>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                header: "Contato",
                render: (c) => (
                  <div>
                    <div className="text-xs text-zinc-500 font-medium">{c.phone}</div>
                    {c.email && <div className="text-[10px] text-zinc-400">{c.email}</div>}
                  </div>
                ),
              },
              {
                header: "Agendamentos",
                render: (c) => (
                  <span className="text-xs font-bold text-zinc-700">{c.appointments?.length || 0}</span>
                ),
              },
              {
                header: "Ações",
                headerClassName: "text-right",
                className: "text-right",
                render: (c) => (
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="sm" variant="ghost" onClick={() => alert('Histórico: Funcionalidade em breve!')} title="Ver Histórico">
                      <Clock size={14} />
                    </IconButton>
                    <IconButton size="sm" variant="ghost" onClick={() => handleEditClient(c)}>
                      <Edit2 size={14} />
                    </IconButton>
                    <IconButton size="sm" variant="danger" onClick={() => handleDeleteClient(c.id)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                ),
                hideOnMobile: true,
              },
            ]}
          />
      )}
    </div>
  );
}
