import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table with CreatorVault extensions
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "creator", "influencer", "celebrity", "admin", "king"]).default("user").notNull(),
  
  // Emma network & cultural intelligence fields
  language: varchar("language", { length: 10 }).default("en"),
  country: varchar("country", { length: 2 }),
  referredBy: int("referred_by"),
  creatorStatus: varchar("creator_status", { length: 20 }).default("pending"),
  contentType: json("content_type").$type<string[]>(),
  primaryBrand: varchar("primary_brand", { length: 50 }).default("CREATORVAULT"),
  
  // Payment methods for manual payment flow
  cashappHandle: varchar("cashapp_handle", { length: 100 }),
  paypalEmail: varchar("paypal_email", { length: 320 }),
  zelleHandle: varchar("zelle_handle", { length: 100 }),
  applepayHandle: varchar("applepay_handle", { length: 100 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  countryIdx: index("idx_users_country").on(table.country),
  referredByIdx: index("idx_users_referred_by").on(table.referredBy),
  creatorStatusIdx: index("idx_users_creator_status").on(table.creatorStatus),
  languageIdx: index("idx_users_language").on(table.language),
}));

/**
 * Emma network tracking for detailed creator recruitment
 */
export const emmaNetwork = mysqlTable("emma_network", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Social profiles
  tinderProfile: varchar("tinder_profile", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }),
  tiktok: varchar("tiktok", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 255 }),
  
  // Recruitment tracking
  contactDate: timestamp("contact_date"),
  firstResponse: timestamp("first_response"),
  onboardedDate: timestamp("onboarded_date"),
  
  // Content details
  city: varchar("city", { length: 100 }),
  contentTags: json("content_tags").$type<string[]>(),
  
  // Engagement metrics
  messagesSent: int("messages_sent").default(0),
  messagesReceived: int("messages_received").default(0),
  lastContact: timestamp("last_contact"),
  
  // Commission tracking
  totalEarned: int("total_earned").default(0),
  lastPayout: timestamp("last_payout"),
  
  // Notes and metadata
  notes: text("notes"),
  metadata: json("metadata"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_emma_network_user_id").on(table.userId),
  cityIdx: index("idx_emma_network_city").on(table.city),
  instagramIdx: index("idx_emma_network_instagram").on(table.instagram),
}));

/**
 * Brand affiliations for multi-brand support
 */
export const brandAffiliations = mysqlTable("brand_affiliations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  brandId: varchar("brand_id", { length: 50 }).notNull(),
  isPrimary: boolean("is_primary").default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_brand_affiliations_user_id").on(table.userId),
  brandIdIdx: index("idx_brand_affiliations_brand_id").on(table.brandId),
}));

/**
 * Cultural content templates for localized messaging
 */
export const culturalContentTemplates = mysqlTable("cultural_content_templates", {
  id: int("id").autoincrement().primaryKey(),
  culture: varchar("culture", { length: 2 }).notNull(), // DR, HT, US
  contentType: varchar("content_type", { length: 50 }).notNull(),
  templateText: text("template_text").notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  useCount: int("use_count").default(0),
  effectivenessScore: decimal("effectiveness_score", { precision: 3, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  cultureIdx: index("idx_cultural_templates_culture").on(table.culture),
  typeIdx: index("idx_cultural_templates_type").on(table.contentType),
}));

/**
 * Waitlist signups
 */
export const waitlist = mysqlTable("waitlist", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  phone: varchar("phone", { length: 20 }),
  country: varchar("country", { length: 2 }),
  language: varchar("language", { length: 10 }).default("en"),
  referralSource: varchar("referral_source", { length: 100 }),
  interestedIn: json("interested_in").$type<string[]>(),
  status: varchar("status", { length: 20 }).default("pending"),
  invitedAt: timestamp("invited_at"),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("idx_waitlist_email").on(table.email),
  statusIdx: index("idx_waitlist_status").on(table.status),
}));

/**
 * Content uploads
 */
export const content = mysqlTable("content", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileKey: varchar("file_key", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: int("file_size"),
  contentType: varchar("content_type", { length: 50 }),
  status: varchar("status", { length: 20 }).default("pending"),
  views: int("views").default(0),
  earnings: int("earnings").default(0),
  priceCents: int("price_cents").default(0).notNull(),
  isLocked: boolean("is_locked").default(false).notNull(),
  thumbnailUrl: text("thumbnail_url"),
  unlockType: mysqlEnum("unlock_type", ["free","subscription","ppv"]).default("free").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_content_user_id").on(table.userId),
  statusIdx: index("idx_content_status").on(table.status),
  createdAtIdx: index("idx_content_created_at").on(table.createdAt),
}));

/**
 * Stripe payments and transactions
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripePaymentId: varchar("stripe_payment_id", { length: 255 }).unique(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("usd"),
  status: varchar("status", { length: 20 }).notNull(),
  paymentType: varchar("payment_type", { length: 50 }),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_payments_user_id").on(table.userId),
  stripeIdIdx: index("idx_payments_stripe_id").on(table.stripePaymentId),
  statusIdx: index("idx_payments_status").on(table.status),
}));

/**
 * Video generation jobs
 */
export const videoGenerationJobs = mysqlTable("video_generation_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Input
  prompt: text("prompt").notNull(),
  baseImageUrl: text("base_image_url"),
  referenceAssets: json("reference_assets").$type<string[]>(),
  
  // Scene plan
  scenePlan: json("scene_plan").$type<{ sceneIndex: number; description: string; prompt: string }[]>(),
  characterFeatures: json("character_features").$type<{ hair: string; eyes: string; skin: string; clothing: string; style: string }>(),
  
  // Output
  videoUrl: text("video_url"),
  
  // Status
  status: mysqlEnum("status", ["pending", "queued", "processing", "complete", "failed"]).default("queued").notNull(),
  progress: int("progress").default(0),
  errorMessage: text("error_message"),
  
  // Settings
  duration: int("duration").default(30), // seconds
  fps: int("fps").default(24),
  sceneCount: int("scene_count").default(5),
  
  // Legacy fields (kept for compatibility)
  imageUrl: text("image_url"),
  motionIntensity: decimal("motion_intensity", { precision: 3, scale: 2 }).default("0.50"),
  seed: int("seed"),
  metadata: json("metadata"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  userIdIdx: index("idx_video_jobs_user_id").on(table.userId),
  statusIdx: index("idx_video_jobs_status").on(table.status),
}));

/**
 * Analytics events
 */
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventData: json("event_data"),
  sessionId: varchar("session_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_analytics_user_id").on(table.userId),
  eventTypeIdx: index("idx_analytics_event_type").on(table.eventType),
  createdAtIdx: index("idx_analytics_created_at").on(table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type EmmaNetwork = typeof emmaNetwork.$inferSelect;
export type BrandAffiliation = typeof brandAffiliations.$inferSelect;
export type CulturalContentTemplate = typeof culturalContentTemplates.$inferSelect;
export type Waitlist = typeof waitlist.$inferSelect;
export type Content = typeof content.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type VideoGenerationJob = typeof videoGenerationJobs.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

/**
 * ============================================
 * SYSTEMS F, G, H — MARKETPLACE, UNIVERSITY, SERVICES
 * ============================================
 */

/**
 * Marketplace Products
 */
export const marketplaceProducts = mysqlTable("marketplace_products", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recruiterId: int("recruiter_id").references(() => users.id, { onDelete: "set null" }),
  
  type: mysqlEnum("type", ["digital", "physical", "service", "bundle", "subscription"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  shortDescription: varchar("short_description", { length: 280 }),
  description: text("description"),
  
  priceAmount: int("price_amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  // Images & Media
  mainImage: varchar("main_image", { length: 500 }),
  additionalImages: json("additional_images").$type<string[]>(),
  productVideo: varchar("product_video", { length: 500 }),
  
  // Digital Product Fields
  digitalFiles: json("digital_files").$type<Array<{url: string, name: string, size: number}>>(),
  downloadLimit: int("download_limit"), // null = unlimited
  accessDuration: int("access_duration"), // in days, null = lifetime
  
  // Physical Product Fields
  shippingType: mysqlEnum("shipping_type", ["self", "fulfillment"]),
  shippingCost: int("shipping_cost"), // in cents
  estimatedDeliveryDays: int("estimated_delivery_days"),
  inventory: int("inventory"), // null = unlimited
  variations: json("variations").$type<{sizes?: string[], colors?: string[]}>(),
  
  // Service Fields
  serviceDuration: int("service_duration"), // in minutes
  deliveryMethods: json("delivery_methods").$type<string[]>(),
  bookingEnabled: boolean("booking_enabled").default(false),
  turnaroundDays: int("turnaround_days"),
  
  // Pricing & Discounts
  regularPrice: int("regular_price"), // in cents, for sale pricing
  salePrice: int("sale_price"), // in cents
  saleEndDate: timestamp("sale_end_date"),
  monthlyPrice: int("monthly_price"), // in cents, for subscription option
  
  // SEO & Discovery
  keywords: json("keywords").$type<string[]>(),
  targetAudience: json("target_audience").$type<string[]>(),
  contentRating: mysqlEnum("content_rating", ["general", "18+", "21+"]).default("general"),
  
  // Terms & Delivery
  refundPolicy: mysqlEnum("refund_policy", ["no-refunds", "7-day", "30-day", "custom"]).default("no-refunds"),
  customRefundPolicy: text("custom_refund_policy"),
  customerInstructions: text("customer_instructions"),
  termsOfUse: text("terms_of_use"),
  
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  
  // Publishing
  publishedAt: timestamp("published_at"),
  scheduledFor: timestamp("scheduled_for"),
  
  // Stats
  viewCount: int("view_count").default(0),
  salesCount: int("sales_count").default(0),
  totalRevenue: int("total_revenue").default(0), // in cents
  
  fulfillmentType: mysqlEnum("fulfillment_type", ["instant", "manual", "scheduled"]).default("manual").notNull(),
  fulfillmentPayload: json("fulfillment_payload"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  creatorIdIdx: index("idx_marketplace_products_creator_id").on(table.creatorId),
  statusIdx: index("idx_marketplace_products_status").on(table.status),
  typeIdx: index("idx_marketplace_products_type").on(table.type),
  categoryIdx: index("idx_marketplace_products_category").on(table.category),
}));

/**
 * Marketplace Orders
 */
export const marketplaceOrders = mysqlTable("marketplace_orders", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  buyerId: int("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => marketplaceProducts.id, { onDelete: "restrict" }),
  
  quantity: int("quantity").default(1).notNull(),
  
  grossAmount: int("gross_amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  creatorAmount: int("creator_amount").notNull(),
  recruiterAmount: int("recruiter_amount").default(0).notNull(),
  platformAmount: int("platform_amount").notNull(),
  
  paymentProvider: varchar("payment_provider", { length: 20 }).default("stripe").notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  
  status: mysqlEnum("status", ["pending", "paid", "fulfilled", "refunded", "failed"]).default("pending").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  buyerIdIdx: index("idx_marketplace_orders_buyer_id").on(table.buyerId),
  productIdIdx: index("idx_marketplace_orders_product_id").on(table.productId),
  statusIdx: index("idx_marketplace_orders_status").on(table.status),
  stripeSessionIdIdx: index("idx_marketplace_orders_stripe_session_id").on(table.stripeSessionId),
}));

/**
 * University Courses
 */
export const universityCourses = mysqlTable("university_courses", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  priceAmount: int("price_amount").default(0).notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  isFree: boolean("is_free").default(false).notNull(),
  
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  
  syllabusJson: json("syllabus_json").$type<{
    modules: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        type: "video" | "text" | "quiz" | "assignment";
        content: string;
        duration?: number;
      }>;
    }>;
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  creatorIdIdx: index("idx_university_courses_creator_id").on(table.creatorId),
  statusIdx: index("idx_university_courses_status").on(table.status),
}));

