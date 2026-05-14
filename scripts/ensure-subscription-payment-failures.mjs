import 'dotenv/config';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to ensure subscription_payment_failures');
}

const connection = await mysql.createConnection(databaseUrl);
try {
  await connection.execute(`CREATE TABLE IF NOT EXISTS subscription_payment_failures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stripe_invoice_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) NOT NULL,
    stripe_payment_ref VARCHAR(255) NOT NULL,
    subscription_id INT NULL,
    vaultx_subscription_id INT NULL,
    fan_id INT NULL,
    creator_id INT NULL,
    tier VARCHAR(32) NULL,
    status VARCHAR(32) NOT NULL,
    amount_due_cents INT NOT NULL DEFAULT 0,
    amount_remaining_cents INT NOT NULL DEFAULT 0,
    attempt_count INT NOT NULL DEFAULT 0,
    next_payment_attempt_at TIMESTAMP NULL,
    failure_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_subscription_payment_failure_invoice (stripe_invoice_id),
    UNIQUE KEY uniq_subscription_payment_failure_payment_ref (stripe_payment_ref),
    KEY idx_subscription_payment_failures_subscription (stripe_subscription_id),
    KEY idx_subscription_payment_failures_creator (creator_id),
    KEY idx_subscription_payment_failures_status (status)
  )`);
  const [columns] = await connection.execute(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'subscription_payment_failures'
    ORDER BY ORDINAL_POSITION
  `);
  const [indexes] = await connection.execute(`
    SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'subscription_payment_failures'
    GROUP BY INDEX_NAME, NON_UNIQUE
    ORDER BY INDEX_NAME
  `);
  console.log(JSON.stringify({
    table: 'subscription_payment_failures',
    columnCount: columns.length,
    columns: columns.map((row) => row.COLUMN_NAME),
    indexes: indexes.map((row) => ({ name: row.INDEX_NAME, nonUnique: row.NON_UNIQUE, columns: row.columns })),
  }, null, 2));
} finally {
  await connection.end();
}
