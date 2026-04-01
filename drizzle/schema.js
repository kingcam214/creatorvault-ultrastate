"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payoutRequests = exports.adCampaigns = exports.contentPerformance = exports.optimizationHistory = exports.platformAdaptations = exports.orchestrationRuns = exports.unifiedContent = exports.transactions = exports.creatorBalances = exports.subscriptions = exports.subscriptionTiers = exports.bilingualContent = exports.recruiterCommissions = exports.emmaNetworkHierarchy = exports.customRequests = exports.safetyLogs = exports.contentProtection = exports.adultVerification = exports.thumbnailAnalyses = exports.adAnalyses = exports.videoAssets = exports.videoScenes = exports.viralMetrics = exports.viralAnalyses = exports.botEvents = exports.creators = exports.leads = exports.whatsappLeads = exports.whatsappFunnels = exports.whatsappProviders = exports.telegramLeads = exports.telegramFunnels = exports.telegramChannels = exports.telegramBots = exports.commissionEvents = exports.servicesSales = exports.servicesOffers = exports.universityEnrollments = exports.universityCourses = exports.marketplaceOrders = exports.marketplaceProducts = exports.analyticsEvents = exports.videoGenerationJobs = exports.payments = exports.content = exports.waitlist = exports.culturalContentTemplates = exports.brandAffiliations = exports.emmaNetwork = exports.users = void 0;
exports.liveStreamDonations = exports.liveStreamTips = exports.liveStreamViewers = exports.liveStreams = exports.youthKingPrograms = exports.losoPlaybooks = exports.anmarLegacyContent = exports.losoRevenueTracking = exports.gamingTeams = exports.gamingMatches = exports.gamingPlayers = exports.gamingTournaments = exports.creatorAudits = void 0;
var mysql_core_1 = require("drizzle-orm/mysql-core");
/**
 * Core user table with CreatorVault extensions
 */
exports.users = (0, mysql_core_1.mysqlTable)("users", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    openId: (0, mysql_core_1.varchar)("openId", { length: 64 }).notNull().unique(),
    name: (0, mysql_core_1.text)("name"),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }),
    loginMethod: (0, mysql_core_1.varchar)("loginMethod", { length: 64 }),
    role: (0, mysql_core_1.mysqlEnum)("role", ["user", "creator", "influencer", "celebrity", "admin", "king"]).default("user").notNull(),
    // Emma network & cultural intelligence fields
    language: (0, mysql_core_1.varchar)("language", { length: 10 }).default("en"),
    country: (0, mysql_core_1.varchar)("country", { length: 2 }),
    referredBy: (0, mysql_core_1.int)("referred_by"),
    creatorStatus: (0, mysql_core_1.varchar)("creator_status", { length: 20 }).default("pending"),
    contentType: (0, mysql_core_1.json)("content_type").$type(),
    primaryBrand: (0, mysql_core_1.varchar)("primary_brand", { length: 50 }).default("CREATORVAULT"),
    // Payment methods for manual payment flow
    cashappHandle: (0, mysql_core_1.varchar)("cashapp_handle", { length: 100 }),
    paypalEmail: (0, mysql_core_1.varchar)("paypal_email", { length: 320 }),
    zelleHandle: (0, mysql_core_1.varchar)("zelle_handle", { length: 100 }),
    applepayHandle: (0, mysql_core_1.varchar)("applepay_handle", { length: 100 }),
    createdAt: (0, mysql_core_1.timestamp)("createdAt").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: (0, mysql_core_1.timestamp)("lastSignedIn").defaultNow().notNull(),
}, function (table) { return ({
    countryIdx: (0, mysql_core_1.index)("idx_users_country").on(table.country),
    referredByIdx: (0, mysql_core_1.index)("idx_users_referred_by").on(table.referredBy),
    creatorStatusIdx: (0, mysql_core_1.index)("idx_users_creator_status").on(table.creatorStatus),
    languageIdx: (0, mysql_core_1.index)("idx_users_language").on(table.language),
}); });
/**
 * Emma network tracking for detailed creator recruitment
 */
exports.emmaNetwork = (0, mysql_core_1.mysqlTable)("emma_network", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Social profiles
    tinderProfile: (0, mysql_core_1.varchar)("tinder_profile", { length: 255 }),
    instagram: (0, mysql_core_1.varchar)("instagram", { length: 255 }),
    tiktok: (0, mysql_core_1.varchar)("tiktok", { length: 255 }),
    whatsapp: (0, mysql_core_1.varchar)("whatsapp", { length: 255 }),
    // Recruitment tracking
    contactDate: (0, mysql_core_1.timestamp)("contact_date"),
    firstResponse: (0, mysql_core_1.timestamp)("first_response"),
    onboardedDate: (0, mysql_core_1.timestamp)("onboarded_date"),
    // Content details
    city: (0, mysql_core_1.varchar)("city", { length: 100 }),
    contentTags: (0, mysql_core_1.json)("content_tags").$type(),
    // Engagement metrics
    messagesSent: (0, mysql_core_1.int)("messages_sent").default(0),
    messagesReceived: (0, mysql_core_1.int)("messages_received").default(0),
    lastContact: (0, mysql_core_1.timestamp)("last_contact"),
    // Commission tracking
    totalEarned: (0, mysql_core_1.int)("total_earned").default(0),
    lastPayout: (0, mysql_core_1.timestamp)("last_payout"),
    // Notes and metadata
    notes: (0, mysql_core_1.text)("notes"),
    metadata: (0, mysql_core_1.json)("metadata"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_emma_network_user_id").on(table.userId),
    cityIdx: (0, mysql_core_1.index)("idx_emma_network_city").on(table.city),
    instagramIdx: (0, mysql_core_1.index)("idx_emma_network_instagram").on(table.instagram),
}); });
/**
 * Brand affiliations for multi-brand support
 */
exports.brandAffiliations = (0, mysql_core_1.mysqlTable)("brand_affiliations", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    brandId: (0, mysql_core_1.varchar)("brand_id", { length: 50 }).notNull(),
    isPrimary: (0, mysql_core_1.boolean)("is_primary").default(false),
    joinedAt: (0, mysql_core_1.timestamp)("joined_at").defaultNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_brand_affiliations_user_id").on(table.userId),
    brandIdIdx: (0, mysql_core_1.index)("idx_brand_affiliations_brand_id").on(table.brandId),
}); });
/**
 * Cultural content templates for localized messaging
 */
exports.culturalContentTemplates = (0, mysql_core_1.mysqlTable)("cultural_content_templates", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    culture: (0, mysql_core_1.varchar)("culture", { length: 2 }).notNull(), // DR, HT, US
    contentType: (0, mysql_core_1.varchar)("content_type", { length: 50 }).notNull(),
    templateText: (0, mysql_core_1.text)("template_text").notNull(),
    language: (0, mysql_core_1.varchar)("language", { length: 10 }).notNull(),
    useCount: (0, mysql_core_1.int)("use_count").default(0),
    effectivenessScore: (0, mysql_core_1.decimal)("effectiveness_score", { precision: 3, scale: 2 }).default("0.00"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    cultureIdx: (0, mysql_core_1.index)("idx_cultural_templates_culture").on(table.culture),
    typeIdx: (0, mysql_core_1.index)("idx_cultural_templates_type").on(table.contentType),
}); });
/**
 * Waitlist signups
 */
exports.waitlist = (0, mysql_core_1.mysqlTable)("waitlist", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    email: (0, mysql_core_1.varchar)("email", { length: 320 }).notNull().unique(),
    name: (0, mysql_core_1.text)("name"),
    phone: (0, mysql_core_1.varchar)("phone", { length: 20 }),
    country: (0, mysql_core_1.varchar)("country", { length: 2 }),
    language: (0, mysql_core_1.varchar)("language", { length: 10 }).default("en"),
    referralSource: (0, mysql_core_1.varchar)("referral_source", { length: 100 }),
    interestedIn: (0, mysql_core_1.json)("interested_in").$type(),
    status: (0, mysql_core_1.varchar)("status", { length: 20 }).default("pending"),
    invitedAt: (0, mysql_core_1.timestamp)("invited_at"),
    convertedAt: (0, mysql_core_1.timestamp)("converted_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    emailIdx: (0, mysql_core_1.index)("idx_waitlist_email").on(table.email),
    statusIdx: (0, mysql_core_1.index)("idx_waitlist_status").on(table.status),
}); });
/**
 * Content uploads
 */
exports.content = (0, mysql_core_1.mysqlTable)("content", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    title: (0, mysql_core_1.text)("title"),
    description: (0, mysql_core_1.text)("description"),
    fileUrl: (0, mysql_core_1.text)("file_url").notNull(),
    fileKey: (0, mysql_core_1.varchar)("file_key", { length: 255 }).notNull(),
    mimeType: (0, mysql_core_1.varchar)("mime_type", { length: 100 }),
    fileSize: (0, mysql_core_1.int)("file_size"),
    contentType: (0, mysql_core_1.varchar)("content_type", { length: 50 }),
    status: (0, mysql_core_1.varchar)("status", { length: 20 }).default("pending"),
    views: (0, mysql_core_1.int)("views").default(0),
    earnings: (0, mysql_core_1.int)("earnings").default(0),
    metadata: (0, mysql_core_1.json)("metadata"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_content_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_content_status").on(table.status),
    createdAtIdx: (0, mysql_core_1.index)("idx_content_created_at").on(table.createdAt),
}); });
/**
 * Stripe payments and transactions
 */
exports.payments = (0, mysql_core_1.mysqlTable)("payments", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    stripePaymentId: (0, mysql_core_1.varchar)("stripe_payment_id", { length: 255 }).unique(),
    amount: (0, mysql_core_1.int)("amount").notNull(),
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("usd"),
    status: (0, mysql_core_1.varchar)("status", { length: 20 }).notNull(),
    paymentType: (0, mysql_core_1.varchar)("payment_type", { length: 50 }),
    metadata: (0, mysql_core_1.json)("metadata"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_payments_user_id").on(table.userId),
    stripeIdIdx: (0, mysql_core_1.index)("idx_payments_stripe_id").on(table.stripePaymentId),
    statusIdx: (0, mysql_core_1.index)("idx_payments_status").on(table.status),
}); });
/**
 * Video generation jobs
 */
