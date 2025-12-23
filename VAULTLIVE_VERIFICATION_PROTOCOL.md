# 🎥 VAULTLIVE END-TO-END VERIFICATION PROTOCOL

**Purpose:** Verify VaultLive streaming system works end-to-end with real devices, camera/mic access, WebRTC peer connections, tipping with 85/15 revenue split, and database persistence.

**Date:** December 23, 2024  
**Status:** READY FOR TESTING  
**Tester:** KingCam (Owner)

---

## 🔗 TEST URLS

**Primary Test URL (Host):**
```
https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/vault-live
```

**Secondary Test URL (Viewer):**
```
https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/vault-live
```

**Access Path:**
1. Navigate to Creator Tools: `https://3000-iwfr5umzbitqw8es11bym-9c3c9d70.manusvm.computer/creator-tools`
2. Click "VaultLive Streaming" (pink featured card)
3. Or direct: `/vault-live`

---

## 📋 TEST PROTOCOL

### TEST 1: HOST STREAM START (Camera/Mic Access)

**Device:** Primary device (laptop/desktop with camera/mic)

**Steps:**
1. Navigate to `/vault-live`
2. Enter stream title: "Test Stream - KingCam Live"
3. Click "Start Broadcasting"
4. **VERIFY:** Browser prompts for camera/mic permissions
5. **VERIFY:** Allow camera and microphone access
6. **VERIFY:** Video preview appears showing your camera feed
7. **VERIFY:** "Broadcasting" status indicator appears
8. **VERIFY:** Stream controls visible (End Stream, Mute, Camera toggle)

**Pass Criteria:**
- ✅ Camera permission granted
- ✅ Microphone permission granted
- ✅ Video feed visible in preview
- ✅ Audio levels showing activity
- ✅ "Broadcasting" status displayed
- ✅ Stream ID generated and visible

**Database Verification:**
```sql
-- Check live_streams table
SELECT * FROM live_streams 
WHERE creator_id = [YOUR_USER_ID] 
ORDER BY created_at DESC 
LIMIT 1;

-- Expected: 1 row with status='live', title='Test Stream - KingCam Live'
```

**Screenshot Checklist:**
- [ ] Camera permission dialog
- [ ] Video preview with your face
- [ ] Broadcasting status indicator
- [ ] Stream controls visible

---

### TEST 2: VIEWER JOIN (Second Device/Incognito)

**Device:** Secondary device OR incognito window

**Steps:**
1. Open incognito/private browsing window OR use phone/tablet
2. Navigate to same URL: `/vault-live`
3. **VERIFY:** See list of active streams
4. Click on "Test Stream - KingCam Live"
5. **VERIFY:** Video player loads
6. **VERIFY:** Host's video feed appears (your camera from TEST 1)
7. **VERIFY:** Audio plays (if host is speaking)
8. **VERIFY:** Viewer count updates to "1 viewer"

**Pass Criteria:**
- ✅ Active streams list visible
- ✅ Stream appears in list
- ✅ Click joins stream successfully
- ✅ Video playback working
- ✅ Audio playback working
- ✅ Viewer count increments to 1

**Database Verification:**
```sql
-- Check live_stream_viewers table
SELECT * FROM live_stream_viewers 
WHERE stream_id = [STREAM_ID_FROM_TEST1]
ORDER BY joined_at DESC;

-- Expected: 1 row with viewer data
```

**Screenshot Checklist:**
- [ ] Active streams list
- [ ] Stream card with title
- [ ] Video player with host feed
- [ ] Viewer count showing "1 viewer"

---

### TEST 3: VIEWER COUNT UPDATES (Real-Time)

**Devices:** Both host and viewer devices

**Steps:**
1. On **HOST device**: Check viewer count display
2. **VERIFY:** Shows "1 viewer" (from TEST 2)
3. On **VIEWER device**: Leave stream (close tab or navigate away)
4. On **HOST device**: Wait 5 seconds
5. **VERIFY:** Viewer count updates to "0 viewers"
6. On **VIEWER device**: Rejoin stream
7. On **HOST device**: Wait 5 seconds
8. **VERIFY:** Viewer count updates back to "1 viewer"

