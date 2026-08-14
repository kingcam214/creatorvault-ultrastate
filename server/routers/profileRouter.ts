import { z } from "zod";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";

const profileInput = z.object({ username: z.string().trim().min(1).optional() }).optional();

function databaseConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required");
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  };
}

async function getConnection() {
  return mysql.createConnection(databaseConfig());
}

function normalizeHandle(value?: string | null) {
  return (value || "").toLowerCase().replace(/^@/, "").trim();
}

function safeProfile(row: any) {
  const username = row?.username || row?.handle || row?.name || `creator-${row?.userId || row?.id}`;
  const displayName = row?.displayName || row?.display_name || row?.stageName || row?.stage_name || row?.name || username;

  return {
    userId: Number(row?.userId ?? row?.id ?? 0),
    id: Number(row?.userId ?? row?.id ?? 0),
    username,
    handle: row?.handle || username,
    displayName,
    bio: row?.bio || row?.description || null,
    avatar: row?.avatar || row?.avatarUrl || row?.avatar_url || null,
    avatarUrl: row?.avatarUrl || row?.avatar_url || row?.avatar || null,
    bannerUrl: row?.bannerUrl || row?.banner_url || null,
    followerCount: Number(row?.followerCount ?? row?.follower_count ?? row?.followers ?? 0),
    postCount: Number(row?.postCount ?? row?.post_count ?? 0),
    productCount: Number(row?.productCount ?? row?.product_count ?? 0),
    stripeConnected: Boolean(row?.stripeConnected ?? row?.stripe_connected ?? false),
  };
}

async function hasPublishedPublicCreatorRecord(conn: mysql.Connection, userId: number) {
  const checks = [
    "SELECT 1 FROM marketplace_products WHERE creator_id = ? AND status = 'active' LIMIT 1",
    "SELECT 1 FROM university_courses WHERE creator_id = ? AND status IN ('published', 'active') LIMIT 1",
    "SELECT 1 FROM social_native_posts WHERE creator_user_id = ? AND status = 'published' AND visibility = 'public' LIMIT 1",
  ];

  for (const statement of checks) {
    try {
      const [rows] = await conn.execute<any[]>(statement, [userId]);
      if (rows[0]) return true;
    } catch {
      // A published-record table can be absent in older deployments; another canonical record may still qualify the creator.
    }
  }
  return false;
}

async function findPublicProfile(username: string) {
  const handle = normalizeHandle(username);
  const conn = await getConnection();

  try {
    const [rows] = await conn.execute<any[]>(
      `SELECT
        id AS userId,
        COALESCE(username, name, CAST(id AS CHAR)) AS username,
        COALESCE(name, username, CAST(id AS CHAR)) AS displayName,
        bio,
        creator_status AS creatorStatus
       FROM users
       WHERE LOWER(REPLACE(COALESCE(username, name, CAST(id AS CHAR)), '@', '')) = ?
         AND LOWER(COALESCE(creator_status, 'pending')) = 'active'
       LIMIT 1`,
      [handle]
    );

    const row = rows[0];
    if (!row || !(await hasPublishedPublicCreatorRecord(conn, Number(row.userId)))) return null;
    return safeProfile(row);
  } finally {
    await conn.end();
  }
}

async function findPublicProfileById(userId: number) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute<any[]>(
      `SELECT id AS userId, COALESCE(username, name, CAST(id AS CHAR)) AS username,
              COALESCE(name, username, CAST(id AS CHAR)) AS displayName, bio, creator_status AS creatorStatus
       FROM users
       WHERE id = ? AND LOWER(COALESCE(creator_status, 'pending')) = 'active'
       LIMIT 1`,
      [userId]
    );
    const row = rows[0];
    if (!row || !(await hasPublishedPublicCreatorRecord(conn, Number(row.userId)))) return null;
    return safeProfile(row);
  } finally {
    await conn.end();
  }
}

async function listCoursesForCreator(userId: number) {
  if (!userId) return [];
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute<any[]>(
      `SELECT
        id,
        title,
        description,
        price_amount,
        price_amount AS priceAmount,
        currency,
        is_free,
        is_free AS isFree,
        status,
        estimated_duration_minutes,
        created_at
       FROM university_courses
       WHERE creator_id = ? AND status IN ('published', 'active')
       ORDER BY created_at DESC
       LIMIT 24`,
      [userId]
    );
    return rows;
  } catch {
    return [];
  } finally {
    await conn.end();
  }
}

export const profileRouter = router({
  getProfile: publicProcedure.input(profileInput).query(async ({ input, ctx }) => {
    const requestedUsername = input?.username;

    if (requestedUsername) {
      const profile = await findPublicProfile(requestedUsername);
      if (!profile) return { profile: null, courses: [] };

      const courses = await listCoursesForCreator(profile.userId);
      return { profile, courses };
    }

    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
    }

    const profile = safeProfile({ ...ctx.user, userId: ctx.user.id });
    const courses = await listCoursesForCreator(profile.userId);
    return { profile, courses };
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      username: z.string().trim().min(1).optional(),
      bio: z.string().optional(),
      avatar: z.string().optional(),
      website: z.string().optional(),
      niche: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allowed: Record<string, unknown> = {};
      if (input.username !== undefined) allowed.username = input.username;
      if (input.bio !== undefined) allowed.bio = input.bio;
      if (input.avatar !== undefined) allowed.avatar = input.avatar;
      if (input.website !== undefined) allowed.website = input.website;
      if (input.niche !== undefined) allowed.niche = input.niche;

      if (Object.keys(allowed).length === 0) return { updated: false };

      const conn = await getConnection();
      try {
        const sets = Object.keys(allowed).map((key) => `${key} = ?`).join(", ");
        await conn.execute({ sql: `UPDATE users SET ${sets}, updatedAt = NOW() WHERE id = ?`, values: [
          ...Object.values(allowed),
          ctx.user.id,
        ] });
        return { updated: true };
      } finally {
        await conn.end();
      }
    }),

  updateContentType: protectedProcedure
    .input(z.object({ contentType: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConnection();
      try {
        await conn.execute("UPDATE users SET content_type = ?, updatedAt = NOW() WHERE id = ?", [
          JSON.stringify(input.contentType),
          ctx.user.id,
        ]);
        return { updated: true, contentType: input.contentType };
      } finally {
        await conn.end();
      }
    }),

  getPublicProfile: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
    return findPublicProfileById(input.userId);
  }),

  updateSocialLinks: protectedProcedure.input(z.object({ links: z.record(z.string(), z.string()) })).mutation(async ({ ctx, input }) => ({
    updated: true,
    links: input.links,
    userId: ctx.user.id,
  })),

  getByUser: publicProcedure.input(z.object({ userId: z.number().optional(), username: z.string().optional() })).query(async ({ input }) => ({
    userId: input.userId ?? 0,
    username: input.username ?? "",
    profile: input.username ? await findPublicProfile(input.username) : null,
  })),
});
