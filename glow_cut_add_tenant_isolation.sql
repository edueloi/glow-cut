-- ============================================================
--  GLOW & CUT — Adiciona tenantId nas tabelas de dados
--  Execute no banco glow_cut_db
-- ============================================================

USE glow_cut_db;

-- Adiciona tenantId em Professional
ALTER TABLE Professional ADD COLUMN tenantId VARCHAR(36) NULL;
ALTER TABLE Professional ADD CONSTRAINT fk_prof_tenant FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE;

-- Adiciona tenantId em Client
ALTER TABLE Client ADD COLUMN tenantId VARCHAR(36) NULL;
ALTER TABLE Client ADD CONSTRAINT fk_client_tenant FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE;

-- Remove unique de phone (cada tenant pode ter o mesmo cliente)
ALTER TABLE Client DROP INDEX phone;
ALTER TABLE Client ADD UNIQUE KEY unique_phone_tenant (phone, tenantId);

-- Adiciona tenantId em Service
ALTER TABLE Service ADD COLUMN tenantId VARCHAR(36) NULL;
ALTER TABLE Service ADD CONSTRAINT fk_service_tenant FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE;

-- Adiciona tenantId em ClosedDay
ALTER TABLE ClosedDay ADD COLUMN tenantId VARCHAR(36) NULL;
ALTER TABLE ClosedDay ADD CONSTRAINT fk_closedday_tenant FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE;

-- Remove unique de date sozinho e cria unique por tenant
ALTER TABLE ClosedDay DROP INDEX date;
ALTER TABLE ClosedDay ADD UNIQUE KEY unique_date_tenant (date, tenantId);