exports.videoGenerationJobs = (0, mysql_core_1.mysqlTable)("video_generation_jobs", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Input
    prompt: (0, mysql_core_1.text)("prompt").notNull(),
    baseImageUrl: (0, mysql_core_1.text)("base_image_url"),
    referenceAssets: (0, mysql_core_1.json)("reference_assets").$type(),
    // Scene plan
    scenePlan: (0, mysql_core_1.json)("scene_plan").$type(),
    characterFeatures: (0, mysql_core_1.json)("character_features").$type(),
    // Output
    videoUrl: (0, mysql_core_1.text)("video_url"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "queued", "processing", "complete", "failed"]).default("queued").notNull(),
    progress: (0, mysql_core_1.int)("progress").default(0),
    errorMessage: (0, mysql_core_1.text)("error_message"),
    // Settings
    duration: (0, mysql_core_1.int)("duration").default(30), // seconds
    fps: (0, mysql_core_1.int)("fps").default(24),
    sceneCount: (0, mysql_core_1.int)("scene_count").default(5),
    // Legacy fields (kept for compatibility)
    imageUrl: (0, mysql_core_1.text)("image_url"),
    motionIntensity: (0, mysql_core_1.decimal)("motion_intensity", { precision: 3, scale: 2 }).default("0.50"),
    seed: (0, mysql_core_1.int)("seed"),
    metadata: (0, mysql_core_1.json)("metadata"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    completedAt: (0, mysql_core_1.timestamp)("completed_at"),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_video_jobs_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_video_jobs_status").on(table.status),
}); });
/**
 * Analytics events
 */
exports.analyticsEvents = (0, mysql_core_1.mysqlTable)("analytics_events", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").references(function () { return exports.users.id; }, { onDelete: "set null" }),
    eventType: (0, mysql_core_1.varchar)("event_type", { length: 100 }).notNull(),
    eventData: (0, mysql_core_1.json)("event_data"),
    sessionId: (0, mysql_core_1.varchar)("session_id", { length: 255 }),
    ipAddress: (0, mysql_core_1.varchar)("ip_address", { length: 45 }),
    userAgent: (0, mysql_core_1.text)("user_agent"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_analytics_user_id").on(table.userId),
    eventTypeIdx: (0, mysql_core_1.index)("idx_analytics_event_type").on(table.eventType),
    createdAtIdx: (0, mysql_core_1.index)("idx_analytics_created_at").on(table.createdAt),
}); });
/**
 * ============================================
 * SYSTEMS F, G, H — MARKETPLACE, UNIVERSITY, SERVICES
 * ============================================
 */
/**
 * Marketplace Products
 */
exports.marketplaceProducts = (0, mysql_core_1.mysqlTable)("marketplace_products", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    recruiterId: (0, mysql_core_1.int)("recruiter_id").references(function () { return exports.users.id; }, { onDelete: "set null" }),
    type: (0, mysql_core_1.mysqlEnum)("type", ["digital", "physical", "service", "bundle", "subscription"]).notNull(),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    category: (0, mysql_core_1.varchar)("category", { length: 100 }),
    shortDescription: (0, mysql_core_1.varchar)("short_description", { length: 280 }),
    description: (0, mysql_core_1.text)("description"),
    priceAmount: (0, mysql_core_1.int)("price_amount").notNull(), // in cents
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD").notNull(),
    // Images & Media
    mainImage: (0, mysql_core_1.varchar)("main_image", { length: 500 }),
    additionalImages: (0, mysql_core_1.json)("additional_images").$type(),
    productVideo: (0, mysql_core_1.varchar)("product_video", { length: 500 }),
    // Digital Product Fields
    digitalFiles: (0, mysql_core_1.json)("digital_files").$type(),
    downloadLimit: (0, mysql_core_1.int)("download_limit"), // null = unlimited
    accessDuration: (0, mysql_core_1.int)("access_duration"), // in days, null = lifetime
    // Physical Product Fields
    shippingType: (0, mysql_core_1.mysqlEnum)("shipping_type", ["self", "fulfillment"]),
    shippingCost: (0, mysql_core_1.int)("shipping_cost"), // in cents
    estimatedDeliveryDays: (0, mysql_core_1.int)("estimated_delivery_days"),
    inventory: (0, mysql_core_1.int)("inventory"), // null = unlimited
    variations: (0, mysql_core_1.json)("variations").$type(),
    // Service Fields
    serviceDuration: (0, mysql_core_1.int)("service_duration"), // in minutes
    deliveryMethods: (0, mysql_core_1.json)("delivery_methods").$type(),
    bookingEnabled: (0, mysql_core_1.boolean)("booking_enabled").default(false),
    turnaroundDays: (0, mysql_core_1.int)("turnaround_days"),
    // Pricing & Discounts
    regularPrice: (0, mysql_core_1.int)("regular_price"), // in cents, for sale pricing
    salePrice: (0, mysql_core_1.int)("sale_price"), // in cents
    saleEndDate: (0, mysql_core_1.timestamp)("sale_end_date"),
    monthlyPrice: (0, mysql_core_1.int)("monthly_price"), // in cents, for subscription option
    // SEO & Discovery
    keywords: (0, mysql_core_1.json)("keywords").$type(),
    targetAudience: (0, mysql_core_1.json)("target_audience").$type(),
    contentRating: (0, mysql_core_1.mysqlEnum)("content_rating", ["general", "18+", "21+"]).default("general"),
    // Terms & Delivery
    refundPolicy: (0, mysql_core_1.mysqlEnum)("refund_policy", ["no-refunds", "7-day", "30-day", "custom"]).default("no-refunds"),
    customRefundPolicy: (0, mysql_core_1.text)("custom_refund_policy"),
    customerInstructions: (0, mysql_core_1.text)("customer_instructions"),
    termsOfUse: (0, mysql_core_1.text)("terms_of_use"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "active", "archived"]).default("draft").notNull(),
    // Publishing
    publishedAt: (0, mysql_core_1.timestamp)("published_at"),
    scheduledFor: (0, mysql_core_1.timestamp)("scheduled_for"),
    // Stats
    viewCount: (0, mysql_core_1.int)("view_count").default(0),
    salesCount: (0, mysql_core_1.int)("sales_count").default(0),
    totalRevenue: (0, mysql_core_1.int)("total_revenue").default(0), // in cents
    fulfillmentType: (0, mysql_core_1.mysqlEnum)("fulfillment_type", ["instant", "manual", "scheduled"]).default("manual").notNull(),
    fulfillmentPayload: (0, mysql_core_1.json)("fulfillment_payload"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    creatorIdIdx: (0, mysql_core_1.index)("idx_marketplace_products_creator_id").on(table.creatorId),
    statusIdx: (0, mysql_core_1.index)("idx_marketplace_products_status").on(table.status),
    typeIdx: (0, mysql_core_1.index)("idx_marketplace_products_type").on(table.type),
    categoryIdx: (0, mysql_core_1.index)("idx_marketplace_products_category").on(table.category),
}); });
/**
 * Marketplace Orders
 */
exports.marketplaceOrders = (0, mysql_core_1.mysqlTable)("marketplace_orders", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    buyerId: (0, mysql_core_1.int)("buyer_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    productId: (0, mysql_core_1.varchar)("product_id", { length: 36 }).notNull().references(function () { return exports.marketplaceProducts.id; }, { onDelete: "restrict" }),
    quantity: (0, mysql_core_1.int)("quantity").default(1).notNull(),
    grossAmount: (0, mysql_core_1.int)("gross_amount").notNull(), // in cents
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD").notNull(),
    creatorAmount: (0, mysql_core_1.int)("creator_amount").notNull(),
    recruiterAmount: (0, mysql_core_1.int)("recruiter_amount").default(0).notNull(),
    platformAmount: (0, mysql_core_1.int)("platform_amount").notNull(),
    paymentProvider: (0, mysql_core_1.varchar)("payment_provider", { length: 20 }).default("stripe").notNull(),
    stripeSessionId: (0, mysql_core_1.varchar)("stripe_session_id", { length: 255 }),
    stripePaymentIntentId: (0, mysql_core_1.varchar)("stripe_payment_intent_id", { length: 255 }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "paid", "fulfilled", "refunded", "failed"]).default("pending").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    buyerIdIdx: (0, mysql_core_1.index)("idx_marketplace_orders_buyer_id").on(table.buyerId),
    productIdIdx: (0, mysql_core_1.index)("idx_marketplace_orders_product_id").on(table.productId),
    statusIdx: (0, mysql_core_1.index)("idx_marketplace_orders_status").on(table.status),
    stripeSessionIdIdx: (0, mysql_core_1.index)("idx_marketplace_orders_stripe_session_id").on(table.stripeSessionId),
}); });
/**
 * University Courses
 */
exports.universityCourses = (0, mysql_core_1.mysqlTable)("university_courses", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    priceAmount: (0, mysql_core_1.int)("price_amount").default(0).notNull(), // in cents
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD").notNull(),
    isFree: (0, mysql_core_1.boolean)("is_free").default(false).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "published", "archived"]).default("draft").notNull(),
    syllabusJson: (0, mysql_core_1.json)("syllabus_json").$type(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    creatorIdIdx: (0, mysql_core_1.index)("idx_university_courses_creator_id").on(table.creatorId),
    statusIdx: (0, mysql_core_1.index)("idx_university_courses_status").on(table.status),
}); });
/**
 * University Enrollments
 */
exports.universityEnrollments = (0, mysql_core_1.mysqlTable)("university_enrollments", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    courseId: (0, mysql_core_1.varchar)("course_id", { length: 36 }).notNull().references(function () { return exports.universityCourses.id; }, { onDelete: "cascade" }),
    studentId: (0, mysql_core_1.int)("student_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    orderId: (0, mysql_core_1.varchar)("order_id", { length: 36 }).references(function () { return exports.marketplaceOrders.id; }, { onDelete: "set null" }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "completed", "refunded", "revoked"]).default("active").notNull(),
    progressJson: (0, mysql_core_1.json)("progress_json").$type(),
    certificateUrl: (0, mysql_core_1.varchar)("certificate_url", { length: 512 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    courseIdIdx: (0, mysql_core_1.index)("idx_university_enrollments_course_id").on(table.courseId),
    studentIdIdx: (0, mysql_core_1.index)("idx_university_enrollments_student_id").on(table.studentId),
    statusIdx: (0, mysql_core_1.index)("idx_university_enrollments_status").on(table.status),
}); });
/**
 * Services Offers
 */
exports.servicesOffers = (0, mysql_core_1.mysqlTable)("services_offers", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    providerId: (0, mysql_core_1.int)("provider_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    tier: (0, mysql_core_1.mysqlEnum)("tier", ["low", "mid", "high"]).default("mid").notNull(),
    priceAmount: (0, mysql_core_1.int)("price_amount").notNull(), // in cents
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD").notNull(),
    deliveryDays: (0, mysql_core_1.int)("delivery_days").default(7).notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "active", "archived"]).default("draft").notNull(),
    fulfillmentStepsJson: (0, mysql_core_1.json)("fulfillment_steps_json").$type(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    providerIdIdx: (0, mysql_core_1.index)("idx_services_offers_provider_id").on(table.providerId),
    statusIdx: (0, mysql_core_1.index)("idx_services_offers_status").on(table.status),
    tierIdx: (0, mysql_core_1.index)("idx_services_offers_tier").on(table.tier),
}); });
/**
 * Services Sales
 */
