import { z } from "zod";

/** Canonical, provider-free registry for Body Cinema's body-directed planning lane. */
export const BODY_DIRECTED_REGISTRY_VERSION = "body_cinema.body_direction_registry.v1" as const;
export const BODY_DIRECTED_TREATMENT_VERSION = "body_cinema.body_directed_plan.v1" as const;
export const BODY_DIRECTED_SOURCE_MAP_VERSION = "body_cinema.body_directed_source_map.v1" as const;

export type BodyDirectedFocus = {
  id: string;
  label: string;
  description: string;
  requiresCreatorConfirmation: boolean;
};

export type BodyDirectedTreatment = {
  id: string;
  bodyFocusIds: string[];
  name: string;
  promise: string;
  shotLogic: string;
  framingCropLogic: string;
  pacing: string;
  movementLogic: string;
  suggestedVisualIdentityIds: string[];
  guardrails: string[];
  providerDirection: string;
  requiredRegions: string[];
  selectionPattern: string;
  requiresConfirmedFocus?: boolean;
};

export type BodyVisualIdentity = {
  id: string;
  name: string;
  kind: "look_direction";
  description: string;
  gradeDirection: string;
  holdDirection: string;
  guardrails: string[];
};

export const BODY_FOCUS_LIBRARY: BodyDirectedFocus[] = [
  { id: "abs_core", label: "Abs", description: "Core-focused source selection.", requiresCreatorConfirmation: true },
  { id: "glutes_lower_body", label: "Glutes", description: "Lower-body source selection.", requiresCreatorConfirmation: true },
  { id: "full_body", label: "Full Body", description: "Measured full-form source selection.", requiresCreatorConfirmation: false },
  { id: "legs", label: "Legs", description: "Measured leg-line source selection.", requiresCreatorConfirmation: false },
  { id: "curves_silhouette", label: "Curves", description: "Silhouette-focused source selection.", requiresCreatorConfirmation: true },
  { id: "dance_movement", label: "Dance & Twerk", description: "Creator-confirmed movement-focused source selection.", requiresCreatorConfirmation: true },
  { id: "face_beauty", label: "Face & Beauty", description: "Measured face-preserving source selection.", requiresCreatorConfirmation: false },
  { id: "style_detail", label: "Style & Drip", description: "Creator-confirmed styling-detail source selection.", requiresCreatorConfirmation: true },
  { id: "fitness", label: "Fitness", description: "Creator-confirmed fitness-overall source selection.", requiresCreatorConfirmation: true },
];

const PRESERVATION_GUARDRAILS = [
  "Use only selected source timecodes and source-bounded crops.",
  "Preserve natural skin tone and texture, identity, body and anatomy, wardrobe, environment, and recorded source motion.",
  "Do not infer hidden anatomy, clothing detail, hair, jewelry, orientation, exercise, choreography, camera heading, or light quality.",
  "Plan only: no provider call, candidate, render, attachment, publication, or purchase is authorized.",
];

function treatment(input: BodyDirectedTreatment): BodyDirectedTreatment {
  return { ...input, guardrails: [...PRESERVATION_GUARDRAILS, ...input.guardrails] };
}

