import { z } from 'zod';
import { router, kingProcedure, protectedProcedure } from '../_core/trpc.js';
import { db } from '../db';

// ============================================================
// TIER CALCULATION
// ============================================================
function calculateTier(score: number): { tier: number; label: string } {
  if (score >= 850) return { tier: 5, label: 'Elite' };
  if (score >= 700) return { tier: 4, label: 'Trusted' };
  if (score >= 550) return { tier: 3, label: 'Developing' };
  if (score >= 400) return { tier: 2, label: 'On Notice' };
  if (score >= 200) return { tier: 1, label: 'Probation' };
  return { tier: 0, label: 'Removed' };
}

const SEVERITY_POINTS: Record<string, number> = {
  minor: -25,
  moderate: -50,
  severe: -100,
  final: -150,
};

const IMPACT_POINTS: Record<string, number> = {
  low: -50,
  medium: -100,
  high: -200,
  critical: -300,
};

export const loyaltyRouter = router({

  // ============================================================
  // OWNER: GET ALL PROFILES
  // ============================================================
  getAllProfiles: kingProcedure.query(async () => {
    const [rows] = await db.execute(
      `SELECT * FROM chica_loyalty_profiles ORDER BY loyalty_score DESC`
    );
    return rows as any[];
  }),

  // ============================================================
  // OWNER: GET RECENT EVENTS
  // ============================================================
  getRecentEvents: kingProcedure.query(async () => {
    const [rows] = await db.execute(`
      SELECT e.*, p.chica_name 
      FROM chica_loyalty_events e
      JOIN chica_loyalty_profiles p ON e.chica_user_id = p.chica_user_id
      ORDER BY e.created_at DESC LIMIT 50
    `);
    return rows as any[];
  }),

  // ============================================================
  // OWNER: GET WARNINGS FOR A CHICA
  // ============================================================
  getWarnings: kingProcedure
    .input(z.object({ chicaUserId: z.number() }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM chica_warnings WHERE chica_user_id = ? ORDER BY created_at DESC`,
        [input.chicaUserId]
      );
      return rows as any[];
    }),

  // ============================================================
  // OWNER: GET HONESTY LOG FOR A CHICA
  // ============================================================
  getHonestyLog: kingProcedure
    .input(z.object({ chicaUserId: z.number() }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT * FROM chica_honesty_log WHERE chica_user_id = ? ORDER BY created_at DESC`,
        [input.chicaUserId]
      );
      return rows as any[];
    }),

  // ============================================================
  // CHICA: GET MY PROFILE
  // ============================================================
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx as any).user?.id;
    if (!userId) throw new Error('Unauthorized');
    const [rows]: any = await db.execute(
      `SELECT * FROM chica_loyalty_profiles WHERE chica_user_id = ?`,
      [userId]
    );
    if (!(rows as any[]).length) throw new Error('Profile not found');
    return (rows as any[])[0];
  }),

  // ============================================================
  // CHICA: GET MY EVENTS (public only)
  // ============================================================
  getMyEvents: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx as any).user?.id;
    if (!userId) throw new Error('Unauthorized');
    const [rows] = await db.execute(
      `SELECT * FROM chica_loyalty_events WHERE chica_user_id = ? AND is_public = 1 ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    return rows as any[];
  }),

  // ============================================================
  // CHICA: GET MY WARNINGS
  // ============================================================
  getMyWarnings: protectedProcedure.query(async ({ ctx }) => {
    const userId = (ctx as any).user?.id;
    if (!userId) throw new Error('Unauthorized');
    const [rows] = await db.execute(
      `SELECT * FROM chica_warnings WHERE chica_user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    return rows as any[];
  }),

  // ============================================================
  // OWNER: ADD POINTS
  // ============================================================
  addPoints: kingProcedure
    .input(z.object({
      chicaUserId: z.number(),
      eventType: z.string(),
      points: z.number().positive(),
      description: z.string(),
    }))
    .mutation(async ({ input }) => {
      const [profiles]: any = await db.execute(
        `SELECT * FROM chica_loyalty_profiles WHERE chica_user_id = ?`,
        [input.chicaUserId]
      );
      if (!(profiles as any[]).length) throw new Error('Chica not found');
      const profile = (profiles as any[])[0];

      const newScore = Math.min(1000, profile.loyalty_score + input.points);
      const { tier, label } = calculateTier(newScore);
      const tierChanged = tier !== profile.tier;

      await db.execute(`
        INSERT INTO chica_loyalty_events 
          (chica_user_id, event_type, points_change, score_before, score_after, description, logged_by, is_public)
        VALUES (?, ?, ?, ?, ?, ?, 6, 1)
      `, [input.chicaUserId, input.eventType, input.points, profile.loyalty_score, newScore, input.description]);

      await db.execute(`
        UPDATE chica_loyalty_profiles 
        SET loyalty_score = ?, tier = ?, tier_label = ?, 
            status = CASE WHEN ? >= 3 THEN 'active' ELSE status END,
            last_score_update = NOW()
        WHERE chica_user_id = ?
      `, [newScore, tier, label, tier, input.chicaUserId]);

      if (tierChanged) {
        await db.execute(`
          INSERT INTO chica_loyalty_events 
            (chica_user_id, event_type, points_change, score_before, score_after, description, logged_by, is_public)
          VALUES (?, 'tier_upgrade', 0, ?, ?, ?, 6, 1)
        `, [input.chicaUserId, profile.loyalty_score, newScore, `Tier upgraded to ${label}`]);
      }

      return { success: true, newScore, tier, label };
    }),

  // ============================================================
  // OWNER: DEDUCT POINTS
  // ============================================================
  deductPoints: kingProcedure
    .input(z.object({
      chicaUserId: z.number(),
      eventType: z.string(),
      points: z.number().positive(),
      description: z.string(),
    }))
    .mutation(async ({ input }) => {
      const [profiles]: any = await db.execute(
        `SELECT * FROM chica_loyalty_profiles WHERE chica_user_id = ?`,
        [input.chicaUserId]
      );
      if (!(profiles as any[]).length) throw new Error('Chica not found');
      const profile = (profiles as any[])[0];

      const newScore = Math.max(0, profile.loyalty_score - input.points);
      const { tier, label } = calculateTier(newScore);
      const tierChanged = tier !== profile.tier;

      let newStatus = profile.status;
      if (tier <= 1) newStatus = 'probation';
      else if (tier === 2) newStatus = 'on_notice';

      await db.execute(`
        INSERT INTO chica_loyalty_events 
          (chica_user_id, event_type, points_change, score_before, score_after, description, logged_by, is_public)
        VALUES (?, ?, ?, ?, ?, ?, 6, 0)
      `, [input.chicaUserId, input.eventType, -input.points, profile.loyalty_score, newScore, input.description]);

      await db.execute(`
        UPDATE chica_loyalty_profiles 
        SET loyalty_score = ?, tier = ?, tier_label = ?, status = ?, last_score_update = NOW()
        WHERE chica_user_id = ?
      `, [newScore, tier, label, newStatus, input.chicaUserId]);

      if (tierChanged) {
        await db.execute(`
          INSERT INTO chica_loyalty_events 
            (chica_user_id, event_type, points_change, score_before, score_after, description, logged_by, is_public)
          VALUES (?, 'tier_downgrade', 0, ?, ?, ?, 6, 1)
        `, [input.chicaUserId, profile.loyalty_score, newScore, `Tier downgraded to ${label}`]);
      }

      return { success: true, newScore, tier, label };
    }),

  // ============================================================
  // OWNER: ISSUE WARNING
  // ============================================================
  issueWarning: kingProcedure
    .input(z.object({
      chicaUserId: z.number(),
      category: z.string(),
      severity: z.enum(['minor', 'moderate', 'severe', 'final']),
      description: z.string(),
      consequence: z.string(),
    }))
    .mutation(async ({ input }) => {
      const [profiles]: any = await db.execute(
        `SELECT * FROM chica_loyalty_profiles WHERE chica_user_id = ?`,
        [input.chicaUserId]
      );
      if (!(profiles as any[]).length) throw new Error('Chica not found');
      const profile = (profiles as any[])[0];

      const pointsDelta = SEVERITY_POINTS[input.severity] || -50;
      const newScore = Math.max(0, profile.loyalty_score + pointsDelta);
      const { tier, label } = calculateTier(newScore);
      const warningNumber = (profile.total_warnings || 0) + 1;

      await db.execute(`
        INSERT INTO chica_warnings 
          (chica_user_id, warning_number, category, severity, title, description, consequence, points_deducted, issued_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 6)
      `, [
        input.chicaUserId, warningNumber, input.category, input.severity,
        `Warning #${warningNumber}: ${input.category}`,
        input.description, input.consequence, Math.abs(pointsDelta),
      ]);

      await db.execute(`
        UPDATE chica_loyalty_profiles 
        SET loyalty_score = ?, tier = ?, tier_label = ?,
            total_warnings = total_warnings + 1,
            active_warnings = active_warnings + 1,
            status = CASE WHEN ? <= 1 THEN 'probation' WHEN ? = 2 THEN 'on_notice' ELSE status END,
            last_score_update = NOW()
        WHERE chica_user_id = ?
      `, [newScore, tier, label, tier, tier, input.chicaUserId]);

      await db.execute(`
        INSERT INTO chica_loyalty_events 
          (chica_user_id, event_type, points_change, score_before, score_after, description, logged_by, is_public)
        VALUES (?, 'warning_issued', ?, ?, ?, ?, 6, 1)
      `, [input.chicaUserId, pointsDelta, profile.loyalty_score, newScore,
          `${input.severity.toUpperCase()} warning issued: ${input.category}`]);

      return { success: true, newScore, tier, label, warningNumber };
    }),

  // ============================================================
  // OWNER: LOG LIE
  // ============================================================
  logLie: kingProcedure
    .input(z.object({
      chicaUserId: z.number(),
      lieCategory: z.string(),
      whatWasClaimed: z.string(),
      whatWasTrue: z.string(),
      impactLevel: z.enum(['low', 'medium', 'high', 'critical']),
    }))
    .mutation(async ({ input }) => {
      const [profiles]: any = await db.execute(
        `SELECT * FROM chica_loyalty_profiles WHERE chica_user_id = ?`,
        [input.chicaUserId]
      );
      if (!(profiles as any[]).length) throw new Error('Chica not found');
      const profile = (profiles as any[])[0];

      const pointsDelta = IMPACT_POINTS[input.impactLevel] || -100;
      const newScore = Math.max(0, profile.loyalty_score + pointsDelta);
      const { tier, label } = calculateTier(newScore);
      const honestyDrop = Math.round(Math.abs(pointsDelta) / 3);

      await db.execute(`
        INSERT INTO chica_honesty_log 
          (chica_user_id, lie_category, what_was_claimed, what_was_true, impact_level, points_deducted, logged_by)
        VALUES (?, ?, ?, ?, ?, ?, 6)
      `, [input.chicaUserId, input.lieCategory, input.whatWasClaimed,
          input.whatWasTrue, input.impactLevel, Math.abs(pointsDelta)]);

      await db.execute(`
        UPDATE chica_loyalty_profiles 
        SET loyalty_score = ?, tier = ?, tier_label = ?,
            total_lies_logged = total_lies_logged + 1,
            honesty_score = GREATEST(0, honesty_score - ?),
            status = CASE WHEN ? <= 1 THEN 'probation' WHEN ? = 2 THEN 'on_notice' ELSE status END,
            last_score_update = NOW()
        WHERE chica_user_id = ?
      `, [newScore, tier, label, honestyDrop, tier, tier, input.chicaUserId]);

      await db.execute(`
        INSERT INTO chica_loyalty_events 
          (chica_user_id, event_type, points_change, score_before, score_after, description, logged_by, is_public)
        VALUES (?, 'rule_violation', ?, ?, ?, ?, 6, 0)
      `, [input.chicaUserId, pointsDelta, profile.loyalty_score, newScore,
          `Lie logged (${input.lieCategory}) — ${input.impactLevel} impact`]);

      return { success: true, newScore, tier, label };
    }),

  // ============================================================
  // OWNER: REMOVE FROM PROGRAM
  // ============================================================
  removeFromProgram: kingProcedure
    .input(z.object({
      chicaUserId: z.number(),
      removalReason: z.string(),
    }))
    .mutation(async ({ input }) => {
      await db.execute(`
        UPDATE chica_loyalty_profiles 
        SET status = 'removed', tier = 0, tier_label = 'Removed',
            loyalty_score = 0, removal_reason = ?, removed_at = NOW()
        WHERE chica_user_id = ?
      `, [input.removalReason, input.chicaUserId]);

      await db.execute(`
        INSERT INTO chica_loyalty_events 
          (chica_user_id, event_type, points_change, score_before, score_after, description, logged_by, is_public)
        VALUES (?, 'manual_adjustment', -1000, 0, 0, ?, 6, 0)
      `, [input.chicaUserId, `Removed from program: ${input.removalReason}`]);

      return { success: true };
    }),
});