exports.servicesSales = (0, mysql_core_1.mysqlTable)("services_sales", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    buyerId: (0, mysql_core_1.int)("buyer_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    offerId: (0, mysql_core_1.varchar)("offer_id", { length: 36 }).notNull().references(function () { return exports.servicesOffers.id; }, { onDelete: "restrict" }),
    grossAmount: (0, mysql_core_1.int)("gross_amount").notNull(), // in cents
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD").notNull(),
    providerAmount: (0, mysql_core_1.int)("provider_amount").notNull(),
    affiliateAmount: (0, mysql_core_1.int)("affiliate_amount").default(0).notNull(),
    recruiterAmount: (0, mysql_core_1.int)("recruiter_amount").default(0).notNull(),
    platformAmount: (0, mysql_core_1.int)("platform_amount").notNull(),
    stripeSessionId: (0, mysql_core_1.varchar)("stripe_session_id", { length: 255 }),
    stripePaymentIntentId: (0, mysql_core_1.varchar)("stripe_payment_intent_id", { length: 255 }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "paid", "in_progress", "delivered", "refunded", "failed"]).default("pending").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    buyerIdIdx: (0, mysql_core_1.index)("idx_services_sales_buyer_id").on(table.buyerId),
    offerIdIdx: (0, mysql_core_1.index)("idx_services_sales_offer_id").on(table.offerId),
    statusIdx: (0, mysql_core_1.index)("idx_services_sales_status").on(table.status),
    stripeSessionIdIdx: (0, mysql_core_1.index)("idx_services_sales_stripe_session_id").on(table.stripeSessionId),
}); });
/**
 * Commission Events (tracking all revenue splits)
 */
exports.commissionEvents = (0, mysql_core_1.mysqlTable)("commission_events", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    refType: (0, mysql_core_1.mysqlEnum)("ref_type", ["order", "sale", "enrollment"]).notNull(),
    refId: (0, mysql_core_1.varchar)("ref_id", { length: 36 }).notNull(),
    partyType: (0, mysql_core_1.mysqlEnum)("party_type", ["creator", "recruiter", "affiliate", "platform"]).notNull(),
    partyId: (0, mysql_core_1.int)("party_id").references(function () { return exports.users.id; }, { onDelete: "set null" }), // null for platform
    amount: (0, mysql_core_1.int)("amount").notNull(), // in cents
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    refTypeIdIdx: (0, mysql_core_1.index)("idx_commission_events_ref").on(table.refType, table.refId),
    partyIdIdx: (0, mysql_core_1.index)("idx_commission_events_party_id").on(table.partyId),
    partyTypeIdx: (0, mysql_core_1.index)("idx_commission_events_party_type").on(table.partyType),
}); });
// ============ TELEGRAM BOTS ============
exports.telegramBots = (0, mysql_core_1.mysqlTable)("telegram_bots", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    botToken: (0, mysql_core_1.text)("bot_token").notNull(), // Encrypted at rest
    webhookUrl: (0, mysql_core_1.text)("webhook_url"),
    status: (0, mysql_core_1.varchar)("status", { length: 50 }).notNull().default("active"), // active, paused, deleted
    createdBy: (0, mysql_core_1.int)("created_by").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").notNull().defaultNow().onUpdateNow(),
});
exports.telegramChannels = (0, mysql_core_1.mysqlTable)("telegram_channels", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    botId: (0, mysql_core_1.varchar)("bot_id", { length: 36 }).notNull().references(function () { return exports.telegramBots.id; }, { onDelete: "cascade" }),
    channelId: (0, mysql_core_1.varchar)("channel_id", { length: 255 }).notNull(), // Telegram channel ID
    channelName: (0, mysql_core_1.varchar)("channel_name", { length: 255 }),
    channelType: (0, mysql_core_1.varchar)("channel_type", { length: 50 }).notNull(), // broadcast, funnel, support
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
});
exports.telegramFunnels = (0, mysql_core_1.mysqlTable)("telegram_funnels", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    botId: (0, mysql_core_1.varchar)("bot_id", { length: 36 }).notNull().references(function () { return exports.telegramBots.id; }, { onDelete: "cascade" }),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    messagesJson: (0, mysql_core_1.text)("messages_json").notNull(), // Array of {text, delay, buttons}
    status: (0, mysql_core_1.varchar)("status", { length: 50 }).notNull().default("active"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").notNull().defaultNow().onUpdateNow(),
});
exports.telegramLeads = (0, mysql_core_1.mysqlTable)("telegram_leads", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    botId: (0, mysql_core_1.varchar)("bot_id", { length: 36 }).notNull().references(function () { return exports.telegramBots.id; }, { onDelete: "cascade" }),
    telegramUserId: (0, mysql_core_1.varchar)("telegram_user_id", { length: 255 }).notNull(),
    username: (0, mysql_core_1.varchar)("username", { length: 255 }),
    firstName: (0, mysql_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, mysql_core_1.varchar)("last_name", { length: 255 }),
    email: (0, mysql_core_1.varchar)("email", { length: 255 }),
    country: (0, mysql_core_1.varchar)("country", { length: 100 }),
    creatorType: (0, mysql_core_1.varchar)("creator_type", { length: 100 }), // content, adult, fitness, etc.
    funnelId: (0, mysql_core_1.varchar)("funnel_id", { length: 36 }),
    currentStep: (0, mysql_core_1.int)("current_step").default(0),
    dataJson: (0, mysql_core_1.text)("data_json"), // Additional collected data
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").notNull().defaultNow().onUpdateNow(),
});
// ============ WHATSAPP AUTOMATION ============
exports.whatsappProviders = (0, mysql_core_1.mysqlTable)("whatsapp_providers", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    provider: (0, mysql_core_1.varchar)("provider", { length: 50 }).notNull(), // twilio, meta_cloud_api
    credentialsJson: (0, mysql_core_1.text)("credentials_json").notNull(), // Encrypted
    phoneNumber: (0, mysql_core_1.varchar)("phone_number", { length: 50 }),
    status: (0, mysql_core_1.varchar)("status", { length: 50 }).notNull().default("active"),
    createdBy: (0, mysql_core_1.int)("created_by").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").notNull().defaultNow().onUpdateNow(),
});
exports.whatsappFunnels = (0, mysql_core_1.mysqlTable)("whatsapp_funnels", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    providerId: (0, mysql_core_1.varchar)("provider_id", { length: 36 }).notNull().references(function () { return exports.whatsappProviders.id; }, { onDelete: "cascade" }),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    messagesJson: (0, mysql_core_1.text)("messages_json").notNull(),
    status: (0, mysql_core_1.varchar)("status", { length: 50 }).notNull().default("active"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").notNull().defaultNow().onUpdateNow(),
});
exports.whatsappLeads = (0, mysql_core_1.mysqlTable)("whatsapp_leads", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    providerId: (0, mysql_core_1.varchar)("provider_id", { length: 36 }).notNull().references(function () { return exports.whatsappProviders.id; }, { onDelete: "cascade" }),
    phoneNumber: (0, mysql_core_1.varchar)("phone_number", { length: 50 }).notNull(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }),
    email: (0, mysql_core_1.varchar)("email", { length: 255 }),
    country: (0, mysql_core_1.varchar)("country", { length: 100 }),
    creatorType: (0, mysql_core_1.varchar)("creator_type", { length: 100 }),
    funnelId: (0, mysql_core_1.varchar)("funnel_id", { length: 36 }),
    currentStep: (0, mysql_core_1.int)("current_step").default(0),
    dataJson: (0, mysql_core_1.text)("data_json"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").notNull().defaultNow().onUpdateNow(),
});
// ============ LEADS (UNIFIED) ============
exports.leads = (0, mysql_core_1.mysqlTable)("leads", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    source: (0, mysql_core_1.varchar)("source", { length: 50 }).notNull(), // telegram, whatsapp, web, marketplace
    sourceId: (0, mysql_core_1.varchar)("source_id", { length: 255 }), // Reference to telegram_leads.id or whatsapp_leads.id
    email: (0, mysql_core_1.varchar)("email", { length: 255 }),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }),
    country: (0, mysql_core_1.varchar)("country", { length: 100 }),
    creatorType: (0, mysql_core_1.varchar)("creator_type", { length: 100 }),
    status: (0, mysql_core_1.varchar)("status", { length: 50 }).notNull().default("new"), // new, contacted, converted, lost
    dataJson: (0, mysql_core_1.text)("data_json"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").notNull().defaultNow().onUpdateNow(),
});
// ============ CREATORS (EXTENDED) ============
exports.creators = (0, mysql_core_1.mysqlTable)("creators", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    creatorType: (0, mysql_core_1.varchar)("creator_type", { length: 100 }).notNull(), // content, adult, fitness, etc.
    country: (0, mysql_core_1.varchar)("country", { length: 100 }),
    platforms: (0, mysql_core_1.text)("platforms"), // JSON array of platforms
    monthlyRevenue: (0, mysql_core_1.int)("monthly_revenue"), // In cents
    subscriberCount: (0, mysql_core_1.int)("subscriber_count"),
    status: (0, mysql_core_1.varchar)("status", { length: 50 }).notNull().default("active"),
    onboardedAt: (0, mysql_core_1.timestamp)("onboarded_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").notNull().defaultNow().onUpdateNow(),
});
// ============ BOT EVENTS (AI Bot Interactions) ============
exports.botEvents = (0, mysql_core_1.mysqlTable)("bot_events", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    channel: (0, mysql_core_1.varchar)("channel", { length: 50 }).notNull(), // telegram, whatsapp, web
    eventType: (0, mysql_core_1.varchar)("event_type", { length: 100 }).notNull(), // ai_chat, onboarding_plan_generated, script_generated, etc.
    eventData: (0, mysql_core_1.json)("event_data"), // Flexible JSON for event-specific data
    outcome: (0, mysql_core_1.varchar)("outcome", { length: 50 }).default("success"), // success, error, pending
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_bot_events_user_id").on(table.userId),
    channelIdx: (0, mysql_core_1.index)("idx_bot_events_channel").on(table.channel),
    eventTypeIdx: (0, mysql_core_1.index)("idx_bot_events_event_type").on(table.eventType),
    createdAtIdx: (0, mysql_core_1.index)("idx_bot_events_created_at").on(table.createdAt),
}); });
// ============ VIRAL OPTIMIZER ============
exports.viralAnalyses = (0, mysql_core_1.mysqlTable)("viral_analyses", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Input data
    title: (0, mysql_core_1.text)("title").notNull(),
    description: (0, mysql_core_1.text)("description"),
    tags: (0, mysql_core_1.text)("tags"), // Comma-separated
    duration: (0, mysql_core_1.int)("duration"), // In seconds
    platform: (0, mysql_core_1.varchar)("platform", { length: 50 }).notNull(), // youtube, tiktok, instagram, etc.
    // Analysis results
    viralScore: (0, mysql_core_1.int)("viral_score").notNull(), // 0-100
    confidenceLevel: (0, mysql_core_1.int)("confidence_level").default(0), // 0-100
    // Component scores
    hookScore: (0, mysql_core_1.int)("hook_score"),
    qualityScore: (0, mysql_core_1.int)("quality_score"),
    trendScore: (0, mysql_core_1.int)("trend_score"),
    audienceScore: (0, mysql_core_1.int)("audience_score"),
    formatScore: (0, mysql_core_1.int)("format_score"),
    timingScore: (0, mysql_core_1.int)("timing_score"),
    platformScore: (0, mysql_core_1.int)("platform_score"),
    // Recommendations
    weaknesses: (0, mysql_core_1.text)("weaknesses"), // JSON array
    recommendations: (0, mysql_core_1.text)("recommendations"), // JSON array
    optimizedTitle: (0, mysql_core_1.text)("optimized_title"),
    optimizedDescription: (0, mysql_core_1.text)("optimized_description"),
    optimizedTags: (0, mysql_core_1.text)("optimized_tags"), // Comma-separated
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_viral_analyses_user_id").on(table.userId),
    platformIdx: (0, mysql_core_1.index)("idx_viral_analyses_platform").on(table.platform),
    viralScoreIdx: (0, mysql_core_1.index)("idx_viral_analyses_viral_score").on(table.viralScore),
    createdAtIdx: (0, mysql_core_1.index)("idx_viral_analyses_created_at").on(table.createdAt),
}); });
exports.viralMetrics = (0, mysql_core_1.mysqlTable)("viral_metrics", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    analysisId: (0, mysql_core_1.varchar)("analysis_id", { length: 36 }).notNull().references(function () { return exports.viralAnalyses.id; }, { onDelete: "cascade" }),
    // Predicted metrics
    predictedViews: (0, mysql_core_1.int)("predicted_views"),
    predictedEngagement: (0, mysql_core_1.decimal)("predicted_engagement", { precision: 5, scale: 2 }), // Percentage
    predictedCtr: (0, mysql_core_1.decimal)("predicted_ctr", { precision: 5, scale: 2 }), // Percentage
    predictedRetention: (0, mysql_core_1.decimal)("predicted_retention", { precision: 5, scale: 2 }), // Percentage
    // Actual metrics (updated after content is published)
    actualViews: (0, mysql_core_1.int)("actual_views"),
    actualEngagement: (0, mysql_core_1.decimal)("actual_engagement", { precision: 5, scale: 2 }),
    actualCtr: (0, mysql_core_1.decimal)("actual_ctr", { precision: 5, scale: 2 }),
    actualRetention: (0, mysql_core_1.decimal)("actual_retention", { precision: 5, scale: 2 }),
    // Tracking
    publishedAt: (0, mysql_core_1.timestamp)("published_at"),
    lastUpdatedAt: (0, mysql_core_1.timestamp)("last_updated_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
}, function (table) { return ({
    analysisIdIdx: (0, mysql_core_1.index)("idx_viral_metrics_analysis_id").on(table.analysisId),
}); });
/**
 * Video scenes for multi-scene video generation
 */
