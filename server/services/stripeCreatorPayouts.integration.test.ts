import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import Stripe from "stripe";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { eq } from "drizzle-orm";
import { stripeCreatorPayouts } from "../../drizzle/schema-stripe-payouts";
import { claimStripeCreatorPayout, getStripeCreatorPayout, getStripePayoutDb, getStripePayoutSqlClient } from "../db";
import { executeCreatorChargeTransfer, prepareCreatorChargePayout } from "./stripeCreatorPayouts";
import { resolveStripeCreatorUser, settleCreatorCheckout, settleCreatorStripeEvent } from "./stripeCreatorPayoutEvents";
import { completeStripeVaultxPpvPurchase } from "./stripeVaultxPpvSettlement";
import { createCreatorConnectOnboarding } from "./stripeConnectAccounts";

const databaseUrl = process.env.CREATORVAULT_PAYOUT_TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

/** Only local deterministic Stripe HTTP response fixtures; no live key, vi.mock, or injected production functions. */
integration("Stripe payout local SQL + SDK contract integration", () => {
  let pool: Pool;
  let api: Server;
  let stripe: Stripe;
  const charges = new Map<string, Record<string, unknown>>();
  const invoicePayments = new Map<string, string>();
  const transfers = new Map<string, Stripe.Transfer>();
  const transferRequests: { key: string | undefined; body: URLSearchParams }[] = [];
  const accountRequests: { key: string | undefined; body: URLSearchParams }[] = [];
  const onboardingRequests: URLSearchParams[] = [];
  let dropNextTransferResponse = false;
  let failNextTransfer = false;
  let refundDuringNextTransfer = false;
  let accountActive = true;

  function addCharge(id = "ch_test1", options: { fee?: number | null; refunded?: boolean; currency?: string; settlementCurrency?: string } = {}): void {
    const fee = options.fee === undefined ? 320 : options.fee;
    const currency = options.currency ?? "usd";
    charges.set(id, {
      id, object: "charge", created: Math.floor(Date.now() / 1000), amount: 10000, currency, paid: true, captured: true, status: "succeeded",
      refunded: options.refunded ?? false, amount_refunded: options.refunded ? 10000 : 0,
      disputed: false, transfer: null, transfer_data: null, application_fee: null,
      payment_intent: `pi_${id.slice(3)}`, metadata: {},
      balance_transaction: fee === null ? null : {
        id: `txn_${id.slice(3)}`, object: "balance_transaction", amount: 10000, fee, net: 10000 - fee,
        currency: options.settlementCurrency ?? currency,
        fee_details: [{ amount: fee, currency, type: "stripe_fee", description: "Fixture processing fee", application: null }],
      },
    });
  }
  async function prepare(id = "ch_test1"): Promise<void> {
    const charge = await stripe.charges.retrieve(id, { expand: ["balance_transaction"] });
    await prepareCreatorChargePayout(stripe, charge, {
      creatorId: 7, eventId: "evt_local1", sessionId: "cs_local1",
      metadata: { type: "vaultlive_tip", viewerId: "42", streamId: "5", creatorId: "7", payoutRule: "creator_net_85_v1" },
    });
  }
  async function rows<T extends RowDataPacket>(query: string, params: readonly unknown[] = []): Promise<T[]> {
    const [result] = await pool.query<T[]>(query, [...params]);
    return result;
  }
  interface BalanceRow extends RowDataPacket { available_balance_in_cents: number; pending_balance_in_cents: number; lifetime_earnings_in_cents: number }
  interface CountRow extends RowDataPacket { count: number }

  function signedEvent(type: Stripe.Event.Type, object: object): Stripe.Event {
    const payload = JSON.stringify({
      id: `evt_local_${type.replaceAll(".", "_")}`, object: "event", type,
      api_version: "2025-12-15.clover", created: Math.floor(Date.now() / 1000),
      data: { object }, livemode: false, pending_webhooks: 1, request: null,
    });
    const secret = "whsec_local_contract_only";
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  beforeAll(async () => {
    if (!databaseUrl) throw new Error("Local payout integration database URL is required");
    const target = new URL(databaseUrl);
    if (!["127.0.0.1", "localhost"].includes(target.hostname) || target.pathname !== "/creatorvault_payout_test") throw new Error("Integration tests require the isolated local creatorvault_payout_test database");
    process.env.DATABASE_URL = databaseUrl;
    pool = mysql.createPool(databaseUrl);
    const [existing] = await pool.query<RowDataPacket[]>("SHOW TABLES LIKE 'stripe_creator_payouts'");
    if (!existing.length) {
      const baseline = [
        "CREATE TABLE users (id INT PRIMARY KEY, openId VARCHAR(64) UNIQUE, name TEXT NULL)",
        "CREATE TABLE creator_balances (id INT AUTO_INCREMENT PRIMARY KEY, creator_id INT NOT NULL UNIQUE, available_balance_in_cents INT NOT NULL DEFAULT 0, pending_balance_in_cents INT NOT NULL DEFAULT 0, lifetime_earnings_in_cents INT NOT NULL DEFAULT 0, last_payout_at TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)",
        "CREATE TABLE transactions (id INT AUTO_INCREMENT PRIMARY KEY, subscription_id INT NULL, fan_id INT NOT NULL, creator_id INT NOT NULL, amount_in_cents INT NOT NULL, creator_share_in_cents INT NOT NULL, platform_share_in_cents INT NOT NULL, stripe_payment_intent_id VARCHAR(255) NULL, status ENUM('pending','completed','failed','refunded') DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
        "CREATE TABLE live_stream_tips (id INT AUTO_INCREMENT PRIMARY KEY)",
        "CREATE TABLE live_stream_donations (id INT AUTO_INCREMENT PRIMARY KEY)",
        "CREATE TABLE live_streams (id INT PRIMARY KEY, user_id INT NOT NULL)",
        "CREATE TABLE subscription_tiers (id INT PRIMARY KEY, creator_id INT NOT NULL)",
        "CREATE TABLE vaultx_creators (id INT PRIMARY KEY, user_id INT NOT NULL, total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0)",
        "CREATE TABLE vaultx_content (id INT PRIMARY KEY, creator_id INT NOT NULL, is_ppv TINYINT NOT NULL, ppv_price DECIMAL(10,2) NOT NULL, purchase_count INT NOT NULL DEFAULT 0, revenue_generated DECIMAL(10,2) NOT NULL DEFAULT 0)",
        "CREATE TABLE vaultx_ppv_purchases (id INT AUTO_INCREMENT PRIMARY KEY, fan_id INT NOT NULL, creator_id INT NOT NULL, content_id INT NOT NULL, amount_paid DECIMAL(10,2) NOT NULL, stripe_payment_intent_id VARCHAR(255) NOT NULL, status VARCHAR(30) NOT NULL, platform_fee_cents INT NULL, creator_revenue_cents INT NULL)",
      ];
      for (const query of baseline) await pool.query(query);
      const migration = await readFile(new URL("../../drizzle/0024_stripe_creator_net_payouts.sql", import.meta.url), "utf8");
      for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await pool.query(statement);
    }
    api = createServer(async (req, res) => {
      try {
        const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const body = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
        let result: unknown;
        if (requestUrl.pathname.startsWith("/v1/charges/")) {
          const id = requestUrl.pathname.split("/").at(-1) ?? "";
          result = charges.get(id);
          if (!result) throw new Error(`Unknown fixture charge ${id}`);
        } else if (requestUrl.pathname.startsWith("/v1/payment_intents/")) {
          const id = requestUrl.pathname.split("/").at(-1) ?? "";
          result = { id, object: "payment_intent", status: "succeeded", latest_charge: `ch_${id.slice(3)}` };
        } else if (requestUrl.pathname.startsWith("/v1/subscriptions/")) result = {
          id: "sub_local", object: "subscription", metadata: { tierId: "9", creatorId: "7", fanId: "42", payoutRule: "creator_net_85_v1" },
        };
        else if (requestUrl.pathname === "/v1/invoice_payments") {
          const invoiceId = requestUrl.searchParams.get("invoice") ?? "";
          const chargeId = invoicePayments.get(invoiceId);
          result = { object: "list", data: chargeId ? [{
            id: `inpay_${invoiceId}`, object: "invoice_payment", amount_paid: 10000,
            currency: "usd", status: "paid", payment: { type: "payment_intent", payment_intent: `pi_${chargeId.slice(3)}` },
          }] : [], has_more: false, url: "/v1/invoice_payments" };
        } else if (requestUrl.pathname === "/v1/accounts" && req.method === "POST") {
          const header = req.headers["idempotency-key"];
          accountRequests.push({ key: Array.isArray(header) ? header[0] : header, body });
          result = { id: "acct_creator7", object: "account", capabilities: { transfers: "inactive" } };
        } else if (requestUrl.pathname === "/v1/account_links" && req.method === "POST") {
          onboardingRequests.push(body);
          result = { object: "account_link", created: Math.floor(Date.now() / 1000), expires_at: Math.floor(Date.now() / 1000) + 300, url: `https://connect.stripe.com/setup/local-contract-${onboardingRequests.length}` };
        } else if (requestUrl.pathname.startsWith("/v1/accounts/")) result = { id: "acct_creator7", object: "account", capabilities: { transfers: accountActive ? "active" : "inactive" } };
        else if (requestUrl.pathname === "/v1/transfers" && req.method === "GET") result = {
          object: "list", data: [...transfers.values()].filter((transfer) => transfer.transfer_group === requestUrl.searchParams.get("transfer_group")), has_more: false, url: "/v1/transfers",
        };
        else if (requestUrl.pathname === "/v1/transfers" && req.method === "POST") {
          const header = req.headers["idempotency-key"];
          const key = Array.isArray(header) ? header[0] : header;
          transferRequests.push({ key, body });
          if (!key) throw new Error("A payout transfer has no idempotency key");
          if (failNextTransfer) {
            failNextTransfer = false; res.writeHead(500, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: { type: "api_error", message: "Local fixture transfer failure" } })); return;
          }
          let transfer = transfers.get(key);
          if (!transfer) {
            transfer = {
              id: `tr_local${transfers.size + 1}`, object: "transfer", amount: Number(body.get("amount")),
              amount_reversed: 0, balance_transaction: "txn_transfer", created: Math.floor(Date.now() / 1000),
              currency: body.get("currency") ?? "", description: null, destination: body.get("destination") ?? "",
              destination_payment: "py_local", livemode: false, metadata: {
                creatorPayoutId: body.get("metadata[creatorPayoutId]") ?? "",
                creatorId: body.get("metadata[creatorId]") ?? "", payoutRule: body.get("metadata[payoutRule]") ?? "",
              }, reversals: { object: "list", data: [], has_more: false, url: "/reversals" }, reversed: false,
              source_transaction: body.get("source_transaction"), source_type: "card", transfer_group: body.get("transfer_group"),
            };
            transfers.set(key, transfer);
          }
          if (refundDuringNextTransfer) {
            refundDuringNextTransfer = false;
            const transferredChargeId = typeof transfer.source_transaction === "string" ? transfer.source_transaction : transfer.source_transaction?.id ?? "";
            await settleCreatorStripeEvent(stripe, signedEvent("charge.refunded", {
              ...charges.get(transferredChargeId), refunded: true, amount_refunded: 10000,
            }));
          }
          if (dropNextTransferResponse) {
            dropNextTransferResponse = false;
            res.writeHead(500, { "content-type": "application/json", "stripe-should-retry": "false" });
            res.end(JSON.stringify({ error: { type: "api_error", message: "Provider response unavailable after transfer persisted" } }));
            return;
          }
          result = transfer;
        } else throw new Error(`Unexpected local Stripe fixture request ${req.method} ${requestUrl.pathname}`);
        res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(result));
      } catch (error: unknown) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { type: "invalid_request_error", message: error instanceof Error ? error.message : String(error) } }));
      }
    });
    await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
    const address = api.address();
    if (!address || typeof address === "string") throw new Error("Local Stripe fixture has no TCP port");
    stripe = new Stripe("sk_test_local_contract_only", { host: "127.0.0.1", port: address.port, protocol: "http", maxNetworkRetries: 0, timeout: 2000 });
  });
  beforeEach(async () => {
    for (const table of ["transactions", "stripe_creator_payouts", "creator_balances", "vaultx_ppv_purchases", "vaultx_content", "vaultx_creators", "subscription_tiers", "live_streams", "users"]) await pool.query(`DELETE FROM \`${table}\``);
    await pool.query("INSERT INTO users (id, openId, name, stripe_connect_account_id) VALUES (7,'creator7','Creator','acct_creator7'),(42,'fan42','Fan',NULL)");
    await pool.query("INSERT INTO live_streams (id,user_id) VALUES (5,7)");
    await pool.query("INSERT INTO subscription_tiers (id,creator_id) VALUES (9,7)");
    await pool.query("INSERT INTO vaultx_creators (id,user_id) VALUES (99,7)");
    await pool.query("INSERT INTO vaultx_content (id,creator_id,is_ppv,ppv_price) VALUES (100,99,1,100.00)");
    charges.clear(); invoicePayments.clear(); transfers.clear(); transferRequests.length = 0;
    accountRequests.length = 0; onboardingRequests.length = 0;
    await pool.query("UPDATE stripe_creator_payout_policy SET enabled=1 WHERE rule='creator_net_85_v1'");
    dropNextTransferResponse = false; failNextTransfer = false; refundDuringNextTransfer = false; accountActive = true; addCharge();
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
    await (await getStripePayoutSqlClient()).end();
    await pool.end();
  });

  it("persists actual fees and exactly one source-linked transfer on repeated calls", async () => {
    await prepare();
    const first = await executeCreatorChargeTransfer(stripe, "ch_test1");
    const second = await executeCreatorChargeTransfer(stripe, "ch_test1");
    expect(first.status).toBe("transferred"); expect(second.stripeTransferId).toBe(first.stripeTransferId);
    expect(first).toMatchObject({ stripeFeeInCents: 320, netAmountInCents: 9680, creatorPayoutInCents: 8228, platformRevenueInCents: 1452, stripeBalanceTransactionId: "txn_test1" });
    expect(first.feeDetails).toEqual([{ amount: 320, currency: "usd", type: "stripe_fee", description: "Fixture processing fee" }]);
    expect(transferRequests).toHaveLength(1);
    expect(transferRequests[0].key).toBe("creatorvault:net85:v1:ch_test1");
    expect(transferRequests[0].body.get("source_transaction")).toBe("ch_test1");
    const [balance] = await rows<BalanceRow>("SELECT * FROM creator_balances WHERE creator_id = 7");
    expect(balance).toMatchObject({ available_balance_in_cents: 0, pending_balance_in_cents: 0, lifetime_earnings_in_cents: 8228 });
    expect((await rows<CountRow>("SELECT COUNT(*) AS count FROM transactions"))[0].count).toBe(1);
  });
  it("serializes concurrent revenue and transfer claims", async () => {
    await prepare();
    const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => executeCreatorChargeTransfer(stripe, "ch_test1")));
    expect(attempts.some((attempt) => attempt.status === "fulfilled")).toBe(true);
    expect(transferRequests).toHaveLength(1); expect(transfers.size).toBe(1);
    expect((await rows<CountRow>("SELECT COUNT(*) AS count FROM transactions"))[0].count).toBe(1);
    expect((await rows<BalanceRow>("SELECT * FROM creator_balances WHERE creator_id = 7"))[0].lifetime_earnings_in_cents).toBe(8228);
  });
  it("recovers a Stripe success whose response was lost without sending another transfer", async () => {
    await prepare(); dropNextTransferResponse = true;
    await expect(executeCreatorChargeTransfer(stripe, "ch_test1")).rejects.toThrow();
    expect((await getStripeCreatorPayout("ch_test1"))?.status).toBe("failed");
    const recovered = await executeCreatorChargeTransfer(stripe, "ch_test1");
    expect(recovered.status).toBe("transferred"); expect(recovered.stripeTransferId).toBe("tr_local1");
    expect(transferRequests).toHaveLength(1);
  });
  it("replays the same key and parameters after a provider failure", async () => {
    await prepare(); failNextTransfer = true;
    await expect(executeCreatorChargeTransfer(stripe, "ch_test1")).rejects.toThrow(/fixture transfer failure/);
    await executeCreatorChargeTransfer(stripe, "ch_test1");
    expect(transferRequests).toHaveLength(2);
    expect(transferRequests[0].key).toBe(transferRequests[1].key);
    expect(transferRequests[0].body.toString()).toBe(transferRequests[1].body.toString());
    expect(transfers.size).toBe(1);
  });
  it("holds fees until a real balance transaction becomes available", async () => {
    addCharge("ch_test1", { fee: null });
    await expect(prepare()).rejects.toThrow(/processing fee is not available/);
    expect((await getStripeCreatorPayout("ch_test1"))?.status).toBe("pending_fee");
    expect(transferRequests).toHaveLength(0);
    addCharge(); await prepare(); await executeCreatorChargeTransfer(stripe, "ch_test1");
    expect(transferRequests).toHaveLength(1);
  });
  it("holds missing accounts, records pending net once, and resumes when linked", async () => {
    await pool.query("UPDATE users SET stripe_connect_account_id = NULL WHERE id = 7");
    await prepare(); expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("blocked_account");
    await executeCreatorChargeTransfer(stripe, "ch_test1");
    expect(transferRequests).toHaveLength(0);
    expect((await rows<BalanceRow>("SELECT * FROM creator_balances WHERE creator_id=7"))[0]).toMatchObject({ available_balance_in_cents: 0, pending_balance_in_cents: 8228, lifetime_earnings_in_cents: 8228 });
    await pool.query("UPDATE users SET stripe_connect_account_id='acct_creator7' WHERE id=7");
    await prepare(); await executeCreatorChargeTransfer(stripe, "ch_test1");
    expect(transferRequests).toHaveLength(1);
    expect((await rows<BalanceRow>("SELECT * FROM creator_balances WHERE creator_id=7"))[0].pending_balance_in_cents).toBe(0);
  });
  it("holds inactive transfer capabilities", async () => {
    accountActive = false; await prepare();
    expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("blocked_account");
    expect(transferRequests).toHaveLength(0);
  });
  it("holds refunded charges and settlement currency mismatches", async () => {
    addCharge("ch_test1", { refunded: true }); await prepare();
    expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("review_required");
    addCharge("ch_other", { settlementCurrency: "eur" }); await prepare("ch_other");
    expect((await executeCreatorChargeTransfer(stripe, "ch_other")).status).toBe("review_required");
    expect(transferRequests).toHaveLength(0);
  });
  it("never blindly resends a transfer after the idempotency retention window", async () => {
    await prepare();
    const database = await getStripePayoutDb();
    await database.update(stripeCreatorPayouts).set({ firstAttemptAt: new Date(Date.now() - 25 * 60 * 60 * 1000), status: "failed" }).where(eq(stripeCreatorPayouts.stripeChargeId, "ch_test1"));
    expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("review_required");
    expect(transferRequests).toHaveLength(0);
  });
  it("does not steal a live lease", async () => {
    await prepare();
    expect(await claimStripeCreatorPayout("ch_test1", "lease-owner")).not.toBeNull();
    expect(await claimStripeCreatorPayout("ch_test1", "other-owner")).toBeNull();
  });
  it("resolves VaultX profile 99 to user 7 and rejects wrong owners", async () => {
    expect(await resolveStripeCreatorUser({ type: "vaultx_ppv", vaultxContentId: "100", creatorId: "99" })).toBe(7);
    await expect(resolveStripeCreatorUser({ type: "vaultx_ppv", vaultxContentId: "100", creatorId: "7" })).rejects.toThrow(/profile/);
    expect(await resolveStripeCreatorUser({ userId: "7" })).toBeNull();
  });
  it("uses one net PPV purchase under simultaneous webhook/client confirmation", async () => {
    const charge = await stripe.charges.retrieve("ch_test1", { expand: ["balance_transaction"] });
    await prepareCreatorChargePayout(stripe, charge, { creatorId: 7, eventId: "evt_ppv", metadata: { type: "vaultx_ppv", vaultxContentId: "100", creatorId: "99", fanId: "42" } });
    await executeCreatorChargeTransfer(stripe, "ch_test1");
    const results = await Promise.all(Array.from({ length: 5 }, () => completeStripeVaultxPpvPurchase({ fanUserId: 42, contentId: 100, paymentIntentId: "pi_test1" })));
    expect(results.filter((result) => !result.alreadyPurchased)).toHaveLength(1);
    expect((await rows<CountRow>("SELECT COUNT(*) AS count FROM vaultx_ppv_purchases"))[0].count).toBe(1);
    const [purchase] = await rows<RowDataPacket>("SELECT creator_id,creator_revenue_cents,platform_fee_cents FROM vaultx_ppv_purchases");
    expect(purchase).toMatchObject({ creator_id: 99, creator_revenue_cents: 8228, platform_fee_cents: 1452 });
    expect((await rows<BalanceRow>("SELECT * FROM creator_balances WHERE creator_id=7"))[0]).toMatchObject({ available_balance_in_cents: 0, lifetime_earnings_in_cents: 8228 });
    expect((await rows<CountRow>("SELECT COUNT(*) AS count FROM creator_balances WHERE creator_id=99"))[0].count).toBe(0);
  });
  it("does not accept an arbitrary succeeded payment intent without its source receipt", async () => {
    await expect(completeStripeVaultxPpvPurchase({ fanUserId: 42, contentId: 100, paymentIntentId: "pi_unowned" })).rejects.toThrow(/signed webhook receipt/);
  });
  it("does not settle an unpaid asynchronous Checkout", async () => {
    const unpaid: Parameters<typeof settleCreatorCheckout>[1] = {
      id: "cs_unpaid", payment_status: "unpaid", amount_total: 10000,
      mode: "payment", payment_intent: null, currency: "usd",
      metadata: { type: "vaultlive_tip", streamId: "5", creatorId: "7" },
    };
    expect(await settleCreatorCheckout(stripe, unpaid, "evt_unpaid")).toBeNull();
    expect((await rows<CountRow>("SELECT COUNT(*) AS count FROM stripe_creator_payouts"))[0].count).toBe(0);
    expect(transferRequests).toHaveLength(0);
  });

  it("resumes a fee-pending payout through a signed charge.updated event", async () => {
    addCharge("ch_test1", { fee: null });
    await expect(prepare()).rejects.toThrow(/processing fee is not available/);
    addCharge();
    await settleCreatorStripeEvent(stripe, signedEvent("charge.updated", charges.get("ch_test1") ?? {}));
    expect((await getStripeCreatorPayout("ch_test1"))?.status).toBe("transferred");
    expect(transferRequests).toHaveLength(1);
  });
  it("resumes a blocked destination on a signed account.updated event without double paying", async () => {
    accountActive = false; await prepare(); await executeCreatorChargeTransfer(stripe, "ch_test1");
    accountActive = true;
    const event = signedEvent("account.updated", { id: "acct_creator7", object: "account", capabilities: { transfers: "active" } });
    await settleCreatorStripeEvent(stripe, event); await settleCreatorStripeEvent(stripe, event);
    expect((await getStripeCreatorPayout("ch_test1"))?.status).toBe("transferred");
    expect(transferRequests).toHaveLength(1);
  });
  it("pays the initial invoice and a renewal exactly once per captured charge", async () => {
    addCharge("ch_renewal2", { fee: 630 });
    invoicePayments.set("in_first", "ch_test1"); invoicePayments.set("in_renewal", "ch_renewal2");
    const parent = { type: "subscription_details", subscription_details: { subscription: "sub_local", metadata: null } };
    const first = signedEvent("invoice.paid", { id: "in_first", object: "invoice", amount_paid: 10000, parent, metadata: {} });
    const renewal = signedEvent("invoice.paid", { id: "in_renewal", object: "invoice", amount_paid: 10000, parent, metadata: {} });
    await settleCreatorStripeEvent(stripe, first); await settleCreatorStripeEvent(stripe, first);
    await settleCreatorStripeEvent(stripe, renewal); await settleCreatorStripeEvent(stripe, renewal);
    expect(transferRequests).toHaveLength(2);
    expect((await getStripeCreatorPayout("ch_test1"))?.stripeInvoiceId).toBe("in_first");
    expect((await getStripeCreatorPayout("ch_renewal2"))?.stripeInvoiceId).toBe("in_renewal");
    expect((await rows<CountRow>("SELECT COUNT(*) AS count FROM transactions"))[0].count).toBe(2);
    expect((await rows<BalanceRow>("SELECT * FROM creator_balances WHERE creator_id=7"))[0].available_balance_in_cents).toBe(0);
  });
  it("persists reversals and refunds as held states without issuing replacement transfers", async () => {
    await prepare(); await executeCreatorChargeTransfer(stripe, "ch_test1");
    const transfer = [...transfers.values()][0];
    await settleCreatorStripeEvent(stripe, signedEvent("transfer.reversed", { ...transfer, reversed: true, amount_reversed: transfer.amount }));
    expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("reversed");
    await settleCreatorStripeEvent(stripe, signedEvent("charge.refunded", { ...charges.get("ch_test1"), refunded: true, amount_refunded: 10000 }));
    expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("review_required");
    expect(transferRequests).toHaveLength(1);
  });
  it("holds historical charges instead of backfilling potentially manual-paid balances", async () => {
    const historical = charges.get("ch_test1");
    if (!historical) throw new Error("Historical test charge missing");
    historical.created = 1;
    await prepare();
    expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("review_required");
    expect(transferRequests).toHaveLength(0);
  });
  it("honors the payout disable policy without creating a transfer", async () => {
    await prepare(); await pool.query("UPDATE stripe_creator_payout_policy SET enabled=0 WHERE rule='creator_net_85_v1'");
    await expect(executeCreatorChargeTransfer(stripe, "ch_test1")).rejects.toThrow(/policy is not enabled/);
    expect(transferRequests).toHaveLength(0);
  });
  it("rejects an invalid webhook signature through the actual Stripe SDK", () => {
    expect(() => stripe.webhooks.constructEvent("{}", "invalid", "whsec_local_contract_only")).toThrow();
  });
  it("persists one Connect account and returns a fresh onboarding link on each request", async () => {
    await pool.query("UPDATE users SET stripe_connect_account_id=NULL WHERE id=7");
    const first = await createCreatorConnectOnboarding(stripe, 7, "https://creatorvault.live");
    const second = await createCreatorConnectOnboarding(stripe, 7, "https://creatorvault.live");
    expect(first.accountId).toBe("acct_creator7"); expect(second.accountId).toBe(first.accountId);
    expect(first.onboardingUrl).not.toBe(second.onboardingUrl);
    expect(accountRequests).toHaveLength(1); expect(onboardingRequests).toHaveLength(2);
    expect(accountRequests[0].key).toBe("creatorvault:connect-account:v1:7");
    expect(accountRequests[0].body.get("capabilities[transfers][requested]")).toBe("true");
    expect(onboardingRequests[0].get("return_url")).toBe("https://creatorvault.live/dashboard?stripeConnect=complete");
    expect(onboardingRequests[0].get("refresh_url")).toBe("https://creatorvault.live/dashboard?stripeConnect=refresh");
    expect((await rows<RowDataPacket>("SELECT stripe_connect_account_id FROM users WHERE id=7"))[0].stripe_connect_account_id).toBe("acct_creator7");
  });
  it("does not allow an insecure arbitrary onboarding callback origin", async () => {
    await expect(createCreatorConnectOnboarding(stripe, 7, "http://attacker.invalid")).rejects.toThrow(/trusted HTTPS/);
    expect(accountRequests).toHaveLength(0); expect(onboardingRequests).toHaveLength(0);
  });
  it("never mixes non-USD minor units into the legacy USD balance or transaction tables", async () => {
    addCharge("ch_test1", { currency: "eur" }); await prepare();
    const payout = await executeCreatorChargeTransfer(stripe, "ch_test1");
    expect(payout).toMatchObject({ status: "transferred", currency: "eur", creatorPayoutInCents: 8228 });
    expect(transferRequests[0].body.get("currency")).toBe("eur");
    expect((await rows<CountRow>("SELECT COUNT(*) AS count FROM creator_balances"))[0].count).toBe(0);
    expect((await rows<CountRow>("SELECT COUNT(*) AS count FROM transactions"))[0].count).toBe(0);
  });
  it("preserves review status and the actual transfer ID when a refund races the provider response", async () => {
    await prepare(); refundDuringNextTransfer = true;
    const payout = await executeCreatorChargeTransfer(stripe, "ch_test1");
    expect(payout.status).toBe("review_required"); expect(payout.stripeTransferId).toBe("tr_local1");
    expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("review_required");
    expect(transferRequests).toHaveLength(1);
    expect((await rows<BalanceRow>("SELECT * FROM creator_balances WHERE creator_id=7"))[0].pending_balance_in_cents).toBe(0);
  });
  it("does not reprice already-recorded pending earnings after a fee snapshot changes", async () => {
    accountActive = false; await prepare(); await executeCreatorChargeTransfer(stripe, "ch_test1");
    addCharge("ch_test1", { fee: 400 }); accountActive = true; await prepare();
    expect((await executeCreatorChargeTransfer(stripe, "ch_test1")).status).toBe("review_required");
    expect((await rows<BalanceRow>("SELECT * FROM creator_balances WHERE creator_id=7"))[0].pending_balance_in_cents).toBe(8228);
    expect(transferRequests).toHaveLength(0);
  });
});
