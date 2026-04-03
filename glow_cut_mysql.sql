-- ============================================================
--  GLOW & CUT — Script de criação do banco MySQL
--  Banco  : glow_cut_db
--  Usuário: root
--  Senha  : Edu@06051992
--  Host   : localhost
-- ============================================================

CREATE DATABASE IF NOT EXISTS glow_cut_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE glow_cut_db;

-- ── Profissionais ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Professional (
  id       VARCHAR(36)  NOT NULL PRIMARY KEY,
  name     VARCHAR(255) NOT NULL,
  role     VARCHAR(100),
  password VARCHAR(255)
);

-- ── Clientes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Client (
  id        VARCHAR(36)  NOT NULL PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  phone     VARCHAR(30)  NOT NULL UNIQUE,
  age       INT,
  createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Serviços & Pacotes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Service (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  price        DOUBLE       NOT NULL,
  duration     INT          NOT NULL,
  type         VARCHAR(20)  NOT NULL DEFAULT 'service',
  discount     DOUBLE                DEFAULT 0,
  discountType VARCHAR(20)           DEFAULT 'value'
);

-- ── Relação pacote ↔ serviço ──────────────────────────────────
CREATE TABLE IF NOT EXISTS PackageService (
  id        VARCHAR(36) NOT NULL PRIMARY KEY,
  packageId VARCHAR(36) NOT NULL,
  serviceId VARCHAR(36) NOT NULL,
  quantity  INT         NOT NULL DEFAULT 1,
  CONSTRAINT fk_pkg_package FOREIGN KEY (packageId) REFERENCES Service(id) ON DELETE CASCADE,
  CONSTRAINT fk_pkg_service FOREIGN KEY (serviceId) REFERENCES Service(id) ON DELETE CASCADE
);

-- ── Comandas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Comanda (
  id           VARCHAR(36) NOT NULL PRIMARY KEY,
  status       VARCHAR(20) NOT NULL DEFAULT 'open',
  total        DOUBLE      NOT NULL DEFAULT 0,
  discount     DOUBLE      NOT NULL DEFAULT 0,
  discountType VARCHAR(20) NOT NULL DEFAULT 'value',
  clientId     VARCHAR(36) NOT NULL,
  createdAt    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comanda_client FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE RESTRICT
);

-- ── Agendamentos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Appointment (
  id             VARCHAR(36) NOT NULL PRIMARY KEY,
  date           DATETIME    NOT NULL,
  startTime      VARCHAR(5)  NOT NULL,
  endTime        VARCHAR(5)  NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  type           VARCHAR(20) NOT NULL DEFAULT 'atendimento',
  clientId       VARCHAR(36),
  serviceId      VARCHAR(36),
  professionalId VARCHAR(36) NOT NULL,
  comandaId      VARCHAR(36),
  sessionNumber  INT                  DEFAULT 1,
  totalSessions  INT                  DEFAULT 1,
  createdAt      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appt_client       FOREIGN KEY (clientId)       REFERENCES Client(id)       ON DELETE SET NULL,
  CONSTRAINT fk_appt_service      FOREIGN KEY (serviceId)      REFERENCES Service(id)      ON DELETE SET NULL,
  CONSTRAINT fk_appt_professional FOREIGN KEY (professionalId) REFERENCES Professional(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appt_comanda      FOREIGN KEY (comandaId)      REFERENCES Comanda(id)      ON DELETE SET NULL
);

-- ── Horários de trabalho ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS WorkingHours (
  id             VARCHAR(36) NOT NULL PRIMARY KEY,
  dayOfWeek      INT         NOT NULL,
  isOpen         TINYINT(1)  NOT NULL DEFAULT 1,
  startTime      VARCHAR(5)  NOT NULL DEFAULT '09:00',
  endTime        VARCHAR(5)  NOT NULL DEFAULT '18:00',
  breakStart     VARCHAR(5)  NOT NULL DEFAULT '12:00',
  breakEnd       VARCHAR(5)  NOT NULL DEFAULT '13:00',
  professionalId VARCHAR(36),
  CONSTRAINT fk_wh_professional FOREIGN KEY (professionalId) REFERENCES Professional(id) ON DELETE SET NULL
);

-- ── Dias fechados / feriados ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ClosedDay (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  date        DATETIME    NOT NULL UNIQUE,
  description VARCHAR(255)
);

-- ── Super Admin (dono do SaaS) ────────────────────────────────
CREATE TABLE IF NOT EXISTS SuperAdmin (
  id        VARCHAR(36)  NOT NULL PRIMARY KEY,
  username  VARCHAR(100) NOT NULL UNIQUE,
  password  VARCHAR(255) NOT NULL,
  createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Planos de assinatura ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS Plan (
  id                  VARCHAR(36)  NOT NULL PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  price               DOUBLE       NOT NULL DEFAULT 0,
  maxProfessionals    INT          NOT NULL DEFAULT 3,
  maxAdminUsers       INT          NOT NULL DEFAULT 1,
  canCreateAdminUsers TINYINT(1)   NOT NULL DEFAULT 0,
  canDeleteAccount    TINYINT(1)   NOT NULL DEFAULT 0,
  features            VARCHAR(2000)         DEFAULT '[]',
  isActive            TINYINT(1)   NOT NULL DEFAULT 1,
  createdAt           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  isActive   TINYINT(1)   NOT NULL DEFAULT 1,
  notes      TEXT,
  createdAt  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant_plan FOREIGN KEY (planId) REFERENCES Plan(id) ON DELETE RESTRICT
);

-- ── Usuários Admin ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS AdminUser (
  id               VARCHAR(36)  NOT NULL PRIMARY KEY,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password         VARCHAR(255) NOT NULL,
  role             VARCHAR(20)  NOT NULL DEFAULT 'admin',
  jobTitle         VARCHAR(100),
  bio              TEXT,
  phone            VARCHAR(30),
  canCreateUsers   TINYINT(1)   NOT NULL DEFAULT 0,
  canDeleteAccount TINYINT(1)   NOT NULL DEFAULT 0,
  isActive         TINYINT(1)   NOT NULL DEFAULT 1,
  tenantId         VARCHAR(36)  NOT NULL,
  createdAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastLogin        DATETIME,
  permissions      TEXT,
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
  (UUID(), 'Básico',     49.90,  2,   1,   0, 0, '["Agenda","Clientes","Serviços"]'),
  (UUID(), 'Pro',        99.90,  5,   3,   1, 0, '["Agenda","Clientes","Serviços","Comandas","Fluxo de Caixa","Relatórios"]'),
  (UUID(), 'Enterprise', 199.90, 999, 999, 1, 1, '["Tudo do Pro","Multi-usuários ilimitados","Profissionais ilimitados","Suporte prioritário"]');
