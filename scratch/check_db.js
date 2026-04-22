
import mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection("mysql://root:Edu%4006051992@localhost:3306/glow_cut_db");
  const [rows] = await connection.execute("DESCRIBE Product");
  console.log("Product columns:");
  console.table(rows);
  const [rows2] = await connection.execute("DESCRIBE Sector");
  console.log("Sector columns:");
  console.table(rows2);
  await connection.end();
}

check().catch(console.error);
