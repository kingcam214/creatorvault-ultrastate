import { getDb } from "./server/db";

async function main() {
  const db = await getDb();
  const [tables] = await db.execute("SHOW TABLES");
  console.log("Existing tables:");
  (tables as any[]).forEach((t: any) => console.log(" -", Object.values(t)[0]));
  process.exit(0);
}

main().catch(console.error);
