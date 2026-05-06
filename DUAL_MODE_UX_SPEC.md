# VaultX Dual-Mode UX System Specification

## 1. Global Mode Rules
The platform operates in two distinct modes: **VaultX Adult Mode** and **General Creator Mode (SFW)**. The mode is determined globally by the `CreatorModeContext` and must be visually obvious and functionally consistent across every tool.

### VaultX Adult Mode (🔞)
- **Target Audience:** Adult content creators, body-positive creators, PPV models.
- **Aesthetic:** Premium, desire-grade, sensual, using purple/gold accents (`#a855f7`).
- **Language:** "VaultX", "PPV", "Desire Grade", "Sensual", "Body Positive", "Teaser".
- **Platforms:** OnlyFans, Fansly, Twitter/X, Reddit, TikTok (SFW funnel), Instagram (SFW funnel).
- **Core Promise:** Uncensored monetization, premium presentation, private model training.

### General Creator Mode (✅)
- **Target Audience:** YouTubers, fitness coaches, gamers, educators, lifestyle vloggers.
- **Aesthetic:** High-energy, clean, professional, using blue/red accents (`#3b82f6`).
- **Language:** "Creator", "Vlog", "Cinematic", "Hype", "Tutorial", "Preview".
- **Platforms:** YouTube, TikTok, Instagram, Facebook, Twitter/X.
- **Core Promise:** Audience growth, viral reach, brand deals, ad revenue.

---

## 2. Global Mode Visibility
The active mode must never be hidden. The user must always know exactly which mode they are operating in.

### AppHeader & DashboardLayout
- A global mode badge must be visible in the `AppHeader` at all times (e.g., next to the user profile or logo).
- The `CreatorModeSwitcher` must be accessible from the main navigation or settings menu.
- The sidebar (`DashboardLayout`) must highlight tools relevant to the active mode (e.g., "VaultX Studio" vs "Video Studio").

---

## 3. Workflow Adaptations

### A. Onboarding (`VaultXOnboarding.tsx` & `CreatorOnboarding.tsx`)
- **Adult Mode:** Focuses on linking OnlyFans/Fansly, setting PPV prices, and establishing a body-positive identity.
- **SFW Mode:** Focuses on linking YouTube/TikTok, selecting a niche (fitness, gaming, etc.), and setting up sponsorships.

### B. SocialHub (`SocialHub.tsx`)
- **Adult Mode:** Highlights Twitter/X and Reddit as primary uncensored distribution channels. TikTok/IG are marked clearly as "SFW Funnel Only".
- **SFW Mode:** Highlights YouTube, TikTok, and Instagram as primary channels.

### C. Viral Optimizer (`ViralOptimizer.tsx`)
- **Adult Mode:** Analyzes content for PPV conversion, teaser compliance (avoiding shadowbans), and desire-grade aesthetics.
- **SFW Mode:** Analyzes content for algorithm retention, click-through rate (CTR), and engagement hooks.

### D. Challenges (`VaultXChallenges.tsx`)
- **Adult Mode:** "$5K PPV Challenge", focusing on subscriber acquisition and PPV sales.
- **SFW Mode:** "100K Views Challenge", focusing on subscriber growth and ad revenue.

### E. VaultRemix & Thumbnail Generator (Already Implemented)
- Ensure all copy, prompts, and output labels strictly adhere to the mode language defined in Section 1.

---

## 4. Implementation Checklist for New Tools
Any new tool added to the platform MUST support dual-mode. Follow this 3-step checklist:

1. **Import Context:**
   ```tsx
   import { useCreatorMode } from "@/contexts/CreatorModeContext";
   ```
2. **Read Mode:**
   ```tsx
   const creatorMode = useCreatorMode();
   ```
3. **Apply Mode-Aware Config:**
   - Use `creatorMode.isAdult` to toggle copy (e.g., `creatorMode.isAdult ? "PPV Teaser" : "YouTube Short"`).
   - Use `creatorMode.accentColor` for styling buttons and borders.
   - Use `creatorMode.platformOptions` for dropdowns.

---

## 5. Rollout Plan
1. **Phase 1 (Immediate):** Deploy global mode badge in `AppHeader` and update `CreatorModeContext` to enforce visibility.
2. **Phase 2 (Next 24h):** Refactor `SocialHub`, `ViralOptimizer`, and `VaultXChallenges` to consume `useCreatorMode`.
3. **Phase 3 (Next 48h):** Audit all remaining tools in `CreatorToolbox` and apply the 3-line integration.
4. **Phase 4 (Launch):** Full QA pass to ensure no "SFW" language leaks into "Adult Mode" and vice versa.