**Pass Criteria:**
- ✅ Viewer count shows 1 when viewer joins
- ✅ Viewer count shows 0 when viewer leaves
- ✅ Viewer count updates within 5 seconds
- ✅ Real-time updates working via Socket.IO

**Database Verification:**
```sql
-- Check viewer watch duration
SELECT 
  viewer_id,
  joined_at,
  left_at,
  TIMESTAMPDIFF(SECOND, joined_at, left_at) as watch_duration_seconds
FROM live_stream_viewers 
WHERE stream_id = [STREAM_ID_FROM_TEST1]
ORDER BY joined_at DESC;

-- Expected: Multiple rows showing join/leave timestamps
```

---

### TEST 4: TIPPING SYSTEM (85/15 Revenue Split)

**Device:** Viewer device

**Steps:**
1. On **VIEWER device**: Locate tip/donation button
2. Enter tip amount: $10.00
3. Enter message: "Great stream! Keep it up 🔥"
4. Click "Send Tip"
5. **VERIFY:** Tip confirmation appears
6. **VERIFY:** Tip appears in stream chat/overlay
7. On **HOST device**: Check tip notification
8. **VERIFY:** Tip notification appears with amount and message

**Pass Criteria:**
- ✅ Tip form accessible
- ✅ Tip submission successful
- ✅ Tip appears in UI
- ✅ Host receives notification
- ✅ Tip message displayed

**Database Verification (CRITICAL - 85/15 SPLIT):**
```sql
-- Check live_stream_tips table
SELECT 
  id,
  stream_id,
  viewer_id,
  amount,
  creator_amount,
  platform_amount,
  message,
  created_at
FROM live_stream_tips 
WHERE stream_id = [STREAM_ID_FROM_TEST1]
ORDER BY created_at DESC;

-- Expected: 1 row with:
-- amount = 1000 (cents)
-- creator_amount = 850 (85%)
-- platform_amount = 150 (15%)
-- message = "Great stream! Keep it up 🔥"

-- VERIFY SPLIT CALCULATION:
SELECT 
  amount / 100 as tip_dollars,
  creator_amount / 100 as creator_dollars,
  platform_amount / 100 as platform_dollars,
  (creator_amount * 100.0 / amount) as creator_percentage,
  (platform_amount * 100.0 / amount) as platform_percentage
FROM live_stream_tips 
WHERE stream_id = [STREAM_ID_FROM_TEST1];

-- Expected:
-- tip_dollars = 10.00
-- creator_dollars = 8.50
-- platform_dollars = 1.50
-- creator_percentage = 85.00
-- platform_percentage = 15.00
```

**Screenshot Checklist:**
- [ ] Tip form with amount and message
- [ ] Tip confirmation dialog
- [ ] Tip in stream overlay
- [ ] Host tip notification

---

### TEST 5: DONATION SYSTEM (85/15 Revenue Split)

**Device:** Viewer device

**Steps:**
1. On **VIEWER device**: Locate donation button (if separate from tips)
2. Enter donation amount: $25.00
3. Enter message: "Supporting your content!"
4. Click "Send Donation"
5. **VERIFY:** Donation confirmation appears
6. **VERIFY:** Donation recorded

**Pass Criteria:**
- ✅ Donation form accessible
- ✅ Donation submission successful
- ✅ Donation confirmation displayed

