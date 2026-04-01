# CreatorVault Unified UX Architecture: Social + University + Marketplace
**Date:** April 1, 2026 | **Author:** Manus AI | **Status:** Approved for Implementation

## 1. FEED ARCHITECTURE

### Layout
- **Visual-First Structure:** 3-zone spatial layout.
  - **Left (20%):** Navigation & Quick Filters (Wins, Lessons, Drops).
  - **Center (55%):** The Stream. Full-bleed editorial cards. No borders. No drop shadows.
  - **Right (25%):** The Radar (Trending Drops, Recommended Courses, Active Opportunities).
- **Desktop vs Mobile:** On mobile, Left and Right zones collapse into swipeable horizontal rails above and below The Stream.

### Post Card Types
1. **Organic Post:** Full-bleed image/video. Text is overlaid as a semi-transparent gradient at the bottom.
2. **Proof Drop:** A split card. Top half: The visual proof (e.g., Stripe dashboard screenshot). Bottom half: The metric (e.g., "$1,200 in 24h") in aged gold.
3. **Lesson Snippet (University):** A cinematic video player with a "VaultU" watermark. Tapping plays the clip inline; a "Take Full Lesson" button sits at the bottom.
4. **Product Drop (Marketplace):** A 3D-style render of the digital product. A bold "Acquire" button replaces the standard "Like" button.
5. **Monetization Insight:** A dark charcoal card with bone text. AI-generated insight based on the user's current platform behavior.

### Recommendation & Sorting Logic
- **Algorithm:** Ranks by engagement velocity (likes/comments per minute) and revenue relevance.
- **Labeling System:** Recommendations are clearly labeled with a subtle gold badge in the top-right corner: `Recommended Lesson`, `Trending Drop`, `Smart Insight`.

---

## 2. CREATOR PROFILE ARCHITECTURE

### Layout: The "Digital Atelier"
- **Visual Header:** A cinematic, full-width banner. The creator's avatar is a large, sharp square, not a circle.
- **Identity Rail (Top):** Name, Niche (e.g., "YouTube Automation"), and Role Badge (e.g., "👑 King").
- **Proof of Wins Area:** A horizontal scroll of verified revenue metrics and milestones, styled as Bloomberg-style ticker cards.
- **Monetization Readiness Gauge:** A visual circular meter showing the creator's revenue potential (e.g., "85% Ready to Launch").

### Sections (Tabs)
1. **The Stream:** The creator's social posts and Proof Drops.
2. **The Showcase (Marketplace):** A visual grid of the creator's digital products. Each product is a large, editorial card with a direct "Acquire" button.
3. **The Vault (University):** Courses completed and active learning paths. Acts as social proof of their expertise.

---

## 3. POST COMPOSER ARCHITECTURE

### Layout: The Spatial Composer
- **Canvas-First:** The composer opens as a full-screen overlay. The background is a blurred version of the feed. The center is a large, blank canvas.
- **Media-First:** The user is prompted to drag and drop media before typing. If no media is provided, the background defaults to a premium gradient.
- **Control Rail (Right):** Contextual tools appear as a vertical rail, not a form.
  - **Tag Product:** Opens a drawer to select a Marketplace product to attach.
  - **Tag Lesson:** Opens a drawer to select a University course clip to attach.
  - **Mark as Proof:** Toggles the "Proof Drop" styling.

### AI Assistance Layer
- **Smart Prompts:** As the user types, subtle text suggestions appear below the canvas (e.g., "Add your revenue metric to make this a Proof Drop").
- **Cross-Platform Adaptation:** A toggle switch at the bottom allows the user to generate YouTube Community, X, and Instagram variations of the post instantly.

---

## 4. MONETIZATION EDUCATION SYSTEM

### Placement & Triggering
- **In-Feed Insights:** Inserted every 10-15 organic posts. These are context-aware. If the user recently viewed a TikTok growth post, the insight will be about TikTok monetization.
- **Composer Overlays:** When a user creates a post about a specific platform, an "Insight" overlay appears (e.g., "Did you know you can link a Marketplace product directly in your YouTube description?").
- **Creator Stage Adaptation:**
  - **Beginner:** Focuses on audience building and first-dollar strategies.
  - **Intermediate:** Focuses on digital product creation and affiliate marketing.
  - **Advanced:** Focuses on high-ticket services and subscriptions.

### "Next Money Move" Guidance
- A persistent, subtle widget in the Right Zone (The Radar). It provides one clear, actionable step based on the user's data (e.g., "Your YouTube audience is growing. Time to launch a $47 playbook.").

---

## 5. UNIVERSITY INTEGRATION PATTERNS

