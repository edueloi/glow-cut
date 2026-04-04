const mysql = require('mysql2/promise');

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Edu@06051992',
      database: 'glow_cut_db'
    });

    const [rowsAdmin] = await connection.execute('SELECT email, password, isActive FROM adminuser');
    console.log('--- adminuser table ---');
    console.log(rowsAdmin);

    const [rowsSuper] = await connection.execute('SELECT username, password FROM superadmin');
    console.log('--- superadmin table ---');
    console.log(rowsSuper);

    const [rowsProf] = await connection.execute('SELECT name, password FROM professional');
    console.log('--- professional table ---');
    console.log(rowsProf);

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) await connection.end();
  }
}

main();