exports.videoScenes = (0, mysql_core_1.mysqlTable)("video_scenes", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    jobId: (0, mysql_core_1.int)("job_id").notNull().references(function () { return exports.videoGenerationJobs.id; }, { onDelete: "cascade" }),
    sceneIndex: (0, mysql_core_1.int)("scene_index").notNull(),
    description: (0, mysql_core_1.text)("description").notNull(),
    prompt: (0, mysql_core_1.text)("prompt").notNull(),
    imageUrl: (0, mysql_core_1.text)("image_url"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "generating", "complete", "failed"]).default("pending").notNull(),
    errorMessage: (0, mysql_core_1.text)("error_message"),
    // Regeneration tracking
    regenerationCount: (0, mysql_core_1.int)("regeneration_count").default(0),
    regenerationHistory: (0, mysql_core_1.json)("regeneration_history").$type(),
    // Character continuity
    characterLocked: (0, mysql_core_1.boolean)("character_locked").default(false),
    metadata: (0, mysql_core_1.json)("metadata"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    jobIdIdx: (0, mysql_core_1.index)("idx_video_scenes_job_id").on(table.jobId),
    sceneIndexIdx: (0, mysql_core_1.index)("idx_video_scenes_scene_index").on(table.sceneIndex),
    statusIdx: (0, mysql_core_1.index)("idx_video_scenes_status").on(table.status),
}); });
/**
 * Video assets (final outputs, intermediate frames, etc.)
 */
exports.videoAssets = (0, mysql_core_1.mysqlTable)("video_assets", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    jobId: (0, mysql_core_1.int)("job_id").notNull().references(function () { return exports.videoGenerationJobs.id; }, { onDelete: "cascade" }),
    assetType: (0, mysql_core_1.mysqlEnum)("asset_type", ["final_video", "scene_frame", "reference_image", "thumbnail"]).notNull(),
    url: (0, mysql_core_1.text)("url").notNull(),
    fileSize: (0, mysql_core_1.int)("file_size"), // bytes
    mimeType: (0, mysql_core_1.varchar)("mime_type", { length: 100 }),
    duration: (0, mysql_core_1.int)("duration"), // seconds (for videos)
    metadata: (0, mysql_core_1.json)("metadata"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    jobIdIdx: (0, mysql_core_1.index)("idx_video_assets_job_id").on(table.jobId),
    assetTypeIdx: (0, mysql_core_1.index)("idx_video_assets_asset_type").on(table.assetType),
}); });
// ============ AD OPTIMIZER ============
exports.adAnalyses = (0, mysql_core_1.mysqlTable)("ad_analyses", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Input data
    product: (0, mysql_core_1.text)("product").notNull(),
    targetAudience: (0, mysql_core_1.text)("target_audience").notNull(),
    goal: (0, mysql_core_1.mysqlEnum)("goal", ["awareness", "traffic", "conversions", "engagement"]).notNull(),
    description: (0, mysql_core_1.text)("description"),
    tone: (0, mysql_core_1.varchar)("tone", { length: 50 }),
    budget: (0, mysql_core_1.int)("budget"),
    // Generated ad copy
    headline: (0, mysql_core_1.text)("headline").notNull(),
    bodyText: (0, mysql_core_1.text)("body_text").notNull(),
    cta: (0, mysql_core_1.text)("cta").notNull(),
    // Generated creative
    imageUrl: (0, mysql_core_1.text)("image_url").notNull(),
    imagePrompt: (0, mysql_core_1.text)("image_prompt"),
    // Scores (0-100)
    overallScore: (0, mysql_core_1.int)("overall_score").notNull(),
    hookScore: (0, mysql_core_1.int)("hook_score"),
    clarityScore: (0, mysql_core_1.int)("clarity_score"),
    urgencyScore: (0, mysql_core_1.int)("urgency_score"),
    valueScore: (0, mysql_core_1.int)("value_score"),
    ctaScore: (0, mysql_core_1.int)("cta_score"),
    // Analysis
    strengths: (0, mysql_core_1.text)("strengths"), // JSON array
    weaknesses: (0, mysql_core_1.text)("weaknesses"), // JSON array
    recommendations: (0, mysql_core_1.text)("recommendations"), // JSON array
    // Predicted metrics
    predictedCtr: (0, mysql_core_1.decimal)("predicted_ctr", { precision: 5, scale: 2 }), // Click-through rate (%)
    predictedCpc: (0, mysql_core_1.decimal)("predicted_cpc", { precision: 6, scale: 2 }), // Cost per click (USD)
    predictedConversions: (0, mysql_core_1.int)("predicted_conversions"), // Per 1000 impressions
    predictedRoas: (0, mysql_core_1.decimal)("predicted_roas", { precision: 6, scale: 2 }), // Return on ad spend
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_ad_analyses_user_id").on(table.userId),
    goalIdx: (0, mysql_core_1.index)("idx_ad_analyses_goal").on(table.goal),
    overallScoreIdx: (0, mysql_core_1.index)("idx_ad_analyses_overall_score").on(table.overallScore),
    createdAtIdx: (0, mysql_core_1.index)("idx_ad_analyses_created_at").on(table.createdAt),
}); });
// ============ THUMBNAIL GENERATOR ============
// ============ MULTI-PLATFORM POSTING & ANALYTICS ============
// Import from schema-multiplatform.ts
__exportStar(require("./schema-multiplatform"), exports);
// ============ PODCASTING INTEGRATION SUITE ============
// Import from schema-podcasting.ts
__exportStar(require("./schema-podcasting"), exports);
// ============ CONTENT ORCHESTRATOR ============
__exportStar(require("./schema-orchestrator"), exports);
exports.thumbnailAnalyses = (0, mysql_core_1.mysqlTable)("thumbnail_analyses", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Input data
    videoTitle: (0, mysql_core_1.text)("video_title").notNull(),
    niche: (0, mysql_core_1.varchar)("niche", { length: 100 }).notNull(),
    style: (0, mysql_core_1.varchar)("style", { length: 50 }), // bold, minimal, dramatic, playful
    platform: (0, mysql_core_1.varchar)("platform", { length: 50 }).default("youtube").notNull(),
    // Generated thumbnail
    imageUrl: (0, mysql_core_1.text)("image_url").notNull(),
    imagePrompt: (0, mysql_core_1.text)("image_prompt"),
    textOverlay: (0, mysql_core_1.text)("text_overlay"), // Text shown on thumbnail
    // Scores (0-100)
    overallScore: (0, mysql_core_1.int)("overall_score").notNull(),
    ctrScore: (0, mysql_core_1.int)("ctr_score"), // Click-through rate potential
    clarityScore: (0, mysql_core_1.int)("clarity_score"), // Visual clarity
    emotionScore: (0, mysql_core_1.int)("emotion_score"), // Emotional impact
    contrastScore: (0, mysql_core_1.int)("contrast_score"), // Color contrast
    textScore: (0, mysql_core_1.int)("text_score"), // Text readability
    // Analysis
    strengths: (0, mysql_core_1.text)("strengths"), // JSON array
    weaknesses: (0, mysql_core_1.text)("weaknesses"), // JSON array
    recommendations: (0, mysql_core_1.text)("recommendations"), // JSON array
    // Predicted metrics
    predictedCtr: (0, mysql_core_1.decimal)("predicted_ctr", { precision: 5, scale: 2 }), // Click-through rate (%)
    predictedViews: (0, mysql_core_1.int)("predicted_views"), // Expected views boost
    createdAt: (0, mysql_core_1.timestamp)("created_at").notNull().defaultNow(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_thumbnail_analyses_user_id").on(table.userId),
    nicheIdx: (0, mysql_core_1.index)("idx_thumbnail_analyses_niche").on(table.niche),
    platformIdx: (0, mysql_core_1.index)("idx_thumbnail_analyses_platform").on(table.platform),
    overallScoreIdx: (0, mysql_core_1.index)("idx_thumbnail_analyses_overall_score").on(table.overallScore),
    createdAtIdx: (0, mysql_core_1.index)("idx_thumbnail_analyses_created_at").on(table.createdAt),
}); });
// VaultLive Streaming
__exportStar(require("./schema-vaultlive"), exports);
/**
 * Adult creator verification and compliance
 */
