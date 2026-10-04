# CREATORVAULT VISUAL AND DESIGN DNA
## The Immutable Design Standard
### This Never Changes. This Never Gets Overridden. This Is Law.

This is the canonical visual standard. Existing stronger requirements in `BRAND_DNA_QUALITY_LAW.md`, `DOPEST_APP_STANDARDS.md`, and `BRAND_SYSTEM.md` remain intact.

## Complete owner-supplied source — unabridged

The original source contains an unclosed CSS fence. Its complete text is retained verbatim in the following enclosing block so no requirement is lost and subsequent runtime guidance remains readable.

~~~~text
Manus prompt — CreatorVault Visual DNA
MANUS AGENT LEVEL: MAX

MISSION:
Implement, preserve, and enforce the immutable CreatorVault Visual and Design DNA in the REAL CreatorVault application, then commit, push, deploy to the VPS through the established production deployment path, and verify the LIVE result.

THIS IS NOT A RESEARCH TASK.
THIS IS NOT A LOCAL-ONLY BUILD.
THIS IS NOT A GENERIC DESIGN-SYSTEM EXERCISE.
THIS IS NOT PERMISSION TO SUBSTITUTE “DARK PREMIUM SAAS” FOR CREATORVAULT.

WORK COUNTS AS COMPLETE ONLY IF:
1. The exact implementation is committed to the canonical repository.
2. The canonical branch is pushed.
3. That exact commit is deployed through the real VPS deployment path.
4. Live routes are verified on the production domain.
5. Desktop and mobile evidence confirms compliance.
6. A rollback reference is recorded.

DO NOT STOP AT LOCAL PREVIEW.
DO NOT CALL A LOCAL BUILD “DONE.”
DO NOT CREATE A NEW APP, REPO, OR PARALLEL PROJECT.
DO NOT REPLACE EXISTING CreatorVault product behavior with mockups.
DO NOT USE WHITE OR LIGHT BACKGROUNDS ANYWHERE.
DO NOT USE GENERIC STARTUP, DASHBOARD, DEVELOPER-TOOL, OR CANVA-LIKE DESIGN.
DO NOT USE FFmpeg AS A CREATIVE ENGINE.
DO NOT EXECUTE PAYMENTS, PAYOUTS, PROVIDER GENERATION, EXTERNAL PUBLISHING, OR DESTRUCTIVE DATABASE OPERATIONS.

────────────────────────────────────────────────────────
NON-NEGOTIABLE VISUAL BENCHMARK
────────────────────────────────────────────────────────

CREATORVAULT MUST FEEL LIKE:

Apple.com product launch
× Dior campaign site
× NBA playoff broadcast graphics
× Active Theory / Resn agency execution

THE EXPERIENCE IS:

A luxury creative universe that happens to be a platform.

IT IS NOT:

A SaaS dashboard with dark colors.
A developer tool.
A generic AI-product interface.
A startup landing page.
A Canva template.
A generic purple/blue “futuristic” UI.
A static set of black cards without cinematic art direction.

AUTOMATIC VISUAL FAILURE CONDITIONS:

- Any white or light page background.
- Any light gray background.
- Generic SaaS dashboard composition or template styling.
- Generic startup landing-page styling.
- Generic card-grid-first visual hierarchy.
- Bubbly controls, oversized rounded pills, or cheap consumer-app styling.
- Generic bright blue or purple palette.
- Generic stock photography used as a hero substitute.
- Static hero treatment where cinematic video/image direction is required.
- Default browser controls, default select styling, or unstyled loading/error/empty states.
- Placeholder content presented as a finished production result.
- Any live page that looks as though it cost $5 rather than $5,000 to create.

PASS CONDITIONS:

- A still screenshot makes someone stop scrolling.
- The page feels like a high-budget campaign and elite platform, not a template.
- Dark space, typography, moving imagery, data readouts, and restrained cyan/gold accents create visual authority.
- The visual system stays coherent from hero through workspace, loading, empty, error, and completion states.
- Mobile feels designed, not merely shrunk.

────────────────────────────────────────────────────────
CANONICAL VISUAL AND DESIGN DNA
────────────────────────────────────────────────────────

CREATE THIS FILE IN THE CANONICAL REPOSITORY IF IT DOES NOT ALREADY EXIST:

docs/CREATORVAULT_VISUAL_AND_DESIGN_DNA.md

If an equivalent canonical artifact already exists, preserve it, do not overwrite it with a weaker version, and add this material only if needed to ensure the requirements below are complete.

The document must be titled:

