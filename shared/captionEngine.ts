export const CAPTION_ENGINE_FAMILIES = [
  "high_impact",
  "premium_cinematic",
  "creator_talking_head",
  "entertainment",
  "specialized",
] as const;

export const CAPTION_ENGINE_FEELS = [
  "authority",
  "cinematic",
  "emotional",
  "educational",
  "energetic",
  "funny",
  "luxury",
  "professional",
  "story",
] as const;

export type CaptionEngineFamily = (typeof CAPTION_ENGINE_FAMILIES)[number];
export type CaptionEngineFeel = (typeof CAPTION_ENGINE_FEELS)[number];
export type CaptionBehavior =
  | "word_pop"
  | "karaoke"
  | "punch"
  | "machine_gun"
  | "bounce"
  | "impact_stack"
  | "keyword_blast"
  | "beat_pulse"
  | "slow_reveal"
  | "light_sweep"
  | "lower_third"
  | "documentary";

export type CaptionPlacement = "top" | "center" | "lower" | "adaptive";
export type CaptionSafeZone = "vertical" | "square" | "landscape" | "platform_safe";

export type CaptionEngineTemplate = {
  id: string;
  title: string;
  family: CaptionEngineFamily;
  eyebrow: string;
  detail: string;
  bestFor: CaptionEngineFeel[];
  font: string;
  weight: number;
  size: number;
  color: string;
  highlightColor: string;
  stroke: string;
  shadow: string;
  background: string;
  placement: CaptionPlacement;
  safeZone: CaptionSafeZone;
  maxWords: number;
  timing: "word" | "phrase" | "sentence" | "beat";
  entryMotion: CaptionBehavior;
  activeWordBehavior: CaptionBehavior;
  emphasisRule: "none" | "keywords" | "first_phrase" | "final_word" | "high_energy";
  exitMotion: "fade" | "snap" | "slide" | "dissolve";
  contentType: string[];
  energy: 1 | 2 | 3 | 4 | 5;
};

const base: Omit<CaptionEngineTemplate, "id" | "title" | "family" | "eyebrow" | "detail" | "bestFor"> = {
  font: "Arial Black, Arial, sans-serif",
  weight: 900,
  size: 1,
  color: "#FFFFFF",
  highlightColor: "#F3D68B",
  stroke: "0px transparent",
  shadow: "0 12px 36px rgba(0,0,0,.62)",
  background: "rgba(5,5,8,.68)",
  placement: "lower",
  safeZone: "platform_safe",
  maxWords: 4,
  timing: "phrase",
  entryMotion: "punch",
  activeWordBehavior: "punch",
  emphasisRule: "keywords",
  exitMotion: "fade",
  contentType: ["talking_head", "short_form"],
  energy: 3,
};

function style(input: Pick<CaptionEngineTemplate, "id" | "title" | "family" | "eyebrow" | "detail" | "bestFor"> & Partial<Omit<CaptionEngineTemplate, "id" | "title" | "family" | "eyebrow" | "detail" | "bestFor">>): CaptionEngineTemplate {
  return { ...base, ...input };
}

