import React from "react";
import { Plus, UserCog, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/src/components/ui/Button";

interface ProfessionalsTabProps {
  professionals: any[];
  setEditingProfessional: (p: any) => void;
  setNewProfessional: (p: any) => void;
  setIsProfessionalModalOpen: (b: boolean) => void;
  handleDeleteProfessional: (id: string) => void;
}

export function ProfessionalsTab({
  professionals,
  setEditingProfessional,
  setNewProfessional,
  setIsProfessionalModalOpen,
  handleDeleteProfessional
}: ProfessionalsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 font-medium">
          {professionals.length} profissional(is) cadastrado(s)
        </p>
        <Button
          onClick={() => { 
            setEditingProfessional(null); 
            setNewProfessional({ name: "", role: "", password: "", showPassword: false }); 
            setIsProfessionalModalOpen(true); 
          }}
          className="bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-2xl px-6 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Profissional
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {professionals.map((prof: any, idx: number) => (
          <motion.div
            key={prof.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm hover:shadow-lg hover:border-amber-300 transition-all relative overflow-hidden"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-2xl font-black shrink-0">
                {prof.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 truncate">{prof.name}</h4>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">{prof.role || "Sem cargo"}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl text-[10px] font-bold border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 py-4 flex items-center justify-center gap-2"
                onClick={() => {
                  setEditingProfessional(prof);
                  setNewProfessional({ name: prof.name, role: prof.role || "", password: "", showPassword: false });
                  setIsProfessionalModalOpen(true);
                }}
              >
                <UserCog size={14} /> Editar
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-2xl text-[10px] font-bold border-red-200 text-red-500 hover:bg-red-50 py-4 flex items-center justify-center gap-2"
                onClick={() => handleDeleteProfessional(prof.id)}
              >
                <Trash2 size={14} /> Excluir
              </Button>
            </div>
          </motion.div>
        ))}
        {professionals.length === 0 && (
          <div className="col-span-full py-24 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400">
            <UserCog size={48} className="mb-4 opacity-30" />
            <p className="text-sm font-bold text-zinc-500">Nenhum profissional cadastrado.</p>
            <p className="text-xs mt-1 font-medium">Clique no botão acima para adicionar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
