import "dotenv/config";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";

function rows(result: any): any[] {
  return Array.isArray(result) ? (result[0] as any[]) : [];
}

async function main() {
  const db = await mysql.createConnection(DB_URL);
  const result = await db.execute(
    "SELECT id, title, creator_id FROM vaultx_content WHERE id = ? AND creator_id = ? LIMIT 1",
    [4, 1]
  );
  console.log("result type:", typeof result, "isArray:", Array.isArray(result));
  console.log("result[0] type:", typeof result[0], "isArray:", Array.isArray(result[0]));
  console.log("result[0] length:", (result[0] as any[]).length);
  console.log("rows():", JSON.stringify(rows(result)));
  const content = rows(result)[0];
  console.log("content:", JSON.stringify(content));
  await db.end();
}
main().catch(e => console.error("ERROR:", e.message, e.stack));