/**
 * University Enrollments
 */
export const universityEnrollments = mysqlTable("university_enrollments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: varchar("course_id", { length: 36 }).notNull().references(() => universityCourses.id, { onDelete: "cascade" }),
  studentId: int("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("order_id", { length: 36 }).references(() => marketplaceOrders.id, { onDelete: "set null" }),
  
  status: mysqlEnum("status", ["active", "completed", "refunded", "revoked"]).default("active").notNull(),
  
  progressJson: json("progress_json").$type<{
    completedLessons: string[];
    currentModule?: string;
    currentLesson?: string;
    lastAccessedAt?: number;
  }>(),
  
  certificateUrl: varchar("certificate_url", { length: 512 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  courseIdIdx: index("idx_university_enrollments_course_id").on(table.courseId),
  studentIdIdx: index("idx_university_enrollments_student_id").on(table.studentId),
  statusIdx: index("idx_university_enrollments_status").on(table.status),
}));

/**
 * Services Offers
 */
export const servicesOffers = mysqlTable("services_offers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  providerId: int("provider_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  tier: mysqlEnum("tier", ["low", "mid", "high"]).default("mid").notNull(),
  
  priceAmount: int("price_amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  deliveryDays: int("delivery_days").default(7).notNull(),
  
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  
  fulfillmentStepsJson: json("fulfillment_steps_json").$type<Array<{
    id: string;
    title: string;
    description: string;
    estimatedDays: number;
  }>>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  providerIdIdx: index("idx_services_offers_provider_id").on(table.providerId),
  statusIdx: index("idx_services_offers_status").on(table.status),
  tierIdx: index("idx_services_offers_tier").on(table.tier),
}));

/**
 * Services Sales
 */
export const servicesSales = mysqlTable("services_sales", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  buyerId: int("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  offerId: varchar("offer_id", { length: 36 }).notNull().references(() => servicesOffers.id, { onDelete: "restrict" }),
  
  grossAmount: int("gross_amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  providerAmount: int("provider_amount").notNull(),
  affiliateAmount: int("affiliate_amount").default(0).notNull(),
  recruiterAmount: int("recruiter_amount").default(0).notNull(),
  platformAmount: int("platform_amount").notNull(),
  
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  
  status: mysqlEnum("status", ["pending", "paid", "in_progress", "delivered", "refunded", "failed"]).default("pending").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  buyerIdIdx: index("idx_services_sales_buyer_id").on(table.buyerId),
  offerIdIdx: index("idx_services_sales_offer_id").on(table.offerId),
  statusIdx: index("idx_services_sales_status").on(table.status),
  stripeSessionIdIdx: index("idx_services_sales_stripe_session_id").on(table.stripeSessionId),
}));

/**
 * Commission Events (tracking all revenue splits)
 */
export const commissionEvents = mysqlTable("commission_events", {
  id: int("id").autoincrement().primaryKey(),
  
  refType: mysqlEnum("ref_type", ["order", "sale", "enrollment"]).notNull(),
  refId: varchar("ref_id", { length: 36 }).notNull(),
  
  partyType: mysqlEnum("party_type", ["creator", "recruiter", "affiliate", "platform"]).notNull(),
  partyId: int("party_id").references(() => users.id, { onDelete: "set null" }), // null for platform
  
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  refTypeIdIdx: index("idx_commission_events_ref").on(table.refType, table.refId),
  partyIdIdx: index("idx_commission_events_party_id").on(table.partyId),
  partyTypeIdx: index("idx_commission_events_party_type").on(table.partyType),
}));


// ============ TELEGRAM BOTS ============

