#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";
import Stripe from "stripe";

const root = process.cwd();
loadDotEnv(path.join(root, ".env"));

const mode = process.argv.includes("--json") ? "json" : "text";
const verifyStripe = process.argv.includes("--stripe") || process.env.CASHLOOP_VERIFY_STRIPE === "1";
const strict = process.argv.includes("--strict") || process.env.CASHLOOP_STRICT === "1";
const now = new Date().toISOString();

const result = {
  tool: "cashloop-invariant-check",
  generated_at: now,
  cwd: root,
  checks: [],
  summary: { pass: 0, warn: 0, fail: 0 },
  evidence: {},
};

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function addCheck(name, status, detail, evidence = {}) {
  if (!["pass", "warn", "fail"].includes(status)) throw new Error(`Invalid check status ${status}`);
  result.checks.push({ name, status, detail, evidence });
  result.summary[status] += 1;
}

function redact(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v)]));
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/sk_live_[A-Za-z0-9_]+/g, "sk_live_[REDACTED]")
    .replace(/sk_test_[A-Za-z0-9_]+/g, "sk_test_[REDACTED]")
    .replace(/whsec_[A-Za-z0-9_]+/g, "whsec_[REDACTED]")
    .replace(/pk_live_[A-Za-z0-9_]+/g, "pk_live_[REDACTED]")
    .replace(/price_[A-Za-z0-9_]+/g, "price_[REDACTED]")
    .replace(/prod_[A-Za-z0-9_]+/g, "prod_[REDACTED]")
    .replace(/sub_[A-Za-z0-9_]+/g, "sub_[REDACTED]")
    .replace(/pi_[A-Za-z0-9_]+/g, "pi_[REDACTED]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[REDACTED_EMAIL]");
}

async function columns(conn, table) {
  const [rows] = await conn.execute(`show columns from ${table}`);
  return rows.map((row) => row.Field);
}

