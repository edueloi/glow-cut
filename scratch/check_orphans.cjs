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
  
  console.log("--- PROJETOS SEM TENANT ---");
  
  const [profs] = await conn.query("SELECT COUNT(*) as count FROM Professional WHERE tenantId IS NULL OR tenantId NOT IN (SELECT id FROM Tenant)");
  console.log(`Profissionais órfãos: ${profs[0].count}`);
  
  const [clients] = await conn.query("SELECT COUNT(*) as count FROM Client WHERE tenantId IS NULL OR tenantId NOT IN (SELECT id FROM Tenant)");
  console.log(`Clientes órfãos: ${clients[0].count}`);
  
  const [services] = await conn.query("SELECT COUNT(*) as count FROM Service WHERE tenantId IS NULL OR tenantId NOT IN (SELECT id FROM Tenant)");
  console.log(`Serviços órfãos: ${services[0].count}`);

  const [tenants] = await conn.query("SELECT id, name FROM Tenant LIMIT 1");
  if (tenants.length > 0) {
    console.log(`Exemplo de Tenant válido: ${tenants[0].name} (${tenants[0].id})`);
  } else {
    console.log("AVISO: Nenhum Tenant encontrado no banco!");
  }

  await conn.end();
}

check().catch(console.error);