export const CAPTION_ENGINE_TEMPLATES: CaptionEngineTemplate[] = [
  style({ id: "word-pop", title: "Word Pop", family: "high_impact", eyebrow: "VIRAL IMPACT", detail: "Every spoken word lands clean and fast.", bestFor: ["energetic", "funny"], timing: "word", maxWords: 1, entryMotion: "word_pop", activeWordBehavior: "word_pop", emphasisRule: "high_energy", exitMotion: "snap", energy: 5 }),
  style({ id: "karaoke-highlight", title: "Karaoke Highlight", family: "high_impact", eyebrow: "FOLLOW THE WORD", detail: "The live word lights up inside the phrase.", bestFor: ["energetic", "story"], timing: "word", maxWords: 5, entryMotion: "slow_reveal", activeWordBehavior: "karaoke", highlightColor: "#F8D24E", energy: 4 }),
  style({ id: "punch", title: "Punch", family: "high_impact", eyebrow: "HARD LANDING", detail: "Short phrases hit with controlled scale.", bestFor: ["authority", "energetic"], maxWords: 3, entryMotion: "punch", activeWordBehavior: "punch", exitMotion: "snap", energy: 5 }),
  style({ id: "beast", title: "Beast", family: "high_impact", eyebrow: "OVERSIZED", detail: "Big type for big statements.", bestFor: ["authority", "energetic"], size: 1.28, maxWords: 2, entryMotion: "punch", activeWordBehavior: "keyword_blast", emphasisRule: "final_word", energy: 5 }),
  style({ id: "hook-hit", title: "Hook Hit", family: "high_impact", eyebrow: "FIRST LINE WINS", detail: "Your opening gets the loudest entrance.", bestFor: ["authority", "energetic"], maxWords: 4, entryMotion: "punch", activeWordBehavior: "keyword_blast", emphasisRule: "first_phrase", energy: 5 }),
  style({ id: "machine-gun", title: "Machine Gun", family: "high_impact", eyebrow: "RAPID FIRE", detail: "Fast, readable groups for quick delivery.", bestFor: ["energetic", "funny"], timing: "word", maxWords: 2, entryMotion: "machine_gun", activeWordBehavior: "machine_gun", exitMotion: "snap", energy: 5 }),
  style({ id: "bounce", title: "Bounce", family: "high_impact", eyebrow: "RHYTHM", detail: "Soft vertical impact that keeps moving.", bestFor: ["energetic", "story"], entryMotion: "bounce", activeWordBehavior: "bounce", energy: 4 }),
  style({ id: "impact-stack", title: "Impact Stack", family: "high_impact", eyebrow: "TWO-LINE POWER", detail: "Stacked phrases built for a strong read.", bestFor: ["authority", "energetic"], maxWords: 6, entryMotion: "impact_stack", activeWordBehavior: "impact_stack", energy: 4 }),
  style({ id: "keyword-blast", title: "Keyword Blast", family: "high_impact", eyebrow: "ONLY THE IMPORTANT PART", detail: "Important words jump out without crowding the frame.", bestFor: ["authority", "educational"], entryMotion: "slow_reveal", activeWordBehavior: "keyword_blast", emphasisRule: "keywords", energy: 4 }),
  style({ id: "beat-sync", title: "Beat Sync", family: "high_impact", eyebrow: "VOICE RHYTHM", detail: "Captions pulse to spoken momentum.", bestFor: ["energetic", "funny"], timing: "beat", entryMotion: "beat_pulse", activeWordBehavior: "beat_pulse", energy: 5 }),

  style({ id: "cinematic-minimal", title: "Cinematic Minimal", family: "premium_cinematic", eyebrow: "QUIET POWER", detail: "Clean type, space, and restraint.", bestFor: ["cinematic", "luxury", "story"], font: "Helvetica Neue, Arial, sans-serif", weight: 700, size: .86, background: "rgba(4,4,6,.30)", stroke: "0px transparent", maxWords: 8, timing: "sentence", entryMotion: "slow_reveal", activeWordBehavior: "slow_reveal", emphasisRule: "none", exitMotion: "dissolve", energy: 1 }),
  style({ id: "luxury-serif", title: "Luxury Serif", family: "premium_cinematic", eyebrow: "EDITORIAL LUXURY", detail: "Elegant serif type for expensive energy.", bestFor: ["luxury", "cinematic"], font: "Georgia, Times New Roman, serif", weight: 700, size: .94, color: "#FFF4E9", highlightColor: "#D4AF37", background: "rgba(20,9,14,.54)", maxWords: 7, entryMotion: "slow_reveal", activeWordBehavior: "light_sweep", emphasisRule: "keywords", exitMotion: "dissolve", energy: 2 }),
  style({ id: "film-subtitle", title: "Film Subtitle", family: "premium_cinematic", eyebrow: "THEATER MODE", detail: "Understated subtitles that stay out of the way.", bestFor: ["cinematic", "story"], font: "Arial, sans-serif", weight: 600, size: .76, background: "rgba(0,0,0,.56)", placement: "lower", maxWords: 10, timing: "sentence", entryMotion: "documentary", activeWordBehavior: "documentary", emphasisRule: "none", exitMotion: "dissolve", energy: 1 }),
  style({ id: "slow-reveal", title: "Slow Reveal", family: "premium_cinematic", eyebrow: "BUILD THE MOMENT", detail: "Words arrive with patience and tension.", bestFor: ["cinematic", "emotional", "story"], font: "Helvetica Neue, Arial, sans-serif", weight: 700, background: "rgba(6,6,8,.42)", maxWords: 7, entryMotion: "slow_reveal", activeWordBehavior: "slow_reveal", emphasisRule: "final_word", exitMotion: "dissolve", energy: 2 }),
  style({ id: "light-sweep", title: "Light Sweep", family: "premium_cinematic", eyebrow: "CONTROLLED GLOW", detail: "A soft highlight travels across the active words.", bestFor: ["luxury", "cinematic"], color: "#F9F5FF", highlightColor: "#E8D2FF", background: "rgba(24,12,33,.48)", entryMotion: "light_sweep", activeWordBehavior: "light_sweep", emphasisRule: "keywords", energy: 2 }),
  style({ id: "editorial-lower-third", title: "Editorial Lower Third", family: "premium_cinematic", eyebrow: "WHO IS SPEAKING", detail: "A polished lower-third conversation treatment.", bestFor: ["professional", "authority"], font: "Helvetica Neue, Arial, sans-serif", weight: 800, size: .76, background: "rgba(6,6,8,.76)", placement: "lower", maxWords: 9, entryMotion: "lower_third", activeWordBehavior: "lower_third", emphasisRule: "none", energy: 2 }),
  style({ id: "documentary", title: "Documentary", family: "premium_cinematic", eyebrow: "REAL STORY", detail: "Human, calm, and built for truth.", bestFor: ["story", "emotional", "professional"], font: "Arial, sans-serif", weight: 600, size: .78, background: "rgba(0,0,0,.62)", maxWords: 10, timing: "sentence", entryMotion: "documentary", activeWordBehavior: "documentary", emphasisRule: "none", exitMotion: "dissolve", energy: 1 }),
  style({ id: "noir", title: "Noir", family: "premium_cinematic", eyebrow: "DARK CINEMA", detail: "White type, black field, and dramatic restraint.", bestFor: ["cinematic", "authority"], font: "Georgia, Times New Roman, serif", weight: 700, color: "#FFFFFF", highlightColor: "#BDBDBD", background: "rgba(0,0,0,.84)", stroke: "1px solid rgba(255,255,255,.22)", entryMotion: "slow_reveal", activeWordBehavior: "light_sweep", emphasisRule: "final_word", energy: 2 }),

  style({ id: "clean-creator", title: "Clean Creator", family: "creator_talking_head", eyebrow: "EVERYDAY SHARP", detail: "Readable, clean, never too loud.", bestFor: ["professional", "story", "educational"], font: "Arial, sans-serif", weight: 800, size: .84, background: "rgba(0,0,0,.68)", maxWords: 7, entryMotion: "documentary", activeWordBehavior: "karaoke", emphasisRule: "keywords", energy: 2 }),
  style({ id: "podcast-pro", title: "Podcast Pro", family: "creator_talking_head", eyebrow: "LONG-FORM CLARITY", detail: "Comfortable captions for real conversation.", bestFor: ["professional", "story"], font: "Arial, sans-serif", weight: 700, size: .76, background: "rgba(4,4,6,.76)", maxWords: 9, timing: "sentence", entryMotion: "documentary", activeWordBehavior: "karaoke", emphasisRule: "keywords", energy: 2 }),
  style({ id: "founder", title: "Founder", family: "creator_talking_head", eyebrow: "BUILD AUTHORITY", detail: "Confident, premium, and direct.", bestFor: ["authority", "professional", "luxury"], font: "Helvetica Neue, Arial, sans-serif", weight: 900, color: "#FFFFFF", highlightColor: "#D4AF37", background: "rgba(5,5,8,.76)", maxWords: 5, entryMotion: "punch", activeWordBehavior: "keyword_blast", emphasisRule: "keywords", energy: 3 }),
  style({ id: "storyteller", title: "Storyteller", family: "creator_talking_head", eyebrow: "MAKE THEM LISTEN", detail: "Soft pacing for a real personal story.", bestFor: ["story", "emotional"], font: "Georgia, Times New Roman, serif", weight: 700, size: .86, color: "#FFF7F0", background: "rgba(24,11,16,.64)", maxWords: 8, entryMotion: "slow_reveal", activeWordBehavior: "light_sweep", emphasisRule: "final_word", energy: 2 }),
  style({ id: "confessional", title: "Confessional", family: "creator_talking_head", eyebrow: "CLOSE AND REAL", detail: "Intimate captions that hold the moment.", bestFor: ["emotional", "story"], font: "Helvetica Neue, Arial, sans-serif", weight: 700, background: "rgba(8,8,10,.58)", maxWords: 7, entryMotion: "slow_reveal", activeWordBehavior: "karaoke", emphasisRule: "none", energy: 2 }),
  style({ id: "interview", title: "Interview", family: "creator_talking_head", eyebrow: "THE CONVERSATION", detail: "Clear, composed, and made for dialogue.", bestFor: ["professional", "story"], font: "Arial, sans-serif", weight: 700, size: .78, background: "rgba(2,2,4,.74)", maxWords: 9, timing: "sentence", entryMotion: "lower_third", activeWordBehavior: "documentary", emphasisRule: "none", energy: 1 }),
  style({ id: "commentary", title: "Commentary", family: "creator_talking_head", eyebrow: "SAY IT WITH CHEST", detail: "Quick, clear, with just enough attitude.", bestFor: ["authority", "funny", "energetic"], maxWords: 5, entryMotion: "bounce", activeWordBehavior: "keyword_blast", emphasisRule: "keywords", energy: 3 }),
  style({ id: "storytime", title: "Storytime", family: "creator_talking_head", eyebrow: "KEEP THEM HERE", detail: "Paced for a beginning, middle, and payoff.", bestFor: ["story", "emotional"], font: "Arial, sans-serif", weight: 800, size: .82, background: "rgba(14,8,18,.68)", maxWords: 7, entryMotion: "slow_reveal", activeWordBehavior: "karaoke", emphasisRule: "final_word", energy: 2 }),
  style({ id: "expert", title: "Expert", family: "creator_talking_head", eyebrow: "MAKE IT CLEAR", detail: "High-trust captions for teaching and advice.", bestFor: ["educational", "professional"], font: "Helvetica Neue, Arial, sans-serif", weight: 800, size: .78, color: "#F7FBFF", highlightColor: "#70E1FF", background: "rgba(3,15,25,.78)", maxWords: 8, entryMotion: "documentary", activeWordBehavior: "keyword_blast", emphasisRule: "keywords", energy: 2 }),
  style({ id: "newsroom", title: "Newsroom", family: "creator_talking_head", eyebrow: "WHAT MATTERS", detail: "Direct, calm, and impossible to misread.", bestFor: ["professional", "authority"], font: "Arial, sans-serif", weight: 900, size: .78, color: "#FFFFFF", highlightColor: "#FF5E5E", background: "rgba(4,7,14,.84)", maxWords: 7, entryMotion: "lower_third", activeWordBehavior: "keyword_blast", emphasisRule: "keywords", energy: 2 }),

  style({ id: "dance-pulse", title: "Dance Pulse", family: "entertainment", eyebrow: "MOVE WITH IT", detail: "Type that breathes with the energy.", bestFor: ["energetic", "funny"], timing: "beat", entryMotion: "beat_pulse", activeWordBehavior: "beat_pulse", background: "rgba(18,4,29,.60)", highlightColor: "#FF72C8", energy: 5 }),
  style({ id: "music-beat", title: "Music Beat", family: "entertainment", eyebrow: "LYRIC ENERGY", detail: "Tight, rhythmic text for music-led clips.", bestFor: ["energetic"], timing: "beat", maxWords: 3, entryMotion: "machine_gun", activeWordBehavior: "beat_pulse", background: "rgba(2,2,3,.62)", highlightColor: "#8EEBFF", energy: 5 }),
  style({ id: "comedy-punchline", title: "Comedy Punchline", family: "entertainment", eyebrow: "WAIT FOR IT", detail: "Sets up the line, then lets it land.", bestFor: ["funny", "energetic"], maxWords: 5, entryMotion: "slow_reveal", activeWordBehavior: "punch", emphasisRule: "final_word", exitMotion: "snap", energy: 4 }),
  style({ id: "reaction", title: "Reaction", family: "entertainment", eyebrow: "IN THE MOMENT", detail: "Fast captions for fast feelings.", bestFor: ["funny", "energetic"], timing: "word", maxWords: 2, entryMotion: "word_pop", activeWordBehavior: "bounce", background: "rgba(0,0,0,.68)", energy: 5 }),
  style({ id: "hype", title: "Hype", family: "entertainment", eyebrow: "TURN IT UP", detail: "Built to hit loud without becoming messy.", bestFor: ["energetic", "authority"], size: 1.16, maxWords: 3, entryMotion: "punch", activeWordBehavior: "keyword_blast", highlightColor: "#FFE14D", energy: 5 }),
  style({ id: "sports-impact", title: "Sports Impact", family: "entertainment", eyebrow: "BIG PLAY ENERGY", detail: "Strong contrast for fast highlight moments.", bestFor: ["energetic", "authority"], size: 1.08, color: "#FFFFFF", highlightColor: "#A5FF5C", stroke: "2px solid #050505", background: "rgba(5,5,5,.52)", maxWords: 4, entryMotion: "impact_stack", activeWordBehavior: "keyword_blast", energy: 5 }),
  style({ id: "gaming", title: "Gaming", family: "entertainment", eyebrow: "LIVE REACTION", detail: "Bright, responsive captions for quick commentary.", bestFor: ["energetic", "funny"], color: "#EFFFFF", highlightColor: "#5BFFDF", background: "rgba(8,10,26,.76)", maxWords: 4, entryMotion: "bounce", activeWordBehavior: "karaoke", energy: 4 }),
  style({ id: "lifestyle-pop", title: "Lifestyle Pop", family: "entertainment", eyebrow: "EASY ENERGY", detail: "Bright and fun without covering the whole frame.", bestFor: ["energetic", "story"], font: "Helvetica Neue, Arial, sans-serif", weight: 900, color: "#FFFFFF", highlightColor: "#FFC3E4", background: "rgba(47,11,36,.56)", maxWords: 5, entryMotion: "bounce", activeWordBehavior: "word_pop", energy: 4 }),

  style({ id: "tutorial-callout", title: "Tutorial Callout", family: "specialized", eyebrow: "DO THIS NEXT", detail: "Clear step-by-step words that stay readable.", bestFor: ["educational", "professional"], font: "Arial, sans-serif", weight: 900, color: "#0A1422", highlightColor: "#0A1422", background: "#F7DF63", placement: "top", maxWords: 7, timing: "sentence", entryMotion: "lower_third", activeWordBehavior: "keyword_blast", emphasisRule: "keywords", energy: 3 }),
  style({ id: "explainer", title: "Explainer", family: "specialized", eyebrow: "MAKE IT MAKE SENSE", detail: "Clarity-first captions for the full thought.", bestFor: ["educational", "professional"], font: "Helvetica Neue, Arial, sans-serif", weight: 800, color: "#F6FBFF", highlightColor: "#70E1FF", background: "rgba(6,20,33,.82)", maxWords: 9, timing: "sentence", entryMotion: "documentary", activeWordBehavior: "karaoke", energy: 2 }),
  style({ id: "product-demo", title: "Product Demo", family: "specialized", eyebrow: "SHOW THE VALUE", detail: "Clean presentation for a product in motion.", bestFor: ["professional", "luxury", "educational"], font: "Helvetica Neue, Arial, sans-serif", weight: 800, color: "#FFFFFF", highlightColor: "#D4AF37", background: "rgba(4,4,6,.78)", placement: "top", maxWords: 7, entryMotion: "light_sweep", activeWordBehavior: "keyword_blast", energy: 2 }),
  style({ id: "quote-card", title: "Quote Card", family: "specialized", eyebrow: "SAY IT AGAIN", detail: "A memorable line gets its own visual weight.", bestFor: ["authority", "emotional", "luxury"], font: "Georgia, Times New Roman, serif", weight: 700, size: 1.02, color: "#FFF7F0", highlightColor: "#D4AF37", background: "rgba(14,7,11,.80)", placement: "center", maxWords: 8, timing: "sentence", entryMotion: "slow_reveal", activeWordBehavior: "light_sweep", emphasisRule: "final_word", energy: 2 }),
  style({ id: "announcement", title: "Announcement", family: "specialized", eyebrow: "MAKE IT OFFICIAL", detail: "A clean declaration for a real update.", bestFor: ["authority", "professional"], size: 1.04, color: "#FFFFFF", highlightColor: "#F3D68B", background: "rgba(5,5,8,.82)", placement: "center", maxWords: 6, entryMotion: "impact_stack", activeWordBehavior: "keyword_blast", emphasisRule: "first_phrase", energy: 4 }),
  style({ id: "cta-finale", title: "CTA Finale", family: "specialized", eyebrow: "END WITH ACTION", detail: "Makes the final invitation impossible to miss.", bestFor: ["authority", "energetic"], size: 1.12, color: "#090909", highlightColor: "#090909", background: "#F3D68B", placement: "center", maxWords: 5, entryMotion: "punch", activeWordBehavior: "punch", emphasisRule: "final_word", exitMotion: "snap", energy: 5 }),
];

