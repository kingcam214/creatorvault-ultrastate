/**
 * telegramConnectRoute.ts
 * 
 * Handles:
 * 1. GET /telegram-connect?purchaseId=<id>
 *    Serves a mobile-optimized page with Telegram deep link for identity capture.
 *    Generates a unique connect token stored in vaultx_ppv_purchases.telegram_connect_token.
 * 
 * 2. GET /api/telegram-connect/status?purchaseId=<id>
 *    Polls whether the buyer has connected their Telegram (telegram_link_status='linked').
 *    Used by the page to auto-redirect after successful link.
 */

import { Router } from "express";
import crypto from "crypto";
import mysql2 from "mysql2/promise";

const BOT_USERNAME = "VaultMoney_CreatorBot";
const VIP_CHANNEL_NAME = "CreatorVault_VIP";

function getPool() {
  return mysql2.createPool(process.env.DATABASE_URL as string);
}

export function registerTelegramConnectRoutes(app: Router) {
  // ─── GET /telegram-connect?purchaseId=<id> ─────────────────────────────────
  app.get("/telegram-connect", async (req, res) => {
    const purchaseId = parseInt(req.query.purchaseId as string);
    if (!purchaseId || isNaN(purchaseId)) {
      return res.status(400).send("Invalid purchase ID");
    }

    const pool = getPool();
    try {
      // Fetch purchase and verify it exists
      const [rows] = await pool.query(
        `SELECT p.id, p.fan_id, p.amount_paid, p.telegram_link_status, p.telegram_connect_token,
                p.buyer_telegram_id, u.name, u.email
         FROM vaultx_ppv_purchases p
         LEFT JOIN users u ON u.id = p.fan_id
         WHERE p.id = ? LIMIT 1`,
        [purchaseId]
      ) as any;

      if (!rows.length) {
        pool.end();
        return res.status(404).send("Purchase not found");
      }

      const purchase = rows[0];

      // If already linked, redirect to VaultX
      if (purchase.telegram_link_status === "linked" && purchase.buyer_telegram_id) {
        pool.end();
        return res.redirect(302, "https://creatorvault.live/vaultx");
      }

      // Generate or reuse connect token
      let token = purchase.telegram_connect_token;
      if (!token) {
        token = crypto.randomBytes(16).toString("hex");
        await pool.query(
          "UPDATE vaultx_ppv_purchases SET telegram_connect_token = ?, telegram_link_status = 'pending' WHERE id = ?",
          [token, purchaseId]
        );
      }

      pool.end();

      const deepLink = `https://t.me/${BOT_USERNAME}?start=purchase_${purchaseId}_${token}`;
      const amountFormatted = `$${parseFloat(purchase.amount_paid).toFixed(2)}`;

      // Mobile-optimized HTML page — no placeholders, no lorem ipsum
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Connect Telegram — VaultX VIP Access</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 20px;
    }
    .card {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.1);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.4);
      border-radius: 100px;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #a78bfa;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 24px;
    }
    .lock-icon {
      font-size: 48px;
      margin-bottom: 16px;
      display: block;
    }
    h1 {
      font-size: 26px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #fff 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 15px;
      color: rgba(255,255,255,0.6);
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .purchase-proof {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 32px;
      text-align: left;
    }
    .purchase-proof .label {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
    .purchase-proof .value {
      font-size: 18px;
      font-weight: 700;
      color: #10b981;
    }
    .purchase-proof .purchase-id {
      font-size: 12px;
      color: rgba(255,255,255,0.3);
      margin-top: 4px;
    }
    .cta-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: linear-gradient(135deg, #2481cc 0%, #1a6fb5 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 16px;
      padding: 18px 24px;
      font-size: 17px;
      font-weight: 700;
      width: 100%;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 8px 24px rgba(36, 129, 204, 0.4);
      margin-bottom: 16px;
    }
    .cta-btn:active {
      transform: scale(0.98);
    }
    .tg-logo {
      width: 28px;
      height: 28px;
    }
    .steps {
      text-align: left;
      margin-bottom: 28px;
    }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
    }
    .step-num {
      width: 24px;
      height: 24px;
      background: rgba(139, 92, 246, 0.2);
      border: 1px solid rgba(139, 92, 246, 0.4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      color: #a78bfa;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .step-text {
      font-size: 14px;
      color: rgba(255,255,255,0.7);
      line-height: 1.4;
    }
    .step-text strong {
      color: #fff;
    }
    .footer-note {
      font-size: 12px;
      color: rgba(255,255,255,0.3);
      line-height: 1.5;
    }
    .status-check {
      display: none;
      align-items: center;
      gap: 8px;
      justify-content: center;
      font-size: 13px;
      color: rgba(255,255,255,0.5);
      margin-top: 16px;
    }
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: #a78bfa;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .connected-state {
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .connected-state .check {
      font-size: 56px;
    }
    .connected-state h2 {
      font-size: 22px;
      font-weight: 700;
      color: #10b981;
    }
    .connected-state p {
      font-size: 14px;
      color: rgba(255,255,255,0.6);
    }
  </style>
</head>
<body>
  <div class="card">
    <!-- Default: Connect state -->
    <div id="connect-state">
      <div class="badge">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#a78bfa" stroke-width="1.5"/>
          <path d="M4 6l1.5 1.5L8 4" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Purchase Confirmed
      </div>

      <span class="lock-icon">💎</span>
      <h1>Connect Telegram to Receive VIP Access</h1>
      <p class="subtitle">Your purchase unlocks <strong>${VIP_CHANNEL_NAME}</strong>. Connect your Telegram to receive your personal invite link instantly.</p>

      <div class="purchase-proof">
        <div class="label">Purchase Confirmed</div>
        <div class="value">${amountFormatted} unlocked</div>
        <div class="purchase-id">Order #${purchaseId}</div>
      </div>

      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">Tap <strong>Open in Telegram</strong> below</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">Press <strong>Start</strong> in the bot chat</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">Receive your <strong>single-use VIP invite link</strong> instantly</div>
        </div>
      </div>

      <a href="${deepLink}" class="cta-btn" id="tg-btn" onclick="onTelegramTap()">
        <svg class="tg-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.93 6.77l-1.68 7.92c-.12.54-.45.67-.91.42l-2.52-1.86-1.22 1.17c-.13.13-.25.25-.51.25l.18-2.57 4.65-4.2c.2-.18-.04-.28-.31-.1L7.9 14.37l-2.47-.77c-.54-.17-.55-.54.11-.8l9.65-3.72c.45-.16.84.11.69.79z" fill="white"/>
        </svg>
        Open in Telegram
      </a>

      <div class="status-check" id="status-check">
        <div class="spinner"></div>
        <span>Waiting for Telegram connection...</span>
      </div>

      <p class="footer-note">Your invite link is single-use and expires in 24 hours. Do not share it.</p>
    </div>

    <!-- Connected state (shown after polling confirms link) -->
    <div class="connected-state" id="connected-state">
      <div class="check">✅</div>
      <h2>Telegram Connected!</h2>
      <p>Your VIP invite link has been sent to your Telegram DMs. Check your messages from <strong>@${BOT_USERNAME}</strong>.</p>
    </div>
  </div>

  <script>
    const PURCHASE_ID = ${purchaseId};
    let pollInterval;

    function onTelegramTap() {
      // Start polling after tap
      setTimeout(() => {
        document.getElementById('status-check').style.display = 'flex';
        pollInterval = setInterval(checkStatus, 3000);
      }, 2000);
    }

    async function checkStatus() {
      try {
        const res = await fetch('/api/telegram-connect/status?purchaseId=' + PURCHASE_ID);
        const data = await res.json();
        if (data.linked) {
          clearInterval(pollInterval);
          document.getElementById('connect-state').style.display = 'none';
          document.getElementById('connected-state').style.display = 'flex';
          // Redirect to VaultX after 3 seconds
          setTimeout(() => {
            window.location.href = 'https://creatorvault.live/vaultx';
          }, 3000);
        }
      } catch(e) {}
    }

    // Auto-start polling if page is loaded (handles back-navigation)
    window.addEventListener('focus', () => {
      if (!pollInterval) {
        document.getElementById('status-check').style.display = 'flex';
        pollInterval = setInterval(checkStatus, 3000);
      }
    });
  </script>
</body>
</html>`;

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Cache-Control", "no-store");
      return res.send(html);

    } catch (err: any) {
      pool.end();
      console.error("[telegram-connect] page error:", err.message);
      return res.status(500).send("Server error");
    }
  });

  // ─── GET /api/telegram-connect/status?purchaseId=<id> ──────────────────────
  app.get("/api/telegram-connect/status", async (req, res) => {
    const purchaseId = parseInt(req.query.purchaseId as string);
    if (!purchaseId || isNaN(purchaseId)) {
      return res.json({ linked: false });
    }

    const pool = getPool();
    try {
      const [rows] = await pool.query(
        "SELECT telegram_link_status, buyer_telegram_id FROM vaultx_ppv_purchases WHERE id = ? LIMIT 1",
        [purchaseId]
      ) as any;
      pool.end();

      if (!rows.length) return res.json({ linked: false });
      const p = rows[0];
      return res.json({
        linked: p.telegram_link_status === "linked" && !!p.buyer_telegram_id,
        status: p.telegram_link_status,
      });
    } catch (err: any) {
      pool.end();
      return res.json({ linked: false });
    }
  });
}