exports.adultVerification = (0, mysql_core_1.mysqlTable)("adult_verification", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    idDocumentUrl: (0, mysql_core_1.varchar)("id_document_url", { length: 500 }),
    verificationStatus: (0, mysql_core_1.mysqlEnum)("verification_status", ["pending", "approved", "rejected"]).default("pending"),
    verifiedAt: (0, mysql_core_1.timestamp)("verified_at"),
    ageVerified: (0, mysql_core_1.boolean)("age_verified").default(false),
    consentFormsSigned: (0, mysql_core_1.boolean)("consent_forms_signed").default(false),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    creatorIdIdx: (0, mysql_core_1.index)("idx_adult_verification_creator_id").on(table.creatorId),
    statusIdx: (0, mysql_core_1.index)("idx_adult_verification_status").on(table.verificationStatus),
}); });
/**
 * Content protection settings
 */
exports.contentProtection = (0, mysql_core_1.mysqlTable)("content_protection", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    contentId: (0, mysql_core_1.int)("content_id").notNull(),
    watermarkEnabled: (0, mysql_core_1.boolean)("watermark_enabled").default(true),
    screenshotPrevention: (0, mysql_core_1.boolean)("screenshot_prevention").default(true),
    geographicBlocks: (0, mysql_core_1.json)("geographic_blocks").$type(),
    allowedRegions: (0, mysql_core_1.json)("allowed_regions").$type(),
    dmcaMonitoring: (0, mysql_core_1.boolean)("dmca_monitoring").default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    contentIdIdx: (0, mysql_core_1.index)("idx_content_protection_content_id").on(table.contentId),
}); });
/**
 * Safety incident logging
 */
exports.safetyLogs = (0, mysql_core_1.mysqlTable)("safety_logs", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    incidentType: (0, mysql_core_1.mysqlEnum)("incident_type", ["harassment", "stalking", "leak", "threat"]).notNull(),
    reportedAt: (0, mysql_core_1.timestamp)("reported_at").defaultNow().notNull(),
    userBlockedId: (0, mysql_core_1.int)("user_blocked_id"),
    ipBlocked: (0, mysql_core_1.varchar)("ip_blocked", { length: 45 }),
    resolutionStatus: (0, mysql_core_1.mysqlEnum)("resolution_status", ["open", "investigating", "resolved"]).default("open"),
    notes: (0, mysql_core_1.text)("notes"),
    resolvedAt: (0, mysql_core_1.timestamp)("resolved_at"),
}, function (table) { return ({
    creatorIdIdx: (0, mysql_core_1.index)("idx_safety_logs_creator_id").on(table.creatorId),
    incidentTypeIdx: (0, mysql_core_1.index)("idx_safety_logs_incident_type").on(table.incidentType),
    statusIdx: (0, mysql_core_1.index)("idx_safety_logs_status").on(table.resolutionStatus),
}); });
/**
 * Custom content requests
 */
exports.customRequests = (0, mysql_core_1.mysqlTable)("custom_requests", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    requesterId: (0, mysql_core_1.int)("requester_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    requestDetails: (0, mysql_core_1.text)("request_details").notNull(),
    priceQuoted: (0, mysql_core_1.int)("price_quoted").notNull(), // in cents
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "accepted", "declined", "completed"]).default("pending"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    completedAt: (0, mysql_core_1.timestamp)("completed_at"),
}, function (table) { return ({
    creatorIdIdx: (0, mysql_core_1.index)("idx_custom_requests_creator_id").on(table.creatorId),
    requesterIdIdx: (0, mysql_core_1.index)("idx_custom_requests_requester_id").on(table.requesterId),
    statusIdx: (0, mysql_core_1.index)("idx_custom_requests_status").on(table.status),
}); });
/**
 * Emma Network hierarchy (regional ambassadors + recruiters)
 */
exports.emmaNetworkHierarchy = (0, mysql_core_1.mysqlTable)("emma_network_hierarchy", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    role: (0, mysql_core_1.mysqlEnum)("role", ["coordinator", "regional_ambassador", "recruiter"]).notNull(),
    region: (0, mysql_core_1.varchar)("region", { length: 100 }), // Sosúa, Santiago, Santo Domingo, Punta Cana
    parentId: (0, mysql_core_1.int)("parent_id"), // references another hierarchy entry
    recruitedCount: (0, mysql_core_1.int)("recruited_count").default(0),
    totalCommissionsEarned: (0, mysql_core_1.int)("total_commissions_earned").default(0), // in cents
    isActive: (0, mysql_core_1.boolean)("is_active").default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_emma_hierarchy_user_id").on(table.userId),
    roleIdx: (0, mysql_core_1.index)("idx_emma_hierarchy_role").on(table.role),
    regionIdx: (0, mysql_core_1.index)("idx_emma_hierarchy_region").on(table.region),
    parentIdIdx: (0, mysql_core_1.index)("idx_emma_hierarchy_parent_id").on(table.parentId),
}); });
/**
 * Recruiter commission tracking
 */
exports.recruiterCommissions = (0, mysql_core_1.mysqlTable)("recruiter_commissions", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    recruiterId: (0, mysql_core_1.int)("recruiter_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    transactionId: (0, mysql_core_1.int)("transaction_id").notNull(),
    commissionAmount: (0, mysql_core_1.int)("commission_amount").notNull(), // in cents
    commissionRate: (0, mysql_core_1.int)("commission_rate").notNull(), // percentage * 100 (e.g., 200 = 2%)
    paidOut: (0, mysql_core_1.boolean)("paid_out").default(false),
    paidAt: (0, mysql_core_1.timestamp)("paid_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    recruiterIdIdx: (0, mysql_core_1.index)("idx_recruiter_commissions_recruiter_id").on(table.recruiterId),
    creatorIdIdx: (0, mysql_core_1.index)("idx_recruiter_commissions_creator_id").on(table.creatorId),
    paidOutIdx: (0, mysql_core_1.index)("idx_recruiter_commissions_paid_out").on(table.paidOut),
}); });
/**
 * Bilingual content support
 */
exports.bilingualContent = (0, mysql_core_1.mysqlTable)("bilingual_content", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    contentId: (0, mysql_core_1.int)("content_id").notNull(),
    titleEs: (0, mysql_core_1.varchar)("title_es", { length: 200 }),
    titleEn: (0, mysql_core_1.varchar)("title_en", { length: 200 }),
    descriptionEs: (0, mysql_core_1.text)("description_es"),
    descriptionEn: (0, mysql_core_1.text)("description_en"),
    tagsEs: (0, mysql_core_1.json)("tags_es").$type(),
    tagsEn: (0, mysql_core_1.json)("tags_en").$type(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    contentIdIdx: (0, mysql_core_1.index)("idx_bilingual_content_content_id").on(table.contentId),
}); });
/**
 * Subscription tiers created by adult creators
 */
exports.subscriptionTiers = (0, mysql_core_1.mysqlTable)("subscription_tiers", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    name: (0, mysql_core_1.varchar)("name", { length: 100 }).notNull(), // "Basic", "VIP", "Premium"
    priceInCents: (0, mysql_core_1.int)("price_in_cents").notNull(),
    billingInterval: (0, mysql_core_1.mysqlEnum)("billing_interval", ["monthly", "yearly"]).default("monthly"),
    description: (0, mysql_core_1.text)("description"),
    isActive: (0, mysql_core_1.boolean)("is_active").default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    creatorIdIdx: (0, mysql_core_1.index)("idx_subscription_tiers_creator_id").on(table.creatorId),
    isActiveIdx: (0, mysql_core_1.index)("idx_subscription_tiers_is_active").on(table.isActive),
}); });
/**
 * Active subscriptions from fans to creators
 */
exports.subscriptions = (0, mysql_core_1.mysqlTable)("subscriptions", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    fanId: (0, mysql_core_1.int)("fan_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    tierId: (0, mysql_core_1.int)("tier_id").notNull().references(function () { return exports.subscriptionTiers.id; }, { onDelete: "cascade" }),
    stripeSubscriptionId: (0, mysql_core_1.varchar)("stripe_subscription_id", { length: 255 }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["active", "canceled", "past_due", "unpaid"]).default("active"),
    currentPeriodStart: (0, mysql_core_1.timestamp)("current_period_start"),
    currentPeriodEnd: (0, mysql_core_1.timestamp)("current_period_end"),
    canceledAt: (0, mysql_core_1.timestamp)("canceled_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    fanIdIdx: (0, mysql_core_1.index)("idx_subscriptions_fan_id").on(table.fanId),
    creatorIdIdx: (0, mysql_core_1.index)("idx_subscriptions_creator_id").on(table.creatorId),
    statusIdx: (0, mysql_core_1.index)("idx_subscriptions_status").on(table.status),
    stripeSubscriptionIdIdx: (0, mysql_core_1.index)("idx_subscriptions_stripe_subscription_id").on(table.stripeSubscriptionId),
}); });
/**
 * Creator balance tracking
 */
exports.creatorBalances = (0, mysql_core_1.mysqlTable)("creator_balances", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().unique().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    availableBalanceInCents: (0, mysql_core_1.int)("available_balance_in_cents").default(0).notNull(),
    pendingBalanceInCents: (0, mysql_core_1.int)("pending_balance_in_cents").default(0).notNull(),
    lifetimeEarningsInCents: (0, mysql_core_1.int)("lifetime_earnings_in_cents").default(0).notNull(),
    lastPayoutAt: (0, mysql_core_1.timestamp)("last_payout_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    creatorIdIdx: (0, mysql_core_1.index)("idx_creator_balances_creator_id").on(table.creatorId),
}); });
/**
 * Transaction ledger for all payments
 */
