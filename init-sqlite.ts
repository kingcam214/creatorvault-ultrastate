import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "creatorvault.db");

console.log("🔥 Initializing SQLite database for Christmas launch...");
console.log("Database path:", DB_PATH);

// Create database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create tables
const tables = [
  // Users
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    openId TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    loginMethod TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'creator', 'admin', 'king')),
    language TEXT DEFAULT 'en',
    country TEXT,
    referredBy INTEGER,
    creatorStatus TEXT DEFAULT 'pending',
    contentType TEXT,
    primaryBrand TEXT DEFAULT 'CREATORVAULT',
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch()),
    lastSignedIn INTEGER DEFAULT (unixepoch())
  )`,
  
  // Creators
  `CREATE TABLE IF NOT EXISTS creators (
    id TEXT PRIMARY KEY,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creatorType TEXT NOT NULL,
    country TEXT,
    platforms TEXT,
    monthlyRevenue INTEGER,
    subscriberCount INTEGER,
    status TEXT DEFAULT 'active',
    onboardedAt INTEGER,
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // Leads
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    sourceId TEXT,
    email TEXT,
    name TEXT,
    country TEXT,
    creatorType TEXT,
    status TEXT DEFAULT 'new',
    dataJson TEXT,
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // Marketplace Products
  `CREATE TABLE IF NOT EXISTS marketplace_products (
    id TEXT PRIMARY KEY,
    creatorId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recruiterId INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK(type IN ('digital', 'service', 'bundle', 'subscription')),
    title TEXT NOT NULL,
    description TEXT,
    priceAmount INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'archived')),
    fulfillmentType TEXT DEFAULT 'manual' CHECK(fulfillmentType IN ('instant', 'manual', 'scheduled')),
    fulfillmentPayload TEXT,
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // Marketplace Orders
  `CREATE TABLE IF NOT EXISTS marketplace_orders (
    id TEXT PRIMARY KEY,
    buyerId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    productId TEXT NOT NULL REFERENCES marketplace_products(id) ON DELETE RESTRICT,
    quantity INTEGER DEFAULT 1,
    grossAmount INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    creatorAmount INTEGER NOT NULL,
    recruiterAmount INTEGER DEFAULT 0,
    platformAmount INTEGER NOT NULL,
    paymentProvider TEXT DEFAULT 'stripe',
    stripeSessionId TEXT,
    stripePaymentIntentId TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'fulfilled', 'refunded', 'failed')),
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // Payments
  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripePaymentId TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL,
    paymentType TEXT,
    metadata TEXT,
    createdAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // Payouts
  `CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    stripePayoutId TEXT,
    createdAt INTEGER DEFAULT (unixepoch()),
    completedAt INTEGER
  )`,
  
  // Commissions
  `CREATE TABLE IF NOT EXISTS commission_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    refType TEXT NOT NULL CHECK(refType IN ('order', 'sale', 'enrollment')),
    refId TEXT NOT NULL,
    partyType TEXT NOT NULL CHECK(partyType IN ('creator', 'recruiter', 'affiliate', 'platform')),
    partyId INTEGER REFERENCES users(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    createdAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // Events (audit/proof log)
  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eventType TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    featureId TEXT,
    inputsJson TEXT,
    dbWritesJson TEXT,
    artifactsJson TEXT,
    moneyJson TEXT,
    status TEXT NOT NULL CHECK(status IN ('success', 'failure')),
    createdAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // Telegram Bots
  `CREATE TABLE IF NOT EXISTS telegram_bots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    botToken TEXT NOT NULL,
    webhookUrl TEXT,
    status TEXT DEFAULT 'active',
    createdBy INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // Telegram Leads
  `CREATE TABLE IF NOT EXISTS telegram_leads (
    id TEXT PRIMARY KEY,
    botId TEXT NOT NULL REFERENCES telegram_bots(id) ON DELETE CASCADE,
    telegramUserId TEXT NOT NULL,
    username TEXT,
    firstName TEXT,
    lastName TEXT,
    email TEXT,
    country TEXT,
    creatorType TEXT,
    funnelId TEXT,
    currentStep INTEGER DEFAULT 0,
    dataJson TEXT,
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // WhatsApp Providers
  `CREATE TABLE IF NOT EXISTS whatsapp_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    credentialsJson TEXT NOT NULL,
    phoneNumber TEXT,
    status TEXT DEFAULT 'active',
    createdBy INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
  )`,
  
  // WhatsApp Leads
  `CREATE TABLE IF NOT EXISTS whatsapp_leads (
    id TEXT PRIMARY KEY,
    providerId TEXT NOT NULL REFERENCES whatsapp_providers(id) ON DELETE CASCADE,
    phoneNumber TEXT NOT NULL,
    name TEXT,
    email TEXT,
    country TEXT,
    creatorType TEXT,
    funnelId TEXT,
    currentStep INTEGER DEFAULT 0,
    dataJson TEXT,
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
  )`,
];

// Execute table creation
for (const sql of tables) {
  try {
    db.exec(sql);
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    console.log("✓ Created table:", tableName);
  } catch (err: any) {
    console.error("✗ Failed to create table:", err.message);
  }
}

// Verify tables
const tables_list = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("\n✅ Database initialized with", tables_list.length, "tables:");
tables_list.forEach((t: any) => console.log("  -", t.name));

// Test insert
try {
  const stmt = db.prepare(`INSERT INTO users (openId, name, email, role) VALUES (?, ?, ?, ?)`);
  const result = stmt.run("test-king-001", "KingCam", "king@creatorvault.com", "king");
  console.log("\n✓ Test insert successful, user ID:", result.lastInsertRowid);
  
  // Test query
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
  console.log("✓ Test query successful:", user);
  
  // Log event
  const eventStmt = db.prepare(`INSERT INTO events (eventType, actor, action, status) VALUES (?, ?, ?, ?)`);
  eventStmt.run("database.init", "system", "initialize_sqlite", "success");
  console.log("✓ Event logged");
  
} catch (err: any) {
  console.error("✗ Test failed:", err.message);
}

// Add viral optimizer tables
db.exec(`
  CREATE TABLE IF NOT EXISTS viral_analyses (
    id TEXT PRIMARY KEY,
    userId INTEGER NOT NULL,
    contentType TEXT NOT NULL,
    platform TEXT NOT NULL,
    inputJson TEXT NOT NULL,
    viralScore INTEGER NOT NULL,
    hookScore INTEGER NOT NULL,
    qualityScore INTEGER NOT NULL,
    trendScore INTEGER NOT NULL,
    audienceScore INTEGER NOT NULL,
    formatScore INTEGER NOT NULL,
    timingScore INTEGER NOT NULL,
    platformScore INTEGER NOT NULL,
    confidenceLevel INTEGER NOT NULL,
    weaknesses TEXT,
    recommendations TEXT,
    optimizedOutputJson TEXT,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS viral_metrics (
    id TEXT PRIMARY KEY,
    analysisId TEXT NOT NULL,
    metricType TEXT NOT NULL,
    predictedValue REAL NOT NULL,
    actualValue REAL,
    recordedAt INTEGER,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (analysisId) REFERENCES viral_analyses(id)
  );
`);

console.log("✓ Viral optimizer tables created");

console.log("\n🔥 SQLite database ready for Christmas launch!");
console.log("DATABASE_URL=file:" + DB_PATH);

db.close();
