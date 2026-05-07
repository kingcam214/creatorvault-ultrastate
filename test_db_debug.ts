import "dotenv/config";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
console.log("DB_URL:", DB_URL);

async function main() {
  const db = await mysql.createConnection(DB_URL);
  const [rows] = await db.execute("SELECT id, title, creator_id FROM vaultx_content WHERE id = 4 LIMIT 1");
  console.log("ROWS:", JSON.stringify(rows));
  await db.end();
}
main().catch(e => console.error("ERROR:", e.message));
