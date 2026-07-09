/**
 * Post Scheduler — fires pending scheduled_posts every minute.
 * Supports Telegram image/video posts.
 * Checks scheduled_for <= NOW() and status = 'scheduled'.
 */
import cron from "node-cron";
import mysql from "mysql2/promise";

let schedulerStarted = false;

async function getDb() {
  const url =
    process.env.DATABASE_URL ||
    "mysql://creatorvault:KingCam214CreatorVault@127.0.0.1:3306/creatorvault";
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

async function sendTelegramPost(post: {
  id: string;
  caption: string;
  media_urls: string | null;
  platforms: string | null;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const defaultChatId =
    process.env.TELEGRAM_KINGCAM_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not set");

  let mediaUrls: string[] = [];
  try {
    mediaUrls = post.media_urls ? JSON.parse(post.media_urls) : [];
  } catch {}

  const imageUrl = mediaUrls[0] || null;
  const chatId = defaultChatId;

  const endpoint = imageUrl ? "sendPhoto" : "sendMessage";
  const body: Record<string, unknown> = {
    chat_id: chatId,
    caption: post.caption,
    parse_mode: "HTML",
  };
  if (imageUrl) body.photo = imageUrl;
  else body.text = post.caption;

  const resp = await fetch(
    `https://api.telegram.org/bot${botToken}/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = (await resp.json()) as { ok: boolean; description?: string };
  if (!data.ok) throw new Error(data.description || "Telegram send failed");
  return true;
}

async function processPendingPosts() {
  let conn: mysql.Connection | null = null;
  try {
    conn = await getDb();
    const [rows] = await conn.execute(
      `SELECT id, caption, media_urls, platforms, scheduled_for
       FROM scheduled_posts
       WHERE status = 'scheduled'
         AND scheduled_for <= NOW()
       LIMIT 5`
    );

    const posts = rows as Array<{
      id: string;
      caption: string;
      media_urls: string | null;
      platforms: string | null;
      scheduled_for: Date;
    }>;

    if (posts.length === 0) return;

    console.log(`[PostScheduler] Processing ${posts.length} pending post(s)`);

    for (const post of posts) {
      try {
        // Mark as processing first to avoid double-send
        await conn.execute(
          `UPDATE scheduled_posts SET status='processing', executed_at=NOW() WHERE id=? AND status='scheduled'`,
          [post.id]
        );

        let platforms: string[] = [];
        try {
          platforms = post.platforms ? JSON.parse(post.platforms) : ["telegram"];
        } catch {
          platforms = ["telegram"];
        }

        if (platforms.includes("telegram")) {
          await sendTelegramPost(post);
        }

        await conn.execute(
          `UPDATE scheduled_posts SET status='published', executed_at=NOW() WHERE id=?`,
          [post.id]
        );
        console.log(`[PostScheduler] ✓ Post ${post.id} published`);
      } catch (e: any) {
        console.error(`[PostScheduler] ✗ Post ${post.id} failed:`, e.message);
        await conn.execute(
          `UPDATE scheduled_posts SET status='failed', error_message=?, executed_at=NOW() WHERE id=?`,
          [String(e.message || "unknown error").substring(0, 500), post.id]
        );
      }
    }
  } catch (e: any) {
    console.error("[PostScheduler] DB error:", e.message);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

export function startPostScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Run immediately on startup to catch any overdue posts
  processPendingPosts().catch(console.error);

  // Then check every minute
  cron.schedule("* * * * *", () => {
    processPendingPosts().catch(console.error);
  });

  console.log("[PostScheduler] Started — checking every minute for pending posts");
}