**Database Verification (CRITICAL - 85/15 SPLIT):**
```sql
-- Check live_stream_donations table
SELECT 
  id,
  stream_id,
  viewer_id,
  amount,
  creator_amount,
  platform_amount,
  message,
  payment_status,
  created_at
FROM live_stream_donations 
WHERE stream_id = [STREAM_ID_FROM_TEST1]
ORDER BY created_at DESC;

-- Expected: 1 row with:
-- amount = 2500 (cents)
-- creator_amount = 2125 (85%)
-- platform_amount = 375 (15%)
-- payment_status = 'completed'

-- VERIFY SPLIT CALCULATION:
SELECT 
  amount / 100 as donation_dollars,
  creator_amount / 100 as creator_dollars,
  platform_amount / 100 as platform_dollars,
  (creator_amount * 100.0 / amount) as creator_percentage,
  (platform_amount * 100.0 / amount) as platform_percentage
FROM live_stream_donations 
WHERE stream_id = [STREAM_ID_FROM_TEST1];

-- Expected:
-- donation_dollars = 25.00
-- creator_dollars = 21.25
-- platform_dollars = 3.75
-- creator_percentage = 85.00
-- platform_percentage = 15.00
```

---

### TEST 6: END STREAM (State Updates + Cleanup)

**Device:** Host device

**Steps:**
1. On **HOST device**: Click "End Stream" button
2. **VERIFY:** Confirmation dialog appears
3. Confirm end stream
4. **VERIFY:** Stream stops
5. **VERIFY:** Camera/mic access released
6. **VERIFY:** Redirected to stream summary or creator tools
7. On **VIEWER device**: Check stream status
8. **VERIFY:** Stream ends for viewer
9. **VERIFY:** "Stream ended" message appears

**Pass Criteria:**
- ✅ End stream button works
- ✅ Confirmation dialog shown
- ✅ Stream stops successfully
- ✅ Camera/mic released
- ✅ Viewer sees stream ended
- ✅ WebRTC connections cleaned up

**Database Verification:**
```sql
-- Check live_streams table for ended stream
SELECT 
  id,
  title,
  status,
  started_at,
  ended_at,
  TIMESTAMPDIFF(MINUTE, started_at, ended_at) as duration_minutes,
  viewer_count,
  total_tips,
  total_donations,
  total_revenue
FROM live_streams 
WHERE id = [STREAM_ID_FROM_TEST1];

-- Expected:
-- status = 'ended'
-- ended_at = [timestamp]
-- duration_minutes = [calculated]
-- viewer_count = [peak count]
-- total_tips = 1000 (from TEST 4)
-- total_donations = 2500 (from TEST 5)
-- total_revenue = 3500

-- Check viewer cleanup
SELECT COUNT(*) as active_viewers
FROM live_stream_viewers 
WHERE stream_id = [STREAM_ID_FROM_TEST1]
AND left_at IS NULL;

-- Expected: 0 (all viewers should have left_at timestamp)
```

**Screenshot Checklist:**
- [ ] End stream confirmation dialog
- [ ] Stream ended successfully message
- [ ] Stream summary (if shown)
- [ ] Viewer "stream ended" message

---

## 🎯 OVERALL PASS/FAIL CRITERIA

### ✅ MUST PASS (Critical)
- [ ] Camera/mic access granted and working
- [ ] Video streaming host → viewer
- [ ] Audio streaming host → viewer
- [ ] Viewer count updates in real-time
- [ ] Tips recorded with 85/15 split
- [ ] Donations recorded with 85/15 split
- [ ] Stream ends cleanly with state updates
- [ ] All database tables populated correctly

### ⚠️ SHOULD PASS (Important)
- [ ] WebRTC peer connection established < 5 seconds
- [ ] Video quality acceptable (no major lag/pixelation)
- [ ] Audio quality acceptable (no major distortion)
- [ ] UI responsive on mobile devices
- [ ] Tip/donation notifications appear < 2 seconds

### 💡 NICE TO HAVE (Enhancement)
- [ ] Stream preview before going live
- [ ] Viewer chat functionality
- [ ] Stream goals/progress bars
- [ ] Multiple camera sources
- [ ] Screen sharing option

---

## 📊 DATABASE VERIFICATION SUMMARY

**Run this comprehensive query after all tests:**

