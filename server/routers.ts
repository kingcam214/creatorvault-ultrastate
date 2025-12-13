import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";

// ============ MIDDLEWARE ============

const kingProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "King access required" });
  }
  return next({ ctx });
});

const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "creator" && ctx.user.role !== "king" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Creator access required" });
  }
  return next({ ctx });
});

// ============ ROUTERS ============

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ USER MANAGEMENT ============
  users: router({
    getAll: kingProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    getByRole: kingProcedure.input(z.object({
      role: z.enum(["user", "creator", "admin", "king"]),
    })).query(async ({ input }) => {
      return await db.getUsersByRole(input.role);
    }),

    updateRole: kingProcedure.input(z.object({
      userId: z.number(),
      role: z.enum(["user", "creator", "admin", "king"]),
    })).mutation(async ({ input }) => {
      await db.updateUserRole(input.userId, input.role);
      return { success: true };
    }),

    updateCreatorStatus: kingProcedure.input(z.object({
      userId: z.number(),
      status: z.string(),
    })).mutation(async ({ input }) => {
      await db.updateCreatorStatus(input.userId, input.status);
      return { success: true };
    }),

    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserById(ctx.user.id);
    }),
  }),

  // ============ WAITLIST ============
  waitlist: router({
    signup: publicProcedure.input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      phone: z.string().optional(),
      country: z.string().optional(),
      language: z.string().optional(),
      referralSource: z.string().optional(),
      interestedIn: z.array(z.string()).optional(),
    })).mutation(async ({ input }) => {
      const existing = await db.getWaitlistByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });
      }

      await db.addToWaitlist(input);
      return { success: true };
    }),

    getAll: kingProcedure.query(async () => {
      return await db.getAllWaitlist();
    }),

    updateStatus: kingProcedure.input(z.object({
      id: z.number(),
      status: z.string(),
    })).mutation(async ({ input }) => {
      await db.updateWaitlistStatus(input.id, input.status);
      return { success: true };
    }),
  }),

  // ============ CONTENT MANAGEMENT ============
  content: router({
    upload: creatorProcedure.input(z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      fileData: z.string(), // base64
      fileName: z.string(),
      mimeType: z.string(),
      contentType: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Decode base64 and upload to S3
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `content/${ctx.user.id}/${Date.now()}-${input.fileName}`;
      
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      await db.createContent({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        fileUrl: url,
        fileKey,
        mimeType: input.mimeType,
        fileSize: buffer.length,
        contentType: input.contentType,
        status: "pending",
      });

      return { success: true, url };
    }),

    getMyContent: creatorProcedure.query(async ({ ctx }) => {
      return await db.getContentByUserId(ctx.user.id);
    }),

    getAll: kingProcedure.query(async () => {
      return await db.getAllContent();
    }),

    updateStatus: kingProcedure.input(z.object({
      id: z.number(),
      status: z.string(),
    })).mutation(async ({ input }) => {
      await db.updateContentStatus(input.id, input.status);
      return { success: true };
    }),
  }),

  // ============ EMMA NETWORK ============
  emma: router({
    create: kingProcedure.input(z.object({
      userId: z.number(),
      instagram: z.string().optional(),
      tiktok: z.string().optional(),
      whatsapp: z.string().optional(),
      city: z.string().optional(),
      contentTags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      await db.createEmmaNetworkEntry(input);
      return { success: true };
    }),

    getAll: kingProcedure.query(async () => {
      return await db.getAllEmmaNetwork();
    }),

    getByUserId: kingProcedure.input(z.object({
      userId: z.number(),
    })).query(async ({ input }) => {
      return await db.getEmmaNetworkByUserId(input.userId);
    }),

    update: kingProcedure.input(z.object({
      id: z.number(),
      data: z.object({
        messagesSent: z.number().optional(),
        messagesReceived: z.number().optional(),
        lastContact: z.date().optional(),
        totalEarned: z.number().optional(),
        notes: z.string().optional(),
      }),
    })).mutation(async ({ input }) => {
      await db.updateEmmaNetwork(input.id, input.data);
      return { success: true };
    }),
  }),

  // ============ VIDEO GENERATION ============
  video: router({
    generate: kingProcedure.input(z.object({
      imageUrl: z.string(),
      duration: z.number().default(5),
      fps: z.number().default(24),
      motionIntensity: z.number().default(0.5),
      seed: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.createVideoJob({
        userId: ctx.user.id,
        imageUrl: input.imageUrl,
        duration: input.duration,
        fps: input.fps,
        motionIntensity: input.motionIntensity.toString(),
        seed: input.seed,
        status: "pending",
        progress: 0,
      });

      return { success: true };
    }),

    getMyJobs: kingProcedure.query(async ({ ctx }) => {
      return await db.getVideoJobsByUserId(ctx.user.id);
    }),

    getJobStatus: kingProcedure.input(z.object({
      jobId: z.number(),
    })).query(async ({ input }) => {
      return await db.getVideoJobById(input.jobId);
    }),
  }),

  // ============ ANALYTICS ============
  analytics: router({
    logEvent: protectedProcedure.input(z.object({
      eventType: z.string(),
      eventData: z.record(z.string(), z.unknown()).optional(),
      sessionId: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.logAnalyticsEvent({
        userId: ctx.user.id,
        eventType: input.eventType,
        eventData: input.eventData,
        sessionId: input.sessionId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      });
      return { success: true };
    }),

    getMyEvents: protectedProcedure.input(z.object({
      limit: z.number().default(100),
    })).query(async ({ ctx, input }) => {
      return await db.getAnalyticsByUserId(ctx.user.id, input.limit);
    }),

    getEventsByType: kingProcedure.input(z.object({
      eventType: z.string(),
      limit: z.number().default(100),
    })).query(async ({ ctx, input }) => {
      return await db.getAnalyticsByEventType(input.eventType, input.limit);
    }),
  }),

  // ============ PAYMENTS ============
  payments: router({
    create: protectedProcedure.input(z.object({
      amount: z.number(),
      currency: z.string().default("usd"),
      paymentType: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      stripePaymentId: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      await db.createPayment({
        userId: ctx.user.id,
        amount: input.amount,
        currency: input.currency,
        status: "pending",
        paymentType: input.paymentType,
        metadata: input.metadata,
        stripePaymentId: input.stripePaymentId,
      });
      return { success: true };
    }),

    getMyPayments: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPaymentsByUserId(ctx.user.id);
    }),
  }),

  // ============ CULTURAL TEMPLATES ============
  cultural: router({
    getTemplates: protectedProcedure.input(z.object({
      culture: z.string(),
      contentType: z.string().optional(),
    })).query(async ({ input }) => {
      return await db.getCulturalTemplates(input.culture, input.contentType);
    }),

    createTemplate: kingProcedure.input(z.object({
      culture: z.string(),
      contentType: z.string(),
      templateText: z.string(),
      language: z.string(),
    })).mutation(async ({ input }) => {
      await db.createCulturalTemplate(input);
      return { success: true };
    }),
  }),

  // ============ BRAND AFFILIATIONS ============
  brands: router({
    create: protectedProcedure.input(z.object({
      brandId: z.string(),
      isPrimary: z.boolean().default(false),
    })).mutation(async ({ ctx, input }) => {
      await db.createBrandAffiliation({
        userId: ctx.user.id,
        brandId: input.brandId,
        isPrimary: input.isPrimary,
      });
      return { success: true };
    }),

    getMyBrands: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBrandAffiliationsByUserId(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
