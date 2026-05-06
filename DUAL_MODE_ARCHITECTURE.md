# Dual-Mode Creator Architecture
## VaultX (Adult) ↔ General Creator (SFW)

---

## Overview

Every tool on the platform — VaultRemix, Thumbnail Generator, Viral Optimizer, Teaser Factory, Batch Ops, and all future tools — automatically adapts to the creator's mode without any code changes. The mode is set **once** in the creator's profile and propagates everywhere.

---

## How It Works

### The Single Source of Truth: `CreatorModeContext`

```
client/src/contexts/CreatorModeContext.tsx
```

This React context:
1. Reads the user's `contentType` array from their profile (already stored in the `users` table)
2. Detects adult mode if `contentType` contains: `adult`, `vaultx`, `nsfw`, `body_positive`, `onlyfans`, `fansly`, `18+`
3. Falls back to a `localStorage` override so creators can manually switch
4. Exposes a `useCreatorMode()` hook that every tool imports

### What Every Tool Gets From `useCreatorMode()`

| Property | Adult Mode (VaultX) | SFW Mode (General Creator) |
|---|---|---|
| `isAdult` | `true` | `false` |
| `mode` | `"adult"` | `"sfw"` |
| `niche` | `"adult creator / body positive"` | User's first contentType or "general creator" |
| `styleOptions` | Desire Grade, Velvet, Sunrise, Midnight, Natural | Vibrant, Cinematic, Clean, Moody, Natural |
| `platformOptions` | OnlyFans, Fansly, TikTok (SFW), Instagram, X, Reddit | TikTok, Instagram, YouTube, X, LinkedIn, Pinterest |
| `thumbnailNiches` | Body Positive, PPV Teaser, Creator Lifestyle, Behind Scenes, Drop Announcement | YouTube Vlog, Tutorial, Fitness, Food, Business, Gaming, Beauty, Travel |
| `teaserContext` | SFW teaser for adult content — desire-grade aesthetic | Engaging preview clip — high-energy, click-worthy |
| `batchLabel` | "VaultX Content Library" | "Content Library" |
| `accentColor` | `#a855f7` (purple) | `#3b82f6` (blue) |
| `modeBadge` | "VaultX Adult" | "General Creator" |

---

## Tools That Are Already Dual-Mode

### ✅ VaultRemix
- Style grade options change based on mode
- Platform options in Viral Optimizer tab change based on mode
- AI niche prompt changes based on mode
- Header subtitle changes based on mode
- Mode switcher badge shown in header
- Batch label changes based on mode

### ✅ Thumbnail Generator
- Niche selector shows adult niches (Body Positive, PPV Teaser, etc.) in adult mode
- Niche selector shows standard niches (YouTube, Tutorial, etc.) in SFW mode
- Style options change (desire_grade, velvet, intimate vs youtube, tiktok, cinematic)
- AI prompts include adult creator context in adult mode
- Accent color changes (purple vs red)
- Mode info badge shown in controls panel

---

## How to Make Any New Tool Dual-Mode

Adding dual-mode to a new tool takes **3 lines of code**:

```tsx
// 1. Import the hook
import { useCreatorMode } from "@/contexts/CreatorModeContext";

// 2. Call it in the component
const creatorMode = useCreatorMode();

// 3. Use the config
const platforms = creatorMode.platformOptions;  // auto-adapts
const niche = creatorMode.niche;                // auto-adapts
const styles = creatorMode.styleOptions;        // auto-adapts
const isAdult = creatorMode.isAdult;            // branch on this
```

---

## How Mode Is Set

### Automatic (from profile)
When a creator signs up and selects their content type during onboarding, the `contentType` field is set on their user record. If it contains any adult-related value, they're automatically in adult mode.

### Manual Override (UI)
The `<CreatorModeSwitcher />` component can be dropped anywhere:
```tsx
// Compact badge (used in tool headers)
<CreatorModeSwitcher compact />

// Full switcher (used in settings/profile)
<CreatorModeSwitcher />
```

The override is stored in `localStorage` and persists across sessions.

---

## Soft Launch Plan

### Phase 1: VaultX Soft Launch (NOW)
- All tools default to adult mode for VaultX creators
- `contentType: ["adult"]` set during VaultX onboarding
- Revenue focus: PPV campaigns, teaser generation, content remixing

### Phase 2: General Creator Launch
- New onboarding flow for SFW creators
- `contentType: ["fitness"]`, `["beauty"]`, `["gaming"]`, etc.
- All tools automatically show SFW options — zero code changes needed
- Same codebase, same tools, different context

### Phase 3: Vertical-Specific Packs
- Fitness creators get fitness-specific style grades and thumbnail niches
- Gaming creators get gaming-specific options
- Each vertical just needs new entries in the `CreatorModeContext` config arrays

---

## Database

No new database columns needed. The existing `contentType` JSON field on the `users` table already supports this:

```sql
-- Adult creator
UPDATE users SET content_type = '["adult", "body_positive"]' WHERE id = ?;

-- Fitness creator  
UPDATE users SET content_type = '["fitness", "wellness"]' WHERE id = ?;

-- Gaming creator
UPDATE users SET content_type = '["gaming", "esports"]' WHERE id = ?;
```

---

## Files Changed

| File | Change |
|---|---|
| `client/src/contexts/CreatorModeContext.tsx` | **NEW** — The dual-mode context, hook, and switcher component |
| `client/src/App.tsx` | Added `<CreatorModeProvider>` wrapper |
| `client/src/pages/VaultRemix.tsx` | **REBUILT** — Full 5-tab tool wired to real routers, dual-mode aware |
| `client/src/pages/ThumbnailGeneratorUI.tsx` | **UPGRADED** — Dual-mode niche selector, styles, and AI prompts |
