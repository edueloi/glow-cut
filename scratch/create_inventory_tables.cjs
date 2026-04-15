// Script para criar as tabelas Supplier, Manufacturer e StockMovement no MySQL
// Executar com: node scratch/create_inventory_tables.cjs

const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }

  // Parse MySQL URL using URL class for proper character handling
  const parsedUrl = new URL(url);
  const user = decodeURIComponent(parsedUrl.username);
  const password = decodeURIComponent(parsedUrl.password);
  const host = parsedUrl.hostname;
  const port = parseInt(parsedUrl.port || '3306');
  const database = parsedUrl.pathname.replace(/^\//, '');

  const conn = await mysql.createConnection({ host, port, user, password, database, multipleStatements: true });

  console.log('Connected to database:', database);

  // Create Supplier table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS Supplier (
      id VARCHAR(36) PRIMARY KEY,
      tenantId VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      cnpj VARCHAR(20) NULL,
      phone VARCHAR(30) NULL,
      email VARCHAR(255) NULL,
      contact VARCHAR(255) NULL,
      address TEXT NULL,
      notes TEXT NULL,
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_supplier_tenant (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✅ Supplier table created');

  // Create Manufacturer table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS Manufacturer (
      id VARCHAR(36) PRIMARY KEY,
      tenantId VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      cnpj VARCHAR(20) NULL,
      phone VARCHAR(30) NULL,
      email VARCHAR(255) NULL,
      website VARCHAR(500) NULL,
      notes TEXT NULL,
      isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_manufacturer_tenant (tenantId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✅ Manufacturer table created');

  // Create StockMovement table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS StockMovement (
      id VARCHAR(36) PRIMARY KEY,
      tenantId VARCHAR(36) NOT NULL,
      productId VARCHAR(36) NOT NULL,
      type VARCHAR(20) NOT NULL,
      quantity INT NOT NULL,
      previousQty INT NOT NULL DEFAULT 0,
      newQty INT NOT NULL DEFAULT 0,
      reason VARCHAR(500) NULL,
      reference VARCHAR(255) NULL,
      createdBy VARCHAR(255) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_stockmov_tenant (tenantId),
      INDEX idx_stockmov_product (productId),
      INDEX idx_stockmov_tenant_date (tenantId, createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✅ StockMovement table created');

  // Add supplierId and manufacturerId columns to Product table if not exist
  try {
    await conn.execute(`ALTER TABLE Product ADD COLUMN supplierId VARCHAR(36) NULL`);
    console.log('✅ Added supplierId to Product');
  } catch (e) {
    console.log('⏭️ supplierId already exists in Product');
  }

  try {
    await conn.execute(`ALTER TABLE Product ADD COLUMN manufacturerId VARCHAR(36) NULL`);
    console.log('✅ Added manufacturerId to Product');
  } catch (e) {
    console.log('⏭️ manufacturerId already exists in Product');
  }

  await conn.end();
  console.log('\n🎉 All tables created successfully!');
}

main().catch(e => { console.error(e); process.exit(1); });
