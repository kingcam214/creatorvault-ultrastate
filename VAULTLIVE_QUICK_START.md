# 🎥 VAULTLIVE QUICK START TESTING GUIDE

**5-Minute Test to Verify VaultLive Works**

---

## 🚀 FASTEST PATH TO VERIFICATION

### Step 1: Open Two Browser Windows (30 seconds)

**Window 1 (Host):**
```
https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/vault-live
```

**Window 2 (Viewer):**
```
Open incognito/private window with same URL
```

---

### Step 2: Start Broadcasting (1 minute)

**In Window 1:**
1. Enter title: "Quick Test"
2. Click "Start Broadcasting"
3. Allow camera + mic
4. ✅ **VERIFY:** See your video feed

---

### Step 3: Join as Viewer (1 minute)

**In Window 2 (incognito):**
1. See "Quick Test" in active streams
2. Click to join
3. ✅ **VERIFY:** See host's video playing
4. ✅ **VERIFY:** Viewer count shows "1"

---

### Step 4: Send Tip (1 minute)

**In Window 2 (viewer):**
1. Find tip button
2. Enter: $10
3. Message: "Test tip"
4. Send
5. ✅ **VERIFY:** Tip appears

---

### Step 5: Check Database (1 minute)

**Management UI → Database:**

```sql
-- Check stream
SELECT * FROM live_streams ORDER BY created_at DESC LIMIT 1;

-- Check 85/15 split
SELECT 
  amount/100 as tip_dollars,
  creator_amount/100 as creator_gets,
  platform_amount/100 as platform_gets
FROM live_stream_tips 
ORDER BY created_at DESC LIMIT 1;
```

✅ **VERIFY:** creator_gets = $8.50, platform_gets = $1.50

---

### Step 6: End Stream (30 seconds)

**In Window 1:**
1. Click "End Stream"
2. Confirm
3. ✅ **VERIFY:** Stream ends for both windows

---

## ✅ SUCCESS CRITERIA

If all 6 steps passed:
- **VaultLive is FULLY FUNCTIONAL**
- **85/15 revenue split is WORKING**
- **Ready for influencer onboarding**

---

## 🔴 IF SOMETHING FAILS

**Camera/mic not working?**
- Check browser permissions
- Try Chrome/Edge (best WebRTC support)
- Check console for errors

**Viewer can't see video?**
- Check Socket.IO connection (Network tab)
- Verify both windows on same domain
- Check firewall/VPN

**Tip not recording?**
- Check database connection
- Verify tRPC router is running
- Check server logs

**85/15 split wrong?**
- Check `db-vaultlive.ts` calculateRevenueSplit()
- Verify database schema has creator_amount, platform_amount columns

---

## 📋 QUICK DATABASE CHECKS

**Get your user ID:**
```sql
SELECT id, name, role FROM users WHERE role IN ('admin', 'king') LIMIT 1;
```

**Check your streams:**
```sql
SELECT 
  id, title, status, 
  viewer_count,
  total_tips/100 as tips_dollars,
  total_revenue/100 as revenue_dollars
FROM live_streams 
WHERE creator_id = [YOUR_USER_ID]
ORDER BY created_at DESC;
```

**Verify 85/15 split:**
```sql
SELECT 
  'Tips' as type,
  COUNT(*) as count,
  SUM(amount)/100 as total,
  ROUND(SUM(creator_amount)*100.0/SUM(amount), 2) as creator_pct
FROM live_stream_tips
UNION ALL
SELECT 
  'Donations',
  COUNT(*),
  SUM(amount)/100,
  ROUND(SUM(creator_amount)*100.0/SUM(amount), 2)
FROM live_stream_donations;
```

Expected: creator_pct = 85.00 for both

---

## 🎯 NEXT STEPS AFTER VERIFICATION

1. **Build Influencer Onboarding** - Role-gated access to VaultLive
2. **Create Influencer Dashboard** - Revenue tracking, stream analytics
3. **Add Payment Processing** - Stripe integration for real money
4. **Launch to First Influencer** - Invite celebrity/influencer to test

---

## 📞 NEED HELP?

**Files to check:**
- `/server/routers/vaultLive.ts` - API endpoints
- `/server/db-vaultlive.ts` - Database logic
- `/client/src/pages/VaultLiveStream.tsx` - UI
- `/server/webrtc.ts` - Signaling server

**Common issues:**
- Browser compatibility: Use Chrome/Edge
- HTTPS required: Already configured
- Socket.IO port: Already exposed
- Database tables: Already created

---

**🦁 VAULTLIVE IS READY TO COMPETE WITH FANBASE**

*Complete this 5-minute test, then proceed to influencer onboarding.*