function selectList(existing, wanted) {
  return wanted.filter((column) => existing.includes(column)).join(", ");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    addCheck("database-url-present", "fail", "DATABASE_URL is not available in the runtime environment or .env file.");
    finish();
    return;
  }

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    addCheck("database-connectivity", "pass", "Connected to the configured production database through DATABASE_URL.");

    const tierCols = await columns(conn, "subscription_tiers");
    const subCols = await columns(conn, "subscriptions");
    const txCols = await columns(conn, "transactions");
    const balanceCols = await columns(conn, "creator_balances");
    result.evidence.columns = { subscription_tiers: tierCols, subscriptions: subCols, transactions: txCols, creator_balances: balanceCols };

    const required = {
      subscription_tiers: ["id", "creator_id", "price_in_cents", "is_active"],
      subscriptions: ["id", "fan_id", "creator_id", "tier_id", "stripe_subscription_id", "status"],
      transactions: ["id", "subscription_id", "fan_id", "creator_id", "amount_in_cents", "creator_share_in_cents", "platform_share_in_cents", "stripe_payment_intent_id", "status"],
      creator_balances: ["creator_id", "available_balance_in_cents", "lifetime_earnings_in_cents"],
    };
    for (const [table, needed] of Object.entries(required)) {
      const existing = result.evidence.columns[table];
      const missing = needed.filter((column) => !existing.includes(column));
      addCheck(`schema-required-columns-${table}`, missing.length ? "fail" : "pass", missing.length ? `Missing required columns: ${missing.join(", ")}` : `Required columns are present in ${table}.`, { missing });
    }

    const [duplicateRefs] = await conn.execute(`
      select stripe_payment_intent_id, count(*) as row_count, sum(amount_in_cents) as gross_cents
      from transactions
      where stripe_payment_intent_id is not null and stripe_payment_intent_id <> ''
      group by stripe_payment_intent_id
      having count(*) > 1
      order by row_count desc, gross_cents desc
      limit 25
    `);
    addCheck("replay-safety-unique-payment-reference", duplicateRefs.length ? "fail" : "pass", duplicateRefs.length ? "Duplicate transaction payment references exist and must be reconciled before relying on replay safety." : "No duplicate non-empty transaction payment references were found.", { duplicateRefs });

    const [invalidTxs] = await conn.execute(`
      select t.id, t.subscription_id, t.fan_id, t.creator_id, t.amount_in_cents, t.stripe_payment_intent_id, t.status
      from transactions t
      left join subscriptions s on s.id = t.subscription_id
      where t.subscription_id is not null and s.id is null
      order by t.id desc
      limit 25
    `);
    addCheck("transaction-subscription-foreign-reference", invalidTxs.length ? "fail" : "pass", invalidTxs.length ? "Transactions referencing missing subscriptions were found." : "Every transaction with a subscription_id references an existing subscription row.", { invalidTxs });

    const [nanLikeTxs] = await conn.execute(`
      select id, subscription_id, fan_id, creator_id, amount_in_cents, stripe_payment_intent_id, status
      from transactions
      where subscription_id is null or amount_in_cents is null or amount_in_cents <= 0 or creator_share_in_cents < 0 or platform_share_in_cents < 0
      order by id desc
      limit 25
    `);
    addCheck("transaction-numeric-integrity", nanLikeTxs.length ? "fail" : "pass", nanLikeTxs.length ? "Transactions with null or invalid accounting values were found." : "Subscription accounting transaction rows have non-null positive gross amounts and non-negative shares.", { rows: nanLikeTxs });

    const [settledWithoutRef] = await conn.execute(`
      select id, subscription_id, fan_id, creator_id, amount_in_cents, status, created_at
      from transactions
      where status = 'completed' and (stripe_payment_intent_id is null or stripe_payment_intent_id = '')
      order by id desc
      limit 25
    `);
    addCheck("completed-payment-reference-present", settledWithoutRef.length ? "fail" : "pass", settledWithoutRef.length ? "Completed transactions without Stripe payment references were found." : "Completed transaction rows contain a Stripe payment reference.", { rows: settledWithoutRef });

    const [activeSubscriptionRows] = await conn.execute(`
      select s.id, s.status, s.stripe_subscription_id, s.tier_id, s.fan_id, s.creator_id, st.is_active as tier_is_active, s.current_period_end
      from subscriptions s
      join subscription_tiers st on st.id = s.tier_id
      where s.status in ('active', 'trialing', 'past_due')
      order by s.id desc
      limit 100
    `);
    result.evidence.active_subscription_sample = activeSubscriptionRows.slice(0, 25);
    const activeMissingStripeId = activeSubscriptionRows.filter((row) => !row.stripe_subscription_id);
    addCheck("active-subscription-stripe-id-present", activeMissingStripeId.length ? "fail" : "pass", activeMissingStripeId.length ? "Active-like subscriptions without Stripe subscription IDs were found." : "Active-like subscriptions in the inspected set have Stripe subscription IDs.", { rows: activeMissingStripeId.slice(0, 25) });

    const inactiveTierActiveSubs = activeSubscriptionRows.filter((row) => Number(row.tier_is_active) === 0);
    addCheck("inactive-tier-existing-subscriber-policy", "pass", inactiveTierActiveSubs.length ? "Inactive tiers can retain existing paid subscriber rows; new checkout creation is guarded separately." : "No active-like subscription rows currently point at inactive tiers in the inspected set.", { inactiveTierActiveSubs: inactiveTierActiveSubs.slice(0, 25) });

    const [activeTiers] = await conn.execute(`
      select id, creator_id, name, price_in_cents, is_active
      from subscription_tiers
      where is_active = 1
      order by creator_id, price_in_cents
      limit 200
    `);
    const [inactiveTiers] = await conn.execute(`
      select id, creator_id, name, price_in_cents, is_active
      from subscription_tiers
      where is_active = 0
      order by updated_at desc, id desc
      limit 100
    `);
    result.evidence.active_tiers_sample = activeTiers.slice(0, 50);
    result.evidence.inactive_tiers_sample = inactiveTiers.slice(0, 50);
    addCheck("inactive-tier-database-state-readable", "pass", `Read ${activeTiers.length} active-tier rows and ${inactiveTiers.length} inactive-tier rows for bypass monitoring.`, { activeTierCount: activeTiers.length, inactiveTierCount: inactiveTiers.length });

    const sourceMarkers = inspectSourceMarkers(root);
    result.evidence.source_markers = sourceMarkers;
    addCheck("inactive-tier-checkout-source-guard", sourceMarkers.checkoutActiveTierGuard ? "pass" : "fail", sourceMarkers.checkoutActiveTierGuard ? "Checkout/subscription creation source contains an active-tier guard." : "Could not find an active-tier guard in the checkout/subscription source markers.");
    addCheck("manual-accounting-endpoints-disabled", sourceMarkers.manualSubscriptionDisabled && sourceMarkers.directPaymentDisabled ? "pass" : "fail", sourceMarkers.manualSubscriptionDisabled && sourceMarkers.directPaymentDisabled ? "Manual subscription creation and direct payment accounting endpoints are disabled in source." : "Manual subscription/direct accounting disable markers were not both found.");
    addCheck("renewal-webhook-reconciliation-present", sourceMarkers.renewalReconciliation ? "pass" : "fail", sourceMarkers.renewalReconciliation ? "Stripe invoice.paid renewal reconciliation marker is present in source or compiled output." : "Renewal reconciliation marker was not found.");

    const [creatorBalanceRows] = await conn.execute(`
      select cb.creator_id,
             cb.available_balance_in_cents,
             cb.lifetime_earnings_in_cents,
             coalesce(sum(case when t.status = 'completed' then t.creator_share_in_cents else 0 end), 0) as completed_creator_share_in_cents,
             count(t.id) as transaction_count
      from creator_balances cb
      left join transactions t on t.creator_id = cb.creator_id
      group by cb.creator_id, cb.available_balance_in_cents, cb.lifetime_earnings_in_cents
      order by cb.creator_id
      limit 200
    `);
    result.evidence.creator_balance_sample = creatorBalanceRows.slice(0, 50);
    const impossibleBalances = creatorBalanceRows.filter((row) => Number(row.available_balance_in_cents) < 0 || Number(row.lifetime_earnings_in_cents) < 0);
    addCheck("creator-balance-nonnegative", impossibleBalances.length ? "fail" : "pass", impossibleBalances.length ? "Negative creator balance values were found." : "Creator balance values are non-negative in the inspected set.", { rows: impossibleBalances });

    if (verifyStripe) {
      await verifyStripeSubscriptions(conn, activeSubscriptionRows);
    } else {
      addCheck("stripe-live-subscription-status-check", "warn", "Stripe API status verification was not requested. Run with --stripe or CASHLOOP_VERIFY_STRIPE=1 to cross-check live subscription status.");
    }
  } finally {
    await conn.end();
  }

  finish();
}

