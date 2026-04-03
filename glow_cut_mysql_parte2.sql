-- ============================================================
--  GLOW & CUT — Parte 2 (rodar após a parte 1 já ter criado o banco)
--  Execute este script no banco glow_cut_db
-- ============================================================

USE glow_cut_db;

-- ── Planos de assinatura ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS Plan (
  id                  VARCHAR(36)   NOT NULL PRIMARY KEY,
  name                VARCHAR(100)  NOT NULL,
  price               DOUBLE        NOT NULL DEFAULT 0,
  maxProfessionals    INT           NOT NULL DEFAULT 3,
  maxAdminUsers       INT           NOT NULL DEFAULT 1,
  canCreateAdminUsers BOOLEAN       NOT NULL DEFAULT FALSE,
  canDeleteAccount    BOOLEAN       NOT NULL DEFAULT FALSE,
  features            VARCHAR(2000)          DEFAULT '[]',
  isActive            BOOLEAN       NOT NULL DEFAULT TRUE,
  createdAt           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Parceiros / Tenants ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS Tenant (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  ownerName  VARCHAR(255) NOT NULL,
  ownerEmail VARCHAR(255) NOT NULL,
  ownerPhone VARCHAR(30),
  planId     VARCHAR(36)  NOT NULL,
  isActive   BOOLEAN      NOT NULL DEFAULT TRUE,
  notes      VARCHAR(1000),
  createdAt  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant_plan FOREIGN KEY (planId) REFERENCES Plan(id) ON DELETE RESTRICT
);

-- ── Usuários Admin ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS AdminUser (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY,
  name             VARCHAR(255)  NOT NULL,
  email            VARCHAR(255)  NOT NULL UNIQUE,
  password         VARCHAR(255)  NOT NULL,
  role             VARCHAR(20)   NOT NULL DEFAULT 'admin',
  jobTitle         VARCHAR(100),
  bio              VARCHAR(1000),
  phone            VARCHAR(30),
  canCreateUsers   BOOLEAN       NOT NULL DEFAULT FALSE,
  canDeleteAccount BOOLEAN       NOT NULL DEFAULT FALSE,
  isActive         BOOLEAN       NOT NULL DEFAULT TRUE,
  tenantId         VARCHAR(36)   NOT NULL,
  createdAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastLogin        DATETIME,
  permissions      VARCHAR(4000),
  CONSTRAINT fk_adminuser_tenant FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE RESTRICT
);

-- ── Legacy User ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS User (
  id       VARCHAR(36)  NOT NULL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role     VARCHAR(20)  NOT NULL DEFAULT 'admin'
);

-- ============================================================
--  DADOS INICIAIS
-- ============================================================

-- Super Admin (login: Admin / super123)
INSERT IGNORE INTO SuperAdmin (id, username, password)
VALUES (UUID(), 'Admin', 'super123');

-- Planos padrão
INSERT IGNORE INTO Plan (id, name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features)
VALUES
  (UUID(), 'Básico',     49.90,  2,   1,   FALSE, FALSE, '["Agenda","Clientes","Serviços"]'),
  (UUID(), 'Pro',        99.90,  5,   3,   TRUE,  FALSE, '["Agenda","Clientes","Serviços","Comandas","Fluxo de Caixa","Relatórios"]'),
  (UUID(), 'Enterprise', 199.90, 999, 999, TRUE,  TRUE,  '["Tudo do Pro","Multi-usuários ilimitados","Profissionais ilimitados","Suporte prioritário"]');