# CREATORVAULT VISUAL AND DESIGN DNA
## The Immutable Design Standard
### This Never Changes. This Never Gets Overridden. This Is Law.

The document must include the complete, unabridged visual-DNA specification supplied below, including:
- The design benchmark.
- All automatic pass/fail conditions.
- Every CSS variable.
- Color usage restrictions.
- The three required fonts and every role restriction.
- The stated typography scale.
- The motion library and animation rules.
- Button, card, badge, pill, input, stat-display standards.
- Canonical full-viewport hero video pattern.
- Any remaining sections from the source visual-DNA document available in this task context.

Do not summarize the source standard.
Do not rename colors, fonts, classes, or visual intent.
Do not substitute a design framework’s defaults for the stated values.

────────────────────────────────────────────────────────
MANDATORY DESIGN TOKENS
────────────────────────────────────────────────────────

Add these tokens to the real global stylesheet or the project’s canonical token layer.
Do not remove them. Existing aliases may remain only if they resolve to this DNA.

```css
:root {
  --bg-void:            #0A0A0A;
  --bg-surface:         #1A1A1A;
  --bg-elevated:        #2A2A2A;
  --bg-glass:           rgba(255,255,255,0.04);
  --bg-glass-dark:      rgba(0,0,0,0.6);

  --accent-cyan:        #00D9FF;
  --accent-cyan-dim:    rgba(0,217,255,0.15);
  --accent-cyan-border: rgba(0,217,255,0.3);
  --accent-cyan-glow:   0 0 24px rgba(0,217,255,0.4);

  --accent-gold:        #C9A84C;
  --accent-gold-dim:    rgba(201,168,76,0.15);
  --accent-gold-border: rgba(201,168,76,0.3);
  --accent-gold-glow:   0 0 24px rgba(201,168,76,0.4);

  --text-primary:       #FFFFFF;
  --text-secondary:     rgba(255,255,255,0.6);
  --text-muted:         rgba(255,255,255,0.3);
  --text-disabled:      rgba(255,255,255,0.15);

  --border-subtle:      rgba(255,255,255,0.08);
  --border-medium:      rgba(255,255,255,0.15);
  --border-accent-cyan: rgba(0,217,255,0.3);
  --border-accent-gold: rgba(201,168,76,0.3);

  --success:            #00FF94;
  --danger:             #FF3B3B;
  --warning:            #FFB800;
  --live:               #FF3B3B;

  --gradient-hero: linear-gradient(
    to bottom,
    rgba(0,0,0,0.05) 0%,
    rgba(0,0,0,0.3) 40%,
    rgba(0,0,0,0.75) 70%,
    #0A0A0A 100%
  );

  --gradient-card: linear-gradient(
    135deg,
    #1A1A1A 0%,
    #0F0F0F 100%
  );

  --gradient-gold: linear-gradient(
    135deg,
    rgba(201,168,76,0.2) 0%,
    rgba(201,168,76,0.05) 100%
  );

  --gradient-cyan: linear-gradient(
    135deg,
    rgba(0,217,255,0.15) 0%,
    rgba(0,217,255,0.03) 100%
  );
}
GLOBAL RESTRICTIONS:
--bg-void is the baseline application/page background.
--bg-surface is for cards, sidebars, navigation, and panels.
--bg-elevated is for hover, active, dropdown, and raised states.
Cyan is reserved for primary action, active state, links, progress, platform/tech features, and data readouts.
Gold is reserved for revenue, KingCam identity, VIP, founder/empire, premium, and crown-related states.
Red is danger/live only. It is never the dominant brand color.
Purple is forbidden except documented legacy code being removed.
Bright generic blue is forbidden.
Gradients go dark-to-darker. Never create light-to-dark backgrounds.
No page, card, modal, form, loading screen, empty state, or error state may use a white/light background.
────────────────────────────────────────────────────────
MANDATORY TYPOGRAPHY
────────────────────────────────────────────────────────
Load these exact fonts globally:
Bebas Neue
DM Sans: weights 300, 400, 500, 600, 700
Space Mono: weights 400, 700
Use the appropriate import mechanism for the stack. If Google Fonts is used, preserve performant preconnect behavior.
Font assignments are mandatory:
BEBAS NEUE:
Display/page/section headlines.
Navigation labels.
Product and feature names.
CTA button labels.
Major stat values, price display, and impact numbers.
Never paragraphs.
Never body copy.
Never below 14px.
Use white or cyan for impact text; do not render it in low-contrast decorative colors.
DM SANS:
Body copy.
Descriptions.
Forms.
Input values.
Tooltips.
Helper text.
Conversational interface text.
Never replace Bebas Neue where impact hierarchy is required.
Never smaller than 12px.
SPACE MONO:
Data and financial figures.
Timestamps.
System status.
Technical readouts.
Eyebrow labels.
Badge text.
Live counters.
Never long-form body reading.
Never replace warm UI labels.
Implement the supplied typography classes or the direct semantic equivalent:
.display-xl, .display-lg, .display-md
.heading-xl, .heading-lg, .heading-md, .heading-sm, .heading-xs
.cta-text
.body-xl, .body-lg, .body-md, .body-sm, .body-xs
.label-lg, .label-md, .label-sm
.data-xl, .data-lg, .data-md, .data-sm, .data-xs
.eyebrow, .badge-text
Use the exact sizes, weights, spacing, and line-height intent from the DNA document. Do not substitute a generic Tailwind or framework typography scale without mapping it directly to these rules.
────────────────────────────────────────────────────────
MANDATORY MOTION SYSTEM
────────────────────────────────────────────────────────
Implement the specified animation library in the canonical global CSS or motion utility layer:
fadeUp
fadeIn
scaleIn
pulseCyan
pulseGold
scanDown
dataFlicker
float
emberFloat
shimmer
spin
expandWidth
Implement the specified utility classes:
.animate-fade-up
.animate-fade-in
.animate-scale-in
.live-stat
.cta-pulse-cyan
.cta-pulse-gold
.float
Motion rules:
Entrance motion is 0.3–0.5 seconds, with intentional staggering around 0.1 seconds for related elements.
CTAs use restrained scale/brightness response; active state compresses slightly.
Revenue/live data uses the appropriate subtle live data treatment.
Content loading uses shimmer, not generic spinning controls.
Scan-line/ember/particle effects are atmospheric and page-specific, never decorative clutter.
No bouncing.
No long UI animations.
No repeating motion except ambient identity effects, pulse states, and live indicators.
Respect prefers-reduced-motion: nonessential animation must be reduced or removed while preserving usability.
────────────────────────────────────────────────────────
REUSABLE COMPONENTS — IMPLEMENT OR RECONCILE
────────────────────────────────────────────────────────
Inspect the actual CreatorVault component architecture.
Create or reconcile a canonical reusable component/token layer that enforces the DNA for:
Primary cyan CTA:
52px height
cyan fill
void text
Bebas Neue
18px
0.1em tracking
2px radius
cyan pulse
controlled hover/active treatment
Secondary cyan outline CTA:
52px height
transparent background
cyan type/border
Bebas Neue
16px
2px radius
Gold CTA:
52px height
gold fill
void text
Bebas Neue
reserved for revenue/empire/premium actions
Ghost and danger actions:
restrained dark surface treatment
DM Sans
danger uses red only for destructive operations
Cards:
Standard, elevated, cyan-featured, gold-featured, and glass-over-media variants
dark surfaces
restrained 8px card radius
correct border and glow behavior
no generic white cards
no exaggerated blur or glass everywhere
Badges and status:
Space Mono
uppercased microtype with tracking
cyan/gold/success/danger/muted variants
live status using red only as a status cue
Pills:
only for actual option/tabs selectors
never use pills as a substitute for structured interface hierarchy
Inputs:
48px dark inputs
DM Sans values
Space Mono labels
cyan focus ring
custom chevrons/select treatment
no default browser visual treatment
Stat displays:
Space Mono labels
Bebas Neue major impact values
cyan or gold animated accent line
revenue uses gold identity and live-stat only where truthful
Loading, empty, error, and success states:
designed in the same visual system
no bare browser/default states
no fake status/completion language
no misleading “live,” “revenue,” “completed,” or output claims
Use semantic class names, accessible native controls, and the project’s existing conventions. Do not force a framework migration solely to satisfy styling.
────────────────────────────────────────────────────────
CANONICAL HERO SYSTEM
────────────────────────────────────────────────────────
Every true landing or major campaign hero must follow the CreatorVault Hero Video Pattern:
Full viewport where the route warrants it.
Real page-specific motion video or intentionally art-directed visual media at the bottom layer.
object-fit: cover.
Dark gradient overlay for copy readability.
Optional cyan scan line only for appropriate technology/platform surfaces.
Content over media with Space Mono eyebrow, Bebas Neue impact headline, DM Sans supporting text, and cyan/gold actions.
Video/media must be optimized, muted/autoplay/loop/playsInline where browser policy permits.
If video cannot load, provide an intentional dark art-directed fallback, never an empty black rectangle or random stock image.
Honor reduced-motion: freeze to an intentional poster/fallback rather than autoplaying nonessential motion.
Do not apply a hero video mechanically to every internal tool screen. Apply the underlying visual hierarchy and campaign-level direction throughout the product, while using video heroes where they strengthen—not obstruct—the user’s work.
────────────────────────────────────────────────────────
IMPLEMENTATION SCOPE
────────────────────────────────────────────────────────
PHASE 0 — RECOVERY BEFORE EDITING
Discover the actual checked-out project/repository that powers the VPS deployment.
Inspect:
Git remotes and active branch.
Existing deployment workflow/configuration.
Current global styles and font setup.
Existing component library and route structure.
Existing assets/media directories.
Existing visual/design/brand/quality standards and prior CreatorVault direction.
Preserve all working behavior and avoid destructive rewrites.
Report the canonical repo, active branch, current commit SHA, deploy mechanism, and rollback target before proceeding.
If canonical source/VPS deployment path cannot be verified, STOP. Do not create a parallel app and do not call work complete.
PHASE 1 — MAKE THE DNA DURABLE
Store the complete immutable visual-DNA standard in the canonical repo:
docs/CREATORVAULT_VISUAL_AND_DESIGN_DNA.md
Add an explicit link/reference to it from the project README or engineering/deployment guide.
Add the global tokens, font configuration, motion utilities, and reduced-motion rules.
Implement/reconcile shared visual primitives so future routes inherit the system rather than hand-rolling generic UI.
Ensure tokens/primitives do not break existing application behavior.
PHASE 2 — APPLY TO THE SOFT-LAUNCH PATH
Identify the current most complete real creator journey already present in the app. Do not invent a new product module.
Prioritize only the routes required for that journey:
Entry/landing or authenticated entry point.
Sign-in/onboarding only if it is part of the existing active flow.
Creator workspace/project selection.
Source media/project direction route if it exists.
The current truthful output/state route.
Loading, empty, error, and success states encountered along that route.
For each route:
Replace generic visual treatment with the DNA.
Preserve truthful product state and existing user functionality.
Do not fake media, AI analysis, revenue, output, provider completion, or job status.
Do not create visual polish on a dead-end page and call it launch-ready.
Ensure desktop and mobile are intentionally designed.
PHASE 3 — VISUAL QA AND LIVE RELEASE
Run formatting, linting, type checks, tests, and production build.
Fix all visual/system regressions in the selected launch path.
Capture desktop and mobile evidence for every route in the selected journey.
Evaluate every capture against these literal checks:
Is the baseline void-black rather than light or generic?
Does typography correctly use Bebas Neue, DM Sans, and Space Mono?
Are cyan and gold used according to their semantic roles?
Does the route look like a high-budget CreatorVault experience rather than generic SaaS?
Are CTA, loading, empty, error, and form states designed?
Does mobile feel intentionally composed?
Is all product state truthful?
Commit the complete work.
Push the canonical branch.
Deploy through the actual established VPS deployment mechanism.
Verify the LIVE production domain:
Desktop: current major browser viewport.
Mobile: current narrow mobile viewport.
Confirm the selected journey’s routes load and remain visually correct.
Confirm no console-breaking errors prevent the key journey.
Record:
Commit SHA.
Canonical branch.
Deployment workflow/mechanism.
Deployment timestamp.
Production URL(s) checked.
Route-by-route visual pass/fail.
Rollback commit/reference.
────────────────────────────────────────────────────────
GUARDRAILS
────────────────────────────────────────────────────────
DO:
Use the real existing CreatorVault source and deployment path.
Build toward the existing soft-launch flow.
Preserve user-owned data and existing working features.
Use actual project assets when available.
Mark unavailable imagery/video honestly and use an intentional fallback.
Keep every state accessible: semantic structure, keyboard focus, readable contrast, and reduced-motion support.
Keep performance in mind: responsive media, poster images, lazy-load noncritical video, no excessive heavyweight effects.
DO NOT:
Build a separate demo.
Make a new repository.
Leave work in a temporary workspace.
Stop after screenshots from local development.
Replace functionality with static mockups.
Use placeholder claims as a substitute for real data.
Execute paid providers, payments, publishing, emails, outreach, or payouts.
Run destructive migrations or delete existing data.
Expose secrets.
Hide failure behind vague claims such as “premium,” “cinematic,” “complete,” or “deployed.”
────────────────────────────────────────────────────────
FINAL RESPONSE FORMAT — EXACTLY
────────────────────────────────────────────────────────
CREATORVAULT VISUAL DNA IMPLEMENTATION + VPS RELEASE
Canonical source
Repository:
Branch:
Starting commit:
Final commit:
VPS deployment mechanism:
Rollback reference:
Immutable DNA
Canonical DNA file:
Existing DNA artifacts found:
README/deployment reference added:
Global token file:
Global font setup:
Global motion/reduced-motion setup:
Shared implementation
Components/primitives created or reconciled:
Existing components updated:
Components intentionally not changed and why:
Soft-launch journey
Selected existing creator journey:
Live routes updated:
Persistence/truthfulness checks:
Functionality preserved:
Visual QA
Desktop route results:
Mobile route results:
Automatic-failure checks:
Remaining visual failures or intentional deferred items:
Production proof
Push result:
VPS deployment result:
Production URLs verified:
Live timestamp:
Evidence artifact paths/URLs:
Rollback confirmation:
Non-actions
Payments/payouts executed: NONE
Paid provider generation executed: NONE
External publishing/sends executed: NONE
Destructive database operations: NONE
If any requirement could not be completed, state it in this format:
BLOCKED:
Exact blocked requirement:
Exact evidence:
Why it could not be safely completed:
What has NOT been claimed as complete:
The single next action required to unblock it:
DO NOT SAY “COMPLETE” UNLESS THE LIVE VPS DEPLOYMENT AND LIVE VISUAL VERIFICATION HAVE BOTH PASSED.
~~~~

## Implementation mapping — explicit supplement, not recovered values

The supplied task names typography classes but contains no numeric type-scale table or additional original DNA attachment. No missing original sizes are claimed to have been recovered. The following direct semantic mapping preserves the stated role, floor, responsive hierarchy, weight, spacing and line-height intent. Exact stated CTA/input/card numbers remain unchanged.

| Class | Size | Weight | Line height | Tracking | Family |
| --- | --- | --- | --- | --- | --- |
| display-xl | 72–144px responsive | 400 | .92 | .015em | Bebas Neue |
| display-lg | 56–96px responsive | 400 | .95 | .025em | Bebas Neue |
| display-md | 44–72px responsive | 400 | 1 | .03em | Bebas Neue |
| heading-xl | 36–56px responsive | 400 | 1.05 | .03em | Bebas Neue |
| heading-lg / md / sm / xs | 40 / 32 / 24 / 18px | 400 | 1.1 / 1.15 / 1.2 / 1.25 | .03 / .035 / .04 / .05em | Bebas Neue |
| cta-text | 18px | 400 | 1.2 | .1em | Bebas Neue |
| body-xl / lg / md / sm / xs | 22 / 18 / 16 / 14 / 12px | 400 | 1.65 / 1.65 / 1.65 / 1.6 / 1.6 | normal | DM Sans |
| label-lg / md / sm | 16 / 14 / 12px | 600 / 500 / 500 | 1.4 | normal | DM Sans |
| data-xl / lg / md / sm / xs | 48 / 32 / 20 / 14 / 12px | 400 | 1.15 / 1.2 / 1.4 / 1.5 / 1.5 | normal | Space Mono |
| eyebrow / badge-text | 11 / 10px | 400 | 1.6 / 1.5 | .18 / .12em | Space Mono |

## Canonical source and compatibility

- Runtime tokens, classes, animations and reduced-motion: `client/src/index.css`.
- Single self-hosted font loading: `client/index.html` → `/fonts/visual-dna-fonts.css`, with `font-display: swap`, exact font weights, source hashes and OFL licenses in `client/public/fonts/`. Existing Google preconnect declarations are retained; runtime font loading does not require the external service.
- Accessible native primitives: `client/src/components/ui/button.tsx` and shared CSS `cv-cta`, `cv-cta-outline`, `cv-cta-gold`, `cv-ghost`, `cv-danger`, `cv-panel` variants, `cv-badge` variants, `cv-input`, `cv-select`, `cv-state`, `cv-shimmer`.
- Selected journey roots use `cv-dna`; legacy routes are not falsely certified. Global token aliases resolve to the DNA; retained hardcoded legacy colors on non-selected routes are recorded as deferred rather than silently rewritten.
- Existing homepage certified source paths remain intact; poster/error/reduced-motion behavior is presentation only, never a replacement output.
- A visual release is not acceptance of a creator output, rights/compliance, monetization or a soft launch.
