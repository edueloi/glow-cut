import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  LayoutGrid, List, Search, Plus, Cake, 
  MapPin as MapPinIcon, Edit2, Trash2, Users 
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/Button";
import { motion } from "motion/react";

interface ClientsTabProps {
  clientView: 'grid' | 'list';
  setClientView: (val: 'grid' | 'list') => void;
  clients: any[];
  setIsClientModalOpen: (b: boolean) => void;
  calculateAge: (birthDate: string) => number | null;
  handleEditClient: (c: any) => void;
  handleDeleteClient: (id: string) => void;
}

export function ClientsTab({
  clientView,
  setClientView,
  clients,
  setIsClientModalOpen,
  calculateAge,
  handleEditClient,
  handleDeleteClient
}: ClientsTabProps) {
  return (
    <div className="space-y-6">
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
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Buscar clientes..."
              className="pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all w-64"
            />
          </div>
          <Button
            onClick={() => setIsClientModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 font-bold shadow-sm flex items-center gap-2"
          >
            <Plus size={16} />
            Novo Cliente
          </Button>
        </div>
      </div>

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
                    const parts = client.birthDate.split("/");
                    const isBday = parts.length === 3 && parseInt(parts[0]) === new Date().getDate() && parseInt(parts[1]) === new Date().getMonth() + 1;
                    return (
                      <p className={cn("text-[10px] mt-0.5 font-bold flex items-center gap-1", isBday ? "text-pink-500" : "text-zinc-400")}>
                        <Cake size={9} />
                        {isBday ? "Aniversário hoje! " : ""}{age !== null ? `${age} anos` : client.birthDate}
                      </p>
                    );
                  })()}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleEditClient(client)} className="p-1.5 bg-zinc-100 hover:bg-amber-500 hover:text-white text-zinc-500 rounded-lg transition-all"><Edit2 size={13}/></button>
                  <button onClick={() => handleDeleteClient(client.id)} className="p-1.5 bg-zinc-100 hover:bg-red-500 hover:text-white text-zinc-500 rounded-lg transition-all"><Trash2 size={13}/></button>
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
                  {client.city && <p className="text-[10px] text-zinc-400 font-medium truncate flex items-center gap-1"><MapPinIcon size={9}/>{client.city}{client.state ? `, ${client.state}` : ""}</p>}
                </div>
              )}
            </motion.div>
          ))}
          {clients.length === 0 && (
            <div className="col-span-full py-24 bg-white rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
              <Users size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-bold text-zinc-500">Nenhum cliente cadastrado.</p>
              <p className="text-xs mt-1 font-medium">Clique no botão acima para começar.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Contato</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Agendamentos</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xs font-bold text-amber-600">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-zinc-900 block">{client.name}</span>
                        {client.birthDate && (() => {
                          const age = calculateAge(client.birthDate);
                          return age !== null ? <span className="text-[10px] text-zinc-400 font-medium">{age} anos</span> : null;
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-zinc-500 font-medium">{client.phone}</div>
                    {client.email && <div className="text-[10px] text-zinc-400">{client.email}</div>}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-zinc-700">{client.appointments?.length || 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEditClient(client)} className="p-2 bg-zinc-100 hover:bg-amber-500 hover:text-white text-zinc-500 rounded-lg transition-all"><Edit2 size={14}/></button>
                      <button onClick={() => handleDeleteClient(client.id)} className="p-2 bg-zinc-100 hover:bg-red-500 hover:text-white text-zinc-500 rounded-lg transition-all"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">Nenhum cliente cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
