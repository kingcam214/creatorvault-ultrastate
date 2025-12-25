import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const alterStatements = [
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS short_description VARCHAR(280)",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS main_image VARCHAR(500)",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS additional_images JSON",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS product_video VARCHAR(500)",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS digital_files JSON",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS download_limit INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS access_duration INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS shipping_type ENUM('self', 'fulfillment')",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS shipping_cost INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS estimated_delivery_days INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS inventory INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS variations JSON",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS service_duration INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS delivery_methods JSON",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT FALSE",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS turnaround_days INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS regular_price INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS sale_price INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS sale_end_date TIMESTAMP",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS monthly_price INT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS keywords JSON",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS target_audience JSON",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS content_rating ENUM('general', '18+', '21+') DEFAULT 'general'",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS refund_policy ENUM('no-refunds', '7-day', '30-day', 'custom') DEFAULT 'no-refunds'",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS custom_refund_policy TEXT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS customer_instructions TEXT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS terms_of_use TEXT",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS published_at TIMESTAMP",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS sales_count INT DEFAULT 0",
  "ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS total_revenue INT DEFAULT 0"
];

console.log("Starting marketplace_products migration...");

for (const statement of alterStatements) {
  try {
    await connection.execute(statement);
    console.log("✓", statement.substring(0, 80) + "...");
  } catch (error) {
    // Ignore "Duplicate column" errors
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log("⊘ Column already exists:", statement.substring(0, 80) + "...");
    } else {
      console.error("✗ Error:", error.message);
    }
  }
}

console.log("\nMigration complete!");
await connection.end();
