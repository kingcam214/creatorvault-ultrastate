/**
 * ============================================================================
 * BODY CINEMA PRESETS — The dopest, most converting preset library
 * for adult creator content generation.
 *
 * This is the adult CapCut. Every preset is engineered for:
 *   - Maximum visual impact
 *   - Conversion-optimized framing
 *   - Platform-specific delivery
 *   - Identity preservation
 *   - Monetization intent
 *
 * Categories:
 *   LUXURY REVEAL      — High-end cinematic unveil scenes
 *   HEAT SHOTS         — Maximum sensual tension, conversion-first
 *   PENTHOUSE LIFE     — Aspirational luxury lifestyle
 *   AFTER DARK         — Low-key moody night energy
 *   EDITORIAL BODY     — Fashion/magazine quality body shots
 *   PPV OPENERS        — Designed specifically to sell the unlock
 *   VIP TEASE          — Exclusive subscriber-only energy
 *   TELEGRAM DROPS     — Optimized for Telegram channel blasts
 *   MOTION SERIES      — Multi-clip story arcs
 *   PLATFORM SPECIFIC  — Tuned per platform (OF, Fansly, Twitter, TikTok)
 * ============================================================================
 */

export type PresetCategory =
  | "luxury_reveal"
  | "heat_shots"
  | "penthouse_life"
  | "after_dark"
  | "editorial_body"
  | "ppv_opener"
  | "vip_tease"
  | "telegram_drop"
  | "motion_series"
  | "platform_specific";

export type PresetGoal =
  | "teaser"
  | "ppv_master"
  | "vip_upsell"
  | "subscriber_drop"
  | "dm_sales"
  | "story_clip"
  | "trailer";

export interface BodyCinemaPreset {
  id: string;
  name: string;
  tagline: string;
  category: PresetCategory;
  goal: PresetGoal;
  style: string;
  platform: string;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  duration: number;
  prompt: string;
  motionDirective: string;
  cameraMovement: string;
  negativePrompt: string;
  teaserDescription: string;
  suggestedTitle: string;
  suggestedPrice: number;
  suggestedVipPrice: number;
  conversionScore: number;    // 1-10 predicted conversion power
  heatLevel: number;          // 1-5 sensuality intensity
  productionGrade: "A" | "S" | "SS";
  tags: string[];
  bestFor: string;
  telegramCaption: string;
  dmHook: string;
  ppvUnlockLine: string;
}

