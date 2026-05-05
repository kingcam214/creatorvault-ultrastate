# CreatorVault Master Quality Rubric

This rubric enforces world-class output standards across every feature and tool in CreatorVault. It is not generic QA. It is a strict, zero-tolerance scoring engine designed to prevent demo-level, basic, or unfinished features from ever being considered "complete."

## Scoring Dimensions (0-5 Scale)

Every feature is evaluated across five dimensions. 

| Score | Definition |
|-------|------------|
| **0** | Broken, missing, or completely non-functional. |
| **1** | Barely runs. Produces errors, UI is broken, or output is useless. |
| **2** | "Demo level." It runs but looks basic, requires manual fixes, or feels cheap. |
| **3** | Functional and acceptable. It works end-to-end but lacks polish or advanced power. |
| **4** | Premium. Looks great, works flawlessly, provides real value, feels trustworthy. |
| **5** | World-class. Exceeds expectations. Benchmark level (e.g., Pollo AI, Runway). |

### 1. Functional Truth (FT)
**Does it actually work end-to-end?**
- *Criteria:* No mock data, no hardcoded placeholders, no "coming soon" dead ends. API calls must succeed, database writes must persist, and state must update accurately. 
- *Fail State:* A button clicks and nothing happens, or a success toast appears but the database wasn't updated.

### 2. Output Quality (OQ)
**Does the result look premium, not demo-like?**
- *Criteria:* The generated video, image, script, or analytics chart must look professional, polished, and ready for immediate use by a high-earning creator. UI must be modern (not form-based or outdated).
- *Fail State:* A generated video has watermarks, low resolution, or robotic TTS. A chart looks like a default library export with no styling.

### 3. Creator Value (CV)
**Does it improve monetization, workflow, or speed?**
- *Criteria:* The feature must solve a real problem. It should save time, increase conversion rates, or directly drive revenue.
- *Fail State:* A feature exists just to exist, adding clicks to a workflow without providing actionable insights or tangible assets.

### 4. Reliability (RE)
**Does it work repeatedly?**
- *Criteria:* It handles edge cases, bad inputs, and repeated use without crashing. Background jobs complete successfully. No memory leaks or race conditions.
- *Fail State:* It works the first time, but clicking it again throws an error. It fails silently when an API takes too long.

### 5. UX Confidence (UX)
**Does it feel trustworthy and polished?**
- *Criteria:* Loading states, error handling, micro-interactions, and visual hierarchy must be flawless. The user must never wonder "did that work?"
- *Fail State:* Blank screens during loading, unstyled error messages, or confusing navigation.

---

## Pass / Fail Logic

To pass the CreatorVault Quality Standards Engine, a feature **MUST** meet the following strict conditions:

1. **Minimum Average Score:** The average score across all 5 dimensions must be **>= 4.0**.
2. **No Dimension Below 3:** Any score of 2 or lower in *any* dimension results in an **AUTOMATIC FAIL**.
3. **Zero-Tolerance Triggers:**
   - Presence of mock data in a production view.
   - Unhandled exceptions or console errors.
   - Outdated, form-based UI designs.
   - "It ran" without visible, premium output.
   - Screenshots used as proof of functionality instead of actual live verification.

If a feature fails, it is sent back to development. It cannot be merged, deployed, or considered complete until the failing dimensions are elevated to meet the standard.
