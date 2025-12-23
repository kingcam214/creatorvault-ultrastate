# AD & THUMBNAIL FORENSICS — RECOVERY ANALYSIS

## SEARCH RESULTS

### AI Facebook Ad Maker + Optimizer

**FINDINGS:**
- ❌ NO dedicated ad generation service found
- ❌ NO ad_analyses or ad_assets database tables
- ❌ NO tRPC procedures for ad generation
- ❌ NO UI components for ad creation

**PARTIAL LOGIC DISCOVERED:**
- ✅ `server/services/creatorTools.ts` - Has LLM integration for content generation (hooks, captions, broadcasts)
- ✅ `server/_core/imageGeneration.ts` - Has `generateImage()` function for ad creative
- ✅ `server/services/viralOptimizer.ts` - Has scoring algorithms (hook, quality, trend, audience, format) that can be adapted for ad scoring
- ✅ Database pattern exists: `viralAnalyses` table structure can be replicated for `ad_analyses`

**CONCLUSION:**
- Feature does NOT exist in any form
- Building blocks available: LLM, image generation, scoring patterns, database patterns
- **RECOVERY STATUS:** New build required (not recovery)

---

### AI YouTube Thumbnail Maker

**FINDINGS:**
- ❌ NO dedicated thumbnail generation service found
- ❌ NO thumbnail_analyses or thumbnail_assets database tables
- ❌ NO tRPC procedures for thumbnail generation
- ❌ NO UI components for thumbnail creation

**PARTIAL LOGIC DISCOVERED:**
- ✅ `server/_core/imageGeneration.ts` - Has `generateImage()` function for thumbnail creation
- ✅ `server/services/viralOptimizer.ts` - References `thumbnailUrl` in input schema (line 54)
- ✅ `server/services/viralOptimizer.ts` - Has CTR prediction logic (line 327: `predictedCTR`)
- ✅ `server/services/viralOptimizer.ts` - Has thumbnail quality scoring (line 189: `if (input.thumbnailUrl) score += 15`)
- ✅ `server/services/viralOptimizer.ts` - Platform-specific optimizations mention thumbnails (line 288: "strong thumbnail")

**CONCLUSION:**
- Feature does NOT exist in any form
- Thumbnail awareness exists in viral optimizer (scoring, CTR prediction)
- Building blocks available: Image generation, CTR prediction, quality scoring
- **RECOVERY STATUS:** New build required (not recovery)

---

## RECOVERY STRATEGY

Since neither feature exists in the codebase, this is NOT a recovery operation—it's a **NEW BUILD** using existing patterns.

**APPROACH:**
1. **Replicate Viral Optimizer Architecture** - Use `viralOptimizer.ts` as template
2. **Create Ad Optimizer Service** - `server/services/adOptimizer.ts`
3. **Create Thumbnail Generator Service** - `server/services/thumbnailGenerator.ts`
4. **Add Database Tables** - `ad_analyses`, `thumbnail_analyses` (mirror `viralAnalyses` structure)
5. **Wire tRPC Mutations** - Add to `creatorTools` router
6. **Build UI Tabs** - Add to Creator Tools page

**BUILDING BLOCKS AVAILABLE:**
- ✅ LLM integration (`invokeLLM`)
- ✅ Image generation (`generateImage`)
- ✅ Scoring algorithms (7 sub-scores from viral optimizer)
- ✅ Database persistence patterns (`viralAnalyses` table)
- ✅ tRPC router patterns (`creatorTools.runViralOptimizer`)
- ✅ UI patterns (Viral Optimizer tab)

**ESTIMATED EFFORT:**
- Ad Optimizer: 400-500 lines (service + router + UI)
- Thumbnail Generator: 350-450 lines (service + router + UI)
- Database migrations: 2 new tables
- Total: ~2 hours of focused build time

---

## NEXT STEPS

1. Build `adOptimizer.ts` service with Facebook ad copy generation + scoring
2. Build `thumbnailGenerator.ts` service with YouTube thumbnail generation + CTR prediction
3. Add database tables (`ad_analyses`, `thumbnail_analyses`)
4. Wire tRPC mutations to `creatorTools` router
5. Add UI tabs to Creator Tools page
6. Test end-to-end execution
7. Generate proof packet