exports.transactions = (0, mysql_core_1.mysqlTable)("transactions", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    subscriptionId: (0, mysql_core_1.int)("subscription_id").references(function () { return exports.subscriptions.id; }, { onDelete: "set null" }),
    fanId: (0, mysql_core_1.int)("fan_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    amountInCents: (0, mysql_core_1.int)("amount_in_cents").notNull(),
    creatorShareInCents: (0, mysql_core_1.int)("creator_share_in_cents").notNull(), // 70%
    platformShareInCents: (0, mysql_core_1.int)("platform_share_in_cents").notNull(), // 30%
    stripePaymentIntentId: (0, mysql_core_1.varchar)("stripe_payment_intent_id", { length: 255 }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "completed", "failed", "refunded"]).default("pending"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    fanIdIdx: (0, mysql_core_1.index)("idx_transactions_fan_id").on(table.fanId),
    creatorIdIdx: (0, mysql_core_1.index)("idx_transactions_creator_id").on(table.creatorId),
    subscriptionIdIdx: (0, mysql_core_1.index)("idx_transactions_subscription_id").on(table.subscriptionId),
    statusIdx: (0, mysql_core_1.index)("idx_transactions_status").on(table.status),
}); });
// ============================================
// CONTENT ORCHESTRATOR TABLES
// ============================================
// ============================================
// CONTENT ORCHESTRATOR TABLES
// ============================================
exports.unifiedContent = (0, mysql_core_1.mysqlTable)("unified_content", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    title: (0, mysql_core_1.varchar)("title", { length: 500 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    body: (0, mysql_core_1.text)("body"),
    mediaUrl: (0, mysql_core_1.varchar)("media_url", { length: 500 }),
    mediaType: (0, mysql_core_1.mysqlEnum)("media_type", ["image", "video", "audio", "text"]),
    tags: (0, mysql_core_1.json)("tags").$type(),
    category: (0, mysql_core_1.varchar)("category", { length: 100 }),
    niche: (0, mysql_core_1.varchar)("niche", { length: 100 }),
    duration: (0, mysql_core_1.int)("duration"),
    targetPlatforms: (0, mysql_core_1.json)("target_platforms").$type().notNull(),
    publishStrategy: (0, mysql_core_1.mysqlEnum)("publish_strategy", ["immediate", "scheduled", "draft"]).notNull(),
    scheduledFor: (0, mysql_core_1.timestamp)("scheduled_for"),
    timezone: (0, mysql_core_1.varchar)("timezone", { length: 50 }),
    optimizationLevel: (0, mysql_core_1.mysqlEnum)("optimization_level", ["none", "basic", "aggressive"]).default("basic"),
    generateThumbnail: (0, mysql_core_1.boolean)("generate_thumbnail").default(false),
    generateAd: (0, mysql_core_1.boolean)("generate_ad").default(false),
    runViralAnalysis: (0, mysql_core_1.boolean)("run_viral_analysis").default(true),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.orchestrationRuns = (0, mysql_core_1.mysqlTable)("orchestration_runs", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey(),
    contentId: (0, mysql_core_1.varchar)("content_id", { length: 36 }).notNull().references(function () { return exports.unifiedContent.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "optimizing", "ready", "scheduled", "publishing", "published", "failed"]).notNull(),
    viralAnalysisId: (0, mysql_core_1.varchar)("viral_analysis_id", { length: 36 }),
    thumbnailAnalysisId: (0, mysql_core_1.varchar)("thumbnail_analysis_id", { length: 36 }),
    adAnalysisId: (0, mysql_core_1.varchar)("ad_analysis_id", { length: 36 }),
    generatedAssets: (0, mysql_core_1.json)("generated_assets").$type(),
    platformResults: (0, mysql_core_1.json)("platform_results").$type(),
    errorLog: (0, mysql_core_1.text)("error_log"),
    startedAt: (0, mysql_core_1.timestamp)("started_at").defaultNow(),
    completedAt: (0, mysql_core_1.timestamp)("completed_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
exports.platformAdaptations = (0, mysql_core_1.mysqlTable)("platform_adaptations", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    orchestrationId: (0, mysql_core_1.varchar)("orchestration_id", { length: 36 }).notNull().references(function () { return exports.orchestrationRuns.id; }, { onDelete: "cascade" }),
    platform: (0, mysql_core_1.varchar)("platform", { length: 50 }).notNull(),
    adaptedTitle: (0, mysql_core_1.varchar)("adapted_title", { length: 500 }),
    adaptedDescription: (0, mysql_core_1.text)("adapted_description"),
    adaptedMediaUrl: (0, mysql_core_1.varchar)("adapted_media_url", { length: 500 }),
    platformSpecificData: (0, mysql_core_1.json)("platform_specific_data"),
    publishedUrl: (0, mysql_core_1.varchar)("published_url", { length: 500 }),
    publishedAt: (0, mysql_core_1.timestamp)("published_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
exports.optimizationHistory = (0, mysql_core_1.mysqlTable)("optimization_history", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    contentId: (0, mysql_core_1.varchar)("content_id", { length: 36 }).references(function () { return exports.unifiedContent.id; }, { onDelete: "cascade" }),
    optimizationType: (0, mysql_core_1.varchar)("optimization_type", { length: 50 }).notNull(),
    inputData: (0, mysql_core_1.json)("input_data").notNull(),
    outputData: (0, mysql_core_1.json)("output_data").notNull(),
    score: (0, mysql_core_1.int)("score"),
    appliedRecommendations: (0, mysql_core_1.json)("applied_recommendations").$type(),
    performanceImpact: (0, mysql_core_1.json)("performance_impact"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
exports.contentPerformance = (0, mysql_core_1.mysqlTable)("content_performance", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    contentId: (0, mysql_core_1.varchar)("content_id", { length: 36 }).notNull().references(function () { return exports.unifiedContent.id; }, { onDelete: "cascade" }),
    platform: (0, mysql_core_1.varchar)("platform", { length: 50 }).notNull(),
    views: (0, mysql_core_1.int)("views").default(0),
    likes: (0, mysql_core_1.int)("likes").default(0),
    comments: (0, mysql_core_1.int)("comments").default(0),
    shares: (0, mysql_core_1.int)("shares").default(0),
    clicks: (0, mysql_core_1.int)("clicks").default(0),
    ctr: (0, mysql_core_1.decimal)("ctr", { precision: 5, scale: 2 }),
    engagement: (0, mysql_core_1.decimal)("engagement", { precision: 5, scale: 2 }),
    retention: (0, mysql_core_1.decimal)("retention", { precision: 5, scale: 2 }),
    revenue: (0, mysql_core_1.int)("revenue").default(0),
    recordedAt: (0, mysql_core_1.timestamp)("recorded_at").defaultNow(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
});
exports.adCampaigns = (0, mysql_core_1.mysqlTable)("ad_campaigns", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey(),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    name: (0, mysql_core_1.varchar)("name", { length: 200 }).notNull(),
    platform: (0, mysql_core_1.mysqlEnum)("platform", ["facebook", "instagram", "google", "tiktok", "twitter"]).notNull(),
    objective: (0, mysql_core_1.varchar)("objective", { length: 100 }),
    budget: (0, mysql_core_1.int)("budget"),
    targetAudience: (0, mysql_core_1.json)("target_audience"),
    adCreativeUrl: (0, mysql_core_1.varchar)("ad_creative_url", { length: 500 }),
    adCopy: (0, mysql_core_1.text)("ad_copy"),
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "active", "paused", "completed"]).default("draft"),
    impressions: (0, mysql_core_1.int)("impressions").default(0),
    clicks: (0, mysql_core_1.int)("clicks").default(0),
    conversions: (0, mysql_core_1.int)("conversions").default(0),
    spend: (0, mysql_core_1.int)("spend").default(0),
    ctr: (0, mysql_core_1.decimal)("ctr", { precision: 5, scale: 2 }),
    cpc: (0, mysql_core_1.int)("cpc"),
    roas: (0, mysql_core_1.decimal)("roas", { precision: 5, scale: 2 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
// Payout Requests
exports.payoutRequests = (0, mysql_core_1.mysqlTable)("payout_requests", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    creatorId: (0, mysql_core_1.int)("creator_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    amountInCents: (0, mysql_core_1.int)("amount_in_cents").notNull(),
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "processing", "completed", "rejected"]).notNull().default("pending"),
    paymentMethod: (0, mysql_core_1.varchar)("payment_method", { length: 50 }), // cashapp, zelle, bank_transfer, etc
    paymentDetails: (0, mysql_core_1.text)("payment_details"), // JSON with payment info
    requestedAt: (0, mysql_core_1.timestamp)("requested_at").defaultNow(),
    processedAt: (0, mysql_core_1.timestamp)("processed_at"),
    notes: (0, mysql_core_1.text)("notes"),
});
/**
 * Creator audits for social media monetization analysis
 */
exports.creatorAudits = (0, mysql_core_1.mysqlTable)("creator_audits", {
    id: (0, mysql_core_1.int)("id").autoincrement().primaryKey(),
    userId: (0, mysql_core_1.varchar)("user_id", { length: 64 }).notNull(),
    platforms: (0, mysql_core_1.json)("platforms").notNull(), // Array of SocialMediaProfile
    monetizationPotential: (0, mysql_core_1.int)("monetization_potential").notNull(),
    strengths: (0, mysql_core_1.json)("strengths").notNull(), // Array of strings
    revenueOpportunities: (0, mysql_core_1.json)("revenue_opportunities").notNull(), // Array of strings
    roadmapWeek1: (0, mysql_core_1.json)("roadmap_week1").notNull(),
    roadmapWeek2: (0, mysql_core_1.json)("roadmap_week2").notNull(),
    roadmapWeek3: (0, mysql_core_1.json)("roadmap_week3").notNull(),
    roadmapWeek4: (0, mysql_core_1.json)("roadmap_week4").notNull(),
    firstThousandPlan: (0, mysql_core_1.text)("first_thousand_plan").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_creator_audits_user_id").on(table.userId),
}); });
/**
 * ============================================================
 * CREATORVAULT GAMING (CVG) - LOSO DIVISION
 * Gaming tournaments, player management, Loso Playbook AI, Anmar Legacy
 * 100% of Loso-related revenue flows to Godmother (hardcoded)
 * ============================================================
 */
/**
 * Gaming Tournaments
 */
exports.gamingTournaments = (0, mysql_core_1.mysqlTable)("gaming_tournaments", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    // Tournament details
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    game: (0, mysql_core_1.mysqlEnum)("game", ["madden", "nba2k", "other"]).notNull(),
    gameVersion: (0, mysql_core_1.varchar)("game_version", { length: 50 }), // e.g., "Madden 25", "NBA 2K25"
    // Tournament type
    format: (0, mysql_core_1.mysqlEnum)("format", ["single-elimination", "double-elimination", "round-robin", "swiss"]).default("single-elimination").notNull(),
    teamSize: (0, mysql_core_1.int)("team_size").default(1).notNull(), // 1 for 1v1, 2 for 2v2, etc.
    // Location and timing
    location: (0, mysql_core_1.mysqlEnum)("location", ["dr", "usa", "online"]).notNull(),
    startDate: (0, mysql_core_1.timestamp)("start_date").notNull(),
    endDate: (0, mysql_core_1.timestamp)("end_date"),
    registrationDeadline: (0, mysql_core_1.timestamp)("registration_deadline").notNull(),
    // Prize and revenue
    prizePool: (0, mysql_core_1.int)("prize_pool").default(0).notNull(), // in cents
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD").notNull(),
    entryFee: (0, mysql_core_1.int)("entry_fee").default(0).notNull(), // in cents
    // Loso Division flag - 100% revenue to Godmother
    isLosoDivision: (0, mysql_core_1.boolean)("is_loso_division").default(false).notNull(),
    godmotherUserId: (0, mysql_core_1.int)("godmother_user_id").references(function () { return exports.users.id; }, { onDelete: "restrict" }),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["draft", "open", "in-progress", "completed", "cancelled"]).default("draft").notNull(),
    // Metadata
    rules: (0, mysql_core_1.text)("rules"),
    streamUrl: (0, mysql_core_1.varchar)("stream_url", { length: 500 }),
    bracketJson: (0, mysql_core_1.json)("bracket_json").$type(),
    // Organizer
    organizerId: (0, mysql_core_1.int)("organizer_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    gameIdx: (0, mysql_core_1.index)("idx_gaming_tournaments_game").on(table.game),
    statusIdx: (0, mysql_core_1.index)("idx_gaming_tournaments_status").on(table.status),
    locationIdx: (0, mysql_core_1.index)("idx_gaming_tournaments_location").on(table.location),
    isLosoDivisionIdx: (0, mysql_core_1.index)("idx_gaming_tournaments_is_loso_division").on(table.isLosoDivision),
    startDateIdx: (0, mysql_core_1.index)("idx_gaming_tournaments_start_date").on(table.startDate),
}); });
/**
 * Gaming Players (Tournament Registrations)
 */
exports.gamingPlayers = (0, mysql_core_1.mysqlTable)("gaming_players", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    tournamentId: (0, mysql_core_1.varchar)("tournament_id", { length: 36 }).notNull().references(function () { return exports.gamingTournaments.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Player info
    gamerTag: (0, mysql_core_1.varchar)("gamer_tag", { length: 100 }).notNull(),
    teamName: (0, mysql_core_1.varchar)("team_name", { length: 100 }),
    // Registration
    registeredAt: (0, mysql_core_1.timestamp)("registered_at").defaultNow().notNull(),
    paymentStatus: (0, mysql_core_1.mysqlEnum)("payment_status", ["pending", "paid", "refunded"]).default("pending").notNull(),
    paymentAmount: (0, mysql_core_1.int)("payment_amount").default(0).notNull(), // in cents
    // Performance
    seed: (0, mysql_core_1.int)("seed"), // Tournament seeding
    currentRound: (0, mysql_core_1.int)("current_round").default(0),
    wins: (0, mysql_core_1.int)("wins").default(0).notNull(),
    losses: (0, mysql_core_1.int)("losses").default(0).notNull(),
    placement: (0, mysql_core_1.int)("placement"), // Final placement (1st, 2nd, 3rd, etc.)
    prizeWon: (0, mysql_core_1.int)("prize_won").default(0).notNull(), // in cents
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["registered", "checked-in", "active", "eliminated", "disqualified", "withdrew"]).default("registered").notNull(),
    // Metadata
    notes: (0, mysql_core_1.text)("notes"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    tournamentIdIdx: (0, mysql_core_1.index)("idx_gaming_players_tournament_id").on(table.tournamentId),
    userIdIdx: (0, mysql_core_1.index)("idx_gaming_players_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_gaming_players_status").on(table.status),
    paymentStatusIdx: (0, mysql_core_1.index)("idx_gaming_players_payment_status").on(table.paymentStatus),
}); });
/**
 * Gaming Matches
 */
exports.gamingMatches = (0, mysql_core_1.mysqlTable)("gaming_matches", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    tournamentId: (0, mysql_core_1.varchar)("tournament_id", { length: 36 }).notNull().references(function () { return exports.gamingTournaments.id; }, { onDelete: "cascade" }),
    // Match details
    round: (0, mysql_core_1.int)("round").notNull(), // 1 = Round 1, 2 = Round 2, etc.
    matchNumber: (0, mysql_core_1.int)("match_number").notNull(), // Match number within round
    // Players
    player1Id: (0, mysql_core_1.varchar)("player1_id", { length: 36 }).references(function () { return exports.gamingPlayers.id; }, { onDelete: "set null" }),
    player2Id: (0, mysql_core_1.varchar)("player2_id", { length: 36 }).references(function () { return exports.gamingPlayers.id; }, { onDelete: "set null" }),
    // Scores
    player1Score: (0, mysql_core_1.int)("player1_score").default(0),
    player2Score: (0, mysql_core_1.int)("player2_score").default(0),
    winnerId: (0, mysql_core_1.varchar)("winner_id", { length: 36 }).references(function () { return exports.gamingPlayers.id; }, { onDelete: "set null" }),
    // Timing
    scheduledAt: (0, mysql_core_1.timestamp)("scheduled_at"),
    startedAt: (0, mysql_core_1.timestamp)("started_at"),
    completedAt: (0, mysql_core_1.timestamp)("completed_at"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["scheduled", "in-progress", "completed", "disputed", "cancelled"]).default("scheduled").notNull(),
    // Stream and replay
    streamUrl: (0, mysql_core_1.varchar)("stream_url", { length: 500 }),
    replayUrl: (0, mysql_core_1.varchar)("replay_url", { length: 500 }),
    // Notes
    notes: (0, mysql_core_1.text)("notes"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    tournamentIdIdx: (0, mysql_core_1.index)("idx_gaming_matches_tournament_id").on(table.tournamentId),
    statusIdx: (0, mysql_core_1.index)("idx_gaming_matches_status").on(table.status),
    scheduledAtIdx: (0, mysql_core_1.index)("idx_gaming_matches_scheduled_at").on(table.scheduledAt),
}); });
/**
 * Gaming Teams (for team-based tournaments)
 */