export const CAPTION_ENGINE_SIGNATURES = [
  { id: "vault-gold", title: "Vault Gold", detail: "Gold authority with black-vault contrast.", color: "#FFF7E8", highlightColor: "#D4AF37", background: "rgba(10,8,5,.80)" },
  { id: "kingcam-authority", title: "KingCam Authority", detail: "Burgundy power and crown-level presence.", color: "#FFF7F0", highlightColor: "#D4AF37", background: "rgba(50,6,18,.78)" },
  { id: "creatorvault-cinema", title: "CreatorVault Cinema", detail: "Velvet black, soft violet, controlled light.", color: "#F8F2FF", highlightColor: "#E8D2FF", background: "rgba(18,9,28,.76)" },
  { id: "empire", title: "Empire", detail: "Big type for a message that leads the room.", color: "#FFFFFF", highlightColor: "#F3D68B", background: "rgba(3,3,5,.82)" },
  { id: "royal-signal", title: "Royal Signal", detail: "Premium violet signal with clean authority.", color: "#F7F0FF", highlightColor: "#CFA6FF", background: "rgba(34,12,57,.74)" },
  { id: "vault-pulse", title: "Vault Pulse", detail: "Electric violet energy for motion-led drops.", color: "#FFFFFF", highlightColor: "#FF70D2", background: "rgba(23,4,34,.72)" },
  { id: "future-human", title: "Future Human", detail: "Crisp cyan intelligence and forward motion.", color: "#F1FFFF", highlightColor: "#67F1FF", background: "rgba(3,18,26,.80)" },
  { id: "black-vault", title: "Black Vault", detail: "Pure black luxury with no visual noise.", color: "#FFFFFF", highlightColor: "#BDBDBD", background: "rgba(0,0,0,.88)" },
  { id: "creator-intelligence", title: "Creator Intelligence", detail: "Clarity-first language for teaching and insight.", color: "#F5FBFF", highlightColor: "#71DEFF", background: "rgba(3,16,30,.82)" },
  { id: "body-cinema", title: "Body Cinema", detail: "Soft editorial color with cinematic discipline.", color: "#FFF6F2", highlightColor: "#FFCAA8", background: "rgba(26,10,15,.68)" },
  { id: "kingcam-clone", title: "KingCam Clone", detail: "Private burgundy, gold detail, and controlled presence.", color: "#FFF7E8", highlightColor: "#D4AF37", background: "rgba(47,5,16,.80)" },
  { id: "creatorvault-editorial", title: "CreatorVault Editorial", detail: "Luxury serif restraint for a polished statement.", color: "#FFF8F2", highlightColor: "#E8D2FF", background: "rgba(14,8,14,.74)" },
] as const;