export const telegramBots = mysqlTable("telegram_bots", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  botToken: text("bot_token").notNull(), // Encrypted at rest
  webhookUrl: text("webhook_url"),
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, paused, deleted
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const telegramChannels = mysqlTable("telegram_channels", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  botId: varchar("bot_id", { length: 36 }).notNull().references(() => telegramBots.id, { onDelete: "cascade" }),
  channelId: varchar("channel_id", { length: 255 }).notNull(), // Telegram channel ID
  channelName: varchar("channel_name", { length: 255 }),
  channelType: varchar("channel_type", { length: 50 }).notNull(), // broadcast, funnel, support
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const telegramFunnels = mysqlTable("telegram_funnels", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  botId: varchar("bot_id", { length: 36 }).notNull().references(() => telegramBots.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  messagesJson: text("messages_json").notNull(), // Array of {text, delay, buttons}
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const telegramLeads = mysqlTable("telegram_leads", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  botId: varchar("bot_id", { length: 36 }).notNull().references(() => telegramBots.id, { onDelete: "cascade" }),
  telegramUserId: varchar("telegram_user_id", { length: 255 }).notNull(),
  username: varchar("username", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  country: varchar("country", { length: 100 }),
  creatorType: varchar("creator_type", { length: 100 }), // content, adult, fitness, etc.
  funnelId: varchar("funnel_id", { length: 36 }),
  currentStep: int("current_step").default(0),
  dataJson: text("data_json"), // Additional collected data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ============ WHATSAPP AUTOMATION ============

export const whatsappProviders = mysqlTable("whatsapp_providers", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // twilio, meta_cloud_api
  credentialsJson: text("credentials_json").notNull(), // Encrypted
  phoneNumber: varchar("phone_number", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const whatsappFunnels = mysqlTable("whatsapp_funnels", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  providerId: varchar("provider_id", { length: 36 }).notNull().references(() => whatsappProviders.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  messagesJson: text("messages_json").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const whatsappLeads = mysqlTable("whatsapp_leads", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  providerId: varchar("provider_id", { length: 36 }).notNull().references(() => whatsappProviders.id, { onDelete: "cascade" }),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  country: varchar("country", { length: 100 }),
  creatorType: varchar("creator_type", { length: 100 }),
  funnelId: varchar("funnel_id", { length: 36 }),
  currentStep: int("current_step").default(0),
  dataJson: text("data_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ============ LEADS (UNIFIED) ============

export const leads = mysqlTable("leads", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: varchar("source", { length: 50 }).notNull(), // telegram, whatsapp, web, marketplace
  sourceId: varchar("source_id", { length: 255 }), // Reference to telegram_leads.id or whatsapp_leads.id
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  country: varchar("country", { length: 100 }),
  creatorType: varchar("creator_type", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("new"), // new, contacted, converted, lost
  dataJson: text("data_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ============ CREATORS (EXTENDED) ============

export const creators = mysqlTable("creators", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creatorType: varchar("creator_type", { length: 100 }).notNull(), // content, adult, fitness, etc.
  country: varchar("country", { length: 100 }),
  platforms: text("platforms"), // JSON array of platforms
  monthlyRevenue: int("monthly_revenue"), // In cents
  subscriberCount: int("subscriber_count"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ============ BOT EVENTS (AI Bot Interactions) ============

export const botEvents = mysqlTable("bot_events", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 50 }).notNull(), // telegram, whatsapp, web
  eventType: varchar("event_type", { length: 100 }).notNull(), // ai_chat, onboarding_plan_generated, script_generated, etc.
  eventData: json("event_data"), // Flexible JSON for event-specific data
  outcome: varchar("outcome", { length: 50 }).default("success"), // success, error, pending
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_bot_events_user_id").on(table.userId),
  channelIdx: index("idx_bot_events_channel").on(table.channel),
  eventTypeIdx: index("idx_bot_events_event_type").on(table.eventType),
  createdAtIdx: index("idx_bot_events_created_at").on(table.createdAt),
}));

// ============ VIRAL OPTIMIZER ============

export const viralAnalyses = mysqlTable("viral_analyses", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Input data
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags"), // Comma-separated
  duration: int("duration"), // In seconds
  platform: varchar("platform", { length: 50 }).notNull(), // youtube, tiktok, instagram, etc.
  
  // Analysis results
  viralScore: int("viral_score").notNull(), // 0-100
  confidenceLevel: int("confidence_level").default(0), // 0-100
  
  // Component scores
  hookScore: int("hook_score"),
  qualityScore: int("quality_score"),
  trendScore: int("trend_score"),
  audienceScore: int("audience_score"),
  formatScore: int("format_score"),
  timingScore: int("timing_score"),
  platformScore: int("platform_score"),
  
  // Recommendations
  weaknesses: text("weaknesses"), // JSON array
  recommendations: text("recommendations"), // JSON array
  optimizedTitle: text("optimized_title"),
  optimizedDescription: text("optimized_description"),
  optimizedTags: text("optimized_tags"), // Comma-separated
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_viral_analyses_user_id").on(table.userId),
  platformIdx: index("idx_viral_analyses_platform").on(table.platform),
  viralScoreIdx: index("idx_viral_analyses_viral_score").on(table.viralScore),
  createdAtIdx: index("idx_viral_analyses_created_at").on(table.createdAt),
}));

export const viralMetrics = mysqlTable("viral_metrics", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  analysisId: varchar("analysis_id", { length: 36 }).notNull().references(() => viralAnalyses.id, { onDelete: "cascade" }),
  
  // Predicted metrics
  predictedViews: int("predicted_views"),
  predictedEngagement: decimal("predicted_engagement", { precision: 5, scale: 2 }), // Percentage
  predictedCtr: decimal("predicted_ctr", { precision: 5, scale: 2 }), // Percentage
  predictedRetention: decimal("predicted_retention", { precision: 5, scale: 2 }), // Percentage
  
  // Actual metrics (updated after content is published)
  actualViews: int("actual_views"),
  actualEngagement: decimal("actual_engagement", { precision: 5, scale: 2 }),
  actualCtr: decimal("actual_ctr", { precision: 5, scale: 2 }),
  actualRetention: decimal("actual_retention", { precision: 5, scale: 2 }),
  
  // Tracking
  publishedAt: timestamp("published_at"),
  lastUpdatedAt: timestamp("last_updated_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  analysisIdIdx: index("idx_viral_metrics_analysis_id").on(table.analysisId),
}));

/**
 * Video scenes for multi-scene video generation
 */
export const videoScenes = mysqlTable("video_scenes", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: int("job_id").notNull().references(() => videoGenerationJobs.id, { onDelete: "cascade" }),
  
  sceneIndex: int("scene_index").notNull(),
  description: text("description").notNull(),
  prompt: text("prompt").notNull(),
  
  imageUrl: text("image_url"),
  status: mysqlEnum("status", ["pending", "generating", "complete", "failed"]).default("pending").notNull(),
  errorMessage: text("error_message"),
  
  // Regeneration tracking
  regenerationCount: int("regeneration_count").default(0),
  regenerationHistory: json("regeneration_history").$type<{ timestamp: string; prompt: string; imageUrl: string }[]>(),
  
  // Character continuity
  characterLocked: boolean("character_locked").default(false),
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  jobIdIdx: index("idx_video_scenes_job_id").on(table.jobId),
  sceneIndexIdx: index("idx_video_scenes_scene_index").on(table.sceneIndex),
  statusIdx: index("idx_video_scenes_status").on(table.status),
}));

/**
 * Video assets (final outputs, intermediate frames, etc.)
 */
export const videoAssets = mysqlTable("video_assets", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: int("job_id").notNull().references(() => videoGenerationJobs.id, { onDelete: "cascade" }),
  
  assetType: mysqlEnum("asset_type", ["final_video", "scene_frame", "reference_image", "thumbnail"]).notNull(),
  url: text("url").notNull(),
  
  fileSize: int("file_size"), // bytes
  mimeType: varchar("mime_type", { length: 100 }),
  duration: int("duration"), // seconds (for videos)
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  jobIdIdx: index("idx_video_assets_job_id").on(table.jobId),
  assetTypeIdx: index("idx_video_assets_asset_type").on(table.assetType),
}));

// ============ AD OPTIMIZER ============

export const adAnalyses = mysqlTable("ad_analyses", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Input data
  product: text("product").notNull(),
  targetAudience: text("target_audience").notNull(),
  goal: mysqlEnum("goal", ["awareness", "traffic", "conversions", "engagement"]).notNull(),
  description: text("description"),
  tone: varchar("tone", { length: 50 }),
  budget: int("budget"),
  
  // Generated ad copy
  headline: text("headline").notNull(),
  bodyText: text("body_text").notNull(),
  cta: text("cta").notNull(),
  
  // Generated creative
  imageUrl: text("image_url").notNull(),
  imagePrompt: text("image_prompt"),
  
  // Scores (0-100)
  overallScore: int("overall_score").notNull(),
  hookScore: int("hook_score"),
  clarityScore: int("clarity_score"),
  urgencyScore: int("urgency_score"),
  valueScore: int("value_score"),
  ctaScore: int("cta_score"),
  
  // Analysis
  strengths: text("strengths"), // JSON array
  weaknesses: text("weaknesses"), // JSON array
  recommendations: text("recommendations"), // JSON array
  
  // Predicted metrics
  predictedCtr: decimal("predicted_ctr", { precision: 5, scale: 2 }), // Click-through rate (%)
  predictedCpc: decimal("predicted_cpc", { precision: 6, scale: 2 }), // Cost per click (USD)
  predictedConversions: int("predicted_conversions"), // Per 1000 impressions
  predictedRoas: decimal("predicted_roas", { precision: 6, scale: 2 }), // Return on ad spend
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_ad_analyses_user_id").on(table.userId),
  goalIdx: index("idx_ad_analyses_goal").on(table.goal),
  overallScoreIdx: index("idx_ad_analyses_overall_score").on(table.overallScore),
  createdAtIdx: index("idx_ad_analyses_created_at").on(table.createdAt),
}));

// ============ THUMBNAIL GENERATOR ============

// ============ MULTI-PLATFORM POSTING & ANALYTICS ============
// Import from schema-multiplatform.ts
export * from "./schema-multiplatform";

// ============ PODCASTING INTEGRATION SUITE ============
// Import from schema-podcasting.ts
export * from "./schema-podcasting";

// ============ CONTENT ORCHESTRATOR ============

export * from "./schema-orchestrator";

export const thumbnailAnalyses = mysqlTable("thumbnail_analyses", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Input data
  videoTitle: text("video_title").notNull(),
  niche: varchar("niche", { length: 100 }).notNull(),
  style: varchar("style", { length: 50 }), // bold, minimal, dramatic, playful
  platform: varchar("platform", { length: 50 }).default("youtube").notNull(),
  
  // Generated thumbnail
  imageUrl: text("image_url").notNull(),
  imagePrompt: text("image_prompt"),
  textOverlay: text("text_overlay"), // Text shown on thumbnail
  
  // Scores (0-100)
  overallScore: int("overall_score").notNull(),
  ctrScore: int("ctr_score"), // Click-through rate potential
  clarityScore: int("clarity_score"), // Visual clarity
  emotionScore: int("emotion_score"), // Emotional impact
  contrastScore: int("contrast_score"), // Color contrast
  textScore: int("text_score"), // Text readability
  
  // Analysis
  strengths: text("strengths"), // JSON array
  weaknesses: text("weaknesses"), // JSON array
  recommendations: text("recommendations"), // JSON array
  
  // Predicted metrics
  predictedCtr: decimal("predicted_ctr", { precision: 5, scale: 2 }), // Click-through rate (%)
  predictedViews: int("predicted_views"), // Expected views boost
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_thumbnail_analyses_user_id").on(table.userId),
  nicheIdx: index("idx_thumbnail_analyses_niche").on(table.niche),
  platformIdx: index("idx_thumbnail_analyses_platform").on(table.platform),
  overallScoreIdx: index("idx_thumbnail_analyses_overall_score").on(table.overallScore),
  createdAtIdx: index("idx_thumbnail_analyses_created_at").on(table.createdAt),
}));


// VaultLive Streaming
export * from "./schema-vaultlive";


/**
 * Adult creator verification and compliance
 */
export const adultVerification = mysqlTable("adult_verification", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  idDocumentUrl: varchar("id_document_url", { length: 500 }),
  verificationStatus: mysqlEnum("verification_status", ["pending", "approved", "rejected"]).default("pending"),
  verifiedAt: timestamp("verified_at"),
  ageVerified: boolean("age_verified").default(false),
  consentFormsSigned: boolean("consent_forms_signed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  creatorIdIdx: index("idx_adult_verification_creator_id").on(table.creatorId),
  statusIdx: index("idx_adult_verification_status").on(table.verificationStatus),
}));

/**
 * Content protection settings
 */
export const contentProtection = mysqlTable("content_protection", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("content_id").notNull(),
  watermarkEnabled: boolean("watermark_enabled").default(true),
  screenshotPrevention: boolean("screenshot_prevention").default(true),
  geographicBlocks: json("geographic_blocks").$type<string[]>(),
  allowedRegions: json("allowed_regions").$type<string[]>(),
  dmcaMonitoring: boolean("dmca_monitoring").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  contentIdIdx: index("idx_content_protection_content_id").on(table.contentId),
}));

