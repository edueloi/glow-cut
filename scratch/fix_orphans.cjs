const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "3306"),
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "Edu@06051992",
  database: process.env.DB_NAME     || "glow_cut_db",
};

async function fix() {
  const conn = await mysql.createConnection(DB_CONFIG);
  
  const [tenants] = await conn.query("SELECT id FROM Tenant LIMIT 1");
  if (tenants.length === 0) {
    console.log("ERRO: Nenhum Tenant encontrado para atribuir os órfãos.");
    await conn.end();
    return;
  }
  const defaultTenantId = tenants[0].id;
  console.log(`Usando Tenant padrão: ${defaultTenantId}`);

  const [updProfs] = await conn.query("UPDATE Professional SET tenantId = ? WHERE tenantId IS NULL OR tenantId NOT IN (SELECT id FROM Tenant)", [defaultTenantId]);
  console.log(`Profissionais corrigidos: ${updProfs.affectedRows}`);

  const [updServices] = await conn.query("UPDATE Service SET tenantId = ? WHERE tenantId IS NULL OR tenantId NOT IN (SELECT id FROM Tenant)", [defaultTenantId]);
  console.log(`Serviços corrigidos: ${updServices.affectedRows}`);

  await conn.end();
}

fix().catch(console.error);
