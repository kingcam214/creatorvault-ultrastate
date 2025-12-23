import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table with CreatorVault extensions
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "creator", "admin", "king"]).default("user").notNull(),
  
  // Emma network & cultural intelligence fields
  language: varchar("language", { length: 10 }).default("en"),
  country: varchar("country", { length: 2 }),
  referredBy: int("referred_by"),
  creatorStatus: varchar("creator_status", { length: 20 }).default("pending"),
  contentType: json("content_type").$type<string[]>(),
  primaryBrand: varchar("primary_brand", { length: 50 }).default("CREATORVAULT"),
  
  // Payment methods for manual payment flow
  cashappHandle: varchar("cashapp_handle", { length: 100 }),
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
  
  type: mysqlEnum("type", ["digital", "service", "bundle", "subscription"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  priceAmount: int("price_amount").notNull(), // in cents
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  
  fulfillmentType: mysqlEnum("fulfillment_type", ["instant", "manual", "scheduled"]).default("manual").notNull(),
  fulfillmentPayload: json("fulfillment_payload"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  creatorIdIdx: index("idx_marketplace_products_creator_id").on(table.creatorId),
  statusIdx: index("idx_marketplace_products_status").on(table.status),
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