/**
 * Safety incident logging
 */
export const safetyLogs = mysqlTable("safety_logs", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  incidentType: mysqlEnum("incident_type", ["harassment", "stalking", "leak", "threat"]).notNull(),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  userBlockedId: int("user_blocked_id"),
  ipBlocked: varchar("ip_blocked", { length: 45 }),
  resolutionStatus: mysqlEnum("resolution_status", ["open", "investigating", "resolved"]).default("open"),
  notes: text("notes"),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  creatorIdIdx: index("idx_safety_logs_creator_id").on(table.creatorId),
  incidentTypeIdx: index("idx_safety_logs_incident_type").on(table.incidentType),
  statusIdx: index("idx_safety_logs_status").on(table.resolutionStatus),
}));

/**
 * Custom content requests
 */
export const customRequests = mysqlTable("custom_requests", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requesterId: int("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestDetails: text("request_details").notNull(),
  priceQuoted: int("price_quoted").notNull(), // in cents
  status: mysqlEnum("status", ["pending", "accepted", "declined", "completed"]).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  creatorIdIdx: index("idx_custom_requests_creator_id").on(table.creatorId),
  requesterIdIdx: index("idx_custom_requests_requester_id").on(table.requesterId),
  statusIdx: index("idx_custom_requests_status").on(table.status),
}));

/**
 * Emma Network hierarchy (regional ambassadors + recruiters)
 */
export const emmaNetworkHierarchy = mysqlTable("emma_network_hierarchy", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["coordinator", "regional_ambassador", "recruiter"]).notNull(),
  region: varchar("region", { length: 100 }), // Sosúa, Santiago, Santo Domingo, Punta Cana
  parentId: int("parent_id"), // references another hierarchy entry
  recruitedCount: int("recruited_count").default(0),
  totalCommissionsEarned: int("total_commissions_earned").default(0), // in cents
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_emma_hierarchy_user_id").on(table.userId),
  roleIdx: index("idx_emma_hierarchy_role").on(table.role),
  regionIdx: index("idx_emma_hierarchy_region").on(table.region),
  parentIdIdx: index("idx_emma_hierarchy_parent_id").on(table.parentId),
}));

/**
 * Recruiter commission tracking
 */
export const recruiterCommissions = mysqlTable("recruiter_commissions", {
  id: int("id").autoincrement().primaryKey(),
  recruiterId: int("recruiter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transactionId: int("transaction_id").notNull(),
  commissionAmount: int("commission_amount").notNull(), // in cents
  commissionRate: int("commission_rate").notNull(), // percentage * 100 (e.g., 200 = 2%)
  paidOut: boolean("paid_out").default(false),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  recruiterIdIdx: index("idx_recruiter_commissions_recruiter_id").on(table.recruiterId),
  creatorIdIdx: index("idx_recruiter_commissions_creator_id").on(table.creatorId),
  paidOutIdx: index("idx_recruiter_commissions_paid_out").on(table.paidOut),
}));

/**
 * Bilingual content support
 */
export const bilingualContent = mysqlTable("bilingual_content", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("content_id").notNull(),
  titleEs: varchar("title_es", { length: 200 }),
  titleEn: varchar("title_en", { length: 200 }),
  descriptionEs: text("description_es"),
  descriptionEn: text("description_en"),
  tagsEs: json("tags_es").$type<string[]>(),
  tagsEn: json("tags_en").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  contentIdIdx: index("idx_bilingual_content_content_id").on(table.contentId),
}));


/**
 * Subscription tiers created by adult creators
 */
export const subscriptionTiers = mysqlTable("subscription_tiers", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // "Basic", "VIP", "Premium"
  priceInCents: int("price_in_cents").notNull(),
  billingInterval: mysqlEnum("billing_interval", ["monthly", "yearly"]).default("monthly"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  creatorIdIdx: index("idx_subscription_tiers_creator_id").on(table.creatorId),
  isActiveIdx: index("idx_subscription_tiers_is_active").on(table.isActive),
}));

/**
 * Active subscriptions from fans to creators
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  fanId: int("fan_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tierId: int("tier_id").notNull().references(() => subscriptionTiers.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "unpaid"]).default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  fanIdIdx: index("idx_subscriptions_fan_id").on(table.fanId),
  creatorIdIdx: index("idx_subscriptions_creator_id").on(table.creatorId),
  statusIdx: index("idx_subscriptions_status").on(table.status),
  stripeSubscriptionIdIdx: index("idx_subscriptions_stripe_subscription_id").on(table.stripeSubscriptionId),
}));

/**
 * Creator balance tracking
 */
export const creatorBalances = mysqlTable("creator_balances", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creator_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  availableBalanceInCents: int("available_balance_in_cents").default(0).notNull(),
  pendingBalanceInCents: int("pending_balance_in_cents").default(0).notNull(),
  lifetimeEarningsInCents: int("lifetime_earnings_in_cents").default(0).notNull(),
  lastPayoutAt: timestamp("last_payout_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  creatorIdIdx: index("idx_creator_balances_creator_id").on(table.creatorId),
}));

/**
 * Transaction ledger for all payments
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  fanId: int("fan_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountInCents: int("amount_in_cents").notNull(),
  creatorShareInCents: int("creator_share_in_cents").notNull(), // 70%
  platformShareInCents: int("platform_share_in_cents").notNull(), // 30%
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fanIdIdx: index("idx_transactions_fan_id").on(table.fanId),
  creatorIdIdx: index("idx_transactions_creator_id").on(table.creatorId),
  subscriptionIdIdx: index("idx_transactions_subscription_id").on(table.subscriptionId),
  statusIdx: index("idx_transactions_status").on(table.status),
}));


// ============================================
// CONTENT ORCHESTRATOR TABLES
// ============================================



// ============================================
// CONTENT ORCHESTRATOR TABLES
// ============================================

export const unifiedContent = mysqlTable("unified_content", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  body: text("body"),
  mediaUrl: varchar("media_url", { length: 500 }),
  mediaType: mysqlEnum("media_type", ["image", "video", "audio", "text"]),
  tags: json("tags").$type<string[]>(),
  category: varchar("category", { length: 100 }),
  niche: varchar("niche", { length: 100 }),
  duration: int("duration"),
  targetPlatforms: json("target_platforms").$type<string[]>().notNull(),
  publishStrategy: mysqlEnum("publish_strategy", ["immediate", "scheduled", "draft"]).notNull(),
  scheduledFor: timestamp("scheduled_for"),
  timezone: varchar("timezone", { length: 50 }),
  optimizationLevel: mysqlEnum("optimization_level", ["none", "basic", "aggressive"]).default("basic"),
  generateThumbnail: boolean("generate_thumbnail").default(false),
  generateAd: boolean("generate_ad").default(false),
  runViralAnalysis: boolean("run_viral_analysis").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const orchestrationRuns = mysqlTable("orchestration_runs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  contentId: varchar("content_id", { length: 36 }).notNull().references(() => unifiedContent.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["draft", "optimizing", "ready", "scheduled", "publishing", "published", "failed"]).notNull(),
  viralAnalysisId: varchar("viral_analysis_id", { length: 36 }),
  thumbnailAnalysisId: varchar("thumbnail_analysis_id", { length: 36 }),
  adAnalysisId: varchar("ad_analysis_id", { length: 36 }),
  generatedAssets: json("generated_assets").$type<{
    thumbnails: string[];
    ads: string[];
    platformMedia: Record<string, string>;
  }>(),
  platformResults: json("platform_results").$type<Record<string, any>>(),
  errorLog: text("error_log"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformAdaptations = mysqlTable("platform_adaptations", {
  id: int("id").primaryKey().autoincrement(),
  orchestrationId: varchar("orchestration_id", { length: 36 }).notNull().references(() => orchestrationRuns.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 50 }).notNull(),
  adaptedTitle: varchar("adapted_title", { length: 500 }),
  adaptedDescription: text("adapted_description"),
  adaptedMediaUrl: varchar("adapted_media_url", { length: 500 }),
  platformSpecificData: json("platform_specific_data"),
  publishedUrl: varchar("published_url", { length: 500 }),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const optimizationHistory = mysqlTable("optimization_history", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id", { length: 36 }).references(() => unifiedContent.id, { onDelete: "cascade" }),
  optimizationType: varchar("optimization_type", { length: 50 }).notNull(),
  inputData: json("input_data").notNull(),
  outputData: json("output_data").notNull(),
  score: int("score"),
  appliedRecommendations: json("applied_recommendations").$type<string[]>(),
  performanceImpact: json("performance_impact"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentPerformance = mysqlTable("content_performance", {
  id: int("id").primaryKey().autoincrement(),
  contentId: varchar("content_id", { length: 36 }).notNull().references(() => unifiedContent.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 50 }).notNull(),
  views: int("views").default(0),
  likes: int("likes").default(0),
  comments: int("comments").default(0),
  shares: int("shares").default(0),
  clicks: int("clicks").default(0),
  ctr: decimal("ctr", { precision: 5, scale: 2 }),
  engagement: decimal("engagement", { precision: 5, scale: 2 }),
  retention: decimal("retention", { precision: 5, scale: 2 }),
  revenue: int("revenue").default(0),
  recordedAt: timestamp("recorded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adCampaigns = mysqlTable("ad_campaigns", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  platform: mysqlEnum("platform", ["facebook", "instagram", "google", "tiktok", "twitter"]).notNull(),
  objective: varchar("objective", { length: 100 }),
  budget: int("budget"),
  targetAudience: json("target_audience"),
  adCreativeUrl: varchar("ad_creative_url", { length: 500 }),
  adCopy: text("ad_copy"),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft"),
  impressions: int("impressions").default(0),
  clicks: int("clicks").default(0),
  conversions: int("conversions").default(0),
  spend: int("spend").default(0),
  ctr: decimal("ctr", { precision: 5, scale: 2 }),
  cpc: int("cpc"),
  roas: decimal("roas", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});


// Payout Requests
export const payoutRequests = mysqlTable("payout_requests", {
  id: int("id").primaryKey().autoincrement(),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountInCents: int("amount_in_cents").notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "rejected"]).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 50 }), // cashapp, zelle, bank_transfer, etc
  paymentDetails: text("payment_details"), // JSON with payment info
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
});

/**
 * Creator audits for social media monetization analysis
 */
