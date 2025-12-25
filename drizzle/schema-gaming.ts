import { mysqlTable, int, varchar, text, timestamp, boolean, json, index, mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "./schema";

/**
 * CREATORVAULT GAMING (CVG) - LOSO DIVISION
 * Gaming tournaments, player management, Loso Playbook AI, Anmar Legacy
 * 100% of Loso-related revenue flows to Godmother (hardcoded)
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
  godmotherUserId: int("godmother_user_id"), // Reference to Godmother's user account
  
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
