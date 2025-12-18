import { getDb } from "./server/db";
import fs from "fs/promises";

async function main() {
  const db = await getDb();
  const sql = await fs.readFile("./drizzle/0003_overconfident_nico_minoru.sql", "utf-8");
  
  // Split by statement-breakpoint
  const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s && !s.startsWith("--"));
  
  console.log(`Applying ${statements.length} SQL statements...`);
  
  for (const statement of statements) {
    if (statement) {
      try {
        await db.execute(statement);
        console.log("✓", statement.substring(0, 60) + "...");
      } catch (err: any) {
        console.error("✗", statement.substring(0, 60), err.message);
      }
    }
  }
  
  console.log("Migration complete");
  process.exit(0);
}

main().catch(console.error);