export const creatorAudits = mysqlTable("creator_audits", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  platforms: json("platforms").notNull(), // Array of SocialMediaProfile
  monetizationPotential: int("monetization_potential").notNull(),
  strengths: json("strengths").notNull(), // Array of strings
  revenueOpportunities: json("revenue_opportunities").notNull(), // Array of strings
  roadmapWeek1: json("roadmap_week1").notNull(),
  roadmapWeek2: json("roadmap_week2").notNull(),
  roadmapWeek3: json("roadmap_week3").notNull(),
  roadmapWeek4: json("roadmap_week4").notNull(),
  firstThousandPlan: text("first_thousand_plan").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_creator_audits_user_id").on(table.userId),
}));

/**
 * Recruiter OS durable creator acquisition ledger.
 * Stores real profile ingestion, weighted fit scoring, personalized audit previews,
 * outreach copy, onboarding proof markers, Telegram readiness, and Stripe linkage state.
 */
export const recruiterCreatorProfiles = mysqlTable("recruiter_creator_profiles", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 40 }).notNull(),
  handle: varchar("handle", { length: 160 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  profileUrl: text("profile_url"),
  source: varchar("source", { length: 80 }).default("manual").notNull(),
  bio: text("bio"),
  niche: varchar("niche", { length: 180 }),
  followers: int("followers").default(0).notNull(),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  recentPost: text("recent_post"),
  platforms: json("platforms").$type<string[]>().notNull(),
  monetizationScore: int("monetization_score").default(0).notNull(),
  fitScore: int("fit_score").default(0).notNull(),
  urgencyScore: int("urgency_score").default(0).notNull(),
  totalScore: int("total_score").default(0).notNull(),
  scoreBreakdown: json("score_breakdown").$type<Record<string, number | string>>().notNull(),
  auditPreview: json("audit_preview").$type<Record<string, unknown>>().notNull(),
  trailerConcept: text("trailer_concept"),
  outreachMessage: text("outreach_message"),
  onboardingUrl: text("onboarding_url"),
  telegramUsername: varchar("telegram_username", { length: 160 }),
  telegramReady: boolean("telegram_ready").default(false).notNull(),
  stripeLinkStatus: varchar("stripe_link_status", { length: 40 }).default("not_started").notNull(),
  status: mysqlEnum("status", ["new", "qualified", "queued", "contacted", "replied", "onboarding", "onboarded", "declined"]).default("new").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  lastContactedAt: timestamp("last_contacted_at"),
  onboardedAt: timestamp("onboarded_at"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  platformHandleUniqueIdx: uniqueIndex("uniq_recruiter_creator_profiles_platform_handle").on(table.platform, table.handle),
  totalScoreIdx: index("idx_recruiter_creator_profiles_total_score").on(table.totalScore),
  statusIdx: index("idx_recruiter_creator_profiles_status").on(table.status),
  priorityIdx: index("idx_recruiter_creator_profiles_priority").on(table.priority),
  sourceIdx: index("idx_recruiter_creator_profiles_source").on(table.source),
}));

/**
 * CreatorVault Conversion Engine durable intelligence layer.
 * Extends Recruiter OS profiles into money-first creator conversion workflows.
 */
export const creatorConversionIntelligence = mysqlTable("creator_conversion_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profile_id").notNull().references(() => recruiterCreatorProfiles.id, { onDelete: "cascade" }),
  nicheClassification: varchar("niche_classification", { length: 180 }).notNull(),
  monetizationGaps: json("monetization_gaps").$type<string[]>().notNull(),
  estimatedLostRevenueCents: int("estimated_lost_revenue_cents").default(0).notNull(),
  audienceQualityScore: int("audience_quality_score").default(0).notNull(),
  subscriptionOpportunityScore: int("subscription_opportunity_score").default(0).notNull(),
  vipOpportunityScore: int("vip_opportunity_score").default(0).notNull(),
  telegramOpportunityScore: int("telegram_opportunity_score").default(0).notNull(),
  cloneOpportunityScore: int("clone_opportunity_score").default(0).notNull(),
  recurringRevenuePotentialCents: int("recurring_revenue_potential_cents").default(0).notNull(),
  creatorMaturityLevel: varchar("creator_maturity_level", { length: 80 }).notNull(),
  onboardingDifficultyScore: int("onboarding_difficulty_score").default(0).notNull(),
  conversionProbabilityScore: int("conversion_probability_score").default(0).notNull(),
  signalSnapshot: json("signal_snapshot").$type<Record<string, unknown>>().notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profileUniqueIdx: uniqueIndex("uniq_conversion_intelligence_profile").on(table.profileId),
  probabilityIdx: index("idx_conversion_intelligence_probability").on(table.conversionProbabilityScore),
  revenueIdx: index("idx_conversion_intelligence_revenue").on(table.recurringRevenuePotentialCents),
}));

export const creatorConversionPackets = mysqlTable("creator_conversion_packets", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profile_id").notNull().references(() => recruiterCreatorProfiles.id, { onDelete: "cascade" }),
  intelligenceId: int("intelligence_id").references(() => creatorConversionIntelligence.id, { onDelete: "set null" }),
  packetStatus: varchar("packet_status", { length: 40 }).default("generated").notNull(),
  personalizedSocialAudit: text("personalized_social_audit").notNull(),
  monetizationLeakAnalysis: text("monetization_leak_analysis").notNull(),
  recurringRevenueOpportunity: text("recurring_revenue_opportunity").notNull(),
  telegramOpportunity: text("telegram_opportunity").notNull(),
  aiCloneOpportunity: text("ai_clone_opportunity").notNull(),
  vipFunnelOpportunity: text("vip_funnel_opportunity").notNull(),
  platformGrowthOpportunity: text("platform_growth_opportunity").notNull(),
  creatorvaultLeverageExplanation: text("creatorvault_leverage_explanation").notNull(),
  personalizedTrailerBrief: text("personalized_trailer_brief").notNull(),
  cinematicOnboardingPreview: text("cinematic_onboarding_preview").notNull(),
  monetizationVisuals: json("monetization_visuals").$type<Record<string, string>>().notNull(),
  connectedSystems: json("connected_systems").$type<string[]>().notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profileUniqueIdx: uniqueIndex("uniq_conversion_packets_profile").on(table.profileId),
  statusIdx: index("idx_conversion_packets_status").on(table.packetStatus),
}));

export const creatorConversionAutomation = mysqlTable("creator_conversion_automation", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profile_id").notNull().references(() => recruiterCreatorProfiles.id, { onDelete: "cascade" }),
  packetId: int("packet_id").references(() => creatorConversionPackets.id, { onDelete: "set null" }),
  assignedRecruiter: varchar("assigned_recruiter", { length: 160 }),
  followUpCadence: json("follow_up_cadence").$type<Record<string, unknown>>().notNull(),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  lastResponseSignal: varchar("last_response_signal", { length: 120 }),
  interestScore: int("interest_score").default(0).notNull(),
  onboardingStage: varchar("onboarding_stage", { length: 80 }).default("packet_generated").notNull(),
  onboardingStageHistory: json("onboarding_stage_history").$type<Record<string, unknown>[]>().notNull(),
  telegramTransitionStatus: varchar("telegram_transition_status", { length: 80 }).default("not_started").notNull(),
  telegramTransitionTarget: varchar("telegram_transition_target", { length: 255 }),
  conversionStage: varchar("conversion_stage", { length: 80 }).default("queued").notNull(),
  stripeActivationStatus: varchar("stripe_activation_status", { length: 80 }).default("not_started").notNull(),
  stripeActivationReference: varchar("stripe_activation_reference", { length: 255 }),
  moneyNextAction: varchar("money_next_action", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profileUniqueIdx: uniqueIndex("uniq_conversion_automation_profile").on(table.profileId),
  stageIdx: index("idx_conversion_automation_stage").on(table.onboardingStage),
  conversionIdx: index("idx_conversion_automation_conversion").on(table.conversionStage),
  nextFollowIdx: index("idx_conversion_automation_next_follow").on(table.nextFollowUpAt),
}));

