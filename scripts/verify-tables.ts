import mysql from "mysql2/promise";

async function verify() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const [rows] = await connection.execute("SHOW TABLES LIKE 'subscription%'");
  console.log("Subscription tables:", rows);
  
  const [balanceRows] = await connection.execute("SHOW TABLES LIKE 'creator_balances'");
  console.log("Balance tables:", balanceRows);
  
  const [transactionRows] = await connection.execute("SHOW TABLES LIKE 'transactions'");
  console.log("Transaction tables:", transactionRows);
  
  await connection.end();
}

verify().catch(console.error);