### Social to Learning Pipeline
- **Course Snippets:** 30-60 second clips from University lessons can be shared natively in the feed. They play inline.
- **Frictionless Transition:** Tapping "Take Full Lesson" on a snippet opens the University player in a modal overlay, without leaving the social context.
- **Behavior Triggers:** If a user searches for "sponsorships," the feed will prioritize surfacing University lessons on brand deals.

### Learning to Social Pipeline
- **Automated Proof:** When a user completes a high-value module, the system prompts them to share a "Milestone Drop" to the feed, reinforcing their status and promoting the course.

---

## 6. MARKETPLACE INTEGRATION PATTERNS

### Social to Commerce Pipeline
- **In-Feed Merchandising:** Product Drops appear as premium, 3D-rendered cards in the feed. They do not look like banner ads; they look like exclusive releases.
- **One-Click Purchasing:** Tapping "Acquire" on a Product Drop opens a slide-up drawer with Apple Pay/Stripe integration. The user never leaves the feed.
- **Proof Connection:** When a creator posts a Proof Drop (e.g., a successful launch), they can tag the exact Marketplace template they used. Users viewing the proof can buy the template instantly.

---

## 7. KEY USER FLOWS

### Flow 1: Discover → Prove → Buy
1. User sees a **Proof Drop** in the feed showing a creator made $5k in a week.
2. User taps the creator's avatar to view their **Digital Atelier** (Profile).
3. User sees the exact **Marketplace Product** (e.g., "The $5k Week Playbook") tagged in the Showcase.
4. User taps "Acquire" and completes the purchase via the slide-up drawer.

### Flow 2: Struggle → Learn → Execute
1. User posts a question in the composer: "How do I price my first digital product?"
2. The AI Assistance Layer detects the intent and surfaces a **Monetization Insight** overlay linking to a University lesson on pricing strategy.
3. User taps the insight, watches the lesson in a modal, and applies the knowledge.

---

## 8. DESIGN SYSTEM DIRECTION

### Visual Language
- **Typography:** Playfair Display for all major headers (editorial, authoritative). Inter for body text (clean, readable).
- **Colors:**
  - Backgrounds: `#0a0a0a` (Deep Charcoal)
  - Surfaces: `#141414` (Elevated Charcoal)
  - Text: `#f5f0e8` (Bone)
  - Accents: `#c9a84c` (Aged Gold)
- **Surfaces:** Flat, sharp corners (2px radius max). No drop shadows; use subtle 1px borders (`#ffffff` at 10% opacity) for depth.
- **Interaction:** Premium motion. Drawers slide up smoothly (0.4s ease-out). Modals fade and scale in (0.3s). No bouncy or playful animations.

---

## 9. IMPLEMENTATION PLAN

### Phase 1: The Visual Foundation (Days 1-3)
- **Action:** Rebuild `Feed.tsx` and `CreatorProfilePage.tsx` using the new spatial layout and design system.
- **Affected Files:** `Feed.tsx`, `CreatorProfilePage.tsx`, `DashboardLayout.tsx`, `index.css`.
- **Validation:** Ensure existing tRPC endpoints (`postRouter.ts`, `profileRouter.ts`) populate the new visual structures correctly.

### Phase 2: The Commerce Bridge (Days 4-6)
- **Action:** Integrate Marketplace products natively into the feed and profiles. Implement the one-click slide-up drawer.
- **Affected Files:** `Marketplace.tsx`, `marketplace.ts`, `Feed.tsx` (updated).
- **Validation:** Verify Stripe/payment flow works seamlessly within the drawer without full page reloads.

### Phase 3: The Education Layer (Days 7-9)
- **Action:** Build the Smart Insights engine and University snippet integration.
- **Affected Files:** `University.tsx`, `universityV2Router.ts`, new `MonetizationInsights.tsx` component.
- **Validation:** Test behavior-triggered recommendations based on dummy user activity data.

### Phase 4: The Spatial Composer (Days 10-12)
- **Action:** Replace the current post creation form with the canvas-first Spatial Composer.
- **Affected Files:** New `SpatialComposer.tsx` component, `postRouter.ts` (for handling new attachment types).
- **Validation:** Ensure media uploads, product tags, and course clips save correctly to the DB.

## 10. BLOCKERS & ASSUMPTIONS
- **Assumption:** The current `postRouter.ts` schema can be easily extended to support "Post Card Types" (e.g., adding a `post_type` enum to the `posts` table).
- **Blocker:** The one-click purchasing drawer requires the Stripe Elements implementation to be refactored to work inside a modal rather than a dedicated checkout page. This must be verified before Phase 2 begins.