export const creatorHighTicketPackages = mysqlTable("creator_high_ticket_packages", {
  id: int("id").autoincrement().primaryKey(),
  packageKey: varchar("package_key", { length: 80 }).notNull(),
  packageName: varchar("package_name", { length: 180 }).notNull(),
  description: text("description").notNull(),
  existingSystems: json("existing_systems").$type<string[]>().notNull(),
  priceFloorCents: int("price_floor_cents").default(0).notNull(),
  recurringPotentialCents: int("recurring_potential_cents").default(0).notNull(),
  moneyTrigger: varchar("money_trigger", { length: 255 }).notNull(),
  activationRoute: varchar("activation_route", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  packageKeyUniqueIdx: uniqueIndex("uniq_high_ticket_package_key").on(table.packageKey),
  activeIdx: index("idx_high_ticket_packages_active").on(table.isActive),
}));

export const creatorAcquisitionPriorities = mysqlTable("creator_acquisition_priorities", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profile_id").notNull().references(() => recruiterCreatorProfiles.id, { onDelete: "cascade" }),
  intelligenceId: int("intelligence_id").references(() => creatorConversionIntelligence.id, { onDelete: "set null" }),
  priorityScore: int("priority_score").default(0).notNull(),
  priorityBand: varchar("priority_band", { length: 40 }).default("medium").notNull(),
  monetizationPotentialScore: int("monetization_potential_score").default(0).notNull(),
  likelihoodToConvertScore: int("likelihood_to_convert_score").default(0).notNull(),
  revenueLeakageScore: int("revenue_leakage_score").default(0).notNull(),
  operationalMaturityScore: int("operational_maturity_score").default(0).notNull(),
  engagementQualityScore: int("engagement_quality_score").default(0).notNull(),
  telegramReadinessScore: int("telegram_readiness_score").default(0).notNull(),
  recurringRevenueScore: int("recurring_revenue_score").default(0).notNull(),
  paidAudienceBehaviorScore: int("paid_audience_behavior_score").default(0).notNull(),
  rankingReason: text("ranking_reason").notNull(),
  nextMoneyAction: varchar("next_money_action", { length: 255 }).notNull(),
  scoredAt: timestamp("scored_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  profileUniqueIdx: uniqueIndex("uniq_acquisition_priority_profile").on(table.profileId),
  priorityScoreIdx: index("idx_acquisition_priorities_score").on(table.priorityScore),
  priorityBandIdx: index("idx_acquisition_priorities_band").on(table.priorityBand),
}));

/**
 * CreatorVault Daily Acquisition + Revenue Engine.
 * Durable daily revenue-operations layer. Real revenue is computed from subscriptions and transactions.
 */
export const dailyRevenuePlans = mysqlTable("daily_revenue_plans", {
  id: int("id").autoincrement().primaryKey(),
  planDate: timestamp("plan_date").notNull(),
  status: varchar("status", { length: 40 }).default("active").notNull(),
  operatorLabel: varchar("operator_label", { length: 160 }),
  targetCreators: int("target_creators").default(25).notNull(),
  targetActivations: int("target_activations").default(5).notNull(),
  targetFirstDollars: int("target_first_dollars").default(1).notNull(),
  targetMrrCents: int("target_mrr_cents").default(0).notNull(),
  actualCreatorsContacted: int("actual_creators_contacted").default(0).notNull(),
  actualActivations: int("actual_activations").default(0).notNull(),
  actualFirstDollars: int("actual_first_dollars").default(0).notNull(),
  actualMrrCents: int("actual_mrr_cents").default(0).notNull(),
  actualCashCollectedCents: int("actual_cash_collected_cents").default(0).notNull(),
  executionNotes: text("execution_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  planDateUniqueIdx: uniqueIndex("uniq_daily_revenue_plan_date").on(table.planDate),
  statusDateIdx: index("idx_daily_revenue_plan_status_date").on(table.status, table.planDate),
}));

export const dailyCreatorPipeline = mysqlTable("daily_creator_pipeline", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("plan_id").notNull().references(() => dailyRevenuePlans.id, { onDelete: "cascade" }),
  creatorId: int("creator_id"),
  recruiterProfileId: int("recruiter_profile_id").references(() => recruiterCreatorProfiles.id, { onDelete: "set null" }),
  outreachLeadId: int("outreach_lead_id"),
  conversionPacketId: int("conversion_packet_id").references(() => creatorConversionPackets.id, { onDelete: "set null" }),
  handle: varchar("handle", { length: 180 }).notNull(),
  platform: varchar("platform", { length: 80 }).default("unknown").notNull(),
  stage: varchar("stage", { length: 60 }).default("targeted").notNull(),
  priorityScore: int("priority_score").default(0).notNull(),
  priorityBand: varchar("priority_band", { length: 40 }).default("medium").notNull(),
  packagePriority: varchar("package_priority", { length: 120 }),
  nextAction: varchar("next_action", { length: 255 }).notNull(),
  nextActionDueAt: timestamp("next_action_due_at"),
  activationStatus: varchar("activation_status", { length: 80 }).default("not_started").notNull(),
  checkoutStatus: varchar("checkout_status", { length: 80 }).default("not_started").notNull(),
  firstRevenueTransactionId: int("first_revenue_transaction_id"),
  realRevenueCents: int("real_revenue_cents").default(0).notNull(),
  realRevenueSource: varchar("real_revenue_source", { length: 80 }).default("none").notNull(),
  evidencePayload: json("evidence_payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  planHandlePlatformUniqueIdx: uniqueIndex("uniq_daily_pipeline_plan_handle_platform").on(table.planId, table.handle, table.platform),
  stageIdx: index("idx_daily_pipeline_stage").on(table.stage),
  nextActionIdx: index("idx_daily_pipeline_next_action").on(table.nextActionDueAt, table.priorityScore),
  creatorIdx: index("idx_daily_pipeline_creator").on(table.creatorId),
  recruiterProfileIdx: index("idx_daily_pipeline_recruiter_profile").on(table.recruiterProfileId),
  conversionPacketIdx: index("idx_daily_pipeline_conversion_packet").on(table.conversionPacketId),
  firstTransactionIdx: index("idx_daily_pipeline_first_transaction").on(table.firstRevenueTransactionId),
}));

export const dailyCreatorEvents = mysqlTable("daily_creator_events", {
  id: int("id").autoincrement().primaryKey(),
  pipelineId: int("pipeline_id").notNull().references(() => dailyCreatorPipeline.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 80 }).notNull(),
  eventSource: varchar("event_source", { length: 80 }).default("operator").notNull(),
  previousStage: varchar("previous_stage", { length: 60 }),
  nextStage: varchar("next_stage", { length: 60 }),
  eventPayload: json("event_payload").$type<Record<string, unknown>>(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  typeTimeIdx: index("idx_daily_creator_events_type_time").on(table.eventType, table.occurredAt),
  pipelineTimeIdx: index("idx_daily_creator_events_pipeline_time").on(table.pipelineId, table.occurredAt),
}));

export const dailyRevenueSnapshots = mysqlTable("daily_revenue_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  snapshotDate: timestamp("snapshot_date").notNull(),
  activeSubscriptions: int("active_subscriptions").default(0).notNull(),
  mrrCents: int("mrr_cents").default(0).notNull(),
  cashCollectedCents: int("cash_collected_cents").default(0).notNull(),
  creatorEarningsCents: int("creator_earnings_cents").default(0).notNull(),
  platformShareCents: int("platform_share_cents").default(0).notNull(),
  firstDollarCreators: int("first_dollar_creators").default(0).notNull(),
  checkoutStartedCount: int("checkout_started_count").default(0).notNull(),
  checkoutRecoveredCount: int("checkout_recovered_count").default(0).notNull(),
  sourceTables: json("source_tables").$type<string[]>().notNull(),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  snapshotDateUniqueIdx: uniqueIndex("uniq_daily_revenue_snapshot_date").on(table.snapshotDate),
  computedIdx: index("idx_daily_revenue_snapshot_computed").on(table.computedAt),
}));

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
export const gamingTournaments = mysqlTable("gaming_tournaments", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Tournament details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  game: mysqlEnum("game", ["madden", "nba2k", "other"]).notNull(),
  gameVersion: varchar("game_version", { length: 50 }), // e.g., "Madden 25", "NBA 2K25"
  
  // Tournament type
  format: mysqlEnum("format", ["single-elimination", "double-elimination", "round-robin", "swiss"]).default("single-elimination").notNull(),
  teamSize: int("team_size").default(1).notNull(), // 1 for 1v1, 2 for 2v2, etc.
  
  // Location and timing
  location: mysqlEnum("location", ["dr", "usa", "online"]).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  registrationDeadline: timestamp("registration_deadline").notNull(),
  
  // Prize and revenue
  prizePool: int("prize_pool").default(0).notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  entryFee: int("entry_fee").default(0).notNull(), // in cents
  
  // Loso Division flag - 100% revenue to Godmother
  isLosoDivision: boolean("is_loso_division").default(false).notNull(),
  godmotherUserId: int("godmother_user_id").references(() => users.id, { onDelete: "restrict" }),
  
  // Status
  status: mysqlEnum("status", ["draft", "open", "in-progress", "completed", "cancelled"]).default("draft").notNull(),
  
  // Metadata
  rules: text("rules"),
  streamUrl: varchar("stream_url", { length: 500 }),
  bracketJson: json("bracket_json").$type<any>(),
  
  // Organizer
  organizerId: int("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  gameIdx: index("idx_gaming_tournaments_game").on(table.game),
  statusIdx: index("idx_gaming_tournaments_status").on(table.status),
  locationIdx: index("idx_gaming_tournaments_location").on(table.location),
  isLosoDivisionIdx: index("idx_gaming_tournaments_is_loso_division").on(table.isLosoDivision),
  startDateIdx: index("idx_gaming_tournaments_start_date").on(table.startDate),
}));

