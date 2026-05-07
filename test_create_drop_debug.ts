import "dotenv/config";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL || "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";

function rows(result: any): any[] {
  return Array.isArray(result) ? (result[0] as any[]) : [];
}

async function main() {
  const db = await mysql.createConnection(DB_URL);
  
  const contentId = 4;
  const creatorId = 1;
  
  console.log("Querying content id=", contentId, "creator_id=", creatorId);
  
  const [contentRows] = await db.execute(
    `SELECT id, title, description, ppv_price, content_type, thumbnail_url, censored_url, uncensored_url
     FROM vaultx_content WHERE id = ? AND creator_id = ? LIMIT 1`,
    [contentId, creatorId]
  );
  
  console.log("contentRows type:", typeof contentRows, "isArray:", Array.isArray(contentRows));
  console.log("contentRows length:", (contentRows as any[]).length);
  console.log("contentRows[0]:", JSON.stringify((contentRows as any[])[0]));
  
  const content = rows([contentRows])[0];
  console.log("content via rows():", JSON.stringify(content));
  
  await db.end();
}
main().catch(e => console.error("ERROR:", e.message, e.stack));
