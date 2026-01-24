# CLAUDE.md - AI Assistant Developer Guide

**CreatorVault ULTRASTATE - "The Dopest App in the World"**

This document provides AI assistants with comprehensive guidance for working with the CreatorVault codebase.

---

## 🎯 PURPOSE

This guide helps AI assistants understand:
- Codebase architecture and structure
- Development workflows and conventions
- Key patterns and best practices
- Brand standards and quality expectations
- How to make effective changes

---

## 📋 TABLE OF CONTENTS

1. [Quick Reference](#quick-reference)
2. [Codebase Overview](#codebase-overview)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [Database Architecture](#database-architecture)
6. [tRPC API Structure](#trpc-api-structure)
7. [Development Workflow](#development-workflow)
8. [Code Conventions](#code-conventions)
9. [Key Systems](#key-systems)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Brand Standards](#brand-standards)
13. [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## 🚀 QUICK REFERENCE

### Essential Commands
```bash
pnpm dev              # Start development server (port 5000)
pnpm build            # Build for production
pnpm start            # Run production build
pnpm check            # TypeScript type checking
pnpm test             # Run all tests
pnpm db:push          # Push database schema changes
```

### Path Aliases
```typescript
@/*           → client/src/*
@shared/*     → shared/*
@assets/*     → attached_assets/*
```

### Key Files
- `server/_core/index.ts` - Server entry point
- `client/src/main.tsx` - Client entry point
- `drizzle/schema.ts` - Main database schema (56+ tables)
- `server/_core/trpc.ts` - tRPC setup with middleware
- `vite.config.ts` - Build configuration

---

## 📖 CODEBASE OVERVIEW

### What is CreatorVault?

CreatorVault is a **full-stack creator platform** built by a creator (KingCam) for creators. It's not a typical startup - it's a movement focused on empowering creators with:

- **VaultLive Streaming** - 85% creator revenue split
- **KINGCAM AI Clone** - Autonomous content generation
- **Multi-Sector Platform** - Dominican, Adult, Influencer sectors
- **Creator Tools** - Viral optimizer, thumbnail maker, ad optimizer
- **Revenue Systems** - TriLayer splits (70/20/10)

### Architecture Type

**Monorepo Full-Stack TypeScript Application**

- **Frontend**: React 19 SPA with Vite bundling
- **Backend**: Express + tRPC API
- **Database**: MySQL/TiDB with Drizzle ORM
- **Real-time**: Socket.IO for WebRTC signaling
- **Deployment**: Railway with Nixpacks

---

## 🗂️ PROJECT STRUCTURE

```
creatorvault-ultrastate/
├── client/                          # React frontend application
│   ├── public/                      # Static assets (logos, favicon)
│   └── src/
│       ├── _core/                   # Core client utilities
│       ├── components/              # Reusable UI components
│       │   ├── ui/                  # shadcn/ui components
│       │   └── ...                  # Feature components
│       ├── contexts/                # React Context providers
│       ├── hooks/                   # Custom React hooks
│       ├── lib/                     # Utilities and tRPC client
│       ├── pages/                   # Page components (62+ pages)
│       ├── App.tsx                  # Main app component with routing
│       ├── main.tsx                 # Client entry point
│       └── index.css                # Global styles (Tailwind)
│
├── server/                          # Express backend application
│   ├── _core/                       # Core backend systems
│   │   ├── index.ts                 # Server entry point
│   │   ├── trpc.ts                  # tRPC router setup
│   │   ├── context.ts               # tRPC context (user, db)
│   │   ├── llm.ts                   # LLM integration
│   │   ├── realGPT.ts               # KINGCAM personality system
│   │   ├── tts.ts                   # Text-to-speech
│   │   ├── oauth.ts                 # OAuth authentication
│   │   ├── stripe.ts                # Stripe integration
│   │   └── ...                      # Other core utilities
│   ├── routers/                     # tRPC routers (37 files)
│   │   ├── vaultLive.ts             # Live streaming (15 procedures)
│   │   ├── creatorTools.ts          # Creator tools (10+ procedures)
│   │   ├── marketplace.ts           # Marketplace logic
│   │   ├── adultSalesBot.ts         # Adult sector bot
│   │   ├── emmaNetwork.ts           # Dominican network
│   │   └── ...                      # 32+ other routers
│   ├── services/                    # Business logic services (50+ files)
│   │   ├── videoStudio.ts           # Multi-scene video generation
│   │   ├── videoAssembly.ts         # FFmpeg video assembly
│   │   ├── kingcamScriptGenerator.ts # AI script generation
│   │   ├── adultSalesBot.ts         # Conversation state machine
│   │   ├── viralOptimizer.ts        # Content scoring
│   │   ├── vaultPay.ts              # Payment processing
│   │   └── ...                      # 45+ other services
│   └── db/                          # Database helpers
│
├── shared/                          # Shared types and utilities
│   └── _core/                       # Shared core utilities
│
├── drizzle/                         # Database schema & migrations
│   ├── schema.ts                    # Main schema (56+ tables)
│   ├── schema-vaultlive.ts          # VaultLive tables
│   ├── schema-podcasting.ts         # Podcasting tables
│   ├── schema-gaming.ts             # Gaming tables
│   ├── schema-multiplatform.ts      # Multi-platform tables
│   ├── migrations/                  # SQL migration files (16+)
│   └── relations.ts                 # Table relationships
│
├── assets/                          # Brand assets (logos)
├── scripts/                         # Utility scripts
│
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite bundler config
├── drizzle.config.ts                # Database config
│
├── README.md                        # Main project documentation
├── DOPEST_APP_STANDARDS.md          # Brand standards
├── RAILWAY_DEPLOY_INSTRUCTIONS.md   # Deployment guide
└── CLAUDE.md                        # This file
```

### Directory Breakdown

#### Client (`client/`)
- **Purpose**: React-based user interface
- **Router**: Wouter (lightweight routing)
- **State**: React Context + tRPC queries
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Build**: Vite (outputs to `dist/public/`)

#### Server (`server/`)
- **Purpose**: Express + tRPC API server
- **Auth**: JWT-based with cookie storage
- **API**: tRPC for type-safe endpoints
- **Real-time**: Socket.IO for WebRTC signaling
- **Build**: esbuild (outputs to `dist/index.js`)

#### Shared (`shared/`)
- **Purpose**: Type definitions and utilities used by both client and server
- **Contents**: Shared constants, types, validators

#### Drizzle (`drizzle/`)
- **Purpose**: Database schema definitions and migrations
- **ORM**: Drizzle ORM with MySQL
- **Tables**: 56+ tables across multiple schema files

---

## 🛠️ TECH STACK

### Frontend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.1 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.1.7 | Build tool |
| Tailwind CSS | 4.1.14 | Styling |
| Wouter | 3.3.5 | Client-side routing |
| tRPC Client | 11.6.0 | Type-safe API calls |
| TanStack Query | 5.90.2 | Server state management |
| shadcn/ui | Latest | UI components (Radix UI) |
| Socket.IO Client | 4.8.3 | WebRTC signaling |
| Framer Motion | 12.23.22 | Animations |

### Backend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22+ | Runtime |
| Express | 4.21.2 | Web server |
| tRPC Server | 11.6.0 | Type-safe API |
| Drizzle ORM | 0.45.1 | Database ORM |
| MySQL2 | 3.15.0 | MySQL driver |
| Socket.IO | 4.8.3 | WebRTC signaling |
| Stripe | 20.0.0 | Payments |
| FFmpeg | Static | Video assembly |
| Jose | 6.1.0 | JWT handling |

### Database & Infrastructure
| Technology | Purpose |
|------------|---------|
| MySQL/TiDB | Primary database |
| AWS S3 | File storage |
| Railway | Hosting platform |
| Stripe | Payment processing |

### AI & Media Services
| Technology | Purpose |
|------------|---------|
| RealGPT | KINGCAM personality system |
| LLM Integration | Script generation |
| TTS | Voice synthesis |
| FFmpeg | Video assembly |

---

## 🗄️ DATABASE ARCHITECTURE

### Schema Overview

The database uses **Drizzle ORM** with **MySQL** and contains **56+ tables** organized into modules:

#### Core Tables
- `users` - User accounts with role-based access (user, creator, influencer, celebrity, admin, king)
- `brand_affiliations` - Multi-brand support
- `cultural_content_templates` - Localized messaging

#### VaultLive Streaming
- `live_streams` - Active and past streams
- `live_stream_viewers` - Real-time viewer tracking
- `live_stream_tips` - Tip transactions
- `live_stream_donations` - Donation transactions
- `live_stream_analytics` - Stream performance metrics

#### Content Generation
- `video_generation_jobs` - Video creation tasks
- `video_scenes` - Individual video scenes
- `video_assets` - Scene assets (voice, images)
- `viral_analyses` - Content performance analysis
- `thumbnail_analyses` - Thumbnail optimization

#### Revenue & Payments
- `marketplace_orders` - Product purchases
- `commission_events` - TriLayer commission tracking
- `payouts` - Creator payouts
- `subscriptions` - Subscription management

#### Emma Network (Dominican Sector)
- `emma_network` - 2,000+ Dominican creator tracking
- Tracks: Tinder, Instagram, TikTok, WhatsApp profiles
- Commission tracking and recruitment metrics

#### Social Media
- `social_profiles` - Connected accounts
- `social_posts` - Published content
- `social_metrics_daily` - Daily analytics

#### Podcasting
- `podcasts` - Podcast shows
- `podcast_episodes` - Individual episodes
- `podcast_analytics` - Performance tracking
- `podcast_revenue` - Monetization data

### Key Schema Patterns

```typescript
// Example: User table with CreatorVault extensions
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", [
    "user", "creator", "influencer",
    "celebrity", "admin", "king"
  ]).default("user").notNull(),

  // Emma network fields
  language: varchar("language", { length: 10 }).default("en"),
  country: varchar("country", { length: 2 }),
  referredBy: int("referred_by"),

  // Manual payment handles
  cashappHandle: varchar("cashapp_handle", { length: 100 }),
  paypalEmail: varchar("paypal_email", { length: 320 }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### Database Access Patterns

1. **Import from schema**: `import { users, liveStreams } from '../drizzle/schema'`
2. **Access via context**: `ctx.db` in tRPC procedures
3. **Use Drizzle query builder**:
   ```typescript
   const streams = await ctx.db.select().from(liveStreams).where(...)
   ```

---

## 🔌 TRPC API STRUCTURE

### tRPC Setup

CreatorVault uses **tRPC v11** for end-to-end type safety between client and server.

**Key files:**
- `server/_core/trpc.ts` - tRPC initialization and middleware
- `server/_core/context.ts` - Request context (user, db)
- `client/src/lib/trpc.ts` - Client configuration

### Procedure Types

```typescript
// Public - No authentication required
export const publicProcedure = t.procedure;

// Protected - Requires authenticated user
export const protectedProcedure = t.procedure.use(requireUser);

// Admin - Requires admin role
export const adminProcedure = t.procedure.use(requireAdmin);
```

### Router Structure

**17 main routers** in `server/routers/`:

#### Core Routers
- `auth` - Authentication (login, signup, logout)
- `users` - User management
- `waitlist` - Waitlist management

#### VaultLive Router (`vaultLive.ts`)
15 procedures:
- `startStream` - Create live stream
- `endStream` - End stream
- `getActiveStreams` - List active streams
- `sendTip` - Send tip to creator
- `sendDonation` - Send donation
- `getStreamAnalytics` - Get stream metrics
- `getViewerCount` - Real-time viewer count
- `calculateRevenue` - Revenue split calculation
- And 7 more...

#### Creator Tools Router (`creatorTools.ts`)
10+ procedures:
- `generateViralHooks` - AI hook generation
- `analyzeThumbnail` - Thumbnail optimization
- `optimizeAd` - Facebook ad analysis
- `schedulePost` - Content scheduling
- And more...

#### Marketplace Router (`marketplace.ts`)
- Product listing and management
- Order processing
- Commission calculations

#### Other Key Routers
- `adultSalesBot` - Conversation state machine
- `adultVerification` - Age verification
- `emmaNetwork` - Dominican creator network
- `commandHub` - System commands
- `systemRegistry` - System state
- `orchestrator` - Content orchestration
- `podcastStudio` - Podcast management
- `platformPosting` - Multi-platform publishing
- `subscriptions` - Subscription management
- `telegram` - Telegram bot integration

### Example Router Pattern

```typescript
import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';

export const exampleRouter = router({
  getExample: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // ctx.user is guaranteed to exist (protectedProcedure)
      // ctx.db is the Drizzle database instance
      return await ctx.db.select().from(examples).where(...)
    }),

  createExample: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Mutations modify data
      return await ctx.db.insert(examples).values({
        name: input.name,
        userId: ctx.user.id,
      })
    }),
});
```

---

## 💻 DEVELOPMENT WORKFLOW

### Getting Started

```bash
# Install dependencies (use pnpm only)
pnpm install

# Set up environment variables
cp .env.example .env  # Then edit .env with your credentials

# Push database schema
pnpm db:push

# Start development server
pnpm dev  # Runs on http://localhost:5000
```

### Development Mode

**Command**: `pnpm dev`

- Runs server with `tsx watch` for hot reload
- Vite dev server for frontend with HMR
- Socket.IO for WebRTC signaling
- Database connection required

**Environment**: `NODE_ENV=development`

### Building for Production

```bash
# Type check first
pnpm check

# Run tests
pnpm test

# Build frontend and backend
pnpm build

# Start production server
pnpm start
```

### Database Workflow

```bash
# Generate migration from schema changes
pnpm db:push

# Schema files are in drizzle/schema*.ts
# Migrations are auto-generated in drizzle/migrations/
```

### Code Quality

```bash
# TypeScript type checking
pnpm check

# Format code with Prettier
pnpm format

# Run tests
pnpm test
```

---

## 📐 CODE CONVENTIONS

### File Naming

- **Components**: PascalCase - `CreatorDashboard.tsx`
- **Services**: camelCase - `videoStudio.ts`
- **Routers**: camelCase - `vaultLive.ts`
- **Utilities**: camelCase - `helpers.ts`
- **Types**: PascalCase - `types/User.ts`

### Import Patterns

```typescript
// External libraries first
import { useState } from 'react';
import { z } from 'zod';

// Internal imports with path aliases
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { BRAND_COLORS } from '@shared/constants';

// Relative imports last
import { helper } from './helpers';
```

### TypeScript Conventions

- **Use strict mode**: All files must type check
- **No `any` types**: Use `unknown` or proper types
- **Zod for validation**: All user inputs validated with Zod schemas
- **Type inference**: Leverage tRPC's automatic type inference

### Component Patterns

```typescript
// Prefer function components
export function CreatorDashboard() {
  const { data: user } = trpc.users.me.useQuery();

  return (
    <div className="container mx-auto p-4">
      {/* Use Tailwind utilities */}
      {/* Use shadcn/ui components */}
    </div>
  );
}
```

### Service Patterns

```typescript
// Services are pure functions or classes
// Export clear interfaces
export async function generateVideo(options: VideoOptions) {
  // Business logic here
  return result;
}
```

### Error Handling

```typescript
// Use tRPC errors
import { TRPCError } from '@trpc/server';

throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid input',
});

// Common codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, BAD_REQUEST
```

### Database Queries

```typescript
// Use Drizzle query builder
const streams = await ctx.db
  .select()
  .from(liveStreams)
  .where(eq(liveStreams.creatorId, ctx.user.id))
  .orderBy(desc(liveStreams.createdAt))
  .limit(10);
```

---

## 🧩 KEY SYSTEMS

### Authentication System

**Location**: `server/_core/oauth.ts`, `server/_core/context.ts`

- JWT-based authentication
- Stored in HTTP-only cookies
- User context available in all protected procedures
- Supports multiple OAuth providers

### VaultLive Streaming

**Location**: `server/routers/vaultLive.ts`, `server/services/stripeVaultLive.ts`

- WebRTC peer-to-peer streaming
- Socket.IO for signaling
- Real-time viewer tracking
- 85/15 revenue split
- Stripe integration for tips/donations

### KINGCAM AI Clone

**Location**: `server/_core/realGPT.ts`, `server/services/kingcamScriptGenerator.ts`

- RealGPT personality system (50+ Laws, 7 Identity Modes)
- Autonomous script generation
- Multi-scene video assembly
- TTS voice synthesis
- Cultural adaptation (Dominican, Adult sectors)

### Video Generation Pipeline

**Location**: `server/services/videoStudio.ts`, `server/services/videoAssembly.ts`

1. Script generation (kingcamScriptGenerator)
2. Scene breakdown (videoStudio)
3. Voice synthesis (TTS)
4. Image generation (imageGeneration)
5. FFmpeg assembly (videoAssembly)

### Revenue System

**Location**: `server/services/vaultPay.ts`, `server/services/manualPayRevenue.ts`

- **VaultLive**: 85% creator / 15% platform
- **TriLayer**: 70% creator / 20% recruiter / 10% platform
- Stripe Checkout integration
- Manual payment support (CashApp, Zelle, ApplePay)
- Commission tracking and payouts

### Emma Network

**Location**: `server/routers/emmaNetwork.ts`, `server/services/emmaNetwork.ts`

- Dominican creator recruitment
- 2,000+ creator database
- Social profile tracking (Tinder, Instagram, TikTok, WhatsApp)
- Commission and engagement metrics
- Spanish localization

### Multi-Platform Posting

**Location**: `server/services/platformPosting.ts`

- Post to TikTok, Instagram, YouTube, Twitter, Facebook
- OAuth-based authentication
- Content scheduler
- Performance analytics

---

## 🧪 TESTING

### Test Framework

**Framework**: Vitest
**Command**: `pnpm test`

### Test Files

Located alongside source files with `.test.ts` suffix:

```
server/services/
├── vaultPay.ts
├── vaultPay.test.ts         # Tests for vaultPay
├── dayShiftDoctor.ts
└── dayShiftDoctor.test.ts   # Tests for dayShiftDoctor
```

### Test Coverage

**VaultLive**: 20/20 tests passing
- Revenue split calculations
- Viewer tracking
- Analytics generation
- Commission calculations

**Adult Sales Bot**:
- Conversation state machine
- Buyer tagging
- Safety guardrails

**Viral Optimizer**:
- Scoring algorithms
- LLM integration
- Hook generation

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test vaultlive

# Watch mode
pnpm test --watch
```

---

## 🚀 DEPLOYMENT

### Platform

**Railway** - Recommended deployment platform

### Configuration Files

- `nixpacks.toml` - Nixpacks build configuration
- `.env` - Environment variables (not in git)
- `package.json` - Build scripts

### Environment Variables

**Required**:
```bash
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Optional** (Stripe can be disabled):
- Stripe variables are optional
- Platform works without payment processing
- Manual payments still available

### Build Process

```bash
# Railway runs this automatically
pnpm install
pnpm build
pnpm start
```

**Build outputs**:
- Frontend: `dist/public/` (Vite bundle)
- Backend: `dist/index.js` (esbuild bundle)

### Port Configuration

- Development: Port 5000
- Production: Port from `$PORT` env var (Railway provides this)

### Deployment Checklist

1. Push code to GitHub
2. Connect Railway to repo
3. Add environment variables
4. Deploy automatically
5. Verify database connection
6. Test Stripe webhooks (if using Stripe)

See `RAILWAY_DEPLOY_INSTRUCTIONS.md` for detailed guide.

---

## 🎨 BRAND STANDARDS

### The Dopest App Standard

**This is not a slogan. This is a STANDARD.**

CreatorVault maintains the highest standards:
- **Real-world tested**: Built from creator experience
- **Creator-first economics**: 85% revenue split
- **AI autonomy**: Content creates itself
- **Zero bullshit**: No fake metrics, no placeholder logic
- **Technical excellence**: Type-safe, tested, scalable

### Brand Colors

```typescript
// From DOPEST_APP_STANDARDS.md
{
  cyan: '#00B4D8',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#FF6B35'
}
```

### Logo Usage

- **White version**: Dark backgrounds (`/logo-white.png`)
- **Black version**: Light backgrounds (`/logo-black.png`)
- **Location**: `client/public/` and `assets/`

### Voice & Tone

- Confident, real, direct
- Street-smart + tech excellence
- Empowering, not exploitative
- "Built for creators, by a creator"

### Quality Standards

1. **No fake features**: Every feature must work end-to-end
2. **No placeholder logic**: No `// TODO` in production code
3. **No vanity metrics**: Track what matters
4. **Creator-first**: Every decision serves creators
5. **Technical excellence**: Type-safe, tested, performant

See `DOPEST_APP_STANDARDS.md` for full brand guide.

---

## 🤖 AI ASSISTANT GUIDELINES

### Core Principles for AI Assistants

When working with this codebase, AI assistants should:

#### 1. Understand the Mission

CreatorVault is **not just another app**. It's a creator empowerment platform built from real-world experience. Every feature serves creators, not the platform.

**Before making changes**, ask:
- Does this serve creators?
- Does this maintain the 85% split?
- Does this uphold "The Dopest App" standard?

#### 2. Maintain Type Safety

- **All code must type check**: Run `pnpm check` before committing
- **Use Zod for validation**: All user inputs must be validated
- **Leverage tRPC types**: Let TypeScript infer types automatically
- **No `any` types**: Use proper types or `unknown`

#### 3. Follow Existing Patterns

**Don't reinvent wheels**. Study existing code:

- **New tRPC procedure?** Look at `server/routers/vaultLive.ts`
- **New service?** Look at `server/services/videoStudio.ts`
- **New component?** Look at `client/src/pages/CreatorDashboard.tsx`
- **Database query?** Look at existing Drizzle usage

#### 4. Test Your Changes

- Run `pnpm check` for TypeScript errors
- Run `pnpm test` for unit tests
- Test in browser for UI changes
- Verify database queries return expected data

#### 5. Respect the Database

- **Don't break migrations**: Database changes are permanent
- **Use Drizzle ORM**: Don't write raw SQL unless necessary
- **Index important columns**: Check `drizzle/schema.ts` for patterns
- **Consider existing data**: Migrations must handle existing records

#### 6. Brand Consistency

- Use brand colors from `DOPEST_APP_STANDARDS.md`
- Maintain confident, direct tone
- No fake features or placeholder logic
- Quality over speed

#### 7. Security First

- Never expose secrets in code
- Validate all user inputs
- Use protectedProcedure for authenticated endpoints
- Sanitize data before database insertion
- Use Stripe properly (test mode for development)

#### 8. Performance Matters

- Don't load unnecessary data
- Use database indexes
- Optimize images and videos
- Lazy load components when appropriate
- Monitor bundle size

### Common Tasks

#### Adding a New Page

1. Create component in `client/src/pages/NewPage.tsx`
2. Add route in `client/src/App.tsx`
3. Update navigation if needed
4. Add tRPC queries for data
5. Test authentication if protected

#### Adding a New tRPC Procedure

1. Create/edit router in `server/routers/yourRouter.ts`
2. Define Zod schema for input validation
3. Use appropriate procedure type (public/protected/admin)
4. Implement business logic
5. Export from `server/_core/systemRouter.ts`
6. Use in client with `trpc.yourRouter.yourProcedure.useQuery()`

#### Adding a New Database Table

1. Define schema in `drizzle/schema.ts` or related schema file
2. Run `pnpm db:push` to generate migration
3. Review generated migration in `drizzle/migrations/`
4. Test migration on development database
5. Update related types and queries

#### Adding a New Service

1. Create file in `server/services/yourService.ts`
2. Export clear function interfaces
3. Keep business logic separate from routers
4. Add tests in `server/services/yourService.test.ts`
5. Import and use in routers

### What NOT to Do

❌ **Don't** create placeholder features
❌ **Don't** use `any` types
❌ **Don't** skip validation
❌ **Don't** bypass authentication
❌ **Don't** write raw SQL (use Drizzle)
❌ **Don't** commit broken TypeScript
❌ **Don't** ignore tests
❌ **Don't** change brand colors
❌ **Don't** reduce creator revenue splits
❌ **Don't** add features that exploit creators

### When to Ask Questions

If you're unsure about:
- Business logic (what should this feature do?)
- Brand guidelines (is this tone correct?)
- Architecture decisions (should this be a new service?)
- Database changes (will this break existing data?)
- Security implications (is this safe?)

**Ask the developer/owner** before proceeding.

### Debugging Workflow

When issues arise:

1. **Check TypeScript errors**: `pnpm check`
2. **Check server logs**: Look for tRPC errors
3. **Check browser console**: Look for React/tRPC errors
4. **Check database**: Verify data exists and is correct
5. **Check authentication**: Ensure user is logged in
6. **Check environment variables**: Verify all required vars are set

### Key Code Locations for Common Tasks

| Task | Location |
|------|----------|
| Authentication | `server/_core/oauth.ts` |
| User context | `server/_core/context.ts` |
| Database schema | `drizzle/schema.ts` |
| tRPC setup | `server/_core/trpc.ts` |
| Client tRPC setup | `client/src/lib/trpc.ts` |
| Routing | `client/src/App.tsx` |
| VaultLive streaming | `server/routers/vaultLive.ts` |
| Video generation | `server/services/videoStudio.ts` |
| Revenue calculations | `server/services/vaultPay.ts` |
| Creator tools | `server/routers/creatorTools.ts` |
| Emma Network | `server/routers/emmaNetwork.ts` |

---

## 📚 ADDITIONAL RESOURCES

### Documentation Files

- `README.md` - Project overview and quick start
- `DOPEST_APP_STANDARDS.md` - Brand standards and principles
- `RAILWAY_DEPLOY_INSTRUCTIONS.md` - Deployment guide
- `VAULTLIVE_VERIFICATION_PROTOCOL.md` - VaultLive testing guide
- `STRIPE_E2E_TEST_INSTRUCTIONS.md` - Payment testing guide
- `BRAND_ASSETS.md` - Logo and asset usage
- `OWNER_HANDOFF.md` - System ownership transfer guide

### External Documentation

- [tRPC Docs](https://trpc.io) - API framework
- [Drizzle ORM Docs](https://orm.drizzle.team) - Database ORM
- [React 19 Docs](https://react.dev) - Frontend framework
- [Tailwind CSS Docs](https://tailwindcss.com) - Styling
- [shadcn/ui Docs](https://ui.shadcn.com) - UI components
- [Stripe Docs](https://stripe.com/docs) - Payments

---

## 🦁 FINAL NOTES

### The Standard

**"The Dopest App in the World"** is not marketing. It's a **commitment to excellence**.

Every line of code, every feature, every decision must uphold this standard:
- ✅ Does it empower creators?
- ✅ Is it technically excellent?
- ✅ Is it real and tested?
- ✅ Does it maintain creator-first economics?

If the answer is no to any of these, **don't ship it**.

### The Mission

Built by **KingCam** (Cameron), a real creator who spent 7+ years grinding. This platform exists to **serve creators**, not extract from them.

**No permission needed to shine.**

---

**END OF CLAUDE.MD**

*Last Updated: 2025-01-24*
*Version: 1.0*
*Maintained by: CreatorVault Team*