/**
 * Gaming Players (Tournament Registrations)
 */
export const gamingPlayers = mysqlTable("gaming_players", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  tournamentId: varchar("tournament_id", { length: 36 }).notNull().references(() => gamingTournaments.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Player info
  gamerTag: varchar("gamer_tag", { length: 100 }).notNull(),
  teamName: varchar("team_name", { length: 100 }),
  
  // Registration
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
  paymentStatus: mysqlEnum("payment_status", ["pending", "paid", "refunded"]).default("pending").notNull(),
  paymentAmount: int("payment_amount").default(0).notNull(), // in cents
  
  // Performance
  seed: int("seed"), // Tournament seeding
  currentRound: int("current_round").default(0),
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  placement: int("placement"), // Final placement (1st, 2nd, 3rd, etc.)
  prizeWon: int("prize_won").default(0).notNull(), // in cents
  
  // Status
  status: mysqlEnum("status", ["registered", "checked-in", "active", "eliminated", "disqualified", "withdrew"]).default("registered").notNull(),
  
  // Metadata
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tournamentIdIdx: index("idx_gaming_players_tournament_id").on(table.tournamentId),
  userIdIdx: index("idx_gaming_players_user_id").on(table.userId),
  statusIdx: index("idx_gaming_players_status").on(table.status),
  paymentStatusIdx: index("idx_gaming_players_payment_status").on(table.paymentStatus),
}));

/**
 * Gaming Matches
 */
export const gamingMatches = mysqlTable("gaming_matches", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  tournamentId: varchar("tournament_id", { length: 36 }).notNull().references(() => gamingTournaments.id, { onDelete: "cascade" }),
  
  // Match details
  round: int("round").notNull(), // 1 = Round 1, 2 = Round 2, etc.
  matchNumber: int("match_number").notNull(), // Match number within round
  
  // Players
  player1Id: varchar("player1_id", { length: 36 }).references(() => gamingPlayers.id, { onDelete: "set null" }),
  player2Id: varchar("player2_id", { length: 36 }).references(() => gamingPlayers.id, { onDelete: "set null" }),
  
  // Scores
  player1Score: int("player1_score").default(0),
  player2Score: int("player2_score").default(0),
  winnerId: varchar("winner_id", { length: 36 }).references(() => gamingPlayers.id, { onDelete: "set null" }),
  
  // Timing
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Status
  status: mysqlEnum("status", ["scheduled", "in-progress", "completed", "disputed", "cancelled"]).default("scheduled").notNull(),
  
  // Stream and replay
  streamUrl: varchar("stream_url", { length: 500 }),
  replayUrl: varchar("replay_url", { length: 500 }),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tournamentIdIdx: index("idx_gaming_matches_tournament_id").on(table.tournamentId),
  statusIdx: index("idx_gaming_matches_status").on(table.status),
  scheduledAtIdx: index("idx_gaming_matches_scheduled_at").on(table.scheduledAt),
}));

/**
 * Gaming Teams (for team-based tournaments)
 */
export const gamingTeams = mysqlTable("gaming_teams", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  tournamentId: varchar("tournament_id", { length: 36 }).notNull().references(() => gamingTournaments.id, { onDelete: "cascade" }),
  
  // Team details
  name: varchar("name", { length: 100 }).notNull(),
  tag: varchar("tag", { length: 20 }), // Team tag/abbreviation
  captainUserId: int("captain_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Members (stored as JSON array of user IDs)
  memberIds: json("member_ids").$type<number[]>().notNull(),
  
  // Performance
  wins: int("wins").default(0).notNull(),
  losses: int("losses").default(0).notNull(),
  placement: int("placement"),
  prizeWon: int("prize_won").default(0).notNull(), // in cents
  
  // Status
  status: mysqlEnum("status", ["registered", "active", "eliminated", "disqualified"]).default("registered").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tournamentIdIdx: index("idx_gaming_teams_tournament_id").on(table.tournamentId),
  captainUserIdIdx: index("idx_gaming_teams_captain_user_id").on(table.captainUserId),
  statusIdx: index("idx_gaming_teams_status").on(table.status),
}));

/**
 * Loso Revenue Tracking - 100% to Godmother
 */
export const losoRevenueTracking = mysqlTable("loso_revenue_tracking", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Source
  tournamentId: varchar("tournament_id", { length: 36 }).references(() => gamingTournaments.id, { onDelete: "set null" }),
  sourceType: mysqlEnum("source_type", ["tournament-entry", "tournament-prize", "merchandise", "sponsorship", "other"]).notNull(),
  description: text("description"),
  
  // Amount
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  // Godmother allocation (ALWAYS 100%)
  godmotherUserId: int("godmother_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  allocationPercentage: int("allocation_percentage").default(100).notNull(), // HARDCODED 100%
  godmotherAmount: int("godmother_amount").notNull(), // Should equal amount
  
  // Payment status
  paymentStatus: mysqlEnum("payment_status", ["pending", "paid", "failed"]).default("pending").notNull(),
  paidAt: timestamp("paid_at"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  
  // Metadata
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tournamentIdIdx: index("idx_loso_revenue_tracking_tournament_id").on(table.tournamentId),
  godmotherUserIdIdx: index("idx_loso_revenue_tracking_godmother_user_id").on(table.godmotherUserId),
  paymentStatusIdx: index("idx_loso_revenue_tracking_payment_status").on(table.paymentStatus),
  sourceTypeIdx: index("idx_loso_revenue_tracking_source_type").on(table.sourceType),
}));

/**
 * Anmar Legacy Content
 * Honoring Carlos Anmar Maxie (1995) and Carlos Anmar Thompson (Loso)
 */
export const anmarLegacyContent = mysqlTable("anmar_legacy_content", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Content details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  contentType: mysqlEnum("content_type", ["story", "photo", "video", "documentary", "article", "tribute"]).notNull(),
  
  // Legacy person
  legacyPerson: mysqlEnum("legacy_person", ["carlos-anmar-maxie", "carlos-anmar-thompson-loso", "both"]).notNull(),
  
  // Content
  contentUrl: varchar("content_url", { length: 500 }),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  bodyText: text("body_text"),
  
  // Metadata
  year: int("year"), // Year of event/content
  location: varchar("location", { length: 255 }), // e.g., "Webb Chapel", "Dallas", "DR"
  tags: json("tags").$type<string[]>(),
  
  // Visibility
  isPublic: boolean("is_public").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  
  // Author
  authorId: int("author_id").references(() => users.id, { onDelete: "set null" }),
  
  // Engagement
  views: int("views").default(0).notNull(),
  likes: int("likes").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  legacyPersonIdx: index("idx_anmar_legacy_content_legacy_person").on(table.legacyPerson),
  contentTypeIdx: index("idx_anmar_legacy_content_content_type").on(table.contentType),
  isPublicIdx: index("idx_anmar_legacy_content_is_public").on(table.isPublic),
  isFeaturedIdx: index("idx_anmar_legacy_content_is_featured").on(table.isFeatured),
}));

/**
 * Loso Playbook AI - Madden/2K Strategy Generator
 */
export const losoPlaybooks = mysqlTable("loso_playbooks", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Game details
  game: mysqlEnum("game", ["madden", "nba2k"]).notNull(),
  gameVersion: varchar("game_version", { length: 50 }).notNull(),
  
  // Playbook details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Strategy
  offensiveScheme: varchar("offensive_scheme", { length: 100 }),
  defensiveScheme: varchar("defensive_scheme", { length: 100 }),
  keyPlays: json("key_plays").$type<string[]>(),
  counters: json("counters").$type<any>(),
  
  // AI-generated content
  aiGeneratedStrategy: text("ai_generated_strategy"),
  strengthsWeaknesses: json("strengths_weaknesses").$type<any>(),
  
  // Usage
  isPublic: boolean("is_public").default(false).notNull(),
  downloads: int("downloads").default(0).notNull(),
  rating: int("rating").default(0).notNull(), // 0-5 stars * 100 (e.g., 450 = 4.5 stars)
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_loso_playbooks_user_id").on(table.userId),
  gameIdx: index("idx_loso_playbooks_game").on(table.game),
  isPublicIdx: index("idx_loso_playbooks_is_public").on(table.isPublic),
}));

/**
 * Youth King Programs - Anmar Cup and community programs
 */