```sql
-- VAULTLIVE VERIFICATION SUMMARY
SELECT 
  'Streams' as table_name,
  COUNT(*) as total_rows,
  SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as live_count,
  SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as ended_count
FROM live_streams
UNION ALL
SELECT 
  'Viewers' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT viewer_id) as unique_viewers,
  AVG(TIMESTAMPDIFF(SECOND, joined_at, COALESCE(left_at, NOW()))) as avg_watch_seconds
FROM live_stream_viewers
UNION ALL
SELECT 
  'Tips' as table_name,
  COUNT(*) as total_rows,
  SUM(amount) / 100 as total_amount_dollars,
  SUM(creator_amount) / 100 as creator_amount_dollars
FROM live_stream_tips
UNION ALL
SELECT 
  'Donations' as table_name,
  COUNT(*) as total_rows,
  SUM(amount) / 100 as total_amount_dollars,
  SUM(creator_amount) / 100 as creator_amount_dollars
FROM live_stream_donations;

-- REVENUE SPLIT VERIFICATION
SELECT 
  'Tips' as source,
  SUM(amount) / 100 as total_dollars,
  SUM(creator_amount) / 100 as creator_dollars,
  SUM(platform_amount) / 100 as platform_dollars,
  ROUND((SUM(creator_amount) * 100.0 / SUM(amount)), 2) as creator_percentage,
  ROUND((SUM(platform_amount) * 100.0 / SUM(amount)), 2) as platform_percentage
FROM live_stream_tips
UNION ALL
SELECT 
  'Donations' as source,
  SUM(amount) / 100 as total_dollars,
  SUM(creator_amount) / 100 as creator_dollars,
  SUM(platform_amount) / 100 as platform_dollars,
  ROUND((SUM(creator_amount) * 100.0 / SUM(amount)), 2) as creator_percentage,
  ROUND((SUM(platform_amount) * 100.0 / SUM(amount)), 2) as platform_percentage
FROM live_stream_donations;

-- Expected: creator_percentage = 85.00, platform_percentage = 15.00 for both
```

---

## 📦 PROOF PACKET DELIVERABLES

After completing all tests, generate proof packet with:

1. **Test Execution Log**
   - Date/time of each test
   - Pass/fail status for each test
   - Any errors encountered

2. **Screenshots**
   - All items from screenshot checklists above
   - Organized by test number

3. **Database Dump**
   - Export of all 4 VaultLive tables after testing
   - SQL query results showing 85/15 split verification

4. **Video Recording** (Optional but Recommended)
   - Screen recording of full test flow
   - Host and viewer perspectives

5. **Issues Log**
   - Any bugs discovered
   - Performance issues
   - UX improvements needed

6. **Sign-Off**
   - Tester name
   - Date completed
   - Overall PASS/FAIL determination
   - Recommendations for production readiness

---

## 🚀 PRODUCTION READINESS CHECKLIST

Before launching VaultLive to influencers/celebrities:

- [ ] All 6 tests passed
- [ ] 85/15 revenue split verified in database
- [ ] WebRTC connections stable
- [ ] Mobile device testing completed
- [ ] Load testing (multiple simultaneous streams)
- [ ] Payment processing integration (Stripe/manual)
- [ ] Creator payout system ready
- [ ] Terms of service for tipping/donations
- [ ] Content moderation plan
- [ ] DMCA compliance
- [ ] Age verification for adult content (if applicable)

---

## 📞 SUPPORT

**Issues during testing?**
- Check browser console for errors
- Verify Socket.IO connection in Network tab
- Check database connection
- Review server logs for WebRTC signaling errors

**Database Access:**
- Use Management UI → Database panel
- Or connect via MySQL client with credentials from Settings

**Need help?**
- Refer to `/server/routers/vaultLive.ts` for API endpoints
- Check `/server/db-vaultlive.ts` for database helpers
- Review `/client/src/pages/VaultLiveStream.tsx` for UI logic

---

**END OF VERIFICATION PROTOCOL**

*This document will be updated with actual test results and proof artifacts.*
