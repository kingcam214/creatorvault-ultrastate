# CreatorVault Social + University + Marketplace Unification Strategy
**Date:** April 1, 2026 | **Author:** Manus AI

## Pre-Flight Audit Summary
**Source Materials Reviewed:**
- **Social Pages:** `Feed.tsx`, `CreatorProfilePage.tsx`, `PublicProfile.tsx`, `MonetizationHub.tsx`
- **University Pages:** `University.tsx`, `Courses.tsx`, `ContentScheduler.tsx`
- **Marketplace Pages:** `Marketplace.tsx`, `VaultMarket.tsx`, `MarketplaceProduct.tsx`
- **Backend Routers:** `postRouter.ts`, `followRouter.ts`, `commentRouter.ts`, `universityV2Router.ts`, `marketplace.ts`, `vaultMarketRouter.ts`, `profileRouter.ts`
- **DB Tables:** 663 tables mapped, including `posts`, `follows`, `comments`, `university_courses`, `marketplace_products`, `creator_profiles`
- **Master Docs:** `CREATORVAULT_MASTER_STATE.md`, `CREATORVAULT_VISUAL_FIRST_AUDIT.md`

**Governing Patterns Extracted:**
1. **Visual-First Mandate:** All features must be visual-first, not form-first. The Apparel Lab v5 is the reference implementation.
2. **End-to-End Real:** No shells. Every feature must be wired to real tRPC endpoints and DB tables.
3. **Monetization Focus:** Every feature must drive toward revenue generation.
4. **Luxury Editorial Design:** Playfair Display headers, flat charcoal surfaces, aged gold accents, no pill buttons.

**Contradictions & Gaps Found:**
1. **Fragmentation:** The current `Feed.tsx`, `University.tsx`, and `Marketplace.tsx` are completely siloed. A user in the feed has no contextual path to a relevant course or product.
2. **Form-First Legacy:** Many social and marketplace components still rely on stacked forms and dropdowns, violating the visual-first mandate.
3. **Monetization Education Missing:** The current feed is just content. It does not actively teach monetization or route users to the university/marketplace contextually.

---

## 1. Overall Product Strategy
CreatorVault is not a generic social app; it is a **Creator Operating System**. The social layer acts as the top-of-funnel engagement engine, magnetically drawing creators in and seamlessly routing them to the University (for education) and the Marketplace (for monetization). Every interaction must feel elite, strategic, and revenue-focused.

## 2. Differentiation
- **Generic Social (X, IG, TikTok):** Optimized for doom-scrolling and ad impressions.
- **CreatorVault:** Optimized for creator growth, monetization education, and direct commerce. The feed is a curated stream of wins, lessons, and opportunities, not spam.

## 3. Unified Architecture
The architecture unifies the three pillars into a single, cohesive ecosystem:
- **The Hub (Social):** The central nervous system where identity and engagement live.
- **The Academy (University):** Contextually embedded learning paths triggered by social behavior.
- **The Exchange (Marketplace):** Frictionless commerce embedded directly into profiles and feeds.

## 4. Feed Architecture
**Visual-First Feed:**
- **Full-Bleed Cards:** Posts are rendered as large, editorial cards.
- **Contextual Tags:** Every post is tagged with its primary value (e.g., "Win," "Lesson," "Drop").
- **Embedded Modules:** University courses and Marketplace products appear natively within the feed stream, styled as premium recommendations, not ads.

## 5. Creator Profile Architecture
**The "Digital Atelier":**
- **Identity Banner:** High-impact visual header showcasing niche and status.
- **Proof of Wins:** Verified revenue metrics and milestones.
- **The Showcase:** A visual grid of the creator's digital products (Marketplace) and completed courses (University).
- **Monetization Readiness:** A visual gauge showing the creator's current revenue potential.

## 6. Post Composer Architecture
**Spatial Composer:**
- **Canvas-First:** The composer opens as a full-bleed canvas, not a text box.
- **Smart Attachments:** Drag-and-drop integration for course clips, product promos, and proof drops.
- **Cross-Platform Guidance:** Real-time AI suggestions for adapting the post for YouTube, TikTok, etc.

## 7. Monetization Education System
**Contextual Learning:**
- Education is not siloed. It appears as "Smart Insights" overlays when a creator takes an action (e.g., posting, viewing analytics).
- **Platform-Specific Paths:** Tailored advice for monetizing on specific platforms based on the creator's current activity.

## 8. University Integration Model
**Behavior-Triggered Learning:**
- If a creator posts about struggling with TikTok hooks, the feed surfaces a relevant University micro-lesson.
- **Course Snippets:** Short, high-value video clips from the University are shareable directly into the social feed.

## 9. Marketplace Integration Model
**Native Commerce:**
- Digital products are embedded in creator profiles as visual "Drops."
- Creators can tag their Marketplace products directly in their social posts, enabling one-click purchasing from the feed.

## 10. Key User Journeys
1. **The Discovery Loop:** User sees a "Win" post in the feed → clicks the creator's profile → sees the exact Marketplace template used to achieve the win → purchases.
2. **The Growth Loop:** User posts a question → AI suggests a University lesson → user completes lesson → user posts the result as a "Proof Drop."

## 11. Recommended UX Hierarchy
1. **The Canvas (Primary):** Full-bleed visual content (Feed, Profile).
2. **The Rail (Secondary):** Contextual controls and navigation (Control Rail).
3. **The Overlay (Tertiary):** Smart Insights, course snippets, and quick actions.

## 12. Phased Implementation Plan
- **Phase 1 (Foundation):** Rebuild `Feed.tsx` and `CreatorProfilePage.tsx` using the visual-first spatial layout.
- **Phase 2 (Integration):** Wire `University.tsx` and `Marketplace.tsx` endpoints into the feed and profiles.
- **Phase 3 (Education):** Implement the Smart Insights overlay system for contextual monetization education.

## 13. Affected Routes & Files
- `client/src/pages/Feed.tsx`
- `client/src/pages/CreatorProfilePage.tsx`
- `client/src/pages/University.tsx`
- `client/src/pages/Marketplace.tsx`
- `client/src/components/DashboardLayout.tsx`

## 14. Blockers & Assumptions
- **Assumption:** The existing tRPC endpoints in `postRouter.ts`, `universityV2Router.ts`, and `marketplace.ts` can support the new unified data structures without major backend rewrites.
- **Blocker:** The current `DashboardLayout.tsx` needs to be updated to support the new 3-zone spatial layout across all unified pages.
