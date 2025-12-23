# 🧪 STRIPE + VAULTLIVE END-TO-END TEST

**Single real-device test to verify complete payment flow**

---

## ⚠️ PREREQUISITES

Before starting this test, you MUST:

1. **Claim Stripe test sandbox** (expires 2026-02-12)
   - Go to: https://dashboard.stripe.com/claim_sandbox/YWNjdF8xU2UxaktQdk9SWDZXRUVnLDE3NjYyOTk1Njcv100vs994YiW
   - Click "Claim sandbox"
   - This activates test mode with test API keys

2. **Configure Stripe webhook** (required for payment completion)
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click "Add endpoint"
   - URL: `https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/api/stripe/webhook`
   - Events to send: `checkout.session.completed`
   - Copy webhook signing secret
   - Update `STRIPE_WEBHOOK_SECRET` in project secrets (Management UI → Settings → Secrets)

---

## 🎯 TEST FLOW (15 MINUTES)

### Step 1: Start VaultLive Stream (2 minutes)

**Window 1 (Host):**
```
URL: https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/vault-live
```

1. Enter stream title: "Stripe Test Stream"
2. Click "Start Broadcasting"
3. Allow camera + microphone permissions
4. ✅ **VERIFY:** See your video feed

---

### Step 2: Join as Viewer (2 minutes)

**Window 2 (Viewer - Incognito):**
```
URL: https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/vault-live
```

1. Open incognito/private window
2. See "Stripe Test Stream" in active streams
3. Click to join
4. ✅ **VERIFY:** See host's video playing
5. ✅ **VERIFY:** Viewer count shows "1"

---

### Step 3: Send Tip via Stripe (5 minutes)

**Window 2 (Viewer):**

1. Find "Send Tip" button
2. Enter amount: **$10.00** (1000 cents)
3. Enter message: "Test tip via Stripe"
4. Click "Send Tip"
5. ✅ **VERIFY:** Redirected to Stripe Checkout

**Stripe Checkout Page:**

6. Use test card: `4242 4242 4242 4242`
7. Expiry: Any future date (e.g., 12/25)
8. CVC: Any 3 digits (e.g., 123)
9. Name: Test User
10. Email: test@example.com
11. Click "Pay"
12. ✅ **VERIFY:** Redirected back to VaultLive with success message

---

### Step 4: Verify Payment in Database (3 minutes)

**Management UI → Database:**

```sql
-- Check stream
SELECT * FROM live_streams 
WHERE title = 'Stripe Test Stream' 
ORDER BY created_at DESC LIMIT 1;
```

✅ **VERIFY:** Stream exists with ID (note the ID for next query)

```sql
-- Check tip with 85/15 split
SELECT 
  id,
  stream_id,
  amount/100 as tip_dollars,
  creator_amount/100 as creator_gets,
  platform_amount/100 as platform_gets,
  message,
  created_at
FROM live_stream_tips 
WHERE stream_id = [STREAM_ID]
ORDER BY created_at DESC LIMIT 1;
```

✅ **VERIFY:**
- `tip_dollars` = 10.00
- `creator_gets` = 8.50 (85%)
- `platform_gets` = 1.50 (15%)
- `message` = "Test tip via Stripe"

---

### Step 5: Check Stripe Dashboard (2 minutes)

**Stripe Dashboard:**
```
URL: https://dashboard.stripe.com/test/payments
```

1. Find the $10.00 payment
2. Click to view details
3. ✅ **VERIFY:** Status = "Succeeded"
4. ✅ **VERIFY:** Metadata contains:
   - `type` = "vaultlive_tip"
   - `streamId` = [STREAM_ID]
   - `creatorAmount` = "850"
   - `platformAmount` = "150"

---

### Step 6: End Stream (1 minute)

**Window 1 (Host):**

1. Click "End Stream"
2. Confirm
3. ✅ **VERIFY:** Stream ends for both windows
4. ✅ **VERIFY:** Stream status in database changes to "ended"

```sql
SELECT status FROM live_streams WHERE title = 'Stripe Test Stream';
```

Expected: `status` = "ended"

---

## ✅ SUCCESS CRITERIA

**ALL of the following MUST be true:**

1. ✅ Stream started successfully with camera/mic
2. ✅ Viewer joined and saw live video
3. ✅ Viewer count updated to "1"
4. ✅ Stripe Checkout opened with correct amount
5. ✅ Payment completed successfully
6. ✅ Tip recorded in database with 85/15 split
7. ✅ Payment appears in Stripe dashboard
8. ✅ Webhook received and processed
9. ✅ Stream ended cleanly

**If ANY step fails, document the error and report it.**

---

## 🔴 TROUBLESHOOTING

### Stripe Checkout doesn't open
- Check browser console for errors
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- Check `createTipCheckout` tRPC procedure

### Payment succeeds but not in database
- Check webhook is configured in Stripe dashboard
- Verify webhook URL is correct
- Check server logs for webhook errors
- Verify `STRIPE_WEBHOOK_SECRET` matches

### 85/15 split is wrong
- Check `stripeVaultLive.ts` calculateRevenueSplit logic
- Verify metadata is passed correctly
- Check `db-vaultlive.ts` recordTip function

### Stream won't start
- Check camera/mic permissions
- Try Chrome/Edge (best WebRTC support)
- Check Socket.IO connection

---

## 📋 TEST RESULTS TEMPLATE

**Date:** [DATE]
**Tester:** [NAME]
**Browser:** [Chrome/Edge/Safari/Firefox]
**OS:** [Windows/Mac/Linux]

**Results:**

- [ ] Step 1: Stream started ✅ / ❌
- [ ] Step 2: Viewer joined ✅ / ❌
- [ ] Step 3: Stripe Checkout ✅ / ❌
- [ ] Step 4: Database verification ✅ / ❌
- [ ] Step 5: Stripe dashboard ✅ / ❌
- [ ] Step 6: Stream ended ✅ / ❌

**Issues encountered:**
[Describe any problems]

**Screenshots:**
[Attach screenshots of key steps]

**Overall result:** PASS / FAIL

---

## 🚀 NEXT STEPS AFTER PASSING

1. **Switch to live Stripe keys** (when ready for production)
   - Replace test keys with live keys in project secrets
   - Update webhook URL to production domain

2. **Invite first influencer**
   - Share `/join-vaultlive` page
   - Guide through `/onboard/influencer` flow
   - Support first live stream

3. **Monitor first real payments**
   - Watch Stripe dashboard
   - Verify 85/15 split in production
   - Ensure payouts work correctly

---

**🦁 VAULTLIVE IS READY TO COMPETE WITH FANBASE**

*Complete this test, then launch to your first influencer.*
