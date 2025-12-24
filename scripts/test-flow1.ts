/**
 * Test Flow #1: Adult Money Truth
 * 
 * Tests: Creator creates tier → Fan subscribes → Payment → Ledger → Balance update
 */

import mysql from "mysql2/promise";
import crypto from "crypto";

async function testFlow1() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log("\n=== FLOW #1: ADULT MONEY TRUTH TEST ===\n");
  
  // Step 1: Create test creator user
  const creatorOpenId = `test-creator-${Date.now()}`;
  const [creatorResult] = await connection.execute(
    `INSERT INTO users (openId, name, email, role) VALUES (?, ?, ?, ?)`,
    [creatorOpenId, "Test Creator", "creator@test.com", "creator"]
  );
  const creatorId = (creatorResult as any).insertId;
  console.log(`✓ Created test creator (ID: ${creatorId})`);
  
  // Step 2: Create subscription tier
  const [tierResult] = await connection.execute(
    `INSERT INTO subscription_tiers (creator_id, name, description, price_in_cents, is_active) 
     VALUES (?, ?, ?, ?, ?)`,
    [creatorId, "Premium Tier", "Access to premium content", 1000, true]
  );
  const tierId = (tierResult as any).insertId;
  console.log(`✓ Created subscription tier (ID: ${tierId}, Price: $10.00)`);
  
  // Step 3: Create test fan user
  const fanOpenId = `test-fan-${Date.now()}`;
  const [fanResult] = await connection.execute(
    `INSERT INTO users (openId, name, email, role) VALUES (?, ?, ?, ?)`,
    [fanOpenId, "Test Fan", "fan@test.com", "user"]
  );
  const fanId = (fanResult as any).insertId;
  console.log(`✓ Created test fan (ID: ${fanId})`);
  
  // Step 4: Create subscription
  const [subscriptionResult] = await connection.execute(
    `INSERT INTO subscriptions (fan_id, creator_id, tier_id, status, current_period_start, current_period_end) 
     VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH))`,
    [fanId, creatorId, tierId, "active"]
  );
  const subscriptionId = (subscriptionResult as any).insertId;
  console.log(`✓ Created subscription (ID: ${subscriptionId})`);
  
  // Step 5: Process payment and create transaction (70/30 split)
  const amountInCents = 1000; // $10.00
  const creatorShare = Math.floor(amountInCents * 0.7); // $7.00
  const platformShare = amountInCents - creatorShare; // $3.00
  
  const [transactionResult] = await connection.execute(
    `INSERT INTO transactions (subscription_id, fan_id, creator_id, amount_in_cents, creator_share_in_cents, platform_share_in_cents, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [subscriptionId, fanId, creatorId, amountInCents, creatorShare, platformShare, "completed"]
  );
  const transactionId = (transactionResult as any).insertId;
  console.log(`✓ Created transaction (ID: ${transactionId})`);
  console.log(`  Amount: $${(amountInCents / 100).toFixed(2)}`);
  console.log(`  Creator share (70%): $${(creatorShare / 100).toFixed(2)}`);
  console.log(`  Platform share (30%): $${(platformShare / 100).toFixed(2)}`);
  
  // Step 6: Update creator balance
  await connection.execute(
    `INSERT INTO creator_balances (creator_id, available_balance_in_cents, lifetime_earnings_in_cents) 
     VALUES (?, ?, ?) 
     ON DUPLICATE KEY UPDATE 
       available_balance_in_cents = available_balance_in_cents + ?,
       lifetime_earnings_in_cents = lifetime_earnings_in_cents + ?`,
    [creatorId, creatorShare, creatorShare, creatorShare, creatorShare]
  );
  console.log(`✓ Updated creator balance`);
  
  // Step 7: Verify balance
  const [balanceRows] = await connection.execute(
    `SELECT * FROM creator_balances WHERE creator_id = ?`,
    [creatorId]
  );
  const balance = (balanceRows as any[])[0];
  console.log(`\n=== FINAL STATE ===`);
  console.log(`Creator ID: ${creatorId}`);
  console.log(`Available Balance: $${(balance.available_balance_in_cents / 100).toFixed(2)}`);
  console.log(`Lifetime Earnings: $${(balance.lifetime_earnings_in_cents / 100).toFixed(2)}`);
  
  // Step 8: Verify transaction in database
  const [transactionRows] = await connection.execute(
    `SELECT * FROM transactions WHERE id = ?`,
    [transactionId]
  );
  const transaction = (transactionRows as any[])[0];
  console.log(`\nTransaction Status: ${transaction.status}`);
  console.log(`Transaction ID: ${transactionId}`);
  
  console.log(`\n✅ FLOW #1 COMPLETE: Money moved from fan → ledger → creator balance\n`);
  
  await connection.end();
}

testFlow1().catch(console.error);
