-- ============================================================
--  GLOW & CUT — Script de MIGRAÇÃO (compatível MySQL 5.7+)
--  Usa INFORMATION_SCHEMA para verificar antes de adicionar.
--  Seguro rodar múltiplas vezes.
-- ============================================================

USE glow_cut_db;

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

DELIMITER $$
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName   VARCHAR(128),
    IN columnName  VARCHAR(128),
    IN columnDef   TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = tableName
          AND COLUMN_NAME  = columnName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$
DELIMITER ;

-- ── Professional ─────────────────────────────────────────────
CALL AddColumnIfNotExists('Professional', 'phone',       'VARCHAR(30) NULL');
CALL AddColumnIfNotExists('Professional', 'email',       'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('Professional', 'bio',         'VARCHAR(1000) NULL');
CALL AddColumnIfNotExists('Professional', 'photo',       'TEXT NULL');
CALL AddColumnIfNotExists('Professional', 'permissions', 'VARCHAR(2000) DEFAULT "{}"');
CALL AddColumnIfNotExists('Professional', 'isActive',    'TINYINT(1) NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('Professional', 'tenantId',    'VARCHAR(36) NULL');

-- ── Client ───────────────────────────────────────────────────
CALL AddColumnIfNotExists('Client', 'tenantId',      'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('Client', 'whatsapp',      'TINYINT(1) NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('Client', 'cpf',           'VARCHAR(30) NULL');
CALL AddColumnIfNotExists('Client', 'birthDate',     'VARCHAR(20) NULL');
CALL AddColumnIfNotExists('Client', 'email',         'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('Client', 'cep',           'VARCHAR(20) NULL');
CALL AddColumnIfNotExists('Client', 'street',        'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('Client', 'number',        'VARCHAR(30) NULL');
CALL AddColumnIfNotExists('Client', 'complement',    'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('Client', 'neighborhood',  'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('Client', 'city',          'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('Client', 'state',         'VARCHAR(10) NULL');
CALL AddColumnIfNotExists('Client', 'hasChildren',   'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('Client', 'isMarried',     'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('Client', 'spouseName',    'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('Client', 'maritalStatus', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('Client', 'education',     'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('Client', 'notes',         'TEXT NULL');

-- ── Service ──────────────────────────────────────────────────
CALL AddColumnIfNotExists('Service', 'tenantId',        'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('Service', 'professionalIds', 'VARCHAR(2000) DEFAULT "[]"');

-- ── Comanda ──────────────────────────────────────────────────
CALL AddColumnIfNotExists('Comanda', 'tenantId',       'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('Comanda', 'professionalId', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('Comanda', 'description',    'VARCHAR(1000) NULL');
CALL AddColumnIfNotExists('Comanda', 'paymentMethod',  'VARCHAR(30) NULL');
CALL AddColumnIfNotExists('Comanda', 'sessionCount',   'INT DEFAULT 1');
CALL AddColumnIfNotExists('Comanda', 'type',           'VARCHAR(20) DEFAULT "normal"');

-- ── Appointment ──────────────────────────────────────────────
CALL AddColumnIfNotExists('Appointment', 'tenantId', 'VARCHAR(36) NULL');
CALL AddColumnIfNotExists('Appointment', 'duration', 'INT DEFAULT 60');
CALL AddColumnIfNotExists('Appointment', 'notes',    'VARCHAR(2000) NULL');

-- ── ClosedDay ────────────────────────────────────────────────
CALL AddColumnIfNotExists('ClosedDay', 'tenantId', 'VARCHAR(36) NULL');

-- ── Tenant ───────────────────────────────────────────────────
CALL AddColumnIfNotExists('Tenant', 'expiresAt',             'DATETIME NULL');
CALL AddColumnIfNotExists('Tenant', 'blockedAt',             'DATETIME NULL');
CALL AddColumnIfNotExists('Tenant', 'maxAdminUsersOverride', 'INT NULL');

-- ── AdminUser ────────────────────────────────────────────────
CALL AddColumnIfNotExists('AdminUser', 'permissions', 'TEXT NULL');

-- ── Índices (ignora erro se já existirem) ────────────────────
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;

DELIMITER $$
CREATE PROCEDURE CreateIndexIfNotExists(
    IN tableName VARCHAR(128),
    IN indexName VARCHAR(128),
    IN indexDef  TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = tableName
          AND INDEX_NAME   = indexName
    ) THEN
        SET @sql = CONCAT('CREATE INDEX `', indexName, '` ON `', tableName, '` ', indexDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$
DELIMITER ;

CALL CreateIndexIfNotExists('Professional', 'idx_professional_tenant', '(`tenantId`)');
CALL CreateIndexIfNotExists('Client',       'idx_client_tenant',       '(`tenantId`)');
CALL CreateIndexIfNotExists('Service',      'idx_service_tenant',      '(`tenantId`)');
CALL CreateIndexIfNotExists('Comanda',      'idx_comanda_tenant',      '(`tenantId`)');
CALL CreateIndexIfNotExists('Comanda',      'idx_comanda_professional', '(`professionalId`)');
CALL CreateIndexIfNotExists('Appointment',  'idx_appt_tenant',         '(`tenantId`)');
CALL CreateIndexIfNotExists('ClosedDay',    'idx_closedday_tenant',    '(`tenantId`)');

-- ── Limpeza ──────────────────────────────────────────────────
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DROP PROCEDURE IF EXISTS CreateIndexIfNotExists;

SELECT 'Migracao concluida com sucesso!' AS status;
