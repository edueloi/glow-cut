import React from "react";
import { Button } from "@/src/components/ui/Button";
import { Modal, ModalFooter } from "@/src/components/ui/Modal";
import { Input, Textarea, Select } from "@/src/components/ui/Input";
import { DatePicker } from "@/src/components/ui/DatePicker";
import { maskPhone, maskCPF } from "@/src/lib/masks";

interface ClientModalProps {
  isClientModalOpen: boolean;
  setIsClientModalOpen: (v: boolean) => void;
  editingClient: any;
  setEditingClient: (v: any) => void;
  newClient: any;
  setNewClient: (v: any) => void;
  handleCreateClient: () => void;
  emptyClient: any;
}

const GENDER_OPTIONS = [
  { value: "Feminino", label: "Feminino" },
  { value: "Masculino", label: "Masculino" },
  { value: "Outro", label: "Outro" },
  { value: "Prefere não informar", label: "Prefere não informar" },
];

export function ClientModal({
  isClientModalOpen,
  setIsClientModalOpen,
  editingClient,
  setEditingClient,
  newClient,
  setNewClient,
  handleCreateClient,
  emptyClient,
}: ClientModalProps) {
  const handleClose = () => {
    setIsClientModalOpen(false);
    setEditingClient(null);
    setNewClient({ ...emptyClient });
  };

  const footer = (
    <ModalFooter>
      <Button
        variant="outline"
        size="md"
        onClick={handleClose}
        className="w-full sm:w-auto"
      >
        Cancelar
      </Button>
      <Button
        variant="primary"
        size="lg"
        onClick={handleCreateClient}
        disabled={!newClient.name}
        className="w-full sm:w-auto"
      >
        {editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}
      </Button>
    </ModalFooter>
  );

  return (
    <Modal
      isOpen={isClientModalOpen}
      onClose={handleClose}
      title={editingClient ? "Editar Cliente" : "Novo Cliente"}
      size="lg"
      mobileStyle="fullscreen"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Row 1: Name and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome Completo *"
            placeholder="Ex: Maria Silva"
            value={newClient.name || ""}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
          />
          <Input
            label="Telefone / WhatsApp"
            type="tel"
            placeholder="(00) 00000-0000"
            value={newClient.phone || ""}
            onChange={(e) =>
              setNewClient({ ...newClient, phone: maskPhone(e.target.value) })
            }
            maxLength={15}
          />
        </div>

        {/* Row 2: Email and CPF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="email@exemplo.com"
            value={newClient.email || ""}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
          />
          <Input
            label="CPF"
            placeholder="000.000.000-00"
            value={newClient.cpf || ""}
            onChange={(e) =>
              setNewClient({ ...newClient, cpf: maskCPF(e.target.value) })
            }
            maxLength={14}
          />
        </div>

        {/* Row 3: BirthDate and Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DatePicker
            label="Data de Nascimento"
            value={newClient.birthDate || null}
            onChange={(v) => setNewClient({ ...newClient, birthDate: v || "" })}
            placeholder="DD/MM/AAAA"
            max={new Date().toISOString().slice(0, 10)}
          />
          <Select
            label="Gênero"
            value={newClient.gender || ""}
            onChange={(e) => setNewClient({ ...newClient, gender: e.target.value })}
            options={GENDER_OPTIONS}
          />
        </div>

        {/* Row 4: Cidade and Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Cidade"
            placeholder="Ex: São Paulo"
            value={newClient.city || ""}
            onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
          />
          <Input
            label="Estado"
            placeholder="Ex: SP"
            value={newClient.state || ""}
            onChange={(e) => setNewClient({ ...newClient, state: e.target.value })}
          />
        </div>

        {/* Observações */}
        <Textarea
          label="Observações"
          placeholder="Anotações sobre o cliente, preferências, etc..."
          value={newClient.notes || ""}
          onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
          rows={3}
        />
      </div>
    </Modal>
  );
}
