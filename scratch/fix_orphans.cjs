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
    console.log("ERRO: Nenhum Tenant encontrado.");
    await conn.end();
    return;
  }
  const tid = tenants[0].id;
  console.log(`Usando Tenant padrão: ${tid}`);

  // Professional
  const [p] = await conn.query(`
    UPDATE Professional p 
    LEFT JOIN Tenant t ON p.tenantId = t.id 
    SET p.tenantId = ? 
    WHERE t.id IS NULL OR p.tenantId IS NULL OR p.tenantId = ''
  `, [tid]);
  console.log(`Profissionais corrigidos: ${p.affectedRows}`);

  // Service
  const [s] = await conn.query(`
    UPDATE Service s 
    LEFT JOIN Tenant t ON s.tenantId = t.id 
    SET s.tenantId = ? 
    WHERE t.id IS NULL OR s.tenantId IS NULL OR s.tenantId = ''
  `, [tid]);
  console.log(`Serviços corrigidos: ${s.affectedRows}`);

  // Client
  const [c] = await conn.query(`
    UPDATE Client c 
    LEFT JOIN Tenant t ON c.tenantId = t.id 
    SET c.tenantId = ? 
    WHERE t.id IS NULL OR c.tenantId IS NULL OR c.tenantId = ''
  `, [tid]);
  console.log(`Clientes corrigidos: ${c.affectedRows}`);

  await conn.end();
}

fix().catch(console.error);
