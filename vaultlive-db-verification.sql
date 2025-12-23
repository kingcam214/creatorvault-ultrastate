-- ========================================
-- VAULTLIVE DATABASE VERIFICATION QUERIES
-- ========================================
-- Run these queries during/after VaultLive testing
-- to verify database persistence and 85/15 revenue split

-- ========================================
-- 1. CHECK ACTIVE STREAMS
-- ========================================
SELECT 
  id as stream_id,
  creator_id,
  title,
  status,
  started_at,
  ended_at,
  viewer_count,
  peak_viewer_count,
  total_tips / 100 as total_tips_dollars,
  total_donations / 100 as total_donations_dollars,
  total_revenue / 100 as total_revenue_dollars,
  TIMESTAMPDIFF(MINUTE, started_at, COALESCE(ended_at, NOW())) as duration_minutes
FROM live_streams 
ORDER BY created_at DESC 
LIMIT 10;

-- Expected: See your test stream with status='live' or 'ended'


-- ========================================
-- 2. CHECK VIEWERS FOR SPECIFIC STREAM
-- ========================================
-- Replace [STREAM_ID] with actual stream ID from query above
SELECT 
  id,
  stream_id,
  viewer_id,
  joined_at,
  left_at,
  TIMESTAMPDIFF(SECOND, joined_at, COALESCE(left_at, NOW())) as watch_duration_seconds,
  CASE 
    WHEN left_at IS NULL THEN 'ACTIVE'
    ELSE 'LEFT'
  END as status
FROM live_stream_viewers 
WHERE stream_id = [STREAM_ID]
ORDER BY joined_at DESC;

-- Expected: See viewer records with join/leave timestamps


-- ========================================
-- 3. VERIFY TIPS WITH 85/15 SPLIT
-- ========================================
-- Replace [STREAM_ID] with actual stream ID
SELECT 
  id as tip_id,
  stream_id,
  viewer_id,
  amount / 100 as tip_dollars,
  creator_amount / 100 as creator_dollars,
  platform_amount / 100 as platform_dollars,
  ROUND((creator_amount * 100.0 / amount), 2) as creator_percentage,
  ROUND((platform_amount * 100.0 / amount), 2) as platform_percentage,
  message,
  created_at
FROM live_stream_tips 
WHERE stream_id = [STREAM_ID]
ORDER BY created_at DESC;

-- CRITICAL: creator_percentage MUST be 85.00
-- CRITICAL: platform_percentage MUST be 15.00


-- ========================================
-- 4. VERIFY DONATIONS WITH 85/15 SPLIT
-- ========================================
-- Replace [STREAM_ID] with actual stream ID
SELECT 
  id as donation_id,
  stream_id,
  viewer_id,
  amount / 100 as donation_dollars,
  creator_amount / 100 as creator_dollars,
  platform_amount / 100 as platform_dollars,
  ROUND((creator_amount * 100.0 / amount), 2) as creator_percentage,
  ROUND((platform_amount * 100.0 / amount), 2) as platform_percentage,
  message,
  payment_status,
  created_at
FROM live_stream_donations 
WHERE stream_id = [STREAM_ID]
ORDER BY created_at DESC;

-- CRITICAL: creator_percentage MUST be 85.00
-- CRITICAL: platform_percentage MUST be 15.00


-- ========================================
-- 5. REVENUE SUMMARY FOR STREAM
-- ========================================
-- Replace [STREAM_ID] with actual stream ID
SELECT 
  s.id as stream_id,
  s.title,
  s.status,
  COUNT(DISTINCT v.viewer_id) as unique_viewers,
  COUNT(t.id) as tip_count,
  COALESCE(SUM(t.amount), 0) / 100 as total_tips_dollars,
  COALESCE(SUM(t.creator_amount), 0) / 100 as creator_tips_dollars,
  COALESCE(SUM(t.platform_amount), 0) / 100 as platform_tips_dollars,
  COUNT(d.id) as donation_count,
  COALESCE(SUM(d.amount), 0) / 100 as total_donations_dollars,
  COALESCE(SUM(d.creator_amount), 0) / 100 as creator_donations_dollars,
  COALESCE(SUM(d.platform_amount), 0) / 100 as platform_donations_dollars,
  (COALESCE(SUM(t.amount), 0) + COALESCE(SUM(d.amount), 0)) / 100 as total_revenue_dollars,
  (COALESCE(SUM(t.creator_amount), 0) + COALESCE(SUM(d.creator_amount), 0)) / 100 as total_creator_revenue_dollars,
  (COALESCE(SUM(t.platform_amount), 0) + COALESCE(SUM(d.platform_amount), 0)) / 100 as total_platform_revenue_dollars
