import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { marketplaceProducts, marketplaceOrders } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { stripe } from "../_core/stripe";

// Only creators can create/manage products
const creatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "creator" && ctx.user.role !== "influencer" && ctx.user.role !== "celebrity" && ctx.user.role !== "admin" && ctx.user.role !== "king") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only creators can manage products" });
  }
  return next({ ctx });
});

export const marketplaceRouter = router({
  // Get all active products (public)
  getProducts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.status, "active")).orderBy(desc(marketplaceProducts.createdAt));
  }),

  // Get single product (public)
  getProduct: publicProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const [product] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, input.productId));
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      
      // Increment view count
      await db.update(marketplaceProducts)
        .set({ viewCount: sql`${marketplaceProducts.viewCount} + 1` })
        .where(eq(marketplaceProducts.id, input.productId));
      
      return product;
    }),

  // Get creator's products
  getMyProducts: creatorProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.creatorId, ctx.user.id)).orderBy(desc(marketplaceProducts.createdAt));
  }),

  // Get seller stats
  getSellerStats: creatorProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalProducts: 0, totalSales: 0, totalRevenue: 0, avgProductPrice: 0 };
    
    const products = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.creatorId, ctx.user.id));
    
    const totalProducts = products.length;
    const totalSales = products.reduce((sum, p) => sum + (p.salesCount || 0), 0);
    const totalRevenue = products.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
    const avgProductPrice = totalProducts > 0 ? products.reduce((sum, p) => sum + p.priceAmount, 0) / totalProducts : 0;
    
    return {
      totalProducts,
      totalSales,
      totalRevenue,
      avgProductPrice,
    };
  }),

  // Create product
  createProduct: creatorProcedure
    .input(z.object({
      type: z.enum(["digital", "physical", "service", "bundle", "subscription"]),
      title: z.string(),
      category: z.string().optional(),
      shortDescription: z.string().optional(),
      description: z.string().optional(),
      priceAmount: z.number(),
      
      // Digital fields
      digitalFiles: z.array(z.object({ url: z.string(), name: z.string(), size: z.number() })).optional(),
      downloadLimit: z.number().nullable().optional(),
      accessDuration: z.number().nullable().optional(),
      
      // Physical fields
      shippingType: z.enum(["self", "fulfillment"]).optional(),
      shippingCost: z.number().optional(),
      estimatedDeliveryDays: z.number().optional(),
      inventory: z.number().nullable().optional(),
      variations: z.object({ sizes: z.array(z.string()).optional(), colors: z.array(z.string()).optional() }).optional(),
      
      // Service fields
      serviceDuration: z.number().optional(),
      deliveryMethods: z.array(z.string()).optional(),
      bookingEnabled: z.boolean().optional(),
      turnaroundDays: z.number().optional(),
      
      // Media
      mainImage: z.string().optional(),
      additionalImages: z.array(z.string()).optional(),
      productVideo: z.string().optional(),
      
      // Pricing
      regularPrice: z.number().optional(),
      salePrice: z.number().optional(),
      saleEndDate: z.date().nullable().optional(),
      monthlyPrice: z.number().optional(),
      
      // SEO
      keywords: z.array(z.string()).optional(),
      targetAudience: z.array(z.string()).optional(),
      contentRating: z.enum(["general", "18+", "21+"]).optional(),
      
      // Terms
      refundPolicy: z.enum(["no-refunds", "7-day", "30-day", "custom"]).optional(),
      customRefundPolicy: z.string().optional(),
      customerInstructions: z.string().optional(),
      termsOfUse: z.string().optional(),
      
      // Publishing
      publishOption: z.enum(["immediate", "scheduled", "draft"]),
      scheduledFor: z.date().nullable().optional(),
      notifySubscribers: z.boolean().optional(),
      shareOnSocial: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const status = input.publishOption === "draft" ? "draft" : "active";
      const publishedAt = input.publishOption === "immediate" ? new Date() : input.scheduledFor;
      
      const [product] = await db.insert(marketplaceProducts).values({
        creatorId: ctx.user.id,
        type: input.type,
        title: input.title,
        category: input.category,
        shortDescription: input.shortDescription,
        description: input.description,
        priceAmount: input.priceAmount,
        
        digitalFiles: input.digitalFiles,
        downloadLimit: input.downloadLimit,
        accessDuration: input.accessDuration,
        
        shippingType: input.shippingType,
        shippingCost: input.shippingCost,
        estimatedDeliveryDays: input.estimatedDeliveryDays,
        inventory: input.inventory,
        variations: input.variations,
        
        serviceDuration: input.serviceDuration,
        deliveryMethods: input.deliveryMethods,
        bookingEnabled: input.bookingEnabled,
        turnaroundDays: input.turnaroundDays,
        
        mainImage: input.mainImage,
        additionalImages: input.additionalImages,
        productVideo: input.productVideo,
        
        regularPrice: input.regularPrice,
        salePrice: input.salePrice,
        saleEndDate: input.saleEndDate,
        monthlyPrice: input.monthlyPrice,
        
        keywords: input.keywords,
        targetAudience: input.targetAudience,
        contentRating: input.contentRating,
        
        refundPolicy: input.refundPolicy,
        customRefundPolicy: input.customRefundPolicy,
        customerInstructions: input.customerInstructions,
        termsOfUse: input.termsOfUse,
        
        status,
        publishedAt,
        fulfillmentType: "manual",
      }).$returningId();
      
      return { success: true, productId: product.id };
    }),

  // Update product status
  updateProductStatus: creatorProcedure
    .input(z.object({
      productId: z.string(),
      status: z.enum(["draft", "active", "archived"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const [product] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, input.productId));
      
      if (!product || product.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      await db.update(marketplaceProducts)
        .set({ status: input.status })
        .where(eq(marketplaceProducts.id, input.productId));
      
      return { success: true };
    }),

  // Delete product
  deleteProduct: creatorProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const [product] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, input.productId));
      
      if (!product || product.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      await db.delete(marketplaceProducts).where(eq(marketplaceProducts.id, input.productId));
      
      return { success: true };
    }),

  // Duplicate product
  duplicateProduct: creatorProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const [product] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, input.productId));
      
      if (!product || product.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const { id, createdAt, updatedAt, publishedAt, viewCount, salesCount, totalRevenue, ...productData } = product;
      
      await db.insert(marketplaceProducts).values({
        ...productData,
        title: `${product.title} (Copy)`,
        status: "draft",
        publishedAt: null,
      });
      
      return { success: true };
    }),

  // Get product analytics
  getProductAnalytics: creatorProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const [product] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, input.productId));
      
      if (!product || product.creatorId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const orders = await db.select().from(marketplaceOrders).where(eq(marketplaceOrders.productId, input.productId));
      
      return {
        views: product.viewCount || 0,
        viewsGrowth: 0,
        sales: product.salesCount || 0,
        salesGrowth: 0,
        revenue: product.totalRevenue || 0,
        trafficSources: [
          { name: "Direct", views: Math.floor((product.viewCount || 0) * 0.4), percentage: 40 },
          { name: "Marketplace Browse", views: Math.floor((product.viewCount || 0) * 0.35), percentage: 35 },
          { name: "Social Media", views: Math.floor((product.viewCount || 0) * 0.15), percentage: 15 },
          { name: "Search", views: Math.floor((product.viewCount || 0) * 0.1), percentage: 10 },
        ],
        topBuyers: orders.slice(0, 5).map(order => ({
          id: order.buyerId,
          name: "Customer",
          email: "customer@example.com",
          amount: order.grossAmount,
          date: order.createdAt.toLocaleDateString(),
        })),
      };
    }),

  // Create Stripe checkout session
  createCheckoutSession: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const [product] = await db.select().from(marketplaceProducts).where(eq(marketplaceProducts.id, input.productId));
      
      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }
      
      const origin = (ctx.req.headers.origin as string | undefined) ?? "http://localhost:3000";
      const currentPrice = product.salePrice || product.priceAmount;
      const totalAmount = currentPrice + (product.shippingCost || 0);
      
      // Calculate revenue split
      const creatorAmount = Math.floor(totalAmount * 0.7);
      const platformAmount = Math.floor(totalAmount * 0.3);
      const recruiterAmount = product.recruiterId ? Math.floor(platformAmount * 0.1) : 0;
      
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: ctx.user.email ?? undefined,
        client_reference_id: String(ctx.user.id),
        metadata: {
          user_id: String(ctx.user.id),
          product_id: product.id,
          creator_id: String(product.creatorId),
          recruiter_id: product.recruiterId ? String(product.recruiterId) : "",
          creator_amount: String(creatorAmount),
          platform_amount: String(platformAmount),
          recruiter_amount: String(recruiterAmount),
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: product.title,
                description: product.shortDescription || product.description || undefined,
                images: product.mainImage ? [product.mainImage] : undefined,
              },
              unit_amount: currentPrice,
            },
            quantity: 1,
          },
          ...(product.shippingCost && product.shippingCost > 0 ? [{
            price_data: {
              currency: "usd",
              product_data: {
                name: "Shipping",
              },
              unit_amount: product.shippingCost,
            },
            quantity: 1,
          }] : []),
        ],
        success_url: `${origin}/marketplace/${product.id}?success=true`,
        cancel_url: `${origin}/marketplace/${product.id}?canceled=true`,
        allow_promotion_codes: true,
      });
      
      return { url: session.url };
    }),
});
