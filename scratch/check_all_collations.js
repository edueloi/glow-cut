
import mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection("mysql://root:Edu%4006051992@localhost:3306/glow_cut_db");
  const [rows] = await connection.execute(`
    SELECT TABLE_NAME, COLUMN_NAME, COLLATION_NAME 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'glow_cut_db' 
    AND (
      (TABLE_NAME = 'Product' AND COLUMN_NAME IN ('sectorId', 'supplierId', 'manufacturerId')) OR
      (TABLE_NAME = 'Sector' AND COLUMN_NAME = 'id') OR
      (TABLE_NAME = 'Supplier' AND COLUMN_NAME = 'id') OR
      (TABLE_NAME = 'Manufacturer' AND COLUMN_NAME = 'id')
    )
  `);
  console.table(rows);
  await connection.end();
}

check().catch(console.error);