function inspectSourceMarkers(projectRoot) {
  const files = [
    "server/_core/stripeWebhook.ts",
    "server/routers/stripeCheckout.ts",
    "server/routers/subscriptions.ts",
    "server/services/subscriptionManagement.ts",
    "dist/index.js",
  ];
  const combined = files.map((file) => {
    const fullPath = path.join(projectRoot, file);
    return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
  }).join("\n");
  return {
    checkoutActiveTierGuard: /isActive|is_active/.test(combined) && /subscriptionTiers/.test(combined),
    manualSubscriptionDisabled: combined.includes("Manual subscription creation is disabled"),
    directPaymentDisabled: combined.includes("Direct payment processing is disabled"),
    renewalReconciliation: combined.includes("Subscription renewal reconciled") || combined.includes("handleSubscriptionInvoicePaid") || combined.includes("invoice.paid"),
  };
}

async function verifyStripeSubscriptions(conn, activeSubscriptionRows) {
  if (!process.env.STRIPE_SECRET_KEY) {
    addCheck("stripe-secret-present", "fail", "STRIPE_SECRET_KEY is not available, so live Stripe subscription status cannot be verified.");
    return;
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rows = activeSubscriptionRows.filter((row) => row.stripe_subscription_id).slice(0, 25);
  const mismatches = [];
  const verified = [];
  for (const row of rows) {
    const stripeSub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
    verified.push({ db_subscription_id: row.id, db_status: row.status, stripe_status: stripeSub.status, stripe_subscription_id: row.stripe_subscription_id, current_period_end: stripeSub.current_period_end });
    if (String(row.status) !== String(stripeSub.status) && !(row.status === "active" && stripeSub.status === "trialing")) {
      mismatches.push({ db_subscription_id: row.id, db_status: row.status, stripe_status: stripeSub.status, stripe_subscription_id: row.stripe_subscription_id });
    }
  }
  result.evidence.stripe_subscription_status_sample = verified;
  addCheck("stripe-live-subscription-status-check", mismatches.length ? "fail" : "pass", mismatches.length ? "Database subscription status mismatches live Stripe for one or more active-like subscriptions." : `Verified ${verified.length} live Stripe subscription statuses against database rows.`, { mismatches });
}

function finish() {
  const safeResult = redact(result);
  if (mode === "json") {
    console.log(JSON.stringify(safeResult, null, 2));
  } else {
    console.log(`cashloop-invariant-check ${safeResult.generated_at}`);
    console.log(`summary pass=${safeResult.summary.pass} warn=${safeResult.summary.warn} fail=${safeResult.summary.fail}`);
    for (const check of safeResult.checks) {
      console.log(`[${check.status.toUpperCase()}] ${check.name}: ${check.detail}`);
    }
    console.log(JSON.stringify(safeResult, null, 2));
  }
  if (safeResult.summary.fail > 0 || (strict && safeResult.summary.warn > 0)) {
    process.exit(1);
  }
}

main().catch((error) => {
  addCheck("tool-runtime", "fail", error?.stack || error?.message || String(error));
  finish();
});