export const youthKingPrograms = mysqlTable("youth_king_programs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  
  // Program details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  programType: mysqlEnum("program_type", ["anmar-cup", "youth-tournament", "mentorship", "scholarship", "community-event"]).notNull(),
  
  // Location and timing
  location: varchar("location", { length: 255 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // Participants
  targetAgeMin: int("target_age_min"),
  targetAgeMax: int("target_age_max"),
  maxParticipants: int("max_participants"),
  currentParticipants: int("current_participants").default(0).notNull(),
  
  // Registration
  registrationOpen: boolean("registration_open").default(true).notNull(),
  registrationDeadline: timestamp("registration_deadline"),
  registrationFee: int("registration_fee").default(0).notNull(), // in cents
  
  // Status
  status: mysqlEnum("status", ["planning", "open", "in-progress", "completed", "cancelled"]).default("planning").notNull(),
  
  // Organizer
  organizerId: int("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Metadata
  imageUrl: varchar("image_url", { length: 500 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  programTypeIdx: index("idx_youth_king_programs_program_type").on(table.programType),
  statusIdx: index("idx_youth_king_programs_status").on(table.status),
  registrationOpenIdx: index("idx_youth_king_programs_registration_open").on(table.registrationOpen),
}));

// ============================================================================
// VAULTLIVE - Live Streaming System
// ============================================================================

/**
 * Live Streams - Creator live streaming sessions
 */
export const liveStreams = mysqlTable("live_streams", {
  id: int("id").primaryKey().autoincrement(),
  
  // Creator
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Stream details
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  
  // Status
  status: mysqlEnum("status", ["pending", "live", "ended"]).default("pending").notNull(),
  
  // Metrics
  viewerCount: int("viewer_count").default(0).notNull(),
  peakViewerCount: int("peak_viewer_count").default(0).notNull(),
  totalTips: decimal("total_tips", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  // Timestamps
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_live_streams_user_id").on(table.userId),
  statusIdx: index("idx_live_streams_status").on(table.status),
  createdAtIdx: index("idx_live_streams_created_at").on(table.createdAt),
}));

/**
 * Live Stream Viewers - Track who is watching
 */
export const liveStreamViewers = mysqlTable("live_stream_viewers", {
  id: int("id").primaryKey().autoincrement(),
  
  // Stream and viewer
  streamId: int("stream_id").notNull().references(() => liveStreams.id, { onDelete: "cascade" }),
  userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Session tracking
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  watchDuration: int("watch_duration").default(0).notNull(), // in seconds
}, (table) => ({
  streamIdIdx: index("idx_live_stream_viewers_stream_id").on(table.streamId),
  userIdIdx: index("idx_live_stream_viewers_user_id").on(table.userId),
}));

/**
 * Live Stream Tips - Manual tips with 85/15 split
 */
export const liveStreamTips = mysqlTable("live_stream_tips", {
  id: int("id").primaryKey().autoincrement(),
  
  // Stream and users
  streamId: int("stream_id").notNull().references(() => liveStreams.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Tip details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // in dollars
  creatorShare: decimal("creator_share", { precision: 10, scale: 2 }).notNull(), // 85%
  platformShare: decimal("platform_share", { precision: 10, scale: 2 }).notNull(), // 15%
  message: text("message"),
  
  // Status
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled"]).default("pending").notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at"),
}, (table) => ({
  streamIdIdx: index("idx_live_stream_tips_stream_id").on(table.streamId),
  userIdIdx: index("idx_live_stream_tips_user_id").on(table.userId),
  statusIdx: index("idx_live_stream_tips_status").on(table.status),
}));

/**
 * Live Stream Donations - Payment-based donations
 */
export const liveStreamDonations = mysqlTable("live_stream_donations", {
  id: int("id").primaryKey().autoincrement(),
  
  // Stream and users
  streamId: int("stream_id").notNull().references(() => liveStreams.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Donation details
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  creatorShare: decimal("creator_share", { precision: 10, scale: 2 }).notNull(), // 85%
  platformShare: decimal("platform_share", { precision: 10, scale: 2 }).notNull(), // 15%
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  message: text("message"),
  
  // Payment status
  paymentStatus: mysqlEnum("payment_status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  streamIdIdx: index("idx_live_stream_donations_stream_id").on(table.streamId),
  userIdIdx: index("idx_live_stream_donations_user_id").on(table.userId),
  paymentStatusIdx: index("idx_live_stream_donations_payment_status").on(table.paymentStatus),
}));

// ============ JOHANNY MEDIA SESSION ============
export const mediaJobs = mysqlTable("media_jobs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobType: varchar("job_type", { length: 50 }).notNull(), // YODEIRIS_LONGFORM_DEMO_V1, YODEIRIS_VAULTX_TRAILER_V1
  projectId: varchar("project_id", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["pending", "queued", "processing", "complete", "failed"]).default("pending").notNull(),
  mediaSessionData: json("media_session_data"), // Stores the full JohannyMediaSession object
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const sceneShotMedia = mysqlTable("scene_shot_media", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  mediaJobId: varchar("media_job_id", { length: 36 }).notNull().references(() => mediaJobs.id, { onDelete: "cascade" }),
  sceneId: varchar("scene_id", { length: 100 }).notNull(),
  shotType: varchar("shot_type", { length: 50 }).notNull(),
  requiredDescription: text("required_description").notNull(),
  assignedMediaUrl: text("assigned_media_url"),
  status: mysqlEnum("status", ["missing", "assigned", "approved", "rejected"]).default("missing").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// DIRECT MESSAGING + PPV SYSTEM
// ============================================================

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fanId: int("fan_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  creatorUnreadCount: int("creator_unread_count").default(0).notNull(),
  fanUnreadCount: int("fan_unread_count").default(0).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index("idx_conversations_creator_id").on(table.creatorId),
  fanIdIdx: index("idx_conversations_fan_id").on(table.fanId),
  lastMessageAtIdx: index("idx_conversations_last_message_at").on(table.lastMessageAt),
  uniquePair: index("idx_conversations_unique_pair").on(table.creatorId, table.fanId),
}));

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: int("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body"),
  // PPV fields
  mediaUrl: text("media_url"),
  mediaType: mysqlEnum("media_type", ["image", "video", "audio"]),
  mediaThumbnailUrl: text("media_thumbnail_url"),
  isPpv: boolean("is_ppv").default(false).notNull(),
  ppvPriceCents: int("ppv_price_cents").default(0).notNull(),
  ppvUnlockCount: int("ppv_unlock_count").default(0).notNull(),
  ppvEarningsCents: int("ppv_earnings_cents").default(0).notNull(),
  // Mass DM tracking
  isMassDm: boolean("is_mass_dm").default(false).notNull(),
  massDmBatchId: varchar("mass_dm_batch_id", { length: 36 }),
  // Read tracking
  isReadByRecipient: boolean("is_read_by_recipient").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index("idx_messages_conversation_id").on(table.conversationId),
  senderIdIdx: index("idx_messages_sender_id").on(table.senderId),
  createdAtIdx: index("idx_messages_created_at").on(table.createdAt),
  massDmBatchIdx: index("idx_messages_mass_dm_batch").on(table.massDmBatchId),
}));

export const messageUnlocks = mysqlTable("message_unlocks", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  fanId: int("fan_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountPaidCents: int("amount_paid_cents").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
}, (table) => ({
  messageIdIdx: index("idx_message_unlocks_message_id").on(table.messageId),
  fanIdIdx: index("idx_message_unlocks_fan_id").on(table.fanId),
  uniqueUnlock: index("idx_message_unlocks_unique").on(table.messageId, table.fanId),
}));

// ============================================================
// LOCKED CONTENT (PPV POSTS)
// ============================================================

export const contentUnlocks = mysqlTable("content_unlocks", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("content_id").notNull().references(() => content.id, { onDelete: "cascade" }),
  fanId: int("fan_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountPaidCents: int("amount_paid_cents").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
}, (table) => ({
  contentIdIdx: index("idx_content_unlocks_content_id").on(table.contentId),
  fanIdIdx: index("idx_content_unlocks_fan_id").on(table.fanId),
  uniqueUnlock: index("idx_content_unlocks_unique").on(table.contentId, table.fanId),
}));

// ============================================================
// TIPS
// ============================================================

export const tips = mysqlTable("tips", {
  id: int("id").autoincrement().primaryKey(),
  fanId: int("fan_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: int("content_id").references(() => content.id, { onDelete: "set null" }),
  messageId: int("message_id").references(() => messages.id, { onDelete: "set null" }),
  amountCents: int("amount_cents").notNull(),
  message: varchar("message", { length: 500 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  status: mysqlEnum("status", ["pending", "completed", "refunded"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fanIdIdx: index("idx_tips_fan_id").on(table.fanId),
  creatorIdIdx: index("idx_tips_creator_id").on(table.creatorId),
  statusIdx: index("idx_tips_status").on(table.status),
}));

// ============================================================
// SSE NOTIFICATION EVENTS (for real-time message delivery)
// ============================================================

export const notificationEvents = mysqlTable("notification_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["new_message", "ppv_unlock", "new_tip", "new_subscriber", "ppv_purchase"]).notNull(),
  payload: json("payload").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("idx_notification_events_user_id").on(table.userId),
  isReadIdx: index("idx_notification_events_is_read").on(table.isRead),
  createdAtIdx: index("idx_notification_events_created_at").on(table.createdAt),
}));