export const BODY_FOCUS_TREATMENTS: BodyDirectedTreatment[] = [
  treatment({ id: "pressure_core", bodyFocusIds: ["abs_core"], name: "Pressure Core", promise: "Crisp core-detail emphasis with controlled power pacing.", shotLogic: "Select creator-confirmed core windows for a measured detail-to-hero sequence.", framingCropLogic: "Progress from a protective expanded crop to the measured core crop without leaving source bounds.", pacing: "Beat-aware controlled holds.", movementLogic: "Use observed landmark movement only; otherwise hold the recorded pose.", suggestedVisualIdentityIds: ["obsidian", "pressure", "melanin_luxe"], guardrails: ["Core visibility is creator-confirmed only; pose landmarks do not identify abdominal detail."], providerDirection: "Plan a source-only core-detail sequence with restrained contrast and no body modification.", requiredRegions: ["torso"], selectionPattern: "detail_to_hero", requiresConfirmedFocus: true }),
  treatment({ id: "sculpted", bodyFocusIds: ["abs_core"], name: "Sculpted", promise: "Clean contour-led editorial core treatment.", shotLogic: "Arrange confirmed core windows from expanded framing to a calm central hero hold.", framingCropLogic: "Use a wide-to-measured crop progression that retains all confirmed source anatomy.", pacing: "Editorial, unhurried cadence.", movementLogic: "Prefer held-pose windows; do not manufacture flexes or motion.", suggestedVisualIdentityIds: ["golden_hour", "silk_road", "goddess_mode"], guardrails: ["Do not create light, shadow, muscle definition, or skin texture that is absent from the source."], providerDirection: "Plan a source-only editorial crop progression; retain natural skin and recorded light.", requiredRegions: ["torso"], selectionPattern: "wide_to_hold", requiresConfirmedFocus: true }),
  treatment({ id: "core_command", bodyFocusIds: ["abs_core"], name: "Core Command", promise: "Power-angle edit language with controlled detail inserts.", shotLogic: "Open on the strongest confirmed core window, bridge through a different supported window, and finish on a protected hold.", framingCropLogic: "Use source-bounded medium and detail crops only where the confirmed region remains protected.", pacing: "Serious training-film pacing with clean cuts.", movementLogic: "Use observed landmark movement as a bridge only; no inferred workout action.", suggestedVisualIdentityIds: ["pressure", "obsidian", "royalty_check"], guardrails: ["No exercise, physique, or result claim is inferred from pose landmarks."], providerDirection: "Plan a decisive source-only sequence using only confirmed core windows.", requiredRegions: ["torso"], selectionPattern: "command_bridge", requiresConfirmedFocus: true }),
  treatment({ id: "sun_kissed_set", bodyFocusIds: ["abs_core"], name: "Sun-Kissed Set", promise: "Warm natural fitness-light editorial attention.", shotLogic: "Use confirmed core windows in a relaxed detail-to-hold order.", framingCropLogic: "Keep a protective crop around the confirmed source region; do not invent an outdoor setting or sunlight.", pacing: "Relaxed editorial pacing.", movementLogic: "Let recorded source motion breathe; use a hold when movement evidence is unknown.", suggestedVisualIdentityIds: ["golden_hour", "island_girl", "melanin_luxe"], guardrails: ["Natural light and outdoor context are look directions only and are never claimed when unknown."], providerDirection: "Plan a warm source-only editorial treatment that preserves the recorded environment and skin texture.", requiredRegions: ["torso"], selectionPattern: "relaxed_detail_hold", requiresConfirmedFocus: true }),

  treatment({ id: "backstage", bodyFocusIds: ["glutes_lower_body"], name: "Backstage", promise: "Controlled lower-body reveal rhythm from supported source moments.", shotLogic: "Use creator-confirmed lower-body windows in a stable build and final hero hold.", framingCropLogic: "Use full lower-body protective crops only where confirmed source anatomy remains in bounds.", pacing: "Deliberate controlled rhythm.", movementLogic: "Use recorded movement only; no rear/front orientation is inferred.", suggestedVisualIdentityIds: ["midnight_heat", "cartel_chic", "pressure"], guardrails: ["Do not infer view direction, glute shape, or movement from joints alone."], providerDirection: "Plan a source-only lower-body sequence using confirmed visible-region windows.", requiredRegions: ["hips", "legs"], selectionPattern: "stable_build", requiresConfirmedFocus: true }),
  treatment({ id: "motion_theory", bodyFocusIds: ["glutes_lower_body"], name: "Motion Theory", promise: "Movement-led lower-body cut language without invented framing.", shotLogic: "Prioritize confirmed lower-body windows with observed landmark movement, then use a held source moment for contrast.", framingCropLogic: "Alternate source-bounded lower-body and expanded crops while retaining measured landmarks.", pacing: "Beat-timed contrast without fabricated beats.", movementLogic: "Classify only observed landmark movement, held pose, or unknown; never claim a dance routine.", suggestedVisualIdentityIds: ["midnight_heat", "southside", "pressure"], guardrails: ["No side/rear composition or twerk inference is made from landmarks."], providerDirection: "Plan source-only movement contrast from confirmed lower-body windows and measured movement labels.", requiredRegions: ["hips", "legs"], selectionPattern: "movement_contrast", requiresConfirmedFocus: true }),
  treatment({ id: "curve_currency", bodyFocusIds: ["glutes_lower_body", "curves_silhouette"], name: "Curve Currency", promise: "Luxury silhouette detail with a slow-glide editorial language.", shotLogic: "Build from a creator-confirmed silhouette or lower-body window to the clearest supported hero hold.", framingCropLogic: "Use an expanded silhouette crop followed by the confirmed in-bounds region crop.", pacing: "Slow-glide, premium spacing.", movementLogic: "Prefer held pose or observed movement labels; never reshape or exaggerate a silhouette.", suggestedVisualIdentityIds: ["silk_road", "la_reina", "melanin_luxe"], guardrails: ["Silhouette attention does not permit body reshaping, enlargement, shrinking, or distortion."], providerDirection: "Plan a source-only luxury silhouette sequence with protective crops and natural anatomy preserved.", requiredRegions: ["torso", "hips"], selectionPattern: "silhouette_glide", requiresConfirmedFocus: true }),
  treatment({ id: "after_hours", bodyFocusIds: ["glutes_lower_body"], name: "After Hours", promise: "Deliberate low-key lower-body movement language.", shotLogic: "Choose confirmed lower-body windows for a restrained opening, movement bridge when observed, and final hold.", framingCropLogic: "Use measured lower-body crops only; low-light is a look direction, not a source-light claim.", pacing: "Deliberate after-hours spacing.", movementLogic: "Use source movement only when measured; otherwise use a held pose.", suggestedVisualIdentityIds: ["midnight_heat", "noche_buena", "voodoo"], guardrails: ["Do not brighten, relight, or invent a nighttime environment."], providerDirection: "Plan a source-only restrained sequence with the Midnight Heat-ready look direction only after authorization.", requiredRegions: ["hips", "legs"], selectionPattern: "restrained_bridge", requiresConfirmedFocus: true }),

  treatment({ id: "main_character", bodyFocusIds: ["full_body"], name: "Main Character", promise: "Full-body entrance, walk-or-turn source moments, and a final hero frame.", shotLogic: "Order measured full-body windows as entrance, observed movement or held-pose bridge, and final hero frame.", framingCropLogic: "Open wide, tighten only to the measured full-body crop, and preserve hands, feet, face, and body in source bounds.", pacing: "Confident entrance cadence.", movementLogic: "Use only observed landmark movement; no walk, turn, or performance is claimed if unmeasured.", suggestedVisualIdentityIds: ["la_reina", "goddess_mode", "royalty_check"], guardrails: ["No camera angle, posture, or performance is inferred beyond sampled landmarks."], providerDirection: "Plan a source-only full-body entrance sequence with a protected hero frame.", requiredRegions: ["full_body"], selectionPattern: "entrance_to_hero" }),
  treatment({ id: "body_language", bodyFocusIds: ["full_body", "style_detail"], name: "Body Language", promise: "Posture, movement, confidence, and styling narrative sequencing from verified source moments.", shotLogic: "Use measured full-body or creator-confirmed styling windows to create a narrative sequence of source moments.", framingCropLogic: "Move between an expanded source frame and a protective measured or confirmed crop.", pacing: "Narrative pause-and-release pacing.", movementLogic: "Use observed landmark movement, held pose, or unknown exactly as measured; never claim choreography.", suggestedVisualIdentityIds: ["la_reina", "drip", "goddess_mode"], guardrails: ["Styling detail requires creator confirmation; landmark data does not identify wardrobe, jewelry, nails, or hair."], providerDirection: "Plan a source-only narrative sequence that preserves the recorded styling, body, identity, and environment.", requiredRegions: ["full_body", "arms"], selectionPattern: "narrative_pause_release" }),
  treatment({ id: "the_reveal", bodyFocusIds: ["full_body"], name: "The Reveal", promise: "Detail-to-mid-shot-to-full-body hero progression using measured source windows.", shotLogic: "Arrange distinct full-body source windows as a measured face-detail opening, an explicit shoulders-and-hips torso frame, then a full-body hero hold.", framingCropLogic: "Use only exact measured face-detail sibling crops, explicit measured torso-frame crops, and the measured full-body crop; never widen, infer, or fabricate a frame.", pacing: "Measured reveal progression.", movementLogic: "Treat unmeasured motion as unknown and keep the source moment intact.", suggestedVisualIdentityIds: ["golden_hour", "la_reina", "silk_road"], guardrails: ["A reveal is edit sequencing only; no new pose, environment, or camera move is created."], providerDirection: "Plan a source-only full-body reveal sequence from measured usable windows.", requiredRegions: ["full_body"], selectionPattern: "detail_to_mid_to_full" }),
  treatment({ id: "runway_heat", bodyFocusIds: ["full_body"], name: "Runway Heat", promise: "Fashion-editorial full-form pacing from measured movement and hold moments.", shotLogic: "Use measured full-body movement windows where available, counterbalanced by a stable source hero hold.", framingCropLogic: "Maintain full-form protective crops; no 360 or walk cycle is invented.", pacing: "Confident editorial cut rhythm.", movementLogic: "Observed landmark movement only; otherwise label the moment held or unknown.", suggestedVisualIdentityIds: ["cartel_chic", "drip", "pressure"], guardrails: ["No runway, walk, or 360 movement is inferred from joints alone."], providerDirection: "Plan a source-only fashion-editorial full-body sequence from measured windows.", requiredRegions: ["full_body"], selectionPattern: "editorial_motion_hold" }),

  treatment({ id: "leg_day_cinema", bodyFocusIds: ["legs"], name: "Leg Day Cinema", promise: "Athletic leg-line emphasis with stride-or-stance source cuts.", shotLogic: "Use measured leg windows as a stance detail, a distinct bridge, and a protected hero hold.", framingCropLogic: "Use source-bounded leg crops that retain hips, knees, ankles, and feet where measured.", pacing: "Athletic, deliberate cuts.", movementLogic: "Use observed landmark movement only; no training activity is inferred.", suggestedVisualIdentityIds: ["pressure", "obsidian", "melanin_luxe"], guardrails: ["Leg landmarks do not establish fitness activity, muscle detail, or a stride."], providerDirection: "Plan a source-only measured leg-line sequence with protected source bounds.", requiredRegions: ["legs"], selectionPattern: "stance_to_hero" }),
  treatment({ id: "long_story", bodyFocusIds: ["legs"], name: "Long Story", promise: "Vertical leg-line editorial sequencing with clean source composition.", shotLogic: "Sequence measured leg windows from widest supported composition to a calm hero hold.", framingCropLogic: "Use vertical source-bounded crops that preserve the in-bounds measured leg line.", pacing: "Clean, unhurried editorial rhythm.", movementLogic: "Favor held pose when movement is unknown; do not create walking sequences.", suggestedVisualIdentityIds: ["golden_hour", "silk_road", "goddess_mode"], guardrails: ["Do not elongate, reshape, or alter body proportions."], providerDirection: "Plan a source-only vertical editorial sequence from measured leg windows.", requiredRegions: ["legs"], selectionPattern: "vertical_story" }),
  treatment({ id: "step_out", bodyFocusIds: ["legs"], name: "Step Out", promise: "Entrance framing with a lower-body-to-full-form source progression where supported.", shotLogic: "Use measured leg windows from lower-frame emphasis to a separately measured full-body source hold.", framingCropLogic: "Use an exact measured leg crop before the exact sibling full-body crop; footwear or nightlife detail is not assumed from landmarks.", pacing: "Purposeful entrance timing.", movementLogic: "Use observed movement only; otherwise retain the recorded hold.", suggestedVisualIdentityIds: ["cartel_chic", "noche_buena", "drip"], guardrails: ["Do not infer shoes, city context, or an entrance from pose landmarks."], providerDirection: "Plan a source-only leg-line progression with no invented styling or location.", requiredRegions: ["legs", "full_body"], selectionPattern: "lower_to_full" }),

  treatment({ id: "silhouette_season", bodyFocusIds: ["curves_silhouette"], name: "Silhouette Season", promise: "Profile-and-outline attention without silhouette distortion.", shotLogic: "Use creator-confirmed silhouette windows in an expanded-to-hero outline sequence.", framingCropLogic: "Use protective source-bounded crops and do not claim backlight or profile unless present in the original source.", pacing: "Slow outline holds.", movementLogic: "Use observed landmark movement or a held source pose; do not infer profile movement.", suggestedVisualIdentityIds: ["obsidian", "silk_road", "voodoo"], guardrails: ["Do not distort contour, add backlight, or infer source orientation."], providerDirection: "Plan a source-only silhouette treatment with natural body geometry preserved.", requiredRegions: ["torso", "hips"], selectionPattern: "outline_hold", requiresConfirmedFocus: true }),
  treatment({ id: "hourglass", bodyFocusIds: ["curves_silhouette"], name: "Hourglass", promise: "Waist-to-full-frame progression with warm luxury direction.", shotLogic: "Use creator-confirmed silhouette windows for a protective region-to-hero progression.", framingCropLogic: "Expand from a source-bounded confirmed crop to a full protective source frame without proportion changes.", pacing: "Warm luxury pauses.", movementLogic: "Use source movement labels only; never invent pose transitions.", suggestedVisualIdentityIds: ["golden_hour", "la_reina", "silk_road"], guardrails: ["Do not reshape waist, hips, or any anatomy."], providerDirection: "Plan a source-only warm luxury sequence that preserves original body geometry and environment.", requiredRegions: ["torso", "hips"], selectionPattern: "waist_to_full", requiresConfirmedFocus: true }),
  treatment({ id: "soft_power", bodyFocusIds: ["curves_silhouette"], name: "Soft Power", promise: "Elegant movement with premium restrained composition.", shotLogic: "Pair confirmed silhouette source moments into a quiet build and a final protected hold.", framingCropLogic: "Use only source-bounded expanded and confirmed crops; diffused light is a look direction, not a fact claim.", pacing: "Elegant, relaxed movement spacing.", movementLogic: "Observed landmark movement only; otherwise preserve a held source pose.", suggestedVisualIdentityIds: ["goddess_mode", "melanin_luxe", "golden_hour"], guardrails: ["Do not create soft light, alter skin texture, or infer feminine pose details."], providerDirection: "Plan a source-only premium hold sequence with natural skin and body preserved.", requiredRegions: ["torso", "hips"], selectionPattern: "soft_build_hold", requiresConfirmedFocus: true }),

  treatment({ id: "rhythm_control", bodyFocusIds: ["dance_movement"], name: "Rhythm Control", promise: "Music-led movement-cut logic from creator-confirmed source moments.", shotLogic: "Use confirmed dance windows with observed landmark movement where available and vary source distances without generic looping.", framingCropLogic: "Alternate expanded and protective source-bounded crops; no explicit framing is invented.", pacing: "Beat-aware variation without an assumed music track.", movementLogic: "Use only observed landmark movement, held pose, or unknown; never claim choreography.", suggestedVisualIdentityIds: ["island_girl", "southside", "pressure"], guardrails: ["Dance/twerk detail is creator-confirmed only; joints alone do not establish a dance."], providerDirection: "Plan a source-only movement sequence using creator-confirmed windows and measured movement labels.", requiredRegions: ["hips", "legs"], selectionPattern: "rhythm_variation", requiresConfirmedFocus: true }),
  treatment({ id: "shake_theory", bodyFocusIds: ["dance_movement"], name: "Shake Theory", promise: "Fast-and-slow contrast from real recorded movement and holds.", shotLogic: "Contrast the most active confirmed source window with a separate held or unknown source moment without repetition.", framingCropLogic: "Use source-bounded expanded and protected crops only.", pacing: "Fast/slow contrast while retaining native source timing.", movementLogic: "Do not synthesize shake, pause, release, or choreography; use the existing performance only.", suggestedVisualIdentityIds: ["midnight_heat", "pressure", "voodoo"], guardrails: ["No repetitive generic loop and no inferred dance action."], providerDirection: "Plan a source-only contrast edit from confirmed movement windows without synthetic motion.", requiredRegions: ["hips", "legs"], selectionPattern: "fast_slow_contrast", requiresConfirmedFocus: true }),
  treatment({ id: "bassline", bodyFocusIds: ["dance_movement"], name: "Bassline", promise: "Tempo-shift movement language with low-key editorial direction.", shotLogic: "Sequence confirmed source movement windows in a measured build toward the clearest protected hold.", framingCropLogic: "Use protective source crops; club light and beat drops remain mood directions, not source claims.", pacing: "Tempo-shift editorial spacing without an assumed soundtrack.", movementLogic: "Only observed landmark movement may drive a transition.", suggestedVisualIdentityIds: ["midnight_heat", "noche_buena", "southside"], guardrails: ["Do not invent a club, beat drop, low light, or dance move."], providerDirection: "Plan a source-only tempo-contrast edit from confirmed visible-region windows.", requiredRegions: ["hips", "legs"], selectionPattern: "tempo_build", requiresConfirmedFocus: true }),
  treatment({ id: "carnival_motion", bodyFocusIds: ["dance_movement"], name: "Carnival Motion", promise: "Celebration movement sequence with Caribbean color as a look direction.", shotLogic: "Use distinct creator-confirmed movement windows in a bright, varied source sequence.", framingCropLogic: "Keep all digital crops in source bounds and protect confirmed anatomy.", pacing: "Celebratory, varied source pacing.", movementLogic: "Use only observed source movement; outdoor/daylight context is never inferred.", suggestedVisualIdentityIds: ["island_girl", "golden_hour", "la_reina"], guardrails: ["Caribbean color, outdoor context, and daylight are look directions only, never generated facts."], providerDirection: "Plan a source-only celebration edit with recorded environment and motion intact.", requiredRegions: ["hips", "legs"], selectionPattern: "celebration_variety", requiresConfirmedFocus: true }),

  treatment({ id: "face_card", bodyFocusIds: ["face_beauty"], name: "Face Card", promise: "Polished face-preserving close source crops and entrance framing.", shotLogic: "Use measured face windows for an expanded opening, close protective detail, and composed final hold.", framingCropLogic: "Keep face landmarks in a source-bounded crop and never infer hair, lips, jewelry, or expression detail beyond measured source evidence.", pacing: "Polished campaign holds.", movementLogic: "Use recorded face movement only when landmark motion is observed; otherwise hold.", suggestedVisualIdentityIds: ["la_reina", "melanin_luxe", "goddess_mode"], guardrails: ["No face reshaping, age alteration, skin smoothing, makeup, hair, jewelry, or expression invention."], providerDirection: "Plan a source-only face-preserving campaign sequence with natural texture retained.", requiredRegions: ["face"], selectionPattern: "face_entrance_hold" }),
  treatment({ id: "soft_focus", bodyFocusIds: ["face_beauty"], name: "Soft Focus", promise: "Beauty-campaign pacing with true skin-tone preservation.", shotLogic: "Use measured face windows in a gentle calm-to-hero source sequence.", framingCropLogic: "Use source-bounded face-safe crops with expanded breathing room and no fabricated beauty detail.", pacing: "Gentle transitions and calm holds.", movementLogic: "Treat unmeasured motion as unknown and preserve the original face source moment.", suggestedVisualIdentityIds: ["melanin_luxe", "golden_hour", "silk_road"], guardrails: ["Do not blur natural texture, alter skin tone, alter identity, or invent hair/lip/jewelry detail."], providerDirection: "Plan a source-only gentle face treatment with true natural skin and identity preserved.", requiredRegions: ["face"], selectionPattern: "gentle_face_campaign" }),

  treatment({ id: "drip_detail", bodyFocusIds: ["style_detail"], name: "Drip Detail", promise: "Premium creator-confirmed styling-detail inserts between hero source shots.", shotLogic: "Use creator-confirmed styling windows as source inserts between expanded source hero moments.", framingCropLogic: "Use protective crops only around creator-confirmed visible styling regions; do not infer rings, chains, nails, gloss, fabric, or hair.", pacing: "Premium insert rhythm.", movementLogic: "Use recorded movement only; styling details are not automatically detected.", suggestedVisualIdentityIds: ["cartel_chic", "drip", "royalty_check"], guardrails: ["Style annotations are creator-provided confirmations, not independent wardrobe, jewelry, nail, hair, or texture detection."], providerDirection: "Plan a source-only styling-detail sequence from creator-confirmed visible regions.", requiredRegions: ["shoulders", "arms"], selectionPattern: "detail_inserts", requiresConfirmedFocus: true }),

  treatment({ id: "built_different", bodyFocusIds: ["fitness"], name: "Built Different", promise: "Workout-to-hero source progression without inferred fitness claims.", shotLogic: "Use creator-confirmed fitness windows with measured movement or held-pose labels to build toward a protected hero frame.", framingCropLogic: "Keep only source-bounded crops that protect confirmed source anatomy.", pacing: "Focused intensity with a final hold.", movementLogic: "Use observed landmark movement only; do not infer exercise, reps, sweat, or results.", suggestedVisualIdentityIds: ["pressure", "obsidian", "melanin_luxe"], guardrails: ["Fitness overall is creator-confirmed; pose landmarks do not prove activity, physique, sweat, or results."], providerDirection: "Plan a source-only fitness-overall sequence with no body, result, or activity alteration.", requiredRegions: ["full_body"], selectionPattern: "intensity_to_hero", requiresConfirmedFocus: true }),
  treatment({ id: "proof_of_work", bodyFocusIds: ["fitness"], name: "Proof of Work", promise: "Documentary training energy from confirmed source moments.", shotLogic: "Sequence creator-confirmed fitness windows as source observation, measured movement or hold, then a final source frame.", framingCropLogic: "Use source-bounded protective crops and do not create workout detail outside what the creator confirmed.", pacing: "Documentary restraint.", movementLogic: "Never infer reps, recovery, sweat, exercise, or result framing from joints alone.", suggestedVisualIdentityIds: ["pressure", "southside", "golden_hour"], guardrails: ["Creator confirmation does not convert pose data into automated verification."], providerDirection: "Plan a source-only documentary-style edit from creator-confirmed visible fitness regions.", requiredRegions: ["full_body"], selectionPattern: "documentary_observation", requiresConfirmedFocus: true }),
];