exports.gamingTeams = (0, mysql_core_1.mysqlTable)("gaming_teams", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    tournamentId: (0, mysql_core_1.varchar)("tournament_id", { length: 36 }).notNull().references(function () { return exports.gamingTournaments.id; }, { onDelete: "cascade" }),
    // Team details
    name: (0, mysql_core_1.varchar)("name", { length: 100 }).notNull(),
    tag: (0, mysql_core_1.varchar)("tag", { length: 20 }), // Team tag/abbreviation
    captainUserId: (0, mysql_core_1.int)("captain_user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Members (stored as JSON array of user IDs)
    memberIds: (0, mysql_core_1.json)("member_ids").$type().notNull(),
    // Performance
    wins: (0, mysql_core_1.int)("wins").default(0).notNull(),
    losses: (0, mysql_core_1.int)("losses").default(0).notNull(),
    placement: (0, mysql_core_1.int)("placement"),
    prizeWon: (0, mysql_core_1.int)("prize_won").default(0).notNull(), // in cents
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["registered", "active", "eliminated", "disqualified"]).default("registered").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    tournamentIdIdx: (0, mysql_core_1.index)("idx_gaming_teams_tournament_id").on(table.tournamentId),
    captainUserIdIdx: (0, mysql_core_1.index)("idx_gaming_teams_captain_user_id").on(table.captainUserId),
    statusIdx: (0, mysql_core_1.index)("idx_gaming_teams_status").on(table.status),
}); });
/**
 * Loso Revenue Tracking - 100% to Godmother
 */
exports.losoRevenueTracking = (0, mysql_core_1.mysqlTable)("loso_revenue_tracking", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    // Source
    tournamentId: (0, mysql_core_1.varchar)("tournament_id", { length: 36 }).references(function () { return exports.gamingTournaments.id; }, { onDelete: "set null" }),
    sourceType: (0, mysql_core_1.mysqlEnum)("source_type", ["tournament-entry", "tournament-prize", "merchandise", "sponsorship", "other"]).notNull(),
    description: (0, mysql_core_1.text)("description"),
    // Amount
    amount: (0, mysql_core_1.int)("amount").notNull(), // in cents
    currency: (0, mysql_core_1.varchar)("currency", { length: 3 }).default("USD").notNull(),
    // Godmother allocation (ALWAYS 100%)
    godmotherUserId: (0, mysql_core_1.int)("godmother_user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "restrict" }),
    allocationPercentage: (0, mysql_core_1.int)("allocation_percentage").default(100).notNull(), // HARDCODED 100%
    godmotherAmount: (0, mysql_core_1.int)("godmother_amount").notNull(), // Should equal amount
    // Payment status
    paymentStatus: (0, mysql_core_1.mysqlEnum)("payment_status", ["pending", "paid", "failed"]).default("pending").notNull(),
    paidAt: (0, mysql_core_1.timestamp)("paid_at"),
    paymentMethod: (0, mysql_core_1.varchar)("payment_method", { length: 50 }),
    paymentReference: (0, mysql_core_1.varchar)("payment_reference", { length: 255 }),
    // Metadata
    notes: (0, mysql_core_1.text)("notes"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    tournamentIdIdx: (0, mysql_core_1.index)("idx_loso_revenue_tracking_tournament_id").on(table.tournamentId),
    godmotherUserIdIdx: (0, mysql_core_1.index)("idx_loso_revenue_tracking_godmother_user_id").on(table.godmotherUserId),
    paymentStatusIdx: (0, mysql_core_1.index)("idx_loso_revenue_tracking_payment_status").on(table.paymentStatus),
    sourceTypeIdx: (0, mysql_core_1.index)("idx_loso_revenue_tracking_source_type").on(table.sourceType),
}); });
/**
 * Anmar Legacy Content
 * Honoring Carlos Anmar Maxie (1995) and Carlos Anmar Thompson (Loso)
 */
