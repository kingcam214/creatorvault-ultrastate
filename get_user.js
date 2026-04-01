require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const [users] = await connection.execute('SELECT id, name, email FROM users WHERE name LIKE "%Yodeiris%" OR email LIKE "%yodeiris%"');
  console.log(users);
  await connection.end();
}

run().catch(console.error);