// ─── THE FULL PRESET LIBRARY ──────────────────────────────────────────────────
export const BODY_CINEMA_PRESETS: BodyCinemaPreset[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // LUXURY REVEAL — High-end cinematic unveil scenes
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "luxury-silk-reveal",
    name: "Silk Reveal",
    tagline: "The slow drop that sells itself",
    category: "luxury_reveal",
    goal: "ppv_master",
    style: "luxury",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 6,
    prompt: "Woman in silk robe slowly revealing shoulder, warm gold candlelight, luxury penthouse bedroom, silk sheets, soft focus background, intimate editorial quality",
    motionDirective: "Ultra-slow reveal motion, fabric sliding off shoulder in real time, hair moving gently, natural breathing visible",
    cameraMovement: "Slow push in from medium shot to close-up, slight tilt down then back up",
    negativePrompt: "fast motion, harsh lighting, cheap setting, plastic look, overexposed, amateur quality",
    teaserDescription: "The silk drop. Slow. Deliberate. Everything you came for is behind the unlock.",
    suggestedTitle: "Silk Reveal — Exclusive Drop",
    suggestedPrice: 29,
    suggestedVipPrice: 79,
    conversionScore: 9,
    heatLevel: 4,
    productionGrade: "SS",
    tags: ["silk", "reveal", "luxury", "penthouse", "slow"],
    bestFor: "OnlyFans PPV, VaultX premium unlock",
    telegramCaption: "🔥 New drop just landed. Silk. Slow. Exclusive. Link in bio — this one doesn't stay up long.",
    dmHook: "I just dropped something you need to see. Silk reveal. Unlocks for $29.",
    ppvUnlockLine: "Unlock the full silk reveal — $29 for everything.",
  },

  {
    id: "luxury-champagne-suite",
    name: "Champagne Suite",
    tagline: "Five-star energy, private access",
    category: "luxury_reveal",
    goal: "vip_upsell",
    style: "penthouse",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 8,
    prompt: "Woman in luxury hotel suite, champagne glass, floor-to-ceiling windows with city view at night, silk slip dress, confident posture, editorial lighting, premium atmosphere",
    motionDirective: "Confident slow walk toward camera, champagne glass raised, slight hair toss, lingering eye contact",
    cameraMovement: "Tracking shot following subject, slow zoom in on face, rack focus from city lights to subject",
    negativePrompt: "cheap hotel, bad lighting, awkward movement, amateur framing, overexposed windows",
    teaserDescription: "Five-star suite. Private access. This is what VIP looks like.",
    suggestedTitle: "Champagne Suite — VIP Access",
    suggestedPrice: 49,
    suggestedVipPrice: 149,
    conversionScore: 8,
    heatLevel: 3,
    productionGrade: "SS",
    tags: ["champagne", "suite", "vip", "luxury", "city"],
    bestFor: "VIP tier upsell, subscription conversion",
    telegramCaption: "🥂 Suite life. Private access. VIP tier just opened — limited spots.",
    dmHook: "VIP suite drop is live. $49 gets you in. $149 gets you everything.",
    ppvUnlockLine: "VIP suite access — unlock for $49.",
  },

  {
    id: "luxury-gold-hour",
    name: "Golden Hour",
    tagline: "The light that makes everything worth paying for",
    category: "luxury_reveal",
    goal: "teaser",
    style: "sunset",
    platform: "instagram_reel",
    aspectRatio: "9:16",
    duration: 5,
    prompt: "Woman bathed in golden hour light, rooftop terrace, flowing sheer fabric, warm amber tones, silhouette against sunset sky, luxury resort setting",
    motionDirective: "Fabric flowing in breeze, slow turn toward camera, hair catching light, relaxed confident movement",
    cameraMovement: "Low angle looking up, slow orbit around subject, lens flare intentional",
    negativePrompt: "harsh shadows, cold lighting, indoor setting, stiff movement, overprocessed",
    teaserDescription: "Golden hour on the rooftop. The teaser that makes them subscribe.",
    suggestedTitle: "Golden Hour — Public Teaser",
    suggestedPrice: 19,
    suggestedVipPrice: 59,
    conversionScore: 8,
    heatLevel: 2,
    productionGrade: "S",
    tags: ["golden hour", "rooftop", "sunset", "teaser", "public"],
    bestFor: "Instagram Reel teaser, Twitter hook, public subscriber bait",
    telegramCaption: "🌅 Golden hour drop. This is the free preview. The full version is behind the link.",
    dmHook: "Caught the golden hour today. Full version is exclusive — want access?",
    ppvUnlockLine: "Full golden hour session — unlock now.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HEAT SHOTS — Maximum sensual tension, conversion-first
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "heat-mirror-moment",
    name: "Mirror Moment",
    tagline: "She sees what you see",
    category: "heat_shots",
    goal: "ppv_master",
    style: "boudoir",
    platform: "onlyfans",
    aspectRatio: "9:16",
    duration: 6,
    prompt: "Woman in front of large ornate mirror, boudoir setting, soft intimate lighting, lace or silk lingerie, confident self-admiring pose, warm amber and rose tones, luxury bedroom",
    motionDirective: "Slow self-admiring movement, hands running through hair, slight body turn showing profile, lingering eye contact with mirror reflection",
    cameraMovement: "Shoot through mirror reflection, slow push in, slight tilt capturing both subject and reflection",
    negativePrompt: "harsh light, cheap mirror, awkward pose, cold tones, amateur quality",
    teaserDescription: "Mirror moment. She sees exactly what you came to see.",
    suggestedTitle: "Mirror Moment — Boudoir Drop",
    suggestedPrice: 35,
    suggestedVipPrice: 99,
    conversionScore: 10,
    heatLevel: 5,
    productionGrade: "SS",
    tags: ["mirror", "boudoir", "lingerie", "intimate", "reflection"],
    bestFor: "OnlyFans PPV, highest conversion preset",
    telegramCaption: "🪞 Mirror moment just dropped. This is the one they've been asking for. Link below.",
    dmHook: "Mirror session just went live. $35 for the full thing. You already know.",
    ppvUnlockLine: "Mirror moment — full session unlocks for $35.",
  },

  {
    id: "heat-wet-editorial",
    name: "Wet Editorial",
    tagline: "Water and light. Nothing else needed.",
    category: "heat_shots",
    goal: "ppv_master",
    style: "cinematic_heat",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 7,
    prompt: "Woman in luxury shower or pool, water droplets on skin, dramatic backlighting, steam or mist in air, editorial quality, cinematic slow motion, tasteful but intensely sensual",
    motionDirective: "Water flowing over body in slow motion, hair wet and pushed back, natural movement in water, steam rising",
    cameraMovement: "Close-up on water droplets, pull back to reveal full scene, slow orbit",
    negativePrompt: "cheap bathroom, bad lighting, static pose, overexposed, amateur",
    teaserDescription: "Water. Light. Editorial. The kind of content people pay to unlock twice.",
    suggestedTitle: "Wet Editorial — Premium Drop",
    suggestedPrice: 45,
    suggestedVipPrice: 129,
    conversionScore: 10,
    heatLevel: 5,
    productionGrade: "SS",
    tags: ["water", "editorial", "cinematic", "slow motion", "premium"],
    bestFor: "Highest-value PPV drops, VaultX premium content",
    telegramCaption: "💧 Wet editorial just dropped. Premium. Exclusive. The link is live for 24 hours.",
    dmHook: "Wet editorial session just went up. $45. This is the one.",
    ppvUnlockLine: "Wet editorial — full cinematic session for $45.",
  },

  {
    id: "heat-black-lace",
    name: "Black Lace",
    tagline: "The contrast that converts",
    category: "heat_shots",
    goal: "subscriber_drop",
    style: "noir",
    platform: "fansly",
    aspectRatio: "9:16",
    duration: 6,
    prompt: "Woman in black lace lingerie, high contrast noir lighting, dramatic shadows, dark luxury bedroom, confident seductive energy, film noir aesthetic, deep shadows and highlights",
    motionDirective: "Slow deliberate movement, tracing lace details with fingers, dramatic pause, confident eye contact",
    cameraMovement: "Low key lighting, shadows playing across subject, slow reveal from shadow to light",
    negativePrompt: "flat lighting, cheap lingerie, cold tones, awkward movement, overlit",
    teaserDescription: "Black lace. Noir lighting. The contrast that makes subscribers stay.",
    suggestedTitle: "Black Lace — Subscriber Drop",
    suggestedPrice: 25,
    suggestedVipPrice: 75,
    conversionScore: 9,
    heatLevel: 4,
    productionGrade: "S",
    tags: ["black lace", "noir", "lingerie", "shadows", "contrast"],
    bestFor: "Fansly subscriber retention, monthly drop",
    telegramCaption: "🖤 Black lace drop is live. Subscriber exclusive. You know what to do.",
    dmHook: "Black lace session just posted. Subscriber exclusive. $25 to unlock.",
    ppvUnlockLine: "Black lace — noir session unlocks for $25.",
  },

  {
    id: "heat-red-room",
    name: "Red Room",
    tagline: "The color of everything they want",
    category: "heat_shots",
    goal: "ppv_master",
    style: "cinematic_heat",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 6,
    prompt: "Woman in deep red lingerie or dress, red-toned moody lighting, luxury dark room with red accents, intense confident energy, cinematic color grading, deep shadows",
    motionDirective: "Slow confident movement, dramatic pause, intense direct eye contact, slight lean toward camera",
    cameraMovement: "Slow push in, tight on face then pull back to reveal full look, dramatic lighting shift",
    negativePrompt: "cheap red, harsh lighting, amateur framing, flat colors, awkward",
    teaserDescription: "Red room. The color of everything they came for.",
    suggestedTitle: "Red Room — Exclusive Drop",
    suggestedPrice: 39,
    suggestedVipPrice: 109,
    conversionScore: 9,
    heatLevel: 5,
    productionGrade: "SS",
    tags: ["red", "moody", "cinematic", "intense", "luxury"],
    bestFor: "VaultX premium PPV, high-value drops",
    telegramCaption: "🔴 Red room drop. Exclusive. Limited time. Link is live.",
    dmHook: "Red room session just dropped. $39. This is the one they've been asking for.",
    ppvUnlockLine: "Red room — full session unlocks for $39.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PENTHOUSE LIFE — Aspirational luxury lifestyle
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "penthouse-skyline",
    name: "Skyline Penthouse",
    tagline: "The life they want to be part of",
    category: "penthouse_life",
    goal: "vip_upsell",
    style: "penthouse",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 8,
    prompt: "Woman in luxury penthouse, floor-to-ceiling windows, city skyline at night, minimal elegant outfit, confident posture, premium interior design, city lights reflecting on glass",
    motionDirective: "Slow walk to window, looking out at city, turn back to camera with confident smile, relaxed luxury energy",
    cameraMovement: "Wide establishing shot of penthouse, slow push in toward subject at window, rack focus from city to face",
    negativePrompt: "cheap apartment, bad view, harsh lighting, awkward movement, amateur",
    teaserDescription: "Penthouse life. City at your feet. VIP access to everything.",
    suggestedTitle: "Skyline Penthouse — VIP Drop",
    suggestedPrice: 49,
    suggestedVipPrice: 149,
    conversionScore: 8,
    heatLevel: 3,
    productionGrade: "SS",
    tags: ["penthouse", "skyline", "city", "vip", "luxury"],
    bestFor: "VIP tier conversion, aspirational content",
    telegramCaption: "🌆 Penthouse drop. City views. Exclusive access. VIP tier is open.",
    dmHook: "Penthouse session just went live. VIP access. $49 gets you in.",
    ppvUnlockLine: "Penthouse skyline — VIP access for $49.",
  },

  {
    id: "penthouse-morning",
    name: "Morning Ritual",
    tagline: "The intimacy of the private morning",
    category: "penthouse_life",
    goal: "subscriber_drop",
    style: "luxury",
    platform: "onlyfans",
    aspectRatio: "9:16",
    duration: 7,
    prompt: "Woman in luxury penthouse morning scene, silk robe, coffee or champagne, natural morning light streaming through floor-to-ceiling windows, relaxed intimate energy, premium bedroom or living area",
    motionDirective: "Natural relaxed morning movement, stretching, sipping drink, looking out window, intimate and real",
    cameraMovement: "Handheld feel but polished, following natural movement, soft morning light",
    negativePrompt: "harsh lighting, cheap setting, stiff movement, artificial feel, overproduced",
    teaserDescription: "Morning ritual. The private moments subscribers pay to be part of.",
    suggestedTitle: "Morning Ritual — Subscriber Exclusive",
    suggestedPrice: 22,
    suggestedVipPrice: 65,
    conversionScore: 7,
    heatLevel: 2,
    productionGrade: "S",
    tags: ["morning", "intimate", "silk", "lifestyle", "subscriber"],
    bestFor: "Subscriber retention, daily drop content",
    telegramCaption: "☀️ Morning ritual just posted. Subscriber exclusive. This is the private stuff.",
    dmHook: "Morning ritual session is live. $22. The intimate stuff.",
    ppvUnlockLine: "Morning ritual — subscriber exclusive for $22.",
  },

  {
    id: "penthouse-pool",
    name: "Rooftop Pool",
    tagline: "Summer heat, premium access",
    category: "penthouse_life",
    goal: "ppv_master",
    style: "sunset",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 8,
    prompt: "Woman at luxury rooftop pool, golden hour light, premium swimwear or minimal coverage, city skyline in background, water reflecting light, confident relaxed energy",
    motionDirective: "Entering pool slowly, water rippling, floating on back, emerging from water with slow motion hair flip",
    cameraMovement: "Low angle at water level, slow tracking along pool edge, aerial-style pull back",
    negativePrompt: "cheap pool, bad lighting, cold tones, awkward movement, amateur",
    teaserDescription: "Rooftop pool. Golden hour. The kind of content that sells itself.",
    suggestedTitle: "Rooftop Pool — Summer Drop",
    suggestedPrice: 39,
    suggestedVipPrice: 119,
    conversionScore: 9,
    heatLevel: 4,
    productionGrade: "SS",
    tags: ["pool", "rooftop", "summer", "golden hour", "swimwear"],
    bestFor: "Seasonal drops, high-conversion PPV",
    telegramCaption: "🏊 Rooftop pool drop. Golden hour. This one is premium. Link is live.",
    dmHook: "Rooftop pool session just dropped. $39. Summer heat.",
    ppvUnlockLine: "Rooftop pool — summer drop unlocks for $39.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AFTER DARK — Low-key moody night energy
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "after-dark-neon",
    name: "Neon Night",
    tagline: "The city at night belongs to her",
    category: "after_dark",
    goal: "teaser",
    style: "neon_club",
    platform: "twitter",
    aspectRatio: "9:16",
    duration: 5,
    prompt: "Woman in city at night, neon lights reflecting on wet pavement, edgy confident energy, minimal outfit, urban luxury aesthetic, vibrant neon colors casting on skin",
    motionDirective: "Confident walk through neon-lit street, turning to camera, neon lights reflecting in eyes, dynamic energy",
    cameraMovement: "Low angle tracking shot, neon lights in background, slow push in on face",
    negativePrompt: "daytime, flat lighting, suburban setting, cheap neon, awkward movement",
    teaserDescription: "Neon night. City energy. The teaser that stops the scroll.",
    suggestedTitle: "Neon Night — City Drop",
    suggestedPrice: 19,
    suggestedVipPrice: 59,
    conversionScore: 8,
    heatLevel: 3,
    productionGrade: "S",
    tags: ["neon", "night", "city", "urban", "teaser"],
    bestFor: "Twitter/X viral teaser, TikTok hook",
    telegramCaption: "🌃 Neon night drop. City energy. This is the teaser — full version is behind the link.",
    dmHook: "Neon night session just dropped. $19 for the full thing.",
    ppvUnlockLine: "Neon night — city drop unlocks for $19.",
  },

  {
    id: "after-dark-velvet",
    name: "Velvet Midnight",
    tagline: "Midnight luxury. No explanation needed.",
    category: "after_dark",
    goal: "ppv_master",
    style: "after_dark",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 6,
    prompt: "Woman in velvet dress or bodysuit, midnight luxury setting, deep moody lighting, rich jewel tones, candles or low ambient light, mysterious confident energy",
    motionDirective: "Slow deliberate movement, velvet fabric catching light, confident pause, intense eye contact",
    cameraMovement: "Slow reveal from darkness into light, tight close-up on texture and detail, pull back to full reveal",
    negativePrompt: "bright lighting, cheap fabric, flat colors, amateur setting, awkward",
    teaserDescription: "Velvet midnight. The drop that makes them come back every time.",
    suggestedTitle: "Velvet Midnight — Exclusive Drop",
    suggestedPrice: 35,
    suggestedVipPrice: 99,
    conversionScore: 9,
    heatLevel: 4,
    productionGrade: "SS",
    tags: ["velvet", "midnight", "moody", "luxury", "jewel tones"],
    bestFor: "VaultX premium PPV, high-value night content",
    telegramCaption: "🖤 Velvet midnight drop. Exclusive. Moody. Link is live.",
    dmHook: "Velvet midnight session just dropped. $35. This is the one.",
    ppvUnlockLine: "Velvet midnight — exclusive drop for $35.",
  },

  {
    id: "after-dark-lounge",
    name: "VIP Lounge",
    tagline: "Private access to the after-hours",
    category: "after_dark",
    goal: "vip_upsell",
    style: "after_dark",
    platform: "telegram",
    aspectRatio: "9:16",
    duration: 7,
    prompt: "Woman in exclusive VIP lounge, dark luxurious interior, low ambient lighting, premium cocktail, leather and velvet furnishings, exclusive private club energy",
    motionDirective: "Relaxed confident movement through lounge, sitting down elegantly, sipping drink, looking directly at camera",
    cameraMovement: "Establishing shot of lounge, slow push in to subject, intimate close-up",
    negativePrompt: "cheap bar, bright lighting, crowded, amateur setting, awkward",
    teaserDescription: "VIP lounge. Private access. This is what the after-hours looks like.",
    suggestedTitle: "VIP Lounge — After Hours",
    suggestedPrice: 45,
    suggestedVipPrice: 129,
    conversionScore: 8,
    heatLevel: 3,
    productionGrade: "S",
    tags: ["vip", "lounge", "after hours", "private", "luxury"],
    bestFor: "Telegram VIP channel, subscriber upsell",
    telegramCaption: "🍸 VIP lounge drop. After hours. Private access. Link is live for 24h.",
    dmHook: "VIP lounge session just dropped. $45. After hours exclusive.",
    ppvUnlockLine: "VIP lounge — after hours access for $45.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITORIAL BODY — Fashion/magazine quality body shots
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "editorial-vogue",
    name: "Vogue Energy",
    tagline: "Magazine quality. Adult intent.",
    category: "editorial_body",
    goal: "subscriber_drop",
    style: "editorial",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 6,
    prompt: "Woman in high fashion editorial shoot, studio or luxury location, dramatic editorial lighting, confident powerful posing, fashion-forward styling, magazine cover quality",
    motionDirective: "Editorial posing sequence, deliberate powerful movements, fashion model energy, each pose held with intention",
    cameraMovement: "Multiple angles, editorial framing, dramatic lighting shifts, professional photography feel",
    negativePrompt: "amateur posing, cheap styling, bad lighting, casual feel, low quality",
    teaserDescription: "Vogue energy. Editorial quality. The content that makes them subscribe.",
    suggestedTitle: "Vogue Editorial — Subscriber Drop",
    suggestedPrice: 29,
    suggestedVipPrice: 89,
    conversionScore: 8,
    heatLevel: 3,
    productionGrade: "S",
    tags: ["editorial", "fashion", "vogue", "magazine", "powerful"],
    bestFor: "Subscriber acquisition, premium positioning",
    telegramCaption: "📸 Vogue editorial just dropped. Magazine quality. Subscriber exclusive.",
    dmHook: "Editorial shoot just posted. $29. Magazine quality content.",
    ppvUnlockLine: "Vogue editorial — subscriber drop for $29.",
  },

  {
    id: "editorial-body-art",
    name: "Body Art",
    tagline: "The human form as the highest art",
    category: "editorial_body",
    goal: "ppv_master",
    style: "editorial",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 7,
    prompt: "Artistic body study, dramatic studio lighting, high contrast black and white or deep color, sculptural posing, the human form celebrated as art, premium production quality",
    motionDirective: "Slow sculptural movement, body lines emphasized, deliberate artistic poses, fluid transitions",
    cameraMovement: "Artistic framing, dramatic shadows, multiple angles celebrating form, slow deliberate movement",
    negativePrompt: "cheap setting, bad lighting, awkward posing, amateur quality, flat",
    teaserDescription: "Body as art. The premium content that justifies every price point.",
    suggestedTitle: "Body Art — Premium Editorial",
    suggestedPrice: 49,
    suggestedVipPrice: 149,
    conversionScore: 9,
    heatLevel: 4,
    productionGrade: "SS",
    tags: ["body art", "artistic", "editorial", "sculptural", "premium"],
    bestFor: "Highest-value PPV, premium subscriber tier",
    telegramCaption: "🎨 Body art editorial just dropped. Premium. Artistic. Exclusive. Link is live.",
    dmHook: "Body art session just posted. $49. This is the premium stuff.",
    ppvUnlockLine: "Body art editorial — premium drop for $49.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PPV OPENERS — Designed specifically to sell the unlock
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ppv-door-tease",
    name: "The Door Tease",
    tagline: "What's behind the door is worth every dollar",
    category: "ppv_opener",
    goal: "ppv_master",
    style: "vip_tease",
    platform: "onlyfans",
    aspectRatio: "9:16",
    duration: 5,
    prompt: "Woman at luxury door or entrance, hand on door handle, looking back at camera with knowing smile, premium outfit, dramatic lighting, the suggestion of what's beyond",
    motionDirective: "Hand on door, slow look back at camera, suggestive smile, slight lean, building anticipation",
    cameraMovement: "Tight on hand on door, pull back to reveal subject, slow push in on face",
    negativePrompt: "cheap door, bad lighting, awkward, cheap outfit, amateur",
    teaserDescription: "The door tease. What's behind it is worth every dollar of the unlock.",
    suggestedTitle: "Behind The Door — PPV Drop",
    suggestedPrice: 29,
    suggestedVipPrice: 89,
    conversionScore: 10,
    heatLevel: 4,
    productionGrade: "SS",
    tags: ["tease", "door", "anticipation", "ppv", "conversion"],
    bestFor: "Highest-converting PPV opener, OnlyFans",
    telegramCaption: "🚪 Behind the door drop. You already know what's on the other side. Link is live.",
    dmHook: "Behind the door session just dropped. $29. You already know.",
    ppvUnlockLine: "Behind the door — unlock for $29 to see everything.",
  },

  {
    id: "ppv-countdown",
    name: "The Countdown",
    tagline: "Every second builds the case for the unlock",
    category: "ppv_opener",
    goal: "ppv_master",
    style: "cinematic_heat",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 6,
    prompt: "Woman in premium setting, building anticipation through deliberate slow movement, each moment more intense than the last, cinematic tension building, premium quality throughout",
    motionDirective: "Building tension through slow deliberate movement, each action purposeful, anticipation in every frame",
    cameraMovement: "Slow push in, building tension, tight close-ups alternating with wider shots",
    negativePrompt: "rushed movement, cheap setting, bad lighting, amateur, flat",
    teaserDescription: "The countdown. Every second makes the unlock more inevitable.",
    suggestedTitle: "The Countdown — Exclusive Drop",
    suggestedPrice: 35,
    suggestedVipPrice: 99,
    conversionScore: 10,
    heatLevel: 5,
    productionGrade: "SS",
    tags: ["countdown", "tension", "anticipation", "cinematic", "ppv"],
    bestFor: "Maximum conversion PPV, VaultX flagship",
    telegramCaption: "⏱️ The countdown drop is live. Every second builds the case. Link below.",
    dmHook: "Countdown session just dropped. $35. Every second is worth it.",
    ppvUnlockLine: "The countdown — full session unlocks for $35.",
  },

  {
    id: "ppv-almost",
    name: "Almost",
    tagline: "The almost is what sells the rest",
    category: "ppv_opener",
    goal: "dm_sales",
    style: "vip_tease",
    platform: "telegram",
    aspectRatio: "9:16",
    duration: 5,
    prompt: "Woman in premium setting, teasing reveal that stops just short, knowing smile, confident energy, the suggestion of more, premium quality throughout",
    motionDirective: "Deliberate tease movement, stopping just before full reveal, knowing look at camera, confident control",
    cameraMovement: "Tight close-ups, strategic framing that suggests more, slow deliberate movement",
    negativePrompt: "full reveal, cheap setting, bad lighting, awkward, amateur",
    teaserDescription: "Almost. The tease that makes DMs flood in.",
    suggestedTitle: "Almost — DM Drop",
    suggestedPrice: 25,
    suggestedVipPrice: 75,
    conversionScore: 10,
    heatLevel: 4,
    productionGrade: "S",
    tags: ["tease", "almost", "dm", "conversion", "strategic"],
    bestFor: "DM sales conversion, Telegram blast",
    telegramCaption: "👀 Almost. You know what comes next. DM me for the rest.",
    dmHook: "Almost drop just posted. DM me for the full thing.",
    ppvUnlockLine: "Almost — the full version unlocks for $25.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIP TEASE — Exclusive subscriber-only energy
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "vip-private-show",
    name: "Private Show",
    tagline: "This is what VIP feels like",
    category: "vip_tease",
    goal: "vip_upsell",
    style: "vip_tease",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 8,
    prompt: "Woman performing intimate private show, luxury private setting, direct eye contact with camera as if performing for one person, premium intimate energy, exclusive feel",
    motionDirective: "Intimate performance energy, direct engagement with camera, confident and exclusive, every movement intentional",
    cameraMovement: "Intimate framing as if you're the only viewer, slow push in, personal connection",
    negativePrompt: "public setting, cheap environment, awkward, amateur, cold energy",
    teaserDescription: "Private show. VIP access only. This is what the top tier gets.",
    suggestedTitle: "Private Show — VIP Exclusive",
    suggestedPrice: 59,
    suggestedVipPrice: 179,
    conversionScore: 9,
    heatLevel: 5,
    productionGrade: "SS",
    tags: ["private", "vip", "exclusive", "intimate", "performance"],
    bestFor: "VIP tier, highest-value subscription conversion",
    telegramCaption: "🔐 Private show just dropped. VIP exclusive. This is what the top tier gets.",
    dmHook: "Private show session just posted. VIP exclusive. $59 to access.",
    ppvUnlockLine: "Private show — VIP exclusive for $59.",
  },

  {
    id: "vip-inner-circle",
    name: "Inner Circle",
    tagline: "Not everyone gets this. You do.",
    category: "vip_tease",
    goal: "subscriber_drop",
    style: "luxury",
    platform: "fansly",
    aspectRatio: "9:16",
    duration: 6,
    prompt: "Woman in intimate luxury setting, speaking directly to camera as if addressing her most loyal subscribers, warm personal energy, premium environment, exclusive access feel",
    motionDirective: "Direct personal address to camera, warm confident energy, intimate connection, exclusive feel",
    cameraMovement: "Personal framing, close and intimate, feels like a private message",
    negativePrompt: "impersonal, cold, cheap setting, awkward, amateur",
    teaserDescription: "Inner circle. Not everyone gets this. You do.",
    suggestedTitle: "Inner Circle — Subscriber Exclusive",
    suggestedPrice: 29,
    suggestedVipPrice: 89,
    conversionScore: 8,
    heatLevel: 3,
    productionGrade: "S",
    tags: ["inner circle", "personal", "exclusive", "subscriber", "intimate"],
    bestFor: "Subscriber retention, loyalty content",
    telegramCaption: "💫 Inner circle drop. Not everyone gets this. You do. Link is live.",
    dmHook: "Inner circle session just posted. $29. This is the personal stuff.",
    ppvUnlockLine: "Inner circle — subscriber exclusive for $29.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TELEGRAM DROPS — Optimized for Telegram channel blasts
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "telegram-hook-reel",
    name: "Hook Reel",
    tagline: "Three seconds to own the channel",
    category: "telegram_drop",
    goal: "teaser",
    style: "cinematic_heat",
    platform: "telegram",
    aspectRatio: "9:16",
    duration: 5,
    prompt: "High-impact opening shot, immediate visual hook, premium creator energy, designed to stop scrolling in the first frame, bold confident presence",
    motionDirective: "Immediate high-impact movement in first second, bold confident energy, designed for scroll-stopping",
    cameraMovement: "Dynamic opening, immediate engagement, bold framing",
    negativePrompt: "slow start, boring opening, cheap, amateur, flat",
    teaserDescription: "Hook reel. Three seconds to own the channel.",
    suggestedTitle: "Hook Reel — Channel Drop",
    suggestedPrice: 15,
    suggestedVipPrice: 45,
    conversionScore: 9,
    heatLevel: 3,
    productionGrade: "S",
    tags: ["hook", "telegram", "scroll-stop", "channel", "teaser"],
    bestFor: "Telegram channel blasts, viral teaser",
    telegramCaption: "⚡ New drop. Hook reel. You already know what to do. Link below.",
    dmHook: "Hook reel just dropped. $15. Quick and worth it.",
    ppvUnlockLine: "Hook reel — full version for $15.",
  },

  {
    id: "telegram-flash-drop",
    name: "Flash Drop",
    tagline: "24 hours. Then it's gone.",
    category: "telegram_drop",
    goal: "ppv_master",
    style: "luxury",
    platform: "telegram",
    aspectRatio: "9:16",
    duration: 5,
    prompt: "Premium creator content with urgency energy, exclusive limited-time feel, high production value, designed for flash sale conversion",
    motionDirective: "Confident urgent energy, premium quality, designed to convert immediately",
    cameraMovement: "Bold confident framing, immediate premium quality",
    negativePrompt: "slow, cheap, amateur, flat, boring",
    teaserDescription: "Flash drop. 24 hours. Then it's gone.",
    suggestedTitle: "Flash Drop — 24 Hours Only",
    suggestedPrice: 19,
    suggestedVipPrice: 59,
    conversionScore: 10,
    heatLevel: 3,
    productionGrade: "S",
    tags: ["flash", "limited", "urgent", "telegram", "24 hours"],
    bestFor: "Urgent Telegram drops, flash sales",
    telegramCaption: "⏰ FLASH DROP. 24 hours only. Then it's gone. Link is live NOW.",
    dmHook: "Flash drop is live. 24 hours. $19. Move fast.",
    ppvUnlockLine: "Flash drop — 24 hours only for $19.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MOTION SERIES — Multi-clip story arcs
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "series-getting-ready",
    name: "Getting Ready",
    tagline: "The ritual before the drop",
    category: "motion_series",
    goal: "subscriber_drop",
    style: "luxury",
    platform: "onlyfans",
    aspectRatio: "9:16",
    duration: 8,
    prompt: "Woman getting ready in luxury bathroom or dressing room, mirror, premium beauty products, silk robe, intimate preparation ritual, warm lighting, real and personal",
    motionDirective: "Natural getting-ready movements, applying makeup or perfume, adjusting outfit, intimate and real",
    cameraMovement: "Following natural movement, mirror reflections, intimate documentary feel",
    negativePrompt: "cheap bathroom, bad lighting, stiff movement, artificial, overproduced",
    teaserDescription: "Getting ready. The ritual before the drop. Subscribers only.",
    suggestedTitle: "Getting Ready — Subscriber Series",
    suggestedPrice: 22,
    suggestedVipPrice: 69,
    conversionScore: 7,
    heatLevel: 2,
    productionGrade: "S",
    tags: ["getting ready", "ritual", "intimate", "series", "personal"],
    bestFor: "Subscriber series, retention content",
    telegramCaption: "✨ Getting ready series just dropped. The ritual before the main event. Subscriber exclusive.",
    dmHook: "Getting ready series just posted. $22. The intimate stuff.",
    ppvUnlockLine: "Getting ready — subscriber series for $22.",
  },

  {
    id: "series-day-to-night",
    name: "Day to Night",
    tagline: "The full arc. The full conversion.",
    category: "motion_series",
    goal: "ppv_master",
    style: "luxury",
    platform: "vaultx",
    aspectRatio: "9:16",
    duration: 10,
    prompt: "Woman transitioning from daytime luxury look to evening premium look, showing the full transformation, premium settings throughout, the arc of a full day in luxury",
    motionDirective: "Transformation sequence, outfit change energy, building from casual luxury to premium evening look",
    cameraMovement: "Multiple scene transitions, building energy, culminating in premium evening look",
    negativePrompt: "cheap settings, bad transitions, amateur, flat, boring",
    teaserDescription: "Day to night. The full arc. The full conversion.",
    suggestedTitle: "Day to Night — Full Arc Drop",
    suggestedPrice: 49,
    suggestedVipPrice: 149,
    conversionScore: 8,
    heatLevel: 3,
    productionGrade: "SS",
    tags: ["transformation", "day to night", "arc", "series", "premium"],
    bestFor: "Long-form PPV, premium content series",
    telegramCaption: "🌅🌙 Day to night drop. Full arc. Premium throughout. Link is live.",
    dmHook: "Day to night series just dropped. $49. The full arc.",
    ppvUnlockLine: "Day to night — full arc drop for $49.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PLATFORM SPECIFIC — Tuned per platform
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "platform-tiktok-viral",
    name: "TikTok Viral",
    tagline: "Built to stop the scroll and send them to the link",
    category: "platform_specific",
    goal: "teaser",
    style: "neon_club",
    platform: "tiktok",
    aspectRatio: "9:16",
    duration: 5,
    prompt: "High-energy creator content optimized for TikTok, trending aesthetic, immediate hook in first second, bold confident energy, designed for maximum shares and profile visits",
    motionDirective: "Immediate high-energy hook, trending movement style, bold and confident, designed to go viral",
    cameraMovement: "Dynamic TikTok-style framing, immediate engagement, trending format",
    negativePrompt: "slow start, boring, cheap, amateur, low energy",
    teaserDescription: "TikTok viral. Built to stop the scroll and send them to the link.",
    suggestedTitle: "TikTok Viral — Platform Teaser",
    suggestedPrice: 15,
    suggestedVipPrice: 45,
    conversionScore: 9,
    heatLevel: 2,
    productionGrade: "S",
    tags: ["tiktok", "viral", "trending", "scroll-stop", "platform"],
    bestFor: "TikTok traffic generation, subscriber acquisition",
    telegramCaption: "📱 TikTok viral just dropped. This is the one that sends them to the link.",
    dmHook: "TikTok viral teaser just posted. $15 for the full version.",
    ppvUnlockLine: "TikTok viral — full version for $15.",
  },

  {
    id: "platform-twitter-heat",
    name: "Twitter Heat",
    tagline: "The tweet that breaks the timeline",
    category: "platform_specific",
    goal: "teaser",
    style: "cinematic_heat",
    platform: "twitter",
    aspectRatio: "16:9",
    duration: 5,
    prompt: "Bold confident creator content optimized for Twitter/X, immediate visual impact, premium quality that stands out in a timeline, designed for retweets and profile visits",
    motionDirective: "Bold immediate impact, designed to stop the scroll in a busy timeline, confident premium energy",
    cameraMovement: "Wide format for Twitter, bold framing, immediate impact",
    negativePrompt: "vertical format, slow, boring, cheap, amateur",
    teaserDescription: "Twitter heat. The tweet that breaks the timeline.",
    suggestedTitle: "Twitter Heat — Timeline Drop",
    suggestedPrice: 19,
    suggestedVipPrice: 59,
    conversionScore: 8,
    heatLevel: 4,
    productionGrade: "S",
    tags: ["twitter", "timeline", "heat", "viral", "platform"],
    bestFor: "Twitter/X traffic, viral reach",
    telegramCaption: "🐦 Twitter heat just dropped. This is the one that breaks the timeline.",
    dmHook: "Twitter heat session just posted. $19 for the full version.",
    ppvUnlockLine: "Twitter heat — full version for $19.",
  },

  {
    id: "platform-instagram-editorial",
    name: "Instagram Editorial",
    tagline: "Grid-worthy. Link-in-bio worthy.",
    category: "platform_specific",
    goal: "teaser",
    style: "editorial",
    platform: "instagram_reel",
    aspectRatio: "4:5",
    duration: 5,
    prompt: "Premium editorial content optimized for Instagram, polished aesthetic, grid-worthy quality, designed to drive profile visits and link-in-bio clicks, aspirational luxury feel",
    motionDirective: "Polished editorial movement, Instagram-optimized pacing, aspirational energy",
    cameraMovement: "Instagram-optimized framing, clean composition, premium aesthetic",
    negativePrompt: "cheap, amateur, bad lighting, awkward, low quality",
    teaserDescription: "Instagram editorial. Grid-worthy. Link-in-bio worthy.",
    suggestedTitle: "Instagram Editorial — Grid Drop",
    suggestedPrice: 19,
    suggestedVipPrice: 59,
    conversionScore: 7,
    heatLevel: 2,
    productionGrade: "S",
    tags: ["instagram", "editorial", "grid", "aspirational", "platform"],
    bestFor: "Instagram traffic, subscriber acquisition",
    telegramCaption: "📸 Instagram editorial just dropped. Grid-worthy. Link in bio.",
    dmHook: "Instagram editorial just posted. $19 for the full version.",
    ppvUnlockLine: "Instagram editorial — full version for $19.",
  },
];

