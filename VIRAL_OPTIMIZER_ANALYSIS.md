# Viral Optimizer - Code Analysis & Recovery Plan

## EXISTING VIRAL LOGIC LOCATIONS

### 1. **server/viralOptimizer.ts** (PRIMARY SERVICE - 406 lines)
**Status:** ✅ Exists but uses SQLite, not MySQL
**Key Components:**
- `ViralOptimizerService` class with full analysis logic
- `analyzeContent()` - Main analysis function
- Scoring algorithms: hookScore, qualityScore, trendScore, audienceScore, formatScore, timingScore, platformScore
- `calculateViralScore()` - Weighted average (0-100)
- `generateWeaknesses()` and `generateRecommendations()`
- `optimizeContent()` - Returns optimized version
- `createPredictedMetrics()` - Predicts views, engagement, CTR, retention
- Database operations for `viral_analyses` and `viral_metrics`

**PROBLEM:** Uses SQLite (`better-sqlite3`) instead of MySQL/Drizzle ORM

---

### 2. **server/services/creatorTools.ts** (PARTIAL IMPLEMENTATIONS)
**Status:** ⚠️ Fragmented - individual functions, no unified pipeline
**Key Components:**
- `generateViralHooks()` - LLM-powered hook generation (5 hooks)
- `analyzeViralPotential()` - LLM-powered analysis with JSON schema
  - Returns: score (0-100), strengths[], improvements[], suggestions[]
- No database persistence
- No connection to viralOptimizer.ts

---

### 3. **server/services/commandHub.ts** (COMMAND HUB INTEGRATION)
**Status:** ⚠️ Simplified implementation, writes to database
**Key Components:**
- `executeViralAnalysis()` - Inserts to `viralAnalyses` table
- Uses random scores (60-100) - placeholder logic
- Writes to database via Drizzle ORM
- Returns commandId and output

**PROBLEM:** Uses random scores, not real analysis logic

---

### 4. **Database Schema (drizzle/schema.ts)**
**Status:** ✅ Fully defined
**Tables:**
- `viralAnalyses` - Stores analysis results
  - Fields: title, description, tags, duration, platform
  - Scores: viralScore, hookScore, qualityScore, trendScore, audienceScore, formatScore, timingScore
  - Output: weaknesses (JSON), recommendations (JSON), optimizedTitle, optimizedDescription, optimizedTags
- `viralMetrics` - Stores predicted and actual metrics
  - Predicted: views, engagement, CTR, retention
  - Actual: views, engagement, CTR, retention
  - Timestamps: publishedAt, lastUpdatedAt

---

### 5. **tRPC Routers**
**Status:** ⚠️ Multiple disconnected endpoints

**server/routers/creatorTools.ts:**
- `generateViralHooks` - Calls `creatorTools.generateViralHooks()`
- `analyzeViralPotential` - Calls `creatorTools.analyzeViralPotential()`
- No database persistence

**server/routers/commandHub.ts:**
- `runViralAnalysis` - Calls `commandHub.executeViralAnalysis()`
- Writes to database but uses placeholder logic

---

### 6. **Creator Tools UI (client/src/pages/CreatorTools.tsx)**
**Status:** ⚠️ Calls individual functions, no unified optimizer
**Current Behavior:**
- "Viral Hooks" tab calls `trpc.creatorTools.generateViralHooks`
- "Analyzer" tab calls `trpc.creatorTools.analyzeViralPotential`
- Results displayed but NOT persisted
- No connection to database-backed optimizer

---

## DISCONNECTIONS IDENTIFIED

1. **viralOptimizer.ts uses SQLite, rest of system uses MySQL/Drizzle**
   - Cannot integrate without rewriting database layer

2. **creatorTools.ts functions don't persist to database**
   - Results disappear on page refresh

3. **commandHub.executeViralAnalysis() uses placeholder logic**
   - Writes to database but scores are random

4. **No single canonical pipeline**
   - 3 different execution paths (viralOptimizer.ts, creatorTools.ts, commandHub.ts)
   - UI calls creatorTools.ts (no persistence)
   - commandHub.ts persists but uses fake data
   - viralOptimizer.ts has real logic but wrong database

---

## CANONICAL PIPELINE DESIGN

### Single Entry Point: `runViralOptimizer()`

**Input:**
```typescript
interface ViralOptimizerInput {
  userId: number;
  title: string;
  description?: string;
  tags?: string[];
  duration?: number;
  platform: "youtube" | "tiktok" | "instagram" | "twitter";
  contentType?: "video" | "image" | "text";
}
```

**Pipeline Steps:**
1. **Hook Generation** - Generate 5 viral hooks using LLM
2. **Content Analysis** - Analyze title/description for viral potential
3. **Scoring** - Calculate 7 sub-scores + overall viral score
4. **Recommendations** - Generate weaknesses and suggestions
5. **Optimization** - Create optimized title/description/tags
6. **Metrics Prediction** - Predict views, engagement, CTR, retention
7. **Database Persistence** - Write to `viralAnalyses` and `viralMetrics`
8. **Return Results** - Return analysis ID + full output

**Output:**
```typescript
interface ViralOptimizerOutput {
  analysisId: string;
  viralScore: number;
  hookScore: number;
  qualityScore: number;
  trendScore: number;
  audienceScore: number;
  formatScore: number;
  timingScore: number;
  hooks: string[];
  weaknesses: string[];
  recommendations: string[];
  optimizedTitle: string;
  optimizedDescription?: string;
  optimizedTags: string[];
  predictedMetrics: {
    views: number;
    engagement: number;
    ctr: number;
    retention: number;
  };
}
```

---

## RECOVERY STEPS

### Phase 1: Consolidate Logic (server/services/viralOptimizer.ts)
- [x] Analyze existing viralOptimizer.ts
- [ ] Rewrite to use Drizzle ORM instead of SQLite
- [ ] Integrate LLM-powered hook generation from creatorTools.ts
- [ ] Integrate LLM-powered analysis from creatorTools.ts
- [ ] Keep scoring algorithms from original viralOptimizer.ts
- [ ] Add `runViralOptimizer()` as single entry point

### Phase 2: Wire to tRPC (server/routers.ts)
- [ ] Add `viralOptimizer.run` mutation
- [ ] Remove fragmented endpoints (or deprecate)
- [ ] Ensure mutation persists to database

### Phase 3: Update Creator Tools UI
- [ ] Replace individual function calls with `trpc.viralOptimizer.run`
- [ ] Display full optimizer output (scores, hooks, recommendations)
- [ ] Add "View Past Analyses" section (fetch from database)
- [ ] Show optimized content side-by-side with original

### Phase 4: Test End-to-End
- [ ] Run optimizer with test input
- [ ] Verify database persistence (viralAnalyses + viralMetrics)
- [ ] Verify UI displays results
- [ ] Verify results persist across page refreshes
- [ ] Create proof packet with screenshots

---

## SINGLE SOURCE OF TRUTH

**After recovery:**
- **Service:** `server/services/viralOptimizer.ts` (rewritten for Drizzle)
- **Entry Point:** `runViralOptimizer(input)`
- **tRPC Mutation:** `viralOptimizer.run`
- **UI Component:** Creator Tools → Viral Optimizer tab
- **Database:** `viralAnalyses` + `viralMetrics` tables

**Deprecated/Removed:**
- `server/routers/commandHub.ts` → `runViralAnalysis` (placeholder logic)
- Individual creatorTools functions (keep as internal helpers only)