export const BODY_VISUAL_IDENTITIES: BodyVisualIdentity[] = [
  { id: "obsidian", name: "Obsidian", kind: "look_direction", description: "Dark, disciplined editorial look direction.", gradeDirection: "Restrained deep-contrast grade direction while preserving natural skin detail.", holdDirection: "Let the hero source moment settle in a calm hold.", guardrails: ["No relighting, skin-tone change, or generated result."] },
  { id: "golden_hour", name: "Golden Hour", kind: "look_direction", description: "Warm, natural editorial look direction.", gradeDirection: "Warmth direction only; preserve the recorded light and natural skin tone.", holdDirection: "Use an open, breathable hero hold.", guardrails: ["Do not invent sunlight or an outdoor location."] },
  { id: "la_reina", name: "La Reina", kind: "look_direction", description: "Regal editorial look direction.", gradeDirection: "Polished tonal direction with retained source texture.", holdDirection: "Use a composed confidence hold from the source.", guardrails: ["Do not alter identity, posture, or environment."] },
  { id: "midnight_heat", name: "Midnight Heat", kind: "look_direction", description: "Low-key editorial look direction.", gradeDirection: "Restrained night-toned grade direction only when separately authorized.", holdDirection: "Use a deliberate final source hold.", guardrails: ["Do not create darkness, low light, or a new environment."] },
  { id: "melanin_luxe", name: "Melanin Luxe", kind: "look_direction", description: "Natural-texture luxury look direction.", gradeDirection: "Preserve natural skin tone and texture; use only a non-destructive luxury grade direction.", holdDirection: "Use a warm composed source hold.", guardrails: ["No skin lightening, smoothing, or texture erasure."] },
  { id: "cartel_chic", name: "Cartel Chic", kind: "look_direction", description: "Sharp luxury-editorial look direction.", gradeDirection: "Crisp tonal direction with source contrast retained.", holdDirection: "Use a concise, confident source hold.", guardrails: ["No invented location, outfit, or body change."] },
  { id: "island_girl", name: "Island Girl", kind: "look_direction", description: "Bright celebration look direction.", gradeDirection: "Color-forward direction without claiming daylight, weather, or place.", holdDirection: "Use an open celebratory source hold.", guardrails: ["Do not invent Caribbean context or outdoor conditions."] },
  { id: "silk_road", name: "Silk Road", kind: "look_direction", description: "Refined warm-luxury look direction.", gradeDirection: "Soft warm editorial grade direction with natural texture retained.", holdDirection: "Use an elegant, unhurried source hold.", guardrails: ["Do not alter fabric, jewelry, or environment."] },
  { id: "drip", name: "Drip", kind: "look_direction", description: "Glossy styling-editorial look direction.", gradeDirection: "Controlled polish direction only; source styling remains unchanged.", holdDirection: "Use a clean detail or hero source hold.", guardrails: ["Do not generate wardrobe, jewelry, nails, gloss, or hair detail."] },
  { id: "voodoo", name: "Voodoo", kind: "look_direction", description: "Mystery-led editorial look direction.", gradeDirection: "Atmospheric tonal direction with recorded environment preserved.", holdDirection: "Use a restrained source hold.", guardrails: ["Do not invent smoke, shadow, ritual, or environment detail."] },
  { id: "southside", name: "Southside", kind: "look_direction", description: "Grounded urban-editorial look direction.", gradeDirection: "Focused contrast direction with natural source color retained.", holdDirection: "Use a direct, grounded source hold.", guardrails: ["Do not invent city, street, or nightlife context."] },
  { id: "goddess_mode", name: "Goddess Mode", kind: "look_direction", description: "Elevated soft-power look direction.", gradeDirection: "Luminous but natural grade direction with identity and skin preserved.", holdDirection: "Use a poised source hero hold.", guardrails: ["Do not idealize, reshape, or alter identity."] },
  { id: "noche_buena", name: "Noche Buena", kind: "look_direction", description: "Evening-luxe look direction.", gradeDirection: "Warm night editorial direction without claiming nighttime source conditions.", holdDirection: "Use a deliberate source hold.", guardrails: ["Do not darken, relight, or replace the environment."] },
  { id: "royalty_check", name: "Royalty Check", kind: "look_direction", description: "High-authority editorial look direction.", gradeDirection: "Clean premium contrast direction with source fidelity retained.", holdDirection: "Use a decisive protected source hold.", guardrails: ["Do not alter body, identity, source pose, or source camera."] },
  { id: "pressure", name: "Pressure", kind: "look_direction", description: "Athletic high-contrast look direction.", gradeDirection: "Crisp non-destructive contrast direction while retaining natural skin texture.", holdDirection: "Use a controlled final source hold.", guardrails: ["Do not manufacture muscle definition, sweat, or fitness results."] },
];

export const bodyDirectedLandmarkSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite().optional(),
  visibility: z.number().finite().min(0).max(1),
}).strict();

const bodyDirectedFaceSchema = z.object({
  present: z.boolean(),
  centerX: z.number().finite().optional(),
  centerY: z.number().finite().optional(),
  coverage: z.number().finite().min(0).max(1).optional(),
  expressionSignals: z.record(z.string(), z.number().finite()).optional(),
}).strict();

export const bodyDirectedFrameEvidenceSchema = z.object({
  timestampMs: z.number().finite().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  landmarks: z.array(bodyDirectedLandmarkSchema).max(256),
  brightness: z.number().finite().min(0).max(1).optional(),
  sharpness: z.number().finite().min(0).max(1).optional(),
  contrast: z.number().finite().min(0).max(1).optional(),
  face: bodyDirectedFaceSchema.optional(),
  frameFingerprint: z.string().min(1).max(1024).optional(),
  colorWarmth: z.number().finite().optional(),
  subjectCoverage: z.number().finite().min(0).max(1).optional(),
  worldLandmarks: z.array(bodyDirectedLandmarkSchema).max(256).optional(),
  sceneId: z.number().int().nonnegative().optional(),
}).strict();

export type BodyDirectedFrameEvidence = z.infer<typeof bodyDirectedFrameEvidenceSchema>;
export const bodyDirectedFrameEvidenceListSchema = z.array(bodyDirectedFrameEvidenceSchema).max(24);

