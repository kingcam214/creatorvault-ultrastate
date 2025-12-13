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
  imageUrl: text("image_url").notNull(),
  videoUrl: text("video_url"),
  status: varchar("status", { length: 20 }).default("pending"),
  progress: int("progress").default(0),
  duration: int("duration").default(5),
  fps: int("fps").default(24),
  motionIntensity: decimal("motion_intensity", { precision: 3, scale: 2 }).default("0.50"),
  seed: int("seed"),
  errorMessage: text("error_message"),
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
