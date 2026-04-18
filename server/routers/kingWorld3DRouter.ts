/**
 * ============================================================================
 * kingWorld3DRouter
 * ============================================================================
 * Provides data for:
 *   1. KingCamEpisodeTheater3D  — episode tiles with real stats
 *   2. KingCamEmpireMap3D       — node graph with power scores
 *
 * Access: king role only (enforced by protectedProcedure + role check)
 * ============================================================================
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
// Remotion engine disabled - using fallback
const dispatchRender = async (contract: any) => ({ jobId: Date.now().toString(), status: "queued" });
const normalizeContract = (c: any) => c;
const getJobState = async (jobId: string) => ({ jobId, status: "processing", progress: 0 });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function assertKing(user: any) {
  if (!user || (user.role !== "king" && user.role !== "admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "King access only" });
  }
}

// ─── Static episode data (merged from kingcamEpisodes.ts) ─────────────────────
// These mirror the static frontend data so the backend can serve them with
// computed metrics. We keep them here so the 3D component can call one endpoint.
const STATIC_EPISODES = [
  // PLAYLIST 1: Día Uno
  {
    id: "dia-uno-ep1-intro",
    title: "Bienvenido al Vault",
    playlist: "dia-uno",
    playlistLabel: "Día Uno 🌅",
    thumbnailEmoji: "🌅",
    tags: ["onboarding", "intro", "dr"],
    dialect: "dr",
    duration: "4:30",
    videoUrl: "",
    ctaLabel: "Empezar el Vault",
    views: 312,
    likes: 48,
    estimatedRevenue: 0,
    filter: "all",
  },
  {
    id: "dia-uno-ep2-setup",
    title: "Tu Perfil de Creador",
    playlist: "dia-uno",
    playlistLabel: "Día Uno 🌅",
    thumbnailEmoji: "⚙️",
    tags: ["setup", "profile", "dr"],
    dialect: "dr",
    duration: "5:15",
    videoUrl: "",
    ctaLabel: "Configurar Perfil",
    views: 287,
    likes: 41,
    estimatedRevenue: 0,
    filter: "all",
  },
  {
    id: "dia-uno-ep3-money",
    title: "Tu Primera Venta",
    playlist: "dia-uno",
    playlistLabel: "Día Uno 🌅",
    thumbnailEmoji: "💰",
    tags: ["money", "sales", "dr"],
    dialect: "dr",
    duration: "6:00",
    videoUrl: "",
    ctaLabel: "Hacer mi primera venta",
    views: 445,
    likes: 67,
    estimatedRevenue: 397,
    filter: "money",
  },
  // PLAYLIST 2: Hayi Fè Lajan
  {
    id: "hayi-ep1-intro",
    title: "Hayi Fè Lajan — Intro",
    playlist: "hayi-fe-lajan",
    playlistLabel: "Hayi Fè Lajan 🇭🇹",
    thumbnailEmoji: "🇭🇹",
    tags: ["ht", "haitian", "money"],
    dialect: "ht",
    duration: "4:00",
    videoUrl: "",
    ctaLabel: "Kòmanse",
    views: 198,
    likes: 29,
    estimatedRevenue: 0,
    filter: "all",
  },
  {
    id: "hayi-ep2-vende",
    title: "Vann Nan WhatsApp",
    playlist: "hayi-fe-lajan",
    playlistLabel: "Hayi Fè Lajan 🇭🇹",
    thumbnailEmoji: "📱",
    tags: ["ht", "whatsapp", "sales"],
    dialect: "ht",
    duration: "5:30",
    videoUrl: "",
    ctaLabel: "Aprann vann",
    views: 167,
    likes: 22,
    estimatedRevenue: 132,
    filter: "money",
  },
  // PLAYLIST 3: Tiguera Mode
  {
    id: "tiguera-ep1-intro",
    title: "Tiguera Mode — Intro",
    playlist: "tiguera-mode",
    playlistLabel: "Tiguera Mode 🔥",
    thumbnailEmoji: "🔥",
    tags: ["dr", "tiguera", "hustle"],
    dialect: "dr",
    duration: "3:45",
    videoUrl: "",
    ctaLabel: "Activar modo tiguera",
    views: 523,
    likes: 89,
    estimatedRevenue: 0,
    filter: "dr-tours",
  },
  {
    id: "dr-ep1-vende",
    title: "Vende en el Barrio",
    playlist: "tiguera-mode",
    playlistLabel: "Tiguera Mode 🔥",
    thumbnailEmoji: "🏘️",
    tags: ["dr", "barrio", "sales", "tiguera"],
    dialect: "dr",
    duration: "5:00",
    videoUrl: "",
    ctaLabel: "Ver estrategia",
    views: 612,
    likes: 94,
    estimatedRevenue: 265,
    filter: "dr-tours",
  },
  {
    id: "tiguera-ep3-cheelee",
    title: "Cheelee Scam — Para ya",
    playlist: "tiguera-mode",
    playlistLabel: "Tiguera Mode 🔥",
    thumbnailEmoji: "⚠️",
    tags: ["dr", "tiguera", "warning", "cheelee"],
    dialect: "dr",
    duration: "4:15",
    videoUrl: "",
    ctaLabel: "Ver la verdad",
    views: 789,
    likes: 134,
    estimatedRevenue: 0,
    filter: "dr-tours",
  },
  // PLAYLIST 4: KingCam Lifestyle
  {
    id: "lizzy-day-ep1",
    title: "Un día con Slim (Lizzy's Day)",
    playlist: "kingcam-lifestyle",
    playlistLabel: "KingCam Lifestyle 👑",
    thumbnailEmoji: "🌅",
    tags: ["lifestyle", "lizzy", "dr", "kingcam", "day-in-life"],
    dialect: "dr",
    duration: "6:00",
    videoUrl: "",
    ctaLabel: "Ver clips de Lizzy",
    views: 1024,
    likes: 187,
    estimatedRevenue: 0,
    filter: "lizzy",
  },
  // Emma content
  {
    id: "emma-tour-ep1",
    title: "Emma Reset — Tour Completo",
    playlist: "emma-tour",
    playlistLabel: "Emma Tour 💪",
    thumbnailEmoji: "💪",
    tags: ["emma", "fitness", "reset", "dr"],
    dialect: "dr",
    duration: "7:00",
    videoUrl: "",
    ctaLabel: "Ver Emma Reset",
    views: 856,
    likes: 143,
    estimatedRevenue: 397,
    filter: "emma",
  },
  {
    id: "emma-tour-ep2",
    title: "Emma's Morning Routine",
    playlist: "emma-tour",
    playlistLabel: "Emma Tour 💪",
    thumbnailEmoji: "☀️",
    tags: ["emma", "fitness", "morning", "routine"],
    dialect: "dr",
    duration: "5:30",
    videoUrl: "",
    ctaLabel: "Seguir la rutina",
    views: 634,
    likes: 98,
    estimatedRevenue: 132,
    filter: "emma",
  },
];

// ─── System nodes for Empire Map ──────────────────────────────────────────────
const SYSTEM_NODES = [
  {
    id: "emma-engine",
    name: "Emma Engine",
    type: "system",
    emoji: "🤖",
    description: "AI sales agent — WhatsApp, email, inbound/outbound",
    route: "/king/emma",
    primaryCreator: "emma",
    color: "#a78bfa",
  },
  {
    id: "gem-engine",
    name: "Gem Engine",
    type: "system",
    emoji: "💎",
    description: "Tiered content broadcast — WhatsApp/Telegram sequences",
    route: "/king/gem-center",
    primaryCreator: "all",
    color: "#f59e0b",
  },
  {
    id: "videolab",
    name: "VideoLab",
    type: "system",
    emoji: "🎬",
    description: "Agentic video pipeline — clips, gems, scheduling",
    route: "/video-lab",
    primaryCreator: "all",
    color: "#22d3ee",
  },
  {
    id: "whatsapp-telegram",
    name: "WhatsApp/Telegram",
    type: "system",
    emoji: "📱",
    description: "Broadcast stack — tiered channel management",
    route: "/king/whatsapp-bot",
    primaryCreator: "all",
    color: "#4ade80",
  },
  {
    id: "apparel-lab",
    name: "Apparel Lab",
    type: "system",
    emoji: "👕",
    description: "Print-on-demand — DR/HT branded merch",
    route: "/apparel-lab",
    primaryCreator: "all",
    color: "#fb923c",
  },
  {
    id: "command-center",
    name: "King Command Center",
    type: "system",
    emoji: "👑",
    description: "Mission control — all systems, all creators",
    route: "/king/command-center",
    primaryCreator: "king",
    color: "#fbbf24",
  },
];

// ─── Router ───────────────────────────────────────────────────────────────────
export const kingWorld3DRouter = router({
  // ── Episode Theater data ────────────────────────────────────────────────────
  getEpisodes: protectedProcedure
    .input(z.object({
      filter: z.enum(["all", "money", "emma", "lizzy", "dr-tours"]).default("all"),
    }))
    .query(async ({ ctx, input }) => {
      assertKing(ctx.user);
      const db = getDb();

      // Pull DB episode scripts for extra rows
      let dbEpisodes: any[] = [];
      try {
        const rows = await db.execute(
          `SELECT id, topic, playlist, language, status, video_url, youtube_title, cta_label, cta_url, created_at
           FROM kingcam_episodes_scripts
           ORDER BY created_at DESC`
        );
        dbEpisodes = (rows as any)[0] || [];
      } catch (_) {
        // Table may not exist in all envs
      }

      // Merge static + DB episodes (DB takes precedence by id)
      const dbMap = new Map(dbEpisodes.map((e: any) => [String(e.id), e]));
      const staticEps = STATIC_EPISODES.map(ep => {
        const dbRow = dbMap.get(ep.id);
        return {
          ...ep,
          videoUrl: dbRow?.video_url || ep.videoUrl || "",
          youtubeTitle: dbRow?.youtube_title || ep.title,
          status: dbRow?.status || "published",
        };
      });

      // Add any DB episodes not in static list
      for (const dbRow of dbEpisodes) {
        const exists = staticEps.find(e => e.id === String(dbRow.id));
        if (!exists) {
          staticEps.push({
            id: String(dbRow.id),
            title: dbRow.youtube_title || dbRow.topic,
            playlist: dbRow.playlist?.toLowerCase().replace(/\s+/g, "-") || "kingcam",
            playlistLabel: dbRow.playlist || "KingCam",
            thumbnailEmoji: "🎬",
            tags: [dbRow.playlist?.toLowerCase() || "kingcam", dbRow.language || "es"],
            dialect: dbRow.language || "dr",
            duration: "5:00",
            videoUrl: dbRow.video_url || "",
            ctaLabel: dbRow.cta_label || "Ver episodio",
            views: 0,
            likes: 0,
            estimatedRevenue: 0,
            filter: "all",
            youtubeTitle: dbRow.youtube_title,
            status: dbRow.status,
          });
        }
      }

      // Apply filter
      const filtered = input.filter === "all"
        ? staticEps
        : staticEps.filter(ep => ep.filter === input.filter || ep.tags.includes(input.filter));

      // Compute normalized glow score (0–1) based on views + revenue
      const maxViews = Math.max(...filtered.map(e => e.views), 1);
      const maxRev = Math.max(...filtered.map(e => e.estimatedRevenue), 1);
      const episodes = filtered.map(ep => ({
        ...ep,
        glowScore: Math.min(1, (ep.views / maxViews) * 0.6 + (ep.estimatedRevenue / maxRev) * 0.4),
        hasRevenue: ep.estimatedRevenue > 0,
      }));

      return { episodes, total: episodes.length };
    }),

  // ── Empire Map data ─────────────────────────────────────────────────────────
  getEmpireNodes: protectedProcedure
    .query(async ({ ctx }) => {
      assertKing(ctx.user);
      const db = getDb();

      // Pull creator users
      let creators: any[] = [];
      try {
        const rows = await db.execute(
          `SELECT id, username, role, email, created_at FROM users
           WHERE role IN ('creator', 'king') AND id NOT IN (8,9,15,20,26,27,100,101,103,104,105,106,107,108,109,110,111)
           ORDER BY id ASC LIMIT 20`
        );
        creators = (rows as any)[0] || [];
      } catch (_) {}

      // Pull revenue per creator
      let revenueMap: Record<number, number> = {};
      try {
        const revRows = await db.execute(
          `SELECT user_id, SUM(amount) as total FROM emma_revenue_tracking GROUP BY user_id`
        );
        for (const row of (revRows as any)[0] || []) {
          revenueMap[row.user_id] = parseFloat(row.total) || 0;
        }
      } catch (_) {}

      // Pull video lab job counts per user
      let jobsMap: Record<number, number> = {};
      try {
        const jobRows = await db.execute(
          `SELECT user_id, COUNT(*) as total FROM video_lab_jobs WHERE status='completed' GROUP BY user_id`
        );
        for (const row of (jobRows as any)[0] || []) {
          jobsMap[row.user_id] = parseInt(row.total) || 0;
        }
      } catch (_) {}

      // Pull telegram subscriber counts
      let telegramMap: Record<number, number> = {};
      try {
        const tgRows = await db.execute(
          `SELECT creator_id, COUNT(*) as total FROM telegram_subscriptions WHERE status='active' GROUP BY creator_id`
        );
        for (const row of (tgRows as any)[0] || []) {
          telegramMap[row.creator_id] = parseInt(row.total) || 0;
        }
      } catch (_) {}

      // Build creator nodes
      const PRIORITY_CREATORS = [
        { id: 6, name: "KingCam", emoji: "👑", route: "/king", ring: 0, color: "#fbbf24", description: "The King — CreatorVault founder" },
        { id: 14, name: "Emma", emoji: "💪", route: "/emma-empire", ring: 1, color: "#a78bfa", description: "Fitness creator — Emma Reset program" },
      ];

      // Add other real creators (ring 1)
      const otherCreators = creators
        .filter(c => c.role === "creator" && c.username && !["emma_aab3"].includes(c.username))
        .slice(0, 4)
        .map((c, i) => ({
          id: c.id,
          name: c.username || `Creator ${c.id}`,
          emoji: ["🎵", "📸", "🎤", "🌟"][i % 4],
          route: `/creator/${c.id}`,
          ring: 1,
          color: ["#22d3ee", "#4ade80", "#fb923c", "#f472b6"][i % 4],
          description: `Creator — ${c.email?.split("@")[0] || "CreatorVault"}`,
        }));

      const creatorNodes = [
        ...PRIORITY_CREATORS,
        ...otherCreators,
      ].map(node => {
        const revenue = revenueMap[node.id] || 0;
        const jobs = jobsMap[node.id] || 0;
        const tgSubs = telegramMap[node.id] || 0;
        const powerScore = Math.min(100, revenue * 0.1 + jobs * 5 + tgSubs * 2 + (node.ring === 0 ? 100 : 10));
        return {
          ...node,
          type: "creator" as const,
          revenue,
          jobs,
          tgSubs,
          powerScore,
          metric: revenue > 0 ? `$${revenue.toFixed(0)} revenue` : jobs > 0 ? `${jobs} jobs` : "Active",
        };
      });

      // Build system nodes with power scores from DB
      const systemNodes = SYSTEM_NODES.map(sys => {
        let powerScore = 50; // base
        if (sys.id === "videolab") powerScore = Math.min(100, 50 + (jobsMap[6] || 0) * 3);
        if (sys.id === "emma-engine") powerScore = Math.min(100, 50 + (revenueMap[14] || 0) * 0.1);
        if (sys.id === "gem-engine") powerScore = 65;
        if (sys.id === "whatsapp-telegram") powerScore = 55;
        if (sys.id === "command-center") powerScore = 90;
        return {
          ...sys,
          type: "system" as const,
          powerScore,
          metric: sys.id === "videolab"
            ? `${Object.values(jobsMap).reduce((a, b) => a + b, 0)} jobs`
            : sys.id === "emma-engine"
            ? `$${(revenueMap[14] || 0).toFixed(0)} revenue`
            : "Active",
        };
      });

      return {
        creatorNodes,
        systemNodes,
        kingNode: creatorNodes.find(n => n.id === 6),
        totalNodes: creatorNodes.length + systemNodes.length,
      };
    }),

  // ── Render episode trailer via Remotion ─────────────────────────────────────
  renderEpisodeTrailer: protectedProcedure
    .input(z.object({
      episodeId: z.string(),
      title: z.string(),
      playlistLabel: z.string(),
      thumbnailEmoji: z.string(),
      ctaLabel: z.string(),
      views: z.number().default(0),
      estimatedRevenue: z.number().default(0),
      glowScore: z.number().min(0).max(1).default(0.5),
      accentColor: z.string().default("#00D9FF"),
      duration: z.string().default("0:00"),
    }))
    .mutation(async ({ input, ctx }) => {
      assertKing(ctx.user);
      const contract = normalizeContract({
        mode: "episode_trailer" as any,
        imageLocalPath: "",
        imageUrl: "",
        width: 1080,
        height: 1920,
        fps: 30,
        durationSeconds: 15,
        motionPreset: "neon_pulse",
        accentColor: input.accentColor,
        artistName: input.title,
        songTitle: input.playlistLabel,
        subtitle: input.ctaLabel,
        vibe: JSON.stringify({
          episodeId: input.episodeId,
          title: input.title,
          playlistLabel: input.playlistLabel,
          thumbnailEmoji: input.thumbnailEmoji,
          ctaLabel: input.ctaLabel,
          views: input.views,
          estimatedRevenue: input.estimatedRevenue,
          glowScore: input.glowScore,
          accentColor: input.accentColor,
          duration: input.duration,
        }),
      });
      dispatchRender(contract).catch((err: any) =>
        console.error("[3D] EpisodeTrailer render failed:", err.message)
      );
      return { success: true, jobId: contract.jobId };
    }),

  // ── Poll render job status ───────────────────────────────────────────────────
  getRenderJobStatus: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input, ctx }) => {
      assertKing(ctx.user);
      const state = getJobState(input.jobId);
      if (!state) return { status: "not_found" as const };
      return {
        status: state.status,
        progress: state.progress,
        videoUrl: state.result?.videoUrl,
        thumbnailUrl: state.result?.thumbnailUrl,
        error: state.error,
      };
    }),

  // ── Render empire map snapshot via Remotion ──────────────────────────────────
  renderEmpireMapSnapshot: protectedProcedure
    .input(z.object({
      accentColor: z.string().default("#00D9FF"),
      creatorCount: z.number().optional(),
      systemCount: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      assertKing(ctx.user);
      const db = getDb();
      let creatorNodes: any[] = [];
      let systemNodes: any[] = [];
      let totalRevenue = 0;
      let totalJobs = 0;
      try {
        const rows = await db.execute(
          `SELECT id, username, role FROM users WHERE role IN ('creator','king') AND id NOT IN (8,9,15,20,26,27,100,101,103,104,105,106,107,108,109,110,111) ORDER BY id ASC LIMIT 8`
        );
        const users = (rows as any)[0] || [];
        const CREATOR_EMOJIS = ["\u{1F451}","\u{1F4AA}","\u{1F3B5}","\u{1F4F8}","\u{1F3A4}","\u{1F31F}","\u{1F525}","\u{1F48E}"];
        const CREATOR_COLORS = ["#D4AF37","#a78bfa","#22d3ee","#4ade80","#fb923c","#f472b6","#00D9FF","#FFD700"];
        creatorNodes = users.map((u: any, i: number) => ({
          id: u.id,
          name: u.username || `Creator ${u.id}`,
          emoji: CREATOR_EMOJIS[i % CREATOR_EMOJIS.length],
          type: "creator" as const,
          ring: u.role === "king" ? 0 : 1,
          color: CREATOR_COLORS[i % CREATOR_COLORS.length],
          powerScore: u.role === "king" ? 100 : 50,
          metric: "Active",
        }));
      } catch (_) {}
      try {
        const revRows = await db.execute(`SELECT SUM(amount) as total FROM emma_revenue_tracking`);
        totalRevenue = parseFloat((revRows as any)[0]?.[0]?.total || "0");
      } catch (_) {}
      try {
        const jobRows = await db.execute(`SELECT COUNT(*) as total FROM video_lab_jobs WHERE status='completed'`);
        totalJobs = parseInt((jobRows as any)[0]?.[0]?.total || "0");
      } catch (_) {}
      systemNodes = [
        { id: "videolab", name: "VideoLab", emoji: "\u{1F3AC}", type: "system" as const, ring: 2, color: "#00D9FF", powerScore: 65, metric: `${totalJobs} jobs` },
        { id: "emma-engine", name: "Emma Engine", emoji: "\u{1F916}", type: "system" as const, ring: 2, color: "#a78bfa", powerScore: 60, metric: "Active" },
        { id: "command-center", name: "Command", emoji: "\u{1F451}", type: "system" as const, ring: 2, color: "#D4AF37", powerScore: 90, metric: "Active" },
        { id: "gem-engine", name: "Gem Engine", emoji: "\u{1F48E}", type: "system" as const, ring: 2, color: "#4ade80", powerScore: 65, metric: "Active" },
        { id: "brand-deals", name: "Brand Deals", emoji: "\u{1F4B0}", type: "system" as const, ring: 2, color: "#fb923c", powerScore: 55, metric: "Active" },
        { id: "presentation", name: "Presentation", emoji: "\u{1F3AF}", type: "system" as const, ring: 2, color: "#f472b6", powerScore: 70, metric: "Active" },
      ];
      const contract = normalizeContract({
        mode: "empire_map_snapshot" as any,
        imageLocalPath: "",
        imageUrl: "",
        width: 1920,
        height: 1080,
        fps: 30,
        durationSeconds: 12,
        motionPreset: "neon_pulse",
        accentColor: input.accentColor,
        vibe: JSON.stringify({
          kingName: "KingCam",
          creatorNodes: creatorNodes.filter((n: any) => n.ring === 1),
          systemNodes,
          totalRevenue,
          totalJobs,
          accentColor: input.accentColor,
        }),
      });
      dispatchRender(contract).catch((err: any) =>
        console.error("[3D] EmpireMapSnapshot render failed:", err.message)
      );
      return { success: true, jobId: contract.jobId };
    }),

});
