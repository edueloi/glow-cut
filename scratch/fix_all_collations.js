
import mysql from 'mysql2/promise';

async function fixAll() {
  const connection = await mysql.createConnection("mysql://root:Edu%4006051992@localhost:3306/glow_cut_db");
  console.log("Fixing all table collations...");
  
  const [tables] = await connection.execute("SHOW TABLES");
  const tableNames = tables.map(t => Object.values(t)[0]);
  
  // Disable foreign key checks temporarily to allow collation changes
  await connection.execute("SET FOREIGN_KEY_CHECKS = 0");
  
  for (const table of tableNames) {
    console.log(`Fixing table: ${table}`);
    await connection.execute(`ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  }
  
  await connection.execute("SET FOREIGN_KEY_CHECKS = 1");
  console.log("All tables fixed!");
  await connection.end();
}

fixAll().catch(console.error);