export const bodyDirectedSourceIdentitySchema = z.object({
  assetId: z.string().min(1).max(512),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/, "sha256 must be a 64-character hex digest").transform((value) => value.toLowerCase()),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationSeconds: z.number().finite().positive(),
}).strict();

export type BodyDirectedSourceIdentity = z.infer<typeof bodyDirectedSourceIdentitySchema>;

export const bodyDirectedDetailObservationSchema = z.object({
  bodyFocusId: z.string().min(1),
  startMs: z.number().finite().min(0),
  endMs: z.number().finite().positive(),
  confirmedVisible: z.literal(true),
  provenance: z.literal("creator_visible_region_confirmation"),
}).strict().superRefine((value, context) => {
  if (value.endMs <= value.startMs) {
    context.addIssue({ code: "custom", path: ["endMs"], message: "endMs must be greater than startMs" });
  }
});

export type BodyDirectedDetailObservation = z.infer<typeof bodyDirectedDetailObservationSchema>;

export const bodyDirectedCropSchema = z.object({
  left: z.number().finite().min(0).max(1),
  top: z.number().finite().min(0).max(1),
  width: z.number().finite().positive().max(1),
  height: z.number().finite().positive().max(1),
}).strict().superRefine((crop, context) => {
  if (crop.left + crop.width > 1 + Number.EPSILON) context.addIssue({ code: "custom", path: ["width"], message: "crop must remain inside source bounds" });
  if (crop.top + crop.height > 1 + Number.EPSILON) context.addIssue({ code: "custom", path: ["height"], message: "crop must remain inside source bounds" });
});

export type BodyDirectedCrop = z.infer<typeof bodyDirectedCropSchema>;

export const bodyDirectedRegionSchema = z.enum([
  "face",
  "shoulders",
  "torso",
  "hips",
  "legs",
  "arms",
  "full_body",
]);

export type BodyDirectedRegionName = z.infer<typeof bodyDirectedRegionSchema>;

const bodyDirectedCanvasDiagnosticsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  brightness: z.number().finite().min(0).max(1),
  sharpness: z.number().finite().min(0).max(1),
  contrast: z.number().finite().min(0).max(1),
  subjectCoverage: z.number().finite().min(0).max(1),
}).strict();

const bodyDirectedOriginalSourceContextCropSchema = z.object({
  label: z.literal("ORIGINAL SOURCE CONTEXT"),
  crop: bodyDirectedCropSchema,
  evidence: z.object({
    leftFrameFingerprint: z.string().min(1).max(1024),
    rightFrameFingerprint: z.string().min(1).max(1024),
    leftCanvasDiagnostics: bodyDirectedCanvasDiagnosticsSchema,
    rightCanvasDiagnostics: bodyDirectedCanvasDiagnosticsSchema,
  }).strict(),
}).strict().superRefine((value, context) => {
  if (
    value.crop.left !== 0
    || value.crop.top !== 0
    || value.crop.width !== 1
    || value.crop.height !== 1
  ) {
    context.addIssue({
      code: "custom",
      path: ["crop"],
      message: "ORIGINAL SOURCE CONTEXT must be the unaltered complete source frame",
    });
  }
});

export type BodyDirectedOriginalSourceContextCrop = z.infer<typeof bodyDirectedOriginalSourceContextCropSchema>;

export const BODY_DIRECTED_MEASURED_FRAMING_CROP_KINDS = [
  "measured_face_detail",
  "measured_torso_frame",
  "measured_leg_detail",
] as const;

export type BodyDirectedMeasuredFramingCropKind = typeof BODY_DIRECTED_MEASURED_FRAMING_CROP_KINDS[number];

const MEASURED_FRAMING_CROP_REGIONS: Record<BodyDirectedMeasuredFramingCropKind, BodyDirectedRegionName[]> = {
  measured_face_detail: ["face"],
  measured_torso_frame: ["shoulders", "hips"],
  measured_leg_detail: ["legs"],
};

export const bodyDirectedMeasuredFramingCropSchema = z.object({
  kind: z.enum(BODY_DIRECTED_MEASURED_FRAMING_CROP_KINDS),
  crop: bodyDirectedCropSchema,
  basedOnRegions: z.array(bodyDirectedRegionSchema).min(1),
}).strict().superRefine((value, context) => {
  const expectedRegions = MEASURED_FRAMING_CROP_REGIONS[value.kind];
  if (
    value.basedOnRegions.length !== expectedRegions.length
    || new Set(value.basedOnRegions).size !== value.basedOnRegions.length
    || !expectedRegions.every((region) => value.basedOnRegions.includes(region))
  ) {
    context.addIssue({
      code: "custom",
      path: ["basedOnRegions"],
      message: `${value.kind} must use exactly its required measured regions`,
    });
  }
});