// ─── Preset lookup helpers ────────────────────────────────────────────────────

export function getPresetById(id: string): BodyCinemaPreset | undefined {
  return BODY_CINEMA_PRESETS.find(p => p.id === id);
}

export function getPresetsByCategory(category: PresetCategory): BodyCinemaPreset[] {
  return BODY_CINEMA_PRESETS.filter(p => p.category === category);
}

export function getPresetsByGoal(goal: PresetGoal): BodyCinemaPreset[] {
  return BODY_CINEMA_PRESETS.filter(p => p.goal === goal);
}

export function getTopConvertingPresets(limit = 5): BodyCinemaPreset[] {
  return [...BODY_CINEMA_PRESETS]
    .sort((a, b) => b.conversionScore - a.conversionScore)
    .slice(0, limit);
}

export function getPresetsByPlatform(platform: string): BodyCinemaPreset[] {
  return BODY_CINEMA_PRESETS.filter(p => p.platform === platform);
}

export function getPresetsByHeatLevel(min: number, max = 5): BodyCinemaPreset[] {
  return BODY_CINEMA_PRESETS.filter(p => p.heatLevel >= min && p.heatLevel <= max);
}

export const PRESET_CATEGORIES: { id: PresetCategory; label: string; description: string; emoji: string }[] = [
  { id: "luxury_reveal",   label: "Luxury Reveal",    description: "High-end cinematic unveil scenes",              emoji: "✨" },
  { id: "heat_shots",      label: "Heat Shots",        description: "Maximum sensual tension, conversion-first",     emoji: "🔥" },
  { id: "penthouse_life",  label: "Penthouse Life",    description: "Aspirational luxury lifestyle content",         emoji: "🏙️" },
  { id: "after_dark",      label: "After Dark",        description: "Low-key moody night energy",                    emoji: "🌙" },
  { id: "editorial_body",  label: "Editorial Body",    description: "Fashion/magazine quality body shots",           emoji: "📸" },
  { id: "ppv_opener",      label: "PPV Openers",       description: "Designed specifically to sell the unlock",      emoji: "🔐" },
  { id: "vip_tease",       label: "VIP Tease",         description: "Exclusive subscriber-only energy",              emoji: "👑" },
  { id: "telegram_drop",   label: "Telegram Drops",    description: "Optimized for Telegram channel blasts",         emoji: "⚡" },
  { id: "motion_series",   label: "Motion Series",     description: "Multi-clip story arcs",                         emoji: "🎬" },
  { id: "platform_specific", label: "Platform Tuned",  description: "Optimized per platform",                        emoji: "📱" },
];

export const PRESET_STATS = {
  total: BODY_CINEMA_PRESETS.length,
  categories: PRESET_CATEGORIES.length,
  ssGrade: BODY_CINEMA_PRESETS.filter(p => p.productionGrade === "SS").length,
  avgConversionScore: Math.round(BODY_CINEMA_PRESETS.reduce((s, p) => s + p.conversionScore, 0) / BODY_CINEMA_PRESETS.length * 10) / 10,
};