FROM live_streams s
LEFT JOIN live_stream_viewers v ON s.id = v.stream_id
LEFT JOIN live_stream_tips t ON s.id = t.stream_id
LEFT JOIN live_stream_donations d ON s.id = d.stream_id
WHERE s.id = [STREAM_ID]
GROUP BY s.id, s.title, s.status;


-- ========================================
-- 6. OVERALL VAULTLIVE SYSTEM HEALTH
-- ========================================
SELECT 
  'Total Streams' as metric,
  COUNT(*) as value,
  NULL as dollars
FROM live_streams
UNION ALL
SELECT 
  'Live Streams' as metric,
  COUNT(*) as value,
  NULL as dollars
FROM live_streams
WHERE status = 'live'
UNION ALL
SELECT 
  'Ended Streams' as metric,
  COUNT(*) as value,
  NULL as dollars
FROM live_streams
WHERE status = 'ended'
UNION ALL
SELECT 
  'Total Viewers' as metric,
  COUNT(*) as value,
  NULL as dollars
FROM live_stream_viewers
UNION ALL
SELECT 
  'Unique Viewers' as metric,
  COUNT(DISTINCT viewer_id) as value,
  NULL as dollars
FROM live_stream_viewers
UNION ALL
SELECT 
  'Total Tips' as metric,
  COUNT(*) as value,
  SUM(amount) / 100 as dollars
FROM live_stream_tips
UNION ALL
SELECT 
  'Total Donations' as metric,
  COUNT(*) as value,
  SUM(amount) / 100 as dollars
FROM live_stream_donations
UNION ALL
SELECT 
  'Total Revenue' as metric,
  NULL as value,
  (
    COALESCE((SELECT SUM(amount) FROM live_stream_tips), 0) +
    COALESCE((SELECT SUM(amount) FROM live_stream_donations), 0)
  ) / 100 as dollars
UNION ALL
SELECT 
  'Creator Revenue (85%)' as metric,
  NULL as value,
  (
    COALESCE((SELECT SUM(creator_amount) FROM live_stream_tips), 0) +
    COALESCE((SELECT SUM(creator_amount) FROM live_stream_donations), 0)
  ) / 100 as dollars
UNION ALL
SELECT 
  'Platform Revenue (15%)' as metric,
  NULL as value,
  (
    COALESCE((SELECT SUM(platform_amount) FROM live_stream_tips), 0) +
    COALESCE((SELECT SUM(platform_amount) FROM live_stream_donations), 0)
  ) / 100 as dollars;


-- ========================================
-- 7. VERIFY 85/15 SPLIT ACROSS ALL TRANSACTIONS
-- ========================================
SELECT 
  'Tips' as transaction_type,
  COUNT(*) as count,
  SUM(amount) / 100 as total_dollars,
  SUM(creator_amount) / 100 as creator_dollars,
  SUM(platform_amount) / 100 as platform_dollars,
  ROUND((SUM(creator_amount) * 100.0 / SUM(amount)), 2) as creator_percentage,
  ROUND((SUM(platform_amount) * 100.0 / SUM(amount)), 2) as platform_percentage