export const CAPTION_ENGINE_TEMPLATE_MAP = new Map(CAPTION_ENGINE_TEMPLATES.map((item) => [item.id, item]));

export function getCaptionEngineTemplate(id: string | null | undefined): CaptionEngineTemplate {
  return CAPTION_ENGINE_TEMPLATE_MAP.get(String(id || "")) || CAPTION_ENGINE_TEMPLATE_MAP.get("founder") || CAPTION_ENGINE_TEMPLATES[0];
}

export function recommendCaptionTemplates(feel: CaptionEngineFeel, transcript = ""): CaptionEngineTemplate[] {
  const transcriptLength = transcript.trim().split(/\s+/).filter(Boolean).length;
  const ranked = CAPTION_ENGINE_TEMPLATES
    .map((item) => ({
      item,
      score: (item.bestFor.includes(feel) ? 100 : 0) + item.energy * 4 + (transcriptLength > 70 && item.maxWords >= 7 ? 8 : 0),
    }))
    .sort((left, right) => right.score - left.score || left.item.title.localeCompare(right.item.title));
  return ranked.slice(0, 3).map((entry) => entry.item);
}

export function captionEngineFamilyLabel(family: CaptionEngineFamily): string {
  return ({
    high_impact: "High-Impact / Viral",
    premium_cinematic: "Premium / Cinematic",
    creator_talking_head: "Creator / Talking Head",
    entertainment: "Entertainment",
    specialized: "Specialized",
  } as Record<CaptionEngineFamily, string>)[family];
}
