import React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";

interface DeleteConfirmModalProps {
  deleteConfirm: { type: string; id: string; name: string } | null;
  setDeleteConfirm: (v: any) => void;
  confirmDelete: () => void;
}

export function DeleteConfirmModal({
  deleteConfirm,
  setDeleteConfirm,
  confirmDelete,
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" className="max-w-sm">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 size={16} className="text-red-500" />
          </div>
          <div>
            <p className="text-sm font-black text-zinc-900">Excluir profissional</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tem certeza que deseja excluir <span className="font-bold text-zinc-800">{deleteConfirm?.name}</span>? Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl font-bold border-zinc-200 text-zinc-600 cursor-pointer" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button className="flex-1 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white cursor-pointer" onClick={confirmDelete}>
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  );
}