export type BodyDirectedMeasuredFramingCrop = z.infer<typeof bodyDirectedMeasuredFramingCropSchema>;

export const bodyDirectedUsableRangeSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().finite().min(0),
  endMs: z.number().finite().positive(),
  visibleFocusIds: z.array(z.string().min(1)).min(1),
  movementType: z.enum(["observed_landmark_movement", "held_pose", "unknown"]),
  framingQuality: z.number().finite().min(0).max(1),
  lightingQuality: z.number().finite().min(0).max(1).nullable(),
  stability: z.number().finite().min(0).max(1).nullable(),
  evidence: z.array(z.string().min(1)).min(1),
  visibilityProvenance: z.enum(["measured_pose", "creator_confirmed_detail"]),
  crop: bodyDirectedCropSchema,
  // Every label in this list was in-bounds and high-confidence in both adjacent
  // frames; it is range evidence, not a semantic body-feature prediction.
  measuredRegions: z.array(bodyDirectedRegionSchema).min(1),
  // This is deliberately absent unless the adjacent frame samples contain both
  // fingerprints and actual canvas diagnostics. It is never evidence of an
  // unmeasured body area, angle, pose, or light condition.
  allowedSourceContextCrop: bodyDirectedOriginalSourceContextCropSchema.optional(),
  // Narrower framing is allowed only when this frozen range contains the exact
  // crop derived from the named high-confidence measured point groups.
  measuredFramingCrops: z.array(bodyDirectedMeasuredFramingCropSchema).max(3).optional(),
}).strict().superRefine((value, context) => {
  if (value.endMs <= value.startMs) context.addIssue({ code: "custom", path: ["endMs"], message: "endMs must be greater than startMs" });
  if (new Set(value.measuredRegions).size !== value.measuredRegions.length) {
    context.addIssue({ code: "custom", path: ["measuredRegions"], message: "measured regions must be unique" });
  }
  const framingKinds = new Set<string>();
  for (const framingCrop of value.measuredFramingCrops || []) {
    if (framingKinds.has(framingCrop.kind)) {
      context.addIssue({ code: "custom", path: ["measuredFramingCrops"], message: "measured framing crop kinds must be unique" });
    }
    framingKinds.add(framingCrop.kind);
    if (!framingCrop.basedOnRegions.every((region) => value.measuredRegions.includes(region))) {
      context.addIssue({
        code: "custom",
        path: ["measuredFramingCrops"],
        message: "measured framing crop regions must be present in the usable range",
      });
    }
    if (!bodyDirectedCropContains(value.crop, framingCrop.crop)) {
      context.addIssue({
        code: "custom",
        path: ["measuredFramingCrops"],
        message: "measured framing crop must remain inside the range's measured crop",
      });
    }
  }
});

export type BodyDirectedUsableRange = z.infer<typeof bodyDirectedUsableRangeSchema>;

export const bodyDirectedExcludedRangeSchema = z.object({
  startMs: z.number().finite().min(0),
  endMs: z.number().finite().positive(),
  reason: z.string().min(1),
}).strict().superRefine((value, context) => {
  if (value.endMs <= value.startMs) context.addIssue({ code: "custom", path: ["endMs"], message: "endMs must be greater than startMs" });
});

export type BodyDirectedExcludedRange = z.infer<typeof bodyDirectedExcludedRangeSchema>;

export const bodyDirectedSourceMapSchema = z.object({
  version: z.string().min(1),
  source: bodyDirectedSourceIdentitySchema,
  provenance: z.literal("browser_local_pose_and_creator_marks"),
  usableRanges: z.array(bodyDirectedUsableRangeSchema),
  excludedRanges: z.array(bodyDirectedExcludedRangeSchema),
  limitations: z.array(z.string().min(1)).min(1),
  detailObservations: z.array(bodyDirectedDetailObservationSchema),
  bestEligibleTreatmentIds: z.array(z.string().min(1)),
  // The parent server assigns this after persistence. Pure browser-local derivation deliberately leaves it absent.
  sourceMapHash: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
}).strict().superRefine((value, context) => {
  const durationMs = value.source.durationSeconds * 1000;
  const rangeIds = new Set<string>();
  for (const range of value.usableRanges) {
    if (rangeIds.has(range.id)) context.addIssue({ code: "custom", path: ["usableRanges"], message: `duplicate usable range id: ${range.id}` });
    rangeIds.add(range.id);
    if (range.endMs > durationMs + Number.EPSILON) context.addIssue({ code: "custom", path: ["usableRanges"], message: "usable range exceeds source duration" });
  }
  for (const range of value.excludedRanges) {
    if (range.endMs > durationMs + Number.EPSILON) context.addIssue({ code: "custom", path: ["excludedRanges"], message: "excluded range exceeds source duration" });
  }
  for (const observation of value.detailObservations) {
    if (observation.endMs > durationMs + Number.EPSILON) context.addIssue({ code: "custom", path: ["detailObservations"], message: "detail observation exceeds source duration" });
  }
});

export type BodyDirectedSourceMap = z.infer<typeof bodyDirectedSourceMapSchema>;

export type BodyDirectedAllowedCropProofKind =
  | "measured_focus_crop"
  | "original_source_context"
  | BodyDirectedMeasuredFramingCropKind
  | "measured_full_body";

export type BodyDirectedAllowedCropProof = {
  kind: BodyDirectedAllowedCropProofKind;
  crop: BodyDirectedCrop;
};

function bodyDirectedSameSourceWindow(left: BodyDirectedUsableRange, right: BodyDirectedUsableRange): boolean {
  return left.startMs === right.startMs && left.endMs === right.endMs;
}

/**
 * Return the finite crop proofs embedded in a frozen source-map range. This is
 * deliberately snapshot-only: no current registry, frame store, or live source
 * lookup can authorize a crop. Sibling crops are accepted only from direct
 * measured ranges covering the exact same source window.
 */
export function bodyDirectedAllowedCropProofsForRange(
  sourceMap: BodyDirectedSourceMap,
  sourceRange: BodyDirectedUsableRange,
): BodyDirectedAllowedCropProof[] {
  const range = sourceMap.usableRanges.find((candidate) => candidate.id === sourceRange.id);
  if (!range) return [];
  const proofs: BodyDirectedAllowedCropProof[] = [{ kind: "measured_focus_crop", crop: range.crop }];
  if (range.allowedSourceContextCrop) {
    proofs.push({ kind: "original_source_context", crop: range.allowedSourceContextCrop.crop });
  }
  for (const framingCrop of range.measuredFramingCrops || []) {
    proofs.push({ kind: framingCrop.kind, crop: framingCrop.crop });
  }
  for (const sibling of sourceMap.usableRanges) {
    if (sibling.id === range.id || !bodyDirectedSameSourceWindow(sibling, range) || sibling.visibilityProvenance !== "measured_pose") continue;
    const isDirectFocus = sibling.visibleFocusIds.length === 1;
    if (isDirectFocus && sibling.visibleFocusIds[0] === "face_beauty" && sibling.measuredRegions.includes("face")) {
      proofs.push({ kind: "measured_face_detail", crop: sibling.crop });
    }
    if (isDirectFocus && sibling.visibleFocusIds[0] === "legs" && sibling.measuredRegions.includes("legs")) {
      proofs.push({ kind: "measured_leg_detail", crop: sibling.crop });
    }
    if (isDirectFocus && sibling.visibleFocusIds[0] === "full_body" && sibling.measuredRegions.includes("full_body")) {
      proofs.push({ kind: "measured_full_body", crop: sibling.crop });
    }
  }
  return proofs.filter((proof, index) => !proofs.slice(0, index).some((previous) => (
    previous.kind === proof.kind && bodyDirectedCropsEqual(previous.crop, proof.crop)
  )));
}

const bodyDirectedFocusSnapshotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  requiresCreatorConfirmation: z.boolean(),
}).strict();

const bodyDirectedTreatmentSnapshotSchema = z.object({
  id: z.string().min(1),
  bodyFocusIds: z.array(z.string().min(1)).min(1),
  name: z.string().min(1),
  promise: z.string().min(1),
  shotLogic: z.string().min(1),
  framingCropLogic: z.string().min(1),
  pacing: z.string().min(1),
  movementLogic: z.string().min(1),
  suggestedVisualIdentityIds: z.array(z.string().min(1)).min(1),
  guardrails: z.array(z.string().min(1)).min(1),
  providerDirection: z.string().min(1),
  requiredRegions: z.array(z.string().min(1)).min(1),
  selectionPattern: z.string().min(1),
  requiresConfirmedFocus: z.boolean().optional(),
}).strict();

const bodyVisualIdentitySnapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.literal("look_direction"),
  description: z.string().min(1),
  gradeDirection: z.string().min(1),
  holdDirection: z.string().min(1),
  guardrails: z.array(z.string().min(1)).min(1),
}).strict();

const bodyDirectedSelectedTimecodeSchema = z.object({
  rangeId: z.string().min(1),
  startMs: z.number().finite().min(0),
  endMs: z.number().finite().positive(),
}).strict().superRefine((value, context) => {
  if (value.endMs <= value.startMs) context.addIssue({ code: "custom", path: ["endMs"], message: "endMs must be greater than startMs" });
});

const bodyDirectedShotSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().positive(),
  sourceRangeId: z.string().min(1),
  startMs: z.number().finite().min(0),
  endMs: z.number().finite().positive(),
  intent: z.string().min(1),
  framing: z.string().min(1),
  crop: bodyDirectedCropSchema,
  transition: z.string().min(1),
  pacing: z.string().min(1),
  movementInstruction: z.string().min(1),
}).strict().superRefine((value, context) => {
  if (value.endMs <= value.startMs) context.addIssue({ code: "custom", path: ["endMs"], message: "endMs must be greater than startMs" });
});

const bodyDirectedPreservationConstraintsSchema = z.object({
  identity: z.literal("preserve"),
  face: z.literal("preserve"),
  bodyAndAnatomy: z.literal("preserve"),
  naturalSkinAndTexture: z.literal("preserve"),
  wardrobe: z.literal("preserve"),
  environment: z.literal("preserve"),
  sourceMotionAndTiming: z.literal("preserve"),
  sourceCameraAndFraming: z.literal("preserve"),
  generatedBodyOrIdentityChanges: z.literal("not_authorized"),
  providerCall: z.literal("not_authorized"),
}).strict();

const bodyDirectedPlanningOutputLadderSchema = z.object({
  status: z.literal("planning_only"),
  sourceBound: z.literal(true),
  candidateGenerated: z.literal(false),
  providerCallMade: z.literal(false),
  nextAuthorizedStep: z.string().min(1),
}).strict();

function bodyDirectedCropsEqual(left: BodyDirectedCrop, right: BodyDirectedCrop): boolean {
  return left.left === right.left
    && left.top === right.top
    && left.width === right.width
    && left.height === right.height;
}

function bodyDirectedCropContains(outer: BodyDirectedCrop, inner: BodyDirectedCrop): boolean {
  const epsilon = Number.EPSILON * 16;
  return outer.left <= inner.left + epsilon
    && outer.top <= inner.top + epsilon
    && outer.left + outer.width + epsilon >= inner.left + inner.width
    && outer.top + outer.height + epsilon >= inner.top + inner.height;
}

function bodyDirectedIntervalsOverlap(
  startMs: number,
  endMs: number,
  otherStartMs: number,
  otherEndMs: number,
): boolean {
  return startMs < otherEndMs && otherStartMs < endMs;
}

function sameFrozenExcludedRanges(
  left: Array<{ startMs: number; endMs: number; reason: string }>,
  right: Array<{ startMs: number; endMs: number; reason: string }>,
): boolean {
  return left.length === right.length && left.every((range, index) => (
    range.startMs === right[index]?.startMs
    && range.endMs === right[index]?.endMs
    && range.reason === right[index]?.reason
  ));
}

/**
 * Historical plan parser. It intentionally validates embedded snapshots only;
 * it never looks up a live registry and therefore remains readable after registry updates.
 */
