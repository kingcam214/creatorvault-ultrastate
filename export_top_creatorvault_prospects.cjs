const fs = require("fs");
const path = require("path");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.join(process.cwd(), ".env"));
loadEnv(path.join(process.cwd(), ".env.production"));

const mysql = require("mysql2/promise");

function handleFrom(stageName, id) {
  return String(stageName || `creator_${id}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || `creator_${id}`;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [rows] = await db.execute(`
      SELECT id, stage_name, sub_group, bio, follower_count, engagement_rate, subscription_price, monthly_revenue, status
      FROM greatest_show_creators
      WHERE status = ?
      ORDER BY COALESCE(follower_count, 0) DESC, id DESC
      LIMIT 5
    `, ["active"]);
    const creators = rows.map((row) => ({
      handle: handleFrom(row.stage_name, row.id),
      display_name: row.stage_name,
      bio: row.bio || "CreatorVault active creator prospect",
      followers: Number(row.follower_count || 0),
      engagement_rate: Number(row.engagement_rate || 0),
      recent_post: `${row.sub_group || "creator"} membership offer at $${Number(row.subscription_price || 0).toFixed(2)}`,
      platforms: ["creatorvault"],
      score: (Number(row.follower_count || 0) >= 50000 ? 40 : Number(row.follower_count || 0) >= 10000 ? 25 : 10) + (Number(row.engagement_rate || 0) >= 4 ? 30 : Number(row.engagement_rate || 0) >= 2 ? 15 : 0),
      source_table: "greatest_show_creators",
      source_id: row.id,
      subscription_price: Number(row.subscription_price || 0),
      monthly_revenue: Number(row.monthly_revenue || 0)
    }));
    console.log(JSON.stringify({ complete: true, count: creators.length, creators }, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ complete: false, error: error.message }));
  process.exit(1);
});
