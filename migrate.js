// ============================================================
//  GLOW & CUT — Migration automática
//  Uso: node migrate.js
//  Cria o banco, todas as tabelas e dados iniciais.
//  Seguro para rodar múltiplas vezes (idempotente).
// ============================================================

import mysql from "mysql2/promise";

const DB_CONFIG = {
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "3306"),
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "Edu@06051992",
  multipleStatements: true,
};

const DB_NAME = process.env.DB_NAME || "glow_cut_db";

// ─────────────────────────────────────────────────────────────
//  SQL de criação do banco e tabelas
// ─────────────────────────────────────────────────────────────
const MIGRATIONS = [

  // 001 — Banco
  {
    name: "001_create_database",
    sql: `
      CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci;
    `,
    useDb: false,
  },

  // 002 — Tabela de controle de migrations
  {
    name: "002_create_migrations_table",
    sql: `
      CREATE TABLE IF NOT EXISTS _migrations (
        id        INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name      VARCHAR(255) NOT NULL UNIQUE,
        ran_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,
  },

  // 003 — Professional
  {
    name: "003_create_professional",
    sql: `
      CREATE TABLE IF NOT EXISTS Professional (
        id       VARCHAR(36)  NOT NULL PRIMARY KEY,
        name     VARCHAR(255) NOT NULL,
        role     VARCHAR(100),
        password VARCHAR(255),
        tenantId VARCHAR(36)  NULL,
        INDEX idx_prof_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 004 — Client
  {
    name: "004_create_client",
    sql: `
      CREATE TABLE IF NOT EXISTS Client (
        id        VARCHAR(36)  NOT NULL PRIMARY KEY,
        name      VARCHAR(255) NOT NULL,
        phone     VARCHAR(30)  NOT NULL,
        age       INT,
        createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tenantId  VARCHAR(36)  NULL,
        UNIQUE KEY unique_phone_tenant (phone, tenantId),
        INDEX idx_client_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 005 — Service
  {
    name: "005_create_service",
    sql: `
      CREATE TABLE IF NOT EXISTS Service (
        id           VARCHAR(36)  NOT NULL PRIMARY KEY,
        name         VARCHAR(255) NOT NULL,
        description  TEXT,
        price        DOUBLE       NOT NULL,
        duration     INT          NOT NULL,
        type         VARCHAR(20)  NOT NULL DEFAULT 'service',
        discount     DOUBLE                DEFAULT 0,
        discountType VARCHAR(20)           DEFAULT 'value',
        tenantId     VARCHAR(36)  NULL,
        INDEX idx_service_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 006 — PackageService
  {
    name: "006_create_package_service",
    sql: `
      CREATE TABLE IF NOT EXISTS PackageService (
        id        VARCHAR(36) NOT NULL PRIMARY KEY,
        packageId VARCHAR(36) NOT NULL,
        serviceId VARCHAR(36) NOT NULL,
        quantity  INT         NOT NULL DEFAULT 1,
        INDEX idx_pkg_package (packageId),
        INDEX idx_pkg_service (serviceId),
        CONSTRAINT fk_pkg_package FOREIGN KEY (packageId) REFERENCES Service(id) ON DELETE CASCADE,
        CONSTRAINT fk_pkg_service FOREIGN KEY (serviceId) REFERENCES Service(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 007 — Comanda
  {
    name: "007_create_comanda",
    sql: `
      CREATE TABLE IF NOT EXISTS Comanda (
        id           VARCHAR(36) NOT NULL PRIMARY KEY,
        status       VARCHAR(20) NOT NULL DEFAULT 'open',
        total        DOUBLE      NOT NULL DEFAULT 0,
        discount     DOUBLE      NOT NULL DEFAULT 0,
        discountType VARCHAR(20) NOT NULL DEFAULT 'value',
        clientId     VARCHAR(36) NOT NULL,
        createdAt    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_comanda_client (clientId),
        CONSTRAINT fk_comanda_client FOREIGN KEY (clientId) REFERENCES Client(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 008 — Appointment
  {
    name: "008_create_appointment",
    sql: `
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
        INDEX idx_appt_client       (clientId),
        INDEX idx_appt_service      (serviceId),
        INDEX idx_appt_professional (professionalId),
        INDEX idx_appt_comanda      (comandaId),
        CONSTRAINT fk_appt_client       FOREIGN KEY (clientId)       REFERENCES Client(id)       ON DELETE SET NULL,
        CONSTRAINT fk_appt_service      FOREIGN KEY (serviceId)      REFERENCES Service(id)      ON DELETE SET NULL,
        CONSTRAINT fk_appt_professional FOREIGN KEY (professionalId) REFERENCES Professional(id) ON DELETE RESTRICT,
        CONSTRAINT fk_appt_comanda      FOREIGN KEY (comandaId)      REFERENCES Comanda(id)      ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 009 — WorkingHours
  {
    name: "009_create_working_hours",
    sql: `
      CREATE TABLE IF NOT EXISTS WorkingHours (
        id             VARCHAR(36) NOT NULL PRIMARY KEY,
        dayOfWeek      INT         NOT NULL,
        isOpen         BOOLEAN     NOT NULL DEFAULT TRUE,
        startTime      VARCHAR(5)  NOT NULL DEFAULT '09:00',
        endTime        VARCHAR(5)  NOT NULL DEFAULT '18:00',
        breakStart     VARCHAR(5)  NOT NULL DEFAULT '12:00',
        breakEnd       VARCHAR(5)  NOT NULL DEFAULT '13:00',
        professionalId VARCHAR(36),
        INDEX idx_wh_professional (professionalId),
        CONSTRAINT fk_wh_professional FOREIGN KEY (professionalId) REFERENCES Professional(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 010 — ClosedDay
  {
    name: "010_create_closed_day",
    sql: `
      CREATE TABLE IF NOT EXISTS ClosedDay (
        id          VARCHAR(36)  NOT NULL PRIMARY KEY,
        date        DATETIME     NOT NULL,
        description VARCHAR(255),
        tenantId    VARCHAR(36)  NULL,
        UNIQUE KEY unique_date_tenant (date, tenantId),
        INDEX idx_closedday_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 011 — SuperAdmin
  {
    name: "011_create_super_admin",
    sql: `
      CREATE TABLE IF NOT EXISTS SuperAdmin (
        id        VARCHAR(36)  NOT NULL PRIMARY KEY,
        username  VARCHAR(100) NOT NULL UNIQUE,
        password  VARCHAR(255) NOT NULL,
        createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 012 — Plan
  {
    name: "012_create_plan",
    sql: `
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 013 — Tenant
  {
    name: "013_create_tenant",
    sql: `
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
        INDEX idx_tenant_plan (planId),
        CONSTRAINT fk_tenant_plan FOREIGN KEY (planId) REFERENCES Plan(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 014 — AdminUser
  {
    name: "014_create_admin_user",
    sql: `
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
        INDEX idx_adminuser_tenant (tenantId),
        CONSTRAINT fk_adminuser_tenant FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 015 — User (legacy)
  {
    name: "015_create_user",
    sql: `
      CREATE TABLE IF NOT EXISTS \`User\` (
        id       VARCHAR(36)  NOT NULL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role     VARCHAR(20)  NOT NULL DEFAULT 'admin'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 016 — Foreign keys de Professional e ClosedDay para Tenant (adicionadas depois)
  {
    name: "016_add_tenant_fk_professional",
    sql: `
      ALTER TABLE Professional
        ADD CONSTRAINT fk_prof_tenant
        FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE;
    `,
    ignoreIfExists: true,
  },

  {
    name: "017_add_tenant_fk_client",
    sql: `
      ALTER TABLE Client
        ADD CONSTRAINT fk_client_tenant
        FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE;
    `,
    ignoreIfExists: true,
  },

  {
    name: "018_add_tenant_fk_service",
    sql: `
      ALTER TABLE Service
        ADD CONSTRAINT fk_service_tenant
        FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE;
    `,
    ignoreIfExists: true,
  },

  {
    name: "019_add_tenant_fk_closedday",
    sql: `
      ALTER TABLE ClosedDay
        ADD CONSTRAINT fk_closedday_tenant
        FOREIGN KEY (tenantId) REFERENCES Tenant(id) ON DELETE CASCADE;
    `,
    ignoreIfExists: true,
  },

  // 020 — Dados iniciais: Super Admin
  {
    name: "020_seed_super_admin",
    sql: `
      INSERT IGNORE INTO SuperAdmin (id, username, password)
      VALUES (UUID(), 'Admin', 'super123');
    `,
  },

  // 021 — Dados iniciais: Planos
  {
    name: "021_seed_plans",
    sql: `
      INSERT IGNORE INTO Plan (id, name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features)
      SELECT UUID(), 'Básico', 49.90, 2, 1, FALSE, FALSE, '["Agenda","Clientes","Serviços"]'
      WHERE NOT EXISTS (SELECT 1 FROM Plan WHERE name = 'Básico');

      INSERT IGNORE INTO Plan (id, name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features)
      SELECT UUID(), 'Pro', 99.90, 5, 3, TRUE, FALSE, '["Agenda","Clientes","Serviços","Comandas","Fluxo de Caixa","Relatórios"]'
      WHERE NOT EXISTS (SELECT 1 FROM Plan WHERE name = 'Pro');

      INSERT IGNORE INTO Plan (id, name, price, maxProfessionals, maxAdminUsers, canCreateAdminUsers, canDeleteAccount, features)
      SELECT UUID(), 'Enterprise', 199.90, 999, 999, TRUE, TRUE, '["Tudo do Pro","Multi-usuários ilimitados","Profissionais ilimitados","Suporte prioritário"]'
      WHERE NOT EXISTS (SELECT 1 FROM Plan WHERE name = 'Enterprise');
    `,
  },
  // 022 — Novos campos: Comanda (clientId nullable + novas colunas)
  {
    name: '022_comanda_clientId_nullable',
    sql: `ALTER TABLE Comanda MODIFY COLUMN clientId VARCHAR(36) NULL`,
  },
  {
    name: '022b_comanda_add_tenantId',
    sql: `ALTER TABLE Comanda ADD COLUMN tenantId VARCHAR(36) NULL AFTER clientId`,
    ignoreIfExists: true,
  },
  {
    name: '022c_comanda_add_professionalId',
    sql: `ALTER TABLE Comanda ADD COLUMN professionalId VARCHAR(36) NULL AFTER tenantId`,
    ignoreIfExists: true,
  },
  {
    name: '022d_comanda_add_description',
    sql: `ALTER TABLE Comanda ADD COLUMN description VARCHAR(1000) NULL AFTER professionalId`,
    ignoreIfExists: true,
  },
  {
    name: '022e_comanda_add_paymentMethod',
    sql: `ALTER TABLE Comanda ADD COLUMN paymentMethod VARCHAR(30) NULL AFTER description`,
    ignoreIfExists: true,
  },
  {
    name: '022f_comanda_add_sessionCount',
    sql: `ALTER TABLE Comanda ADD COLUMN sessionCount INT NOT NULL DEFAULT 1 AFTER paymentMethod`,
    ignoreIfExists: true,
  },
  {
    name: '022g_comanda_add_type',
    sql: `ALTER TABLE Comanda ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'normal' AFTER sessionCount`,
    ignoreIfExists: true,
  },
  {
    name: '022h_comanda_idx_tenant',
    sql: `CREATE INDEX idx_comanda_tenant ON Comanda(tenantId)`,
    ignoreIfExists: true,
  },
  {
    name: '022i_comanda_idx_prof',
    sql: `CREATE INDEX idx_comanda_prof ON Comanda(professionalId)`,
    ignoreIfExists: true,
  },

  // 023 — Novos campos: Appointment
  {
    name: '023a_appointment_add_duration',
    sql: `ALTER TABLE Appointment ADD COLUMN duration INT NOT NULL DEFAULT 60 AFTER totalSessions`,
    ignoreIfExists: true,
  },
  {
    name: '023b_appointment_add_notes',
    sql: `ALTER TABLE Appointment ADD COLUMN notes VARCHAR(2000) NULL AFTER duration`,
    ignoreIfExists: true,
  },
  {
    name: '023c_appointment_add_tenantId',
    sql: `ALTER TABLE Appointment ADD COLUMN tenantId VARCHAR(36) NULL AFTER notes`,
    ignoreIfExists: true,
  },
  {
    name: '023d_appointment_idx_tenant',
    sql: `CREATE INDEX idx_appt_tenant ON Appointment(tenantId)`,
    ignoreIfExists: true,
  },

  // 024 — Tenant: expiresAt + maxAdminUsersOverride + blockedAt
  {
    name: '024a_tenant_add_expiresAt',
    sql: `ALTER TABLE Tenant ADD COLUMN expiresAt DATETIME NULL AFTER isActive`,
    ignoreIfExists: true,
  },
  {
    name: '024b_tenant_add_blockedAt',
    sql: `ALTER TABLE Tenant ADD COLUMN blockedAt DATETIME NULL AFTER expiresAt`,
    ignoreIfExists: true,
  },
  {
    name: '024c_tenant_add_maxAdminUsersOverride',
    sql: `ALTER TABLE Tenant ADD COLUMN maxAdminUsersOverride INT NULL AFTER blockedAt`,
    ignoreIfExists: true,
  },

  // 025 — Professional: novos campos
  {
    name: '025a_professional_add_phone',
    sql: `ALTER TABLE Professional ADD COLUMN phone VARCHAR(30) NULL AFTER password`,
    ignoreIfExists: true,
  },
  {
    name: '025b_professional_add_email',
    sql: `ALTER TABLE Professional ADD COLUMN email VARCHAR(255) NULL AFTER phone`,
    ignoreIfExists: true,
  },
  {
    name: '025c_professional_add_bio',
    sql: `ALTER TABLE Professional ADD COLUMN bio VARCHAR(1000) NULL AFTER email`,
    ignoreIfExists: true,
  },
  {
    name: '025d_professional_add_photo',
    sql: `ALTER TABLE Professional ADD COLUMN photo TEXT NULL AFTER bio`,
    ignoreIfExists: true,
  },
  {
    name: '025e_professional_add_permissions',
    sql: `ALTER TABLE Professional ADD COLUMN permissions VARCHAR(2000) NULL DEFAULT '{}' AFTER photo`,
    ignoreIfExists: true,
  },
  {
    name: '025f_professional_add_isActive',
    sql: `ALTER TABLE Professional ADD COLUMN isActive TINYINT(1) NOT NULL DEFAULT 1 AFTER permissions`,
    ignoreIfExists: true,
  },

  // 026 - Service: campos extras usados pelo painel
  {
    name: '026a_service_add_photo',
    sql: `ALTER TABLE Service ADD COLUMN photo TEXT NULL AFTER tenantId`,
    ignoreIfExists: true,
  },
  {
    name: '026b_service_add_professionalIds',
    sql: `ALTER TABLE Service ADD COLUMN professionalIds VARCHAR(2000) NULL DEFAULT '[]' AFTER photo`,
    ignoreIfExists: true,
  },
  {
    name: '026c_service_add_createdAt',
    sql: `ALTER TABLE Service ADD COLUMN createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER professionalIds`,
    ignoreIfExists: true,
  },

  // 027 - Product
  {
    name: '027_create_product',
    sql: `
      CREATE TABLE IF NOT EXISTS Product (
        id         VARCHAR(36)  NOT NULL PRIMARY KEY,
        name       VARCHAR(255) NOT NULL,
        description TEXT NULL,
        photo      TEXT NULL,
        costPrice  DOUBLE       NOT NULL DEFAULT 0,
        salePrice  DOUBLE       NOT NULL DEFAULT 0,
        stock      INT          NOT NULL DEFAULT 0,
        minStock   INT          NOT NULL DEFAULT 0,
        validUntil DATETIME     NULL,
        code       VARCHAR(100) NULL,
        isForSale  BOOLEAN      NOT NULL DEFAULT TRUE,
        tenantId   VARCHAR(36)  NULL,
        metadata   TEXT NULL,
        createdAt  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 028 - ComandaItem
  {
    name: '028_create_comandaitem',
    sql: `
      CREATE TABLE IF NOT EXISTS ComandaItem (
        id        VARCHAR(36)  NOT NULL PRIMARY KEY,
        comandaId VARCHAR(36)  NOT NULL,
        productId VARCHAR(36)  NULL,
        serviceId VARCHAR(36)  NULL,
        name      VARCHAR(255) NOT NULL,
        price     DOUBLE       NOT NULL DEFAULT 0,
        quantity  INT          NOT NULL DEFAULT 1,
        total     DOUBLE       NOT NULL DEFAULT 0,
        createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_comandaitem_comanda (comandaId),
        INDEX idx_comandaitem_product (productId),
        INDEX idx_comandaitem_service (serviceId),
        CONSTRAINT fk_comandaitem_comanda FOREIGN KEY (comandaId) REFERENCES Comanda(id) ON DELETE CASCADE,
        CONSTRAINT fk_comandaitem_product FOREIGN KEY (productId) REFERENCES Product(id) ON DELETE SET NULL,
        CONSTRAINT fk_comandaitem_service FOREIGN KEY (serviceId) REFERENCES Service(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 029 - Appointment: recorrencia
  {
    name: '029_appointment_add_repeatGroupId',
    sql: `ALTER TABLE Appointment ADD COLUMN repeatGroupId VARCHAR(36) NULL AFTER totalSessions`,
    ignoreIfExists: true,
  },

  // 030 - Tenant: personalizacao da pagina publica
  {
    name: '030a_tenant_add_themeColor',
    sql: `ALTER TABLE Tenant ADD COLUMN themeColor VARCHAR(20) NULL AFTER maxAdminUsersOverride`,
    ignoreIfExists: true,
  },
  {
    name: '030b_tenant_add_logoUrl',
    sql: `ALTER TABLE Tenant ADD COLUMN logoUrl TEXT NULL AFTER themeColor`,
    ignoreIfExists: true,
  },
  {
    name: '030c_tenant_add_coverUrl',
    sql: `ALTER TABLE Tenant ADD COLUMN coverUrl TEXT NULL AFTER logoUrl`,
    ignoreIfExists: true,
  },
  {
    name: '030d_tenant_add_address',
    sql: `ALTER TABLE Tenant ADD COLUMN address TEXT NULL AFTER coverUrl`,
    ignoreIfExists: true,
  },
  {
    name: '030e_tenant_add_instagram',
    sql: `ALTER TABLE Tenant ADD COLUMN instagram VARCHAR(100) NULL AFTER address`,
    ignoreIfExists: true,
  },
  {
    name: '030f_tenant_add_welcomeMessage',
    sql: `ALTER TABLE Tenant ADD COLUMN welcomeMessage TEXT NULL AFTER instagram`,
    ignoreIfExists: true,
  },

  // 030g - Tenant: description (SEO / redes sociais)
  {
    name: '030g_tenant_add_description',
    sql: `ALTER TABLE Tenant ADD COLUMN description TEXT NULL AFTER welcomeMessage`,
    ignoreIfExists: true,
  },

  // 031 - WppBotConfig
  {
    name: '031_create_wpp_bot_config',
    sql: `
      CREATE TABLE IF NOT EXISTS WppBotConfig (
        id               VARCHAR(36) NOT NULL PRIMARY KEY,
        tenantId         VARCHAR(36) NOT NULL UNIQUE,
        botEnabled       BOOLEAN     NOT NULL DEFAULT FALSE,
        sendConfirmation BOOLEAN     NOT NULL DEFAULT TRUE,
        sendReminder24h  BOOLEAN     NOT NULL DEFAULT TRUE,
        sendBirthday     BOOLEAN     NOT NULL DEFAULT TRUE,
        sendCobranca     BOOLEAN     NOT NULL DEFAULT FALSE,
        sendWelcome      BOOLEAN     NOT NULL DEFAULT TRUE,
        menuEnabled      BOOLEAN     NOT NULL DEFAULT FALSE,
        menuWelcomeMsg   TEXT NULL,
        menuOptions      TEXT NULL,
        createdAt        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 032 - WppMessageTemplate
  {
    name: '032_create_wpp_message_template',
    sql: `
      CREATE TABLE IF NOT EXISTS WppMessageTemplate (
        id        VARCHAR(36)  NOT NULL PRIMARY KEY,
        tenantId  VARCHAR(36)  NOT NULL,
        type      VARCHAR(50)  NOT NULL,
        name      VARCHAR(255) NOT NULL,
        body      TEXT         NOT NULL,
        isActive  BOOLEAN      NOT NULL DEFAULT TRUE,
        isDefault BOOLEAN      NOT NULL DEFAULT FALSE,
        createdAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_wpp_template_tenant_type (tenantId, type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 033 - Comanda: detalhes de pagamento
  {
    name: '033_comanda_add_payment_details',
    sql: `ALTER TABLE Comanda ADD COLUMN paymentDetails TEXT NULL AFTER paymentMethod`,
    ignoreIfExists: true,
  },

  // 034 - Client: campos completos usados no frontend
  { name: '034_client_add_email',          sql: `ALTER TABLE Client ADD COLUMN email VARCHAR(255) NULL AFTER age`, ignoreIfExists: true },
  { name: '034_client_add_cpf',            sql: `ALTER TABLE Client ADD COLUMN cpf VARCHAR(20) NULL AFTER email`, ignoreIfExists: true },
  { name: '034_client_add_birthDate',      sql: `ALTER TABLE Client ADD COLUMN birthDate VARCHAR(10) NULL AFTER cpf`, ignoreIfExists: true },
  { name: '034_client_add_gender',         sql: `ALTER TABLE Client ADD COLUMN gender VARCHAR(30) NULL AFTER birthDate`, ignoreIfExists: true },
  { name: '034_client_add_whatsapp',       sql: `ALTER TABLE Client ADD COLUMN whatsapp BOOLEAN NOT NULL DEFAULT TRUE AFTER gender`, ignoreIfExists: true },
  { name: '034_client_add_cep',            sql: `ALTER TABLE Client ADD COLUMN cep VARCHAR(10) NULL AFTER whatsapp`, ignoreIfExists: true },
  { name: '034_client_add_street',         sql: `ALTER TABLE Client ADD COLUMN street VARCHAR(255) NULL AFTER cep`, ignoreIfExists: true },
  { name: '034_client_add_number',         sql: `ALTER TABLE Client ADD COLUMN number VARCHAR(30) NULL AFTER street`, ignoreIfExists: true },
  { name: '034_client_add_complement',     sql: `ALTER TABLE Client ADD COLUMN complement VARCHAR(255) NULL AFTER number`, ignoreIfExists: true },
  { name: '034_client_add_neighborhood',   sql: `ALTER TABLE Client ADD COLUMN neighborhood VARCHAR(255) NULL AFTER complement`, ignoreIfExists: true },
  { name: '034_client_add_city',           sql: `ALTER TABLE Client ADD COLUMN city VARCHAR(100) NULL AFTER neighborhood`, ignoreIfExists: true },
  { name: '034_client_add_state',          sql: `ALTER TABLE Client ADD COLUMN state VARCHAR(10) NULL AFTER city`, ignoreIfExists: true },
  { name: '034_client_add_hasChildren',    sql: `ALTER TABLE Client ADD COLUMN hasChildren BOOLEAN NOT NULL DEFAULT FALSE AFTER state`, ignoreIfExists: true },
  { name: '034_client_add_isMarried',      sql: `ALTER TABLE Client ADD COLUMN isMarried BOOLEAN NOT NULL DEFAULT FALSE AFTER hasChildren`, ignoreIfExists: true },
  { name: '034_client_add_spouseName',     sql: `ALTER TABLE Client ADD COLUMN spouseName VARCHAR(255) NULL AFTER isMarried`, ignoreIfExists: true },
  { name: '034_client_add_maritalStatus',  sql: `ALTER TABLE Client ADD COLUMN maritalStatus VARCHAR(50) NULL AFTER spouseName`, ignoreIfExists: true },
  { name: '034_client_add_education',      sql: `ALTER TABLE Client ADD COLUMN education VARCHAR(50) NULL AFTER maritalStatus`, ignoreIfExists: true },
  { name: '034_client_add_notes',          sql: `ALTER TABLE Client ADD COLUMN notes TEXT NULL AFTER education`, ignoreIfExists: true },

  // 035 - Professional: campos completos usados no frontend
  { name: '035_prof_add_nickname',               sql: `ALTER TABLE Professional ADD COLUMN nickname VARCHAR(100) NULL AFTER name`, ignoreIfExists: true },
  { name: '035_prof_add_cpf',                    sql: `ALTER TABLE Professional ADD COLUMN cpf VARCHAR(20) NULL AFTER password`, ignoreIfExists: true },
  { name: '035_prof_add_gender',                 sql: `ALTER TABLE Professional ADD COLUMN gender VARCHAR(20) NULL AFTER cpf`, ignoreIfExists: true },
  { name: '035_prof_add_birthDate',              sql: `ALTER TABLE Professional ADD COLUMN birthDate VARCHAR(10) NULL AFTER gender`, ignoreIfExists: true },
  { name: '035_prof_add_instagram',              sql: `ALTER TABLE Professional ADD COLUMN instagram VARCHAR(255) NULL AFTER email`, ignoreIfExists: true },
  { name: '035_prof_add_accessLevel',            sql: `ALTER TABLE Professional ADD COLUMN accessLevel VARCHAR(20) NOT NULL DEFAULT 'no-access' AFTER permissions`, ignoreIfExists: true },
  { name: '035_prof_add_patAccess',              sql: `ALTER TABLE Professional ADD COLUMN patAccess BOOLEAN NOT NULL DEFAULT FALSE AFTER accessLevel`, ignoreIfExists: true },
  { name: '035_prof_add_canAddServicePhotos',    sql: `ALTER TABLE Professional ADD COLUMN canAddServicePhotos BOOLEAN NOT NULL DEFAULT FALSE AFTER patAccess`, ignoreIfExists: true },

  // 036 - Sector
  {
    name: '036_create_sector',
    sql: `
      CREATE TABLE IF NOT EXISTS Sector (
        id        VARCHAR(36)  NOT NULL PRIMARY KEY,
        tenantId  VARCHAR(36)  NOT NULL,
        name      VARCHAR(100) NOT NULL,
        color     VARCHAR(20)  NOT NULL DEFAULT '#6b7280',
        createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_sector_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 037 - CashEntry
  {
    name: '037_create_cash_entry',
    sql: `
      CREATE TABLE IF NOT EXISTS CashEntry (
        id          VARCHAR(36)  NOT NULL PRIMARY KEY,
        tenantId    VARCHAR(36)  NOT NULL,
        type        VARCHAR(20)  NOT NULL DEFAULT 'income',
        category    VARCHAR(100) NULL,
        description VARCHAR(500) NULL,
        amount      DOUBLE       NOT NULL DEFAULT 0,
        date        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        comandaId   VARCHAR(36)  NULL,
        createdAt   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_cashentry_tenant (tenantId),
        INDEX idx_cashentry_comanda (comandaId),
        INDEX idx_cashentry_tenant_date (tenantId, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 038 - ServiceConsumption
  {
    name: '038_create_service_consumption',
    sql: `
      CREATE TABLE IF NOT EXISTS ServiceConsumption (
        id        VARCHAR(36) NOT NULL PRIMARY KEY,
        serviceId VARCHAR(36) NOT NULL,
        productId VARCHAR(36) NOT NULL,
        quantity  DOUBLE      NOT NULL DEFAULT 1,
        tenantId  VARCHAR(36) NOT NULL,
        INDEX idx_serviceconsumption_service (serviceId),
        INDEX idx_serviceconsumption_product (productId),
        INDEX idx_serviceconsumption_tenant (tenantId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 039 - WppInstance
  {
    name: '039_create_wpp_instance',
    sql: `
      CREATE TABLE IF NOT EXISTS WppInstance (
        id           VARCHAR(36)  NOT NULL PRIMARY KEY,
        tenantId     VARCHAR(36)  NOT NULL UNIQUE,
        instanceName VARCHAR(120) NOT NULL,
        apiUrl       VARCHAR(500) NOT NULL,
        apiKey       VARCHAR(255) NULL,
        phone        VARCHAR(30)  NULL,
        status       VARCHAR(30)  NOT NULL DEFAULT 'not_configured',
        qrCode       TEXT NULL,
        isActive     BOOLEAN      NOT NULL DEFAULT FALSE,
        createdAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  },

  // 040 - Tenant: onboarding
  {
    name: '040_tenant_add_onboarding',
    sql: `ALTER TABLE Tenant ADD COLUMN onboardingStep INT NOT NULL DEFAULT 0, ADD COLUMN segment VARCHAR(50) NULL`,
    ignoreIfExists: true,
  },

];

// ─────────────────────────────────────────────────────────────
//  Runner
// ─────────────────────────────────────────────────────────────
async function run() {
  console.log("\n🚀  Glow & Cut — Migration\n");

  // Conecta sem banco para criar o banco
  const rootConn = await mysql.createConnection(DB_CONFIG);
  console.log("✅  Conectado ao MySQL");

  // Cria o banco
  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.query(`USE \`${DB_NAME}\``);

  // Reconecta com o banco selecionado
  await rootConn.end();
  const conn = await mysql.createConnection({ ...DB_CONFIG, database: DB_NAME });
  console.log("\uD83D\uDCBE  Banco selecionado: " + DB_NAME);

  // Garante que a tabela de controle existe antes de tudo
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id     INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name   VARCHAR(255) NOT NULL UNIQUE,
      ran_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  let ran = 0, skipped = 0, errors = 0;

  for (const m of MIGRATIONS) {
    if (m.useDb === false) { skipped++; continue; }
    try {
      // Verifica se ja foi executada
      const [rows] = await conn.query("SELECT id FROM _migrations WHERE name = ?", [m.name]);
      if (rows.length > 0) { skipped++; continue; }

      await conn.query(m.sql);
      await conn.query("INSERT INTO _migrations (name) VALUES (?)", [m.name]);
      console.log("  \u2705  " + m.name);
      ran++;
    } catch (err) {
      const errMessage = String(err?.message || "");
      if (
        m.ignoreIfExists &&
        (
          err?.code === "ER_DUP_FIELDNAME" ||
          err?.code === "ER_TABLE_EXISTS_ERROR" ||
          err?.code === "ER_DUP_KEYNAME" ||
          err?.code === "ER_FK_DUP_NAME" ||
          errMessage.includes("Duplicate column") ||
          errMessage.includes("Duplicate key name") ||
          errMessage.includes("already exists")
        )
      ) {
        await conn.query("INSERT IGNORE INTO _migrations (name) VALUES (?)", [m.name]);
        skipped++;
      } else {
        console.error("  \u274C  " + m.name + ": " + err.message);
        errors++;
      }
    }
  }

  await conn.end();
  console.log("\n\u2728  Conclu\u00EDdo: " + ran + " executadas, " + skipped + " j\u00E1 aplicadas, " + errors + " erros\n");
  if (errors > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
