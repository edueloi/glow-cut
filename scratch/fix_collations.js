
import mysql from 'mysql2/promise';

async function fix() {
  const connection = await mysql.createConnection("mysql://root:Edu%4006051992@localhost:3306/glow_cut_db");
  console.log("Fixing collations...");
  await connection.execute("ALTER TABLE Product MODIFY sectorId VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await connection.execute("ALTER TABLE Product MODIFY supplierId VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await connection.execute("ALTER TABLE Product MODIFY manufacturerId VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  console.log("Fixed!");
  await connection.end();
}

fix().catch(console.error);
