/**
 * AI Bot tRPC Router
 * 
 * Handles role-aware AI interactions for:
 * - Creators
 * - Recruiters
 * - Field Operators
 * - Ambassadors
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  generateBotResponse,
  generateOnboardingPlan,
  generateScript,
  getBotHistory,
  getUserContext,
  type BotRole,
  type BotChannel,
} from "../services/aiBot";

export const aiBotRouter = router({
  /**
   * Chat with role-aware AI bot
   */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(5000),
        role: z.enum(["creator", "recruiter", "field_operator", "ambassador"]).optional(),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user context
      let userContext = await getUserContext(ctx.user.id);
      
      if (!userContext) {
        // Create default context if user not found
        userContext = {
          userId: ctx.user.id,
          role: input.role || "creator",
          language: "en",
        };
      }
      
      // Override role if specified
      if (input.role) {
        userContext.role = input.role;
      }

      const response = await generateBotResponse(
        userContext,
        input.message,
        input.conversationHistory
      );

      return response;
    }),

  /**
   * Get onboarding plan for specific day
   */
  getOnboardingPlan: protectedProcedure
    .input(
      z.object({
        day: z.enum(["1", "2", "7"]),
        role: z.enum(["creator", "recruiter", "field_operator", "ambassador"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get user context
      let userContext = await getUserContext(ctx.user.id);
      
      if (!userContext) {
        userContext = {
          userId: ctx.user.id,
          role: input.role || "creator",
          language: "en",
        };
      }
      
      if (input.role) {
        userContext.role = input.role;
      }

      const day = parseInt(input.day) as 1 | 2 | 7;
      const plan = await generateOnboardingPlan(userContext, day);

      return plan;
    }),

  /**
   * Generate role-specific script
   */
  generateScript: protectedProcedure
    .input(
      z.object({
        scriptType: z.enum(["recruitment", "sales", "onboarding", "support"]),
        role: z.enum(["creator", "recruiter", "field_operator", "ambassador"]).optional(),
        customization: z
          .object({
            targetAudience: z.string().optional(),
            platform: z.string().optional(),
            goal: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get user context
      let userContext = await getUserContext(ctx.user.id);
      
      if (!userContext) {
        userContext = {
          userId: ctx.user.id,
          role: input.role || "creator",
          language: "en",
        };
      }
      
      if (input.role) {
        userContext.role = input.role;
      }

      const script = await generateScript(
        userContext,
        input.scriptType,
        input.customization
      );

      return script;
    }),

  /**
   * Get user's bot interaction history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const history = await getBotHistory(ctx.user.id, input.limit);
      return history;
    }),

  /**
   * Get user's current context
   */
  getContext: protectedProcedure.query(async ({ ctx }) => {
    const context = await getUserContext(ctx.user.id);
    return context;
  }),
});
