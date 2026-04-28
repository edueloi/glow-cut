const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "3306"),
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "Edu@06051992",
  database: process.env.DB_NAME     || "glow_cut_db",
};

async function check() {
  const conn = await mysql.createConnection(DB_CONFIG);
  
  const tables = ["Professional", "Client", "Service"];
  for (const table of tables) {
    const [rows] = await conn.query(`
      SELECT COUNT(*) as count 
      FROM ${table} t 
      LEFT JOIN Tenant ten ON t.tenantId = ten.id 
      WHERE ten.id IS NULL OR t.tenantId IS NULL OR t.tenantId = ''
    `);
    console.log(`${table} órfãos: ${rows[0].count}`);
  }

  await conn.end();
}

check().catch(console.error);
