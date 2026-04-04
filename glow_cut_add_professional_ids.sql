-- Adiciona coluna professionalIds na tabela Service
-- Armazena JSON array de IDs dos profissionais que realizam este serviço
ALTER TABLE `Service`
  ADD COLUMN IF NOT EXISTS `professionalIds` VARCHAR(2000) DEFAULT '[]';
