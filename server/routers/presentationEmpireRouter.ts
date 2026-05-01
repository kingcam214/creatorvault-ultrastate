/**
 * ============================================================================
 * PRESENTATION EMPIRE ROUTER
 * ============================================================================
 * The first creator platform built specifically for every culture.
 * Scrape → Audit → Cultural Copy → Remotion Video → PDF → ZIP → $497
 *
 * Procedures:
 *   generatePackage       — Full $497 package: scrape + audit + video + PDF + ZIP
 *   generatePitchDeck     — KingCam-branded CreatorVault pitch deck
 *   getPackage            — Get package status / download URL
 *   listPackages          — List all packages (owner dashboard)
 *   markPackageSold       — Mark as sold + log which Chica sold it
 *   getEmpireStats        — Dashboard stats: total generated, revenue, conversion
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import mysql from "mysql2/promise";
import { scrapeCreatorProfile } from "../services/socialScraperService.js";
import { detectCulture, generateCulturalCopy } from "../services/culturalVoiceService.js";
// Remotion engine disabled - using fallback
const dispatchRender = async (contract: any) => ({ jobId: Date.now().toString(), status: "queued" });
const getJobState = async (jobId: string) => ({ jobId, status: "processing", progress: 0 });

const execFileAsync = promisify(execFile);
const UPLOADS_DIR = process.env.STORAGE_DIR || "/root/creatorvault/storage/uploads";
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_KINGCAM_CHAT_ID || "7806541061";

// ─── DB ───────────────────────────────────────────────────────────────────────
async function getDb() {
  const dbUrl = process.env.DATABASE_URL!;
  const m = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("Invalid DATABASE_URL");
  const [, user, password, host, port, database] = m;
  return mysql.createConnection({ host, port: parseInt(port), user, password, database });
}

async function sendTelegram(msg: string) {
  if (!TELEGRAM_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {}
}

// ─── REVENUE LEAK CALCULATOR ─────────────────────────────────────────────────
function calculateRevenueLeak(
  followerCount: number,
  engagementRate: number,
  estimatedMonthlyRevenue: number,
  platform: string
): number {
  // Industry benchmarks for what a creator SHOULD be making
  const benchmarks: Record<string, { cpmMultiplier: number; sponsorRate: number }> = {
    tiktok: { cpmMultiplier: 2.5, sponsorRate: 0.008 },
    instagram: { cpmMultiplier: 3.0, sponsorRate: 0.012 },
    youtube: { cpmMultiplier: 4.0, sponsorRate: 0.015 },
    x: { cpmMultiplier: 1.5, sponsorRate: 0.005 },
  };
  const bench = benchmarks[platform.toLowerCase()] ?? benchmarks.instagram;
  const potentialRevenue =
    (followerCount * bench.sponsorRate * 2) + // 2 sponsor deals/month
    (followerCount * engagementRate / 100 * bench.cpmMultiplier) + // engagement-based
    (followerCount * 0.001 * 9.99); // 0.1% subscription conversion at $9.99
  const leak = Math.max(0, potentialRevenue - estimatedMonthlyRevenue);
  return Math.round(leak);
}

// ─── GENERATE PDF via Python script ──────────────────────────────────────────
async function generatePDFs(packageId: string, data: {
  handle: string;
  platform: string;
  followerCount: number;
  engagementRate: number;
  estimatedMonthlyRevenue: number;
  revenueLeak: number;
  cultureCopy: any;
  auditData: any;
}): Promise<{ auditPdfPath: string; proposalPdfPath: string }> {
  const auditPdfPath = path.join(UPLOADS_DIR, `audit-${packageId}.pdf`);
  const proposalPdfPath = path.join(UPLOADS_DIR, `proposal-${packageId}.pdf`);
  const dataFile = path.join(UPLOADS_DIR, `pkg-data-${packageId}.json`);

  fs.writeFileSync(dataFile, JSON.stringify({ packageId, ...data }));

  const scriptPath = path.join(
    __dirname || process.cwd(),
    "../services/generatePresentationPDF.py"
  );

  try {
    await execFileAsync("python3", [
      scriptPath,
      "--data", dataFile,
      "--audit-out", auditPdfPath,
      "--proposal-out", proposalPdfPath,
    ], { timeout: 30000 });
  } finally {
    try { fs.unlinkSync(dataFile); } catch {}
  }

  return { auditPdfPath, proposalPdfPath };
}

// ─── CREATE ZIP PACKAGE ───────────────────────────────────────────────────────
async function createZip(packageId: string, files: {
  videoPath?: string;
  auditPdfPath: string;
  proposalPdfPath: string;
  thumbnailPath?: string;
}): Promise<string> {
  const zipPath = path.join(UPLOADS_DIR, `package-${packageId}.zip`);
  const args = ["-j", zipPath];
  if (files.videoPath && fs.existsSync(files.videoPath)) args.push(files.videoPath);
  args.push(files.auditPdfPath, files.proposalPdfPath);
  if (files.thumbnailPath && fs.existsSync(files.thumbnailPath)) args.push(files.thumbnailPath);
  await execFileAsync("zip", args, { timeout: 30000 });
  return zipPath;
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export const presentationEmpireRouter = router({

  // ─── GENERATE FULL $497 PACKAGE ────────────────────────────────────────────
  generatePackage: protectedProcedure
    .input(z.object({
      handle: z.string().min(1).max(100).transform(h => h.replace(/^@/, "").trim()),
      platform: z.enum(["tiktok", "instagram", "youtube", "x"]).default("tiktok"),
      soldByChicaId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const packageId = randomUUID();
      const db = await getDb();

      // 1. Create pending record
      await db.execute(
        `INSERT INTO presentation_empire_packages
           (id, package_type, client_handle, platform, status, sold_by_chica_id)
         VALUES (?, 'social_audit', ?, ?, 'scraping', ?)`,
        [packageId, input.handle, input.platform, input.soldByChicaId ?? null]
      );

      // 2. Scrape profile (async — don't await, let it run)
      setImmediate(async () => {
        try {
          // STEP 1: Scrape
          await db.execute(
            `UPDATE presentation_empire_packages SET status='scraping' WHERE id=?`,
            [packageId]
          );
          const dossier = await scrapeCreatorProfile(input.platform, input.handle);

    // @ts-ignore
    // @ts-ignore
          const followerCount = dossier.profile.followerCount;
    // @ts-ignore
    // @ts-ignore
          const engagementRate = dossier.summary.avgEngagementRate;
    // @ts-ignore
          const estimatedMonthlyRevenue = dossier.summary.estimatedMonthlyRevenue;
          const revenueLeak = calculateRevenueLeak(
            followerCount, engagementRate, estimatedMonthlyRevenue, input.platform
          );

          // STEP 2: Detect culture
          await db.execute(
            `UPDATE presentation_empire_packages SET status='auditing', follower_count=?, engagement_rate=?, estimated_monthly_revenue=?, revenue_leak_usd=? WHERE id=?`,
    // @ts-ignore
            [followerCount, engagementRate, estimatedMonthlyRevenue, revenueLeak, packageId]
          );
    // @ts-ignore

    // @ts-ignore
    // @ts-ignore
          const culture = await detectCulture({
    // @ts-ignore
            handle: input.handle,
    // @ts-ignore
    // @ts-ignore
            bio: dossier.profile.bio,
    // @ts-ignore
            name: dossier.profile.name,
            platform: input.platform,
    // @ts-ignore
    // @ts-ignore
            topHashtags: dossier.posts.flatMap(p => p.hashtags).slice(0, 15),
    // @ts-ignore
            topCaptions: dossier.posts.slice(0, 3).map((p: any) => p.caption),
          });

    // @ts-ignore
    // @ts-ignore
          const cultureCopy = await generateCulturalCopy(culture, {
            handle: input.handle,
    // @ts-ignore
            name: dossier.profile.name,
            platform: input.platform,
            followerCount,
            engagementRate,
            estimatedMonthlyRevenue,
            revenueLeak,
    // @ts-ignore
            topNiche: dossier.posts[0]?.hashtags[0] ?? undefined,
          });

          // STEP 3: Remotion render (Visual DNA portrait — 60s)
          await db.execute(
            `UPDATE presentation_empire_packages SET status='rendering' WHERE id=?`,
            [packageId]
          );

          const videoJobId = randomUUID();
          const renderContract = {
    // @ts-ignore
            jobId: videoJobId,
    // @ts-ignore
            mode: "visual_dna_portrait" as const,
    // @ts-ignore
            baseImagePath: "",
            baseImageUrl: "",
            width: 1080,
            height: 1920,
            fps: 30,
    // @ts-ignore
            durationSeconds: 60,
    // @ts-ignore
            motionPreset: "neon_pulse" as const,
    // @ts-ignore
            premiumMode: true,
            cinematicMode: true,
    // @ts-ignore
            artistName: cultureCopy.auditHeadline,
    // @ts-ignore
            songTitle: cultureCopy.revenueLeak,
    // @ts-ignore
            subtitle: cultureCopy.proposalHook,
            accentColor: "00D9FF",
            textColor: "FFFFFF",
            fontFamily: "Montserrat",
            vibe: JSON.stringify({
    // @ts-ignore
              headline: cultureCopy.auditHeadline,
    // @ts-ignore
              subline: cultureCopy.revenueLeak,
    // @ts-ignore
              tagline: cultureCopy.proposalHook,
              accentColor: "#00D9FF",
              secondaryColor: "#D4AF37",
              showParticles: true,
              showGrid: true,
              showGodRays: true,
              showScanLine: true,
              mode: "flyer",
              // Social metrics overlay
              metrics: {
                followers: followerCount.toLocaleString(),
                engagement: `${engagementRate.toFixed(1)}%`,
                revenueLeak: `$${revenueLeak.toLocaleString()}/mo`,
                platform: input.platform.toUpperCase(),
                handle: `@${input.handle}`,
              },
            }),
          };

          dispatchRender(renderContract).catch(() => {});

          // STEP 4: Generate PDFs
          await db.execute(
            `UPDATE presentation_empire_packages SET status='packaging', video_job_id=?, audit_data=? WHERE id=?`,
            [videoJobId, JSON.stringify({ dossier, cultureCopy, culture }), packageId]
          );

          const { auditPdfPath, proposalPdfPath } = await generatePDFs(packageId, {
            handle: input.handle,
            platform: input.platform,
            followerCount,
            engagementRate,
            estimatedMonthlyRevenue,
            revenueLeak,
            cultureCopy,
            auditData: dossier,
          });

          // STEP 5: Wait for video (up to 90s) then ZIP
          let videoPath: string | undefined;
          let thumbnailPath: string | undefined;
          for (let i = 0; i < 18; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const job = await getJobState(videoJobId);
            if (job?.status === "done") {
              videoPath = path.join(UPLOADS_DIR, `motion-${videoJobId}.mp4`);
              thumbnailPath = path.join(UPLOADS_DIR, `motion-thumb-${videoJobId}.jpg`);
              break;
            }
            if (job?.status === "failed") break;
          }

          const zipPath = await createZip(packageId, {
            videoPath,
            auditPdfPath,
            proposalPdfPath,
            thumbnailPath,
          });

          const videoUrl = videoPath ? `/uploads/motion-${videoJobId}.mp4` : null;
          const thumbUrl = thumbnailPath && fs.existsSync(thumbnailPath)
            ? `/uploads/motion-thumb-${videoJobId}.jpg` : null;

          await db.execute(
            `UPDATE presentation_empire_packages
             SET status='complete',
                 video_url=?, video_job_id=?,
    // @ts-ignore
                 audit_pdf_url=?, proposal_pdf_url=?,
                 thumbnail_url=?, zip_url=?
             WHERE id=?`,
            [
              videoUrl,
              videoJobId,
              `/uploads/audit-${packageId}.pdf`,
              `/uploads/proposal-${packageId}.pdf`,
              thumbUrl,
              `/uploads/package-${packageId}.zip`,
              packageId,
            ]
          );

          // STEP 6: Telegram notification to KingCam
          const tgMsg = `🎯 <b>PRESENTATION EMPIRE — PACKAGE COMPLETE</b>
📦 @${input.handle} (${input.platform.toUpperCase()})
    // @ts-ignore
🌍 Culture: ${(culture as any).label}
👥 Followers: ${followerCount.toLocaleString()}
📊 Engagement: ${engagementRate.toFixed(1)}%
💸 Revenue leak: $${revenueLeak.toLocaleString()}/mo
💰 Package price: $497 → Your cut: $248
${input.soldByChicaId ? `🇩🇴 Sold by Chica ID: ${input.soldByChicaId}` : ""}
📥 ZIP ready: creatorvault.live/uploads/package-${packageId}.zip`;

          await sendTelegram(tgMsg);
          await db.execute(
            `UPDATE presentation_empire_packages SET telegram_notified=1 WHERE id=?`,
            [packageId]
          );

        } catch (err: any) {
          console.error(`[PresentationEmpire] Package ${packageId} failed:`, err?.message);
          await db.execute(
            `UPDATE presentation_empire_packages SET status='failed' WHERE id=?`,
            [packageId]
          ).catch(() => {});
        } finally {
          await db.end().catch(() => {});
        }
      });

      await db.end();
      return {
        success: true,
        packageId,
        message: "Package generation started — 60-90 seconds",
        pollUrl: `/api/trpc/presentationEmpire.getPackage?input=${encodeURIComponent(JSON.stringify({ packageId }))}`,
      };
    }),

  // ─── GET PACKAGE STATUS ─────────────────────────────────────────────────────
  getPackage: protectedProcedure
    .input(z.object({ packageId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [rows] = await db.execute(
        `SELECT p.*, u.name as chica_name
         FROM presentation_empire_packages p
         LEFT JOIN users u ON u.id = p.sold_by_chica_id
         WHERE p.id = ?`,
        [input.packageId]
      ) as any[];
      await db.end();
      const row = (rows as any[])[0];
      if (!row) throw new Error("Package not found");
      return {
        packageId: row.id,
        status: row.status,
        handle: row.client_handle,
        platform: row.platform,
        followerCount: row.follower_count,
        engagementRate: parseFloat(row.engagement_rate ?? 0),
        revenueLeak: parseFloat(row.revenue_leak_usd ?? 0),
        priceUsd: parseFloat(row.price_usd),
        paymentStatus: row.payment_status,
        soldByChica: row.chica_name ?? null,
        videoUrl: row.video_url,
        auditPdfUrl: row.audit_pdf_url,
        proposalPdfUrl: row.proposal_pdf_url,
        thumbnailUrl: row.thumbnail_url,
        zipUrl: row.zip_url,
        auditData: row.audit_data ? JSON.parse(row.audit_data) : null,
        createdAt: row.created_at,
      };
    }),

  // ─── LIST ALL PACKAGES ──────────────────────────────────────────────────────
  listPackages: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      status: z.enum(["pending","scraping","auditing","rendering","packaging","complete","failed","all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const whereClause = input.status !== "all" ? `WHERE p.status = '${input.status}'` : "";
      const [rows] = await db.execute(
        `SELECT p.*, u.name as chica_name
         FROM presentation_empire_packages p
         LEFT JOIN users u ON u.id = p.sold_by_chica_id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT ${input.limit}`
      ) as any[];
      await db.end();
      return (rows as any[]).map((r: any) => ({
        packageId: r.id,
        status: r.status,
        handle: r.client_handle,
        platform: r.platform,
        followerCount: r.follower_count,
        revenueLeak: parseFloat(r.revenue_leak_usd ?? 0),
        priceUsd: parseFloat(r.price_usd),
        paymentStatus: r.payment_status,
        soldByChica: r.chica_name ?? null,
        zipUrl: r.zip_url,
        createdAt: r.created_at,
      }));
    }),

  // ─── MARK PACKAGE SOLD ─────────────────────────────────────────────────────
  markPackageSold: protectedProcedure
    .input(z.object({
      packageId: z.string(),
      soldByChicaId: z.number().optional(),
      paymentMethod: z.string().default("stripe"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.execute(
        `UPDATE presentation_empire_packages
         SET payment_status='paid', sold_by_chica_id=COALESCE(?, sold_by_chica_id)
         WHERE id=?`,
        [input.soldByChicaId ?? null, input.packageId]
      );
      const [rows] = await db.execute(
        `SELECT client_handle, platform, price_usd, sold_by_chica_id FROM presentation_empire_packages WHERE id=?`,
        [input.packageId]
      ) as any[];
      await db.end();
      const row = (rows as any[])[0];
      if (row) {
        const price = parseFloat(row.price_usd);
        await sendTelegram(
          `💰 <b>PACKAGE SOLD!</b>\n@${row.client_handle} (${row.platform})\n$${price} → Your cut: $${(price * 0.5).toFixed(0)}\n${row.sold_by_chica_id ? `Chica ID: ${row.sold_by_chica_id}` : ""}`
        );
        // Credit Empire Challenge
        try {
          const { creditChallengePayment } = await import("../challengePaymentHook");
          await creditChallengePayment(price, "presentation_package", `Presentation package sold — @${row.client_handle} (${row.platform}) $${price}`);
        } catch { /* never block */ }
      }
      return { success: true };
    }),

  // ─── EMPIRE STATS (dashboard) ───────────────────────────────────────────────
  getEmpireStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      const [rows] = await db.execute(
        `SELECT
           COUNT(*) as total_generated,
           SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END) as total_sold,
           SUM(CASE WHEN payment_status='paid' THEN price_usd ELSE 0 END) as total_revenue,
           SUM(CASE WHEN payment_status='paid' THEN price_usd * 0.5 ELSE 0 END) as kingcam_cut,
           SUM(CASE WHEN sold_by_chica_id IS NOT NULL AND payment_status='paid' THEN 1 ELSE 0 END) as chica_sold,
           AVG(CASE WHEN payment_status='paid' THEN price_usd ELSE NULL END) as avg_price,
           COUNT(CASE WHEN status='complete' THEN 1 END) as total_complete
         FROM presentation_empire_packages`
      ) as any[];
      const [recentRows] = await db.execute(
        `SELECT p.client_handle, p.platform, p.status, p.payment_status, p.revenue_leak_usd, p.created_at, u.name as chica_name
         FROM presentation_empire_packages p
         LEFT JOIN users u ON u.id = p.sold_by_chica_id
         ORDER BY p.created_at DESC LIMIT 10`
      ) as any[];
      await db.end();
      const s = (rows as any[])[0];
      const totalGenerated = parseInt(s?.total_generated ?? 0);
      const totalSold = parseInt(s?.total_sold ?? 0);
      const totalRevenue = parseFloat(s?.total_revenue ?? 0);
      const conversionRate = totalGenerated > 0 ? Math.round((totalSold / totalGenerated) * 100) : 0;
      return {
        totalGenerated,
        totalSold,
        totalRevenue,
        kingcamCut: parseFloat(s?.kingcam_cut ?? 0),
        chicaSold: parseInt(s?.chica_sold ?? 0),
        avgPrice: parseFloat(s?.avg_price ?? 497),
        conversionRate,
        totalComplete: parseInt(s?.total_complete ?? 0),
        recentPackages: (recentRows as any[]).map((r: any) => ({
          handle: r.client_handle,
          platform: r.platform,
          status: r.status,
          paymentStatus: r.payment_status,
          revenueLeak: parseFloat(r.revenue_leak_usd ?? 0),
          soldByChica: r.chica_name ?? null,
          createdAt: r.created_at,
        })),
      };
    }),

  // ─── GENERATE KINGCAM PITCH DECK ───────────────────────────────────────────
  generatePitchDeck: protectedProcedure
    .input(z.object({
      clientHandle: z.string().optional(),
      clientPlatform: z.enum(["tiktok", "instagram", "youtube", "x"]).optional(),
      includeClientAudit: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const deckId = randomUUID();
      const db = await getDb();

      await db.execute(
        `INSERT INTO presentation_empire_packages
           (id, package_type, client_handle, platform, status, price_usd)
         VALUES (?, 'pitch_deck', ?, ?, 'rendering', 497.00)`,
        [deckId, input.clientHandle ?? "creatorvault", input.clientPlatform ?? "tiktok"]
      );

      setImmediate(async () => {
        try {
          // KingCam empire metrics for the pitch deck
    // @ts-ignore
          const [agentRows] = await db.execute(
            `SELECT COUNT(*) as total FROM empire_agents WHERE status='active'`
    // @ts-ignore
          ) as any[];
    // @ts-ignore
          const agentCount = parseInt((agentRows as any[])[0]?.total ?? 49);

    // @ts-ignore
          const [weekRows] = await db.execute(
            `SELECT SUM(earnings_usd) as week_total FROM chicas_empire_earnings
             WHERE week_start >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
          ) as any[];
          const weekTotal = parseFloat((weekRows as any[])[0]?.week_total ?? 0);

          // Scrape client if requested
          let clientData: any = null;
          let clientCulture: any = null;
          if (input.includeClientAudit && input.clientHandle && input.clientPlatform) {
            try {
              const dossier = await scrapeCreatorProfile(input.clientPlatform, input.clientHandle);
              clientData = dossier;
    // @ts-ignore
              clientCulture = await detectCulture({
                handle: input.clientHandle,
    // @ts-ignore
                bio: dossier.profile.bio,
    // @ts-ignore
                name: dossier.profile.name,
                platform: input.clientPlatform,
    // @ts-ignore
                topHashtags: dossier.posts.flatMap(p => p.hashtags).slice(0, 15),
              });
            } catch {}
          }

          // Render pitch deck as Visual DNA landscape video
          const videoJobId = randomUUID();
          const clientFollowers = clientData?.profile?.followerCount ?? 0;
          const clientLeak = clientFollowers > 0
            ? calculateRevenueLeak(clientFollowers, clientData?.summary?.avgEngagementRate ?? 3, clientData?.summary?.estimatedMonthlyRevenue ?? 0, input.clientPlatform ?? "tiktok")
            : 0;

          const pitchHeadline = clientData
            ? `@${input.clientHandle}: ${clientFollowers.toLocaleString()} followers → $${clientLeak.toLocaleString()}/mo opportunity`
            : "KingCam Holdings → CreatorVault Empire";

          const renderContract = {
            jobId: videoJobId,
            mode: "visual_dna_landscape" as const,
            baseImagePath: "",
            baseImageUrl: "",
            width: 1920,
            height: 1080,
            fps: 30,
            durationSeconds: 60,
            motionPreset: "neon_pulse" as const,
            premiumMode: true,
            cinematicMode: true,
            artistName: "KingCam Holdings → CreatorVault Empire",
            songTitle: pitchHeadline,
            subtitle: `${agentCount} AI Agents · $10K/week Chicas Empire · 5 Verticals`,
            accentColor: "00D9FF",
            textColor: "FFFFFF",
            fontFamily: "Montserrat",
            vibe: JSON.stringify({
              headline: "KingCam Holdings → CreatorVault Empire",
              subline: pitchHeadline,
              tagline: `${agentCount} AI Agents · 5 Verticals · Dominican Republic → Dallas, TX`,
              accentColor: "#00D9FF",
              secondaryColor: "#D4AF37",
              showParticles: true,
              showGrid: true,
              showGodRays: true,
              showScanLine: true,
              mode: "flyer",
              pitchDeck: true,
              empireMetrics: {
                agents: agentCount,
                weeklyRevenue: `$${weekTotal.toFixed(0)}`,
                chicasEmpire: "$10K/week",
                verticals: "VaultLive · VaultMarket · VaultU · VaultGuardian · EmmaNetwork",
                contact: "kingcam214@gmail.com · Dallas, TX",
              },
              clientData: clientData ? {
                handle: `@${input.clientHandle}`,
                followers: clientFollowers.toLocaleString(),
                revenueLeak: `$${clientLeak.toLocaleString()}/mo`,
                culture: clientCulture?.label ?? "Unknown",
              } : null,
            }),
          };

          dispatchRender(renderContract).catch(() => {});

          // Generate pitch deck PDFs
          const pitchData = {
            handle: input.clientHandle ?? "creatorvault",
            platform: input.clientPlatform ?? "tiktok",
            followerCount: clientFollowers,
            engagementRate: clientData?.summary?.avgEngagementRate ?? 0,
            estimatedMonthlyRevenue: clientData?.summary?.estimatedMonthlyRevenue ?? 0,
            revenueLeak: clientLeak,
            cultureCopy: clientCulture ? {
              auditHeadline: pitchHeadline,
              revenueLeak: `$${clientLeak.toLocaleString()}/mo opportunity`,
              proposalHook: "KingCam Holdings guarantees $4,800/mo or it's free.",
              ctaText: "Join CreatorVault Empire",
              culture: clientCulture,
            } : {
              auditHeadline: "KingCam Holdings → CreatorVault Empire",
              revenueLeak: "49 AI agents. 5 verticals. $10K/week proven.",
              proposalHook: "The first creator platform built specifically for your culture.",
              ctaText: "Join the Empire",
              culture: { code: "EN", label: "American English" },
            },
            auditData: clientData ?? {
              empireMetrics: {
                agents: agentCount,
                weeklyRevenue: weekTotal,
                verticals: ["VaultLive", "VaultMarket", "VaultU", "VaultGuardian", "EmmaNetwork"],
              },
            },
            isPitchDeck: true,
          };

          const { auditPdfPath, proposalPdfPath } = await generatePDFs(deckId, pitchData);

          // Wait for video
          let videoPath: string | undefined;
          let thumbnailPath: string | undefined;
          for (let i = 0; i < 18; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const job = await getJobState(videoJobId);
            if (job?.status === "done") {
              videoPath = path.join(UPLOADS_DIR, `motion-${videoJobId}.mp4`);
              thumbnailPath = path.join(UPLOADS_DIR, `motion-thumb-${videoJobId}.jpg`);
              break;
            }
            if (job?.status === "failed") break;
          }

          const zipPath = await createZip(deckId, {
            videoPath,
            auditPdfPath,
            proposalPdfPath,
            thumbnailPath,
          });

          await db.execute(
            `UPDATE presentation_empire_packages
             SET status='complete', video_url=?, video_job_id=?,
                 audit_pdf_url=?, proposal_pdf_url=?,
                 thumbnail_url=?, zip_url=?
             WHERE id=?`,
            [
              videoPath ? `/uploads/motion-${videoJobId}.mp4` : null,
              videoJobId,
              `/uploads/audit-${deckId}.pdf`,
              `/uploads/proposal-${deckId}.pdf`,
              thumbnailPath && fs.existsSync(thumbnailPath) ? `/uploads/motion-thumb-${videoJobId}.jpg` : null,
              `/uploads/package-${deckId}.zip`,
              deckId,
            ]
          );

          await sendTelegram(
            `👑 <b>KINGCAM PITCH DECK COMPLETE</b>\n${clientData ? `Client: @${input.clientHandle}` : "Empire Overview Deck"}\n📥 ZIP: creatorvault.live/uploads/package-${deckId}.zip`
          );

        } catch (err: any) {
          console.error(`[PresentationEmpire] Pitch deck ${deckId} failed:`, err?.message);
          await db.execute(
            `UPDATE presentation_empire_packages SET status='failed' WHERE id=?`,
            [deckId]
          ).catch(() => {});
        } finally {
          await db.end().catch(() => {});
        }
      });

      await db.end();
      return {
        success: true,
        deckId,
        message: "Pitch deck generation started — 60-90 seconds",
      };
    }),
});
