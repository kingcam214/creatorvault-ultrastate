import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as dbFGH from "./db-fgh";
import { storagePut } from "./storage";
import { CreatorVaultMarketplace } from "./services/marketplace/marketplace";
import { CreatorVaultUniversity } from "./services/university/university";
import { CoursesServicesEngine } from "./services/coursesServices/coursesServices";
import { stripe } from "./_core/stripe";
import { PRODUCTS } from "./products";
import { aiBotRouter } from "./routers/aiBot";
import { commandHubRouter } from "./routers/commandHub";
import { checkoutBotRouter } from "./routers/checkoutBot";
import { ownerControlRouter } from "./routers/ownerControl";
import { creatorToolsRouter } from "./routers/creatorTools";
import { manualPaymentRouter } from "./routers/manualPayment";
import { adultSalesBotRouter } from "./routers/adultSalesBot";

// Initialize services
const marketplace = new CreatorVaultMarketplace();
const university = new CreatorVaultUniversity();
const servicesEngine = new CoursesServicesEngine();

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
    updateProfile: protectedProcedure.input(z.object({
      name: z.string().optional(),
      role: z.enum(["user", "creator", "admin", "king"]).optional(),
      language: z.string().optional(),
      country: z.string().optional(),
      cashappHandle: z.string().optional(),
      zelleHandle: z.string().optional(),
      applepayHandle: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Update user profile
      if (input.name) {
        await db.updateUserProfile(ctx.user.id, { name: input.name });
      }
      if (input.role && (ctx.user.role === "admin" || ctx.user.role === "king")) {
        await db.updateUserRole(ctx.user.id, input.role);
      }
      if (input.language) {
        await db.updateUserProfile(ctx.user.id, { language: input.language });
      }
      if (input.country) {
        await db.updateUserProfile(ctx.user.id, { country: input.country });
      }
      if (input.cashappHandle !== undefined) {
        await db.updateUserProfile(ctx.user.id, { cashappHandle: input.cashappHandle });
      }
      if (input.zelleHandle !== undefined) {
        await db.updateUserProfile(ctx.user.id, { zelleHandle: input.zelleHandle });
      }
      if (input.applepayHandle !== undefined) {
        await db.updateUserProfile(ctx.user.id, { applepayHandle: input.applepayHandle });
      }
      return { success: true };
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

  // ============ CREATOR VIDEO STUDIO ============
  video: router({
    // Create new video generation job
    create: kingProcedure.input(z.object({
      prompt: z.string(),
      baseImageUrl: z.string().optional(),
      duration: z.number().default(30),
      sceneCount: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const videoStudio = await import("./services/videoStudio");
      const jobId = await videoStudio.createVideoJob({
        userId: ctx.user.id,
        prompt: input.prompt,
        baseImageUrl: input.baseImageUrl,
        duration: input.duration,
        sceneCount: input.sceneCount,
      });
      return { jobId };
    }),

    // Generate all scenes for a job
    generateScenes: kingProcedure.input(z.object({
      jobId: z.number(),
    })).mutation(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      await videoStudio.generateAllScenes(input.jobId);
      return { success: true };
    }),

    // Get video job with scenes and assets
    getJob: kingProcedure.input(z.object({
      jobId: z.number(),
    })).query(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      return await videoStudio.getVideoJob(input.jobId);
    }),

    // Get all video jobs for current user
    getMyJobs: kingProcedure.query(async ({ ctx }) => {
      return await db.getVideoJobsByUserId(ctx.user.id);
    }),

    // Regenerate single scene
    regenerateScene: kingProcedure.input(z.object({
      sceneId: z.string(),
      newPrompt: z.string(),
    })).mutation(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      const newImageUrl = await videoStudio.regenerateScene(
        input.sceneId,
        input.newPrompt
      );
      return { imageUrl: newImageUrl };
    }),

    // Reorder scenes
    reorderScenes: kingProcedure.input(z.object({
      jobId: z.number(),
      sceneIds: z.array(z.string()),
    })).mutation(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      await videoStudio.reorderScenes(input.jobId, input.sceneIds);
      return { success: true };
    }),

    // Lock character appearance
    lockCharacter: kingProcedure.input(z.object({
      jobId: z.number(),
      characterFeatures: z.object({
        hair: z.string(),
        eyes: z.string(),
        skin: z.string(),
        clothing: z.string(),
        style: z.string(),
      }),
    })).mutation(async ({ input }) => {
      const videoStudio = await import("./services/videoStudio");
      await videoStudio.lockCharacterAppearance(
        input.jobId,
        input.characterFeatures
      );
      return { success: true };
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

  // ============ SYSTEM F: MARKETPLACE ============
  marketplace: router({
    getProducts: publicProcedure.query(async () => {
      return await dbFGH.listProducts({ status: "active" });
    }),

    createProduct: creatorProcedure.input(z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(["digital", "service", "bundle", "subscription"]),
      price: z.number(),
      currency: z.enum(["USD", "DOP", "HTG"]),
      fulfillmentType: z.enum(["instant", "manual", "scheduled"]).default("manual"),
    })).mutation(async ({ ctx, input }) => {
      await dbFGH.createProduct({
        creatorId: ctx.user.id,
        type: input.type,
        title: input.title,
        description: input.description,
        priceAmount: Math.round(input.price * 100),
        currency: input.currency,
        fulfillmentType: input.fulfillmentType,
      });
      return { success: true };
    }),

    checkout: protectedProcedure.input(z.object({
      productId: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const origin = (ctx.req.headers.origin as string | undefined) ?? "http://localhost:3000";
      
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: ctx.user.email ?? undefined,
        client_reference_id: String(ctx.user.id),
        metadata: {
          user_id: String(ctx.user.id),
          customer_email: ctx.user.email ?? null,
          customer_name: ctx.user.name !== null ? String(ctx.user.name) : "",
          product_id: input.productId,
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: PRODUCTS.TEST_PRODUCT.name,
                description: PRODUCTS.TEST_PRODUCT.description,
              },
              unit_amount: PRODUCTS.TEST_PRODUCT.priceUsd,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/marketplace?success=true`,
        cancel_url: `${origin}/marketplace?canceled=true`,
        allow_promotion_codes: true,
      });

      return { sessionId: session.id, url: session.url };
    }),
  }),

  // ============ SYSTEM G: UNIVERSITY ============
  university: router({
    getCourses: publicProcedure.query(() => {
      // TODO: Store courses in DB
      return [];
    }),

    createCourse: creatorProcedure.input(z.object({
      title: z.string(),
      description: z.string(),
      price: z.number(),
      isFree: z.boolean(),
      currency: z.enum(["USD", "DOP", "HTG"]).default("USD"),
    })).mutation(async ({ ctx, input }) => {
      await dbFGH.createCourse({
        creatorId: ctx.user.id,
        title: input.title,
        description: input.description,
        priceAmount: Math.round(input.price * 100),
        currency: input.currency,
        isFree: input.isFree,
      });
      return { success: true };
    }),

    enroll: protectedProcedure.input(z.object({
      courseId: z.string(),
    })).mutation(async ({ ctx, input }) => {
      // Check if already enrolled
      const existing = await dbFGH.getEnrollment(input.courseId, ctx.user.id);
      if (existing) {
        return existing;
      }

      // Check if course is free
      const course = await dbFGH.getCourse(input.courseId);
      if (!course) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Course not found" });
      }

      if (!course.isFree) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Course requires payment" });
      }

      await dbFGH.createEnrollment({
        courseId: input.courseId,
        studentId: ctx.user.id,
      });

      return { success: true };
    }),
  }),

  // ============ AI BOT (ROLE-AWARE) ============
  aiBot: aiBotRouter,

  // ============ COMMAND HUB ============
  commandHub: commandHubRouter,

  // ============ CHECKOUT BOT ============
  checkoutBot: checkoutBotRouter,

  // ============ OWNER CONTROL PANEL ============
  ownerControl: ownerControlRouter,

  // ============ CREATOR TOOLS ============
  creatorTools: creatorToolsRouter,

  // ============ MANUAL PAYMENT ============
  manualPayment: manualPaymentRouter,

  // ============ ADULT SALES BOT ============
  adultSalesBot: adultSalesBotRouter,

  // ============ SYSTEM H: SERVICES ============
  services: router({
    getOffers: publicProcedure.query(async () => {
      return await dbFGH.listServiceOffers({ status: "active" });
    }),

    createOffer: creatorProcedure.input(z.object({
      title: z.string(),
      description: z.string(),
      tier: z.enum(["low", "mid", "high"]),
      price: z.number(),
      currency: z.enum(["USD", "DOP", "HTG"]).default("USD"),
      deliveryDays: z.number(),
    })).mutation(async ({ ctx, input }) => {
      await dbFGH.createServiceOffer({
        providerId: ctx.user.id,
        title: input.title,
        description: input.description,
        tier: input.tier,
        priceAmount: Math.round(input.price * 100),
        currency: input.currency,
        deliveryDays: input.deliveryDays,
      });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