exports.anmarLegacyContent = (0, mysql_core_1.mysqlTable)("anmar_legacy_content", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    // Content details
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    contentType: (0, mysql_core_1.mysqlEnum)("content_type", ["story", "photo", "video", "documentary", "article", "tribute"]).notNull(),
    // Legacy person
    legacyPerson: (0, mysql_core_1.mysqlEnum)("legacy_person", ["carlos-anmar-maxie", "carlos-anmar-thompson-loso", "both"]).notNull(),
    // Content
    contentUrl: (0, mysql_core_1.varchar)("content_url", { length: 500 }),
    thumbnailUrl: (0, mysql_core_1.varchar)("thumbnail_url", { length: 500 }),
    bodyText: (0, mysql_core_1.text)("body_text"),
    // Metadata
    year: (0, mysql_core_1.int)("year"), // Year of event/content
    location: (0, mysql_core_1.varchar)("location", { length: 255 }), // e.g., "Webb Chapel", "Dallas", "DR"
    tags: (0, mysql_core_1.json)("tags").$type(),
    // Visibility
    isPublic: (0, mysql_core_1.boolean)("is_public").default(true).notNull(),
    isFeatured: (0, mysql_core_1.boolean)("is_featured").default(false).notNull(),
    // Author
    authorId: (0, mysql_core_1.int)("author_id").references(function () { return exports.users.id; }, { onDelete: "set null" }),
    // Engagement
    views: (0, mysql_core_1.int)("views").default(0).notNull(),
    likes: (0, mysql_core_1.int)("likes").default(0).notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    legacyPersonIdx: (0, mysql_core_1.index)("idx_anmar_legacy_content_legacy_person").on(table.legacyPerson),
    contentTypeIdx: (0, mysql_core_1.index)("idx_anmar_legacy_content_content_type").on(table.contentType),
    isPublicIdx: (0, mysql_core_1.index)("idx_anmar_legacy_content_is_public").on(table.isPublic),
    isFeaturedIdx: (0, mysql_core_1.index)("idx_anmar_legacy_content_is_featured").on(table.isFeatured),
}); });
/**
 * Loso Playbook AI - Madden/2K Strategy Generator
 */
exports.losoPlaybooks = (0, mysql_core_1.mysqlTable)("loso_playbooks", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Game details
    game: (0, mysql_core_1.mysqlEnum)("game", ["madden", "nba2k"]).notNull(),
    gameVersion: (0, mysql_core_1.varchar)("game_version", { length: 50 }).notNull(),
    // Playbook details
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    // Strategy
    offensiveScheme: (0, mysql_core_1.varchar)("offensive_scheme", { length: 100 }),
    defensiveScheme: (0, mysql_core_1.varchar)("defensive_scheme", { length: 100 }),
    keyPlays: (0, mysql_core_1.json)("key_plays").$type(),
    counters: (0, mysql_core_1.json)("counters").$type(),
    // AI-generated content
    aiGeneratedStrategy: (0, mysql_core_1.text)("ai_generated_strategy"),
    strengthsWeaknesses: (0, mysql_core_1.json)("strengths_weaknesses").$type(),
    // Usage
    isPublic: (0, mysql_core_1.boolean)("is_public").default(false).notNull(),
    downloads: (0, mysql_core_1.int)("downloads").default(0).notNull(),
    rating: (0, mysql_core_1.int)("rating").default(0).notNull(), // 0-5 stars * 100 (e.g., 450 = 4.5 stars)
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_loso_playbooks_user_id").on(table.userId),
    gameIdx: (0, mysql_core_1.index)("idx_loso_playbooks_game").on(table.game),
    isPublicIdx: (0, mysql_core_1.index)("idx_loso_playbooks_is_public").on(table.isPublic),
}); });
/**
 * Youth King Programs - Anmar Cup and community programs
 */
exports.youthKingPrograms = (0, mysql_core_1.mysqlTable)("youth_king_programs", {
    id: (0, mysql_core_1.varchar)("id", { length: 36 }).primaryKey().$defaultFn(function () { return crypto.randomUUID(); }),
    // Program details
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    programType: (0, mysql_core_1.mysqlEnum)("program_type", ["anmar-cup", "youth-tournament", "mentorship", "scholarship", "community-event"]).notNull(),
    // Location and timing
    location: (0, mysql_core_1.varchar)("location", { length: 255 }),
    startDate: (0, mysql_core_1.timestamp)("start_date"),
    endDate: (0, mysql_core_1.timestamp)("end_date"),
    // Participants
    targetAgeMin: (0, mysql_core_1.int)("target_age_min"),
    targetAgeMax: (0, mysql_core_1.int)("target_age_max"),
    maxParticipants: (0, mysql_core_1.int)("max_participants"),
    currentParticipants: (0, mysql_core_1.int)("current_participants").default(0).notNull(),
    // Registration
    registrationOpen: (0, mysql_core_1.boolean)("registration_open").default(true).notNull(),
    registrationDeadline: (0, mysql_core_1.timestamp)("registration_deadline"),
    registrationFee: (0, mysql_core_1.int)("registration_fee").default(0).notNull(), // in cents
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["planning", "open", "in-progress", "completed", "cancelled"]).default("planning").notNull(),
    // Organizer
    organizerId: (0, mysql_core_1.int)("organizer_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Metadata
    imageUrl: (0, mysql_core_1.varchar)("image_url", { length: 500 }),
    websiteUrl: (0, mysql_core_1.varchar)("website_url", { length: 500 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow().notNull(),
}, function (table) { return ({
    programTypeIdx: (0, mysql_core_1.index)("idx_youth_king_programs_program_type").on(table.programType),
    statusIdx: (0, mysql_core_1.index)("idx_youth_king_programs_status").on(table.status),
    registrationOpenIdx: (0, mysql_core_1.index)("idx_youth_king_programs_registration_open").on(table.registrationOpen),
}); });
// ============================================================================
// VAULTLIVE - Live Streaming System
// ============================================================================
/**
 * Live Streams - Creator live streaming sessions
 */
exports.liveStreams = (0, mysql_core_1.mysqlTable)("live_streams", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    // Creator
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Stream details
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    description: (0, mysql_core_1.text)("description"),
    thumbnailUrl: (0, mysql_core_1.varchar)("thumbnail_url", { length: 500 }),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "live", "ended"]).default("pending").notNull(),
    // Metrics
    viewerCount: (0, mysql_core_1.int)("viewer_count").default(0).notNull(),
    peakViewerCount: (0, mysql_core_1.int)("peak_viewer_count").default(0).notNull(),
    totalTips: (0, mysql_core_1.decimal)("total_tips", { precision: 10, scale: 2 }).default("0.00").notNull(),
    // Timestamps
    startedAt: (0, mysql_core_1.timestamp)("started_at"),
    endedAt: (0, mysql_core_1.timestamp)("ended_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
}, function (table) { return ({
    userIdIdx: (0, mysql_core_1.index)("idx_live_streams_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_live_streams_status").on(table.status),
    createdAtIdx: (0, mysql_core_1.index)("idx_live_streams_created_at").on(table.createdAt),
}); });
/**
 * Live Stream Viewers - Track who is watching
 */
exports.liveStreamViewers = (0, mysql_core_1.mysqlTable)("live_stream_viewers", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    // Stream and viewer
    streamId: (0, mysql_core_1.int)("stream_id").notNull().references(function () { return exports.liveStreams.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").references(function () { return exports.users.id; }, { onDelete: "set null" }),
    // Session tracking
    joinedAt: (0, mysql_core_1.timestamp)("joined_at").defaultNow().notNull(),
    leftAt: (0, mysql_core_1.timestamp)("left_at"),
    watchDuration: (0, mysql_core_1.int)("watch_duration").default(0).notNull(), // in seconds
}, function (table) { return ({
    streamIdIdx: (0, mysql_core_1.index)("idx_live_stream_viewers_stream_id").on(table.streamId),
    userIdIdx: (0, mysql_core_1.index)("idx_live_stream_viewers_user_id").on(table.userId),
}); });
/**
 * Live Stream Tips - Manual tips with 85/15 split
 */
exports.liveStreamTips = (0, mysql_core_1.mysqlTable)("live_stream_tips", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    // Stream and users
    streamId: (0, mysql_core_1.int)("stream_id").notNull().references(function () { return exports.liveStreams.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Tip details
    amount: (0, mysql_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(), // in dollars
    creatorShare: (0, mysql_core_1.decimal)("creator_share", { precision: 10, scale: 2 }).notNull(), // 85%
    platformShare: (0, mysql_core_1.decimal)("platform_share", { precision: 10, scale: 2 }).notNull(), // 15%
    message: (0, mysql_core_1.text)("message"),
    // Status
    status: (0, mysql_core_1.mysqlEnum)("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
    // Timestamps
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    confirmedAt: (0, mysql_core_1.timestamp)("confirmed_at"),
}, function (table) { return ({
    streamIdIdx: (0, mysql_core_1.index)("idx_live_stream_tips_stream_id").on(table.streamId),
    userIdIdx: (0, mysql_core_1.index)("idx_live_stream_tips_user_id").on(table.userId),
    statusIdx: (0, mysql_core_1.index)("idx_live_stream_tips_status").on(table.status),
}); });
/**
 * Live Stream Donations - Payment-based donations
 */
exports.liveStreamDonations = (0, mysql_core_1.mysqlTable)("live_stream_donations", {
    id: (0, mysql_core_1.int)("id").primaryKey().autoincrement(),
    // Stream and users
    streamId: (0, mysql_core_1.int)("stream_id").notNull().references(function () { return exports.liveStreams.id; }, { onDelete: "cascade" }),
    userId: (0, mysql_core_1.int)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    // Donation details
    amount: (0, mysql_core_1.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
    creatorShare: (0, mysql_core_1.decimal)("creator_share", { precision: 10, scale: 2 }).notNull(), // 85%
    platformShare: (0, mysql_core_1.decimal)("platform_share", { precision: 10, scale: 2 }).notNull(), // 15%
    paymentMethod: (0, mysql_core_1.varchar)("payment_method", { length: 50 }).notNull(),
    message: (0, mysql_core_1.text)("message"),
    // Payment status
    paymentStatus: (0, mysql_core_1.mysqlEnum)("payment_status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
    stripePaymentIntentId: (0, mysql_core_1.varchar)("stripe_payment_intent_id", { length: 255 }),
    // Timestamps
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow().notNull(),
    completedAt: (0, mysql_core_1.timestamp)("completed_at"),
}, function (table) { return ({
    streamIdIdx: (0, mysql_core_1.index)("idx_live_stream_donations_stream_id").on(table.streamId),
    userIdIdx: (0, mysql_core_1.index)("idx_live_stream_donations_user_id").on(table.userId),
    paymentStatusIdx: (0, mysql_core_1.index)("idx_live_stream_donations_payment_status").on(table.paymentStatus),
}); });