export const bodyDirectedPlanSchema = z.object({
  version: z.literal(BODY_DIRECTED_TREATMENT_VERSION),
  registryVersion: z.string().min(1),
  treatmentName: z.string().min(1),
  source: bodyDirectedSourceIdentitySchema,
  bodyFocus: bodyDirectedFocusSnapshotSchema,
  bodyTreatment: bodyDirectedTreatmentSnapshotSchema,
  visualIdentity: bodyVisualIdentitySnapshotSchema,
  sourceMap: bodyDirectedSourceMapSchema,
  selectedTimecodes: z.array(bodyDirectedSelectedTimecodeSchema).min(1),
  editBlueprint: z.object({
    version: z.literal("body_cinema.body_directed_edit_blueprint.v1"),
    shots: z.array(bodyDirectedShotSchema).min(1),
    heroRangeId: z.string().min(1),
    slowMotion: z.object({ eligible: z.literal(false), reason: z.string().min(1) }).strict(),
    limitations: z.array(z.string().min(1)).min(1),
    excludedRanges: z.array(z.object({
      startMs: z.number().finite().min(0),
      endMs: z.number().finite().positive(),
      reason: z.string().min(1),
    }).strict()),
  }).strict(),
  preservationConstraints: bodyDirectedPreservationConstraintsSchema,
  providerReadyDirection: z.string().min(1),
  outputLadder: bodyDirectedPlanningOutputLadderSchema,
  status: z.literal("planning_only"),
  noCandidateGenerated: z.literal(true),
}).strict().superRefine((plan, context) => {
  if (
    plan.source.assetId !== plan.sourceMap.source.assetId
    || plan.source.sha256 !== plan.sourceMap.source.sha256
    || plan.source.width !== plan.sourceMap.source.width
    || plan.source.height !== plan.sourceMap.source.height
    || plan.source.durationSeconds !== plan.sourceMap.source.durationSeconds
  ) {
    context.addIssue({ code: "custom", path: ["source"], message: "plan source must match frozen source-map source" });
  }
  if (plan.treatmentName !== plan.bodyTreatment.name) {
    context.addIssue({ code: "custom", path: ["treatmentName"], message: "treatment name must match the frozen body-treatment snapshot" });
  }
  if (!plan.bodyTreatment.bodyFocusIds.includes(plan.bodyFocus.id)) {
    context.addIssue({ code: "custom", path: ["bodyFocus"], message: "frozen body focus must belong to the frozen body-treatment snapshot" });
  }
  if (!plan.bodyTreatment.suggestedVisualIdentityIds.includes(plan.visualIdentity.id)) {
    context.addIssue({ code: "custom", path: ["visualIdentity"], message: "frozen visual identity must be suggested by the frozen body-treatment snapshot" });
  }
  const rangeIds = new Set(plan.selectedTimecodes.map((timecode) => timecode.rangeId));
  if (rangeIds.size !== plan.selectedTimecodes.length) {
    context.addIssue({ code: "custom", path: ["selectedTimecodes"], message: "selected range ids must be unique" });
  }
  const mapRanges = new Map(plan.sourceMap.usableRanges.map((range) => [range.id, range]));
  for (const timecode of plan.selectedTimecodes) {
    const range = mapRanges.get(timecode.rangeId);
    if (!range || range.startMs !== timecode.startMs || range.endMs !== timecode.endMs) {
      context.addIssue({ code: "custom", path: ["selectedTimecodes"], message: "selected timecodes must exactly match frozen source-map ranges" });
      continue;
    }
    const expectedProvenance = plan.bodyFocus.requiresCreatorConfirmation
      ? "creator_confirmed_detail"
      : "measured_pose";
    if (!range.visibleFocusIds.includes(plan.bodyFocus.id) || range.visibilityProvenance !== expectedProvenance) {
      context.addIssue({
        code: "custom",
        path: ["selectedTimecodes"],
        message: "each selected range must support the frozen focus with its required measured or creator-confirmed provenance",
      });
    }
    const missingRegions = plan.bodyTreatment.requiredRegions.filter((region) => !range.measuredRegions.includes(region as BodyDirectedRegionName));
    if (missingRegions.length) {
      context.addIssue({
        code: "custom",
        path: ["selectedTimecodes"],
        message: `each selected range must contain all frozen treatment required regions: ${missingRegions.join(", ")}`,
      });
    }
  }
  if (!rangeIds.has(plan.editBlueprint.heroRangeId)) {
    context.addIssue({ code: "custom", path: ["editBlueprint", "heroRangeId"], message: "hero range must be selected" });
  }
  const shotIds = new Set<string>();
  for (const [index, shot] of plan.editBlueprint.shots.entries()) {
    if (shotIds.has(shot.id)) {
      context.addIssue({ code: "custom", path: ["editBlueprint", "shots"], message: "frozen shot ids must be unique" });
    }
    shotIds.add(shot.id);
    if (shot.order !== index + 1) {
      context.addIssue({ code: "custom", path: ["editBlueprint", "shots"], message: "frozen shot orders must be unique and sequential from one" });
    }
    const range = mapRanges.get(shot.sourceRangeId);
    if (!range || !rangeIds.has(shot.sourceRangeId) || shot.startMs < range.startMs || shot.endMs > range.endMs) {
      context.addIssue({ code: "custom", path: ["editBlueprint", "shots"], message: "shot timecodes must stay inside a selected measured source range" });
      continue;
    }
    const allowedCropProofs = bodyDirectedAllowedCropProofsForRange(plan.sourceMap, range);
    if (!allowedCropProofs.some((proof) => bodyDirectedCropsEqual(shot.crop, proof.crop))) {
      context.addIssue({
        code: "custom",
        path: ["editBlueprint", "shots"],
        message: "shot crop must exactly equal a finite embedded measured crop proof or the frozen ORIGINAL SOURCE CONTEXT",
      });
    }
    if (plan.sourceMap.excludedRanges.some((excluded) => bodyDirectedIntervalsOverlap(
      shot.startMs,
      shot.endMs,
      excluded.startMs,
      excluded.endMs,
    ))) {
      context.addIssue({ code: "custom", path: ["editBlueprint", "shots"], message: "shot timecodes must not overlap frozen excluded source ranges" });
    }
  }
  const shotHasCropProof = (index: number, kind: BodyDirectedAllowedCropProofKind): boolean => {
    const shot = plan.editBlueprint.shots[index];
    if (!shot) return false;
    const range = mapRanges.get(shot.sourceRangeId);
    return Boolean(range && bodyDirectedAllowedCropProofsForRange(plan.sourceMap, range).some((proof) => (
      proof.kind === kind && bodyDirectedCropsEqual(shot.crop, proof.crop)
    )));
  };
  if (plan.bodyTreatment.selectionPattern === "detail_to_mid_to_full") {
    if (plan.editBlueprint.shots.length < 3) {
      context.addIssue({ code: "custom", path: ["editBlueprint", "shots"], message: "detail-to-mid-to-full plans require at least three evidenced shots" });
    } else {
      if (!shotHasCropProof(0, "measured_face_detail")) {
        context.addIssue({ code: "custom", path: ["editBlueprint", "shots", 0, "crop"], message: "detail-to-mid-to-full opening must use the exact measured face-detail crop proof" });
      }
      for (let index = 1; index < plan.editBlueprint.shots.length - 1; index += 1) {
        if (!shotHasCropProof(index, "measured_torso_frame")) {
          context.addIssue({ code: "custom", path: ["editBlueprint", "shots", index, "crop"], message: "detail-to-mid-to-full mid shots must use exact measured torso-frame crop proofs" });
        }
      }
      if (!shotHasCropProof(plan.editBlueprint.shots.length - 1, "measured_focus_crop")) {
        context.addIssue({ code: "custom", path: ["editBlueprint", "shots", plan.editBlueprint.shots.length - 1, "crop"], message: "detail-to-mid-to-full hero must use its exact measured full-body crop proof" });
      }
    }
  }
  if (plan.bodyTreatment.selectionPattern === "lower_to_full") {
    if (plan.editBlueprint.shots.length < 2) {
      context.addIssue({ code: "custom", path: ["editBlueprint", "shots"], message: "lower-to-full plans require separate evidenced lower-body and full-body shots" });
    } else {
      for (let index = 0; index < plan.editBlueprint.shots.length - 1; index += 1) {
        if (!shotHasCropProof(index, "measured_focus_crop")) {
          context.addIssue({ code: "custom", path: ["editBlueprint", "shots", index, "crop"], message: "lower-to-full opening shots must use their exact measured lower-body crop proof" });
        }
      }
      if (!shotHasCropProof(plan.editBlueprint.shots.length - 1, "measured_full_body")) {
        context.addIssue({ code: "custom", path: ["editBlueprint", "shots", plan.editBlueprint.shots.length - 1, "crop"], message: "lower-to-full hero must use an exact sibling measured full-body crop proof" });
      }
    }
  }
  if (!sameFrozenExcludedRanges(plan.editBlueprint.excludedRanges, plan.sourceMap.excludedRanges)) {
    context.addIssue({ code: "custom", path: ["editBlueprint", "excludedRanges"], message: "edit-blueprint exclusions must exactly match frozen source-map exclusions" });
  }
});

export type BodyDirectedPlan = z.infer<typeof bodyDirectedPlanSchema>;

export function findBodyFocus(id: string): BodyDirectedFocus | undefined {
  return BODY_FOCUS_LIBRARY.find((focus) => focus.id === id);
}

export function findBodyTreatment(id: string): BodyDirectedTreatment | undefined {
  return BODY_FOCUS_TREATMENTS.find((treatmentItem) => treatmentItem.id === id);
}

export function findBodyVisualIdentity(id: string): BodyVisualIdentity | undefined {
  return BODY_VISUAL_IDENTITIES.find((identity) => identity.id === id);
}
