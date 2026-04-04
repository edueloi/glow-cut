-- Adiciona coluna permissions na tabela AdminUser (caso não exista)
ALTER TABLE `AdminUser`
  ADD COLUMN `permissions` VARCHAR(2000) DEFAULT NULL;
