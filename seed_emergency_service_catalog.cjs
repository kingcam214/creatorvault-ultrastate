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

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [users] = await db.execute("SELECT id FROM users WHERE id = ? LIMIT 1", [6]);
    const providerId = users.length ? 6 : (await db.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1"))[0][0]?.id;
    if (!providerId) throw new Error("No provider user exists for service offer repair");

    const id = "emergency-creator-audit-300";
    const steps = JSON.stringify([
      { id: "audit", title: "Same-night creator funnel audit", description: "Review current audience, offer, CTA, and follow-up leaks.", estimatedDays: 1 },
      { id: "activation", title: "Payment CTA and close packet", description: "Deliver buyer-facing audit packet, tracking link, and Telegram follow-up copy.", estimatedDays: 1 },
      { id: "handoff", title: "Next $600 activation upsell", description: "Package the next implementation step after the $300 audit closes.", estimatedDays: 1 }
    ]);

    await db.execute(`
      INSERT INTO services_offers
        (id, provider_id, title, description, tier, price_amount, currency, delivery_days, status, fulfillment_steps_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        provider_id = VALUES(provider_id),
        title = VALUES(title),
        description = VALUES(description),
        tier = VALUES(tier),
        price_amount = VALUES(price_amount),
        currency = VALUES(currency),
        delivery_days = VALUES(delivery_days),
        status = VALUES(status),
        fulfillment_steps_json = VALUES(fulfillment_steps_json),
        updated_at = NOW()
    `, [
      id,
      providerId,
      "Emergency Creator Monetization Audit",
      "A $300 same-night CreatorVault audit for creators with audience attention but weak paid funnel conversion. Includes monetization leak diagnosis, buyer CTA, Telegram follow-up payload, and next $600 activation handoff.",
      "mid",
      30000,
      "USD",
      1,
      "active",
      steps
    ]);

    const [rows] = await db.execute("SELECT id, provider_id, title, price_amount, currency, status FROM services_offers WHERE id = ? LIMIT 1", [id]);
    console.log(JSON.stringify({ repaired: true, service: rows[0] }, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ repaired: false, error: error.message }));
  process.exit(1);
});