FROM live_stream_tips
UNION ALL
SELECT 
  'Donations' as transaction_type,
  COUNT(*) as count,
  SUM(amount) / 100 as total_dollars,
  SUM(creator_amount) / 100 as creator_dollars,
  SUM(platform_amount) / 100 as platform_dollars,
  ROUND((SUM(creator_amount) * 100.0 / SUM(amount)), 2) as creator_percentage,
  ROUND((SUM(platform_amount) * 100.0 / SUM(amount)), 2) as platform_percentage
FROM live_stream_donations
UNION ALL
SELECT 
  'TOTAL' as transaction_type,
  (SELECT COUNT(*) FROM live_stream_tips) + (SELECT COUNT(*) FROM live_stream_donations) as count,
  (
    COALESCE((SELECT SUM(amount) FROM live_stream_tips), 0) +
    COALESCE((SELECT SUM(amount) FROM live_stream_donations), 0)
  ) / 100 as total_dollars,
  (
    COALESCE((SELECT SUM(creator_amount) FROM live_stream_tips), 0) +
    COALESCE((SELECT SUM(creator_amount) FROM live_stream_donations), 0)
  ) / 100 as creator_dollars,
  (
    COALESCE((SELECT SUM(platform_amount) FROM live_stream_tips), 0) +
    COALESCE((SELECT SUM(platform_amount) FROM live_stream_donations), 0)
  ) / 100 as platform_dollars,
  ROUND((
    (
      COALESCE((SELECT SUM(creator_amount) FROM live_stream_tips), 0) +
      COALESCE((SELECT SUM(creator_amount) FROM live_stream_donations), 0)
    ) * 100.0 / 
    (
      COALESCE((SELECT SUM(amount) FROM live_stream_tips), 0) +
      COALESCE((SELECT SUM(amount) FROM live_stream_donations), 0)
    )
  ), 2) as creator_percentage,
  ROUND((
    (
      COALESCE((SELECT SUM(platform_amount) FROM live_stream_tips), 0) +
      COALESCE((SELECT SUM(platform_amount) FROM live_stream_donations), 0)
    ) * 100.0 / 
    (
      COALESCE((SELECT SUM(amount) FROM live_stream_tips), 0) +
      COALESCE((SELECT SUM(amount) FROM live_stream_donations), 0)
    )
  ), 2) as platform_percentage;

-- CRITICAL VERIFICATION:
-- creator_percentage MUST be 85.00 for all rows
-- platform_percentage MUST be 15.00 for all rows


-- ========================================
-- 8. FIND YOUR USER ID (for testing)
-- ========================================
SELECT 
  id as user_id,
  name,
  email,
  role
FROM users 
WHERE role IN ('admin', 'king', 'creator')
ORDER BY created_at DESC
LIMIT 10;

-- Use your user_id to filter queries above


-- ========================================
-- 9. CLEANUP TEST DATA (OPTIONAL - USE WITH CAUTION)
-- ========================================
-- Uncomment to delete test streams and related data
-- WARNING: This will permanently delete data

-- DELETE FROM live_stream_donations WHERE stream_id IN (
--   SELECT id FROM live_streams WHERE title LIKE '%Test%'
-- );
-- DELETE FROM live_stream_tips WHERE stream_id IN (
--   SELECT id FROM live_streams WHERE title LIKE '%Test%'
-- );
-- DELETE FROM live_stream_viewers WHERE stream_id IN (
--   SELECT id FROM live_streams WHERE title LIKE '%Test%'
-- );
-- DELETE FROM live_streams WHERE title LIKE '%Test%';


-- ========================================
-- 10. EXPORT DATA FOR PROOF PACKET
-- ========================================
-- Run these queries and save results as CSV/JSON for proof packet

-- Export streams
SELECT * FROM live_streams 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY created_at DESC;

-- Export viewers
SELECT * FROM live_stream_viewers 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY created_at DESC;

-- Export tips
SELECT * FROM live_stream_tips 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY created_at DESC;

-- Export donations
SELECT * FROM live_stream_donations 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY created_at DESC;


-- ========================================
-- END OF VERIFICATION QUERIES
-- ========================================
-- Save this file and run queries as needed during testing
-- Replace [STREAM_ID] with actual stream IDs from your tests
