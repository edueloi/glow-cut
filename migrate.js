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
  console.log(`✅  Banco '${DB_NAME}' selecionado`);

  // Cria tabela de controle
  await rootConn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id     INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name   VARCHAR(255) NOT NULL UNIQUE,
      ran_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Verifica quais já rodaram
  const [ran] = await rootConn.query(`SELECT name FROM _migrations`);
  const ranNames = new Set(ran.map((r) => r.name));

  let executed = 0;
  let skipped = 0;

  for (const migration of MIGRATIONS) {
    if (migration.name === "001_create_database" || migration.name === "002_create_migrations_table") {
      skipped++;
      continue; // já feito acima
    }

    if (ranNames.has(migration.name)) {
      console.log(`  ⏭   ${migration.name}`);
      skipped++;
      continue;
    }

    try {
      // Executa cada statement separado (mysql2 não aceita múltiplos por padrão sem flag)
      const statements = migration.sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await rootConn.query(stmt);
      }

      await rootConn.query(`INSERT IGNORE INTO _migrations (name) VALUES (?)`, [migration.name]);
      console.log(`  ✅  ${migration.name}`);
      executed++;
    } catch (err) {
      const e = err;
      // Ignora erros de chave duplicada / constraint já existe se marcado
      if (migration.ignoreIfExists && (e.code === "ER_DUP_KEYNAME" || e.code === "ER_FK_DUP_NAME" || e.code === "ER_DUP_FIELDNAME" || e.errno === 1060 || e.errno === 1061 || e.errno === 1826)) {
        await rootConn.query(`INSERT IGNORE INTO _migrations (name) VALUES (?)`, [migration.name]);
        console.log(`  ✅  ${migration.name} (já existia, ignorado)`);
        skipped++;
      } else {
        console.error(`  ❌  ${migration.name} — ERRO: ${e.message}`);
        await rootConn.end();
        process.exit(1);
      }
    }
  }

  await rootConn.end();

  console.log(`\n🎉  Migration concluída!`);
  console.log(`    Executadas : ${executed}`);
  console.log(`    Ignoradas  : ${skipped}`);
  console.log(`\n    Login Super Admin: Admin / super123`);
  console.log(`    Planos criados   : Básico, Pro, Enterprise\n`);
}

run().catch((err) => {
  console.error("❌  Erro fatal:", err.message);
  process.exit(1);
});
